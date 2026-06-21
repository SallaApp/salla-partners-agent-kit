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
   (e.g. `cart::item.added`, `cart::updated`, `product::price.updated` — Twilight events
   are `::`-namespaced; confirm names in the catalogue in
   [`references/device-mode.md`](references/device-mode.md))
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
   // Event names are ::-namespaced — there is no `cart.add`. See the catalogue.
   salla.event.on("cart::item.added", (e) => {
     // e.data carries product_id + cart; there is NO top-level item price.
     analytics.track("Add to Cart", e.data);
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

   > **MCP-only — no direct Partner API.** Snippets are managed exclusively through the
   > Salla Partners MCP `salla_snippets` tool; there is no hand-written Partner API call
   > here. The tool owns field mapping and validation (it maps `content` to the underlying
   > field for you). If an operation isn't covered by an `action`, it must be done via the
   > MCP — do not reach for a raw Partner API endpoint. Constraints to know: `place`
   > accepts only `"before"`, paired with `tag` ("head" | "body").

Device Mode setup, full event catalogue, payload shapes →
[`references/device-mode.md`](references/device-mode.md)

#### Twilight JS SDK (for app snippets)

The Twilight theme engine **auto-injects** the Twilight Storefront JS SDK (`window.salla`)
on every storefront page (the `body:end` hook). Your app snippet runs in that same page,
so it can call the same runtime API — auth, cart, wishlist, product, order, rating,
currency, loyalty, comment, profile, booking, `salla.api.component.*`, `salla.config`,
`salla.event`, `salla.storage`, `salla.notify`, `salla.lang`, `salla.helpers`, metadata.

**Method catalogue (signatures, per-module doc links, theme-vs-snippet boundary) →
[`references/twilight-js-sdk.md`](references/twilight-js-sdk.md).** Events (the `::`
catalogue, the `product::fetch.succeeded` trap, price encodings) stay in
[`references/device-mode.md`](references/device-mode.md).

Snippet rules that differ from themes: **do NOT call `salla.init()`** (the theme already
initialized the SDK; `init()` is for standalone HTML only); gate on `salla.onReady` and
register `salla.event.*` listeners at module top level; you **canNOT** define Twig
`{% hook %}`s, ship `<salla-*>` web components, or use theme settings / `twilight.json` /
the Twilight CLI — those are theme-development constructs, out of scope.

**Glue:** this skill = the **shopper's browser** (customer-side actions/events via
snippets). For a **server reaction** to the same activity, the hookable rule applies — a
server event with an App Function trigger → **App Function**
([salla-app-functions](../salla-app-functions/SKILL.md), server-side V8 isolate,
preferred); else → **webhook** ([salla-webhooks](../salla-webhooks/SKILL.md)). Native
visible UI → [salla-ui-compliance](../salla-ui-compliance/SKILL.md).

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
