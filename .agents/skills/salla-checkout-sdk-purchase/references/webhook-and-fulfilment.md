# `app.checkout.paid` webhook, fulfilment and test recipe

## Event

Delivered like `app.subscription.*` (App Events family): same app webhook URL, headers,
signature and retries, for embedded and non-embedded apps alike. Sent once per checkout, after the order is created, and carries every
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
      "status": "paid",
      "subtotal": { "amount": 125, "currency": "SAR" },
      "total_discount": { "amount": 0, "currency": "SAR" },
      "tax": { "amount": 18.75, "currency": "SAR" },
      "total": { "amount": 143.75, "currency": "SAR" },
      "checkout_url": "https://s.salla.sa/checkout/1449378623",
      "paid_at": "2026-10-19T12:40:01+03:00",
      "items": [
        {
          "name": "500 رسالة",
          "description": "Top-up for October",
          "quantity": 500,
          "amounts": {
            "price_without_tax": { "amount": 0.25, "currency": "SAR" },
            "total_discount": { "amount": 0, "currency": "SAR" },
            "tax": {
              "percent": 15,
              "amount": { "amount": 18.75, "currency": "SAR" }
            },
            "total": { "amount": 143.75, "currency": "SAR" }
          }
        }
      ]
    }
  }
}
```

`merchant` is the store id; correlate the checkout with your order by `checkout.reference_id`.
`checkout` is the same object that create and show return (→ [api-contract.md](api-contract.md)):
`checkout.id` is the same integer `id` (the SDK takes it as `String(id)`), every amount is a
`{ amount, currency }` object, and `checkout.tax.amount` is the VAT **amount** (`0` on a VAT-exempt
checkout). `checkout.paid_at` is an ISO 8601 timestamp with an offset — parse it as such.
`app.checkout.paid` is the only checkout event (checkouts do not expire).

## Idempotent handler (Node / TypeScript)

```typescript
app.post("/webhooks/salla", verifySallaSignature, async (req, res) => {
  const evt = req.body;
  if (evt.event !== "app.checkout.paid") return res.sendStatus(200);

  const c = evt.data.checkout;
  await db.transaction(async (tx) => {
    const first = await tx.insertIgnore("processed_checkouts", {
      checkout_id: c.id, // same integer as create and show
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
const res = await fetch("https://api.salla.dev/admin/v2/checkouts", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${storeAccessToken}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    reference_id: order.id,
    items: [
      // amount = line total (0.25 × 500), SAR, VAT-exclusive
      {
        name: { ar: "500 رسالة", en: "500 SMS credits" },
        amount: 125,
        quantity: 500,
      },
    ],
  }),
});
const body = await res.json();
if (!res.ok) return handleCheckoutError(body.error); // table in SKILL.md Step 2
await saveCheckoutId(order.id, body.data.id); // replaces any id stored for this order
return { checkout_id: body.data.id, checkout_url: body.data.checkout_url };
```

## Reconciliation

For a pending order with no webhook yet, `GET /admin/v2/checkouts/{id}` with the `id` you stored
on create, and fulfil through the same idempotent path when `status` is `paid`. A checkout
stays `pending` until it is paid; to change the amount, create again with the same `reference_id`
(it replaces the unpaid checkout).

## Test recipe

1. Add the `checkouts` scope (`read_write`), then install the app on a demo store
   (→ salla-live-testing) so the token carries it.
2. From your backend, create a checkout with a small `amount` and your test `reference_id`;
   expect `201` and a `data.id`.
3. Create again with the same `reference_id`: expect `201` and a new `data.id`; `GET` on the
   old id answers `404 not_found`.
4. Embedded app: open the embedded page and call `checkout.create({ checkout_id: String(id) })`;
   the native drawer opens with your line items. Non-embedded app: open `data.checkout_url` from
   your partner dashboard.
5. A partner demo store charges 0 for Checkout API purchases (`subtotal`, `tax` and `total` are 0):
   confirm without a card. Embedded: the dashboard returns to your app's default embedded page and
   `onResult` reports `paid` there (pending UI only). Non-embedded: the merchant lands on the
   app's installed-app page in the dashboard.
6. Expect `app.checkout.paid` at your webhook URL with total 0; confirm the fulfilment ran once, and that
   re-sending the same payload changes nothing.
7. `GET /admin/v2/checkouts/{id}` shows `status: "paid"` with `paid_at`; a create with
   the same `reference_id` now answers `403 reference_id_already_paid`.
8. VAT-exempt (only once the approved publication has `cart_tax_policy: 1`): create with
   `taxable: false` and expect `tax.amount: 0` and each line's `tax.percent: 0`.
