# Device Mode — Implementation Guide

Device Mode captures e-commerce events directly in the browser via the **Twilight SDK** and your `tracker.js` script embedded in the storefront.

---

## Installation

Add `tracker.js` to your storefront. Salla loads it automatically when your App Snippet is active.

```html
<!-- Added via App Snippet — injected into every storefront page -->
<script src="https://your-app.com/tracker.js"></script>
```

Or load the Twilight SDK directly:

```html
<script src="https://cdn.salla.network/twilight/latest/twilight.js"></script>
```

---

## Listening to Events

Use `salla.event.on(eventName, callback)` to subscribe to any storefront event:

```js
salla.event.on("cart.add", (event) => {
  console.log("Product added:", event.data);
});
```

Multiple listeners on the same event are supported. Unsubscribe with:

```js
const handler = (event) => {
  /* ... */
};
salla.event.on("cart.add", handler);
salla.event.off("cart.add", handler);
```

---

## Event Payload Shape

Every event follows the same envelope:

```json
{
  "event": "cart.add",
  "timestamp": 1710000000000,
  "data": {}
}
```

The `data` object is event-specific (see catalogue below).

---

## Event Catalogue

> ⚠️ **Verify event names against https://docs.salla.dev/1724504m0.md before shipping** —
> the names below are indicative and not confirmed against a verified source.

### Cart Events

| Event         | Trigger                   | Key `data` fields                                |
| ------------- | ------------------------- | ------------------------------------------------ |
| `cart.add`    | Product added to cart     | `product_id`, `name`, `price`, `quantity`, `sku` |
| `cart.remove` | Product removed from cart | `product_id`, `quantity`                         |
| `cart.update` | Quantity changed          | `product_id`, `old_quantity`, `new_quantity`     |
| `cart.view`   | Cart page opened          | `items[]`, `total`                               |

### Product Events

| Event                     | Trigger                    | Key `data` fields                                |
| ------------------------- | -------------------------- | ------------------------------------------------ |
| `product.view`            | Product detail page opened | `product_id`, `name`, `price`, `sku`, `category` |
| `product.wishlist.add`    | Added to wishlist          | `product_id`, `name`                             |
| `product.wishlist.remove` | Removed from wishlist      | `product_id`                                     |

### Checkout Events

| Event               | Trigger                   | Key `data` fields                                |
| ------------------- | ------------------------- | ------------------------------------------------ |
| `checkout.start`    | Checkout initiated        | `items[]`, `total`, `currency`                   |
| `checkout.step`     | Checkout step completed   | `step` (`shipping`/`payment`), `data`            |
| `checkout.complete` | Order placed successfully | `order_id`, `total`, `items[]`, `payment_method` |

### Search & Navigation

| Event           | Trigger              | Key `data` fields        |
| --------------- | -------------------- | ------------------------ |
| `search.query`  | Search submitted     | `query`, `results_count` |
| `category.view` | Category page opened | `category_id`, `name`    |
| `page.view`     | Any page navigation  | `url`, `title`           |

---

## Sending Data to Your Backend

Forward events to your server for analytics or personalization:

```js
salla.event.on("checkout.complete", async (event) => {
  await fetch("https://your-app.com/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      event: event.event,
      store_id: salla.config.get("store.id"),
      data: event.data,
    }),
  });
});
```

---

## Accessing Store Context

The Twilight SDK exposes store metadata available on every page:

```js
const storeId = salla.config.get("store.id");
const storeLang = salla.config.get("store.lang"); // 'ar' | 'en'
const currency = salla.config.get("store.currency"); // 'SAR'
const customerId = salla.config.get("customer.id"); // null if guest
```

---

## Initializing on DOM Ready

Always wait for the SDK to be ready before attaching listeners:

```js
salla.onReady(() => {
  salla.event.on("cart.add", (event) => {
    // safe to use SDK here
  });
});
```

---

## Resources

| Topic                   | Link                                |
| ----------------------- | ----------------------------------- |
| Device Mode Usage Guide | https://docs.salla.dev/1724504m0.md |
