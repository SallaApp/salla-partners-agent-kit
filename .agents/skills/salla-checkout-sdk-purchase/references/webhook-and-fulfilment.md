# `app.checkout.paid` webhook, fulfilment and test recipe

## Event

Delivered like `app.subscription.*` (App Events family): same app webhook URL, headers,
signature and retries. Sent after the order is created. Treat it idempotently by `checkout.id`.

```json
{
  "event": "app.checkout.paid",
  "merchant": 1305146709,
  "created_at": "2026-10-19 12:40:02",
  "data": {
    "id": 1662840947,
    "app_name": "SMS Pro",
    "app_type": "app",
    "categories": ["marketing"],
    "store_type": "live",
    "checkout": {
      "id": "zXbVlo",
      "reference_id": "topup-8812",
      "status": "paid",
      "order_id": "1098273465",
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
      "paid_at": "2026-10-19 12:40:01"
    }
  }
}
```

`merchant` is the store id; correlate the checkout with your order by `checkout.reference_id`.
Only `app.checkout.paid` exists for checkouts; expiry and cancellation are read from
`GET /apps/checkouts/{id}`.

## Idempotent handler (Node / TypeScript)

```typescript
app.post("/webhooks/salla", verifySallaSignature, async (req, res) => {
  res.sendStatus(200); // answer fast, process async
  const evt = req.body;
  if (evt.event !== "app.checkout.paid") return;

  const c = evt.data.checkout;
  await db.transaction(async (tx) => {
    const first = await tx.insertIgnore("processed_checkouts", {
      checkout_id: c.id,
    });
    if (!first) return; // duplicate delivery — already fulfilled
    const order = await tx.findOrder(c.reference_id, evt.merchant);
    await tx.grantCredits(order, c.items); // fulfilment applied exactly once
  });
});
```

`verifySallaSignature` → [salla-webhooks](../../salla-webhooks/SKILL.md).

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
  }),
});
const body = await res.json();
if (!res.ok) return handleCheckoutError(body.error); // table in SKILL.md Step 2
return { checkout_id: body.data.id };
```

## Reconciliation

For a pending order with no webhook yet, `GET /apps/checkouts?reference_id=<order id>` and fulfil
through the same idempotent path when `status` is `paid`. Mark the order failed when `status` is
`expired` or `canceled`.

## Test recipe

1. Install the app on a demo store (→ salla-live-testing) and grant `checkout-sdk` on install; the
   scope must be enabled for your partner account.
2. From your backend, create a checkout with a small `unit_price` (inside the limits) and your
   test `reference_id`; expect `201` and a `data.id`.
3. Replay the same call: expect `200` and the same `data.id`. Change an item and replay: expect `409 reference_id_conflict`.
4. Open the embedded page, call `checkout.create({ checkout_id })`; the native drawer opens with
   your line items.
5. Pay with the demo store's test card; `onResult` reports `paid` (pending UI only).
6. Expect `app.checkout.paid` at your webhook URL; confirm the fulfilment ran once, and that
   re-sending the same payload changes nothing.
7. `GET /apps/checkouts/{id}` shows `status: "paid"` with `order_id` and `paid_at`.
8. Create a second checkout and `POST /apps/checkouts/{id}/cancel`: expect `status: "canceled"`.
