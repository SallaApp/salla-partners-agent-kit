---
name: salla-storefront-snippets
description: >
  Use this skill whenever building, debugging, documenting, or reviewing any Salla
  storefront snippet or e-commerce event integration — including Device Mode (tracker.js / Twilight SDK),
  Cloud Mode (App Functions), event lifecycle questions, or choosing between integration
  modes. Invoke it for tasks like "track a cart event", "handle product view", "write
  an App Function for order placed", or "explain the difference between device and cloud mode".
license: Copyright (c) 2026 Salla
metadata:
  authors: Ilyas
  version: 1.0
---

# Salla Storefront Snippets

## Integration Modes

| Mode            | Processing Location         | Best For                                       |
| --------------- | --------------------------- | ---------------------------------------------- |
| **Device Mode** | Client-side (`tracker.js`)  | Analytics, personalization, marketing tracking |
| **Cloud Mode**  | Server-side (App Functions) | Automation, integrations, backend workflows    |

## Workflow

Follow this three-step workflow for any e-commerce event task:

### Step 1 — Choose Integration Mode

Ask (or infer from context) which mode fits the use case:

- **Device Mode** → user wants client-side tracking, analytics, real-time personalization, or marketing attribution
- **Cloud Mode** → user wants backend automation, order processing, data sync, or reliable server-side delivery

If unclear, ask: _"Should this run in the browser (Device Mode) or on your server (Cloud Mode)?"_

### Step 2 — Scaffold the Implementation

**Device Mode setup:**
1. Embed `tracker.js` in the storefront frontend
2. Use the Twilight SDK to listen for events
3. Process event payload in the listener callback
4. Optionally acknowledge the event

```js
// Example: Device Mode — listen for cart event via Twilight SDK
salla.event.on('cart.add', (event) => {
  // event.data contains product, quantity, price, etc.
  console.log('Item added to cart:', event.data);
});
```

**Cloud Mode setup (App Function):**
1. Create an App Function in your Salla app
2. Declare the event trigger in the function config
3. Access the typed event payload via the context object
4. Return a response if required

```ts
// Example: Cloud Mode — App Function triggered by cart.add
export default async function (context: CartAddContext) {
  const { product, quantity } = context.event.data;
  // Run backend logic: sync inventory, trigger workflow, etc.
  return Resp.success({ received: true });
}
```

For App Function patterns, context shapes, and the Resp API, see
[App Functions reference](../salla-app-builder/references/app-functions.md).

### Step 3 — Document the Integration

When writing or reviewing documentation for an event integration, include:

- Which mode is used and why
- The event name and trigger condition
- The payload shape (key fields)
- The processing logic summary
- Any response or acknowledgement behavior
- A lifecycle diagram if the flow is non-trivial (use the Mermaid templates in the reference)

## When to read the reference files

- [E-commerce Events Overview](references/overview.md) — full lifecycle diagrams for both modes, detailed comparison table, and links to the Device Mode and Cloud Mode usage guides.
- [Device Mode](references/device-mode.md) — `tracker.js` setup, Twilight SDK initialization, full event catalogue (cart, product, checkout, search), payload shape, store context, and sending data to your backend.
- [Cloud Mode](references/cloud-mode.md) — App Function trigger config, typed context shapes per event, execution types (sync vs async), `Resp` API, accessing settings, and calling the Salla API from a function.

## Resources

| Topic                    | Link                                   |
| ------------------------ | -------------------------------------- |
| Events Overview          | https://docs.salla.dev                 |
| Device Mode Usage        | https://docs.salla.dev/1724504m0.md    |
| Cloud Mode Usage         | https://docs.salla.dev/1724667m0.md    |
| App Functions Overview   | https://docs.salla.dev/1726817m0.md    |
| App Functions Events     | https://docs.salla.dev/1726818m0.md    |
