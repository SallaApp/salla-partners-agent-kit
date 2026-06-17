# Communication App Functions

Communication Apps send messages on behalf of merchants. Salla fires an App Function
for each notification — your function delivers it via SMS, WhatsApp, email, or any
other channel.

Payload reference: https://docs.salla.dev/1380572m0 | Examples: https://docs.salla.dev/1740884m0

## Events

| Event                         | Channel  |
| ----------------------------- | -------- |
| `communication.sms.send`      | SMS      |
| `communication.whatsapp.send` | WhatsApp |
| `communication.email.send`    | Email    |

## CommunicationEvent shape

```typescript
interface CommunicationEvent {
  merchant: { id: string };
  payload: {
    event:
      | "communication.sms.send"
      | "communication.whatsapp.send"
      | "communication.email.send";
    merchant: number;
    created_at: string;
    data: {
      notifiable: string[]; // recipients — phone numbers (SMS/WhatsApp) or email addresses
      content: string; // ready-to-send message body (may be Arabic or English)
      type: string; // reason for the message, e.g. "order.status.updated"
      entity: {
        id: number | string;
        type: "order" | "cart" | "shipment" | "product" | "feedback" | string;
      } | null;
      meta: Record<string, unknown>;
    };
  };
  settings: Record<string, string>;
}
```

## Example payload

```json
{
  "payload": {
    "event": "communication.whatsapp.send",
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
  "settings": { "api_key": "…", "sender_id": "MyStore" },
  "merchant": { "id": "292111819" }
}
```

## Key patterns

- Recipients arrive as `notifiable[0]` — it's an array, not an object (never use `.phone`)
- `content` is the final, translated message string — send it as-is, don't reformat
- `type` tells you the reason for the notification (useful for logging / routing)
- `settings` holds your delivery provider credentials (keys, sender IDs, API URLs, etc.)
- Use optional chaining on settings: `settings?.api_key`
