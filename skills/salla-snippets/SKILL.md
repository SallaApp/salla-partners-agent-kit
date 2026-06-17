---
name: salla-snippets
description: >
  Use when behavior must run in the shopper's browser on the Salla storefront — JS
  snippets injected via the salla_snippets tool, reacting to storefront e-commerce
  events (cart, product view, checkout, search). Rule: storefront/browser behavior →
  snippet (Device Mode); server-side handling of the same events → App Function
  (salla-app-functions, Cloud Mode). Covers snippet create/update/delete, placement
  (before × head/body), template parameters, and the storefront event catalogue.
---

# Salla Storefront Snippets Flow

Integrate with Salla storefront events by **performing the actions**. Device Mode
snippets are injected with the Salla Partners MCP `salla_snippets` tool; Cloud Mode runs
in an App Function. Follow the steps in order — complete each gate before moving on.

## Tools

| Tool             | Action                                                 | What it does                         |
| ---------------- | ------------------------------------------------------ | ------------------------------------ |
| `salla_snippets` | `list` / `parameters` / `create` / `update` / `delete` | Manage the app's storefront snippets |

> **Prerequisite:** the Salla Partners MCP server must be connected, and you need the
> app's `app_id`. Cloud Mode runs as an App Function — authoring and deployment →
> **salla-app-functions**.

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

| Mode            | Where it runs                         | Best for                                          |
| --------------- | ------------------------------------- | ------------------------------------------------- |
| **Device Mode** | Browser (`tracker.js` + Twilight SDK) | Analytics, personalization, marketing attribution |
| **Cloud Mode**  | Server (App Functions)                | Automation, data sync, reliable backend delivery  |

Decision rule:

- Needs real-time browser data or marketing pixels → **Device Mode**
- Needs guaranteed delivery, backend logic, or API calls → **Cloud Mode**

If still unclear, ask: _"Should this run in the browser or on your server?"_

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
3. Inject it: `salla_snippets action=create`, `app_id`, `name` (required), `place`
   ("before" — the only accepted value), `tag` ("head" | "body"), `content` (the snippet
   body). **Dedup first:** call `salla_snippets action=list` and `update`/`delete` any
   existing snippet for this app before creating — stacked duplicates double-render the UI
   and double-fire events. Verify with `salla_snippets action=list`; use `update` /
   `delete` to change or remove it. `update` revalidates the **full** snippet — resend `name`, `place`, `tag`,
   and `content` together (it is not a partial patch). `action=update` returns
   `{"snippet":{}}` (empty object) on success — call `action=list` to verify the
   change.

   **Raw Partner-API deltas** (only if bypassing the tool): both create AND update send
   the code in the obfuscated field **`c8fbt33yM0`** (update is not a plain `content`
   field) — the `salla_snippets` tool maps `content` to it for you, but a raw `content`
   field gets a 422; GET returns `content` plus a CDN `url` rather than guaranteed inline
   code; DELETE responds **202**; placement `place` accepts only `"before"`, paired with
   `tag` ("head"/"body").

Device Mode setup, full event catalogue, payload shapes →
[`references/device-mode.md`](references/device-mode.md)

#### Storefront UI compliance (when the snippet renders visible UI)

A snippet that **draws on the page** must look native to the store's Twilight theme — not
a standalone SaaS badge. Before shipping visible UI:

- **Inherit theme tokens** — use Twilight CSS variables (`--color-primary`, `--color-text`,
  `--font-main`, spacing/radius vars). Don't hardcode fonts, colors, borders, or shadows
  (fallbacks only).
- **Use Salla Icons** (`sicon-*` classes) — not custom glyphs/emoji/dots.
- **Match the product page** — adopt the surrounding spacing/density and insert near the
  relevant product element, not as a floating card.
- **RTL + locale** — most storefronts are Arabic/RTL; honor `dir`/`lang` and mirror layout.
- **Verify live** — open an **installed demo store** (`salla_apps action=demo_stores` →
  `url`) and screenshot the product page. UI that "runs" in code is not proof it looks
  right.

Full guidance → [salla-ui-compliance](../salla-ui-compliance/SKILL.md). Docs: theme
https://docs.salla.dev/421877m0.md · CSS variables https://docs.salla.dev/421945m0.md · Salla
Icons https://docs.salla.dev/422550m0.md · single product page https://docs.salla.dev/422561m0.md.

### Cloud Mode

Cloud Mode **is** an App Function — write the handler with the storefront event as its
trigger and follow the **salla-app-functions** skill end-to-end (template, `Resp` API,
typed contexts, deploy). Don't duplicate its template here.

**Gate:** "Test the event: trigger it from a demo store and confirm the handler fires
correctly."

---

## Resources

| Topic                  | Link                                |
| ---------------------- | ----------------------------------- |
| Device Mode Usage      | https://docs.salla.dev/1724504m0.md |
| Cloud Mode Usage       | https://docs.salla.dev/1724667m0.md |
| App Functions Overview | https://docs.salla.dev/1726814m0.md |
| App Functions Events   | https://docs.salla.dev/1726818m0.md |
