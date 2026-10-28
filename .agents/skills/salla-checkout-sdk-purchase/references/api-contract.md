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
  "redirect_uri": "/embedded/app/1912797071/topup"
}
```

| Field                   | Rule                                                                                                                        |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `reference_id`          | required, string 1–64, `[A-Za-z0-9_-]`, your order id, unique per app + store (see "Same `reference_id`" below)             |
| `items`                 | required, 1–5 items                                                                                                         |
| `items.*.name`          | required, 1–100 chars (shown to the merchant as the line name)                                                              |
| `items.*.description`   | optional, ≤ 255                                                                                                             |
| `items.*.unit_price`    | required, numeric > 0, ≤ 2 decimals, VAT-exclusive, SAR                                                                     |
| `items.*.quantity`      | required, integer 1–10000                                                                                                   |
| `sub_total` (Σ price×q) | within your company's limits: `min_total` ≤ sub_total ≤ `max_total`, else 422 `amount_out_of_range`                         |
| `taxable`               | optional bool, default `true`; `false` only when the publication has `checkout_type: 1`, else 403 `non_taxable_not_allowed` |
| `redirect_uri`          | optional string ≤ 255 — a merchant dashboard path (appended to the dashboard host) where the merchant lands after paying    |

`201 Created`, with the checkout as `GET /apps/checkouts/{id}` returns it:

```json
{
  "status": 201,
  "success": true,
  "data": {
    "id": "1449378623",
    "status": "pending",
    "reference_id": "topup-8812",
    "taxable": true,
    "currency": "SAR",
    "items": [
      {
        "name": "500 SMS credits",
        "description": "Top-up for October",
        "unit_price": 0.25,
        "quantity": 500,
        "total": 125
      }
    ],
    "sub_total": 125,
    "tax": 18.75,
    "total": 143.75,
    "order_id": null,
    "paid_at": null
  }
}
```

`data.id` is the value to pass to `embedded.checkout.create({ checkout_id })`. Totals are computed
by Salla: `items[].total` = `unit_price` × `quantity`, `sub_total` = Σ line totals, `tax` = the VAT
**amount** (the Marketplace VAT rate — 15 % in Saudi Arabia — per line, rounded per line, when
`taxable` is true; `0` when false),
`total` = `sub_total` + `tax`. Whole numbers may arrive as integers (`125`), fractions as floats.

### Same `reference_id`

- The earlier checkout is unpaid → it is replaced: a new checkout with a new `id` is created, and
  the old `id` answers `404 checkout_not_found`. Store the new `id`.
- The earlier checkout is paid → `403 reference_id_already_paid`; nothing is created.

Retrying a failed or timed-out create with the same `reference_id` is therefore safe.

## GET /apps/checkouts/{id} — show

Same `data` object. `id` must belong to the token's app **and** store, otherwise
`404 checkout_not_found` (also for a replaced checkout). Once paid, `status` is `"paid"`,
`order_id` is set (a number) and `paid_at` is an ISO 8601 timestamp with an offset.

Public status: `pending` → `paid`. There is no expiry: a checkout stays `pending` until it is paid
or replaced by a new create with the same `reference_id`.

## Errors (Salla error envelope)

```json
{
  "status": 403,
  "success": false,
  "error": {
    "code": "reference_id_already_paid",
    "message": "A checkout with this reference_id has already been paid."
  }
}
```

| HTTP | `error.code`                                       | When                                                                 |
| ---- | -------------------------------------------------- | -------------------------------------------------------------------- |
| 401  | —                                                  | missing, invalid or expired access token — refresh it and retry once |
| 403  | `checkout_not_enabled`                             | Checkout SDK is not enabled for this store                           |
| 403  | `non_taxable_not_allowed`                          | `taxable: false` while the publication's `checkout_type` is not `1`  |
| 403  | `reference_id_already_paid`                        | the checkout for this `reference_id` is already paid                 |
| 404  | `checkout_not_found`                               | unknown or replaced id, or not this app + store                      |
| 422  | `validation_failed` (+ `fields`)                   | body rules above                                                     |
| 422  | `amount_out_of_range` (+ `min_total`, `max_total`) | `sub_total` outside your company's price limits                      |
| 422  | other codes                                        | passed through from the checkout service — read `error.message`      |
| 429  | `rate_limit_exceeded`                              | over the rate limit (default 60 req/min per app token + store)       |
| 502  | `upstream_error`                                   | the checkout service failed — retry later with backoff               |
| 503  | `checkout_limits_unavailable`                      | price limits temporarily unavailable — retry later with backoff      |

On any HTTP **401**, treat it as an auth failure (token missing, invalid or expired) and refresh
the token — branch on the HTTP status, not on `error.code`.

## SDK call

```js
const { checkout } = embedded;
checkout.onResult((r) => {
  /* r.status: paid | pending | failed | cancelled | success; r.order_id; r.checkout_id; r.context */
});
checkout.create({ checkout_id: "1449378623" }, { context: { topup: "8812" } });
```

`create(input, config?)` accepts `{ checkout_id: string }` as an alternative to the items form;
mixing both, or an empty id, throws `INVALID_CHECKOUT_INPUT` before any message is sent. The
response is the unchanged `embedded::checkout.response` plus `checkout_id`. After a 3DS redirect
the host sends the `checkout_id` it stored when `create()` ran, never one read from the URL — the
app still confirms payment with `GET /apps/checkouts/{id}` or the webhook. A checkout
that does not belong to the app returns
`{ success: false, status: "failed", error: { code: "CHECKOUT_NOT_FOUND" } }`.
