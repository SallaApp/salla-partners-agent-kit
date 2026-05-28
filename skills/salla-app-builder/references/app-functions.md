# App Functions

Serverless TypeScript handlers that execute automatically on Salla events.
No infrastructure to manage — write the logic, Salla runs it.

Docs: https://docs.salla.dev/1726817m0 | Get started: https://docs.salla.dev/1726815m0

## Execution types

| Type               | Timing                     | Blocks user? | Timeout          | Response Behavior                                                            |
| ------------------ | -------------------------- | ------------ | ---------------- | ---------------------------------------------------------------------------- |
| Asynchronous event | After operation completes  | No           | 30 s             | Fire-and-forget: Return values are logged but do not affect the flow.        |
| Synchronous action | Before operation completes | Yes          | Must be < 500 ms | Blocking: Return values can modify parameters or reject/block the operation. |

### Synchronous Actions (Blocking)

Synchronous actions (e.g., `shipment.creating`) allow you to intercept the store's lifecycle:

- **Reject/Block:** Return `Resp.error()` to cancel the operation and display an error message directly to the customer or merchant in the storefront/dashboard.
- **Modify Parameters:** Return modified data in `Resp.success().setData({ ... })` to alter properties (e.g., updating shipment details) before the action completes.

### Asynchronous Events (Non-Blocking)

Asynchronous events (e.g., `order.created`, `product.added`) run out-of-band:

- Return values do not affect the merchant's flow, but you should still return a valid `Resp.success()` or `Resp.error()` to record status and debugging information in Salla's execution logs.

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

## Node.js Sandbox & Environment Constraints

App Functions execute within a sandboxed V8 runtime (similar to Cloudflare Workers or Edge functions) to ensure fast execution and high security. This sandbox imposes several technical constraints:

- **No External NPM Packages:** You **cannot** import or require any external npm packages in the code you write/paste into the Portal. Only pre-declared globals and web-standard APIs are available.
- **Unsupported Node.js Core Modules:** Core modules relying on OS APIs or native bindings are completely unavailable. Attempting to use them will trigger runtime execution errors.
  - _Unsupported:_ `child_process`, `cluster`, `dgram`, `fs`, `fs/promises`, `http`, `https`, `net`, `repl`, `readline`, `tls`, `worker_threads`, `zlib`.
- **Partially Supported Core Modules:**
  - `crypto`: Standard node-crypto APIs may be unavailable. Use standard **Web Crypto API** (`globalThis.crypto`) for operations like hashing or signature verification.
  - `buffer` and `stream`: Standard Node.js versions are replaced by browser/web-standard versions (**WHATWG Streams**).
  - `os`, `path`, `util`, `events`.
- **Supported HTTP Requests:** Always use the standard browser-native `fetch()` API for making outbound HTTP calls.

## Resp API

Every App Function handler must return a structured response. Salla provides a pre-declared builder class `Resp`.

```typescript
// Success — setData is STRICTLY MANDATORY (pass {} if no payload)
Resp.success().setData({ order_id: id });
Resp.success().setData({}); // Correct way to return empty success

// Error — setMessage and setStatus; setData is optional
Resp.error().setMessage("Something went wrong").setStatus(500);
Resp.error().setStatus(res.status);
```

The builder pattern returns `this` — all methods are chainable.

### Rejection and Modification (Synchronous Actions)

- **To Reject/Block an Operation:** Return an error response (e.g., `Resp.error().setMessage("Unsupported shipping address").setStatus(400)`). Salla intercepts this error, blocks the operation, and displays the `.message` text to the merchant or customer directly in the storefront/checkout UI.
- **To Modify Data:** In a synchronous event like `shipment.creating`, return the updated parameters inside `setData(...)`. For example, `Resp.success().setData({ carrier: "Custom Carrier" })` will alter the shipment details before Salla writes it to the database.

### Plain Object Equivalence

If you prefer not to use the builder utility, you can return a plain JSON object with the following fields:

- **Success:** `{ success: true, data: Record<string, unknown> }` _(data field is mandatory)_
- **Error:** `{ success: false, error: string, status?: number }` _(the `error` key represents the error message)_

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

### Timeout Management & AbortController Pattern

Because execution timeouts are strictly enforced (Synchronous actions must complete in **< 500 ms**, Asynchronous events in **30 s**), any network fetch to external APIs can easily block execution and trigger a timeout.
Always implement request timeouts using standard `AbortController`:

```typescript
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 400); // 400ms timeout for sync actions

try {
  const response = await fetch("https://api.example.com/data", {
    signal: controller.signal,
  });
  const data = await response.json();
} catch (error) {
  if (error.name === "AbortError") {
    console.error("External request timed out");
  }
} finally {
  clearTimeout(timeout);
}
```

### Reference Guides

- **Testing Guide:** https://docs.salla.dev/1726816m0
- **Demo Store Testing:** https://salla.dev/blog/how-to-test-your-app-using-salla-demo-stores/
- **Webhook Testing Tools:** Use services like [webhook.site](https://webhook.site) to inspect outgoing payloads from your functions.
