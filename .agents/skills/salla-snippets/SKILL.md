---
name: salla-snippets
description: >
  Use when behavior must run in the shopper's browser on the Salla storefront — JS
  snippets injected via the salla_snippets tool, reacting to storefront e-commerce
  events (cart, product view, checkout, search). Rule: storefront/browser behavior →
  snippet (Device Mode); server-side handling of the same events → App Function
  (salla-app-functions, Cloud Mode). Snippets are pure-JS files served from the CDN,
  placed before `</body>`; covers create/update/delete, the `salla.config.get("app.*")`
  settings bridge, and the storefront event catalogue.
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

1. Write the snippet body as plain JavaScript — a snippet is a pure-JS file Salla serves
   from the CDN, loaded into every storefront page via `<script src>`. Use `salla`,
   `salla.onReady`, `salla.event`, and `salla.config.get(...)` directly. (Full rules — no
   Twig/HTML wrapper, bootstrap timing, deploy guard → [`references/device-mode.md`](references/device-mode.md).)

   A snippet does two distinct jobs — keep them separate:

   - **Listen to storefront events** (`::`-namespaced; payload in `e.data`). Register
     listeners at module top level so init-time events aren't missed:

     ```js
     salla.event.on("cart::item.added", (e) => {
       var productId = e.data.product_id; // payload in e.data
     });
     ```

     Event catalogue and payload shapes → [`references/device-mode.md`](references/device-mode.md).

   - **Read the app's settings** with `salla.config.get("app.<key>")` — the only way to read
     a merchant's App Settings from a storefront snippet, and only settings marked
     `public: true` are visible there. Gate store-state reads on `salla.onReady`:

     ```js
     salla.onReady(function () {
       var rewardsOn = salla.config.get("app.rewards_enabled") || false;
       var pointValue = salla.config.get("app.point_value_halalah") || 0;
     });
     ```

     Settings are how the merchant configured the app; events are what the shopper is doing.
     Define the keys and which are `public` in
     [salla-app-settings](../salla-app-settings/SKILL.md). Store/session config
     (`user.id`, `store.username`, `customer.email`, whole `store`/`user` objects) and the
     defensive-read patterns → _Store context & language_ in
     [`references/device-mode.md`](references/device-mode.md).

2. (Optional) Check available template variables: `salla_snippets action=parameters`,
   `app_id`.
3. Inject it: `salla_snippets action=create`, `app_id`, `name` (required), `place`
   (`"before"` — the only accepted value), `tag` (`"body"` only — snippets render **before
   `</body>`**), `content` (your pure JS). **Dedup first:** call `salla_snippets action=list` and
   `update`/`delete` any existing snippet for this app before creating — stacked duplicates
   double-render the UI and double-fire events. Read back with `salla_snippets action=list` /
   `get`: it returns the snippet **metadata** with the CDN **`url`** (the `.js` file) and
   `path`. `update` revalidates the **full** snippet — resend `name`, `place`, `tag`, and
   `content` together (it is not a partial patch). `action=update` returns `{"snippet":{}}`
   (empty object) on success — call `action=list` to verify the change.

   > **Manage snippets only through the `salla_snippets` MCP tool** — it owns field mapping
   > and validation (it maps `content` to the underlying field). Every snippet operation goes
   > through one of its actions.

Device Mode setup, full event catalogue, payload shapes →
[`references/device-mode.md`](references/device-mode.md)

#### Validate on every create / update (closed loop)

**A successful `salla_snippets create`/`update` is the START of validation, not the end** — a
200 only confirms the file deployed, not that it runs. Treat **every `create`/`update`** as
the trigger for one loop, repeated until clean:

1. **Parse-as-JS check (do this before `create`/`update`)** — confirm the `content` parses
   as valid JavaScript, the same check the Portal editor runs before it lets you save: e.g.
   `node --check snippet.js`, or a `new Function(code)` in a try/catch. Parse it, don't
   pattern-match — `<script>` tags, HTML, and Twig (`{{ … }}` / `{% … %}`) all fail to parse
   as JS and are caught for free, because the snippet is served as a `.js` file. Fix any
   syntax error before saving; the MCP no longer guards content shape, so the body parsing
   cleanly is the author's responsibility. → [`references/device-mode.md`](references/device-mode.md).
2. **Config-key check** — for **every** `salla.config.get("app.<key>")` the snippet reads,
   confirm `<key>` is a defined setting marked `public: true` in the app's settings. A key
   that's missing or not `public` reads `undefined` on the storefront. The settings define
   the contract → cross-check [salla-app-settings](../salla-app-settings/SKILL.md).
3. **Browser test** — run the DevTools-console recipe below (load marker, no errors, expected
   `e.data` and config values).
4. **Fix → re-`update` via the tool → re-validate** until all three pass.

#### Test the snippet in the browser

A snippet runs in the shopper's browser, so a 200 from `salla_snippets` only confirms it
deployed — prove it **runs** in a real browser via the DevTools Console.

1. **Open the storefront.** Install the app on a demo store first (→
   [salla-live-testing](../salla-live-testing/SKILL.md)), then open that store's `url` and
   navigate to the page where the snippet runs. Drive it with a headless browser
   (Playwright/Puppeteer) if available; otherwise guide the user step by step to open the
   page and the **DevTools Console** (and Network tab).
2. **Add debug logging.** Instrument the snippet so execution and data are visible — a load
   marker, the settings you read, and each event payload:

   ```js
   (function () {
     console.log("[myapp] snippet loaded");
     salla.event.on("cart::item.added", function (e) {
       console.log("[myapp] cart::item.added", e.data); // real payload shape
     });
     salla.onReady(function () {
       console.log(
         "[myapp] rewards_on",
         salla.config.get("app.rewards_enabled"),
       );
     });
   })();
   ```

