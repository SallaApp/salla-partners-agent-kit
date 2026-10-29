# Checkout API contract

Base `https://api.salla.dev/admin/v2` (the Merchant API). Auth:
`Authorization: Bearer <store access token>` — the app's access token for that store, carrying the
`checkouts` scope: `checkouts.read_write` for `POST`, `checkouts.read` or `checkouts.read_write`
for `GET`. A token without it gets `401`. The store and the app come from the token; the app must
be installed and active on the store. Two endpoints: create and show. Public apps only.

## POST /checkouts — create

```json
{
  "reference_id": "topup-8812",
  "items": [
    {
      "name": { "ar": "500 رسالة", "en": "500 SMS credits" },
      "description": "Top-up for October",
      "amount": 125,
      "quantity": 500
    }
  ],
  "taxable": true
}
```

| Field                 | Rule                                                                                                                      |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `reference_id`        | **required**, string ≤ 64 — your order id, unique per app + store (see "Same `reference_id`" below)                       |
| `items`               | required, at least 1 line                                                                                                 |
| `items.*.amount`      | required, numeric 1–999999.99 — the **line total** (unit price × quantity), SAR, VAT-exclusive                            |
| `items.*.quantity`    | optional integer ≥ 1, default 1                                                                                           |
| `items.*.name`        | required object of locale → string (≤ 255 each), e.g. `{ "ar": "…", "en": "…" }`; the Arabic name is the line's base name |
| `items.*.description` | optional, ≤ 500                                                                                                           |
| `taxable`             | optional bool, default `true`; `false` only when the app's approved publication has `allow_non_taxable: 1`                |
| `currency`            | optional, default `SAR`                                                                                                   |

Salla sets the rest from the token: the source, the app, the partner, and the post-payment page
(`/embedded/app/<app_id>`, which opens your app's default embedded page). A `redirect_uri` sent by
an app is ignored. `cart_id`, `partner_company_id`, `items.*.service_id` and `items.*.service_type`
are rejected with `422`.

`201 Created`, with the full checkout — the same object `GET /checkouts/{cart_id}` returns:

```json
{
  "status": 201,
  "success": true,
  "data": {
    "cart_id": 1449378623,
    "store_id": 1729012345,
    "status": "pending",
    "reference_id": "topup-8812",
    "app_id": 1912797071,
    "taxable": true,
    "currency": "SAR",
    "items": [
      {
        "name": "500 رسالة",
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
    "paid_at": null,
    "payment_url": "https://s.salla.sa/checkout/1449378623"
  }
}
```

- `status`: `pending` → `paid`. There is no expiry: a checkout stays `pending` until it is paid or
  replaced by a new create with the same `reference_id`.
- `items[].total` is the `amount` you sent; `unit_price` = `total / quantity`, rounded to 2
  decimals; `name` is the Arabic base name.
- `sub_total`, `tax` and `total` are the cart's own totals, as the Dashboard checkout page shows
  them: `tax` is the VAT **amount** (`0` on a VAT-exempt checkout), `total` = `sub_total` + `tax`.
- Once paid: `order_id` (integer) is set and `paid_at` is an ISO 8601 timestamp with an offset.
- `payment_url` is the checkout's direct payment link, `<dashboard URL>/checkout/<cart_id>`.
- `cart_id`, `store_id`, `app_id` and `order_id` are integers. Whole amounts may arrive as integers
  (`125`), fractions as floats.

Store `data.cart_id` (the checkout id) and `data.payment_url` with your order. The merchant pays
the checkout one of two ways:

- **Embedded drawer** — pass `String(cart_id)` to `embedded.checkout.create({ checkout_id })`.
- **Payment link** — send `data.payment_url` to the merchant; it opens the Dashboard payment page.
  Use the URL as returned — the host differs per environment.

After either path the merchant returns to `/embedded/app/<app_id>?paid=1&legacy=0` (`paid=` empty
when the payment failed; the URL carries no `order_id`), which opens your app's default embedded
page with the result. Confirm payment with `GET /checkouts/{cart_id}` or the webhook, never from
the URL.

### Same `reference_id`

- The earlier checkout is unpaid → it is replaced: a new checkout with a new `cart_id` is created,
  and the old `cart_id` answers `404` from then on. Store the new one.
- The earlier checkout is paid → `403 reference_id_already_paid`; nothing is created.

Retrying a failed or timed-out create with the same `reference_id` is therefore safe.

## GET /checkouts/{cart_id} — show

The same checkout object as create (`status` 200), read live — use it to confirm payment
(`status: "paid"`, `order_id`, `paid_at`). Only this app's checkouts on this store; any other id
answers `404 not_found`.

## Errors (Salla error envelope)

```json
{
  "status": 403,
  "success": false,
  "error": {
    "code": "reference_id_already_paid",
    "message": "A checkout with this reference_id is already paid."
  }
}
```

| HTTP | `error.code`                | When                                                                      |
| ---- | --------------------------- | ------------------------------------------------------------------------- |
| 401  | —                           | token missing, invalid or expired, or without the `checkouts` scope       |
| 403  | `non_taxable_not_allowed`   | `taxable: false` while the approved publication's `allow_non_taxable` ≠ 1 |
| 403  | `reference_id_already_paid` | the checkout for this `reference_id` is already paid                      |
| 403  | `app_not_installed`         | the app is not installed on the store                                     |
| 404  | `not_found`                 | show: unknown or replaced id, or not this app + store                     |
| 404  | `store_owner_not_found`     | the store has no owner user — contact Salla support                       |
| 422  | (with `error.fields`)       | body rules above                                                          |

On any HTTP **401**, treat it as an auth failure and refresh the token (or add the scope, then
have the merchant re-authorise) — branch on the HTTP status, not on `error.code`.

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
response is the unchanged `embedded::checkout.response` plus `checkout_id`. After payment the host
opens the app's default embedded page with the result; its `checkout_id` is the one the host
stored when `create()` ran, never one read from the URL — the app still confirms payment with
`GET /checkouts/{cart_id}` or the webhook. A checkout that does not belong to the app returns
`{ success: false, status: "failed", error: { code: "CHECKOUT_NOT_FOUND" } }`.
