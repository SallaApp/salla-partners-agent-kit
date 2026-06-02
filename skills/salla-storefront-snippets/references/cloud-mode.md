# Cloud Mode — Implementation Guide

Cloud Mode delivers e-commerce events server-to-server from Salla's infrastructure directly to your **App Function**. No client-side script required.

---

## How It Works

1. A user action triggers an event in the storefront
2. Salla's servers capture the event
3. The event payload is forwarded to your registered App Function
4. Your function processes the event and optionally returns a response

---

## App Function Structure

App Functions are serverless TypeScript handlers. The Portal wraps your code — lines 1 and 4 are locked:

```ts
export default async (context: OrderCreatedContext): Promise<Resp> => {
  const orderId = context.payload.data.id;

  // your logic here

  return Resp.success().setData({ order_id: orderId });
};
```

**Do NOT** include import statements or re-declare `Resp` or context types when pasting into the Portal — they are pre-declared by the Salla runtime.

---

## Context Object Shape

Every App Function receives a `context` object:

```ts
context.merchant   // { id: string, … }
context.payload    // { event: string, created_at: string, data: { … } }
context.settings   // Record<string, string | undefined> — per-merchant app settings
```

Note: `context.merchant.id` is a **string**. There is no `context.token` — API calls inside functions are automatically authenticated.

---

## Typed Contexts by Event

| Event | Context type | Key `payload.data` fields |
| --- | --- | --- |
| `cart.add` | `CartAddContext` | `product_id`, `name`, `price`, `quantity`, `sku` |
| `cart.remove` | `CartRemoveContext` | `product_id`, `quantity` |
| `order.created` | `OrderCreatedContext` | `id`, `reference_id`, `total`, `items[]`, `customer` |
| `order.updated` | `OrderUpdatedContext` | `id`, `status`, `updated_fields` |
| `product.added` | `ProductAddedContext` | `id`, `name`, `price`, `stock` |

Full event list: https://docs.salla.dev/1726818m0

---

## Execution Types

| Type | Behaviour | Timeout | Use when |
| --- | --- | --- | --- |
| **Async** (default) | Salla doesn't wait | 30s | Analytics, logging, background sync |
| **Sync** | Salla waits; response can modify flow | < 500ms | Modifying checkout data, blocking actions |

---

## Resp API

Always return a structured response. Use the builder — `setData({})` is mandatory on success even when there is no payload:

```ts
// Success
return Resp.success().setData({ received: true });

// Success with no payload
return Resp.success().setData({});

// Error (sync — surfaces to the merchant or storefront)
return Resp.error().setMessage('Carrier unavailable').setStatus(503);
```

---

## Accessing Merchant Settings

```ts
const apiKey  = context.settings?.carrier_api_key;
const sandbox = context.settings?.sandbox_mode;
```

Always use optional chaining — settings may be undefined until the merchant fills the form.

---

## Calling the Salla API

Authentication is **automatic** inside App Functions — do not add an `Authorization` header:

```ts
export default async (context: OrderCreatedContext): Promise<Resp> => {
  const res = await fetch(
    `https://api.salla.dev/admin/v2/orders/${context.payload.data.id}`
  );
  const { data: order } = await res.json();

  // process order...
  return Resp.success().setData({});
};
```

---

## Local Development Mock

`Resp` and typed contexts are runtime globals — local TypeScript won't know about them. Add mocks **after** your handler with a clear comment. Paste **only** the handler into the Portal:

```ts
export default async (context: OrderCreatedContext): Promise<Resp> => {
  return Resp.success().setData({ id: context.payload.data.id });
};

// Don't paste following code into Salla's App Function
// Mocks for local IDE type checking only
interface OrderCreatedContext {
  merchant: { id: string };
  payload: { event: string; created_at: string; data: { id: number } };
  settings: Record<string, string | undefined>;
}
class Resp {
  static success() { return new Resp(); }
  static error()   { return new Resp(); }
  setData(d: Record<string, unknown>) { return this; }
  setMessage(m: string) { return this; }
  setStatus(s: number)  { return this; }
}
```

---

## Resources

| Topic | Link |
| --- | --- |
| Cloud Mode Usage Guide | https://docs.salla.dev/1724667m0.md |
| App Functions Overview | https://docs.salla.dev/1726817m0.md |
| App Functions Supported Events | https://docs.salla.dev/1726818m0.md |
