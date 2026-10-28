# Checkout API contract

Base `https://api.salla.dev/admin/v2`. Auth: `Authorization: Bearer <store access token>` — the
app's normal access token for that store, the same one `POST /apps/balance` and `POST /apps/events`
use. No extra OAuth scope. The app is installed on the store. Two endpoints: create and show.

Rate limit: 60 requests/min per app token + store by default (Salla can change it). Price limits:
`min_total` / `max_total` are set per partner company, with a platform default.

## POST /apps/checkouts — create

```json
{
  "reference_id": "topup-8812",
  "items": [
    {
      "name": "500 SMS credits",
      "description": "Top-up for October",
      "unit_price": 0.25,
      "quantity": 500
    }
  ],
  "taxable": true,
  "expires_in": 1440
}
```

| Field                   | Rule                                                                                                                        |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `reference_id`          | required, string 1–64, `[A-Za-z0-9_-]`, unique per app + store (idempotency key)                                            |
| `items`                 | required, 1–5 items                                                                                                         |
| `items.*.name`          | required, 1–100 chars (shown to the merchant as the line name)                                                              |
| `items.*.description`   | optional, ≤ 255                                                                                                             |
| `items.*.unit_price`    | required, numeric > 0, ≤ 2 decimals, VAT-exclusive, SAR                                                                     |
| `items.*.quantity`      | required, integer 1–10000                                                                                                   |
| `sub_total` (Σ price×q) | within your company's limits: `min_total` ≤ sub_total ≤ `max_total`, else 422 `amount_out_of_range`                         |
| `taxable`               | optional bool, default `true`; `false` only when the publication has `checkout_type: 1`, else 403 `non_taxable_not_allowed` |
| `expires_in`            | optional, minutes 15–10080, default 1440                                                                                    |

`201 Created` (`200 OK` with the existing checkout when the same `reference_id` is replayed with an
identical body — `expires_in` is not compared; a different body answers `409 reference_id_conflict`):

```json
{
  "status": 201,
  "success": true,
  "data": {
    "id": "zXbVlo",
    "reference_id": "topup-8812",
    "status": "pending",
    "currency": "SAR",
    "taxable": true,
    "items": [
      {
        "name": "500 SMS credits",
        "description": "Top-up for October",
        "unit_price": 0.25,
        "quantity": 500,
        "amount": 125.0
      }
    ],
    "sub_total": 125.0,
    "tax": 15,
    "tax_value": 18.75,
    "total": 143.75,
    "checkout_url": "https://s.salla.sa/checkout/zXbVlo",
    "order_id": null,
    "expires_at": "2026-10-20T12:31:25+03:00",
    "paid_at": null,
    "created_at": "2026-10-19T12:31:25+03:00"
  }
}
```

`data.id` is the value to pass to `embedded.checkout.create({ checkout_id })`. Use
`data.checkout_url` from the response verbatim when you need a payment link — the host varies by
environment; construct no checkout URL of your own. Totals are computed
by Salla (VAT 15 % when `taxable` is true; `tax: 0` and `tax_value: 0` when false).

`order_id` is a string once paid. `expires_at`, `paid_at` and `created_at` are ISO 8601 timestamps
with an offset.

## GET /apps/checkouts/{id} — show

Same `data` object. `404 checkout_not_found` for another app's or another store's checkout. This is
the only lookup: keep the `data.id` you received on create.

## Errors (Salla error envelope)

```json
{
  "status": 409,
  "success": false,
  "error": {
    "code": "reference_id_conflict",
    "message": "A checkout with this reference_id already exists with different data."
  }
}
```

| HTTP | `error.code`                                       | When                                                                                            |
| ---- | -------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| 401  | —                                                  | missing, invalid or expired access token — refresh it and retry once                            |
| 403  | `checkout_not_enabled`                             | Checkout SDK is not enabled for this store                                                      |
| 422  | `amount_out_of_range` (+ `min_total`, `max_total`) | `sub_total` outside your company's price limits                                                 |
| 403  | `non_taxable_not_allowed`                          | `taxable: false` while the publication's `checkout_type` is not `1`                             |
| 403  | `app_not_installed`                                | app not installed (or uninstalled) on the store                                                 |
| 404  | `checkout_not_found`                               | unknown id, or not this app + store                                                             |
| 409  | `reference_id_conflict`                            | replayed `reference_id` with a different body                                                   |
| 409  | `checkout_in_progress`                             | a concurrent create holds the lock for this `reference_id` — retry with the same `reference_id` |
| 404  | `store_owner_not_found`                            | the store has no owner user — contact Salla support                                             |
| 502  | `upstream_error`                                   | the checkout service failed — retry later with backoff                                          |
| 503  | `checkout_limits_unavailable`                      | price limits temporarily unavailable — retry later with backoff                                 |
| 422  | `validation_failed` (+ `fields`)                   | body rules above                                                                                |
| 429  | `rate_limit_exceeded`                              | over the rate limit (default 60 req/min per app token + store)                                  |

On any HTTP **401**, treat it as an auth failure (token missing, invalid or expired) and refresh
the token — branch on the HTTP status, not on `error.code`.

Public status: `pending` → `paid` | `expired`. An overdue `pending` checkout becomes `expired` and
can no longer be paid — create a new one.

## SDK call

```js
const { checkout } = embedded;
checkout.onResult((r) => {
  /* r.status: paid | pending | failed | cancelled | success; r.order_id; r.checkout_id; r.context */
});
checkout.create({ checkout_id: "zXbVlo" }, { context: { topup: "8812" } });
```

`create(input, config?)` accepts `{ checkout_id: string }` as an alternative to the items form;
mixing both, or an empty id, throws `INVALID_CHECKOUT_INPUT` before any message is sent. The
response is the unchanged `embedded::checkout.response` plus `checkout_id`. After a 3DS redirect
the host sends the `checkout_id` it stored when `create()` ran, never one read from the URL — the
app still confirms payment with `GET /apps/checkouts/{id}` or the webhook. A checkout
that does not belong to the app returns
`{ success: false, status: "failed", error: { code: "CHECKOUT_NOT_FOUND" } }`.
