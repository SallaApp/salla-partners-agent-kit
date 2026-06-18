# Device Mode — Implementation Guide

Device Mode captures e-commerce events directly in the browser via the **Twilight SDK** and
your `tracker.js` script embedded in the storefront.

> **Event names below were captured from `emittedEvents` on a live store.** Twilight uses
> `::` namespacing (`cart::item.added`), NOT dotted names like `cart.add`. Never invent an
> event, DOM selector, or payload path — verify on a real demo store
> (`salla_apps action=demo_stores`) by logging `salla.event` / `emittedEvents` first.

---

## Installation

Add `tracker.js` to your storefront. Salla loads it automatically when your App Snippet is
active.

```html
<!-- Added via App Snippet — injected into every storefront page -->
<script src="https://your-app.com/tracker.js"></script>
```

> **Deploy guard:** never ship a literal `https://YOUR_APP_URL` / placeholder. Templatize it
> at build/deploy and fail the build if the placeholder survives — a shipped placeholder
> silently breaks every event POST.

---

## Bootstrap & event-timing (critical)

Two rules, both learned the hard way:

1. **Bootstrap with `salla.onReady(cb)`** — never gate on `typeof salla !== 'undefined'`.
2. **Register `product::*` and `cart::*` listeners at the module top level, NOT inside the
   `onReady` callback.** Twilight emits product events **during init, before** `onReady`
   fires — listeners attached inside `onReady` miss them.

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

## Event Catalogue (verified on a live store)

Twilight events are `::`-namespaced. **There is no `cart.add`, `product.view`,
`order.success`, or `checkout.complete` JS event** — those were guesses; remove them from
any code.

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
`twilight::notifier.changed`, `page.view`, `languages::translations.loaded`,
`auth::token.invalid`, `component::menus.fetched`, `salla-login::ready`,
`document::request.failed`, `currency::fetched`,
`advertisement::advertisement.fetched`.

### Not for app logic

Capitalized names (`"Product Viewed"`, `"Product Added"`, `"Cart Updated"`) are the
analytics/GTM tracking layer — don't build feature logic on them.

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

## Recipe: current product's price on a product page

> **Status: current best approach, NOT yet verified end to end.** `product::fetch.succeeded`
> was the wrong event (slider). Verify this on a live store before relying on it.

```js
// 1. Are we on a product page? URL pattern: /{slug}/{name}/p{productId}
const onProductPage = /\/p\d+/.test(location.pathname);

// 2. Read the price off the Stencil web component (props, not DOM attributes).
//    Salla storefront UI is web components: <salla-add-product-button>, <salla-user-menu>,
//    etc. Stencil exposes @Prop() values as JS PROPERTIES on the element.
const el = document.querySelector("salla-add-product-button");
const product = el?.product; // el.product / el.price are props, not attributes
// Inspect available props: Object.getOwnPropertyNames(Object.getPrototypeOf(el))

// 3. Variant/option price changes come through this event:
salla.event.on("product::price.updated", (e) => {
  /* update your UI from e.data */
});
```

---

## Store context & language

```js
salla.config.get("store.id"); // ✅ works (e.g. 1963287162)
salla.config.get("customer.id"); // ✅ null for guests (expected)
salla.config.get("store.currency"); // 'SAR'
salla.config.get("store.lang"); // ⚠️ may be null — use a fallback chain
```

Language fallback (don't trust `store.lang` alone):

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

---

## UI compliance (storefront)

Injected UI must follow `salla-ui-compliance`: use `<salla-button>` (not raw `<button>`),
Salla icons `sicon-*` (not emoji), and theme variables like `--color-primary` (not hardcoded
hex). Hook points for the single product page: `product:single.form.start` /
`product:single.form.end`.

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

| Topic                   | Link                                |
| ----------------------- | ----------------------------------- |
| Device Mode Usage Guide | https://docs.salla.dev/1724504m0.md |
