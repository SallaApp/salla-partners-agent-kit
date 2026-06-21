# Device Mode — Implementation Guide

Device Mode captures e-commerce events directly in the browser via the **Twilight SDK** and
your `tracker.js` script embedded in the storefront.

> **The events below are `::`-namespaced** (`cart::item.added`), NOT dotted names like
> `cart.add`. The **Twilight JS SDK** is the source of truth (Overview —
> https://docs.salla.dev/422610m0.md, Resources — must read). Never invent an event, DOM
> selector, or payload path — confirm against the SDK docs and a real demo store
> (`salla_apps action=demo_stores`; log `salla.event` / `emittedEvents`) before relying on
> it.
>
> **Events here, methods elsewhere:** this file covers the `::` event catalogue and
> payloads. The SDK **methods** an app snippet can call (`salla.cart.addItem`,
> `salla.auth.login`, `salla.api.component.getReviews`, …) and the theme-vs-snippet
> boundary live in [`twilight-js-sdk.md`](twilight-js-sdk.md).

---

## A snippet is a pure-JS CDN file

Write the body as plain, valid JavaScript and send it as `content` via `salla_snippets`. On
save Salla stores it verbatim and serves it from a CDN as a real `.js` file, loaded into
every storefront page via `<script src>` (cacheable / edge-cached). Use `salla` /
`salla.onReady` / `salla.config.get(...)` directly — there is nothing to wrap or scope
yourself:

```js
(function () {
  salla.onReady(function () {
    // your code — use salla / salla.onReady / salla.config.get directly
  });
})();
```

What goes in the body:

- **Browser JS only.** A snippet is not a theme template and there is no server-side render
  pass, so Twig (`{{ … }}` / `{% … %}`) and any `{}` interpolation ship as literal text and
  break the script. Pull every dynamic value at runtime from the SDK
  (`salla.config.get(...)`, event payloads) — see _Store context & language_ below.
- **External scripts** (e.g. a third-party tracker): load them from your JS at runtime
  (`document.createElement('script')` / dynamic `import`).
- **Resolve every URL at deploy time.** Templatize any app URL and fail the build if a
  placeholder like `https://YOUR_APP_URL` survives — a shipped placeholder silently breaks
  every event POST.
- **No secrets.** The file is served to every shopper, so keep it free of app secrets,
  tokens, and keys (full trust-boundary note under _Sending data to your backend_).

---

## Bootstrap & event-timing (critical)

Two rules you MUST follow:

1. **Bootstrap with `salla.onReady(cb)`** for any code that reads store-loaded state.
   `window.salla` is already defined when your snippet runs, so gate on readiness, not on
   `typeof salla`.
2. **Register `product::*` and `cart::*` listeners at the module top level**, outside
   `onReady`. Twilight emits product events **during init, before** `onReady` fires — a
   listener attached inside `onReady` misses them.

```js
// ✅ top level — registered before Twilight finishes init
salla.event.on("cart::item.added", onAddToCart);
salla.event.on("product::price.updated", onPriceChange);

// onReady is only for SDK calls that need the store fully loaded
salla.onReady(() => {
  // safe to read salla.config, mount UI, etc.
});
```

Subscribe/unsubscribe: `salla.event.on(name, cb)` / `salla.event.off(name, cb)`.

---

## Event Catalogue

Twilight events are `::`-namespaced. **The Twilight JS SDK is the source of truth — Overview:
https://docs.salla.dev/422610m0.md; the per-event listing is the Twilight JS SDK Events
reference: https://docs.salla.dev/422611m0.md. Use ONLY events the SDK documents; anything not
below must be checked there.** The names below are confirmed examples (a subset). `cart.add`,
`product.view`, `order.success`, and `checkout.complete` do NOT exist — do not use them.

### Cart

| Event                   | Fires when                            | Notes                                  |
| ----------------------- | ------------------------------------- | -------------------------------------- |
| `cart::before.add.item` | Just before an item is added          | Pre-hook                               |
| `cart::item.added`      | **Item added to cart** (the real one) | Payload below — price is NOT top-level |
| `cart::updated`         | Cart contents/quantities changed      |                                        |
| `cart::latest.fetched`  | Latest cart fetched                   |                                        |
| `cart::details.fetched` | Cart details fetched                  |                                        |

### Product

| Event                                     | Fires when                                      | Notes                                      |
| ----------------------------------------- | ----------------------------------------------- | ------------------------------------------ |
| `product::fetch.succeeded`                | A product **slider/recommendations** list loads | ⚠️ NOT the viewed product — see trap below |
| `product::price.updated`                  | Option/variant price changes                    | Use for variant price on the product page  |
| `product-options::change`                 | A product option is changed                     |                                            |
| `salla-products-slider::products.fetched` | A products slider fetched                       |                                            |
| `salla-conditional-fields::change`        | Conditional field changed                       |                                            |

### Platform / page

`twilight::init`, `twilight::before.ready`, `twilight::initiated`, `twilight::api`,
`twilight::notifier.changed`, `page.view` (dotted — an exception),
`languages::translations.loaded`,
`auth::token.invalid`, `component::menus.fetched`, `salla-login::ready`,
`document::request.failed`, `currency::fetched`,
`advertisement::advertisement.fetched`.

### `::` event bus vs the Pixels analytics catalogue

Two distinct event surfaces coexist — keep them separate:

- **`::`-namespaced events** (`cart::item.added`, `product::price.updated`) are the
  **Twilight SDK event bus**. Subscribe with `salla.event.on(...)`; build feature logic on
  these.
- **Capitalized names** (`"Product Added"`, `"Product Viewed"`, `"Cart Updated"`,
  `"Signed In"`) are the **Pixels analytics catalogue** (also the GTM tracking layer),
  consumed through the analytics module — not via `salla.event.on`. Use them for analytics
  /attribution, not for feature logic. Full Pixels model → [_Pixels_](#pixels) below.

### No event for these — detect another way

- **Order success / thank-you:** there is no `order.success` JS event. Detect by URL on the
  confirmation page.
- **Current product on a product page:** there is no reliable "product viewed" event (see
  the `product::fetch.succeeded` trap). Detect the product page by URL and read the
  component prop (recipe below).

---

## Payload shapes (real)

The live envelope is `{ status, success, message?, data }` — **not** `{ event, timestamp,
data }`.

### `cart::item.added`

```jsonc
{
  "status": 200,
  "success": true,
  "message": "تمت إضافة المنتج بنجاح",
  "data": {
    "product_id": 1368314620, // the product that was added
    "cart": {
      "id": 615779932,
      "sub_total": 588, // cart subtotal — NOT the item's price
      "items": [
        /* line items — find the added item by matching product_id */
      ],
      "options": [],
      "real_shipping_cost": 0,
    },
    "offer": null,
    "googleTags": { "event": "addToCart", "ecommerce": {} }, // GTM fallback
  },
}
```

**There is no top-level item price.** Get the added item's price by matching
`data.product_id` against `data.cart.items[]`.

### `product::fetch.succeeded` — the trap ⚠️

```jsonc
{
  "status": 200,
  "success": true,
  "data": [
    /* Array(12) — RECOMMENDATIONS SLIDER, not the viewed product */
    {
      "id": 1993349605,
      "name": "فستان",
      "price": 164, // ← flat number here
      "regular_price": 329,
      "sale_price": 164,
      "base_currency_price": { "currency": "SAR", "amount": 164 }, // ← {amount} here
      "is_on_sale": true,
      "status": "sale",
      "currency": "SAR",
      "url": ".../p1993349605",
    },
    // …11 more
  ],
}
```

Using this for "the current product's price" is wrong — it's the slider list.

### Three price encodings coexist — handle all

| Where                 | Shape                            |
| --------------------- | -------------------------------- |
| Product object        | `price: 164` (flat number)       |
| `base_currency_price` | `{ currency, amount: 164 }`      |
| Cart line items       | may differ again — inspect first |

Always inspect the actual payload before reading a price path.

---

## Current product's data on a product page

`product::fetch.succeeded` carries the recommendations slider, **not** the viewed product
(see the catalogue). The current product's data, price, and option/variant behaviour come
from the Twilight SDK's documented product events and the product web components.

> **Must read before implementing — these are the authoritative sources; do not infer event
> names, payload paths, or component props:**
>
> - Twilight JS SDK Overview (source of truth) — https://docs.salla.dev/422610m0.md
> - Twilight JS SDK Events — https://docs.salla.dev/422611m0.md
> - Themes Single Product Page — https://docs.salla.dev/422561m0.md
> - Twilight JS Web Components — https://docs.salla.dev/422688m0.md
> - Fetch Product Options (option/variant price) — https://docs.salla.dev/569578m0.md

```js
// Product-page detection — URL pattern /{slug}/{name}/p{productId}
const onProductPage = /\/p\d+/.test(location.pathname);

// Option/variant price changes emit product::price.updated — read the price from e.data
// per the SDK Events doc above.
salla.event.on("product::price.updated", (e) => {
  /* update UI from e.data — confirm the exact path in the SDK Events reference */
});
```

Salla storefront UI is **Stencil web components**: `@Prop()` values are exposed as JS
**properties** on the element (read `el.product`, not a DOM attribute). Use the component API
documented in the Twilight Web Components reference above — confirm the exact prop there.

---

## Store context & language

```js
salla.config.get("store.id"); // ✅ works (e.g. 1963287162)
salla.config.get("store.username"); // ✅ store handle
salla.config.get("user.id"); // ✅ logged-in user id
salla.config.get("customer.id"); // ✅ null for guests (expected)
salla.config.get("customer.email"); // ✅ logged-in customer email
salla.config.get("store.currency"); // 'SAR'
salla.config.get("store.lang"); // ⚠️ may be null — use a fallback chain
salla.config.get("store"); // whole object · salla.config.get("user")
```

> **Read your app's settings with `salla.config.get("app.<key>")`** — the one and only way to
> read a merchant's App Settings in a storefront snippet (e.g.
> `salla.config.get("app.rewards_enabled")`, `salla.config.get("app.point_value_halalah")`).
> Only settings marked **`public: true`** are visible here; private settings (`public: false`)
> stay server-side. This is the bridge from a merchant's settings form to the storefront —
> define the keys (and which are `public`) in
> [salla-app-settings](../../salla-app-settings/SKILL.md).

> **Treat every `salla.config.get()` read defensively.** A nested read like
> `salla.config.get('store.lang')` can return `null`/`undefined`, the value may be unset on a
> fresh install, and the call can be disrupted by Cloudflare rocket-loader wrapping (see
> _console noise_) or by running before init. Safe patterns:
>
> - **Gate reads on `salla.onReady(cb)`** — config is only guaranteed populated once the
>   store is loaded. Keep module top level for event listeners only (see _Bootstrap &
>   event-timing_).
> - **Null-check every read** and resolve a single read at a time, rather than chaining logic
>   on one unchecked path.
> - **Use a fallback chain** for anything load-bearing (the lang fallback below is the model).

Language fallback (don't trust `store.lang` alone — the pattern for any config read):

```js
const lang =
  salla.config.get("store.lang") ||
  document.documentElement.lang ||
  (navigator.language || "ar").split("-")[0];
```

---

## Sending data to your backend

```js
salla.event.on("cart::item.added", async (e) => {
  await fetch("https://your-app.com/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      store_id: salla.config.get("store.id"),
      product_id: e.data.product_id,
      data: e.data,
    }),
  });
});
```

`https://your-app.com/track` is a placeholder — apply the same deploy guard as the snippet
URL (templatize, fail the build if it survives).

> **Trust boundary — snippet code runs in the shopper's untrusted browser:**
>
> - **Keep secrets out of snippet/tracker.js** — no app secret, OAuth/merchant access token,
>   API key, or signing secret; storefront JS is fully public. Token and OAuth handling
>   belong on your server → **salla-app-auth**.
> - **Treat every POST as untrusted.** A shopper can forge, replay, or tamper with the body
>   (`store_id`, `product_id`, prices). Re-validate server-side and re-derive
>   prices/totals from the Admin API rather than trusting client-supplied values.
> - **Authenticate the tracking endpoint** — verify the request (e.g. origin/session check),
>   validate the payload schema before acting, and rate-limit it.

---

## UI compliance (storefront)

Injected UI must follow [salla-ui-compliance](../../salla-ui-compliance/SKILL.md) — inherit
theme tokens, use Salla icons, match the surrounding page (full checklist in SKILL.md). The
theme's single-product insertion points are `product:single.form.start` /
`product:single.form.end`; target near those when placing UI on the product page.

---

## Pixels

**Pixels** are Salla's analytics-integration product — how an app receives e-commerce
events for analytics, attribution, and personalization. A Pixel delivers events in one of
two modes; only one is a snippet:

| Mode            | Where it runs                                                           | In a snippet?                                                                                      |
| --------------- | ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| **Device Mode** | Shopper's browser (client-side JS)                                      | **Yes** — this is the snippet (`tracker.js`)                                                       |
| **Cloud Mode**  | Salla servers → your backend, server-to-server, via an **App Function** | **No** — server-side, no client script ([salla-app-functions](../../salla-app-functions/SKILL.md)) |

So: **Device Mode (+ custom events) belongs in a snippet; Cloud Mode does not** — it is an
App Function delivering events server-to-server, independent of any storefront script.

### Device Mode (in the snippet)

Device Mode is exactly the snippet model already in this file: a pure-JS CDN file (your
`tracker.js`) injected via `salla_snippets`, listening in the shopper's browser. The Pixels
event catalogue uses the **Capitalized** names (the analytics layer above), grouped:

| Group           | Events                                                                                                                                                                              |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cart & Checkout | `Product Added`, `Product Removed`, `Cart Viewed`, `Cart Updated`, `Checkout Started`, `Checkout Step Viewed`, `Checkout Step Completed`, `Payment Info Entered`, `Order Completed` |
| Product         | `Products Searched`, `Product List Viewed`, `Product List Filtered`, `Product List Sorted`, `Product Viewed`, `Product Clicked`, `Product Shared`, `Product Reviewed`               |
| Account         | `Signed In`, `Signed Up`, `Signed Out`, `Profile Updated`                                                                                                                           |

These differ from the `::` SDK bus (see _`::` event bus vs the Pixels analytics catalogue_)
and from the Cart/Product `::` catalogues above — confirm exact names/payloads in the docs
below before relying on one.

### Custom events

For anything beyond the standard catalogue (widget interactions, bespoke journeys), fire a
custom event with the analytics module. Gate on `salla.onReady` so analytics is initialized:

```js
salla.onReady(() => {
  Salla.analytics.track("Event Name", {
    property_key: "value",
  });
});
```

Custom events can be fired from app snippets, themes, or GTM. The app-settings bridge and
deploy/trust-boundary rules in this file apply unchanged.

### Pixels docs

| Topic                         | Link                                |
| ----------------------------- | ----------------------------------- |
| Pixels Overview               | https://docs.salla.dev/1724365m0.md |
| Device Mode                   | https://docs.salla.dev/1724504m0.md |
| Cloud Mode (App Function)     | https://docs.salla.dev/1724667m0.md |
| Custom Events                 | https://docs.salla.dev/2007114m0.md |
| Device Mode — Cart & Checkout | https://docs.salla.dev/1804461m0.md |
| Device Mode — Product         | https://docs.salla.dev/1804467m0.md |
| Device Mode — Account         | https://docs.salla.dev/1804481m0.md |

---

## Known storefront console noise (not your app's fault)

When debugging on a live store, these appear in every console — don't chase them:

- `s-utm-referrer` CORS block on `api.salla.dev/1/indexes/*/recommendations`
- `ERR_SSL_PROTOCOL_ERROR` on `addtoany` / `getbutton`
- Poptin `401`
- Cloudflare `rocket-loader.min.js` wrapping all scripts
- Snapchat pixel warnings

---

## Resources

| Topic                              | Link                                |
| ---------------------------------- | ----------------------------------- |
| Device Mode Usage Guide            | https://docs.salla.dev/1724504m0.md |
| Twilight JS SDK Overview (source)  | https://docs.salla.dev/422610m0.md  |
| Twilight JS SDK Events (must read) | https://docs.salla.dev/422611m0.md  |
| Themes Single Product Page         | https://docs.salla.dev/422561m0.md  |
| Twilight JS Web Components         | https://docs.salla.dev/422688m0.md  |
| Fetch Product Options              | https://docs.salla.dev/569578m0.md  |
