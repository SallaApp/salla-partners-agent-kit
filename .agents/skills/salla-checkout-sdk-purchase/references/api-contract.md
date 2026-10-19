# Checkout API contract

Base `https://api.salla.dev/admin/v2`. Auth: `Authorization: Bearer <store access token>` (the
same Salla OAuth token as the other public APIs, e.g. `POST /apps/subscriptions/{id}/renew`). The
token carries scope `checkout-sdk` (`read_write` for POST/cancel); the app is installed on the
store. Rate limit: 60 requests/min per app + store.

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

| Field                   | Rule                                                                                                                       |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `reference_id`          | required, string 1–64, `[A-Za-z0-9_-]`, unique per app + store (idempotency key)                                           |
| `items`                 | required, 1–5 items                                                                                                        |
| `items.*.name`          | required, 1–100 chars (shown to the merchant as the line name)                                                             |
| `items.*.description`   | optional, ≤ 255                                                                                                            |
| `items.*.unit_price`    | required, numeric > 0, ≤ 2 decimals, VAT-exclusive, SAR                                                                    |
| `items.*.quantity`      | required, integer 1–10000                                                                                                  |
| `sub_total` (Σ price×q) | within the effective limits: `min_total` ≤ sub_total ≤ `max_total`, else 422 `amount_out_of_range`                         |
| `taxable`               | optional bool, default `true`; `false` only for apps approved for VAT-exempt checkouts, else 403 `non_taxable_not_allowed` |
| `expires_in`            | optional, minutes 15–10080, default 1440                                                                                   |

`201 Created` (`200 OK` when the same `reference_id` is replayed with an identical body):

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

`data.id` is the value to pass to `embedded.checkout.create({ checkout_id })`. Totals are computed
by Salla (VAT 15 % when `taxable` is true; `tax: 0` and `tax_value: 0` when false).

## GET /apps/checkouts/{id} — show

Same `data` object. `404 checkout_not_found` for another app's or another store's checkout.

## GET /apps/checkouts?reference_id=&status=&page=&per_page= — list

Paginated (Salla pagination envelope), this app + this store only, newest first.
`status` ∈ `pending` | `paid` | `expired` | `canceled`.

## POST /apps/checkouts/{id}/cancel — cancel a pending checkout

`200` with `status: "canceled"`.

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

| HTTP | `error.code`                                       | When                                                                                    |
| ---- | -------------------------------------------------- | --------------------------------------------------------------------------------------- |
| 401  | `unauthorized`                                     | missing / invalid token, or token without scope `checkout-sdk` (`.read_write` for POST) |
| 403  | `checkout_not_enabled`                             | Checkout SDK is switched off platform-wide                                              |
| 422  | `amount_out_of_range` (+ `min_total`, `max_total`) | `sub_total` outside the effective price limits                                          |
| 403  | `non_taxable_not_allowed`                          | `taxable: false` for an app not approved for VAT-exempt checkouts                       |
| 403  | `app_not_installed`                                | app not installed (or uninstalled) on the store                                         |
| 404  | `checkout_not_found`                               | unknown id, or not this app + store                                                     |
| 409  | `reference_id_conflict`                            | replayed `reference_id` with a different body                                           |
| 409  | `checkout_not_cancelable`                          | status is not `pending`                                                                 |
| 422  | `validation_failed` (+ `fields`)                   | body rules above                                                                        |
| 429  | `rate_limit_exceeded`                              | > 60 req/min per app + store                                                            |

Public status: `pending` → `paid` | `expired` | `canceled`. An overdue `pending` checkout becomes
`expired` (swept every 15 minutes) and can no longer be paid — create a new one.

## SDK call

```js
const { checkout } = embedded;
checkout.onResult((r) => {
  /* r.status: paid | pending | failed | cancelled; r.order_id; r.checkout_id; r.context */
});
checkout.create({ checkout_id: "zXbVlo" }, { context: { topup: "8812" } });
```

`create(input, config?)` accepts `{ checkout_id: string }` as an alternative to the items form;
mixing both, or an empty id, throws `INVALID_CHECKOUT_INPUT` before any message is sent. The
response is the unchanged `embedded::checkout.response` plus `checkout_id` echoed. A checkout
that does not belong to the app returns
`{ success: false, status: "failed", error: { code: "CHECKOUT_NOT_FOUND" } }`.
