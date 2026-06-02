# Salla Webhook Events Reference

---

## Signature Verification

Salla webhooks carry the signature in `Authorization: Bearer <hex-sig>`. Verify using Web Crypto (timing-safe) before trusting the payload:

```ts
async function verifyWebhook(req: Request, secret: string): Promise<boolean> {
  const sig = req.headers.get('Authorization')?.replace('Bearer ', '') ?? '';
  const body = await req.text(); // must read raw body before any JSON parsing

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify'],
  );

  return crypto.subtle.verify(
    'HMAC',
    key,
    hexToBytes(sig),
    new TextEncoder().encode(body),
  );
}

function hexToBytes(hex: string): Uint8Array {
  const arr = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2)
    arr[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  return arr;
}
```

Use `crypto.subtle.verify` — never compare signatures with `===`.

Respond with `200 OK` within **3 seconds**. Offload heavy processing to a background queue.

---

## App Events (Lifecycle)

Fired automatically — no manual subscription needed.

| Event | Trigger | Suggested action |
| --- | --- | --- |
| `app.store.authorize` | Install or token refresh | Store access + refresh tokens |
| `app.trial.started` | Trial begins | Provision resources |
| `app.trial.expired` | Trial ended without upgrade | Restrict access |
| `app.subscription.started` | Paid subscription begins | Mark merchant as active |
| `app.subscription.expired` | Paid subscription lapsed | Restrict access |
| `app.subscription.renewed` | Subscription auto-renewed | Extend expiry in your DB |
| `app.uninstalled` | Merchant removes the app | Delete merchant data |
| `app.rated` | Merchant rates your app | Log or notify team |

---

## Store Events by Category

### Orders

| Event | Trigger |
| --- | --- |
| `order.created` | New order placed |
| `order.updated` | Order details changed |
| `order.status.updated` | Order status changed |
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
| `abandoned.cart` | Cart abandoned |

---

## Webhook Payload Envelope

```json
{
  "event": "order.created",
  "merchant": 123456789,
  "created_at": "2026-01-01T12:00:00+03:00",
  "data": { }
}
```

Note: `merchant` is a plain integer (the merchant ID), not an object.

---

## Best Practices

- **Idempotency** — store processed event IDs; Salla may deliver duplicates
- **Fast acknowledgement** — return `200` within 3 seconds; offload slow work to a queue
- **Retry policy** — Salla retries up to 5 times with exponential backoff on non-2xx or timeout
- **Raw body** — always read the raw request body for signature verification before parsing JSON

---

## Resources

| Topic | Link |
| --- | --- |
| Webhooks guide + full event list | https://docs.salla.dev/421119m0 |
| App Events (lifecycle) | https://docs.salla.dev/doc-421413 |
