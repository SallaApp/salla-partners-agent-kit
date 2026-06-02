# Cloud Mode — Implementation Guide

Cloud Mode delivers e-commerce events server-to-server from Salla's infrastructure directly to your **App Function**. No client-side script required.

---

## How It Works

1. A user action triggers an event in the storefront
2. Salla's servers capture the event
3. The event payload is forwarded to your registered App Function
4. Your function processes the event and optionally returns a response

---

## Registering an App Function for an Event

In `salla.config.json` (your App Functions configuration), declare which events trigger your function:

```json
{
  "functions": [
    {
      "name": "track-cart-add",
      "entry": "functions/track-cart-add.ts",
      "events": ["cart.add"]
    },
    {
      "name": "process-order",
      "entry": "functions/process-order.ts",
      "events": ["order.created"]
    }
  ]
}
```

---

## App Function Structure

```ts
import { AppFunction, CartAddContext } from '@salla.sa/app-functions';

const handler: AppFunction<CartAddContext> = async (context) => {
  const { product_id, quantity, price } = context.event.data;
  const merchantId = context.merchant.id;

  // Run your backend logic
  await syncInventory(product_id, quantity);

  return Resp.success({ received: true });
};

export default handler;
```

---

## Context Object Shape

Every App Function receives a `context` object:

```ts
interface AppFunctionContext<T = unknown> {
  event: {
    name: string;       // e.g. 'cart.add'
    data: T;            // typed event payload
  };
  merchant: {
    id: number;
    store_id: number;
  };
  settings: Record<string, unknown>; // app settings for this merchant
  token: string;                     // merchant OAuth access token
}
```

---

## Typed Contexts by Event

| Event | Context type | Key `data` fields |
| --- | --- | --- |
| `cart.add` | `CartAddContext` | `product_id`, `name`, `price`, `quantity`, `sku` |
| `cart.remove` | `CartRemoveContext` | `product_id`, `quantity` |
| `order.created` | `OrderCreatedContext` | `id`, `reference_id`, `total`, `items[]`, `customer` |
| `order.updated` | `OrderUpdatedContext` | `id`, `status`, `updated_fields` |
| `checkout.complete` | `CheckoutCompleteContext` | `order_id`, `total`, `payment_method` |
| `product.updated` | `ProductUpdatedContext` | `id`, `name`, `price`, `stock` |

---

## Execution Types

| Type | Behaviour | Use when |
| --- | --- | --- |
| **Async** (default) | Salla doesn't wait for your response | Analytics, logging, background sync |
| **Sync** | Salla waits; your response can modify the flow | Modifying checkout data, blocking actions |

Declare sync in config:
```json
{ "execution": "sync" }
```

---

## Returning Responses

```ts
// Success with data
return Resp.success({ order_ref: 'ORD-001' });

// Error (sync only — causes Salla to surface the error)
return Resp.error('Carrier unavailable', 503);

// No-op (async — safe default)
return Resp.success();
```

---

## Accessing Merchant Settings

```ts
const apiKey = context.settings.carrier_api_key as string;
const sandbox = context.settings.sandbox_mode as boolean;
```

---

## Calling the Salla API from a Function

Use the merchant's token from context:

```ts
const res = await fetch('https://api.salla.dev/admin/v2/orders', {
  headers: { Authorization: `Bearer ${context.token}` },
});
const { data: orders } = await res.json();
```

---

## Resources

| Topic | Link |
| --- | --- |
| Cloud Mode Usage Guide | https://docs.salla.dev/1724667m0.md |
| App Functions Overview | https://docs.salla.dev/1726817m0.md |
| App Functions Supported Events | https://docs.salla.dev/1726818m0.md |
