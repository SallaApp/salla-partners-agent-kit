# Salla Webhook Events Reference

---

## Signature Verification

Every incoming webhook must be verified using HMAC-SHA256:

```ts
import crypto from 'crypto';

function verifyWebhook(rawBody: string, signature: string, secret: string): boolean {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

// Express middleware
app.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const sig = req.headers['x-salla-signature'] as string;
  if (!verifyWebhook(req.body.toString(), sig, process.env.WEBHOOK_SECRET!)) {
    return res.status(401).send('Unauthorized');
  }
  const payload = JSON.parse(req.body.toString());
  handleEvent(payload.event, payload.data);
  res.status(200).send('OK');
});
```

Always return `200` quickly — if processing takes time, acknowledge immediately and handle async.

---

## App Events (Lifecycle)

Fired when merchants interact with your app. These come automatically — no subscription needed.

| Event | Trigger | Key data |
| --- | --- | --- |
| `app.installed` | Merchant installs your app | `merchant`, `data.access_token`, `data.refresh_token` |
| `app.updated` | App updated (new version released) | `merchant`, `version` |
| `app.trial.started` | Trial period begins | `merchant`, `trial_ends_at` |
| `app.trial.ended` | Trial expires without subscription | `merchant` |
| `app.subscription.started` | Merchant subscribes to a paid plan | `merchant`, `plan`, `subscription` |
| `app.subscription.ended` | Subscription cancelled/lapsed | `merchant`, `plan` |
| `app.subscription.renewed` | Subscription auto-renewed | `merchant`, `plan`, `next_renewal` |
| `app.rated` | Merchant rates your app | `merchant`, `rating`, `review` |

---

## Store Events by Category

### Orders

| Event | Trigger |
| --- | --- |
| `order.created` | New order placed |
| `order.updated` | Order details changed |
| `order.status.updated` | Order status changed (pending → processing → shipped etc.) |
| `order.cancelled` | Order cancelled |
| `order.refunded` | Refund issued |
| `order.deleted` | Order deleted |

### Products

| Event | Trigger |
| --- | --- |
| `product.created` | New product added |
| `product.updated` | Product details changed |
| `product.deleted` | Product removed |
| `product.quantity.low` | Stock below threshold |
| `product.available` | Out-of-stock product restocked |

### Customers

| Event | Trigger |
| --- | --- |
| `customer.created` | New customer registered |
| `customer.updated` | Customer profile changed |
| `customer.login` | Customer logged in |
| `customer.otp.request` | OTP requested |

### Shipments

| Event | Trigger |
| --- | --- |
| `shipping.shipment.creating` | Merchant initiates a shipment (sync — respond with rates) |
| `shipping.shipment.created` | Shipment confirmed |
| `shipping.shipment.cancelled` | Shipment cancelled |
| `shipping.shipment.return.created` | Return shipment created |

### Stores

| Event | Trigger |
| --- | --- |
| `store.updated` | Store settings changed |
| `store.branch.created` | New branch added |
| `store.branch.updated` | Branch details changed |
| `store.branch.deleted` | Branch removed |

### Categories & Brands

| Event | Trigger |
| --- | --- |
| `category.created` | New category created |
| `category.updated` | Category updated |
| `category.deleted` | Category deleted |
| `brand.created` | New brand created |
| `brand.updated` | Brand updated |

### Miscellaneous

| Event | Trigger |
| --- | --- |
| `coupon.applied` | Coupon used at checkout |
| `review.added` | Product review submitted |
| `abandoned.cart` | Cart abandoned (no checkout within threshold) |

---

## Webhook Payload Envelope

```json
{
  "event": "order.created",
  "merchant": {
    "id": 12345,
    "store_id": 67890
  },
  "created_at": "2026-01-01T12:00:00Z",
  "data": { }
}
```

---

## Best Practices

- **Idempotency** — store processed event IDs; replay is possible
- **Fast acknowledgement** — return `200` in under 5s; use queues for heavy processing
- **Retry handling** — Salla retries failed deliveries; handle duplicates gracefully
- **Error responses** — non-2xx causes Salla to retry; only return errors if you want a retry

---

## Resources

| Topic | Link |
| --- | --- |
| Webhooks guide + full event list | https://docs.salla.dev/421119m0 |
| App Events (lifecycle) | https://docs.salla.dev/doc-421413 |
