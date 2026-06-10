---
name: salla-storefront-snippets
description: >
  Use when building a Salla storefront snippet or e-commerce event integration —
  choosing between Device Mode (client-side tracker.js) and Cloud Mode (App Functions),
  scaffolding the implementation, or handling storefront events like cart, product
  view, checkout, and search.
---

# Salla Storefront Snippets Flow

Integrate with Salla storefront events by **performing the actions**. Device Mode
snippets are injected with the Salla Partners MCP `salla_snippets` tool; Cloud Mode runs
in an App Function. Follow the steps in order — complete each gate before moving on.

## Tools

| Tool | Action | What it does |
| --- | --- | --- |
| `salla_snippets` | `list` / `parameters` / `create` / `update` / `delete` | Manage the app's storefront snippets |

> **Prerequisite:** the Salla Partners MCP server must be connected, and you need the
> app's `app_id`. Cloud Mode App Functions have no deploy tool — Salla deploys them when
> the app is published.

---

## Step 0 — Discover

Ask before starting:

1. **Which storefront event do you want to handle?**
   (e.g. `cart.add`, `product.view`, `checkout.complete`, `search.query`)
2. **What should happen when the event fires?**
   (track analytics, sync data, trigger automation, personalize content)

Use the answers to determine the right mode in Step 1.

---

## Step 1 — Choose Integration Mode

| Mode | Where it runs | Best for |
| --- | --- | --- |
| **Device Mode** | Browser (`tracker.js` + Twilight SDK) | Analytics, personalization, marketing attribution |
| **Cloud Mode** | Server (App Functions) | Automation, data sync, reliable backend delivery |

Decision rule:
- Needs real-time browser data or marketing pixels → **Device Mode**
- Needs guaranteed delivery, backend logic, or API calls → **Cloud Mode**

If still unclear, ask: *"Should this run in the browser or on your server?"*

**Gate:** "Confirmed the mode. Proceeding to scaffold."

---

## Step 2 — Scaffold the Implementation

### Device Mode

The snippet body runs in the storefront browser via the Twilight SDK. Write the listener,
then **inject it as a storefront snippet** with the tool:

1. Write the snippet body — listen with the Twilight SDK and process the payload:

   ```js
   salla.event.on("cart.add", (event) => {
     // event.data contains product, quantity, price, etc.
     analytics.track("Add to Cart", event.data);
   });
   ```

2. (Optional) Check available template variables: `salla_snippets action=parameters`,
   `app_id`.
3. Inject it: `salla_snippets action=create`, `app_id`, `name`, `place` ("before"),
   `tag` ("head" | "body"), `content` (the snippet body). Verify with
   `salla_snippets action=list`; use `update` / `delete` to change or remove it.

Device Mode setup, full event catalogue, payload shapes →
[`references/device-mode.md`](references/device-mode.md)

### Cloud Mode

1. Write the App Function source (Salla deploys it on publish — no deploy tool; inspect
   deployed functions with `salla_functions action=list`)
2. Select the storefront event as the trigger
3. Access the typed event payload via the context object
4. Return a response

```ts
export default async function (context: CartAddContext) {
  const { product, quantity } = context.payload.data;
  await syncInventory(product.id, quantity);
  return Resp.success().setData({});
}
```

App Function execution types, `Resp` API, context shapes →
[`references/cloud-mode.md`](references/cloud-mode.md)

**Gate:** "Test the event: trigger it from a demo store and confirm the handler fires
correctly."

---

## Step 3 — Document the Integration

When writing or reviewing documentation for the integration, include:

- Which mode is used and why
- The event name and trigger condition
- The payload shape (key fields)
- The processing logic summary
- Any response or acknowledgement behavior

Full event overview and lifecycle diagrams →
[`references/overview.md`](references/overview.md)

---

## Resources

| Topic | Link |
| --- | --- |
| Device Mode Usage | https://docs.salla.dev/1724504m0.md |
| Cloud Mode Usage | https://docs.salla.dev/1724667m0.md |
| App Functions Overview | https://docs.salla.dev/1726817m0.md |
| App Functions Events | https://docs.salla.dev/1726818m0.md |
