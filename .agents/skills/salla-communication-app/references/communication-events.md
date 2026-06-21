# Communication App Functions — Event & Payload Reference

Communication Apps send messages on behalf of merchants. Each `communication.*.send`
event is an App Function trigger, so prefer an App Function handler — see
[salla-app-functions-handler](../../salla-app-functions-handler/SKILL.md) to write it,
[salla-app-functions-validate](../../salla-app-functions-validate/SKILL.md) to type-check
it, and [salla-app-functions-test](../../salla-app-functions-test/SKILL.md) to preview it.
Only fall back to a webhook subscription (transport, signature verification, idempotency:
[salla-webhooks](../../salla-webhooks/SKILL.md)) if delivery must run on your own server.

Source: [Event & Payload Reference](https://docs.salla.dev/2006119m0.md) ·
[Examples](https://docs.salla.dev/2006120m0.md) ·
[Build Function](https://docs.salla.dev/2081248m0.md).

## Events

The events your function receives are controlled by the **Supported Features** you declared
in the Portal. **Local SMS and International SMS both arrive through the same
`communication.sms.send` event** — if you select both features, your app handles all SMS
regardless of destination; inspect `notifiable[0]` to route by number prefix.

| Event                         | Fires when                               | Controlled by Supported Feature    |
| ----------------------------- | ---------------------------------------- | ---------------------------------- |
| `communication.sms.send`      | Salla needs to send an SMS to a customer | Local SMS and/or International SMS |
| `communication.email.send`    | Salla needs to send an email             | Email                              |
| `communication.whatsapp.send` | Salla needs to send a WhatsApp message   | WhatsApp                           |

## Payload shape (`CommunicationEvent`)

Salla passes a `CommunicationEvent` to your handler. The message data lives in
`context.payload.data`; provider credentials in `context.settings`.

```typescript
interface CommunicationData {
  /** One or more recipients. Phone numbers for SMS/WhatsApp, email addresses for Email. */
  notifiable: string[];
  /** Why this message is being sent (see Event types table). */
  type: string;
  /** Ready-to-send message body. May be Arabic or English. Send as-is. */
  content: string;
  /** The Salla store entity this message relates to. null for OTPs and broadcasts. */
  entity: {
    id: number | string;
    type: "order" | "cart" | "shipment" | "product" | "feedback" | string;
  } | null;
  /** Extra context: e.g. { customer_id: number } or OTP { code: string } */
  meta: Record<string, any>;
}

interface CommunicationPayload {
  event:
    | "communication.sms.send"
    | "communication.email.send"
    | "communication.whatsapp.send";
  merchant: number;
  created_at: string;
  data: CommunicationData;
}

interface CommunicationEvent {
  merchant: { id: string };
  payload: CommunicationPayload;
  settings: Record<string, string>; // your provider credentials from App Settings
}
```

### The five `data` fields

| Field        | Type                   | Description                                               |
| ------------ | ---------------------- | --------------------------------------------------------- |
| `notifiable` | `string[]`             | One or more recipients (phone numbers or email addresses) |
| `type`       | `string`               | Why this message is sent (e.g. `auth.otp.verification`)   |
| `content`    | `string`               | The ready-to-send message body                            |
| `entity`     | `{ id, type } \| null` | Related store entity, or `null` for OTPs/broadcasts       |
| `meta`       | `object`               | Additional context (e.g. `customer_id`, OTP `code`)       |

## Example payload

```json
{
  "payload": {
    "event": "communication.sms.send",
    "merchant": 292111819,
    "created_at": "Mon Nov 10 2025 17:18:13 GMT+0300",
    "data": {
      "notifiable": ["+96656000000"],
      "type": "order.status.updated",
      "content": "Your order #123 is now [Delivered]",
      "entity": { "id": 12345, "type": "order" },
      "meta": { "customer_id": 98765 }
    }
  },
  "settings": { "sms_api_key": "your-key", "sms_sender_id": "MyStore" },
  "merchant": { "id": "292111819" }
}
```

## `type` values

`data.type` tells you the reason for the notification. Common values
([Event & Payload Reference](https://docs.salla.dev/2006119m0.md)):

| `type`                         | Entity type | Notable `meta`                          | Channels             |
| ------------------------------ | ----------- | --------------------------------------- | -------------------- |
| `order.status.confirmation`    | `order`     | `customer_id`                           | Email, SMS, WhatsApp |
| `order.status.updated`         | `order`     | `customer_id`                           | Email, SMS, WhatsApp |
| `order.invoice.issued`         | `order`     | `customer_id`                           | Email, SMS, WhatsApp |
| `product.digital.code`         | `order`     | `customer_id`                           | Email, SMS, WhatsApp |
| `order.refund.processed`       | `order`     | `customer_id`                           | SMS, WhatsApp        |
| `order.notification.create`    | `order`     | `customer_id`                           | WhatsApp             |
| `order.gift.placed`            | `order`     | `customer_id`                           | SMS, WhatsApp        |
| `payment.reminder.due`         | `order`     | `customer_id`                           | SMS, WhatsApp        |
| `customer.cart.abandoned`      | `cart`      | `customer_id`, `discount`, `expires_at` | SMS, WhatsApp        |
| `product.availability.alert`   | `product`   | `customer_id`                           | Email, SMS, WhatsApp |
| `customer.rating.request`      | `order`     | —                                       | Email, SMS, WhatsApp |
| `customer.feedback.reply`      | `feedback`  | —                                       | Email, SMS, WhatsApp |
| `customer.loyalty.earned`      | `null`      | `customer_id`, `points`                 | Email, SMS, WhatsApp |
| `auth.otp.verification`        | `null`      | `code`                                  | Email, SMS, WhatsApp |
| `marketing.campaign.broadcast` | `null`      | —                                       | Email, SMS, WhatsApp |
| `system.message.custom`        | `null`      | `customer_id`                           | Email, SMS, WhatsApp |
| `system.alert.general`         | `null`      | `customer_id`                           | Email, SMS, WhatsApp |

This list reflects the documented event types; treat it as the common set, not a closed
enum — `type` and `entity.type` are typed as `string`, so guard for values you don't
recognise and fall through to `Resp.success()`.

## Entity type reference

When `entity` is present, use its `id` to fetch more detail via the Admin API
([salla-api-core](../../salla-api-core/SKILL.md)):

| `entity.type` | Refers to         | API reference                      |
| ------------- | ----------------- | ---------------------------------- |
| `order`       | A store order     | https://docs.salla.dev/api-5394146 |
| `shipment`    | A shipment        | https://docs.salla.dev/api-5394232 |
| `cart`        | A shopping cart   | https://docs.salla.dev/api-5394138 |
| `feedback`    | A customer review | https://docs.salla.dev/16603963e0  |
| `product`     | A product         | https://docs.salla.dev/api-5394200 |

## Key patterns

- `notifiable` is an **array** (never an object — don't use `.phone`). It may carry more
  than one recipient, especially for Email: **iterate over all of `notifiable`** rather
  than sending only `notifiable[0]` (the SendGrid example maps every recipient into
  `personalizations`). For SMS/WhatsApp the documented payloads carry a single recipient,
  but still treat it as an array. You may read `notifiable[0]`'s prefix to route local vs.
  international SMS, since both share `communication.sms.send`.
- `content` is the final, translated message string — send it as-is, don't reformat.
- `type` tells you the reason for the notification (useful for routing — see logging
  caution below).
- `entity` is `{ id, type }` or `null` (OTPs and broadcasts have no entity) — **always
  guard for `null` with optional chaining (`entity?.id`) before reading it.** An unguarded
  null on `entity`/`meta` is the most common cause of a 500.
- `meta` carries extra context (e.g. `customer_id`, OTP `code`, loyalty `points`, cart
  `discount`/`expires_at`).
- `context.settings` holds your delivery provider credentials (keys, sender IDs, API URLs);
  use optional chaining: `settings?.api_key`.

## Security & PII (sends real customer messages)

- **Never log** `content`, `notifiable` (phone numbers / emails), or anything in
  `settings` (`api_key`, tokens, sender IDs). Redact them from errors and traces.
- Read the provider endpoint/API key from `settings` as **untrusted input**: validate
  the URL (allowed scheme/host) before calling it; don't follow arbitrary endpoints.
- On provider auth failure, fail safely — surface a generic error; never echo the
  provider's raw response or your delivery credentials back to Salla or the merchant.
- Token/OAuth handling (if you also call the Admin API) →
  [salla-app-auth](../../salla-app-auth/SKILL.md); webhook signature verification +
  idempotency (webhook fallback only) → [salla-webhooks](../../salla-webhooks/SKILL.md).

## Response contract

Return the App Function response via the `Resp` builder — `Resp.success()` /
`Resp.error()`, chained with `.setMessage()`, `.setStatus()`, `.setData()`. Return early
with `Resp.success()` for events your app intentionally ignores (an unrecognised event is
not an error). The exact contract, timeouts, and sandbox limits live in
[salla-app-functions-handler](../../salla-app-functions-handler/SKILL.md).

### Common error statuses

| Status  | Common cause                                             | Fix                                                |
| ------- | -------------------------------------------------------- | -------------------------------------------------- |
| 422     | Merchant hasn't filled required API keys in App Settings | Check `context.settings`; prompt setup             |
| 401/403 | Invalid or expired provider API key                      | Merchant must supply a valid, active key           |
| 429     | Provider rate limit hit                                  | Retry logic / check provider throughput            |
| 503     | Provider timed out (slower than `AbortSignal.timeout`)   | Raise timeout slightly (max ~20s) / check provider |
| 500     | Unhandled null on `entity`/`meta`                        | Use optional chaining on optional fields           |