3. **Trigger and verify.** Perform the behavior (e.g. add a product to cart), then confirm
   in the console: the load marker logged, **no red errors**, the handler logged the
   expected `e.data`, and `salla.config.get("app.<key>")` values are what you expect.
4. **Diagnose from the console:**

   | You see                                        | It means                                                        | Do                                                                                          |
   | ---------------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
   | Nothing logs                                   | Snippet not on this store / page not reloaded / SDK not on page | Confirm it's deployed to THIS store, reload, and run on a page where `salla.onReady` fires  |
   | `salla.config.get("app.<key>")` is `undefined` | Setting isn't `public` or the key is wrong                      | Mark it `public: true` ([salla-app-settings](../salla-app-settings/SKILL.md)) / fix the key |
   | A handler never fires                          | The event name is wrong                                         | Check the `::` catalogue in [`references/device-mode.md`](references/device-mode.md)        |

5. **Before publish:** remove or guard the debug `console.log`s, and keep secrets/PII out of
   logs (the file is served to every shopper).

#### Twilight JS SDK (for app snippets)

The Twilight theme engine **auto-injects** the Twilight Storefront JS SDK (`window.salla`)
on every storefront page (the `body:end` hook). Your snippet runs in that same page, so it
can call the same runtime API — auth, cart, wishlist, product, order, rating, currency,
loyalty, comment, profile, booking, `salla.api.component.*`, `salla.config`, `salla.event`,
`salla.storage`, `salla.notify`, `salla.lang`, `salla.helpers`, metadata.

**Method catalogue (signatures, per-module doc links, app-snippet-vs-theme boundary, the
`salla.init()` rule) → [`references/twilight-js-sdk.md`](references/twilight-js-sdk.md).**
Events (the `::` catalogue, the `product::fetch.succeeded` trap, price encodings) →
[`references/device-mode.md`](references/device-mode.md).

**Glue:** this skill = the **shopper's browser** (customer-side actions/events via
snippets). For a **server reaction** to the same activity, the hookable rule applies — a
server event with an App Function trigger → **App Function**
([salla-app-functions](../salla-app-functions/SKILL.md), server-side V8 isolate,
preferred); else → **webhook** ([salla-webhooks](../salla-webhooks/SKILL.md)). Native
visible UI → [salla-storefront-ui](../salla-storefront-ui/SKILL.md).

#### Storefront UI compliance (when the snippet renders visible UI)

When a snippet **draws on the page**, build the UI from Salla's native **UI Components**
(Twilight `<salla-*>` web components) driven by the Storefront JS SDK — not hand-rolled
HTML. Native components inherit the theme's tokens, RTL, and locale for free, so they read
as part of the store rather than a standalone SaaS badge.

- **Render with `<salla-*>` components.** Insert the documented tag and set its attributes
  /properties — e.g. `<salla-button>`, `<salla-modal>`, `<salla-rating-stars>`,
  `<salla-quantity-input>`, `<salla-products-slider>`. Confirm the exact tag and props in
  the UI Components catalogue (component families below). Themes register these components
  on every storefront page; if a component is missing on a target store, load the loader at
  runtime from the CDN (`@salla.sa/twilight-components` ESM loader) before using it.
- **Wire behaviour through the SDK** — read state with `salla.config.get(...)`, react with
  `salla.event.on(...)`, call `salla.cart.*` / `salla.product.*` etc. (method catalogue →
  [`references/twilight-js-sdk.md`](references/twilight-js-sdk.md)).
- **For any custom markup you still write**, inherit Twilight CSS variables
  (`--color-primary`, `--color-text`, `--font-main`, spacing/radius), use Salla Icons
  (`sicon-*` classes), match surrounding spacing/density, and honor `dir`/`lang` (Arabic/RTL
  first). Hardcoded fonts/colors/borders/shadows are fallbacks only.
- **Verify live** — open an **installed demo store** (`salla_apps action=demo_stores` →
  `url`) and screenshot the product page. UI that "runs" in code is not proof it looks
  right.

`salla-storefront-ui` owns the "use native components + native look-and-feel" rule (and the
live-verification gate) — follow it for full guidance:
[salla-storefront-ui](../salla-storefront-ui/SKILL.md).

**UI Component families** (all `<salla-*>`; full catalogue in the docs):

| Family            | Examples                                                                  |
| ----------------- | ------------------------------------------------------------------------- |
| Product           | `salla-product-card`, `salla-products-slider`, `salla-add-product-button` |
| Shopping / cart   | `salla-quantity-input`, `salla-quick-buy`, `salla-cart-summary`           |
| User / auth       | `salla-login-modal`, `salla-userprofile`, `salla-verify`                  |
| Forms / input     | `salla-tel-input`, `salla-datetime-picker`, `salla-file-upload`           |
| Elements / layout | `salla-button`, `salla-modal`, `salla-rating-stars`, `salla-tabs`         |

Docs: UI Components Overview https://docs.salla.dev/422688m0.md · Usage
https://docs.salla.dev/422689m0.md · Customization https://docs.salla.dev/422690m0.md ·
Storefront JS SDK https://docs.salla.dev/422610m0.md · theme
https://docs.salla.dev/421877m0.md · CSS variables https://docs.salla.dev/421945m0.md ·
Salla Icons https://docs.salla.dev/422550m0.md · single product page
https://docs.salla.dev/422561m0.md.

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
