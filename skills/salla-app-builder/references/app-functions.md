# App Functions

Serverless TypeScript handlers that execute automatically on Salla events.
No infrastructure to manage — write the logic, Salla runs it.

Docs: https://docs.salla.dev/1726817m0 | Get started: https://docs.salla.dev/1726815m0

## Execution types

| Type               | Timing                     | Blocks user? | Timeout          |
| ------------------ | -------------------------- | ------------ | ---------------- |
| Asynchronous event | After operation completes  | No           | 30 s             |
| Synchronous action | Before operation completes | Yes          | Must be < 500 ms |

Async return values are ignored. Sync return values can modify or reject the operation.

## Context object

Every function receives:

```typescript
context.merchant; // { id: string, … }
context.payload; // { event: string, created_at: string, data: { … } }
context.settings; // Record<string, string>  — your app's per-merchant settings
```

For Salla API calls inside a function, authentication is automatic — no Authorization
header needed.

## TypeScript typed contexts

Every event has a typed interface. Use it to get autocomplete on `payload.data`:

```typescript
export default async (context: OrderCreatedContext): Promise<Resp> => {
  const orderId = context.payload.data.id;
  return Resp.success().setData({ order_id: orderId });
};
```

Common context types: `OrderCreatedContext`, `OrderStatusUpdated`, `ProductAddedContext`,
`ShipmentCreatingContext`, `CommunicationEvent`, and many more.
See full event list: https://docs.salla.dev/1726818m0

## Portal template — locked lines

The Portal wraps your code in a fixed template. Lines 1 and 4 are locked.
You can only edit the body. Nothing can go before line 1 or after line 4.

```
1  export default async (context: ContextType): Promise<Resp> => {
2    // editable body
3    ...
4  };
```

`CommunicationEvent`, `Resp`, and all context types are **pre-declared by the Salla runtime**.
Do NOT re-declare them in the code you paste into the Portal.

## Resp API

```typescript
// Success — setData is required
Resp.success().setData({ order_id: id });

// Error — setMessage and setStatus; setData is optional
Resp.error().setMessage("Something went wrong").setStatus(500);
Resp.error().setStatus(res.status);
```

The builder pattern returns `this` — all methods are chainable.

## Settings

Merchant-configured values (API keys, URLs, flags) live in `context.settings`.
They are set in the Salla Partners Portal App Settings UI.

```typescript
const apiKey = context.settings?.apiKey;
const endpoint = context.settings?.webhookUrl;
```

Always use optional chaining (`settings?.myKey`) — settings may be undefined until configured.

## Local development mock pattern

Since `Resp` and typed context interfaces are runtime globals, local TypeScript won't know
about them. Place mocks AFTER the handler with a clear comment:

```typescript
export default async (context: MyContextType): Promise<Resp> => {
  // ... handler body ...
};

// Don't paste following code into Salla's App Function
// Mocks for local IDE type checking only
interface MyContextType {
  merchant: { id: string };
  payload: { event: string; created_at: string; data: Record<string, unknown> };
  settings: Record<string, string | undefined>;
}

class Resp {
  static success() {
    return new Resp();
  }
  static error() {
    return new Resp();
  }
  setStatus(s: number) {
    return this;
  }
  setMessage(m: string) {
    return this;
  }
  setData(d: Record<string, unknown>) {
    return this;
  }
}
```

Paste ONLY the handler into the Portal (stop before the comment line).

## Testing

Use the Portal preview panel with a demo store to test before publishing.
Testing guide: https://docs.salla.dev/1726816m0
Demo stores: https://salla.dev/blog/how-to-test-your-app-using-salla-demo-stores/
