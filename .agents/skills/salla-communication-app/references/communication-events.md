# Communication App Functions

Communication Apps send messages on behalf of merchants. Each `communication.*.send`
event is an App Function trigger, so prefer an App Function handler — see
[salla-app-functions-handler](../../salla-app-functions-handler/SKILL.md) to write it,
[salla-app-functions-validate](../../salla-app-functions-validate/SKILL.md) to type-check
it, and [salla-app-functions-test](../../salla-app-functions-test/SKILL.md) to preview it.
Only fall back to a webhook subscription (transport, signature verification, idempotency:
[salla-webhooks](../../salla-webhooks/SKILL.md)) if delivery must run on your own server.

Payload reference: https://docs.salla.dev/2006115m0.md | Examples: https://docs.salla.dev/1740884m0.md.

## Events

Each channel maps to a Supported Feature you declare in the Portal and to a dedicated
event. **Local SMS and International SMS both arrive through the same
`communication.sms.send` event** — if you select both features, your app handles all SMS
regardless of destination; inspect `notifiable[0]` to route by number prefix.

| Supported Feature | Event                         | Channel            |
| ----------------- | ----------------------------- | ------------------ |
| Local SMS         | `communication.sms.send`      | SMS to KSA `+966…` |
| International SMS | `communication.sms.send`      | SMS outside KSA    |
| Email             | `communication.email.send`    | Email              |
| WhatsApp          | `communication.whatsapp.send` | WhatsApp           |

## Payload shape

Every communication event delivers the same payload inside `context.payload.data`.
These five fields are all you need to route and deliver a message.

| Field        | Type             | Description                                                  |
| ------------ | ---------------- | ------------------------------------------------------------ |
| `notifiable` | `string[]`       | One or more recipients (phone numbers or email addresses)    |
| `type`       | `string`         | Why this message is sent (e.g. `auth.otp.verification`)      |
| `content`    | `string`         | The ready-to-send message body                               |
| `entity`     | `object \| null` | Related store entity (order, shipment, product, …) or `null` |
| `meta`       | `object`         | Additional context (e.g. `customer_id`, OTP `code`)          |

```typescript
interface CommunicationEventData {
  notifiable: string[]; // recipients — phone numbers (SMS/WhatsApp) or email addresses
  type: string; // why this message is sent, e.g. "auth.otp.verification", "order.status.updated"
  content: string; // ready-to-send message body (may be Arabic or English)
  entity: Record<string, unknown> | null; // related store entity, or null
  meta: Record<string, unknown>; // additional context, e.g. { customer_id }, OTP { code }
}
```

In an App Function this arrives as `context.payload.data`; provider credentials arrive in
`context.settings`. A full list of `type` values is in the event & payload reference.

## Example payload

```json
{
  "notifiable": ["+96656000000"],
  "type": "order.status.updated",
  "content": "Your order #123 is now [Delivered]",
  "entity": { "id": 12345, "type": "order" },
  "meta": { "customer_id": 98765 }
}
```

## Key patterns

- `notifiable` is an **array** (never an object — don't use `.phone`). It may carry more
  than one recipient: **iterate over all of `notifiable`**, don't send only `notifiable[0]`.
  (You may still read `notifiable[0]`'s prefix to route local vs. international SMS, since
  both share `communication.sms.send`.)
- `content` is the final, translated message string — send it as-is, don't reformat
- `type` tells you the reason for the notification (useful for routing — see logging
  caution below)
- `entity` is the related store entity or `null` — guard for `null` before reading it
- `meta` carries extra context (e.g. `customer_id`, OTP `code`)
- `context.settings` holds your delivery provider credentials (keys, sender IDs, API URLs,
  etc.); use optional chaining: `settings?.api_key`

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

Return the App Function response via the `Resp` builder (e.g. `Resp.success(...)` /
`Resp.error(...)`) — the exact contract, timeouts, and sandbox limits live in
[salla-app-functions-handler](../../salla-app-functions-handler/SKILL.md).
