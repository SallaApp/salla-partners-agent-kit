# Communication App Functions — Event & Payload Reference

The event & payload contract for Communication App Functions. Write the handler with
[salla-app-functions-handler](../../salla-app-functions-handler/SKILL.md), type-check with
[salla-app-functions-validate](../../salla-app-functions-validate/SKILL.md), preview with
[salla-app-functions-test](../../salla-app-functions-test/SKILL.md). Use a webhook
([salla-webhooks](../../salla-webhooks/SKILL.md)) only if delivery must run on your own server.

Source: [Event & Payload Reference](https://docs.salla.dev/2006119m0.md) ·
[Examples](https://docs.salla.dev/2006120m0.md) ·
[Build Function](https://docs.salla.dev/2081248m0.md).

## Events

The events your function receives are controlled by the **Supported Features** you declared
in the Portal. **Local SMS and International SMS both arrive through the same
`communication.sms.send` event** — selecting both features means your app handles all SMS
regardless of destination (route by `notifiable[0]` prefix; see Key patterns).

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

- `notifiable` is an **array** — index it (`notifiable[0]`), and **iterate over every
  recipient** when sending (especially Email; the SendGrid example maps each into
  `personalizations`). SMS/WhatsApp payloads carry a single recipient but are still arrays.
  Route local vs. international SMS off `notifiable[0]`'s prefix, since both share
  `communication.sms.send`.
- `entity` is `{ id, type }` or `null` (OTPs and broadcasts have no entity), so read it
  with optional chaining (`entity?.id`). An unguarded null on `entity`/`meta` is the most
  common cause of a 500.
- `context.settings` holds your provider credentials (keys, sender IDs, API URLs); read
  with optional chaining (`settings?.api_key`).

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
