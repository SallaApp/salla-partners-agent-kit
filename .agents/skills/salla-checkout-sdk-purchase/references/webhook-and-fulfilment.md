# `app.checkout.paid` webhook, fulfilment and test recipe

## Event

Delivered like `app.subscription.*` (App Events family): same app webhook URL, headers,
signature and retries. Sent once per checkout, after the order is created, and carries every
line. Treat it idempotently by `checkout.id`.

```json
{
  "event": "app.checkout.paid",
  "merchant": 1305146709,
  "created_at": "2026-10-19 12:40:02",
  "data": {
    "id": 1662840947,
    "app_name": "SMS Pro",
    "app_description": "Bulk SMS and WhatsApp campaigns for your store",
    "app_type": "public",
    "categories": ["marketing"],
    "checkout": {
      "id": 1449378623,
      "reference_id": "topup-8812",
      "taxable": true,
      "currency": "SAR",
      "sub_total": 125,
      "tax": 18.75,
      "total": 143.75,
      "order_id": 1288447511,
      "paid_at": "2026-10-19T12:40:01+03:00",
      "status": "paid",
      "items": [
        {
          "name": "500 SMS credits",
          "description": "Top-up for October",
          "unit_price": 0.25,
          "quantity": 500,
          "total": 125
        }
      ]
    }
  }
}
```

`merchant` is the store id; correlate the checkout with your order by `checkout.reference_id`.
`checkout.id` and `checkout.order_id` are numbers here, while the API returns `id` as a string —
store and compare checkout ids as strings. `checkout.tax` is the VAT **amount** (`0` when
`taxable` is false). `checkout.paid_at` is an ISO 8601 timestamp with an offset — parse it as
such. `app.checkout.paid` is the only checkout event (checkouts do not expire).

## Idempotent handler (Node / TypeScript)

```typescript
app.post("/webhooks/salla", verifySallaSignature, async (req, res) => {
  const evt = req.body;
  if (evt.event !== "app.checkout.paid") return res.sendStatus(200);

  const c = evt.data.checkout;
  await db.transaction(async (tx) => {
    const first = await tx.insertIgnore("processed_checkouts", {
      checkout_id: String(c.id),
    });
    if (!first) return; // duplicate delivery — already fulfilled
    const order = await tx.findOrder(c.reference_id, evt.merchant);
    await tx.grantCredits(order, c.items); // fulfilment applied exactly once
  });
  res.sendStatus(200); // 200 only after the delivery is persisted
});
```

`verifySallaSignature` → [salla-webhooks](../../salla-webhooks/SKILL.md). Answer `200` only
after the delivery is persisted or enqueued — anything else makes Salla retry.

## Backend create (Node / TypeScript)

```typescript
const res = await fetch("https://api.salla.dev/admin/v2/apps/checkouts", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${storeAccessToken}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    reference_id: order.id,
    items: [{ name: "500 SMS credits", unit_price: 0.25, quantity: 500 }],
    redirect_uri: `/embedded/app/${appId}/topup`, // where the merchant lands after paying
  }),
});
const body = await res.json();
if (!res.ok) return handleCheckoutError(body.error); // table in SKILL.md Step 2
await saveCheckoutId(order.id, body.data.id); // replaces any id stored for this order
return { checkout_id: body.data.id };
```

## Reconciliation

For a pending order with no webhook yet, `GET /apps/checkouts/{id}` with the `checkout_id` you
stored on create, and fulfil through the same idempotent path when `status` is `paid`. A checkout
stays `pending` until it is paid; to change the amount, create again with the same `reference_id`
(it replaces the unpaid checkout).

## Test recipe

1. Install the app on a demo store (→ salla-live-testing); the Checkout SDK must be enabled for
   the store (otherwise `403 checkout_not_enabled`).
2. From your backend, create a checkout with a small `unit_price` (inside the limits) and your
   test `reference_id`; expect `201` and a `data.id`.
3. Create again with the same `reference_id`: expect `201` and a new `data.id`; `GET` on the old
   id answers `404 checkout_not_found`.
4. Open the embedded page, call `checkout.create({ checkout_id })`; the native drawer opens with
   your line items.
5. Pay with the demo store's test card; `onResult` reports `paid` (pending UI only).
6. Expect `app.checkout.paid` at your webhook URL; confirm the fulfilment ran once, and that
   re-sending the same payload changes nothing.
7. `GET /apps/checkouts/{id}` shows `status: "paid"` with `order_id` and `paid_at`; a create with
   the same `reference_id` now answers `403 reference_id_already_paid`.
8. VAT-exempt (only with `checkout_type: 1` on your latest publication — a demo store reads the
   latest one): create with `taxable: false` and expect `tax: 0`.
