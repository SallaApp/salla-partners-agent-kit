# App Function Trigger Events & Context Shapes

The catalog below is grounded in the official Salla App Functions docs and cross-checked
against the Salla Partners MCP (`salla_functions action=list_triggers`, **80 triggers**).
The MCP groups triggers into four categories: `merchant_actions` (the only **synchronous**,
blocking triggers), `merchant_events`, `ecommerce_events`, `communication_events`.

- **`salla_functions action=list_triggers`** (no `app_id` needed) is the live source of
  truth for trigger names and categories — run it before relying on a name.
- Catalog overview: <https://docs.salla.dev/1726818m0.md>. Each event group below cites its
  own schema doc.
- Every payload follows the same envelope:

  ```jsonc
  {
    "payload": { "event": "<event>", "merchant": <id>, "created_at": "<string>", "data": { … } },
    "settings": { /* merchant-configured form values, keyed by id */ },
    "merchant": { "id": <id> } // present on most events; top-level merchant object
  }
  ```

  Note: `payload.merchant` is a numeric id; the top-level `merchant.id` is the object form.
  `settings` carries the merchant's configured form values (or `{}` when none).

The `Response`/`Shipment` builder, `.setData()`/`.setMessage()` mechanics, and the V8
sandbox limits are owned by **salla-app-functions-handler** — route there, don't reproduce
them here.

---

## Synchronous vs Asynchronous

Which category is which (timing rules and the 5 s / < 500 ms / 30 s budget live in
**[../SKILL.md](../SKILL.md)**; docs: <https://docs.salla.dev/1726818m0.md>):

- ⚡ **Synchronous** (`merchant_actions`, the only blocking category) — **`shipment.creating`**
  and **`shipment.cancelling`**. Confirm the category via `list_triggers`, not the verb form.
- 🔄 **Asynchronous** — everything in `merchant_events`, `ecommerce_events`, and
  `communication_events`.

---

# Merchant Events

Triggered by merchant actions in the store dashboard. All are 🔄 Asynchronous **except** the
two `merchant_actions` (⚡ Synchronous) below.

## Shipments — ⚡/🔄 — `merchant_actions` + `merchant_events`

Schema doc: <https://docs.salla.dev/1726835m0.md>

| Trigger               | MCP name            | Type | Category           |
| --------------------- | ------------------- | ---- | ------------------ |
| `shipment.creating`   | Shipment Creating   | ⚡   | `merchant_actions` |
| `shipment.cancelling` | Shipment Cancelling | ⚡   | `merchant_actions` |
| `shipment.created`    | Shipment Created    | 🔄   | `merchant_events`  |
| `shipment.cancelled`  | Shipment Cancelled  | 🔄   | `merchant_events`  |
| `shipment.updated`    | Shipment Updated    | 🔄   | `merchant_events`  |

`shipment.creating` is the documented sync example: it runs before the shipment is created,
must respond fast, and **returns a `Shipment`** (not a plain `Resp`) so it can set the
shipment number/label — the doc handler is `(context: Shipments): Promise<Shipment>`.
`shipment.cancelling` is the other `merchant_actions` trigger (confirmed via `list_triggers`);
the docs give no separate payload example for it.

`payload.data` (from `shipment.creating`):

```jsonc
{
  "id": 362985662,
  "order_id": 560695738,
  "order_reference_id": 48927,
  "reference": { "external_id": "34567898", "external_additional_id": "OM656545543" },
  "created_at": { "date": "…", "timezone_type": 3, "timezone": "Asia/Riyadh" },
  "type": "shipment",
  "courier_id": 1927161457,
  "courier_name": "Shipping App",
  "courier_logo": "https://…",
  "shipping_number": "846984645",
  "tracking_number": "4324233",
  "pickup_id": null,
  "trackable": true,
  "tracking_link": "https://…",
  "label": { "format": "pdf", "url": "https://…" },
  "payment_method": "cod",
  "source": "api",
  "status": "delivered",
  "total": { "amount": 25.5, "currency": "SAR" },
  "cash_on_delivery": { "amount": 10.7, "currency": "SAR" },
  "is_international": false,
  "total_weight": { "value": 5, "units": "kg" },
  "billing_account": "merchant",
  "description": "…",
  "remarks": "…",
  "shipping_route": { "id": 1867988940, "name": "Default Route" },
  "service_types": ["international", "normal", "fulfillment"],
  "packages": [{ "item_id": …, "name": "…", "sku": "…", "price": {…}, "quantity": 1, "weight": { "value": 5, "unit": "kg" } }],
  "ship_from": { "type": "branch", "name": "…", "country": "…", "city": "…", "address_line": "…", "latitude": …, "longitude": …, "branch_id": … },
  "ship_to": { "type": "address", "name": "…", "country": "…", "city": "…", "address_line": "…", "latitude": …, "longitude": … },
  "meta": { "app_id": 1222362158, "policy_options": { "boxes": 1 } }
}
```

For shipping-specific behavior (labels, tracking, cancellation) see **salla-shipping-app**.

## Orders — 🔄 — `merchant_events`

Schema doc: <https://docs.salla.dev/1726836m0.md>

| Trigger                     | MCP name                  |
| --------------------------- | ------------------------- |
| `order.created`             | Order Created             |
| `order.status.updated`      | Order Status Updated      |
| `order.deleted`             | Order Deleted             |
| `order.products.updated`    | Order Products Updated    |
| `order.payment.updated`     | Order Payment Updated     |
| `order.coupon.updated`      | Order Coupon Updated      |
| `order.total.price.updated` | Order Total Price Updated |

The doc handler types the context as `Order`. The doc lists `order.updated`,
`order.cancelled`, `order.refunded` in prose, but the **live `list_triggers`** exposes the
seven `merchant_events` triggers above; the cancelled/refunded/updated variants surface as
`ecommerce_events` (`ecommerce.order.*`, below). `order.completed` is also `ecommerce_events`.

`payload.data` for `order.created` (large object — key fields):

```jsonc
{
  "id": 2116149737,
  "reference_id": 41027662,
  "urls": { "customer": "…", "admin": "…", "rating": "…", "checkout": "…" },
  "date": { "date": "…", "timezone_type": 3, "timezone": "Asia/Riyadh" },
  "draft": false, "read": true, "source": "store", "source_device": "desktop",
  "source_details": { "type": "direct", "device": "…", "user-agent": "…", "ip": "…" },
  "status": { "id": 566146469, "name": "…", "slug": "under_review", "customized": { "id": …, "name": "…" } },
  "payment_method": "bank",
  "currency": "SAR",
  "amounts": {
    "sub_total": { "amount": 186, "currency": "SAR" },
    "shipping_cost": { "amount": 15, "currency": "SAR" },
    "cash_on_delivery": { "amount": 0, "currency": "SAR" },
    "tax": { "percent": "0.00", "amount": { "amount": 0, "currency": "SAR" } },
    "discounts": [{ "title": "…", "type": "special", "code": "…", "discount": "5.00", "discounted_shipping": 0 }],
    "total": { "amount": 196, "currency": "SAR" }
  },
  "shipping": { "id": …, "company": "…", "receiver": {…}, "shipper": {…}, "pickup_address": {…}, "address": {…}, "shipment": {…} },
  "shipments": [ { "id": …, "courier_id": …, "status": "in_progress", "ship_from": {…}, "ship_to": {…}, "packages": [...] } ],
  "customer": { "id": 225167971, "first_name": "…", "last_name": "…", "mobile": …, "mobile_code": "+966", "email": "…", "city": "…", "country": "…" },
  "items": [ { "id": …, "name": "…", "sku": "…", "quantity": 1, "amounts": {…}, "product": {…}, "options": [...] } ],
  "can_cancel": true, "can_reorder": true, "is_pending_payment": false, "tags": []
}
```

`order.status.updated` carries a **different** shape — `data` holds the status change plus a
nested `order`:

```jsonc
{
  "id": 198290473,
  "status": "تم التنفيذ",
  "customized": null,
  "note": "…",
  "created_at": { "date": "…", "timezone_type": 3, "timezone": "Asia/Riyadh" },
  "order": { "id": 629263027, "reference_id": 42264, "status": { "id": …, "name": "…", "slug": "completed" }, "amounts": {…}, "customer": {…}, "items": [...], "total": {…} }
}
```

## Products — 🔄 — `merchant_events`

Schema doc: <https://docs.salla.dev/1726830m0.md> (not fetched here — confirm `payload.data`
via the schema doc or `salla_functions action=get`).

| Trigger                | MCP name             |
| ---------------------- | -------------------- |
| `product.created`      | Product Created      |
| `product.updated`      | Product Updated      |
| `product.deleted`      | Product Deleted      |
| `product.available`    | Product Available    |
| `product.quantity.low` | Product Quantity Low |

The catalog page also lists "Product Added" under Products, but `product.added` is an
`ecommerce_events` (storefront) trigger — see Customer Events.

## Categories — 🔄 — `merchant_events`

Schema doc: <https://docs.salla.dev/1726827m0.md>

| Trigger            | MCP name         |
| ------------------ | ---------------- |
| `category.created` | Category Created |
| `category.updated` | Category Updated |

Context type `Category`. `payload.data`:

```jsonc
{
  "id": 1576087344,
  "name": "Osama Sub Category",
  "image": "https://…",
  "urls": { "customer": "…", "admin": "…" },
  "parent_id": 700413444,
  "sort_order": 0,
  "status": "active",
  "show_in": { "app": true, "salla_points": false },
  "has_hidden_products": false,
  "update_at": "2025-11-13 12:05:09",
  "metadata": { "title": "title", "description": "desc", "url": null },
}
```

## Brands — 🔄 — `merchant_events`

Schema doc: <https://docs.salla.dev/1726834m0.md>

| Trigger         | MCP name      |
| --------------- | ------------- |
| `brand.created` | Brand Created |
| `brand.updated` | Brand Updated |
| `brand.deleted` | Brand Deleted |

Context type `Brand`. `payload.data` (note: the JSON example uses flat string `name`/
`description`; the doc's handler example destructures `brand.name.en` — treat the
flat-string form in the example payload as authoritative and confirm via the schema doc):

```jsonc
{
  "id": 100165769,
  "name": "Apple",
  "label": "Apple",
  "description": "<p>Apple brand</p>",
  "banner": null,
  "logo": "https://…",
  "status": null,
  "ar_char": "أ",
  "en_char": "A",
  "metadata": { "title": null, "description": null, "url": "" },
}
```

## Shipping Zones — 🔄 — `merchant_events`

Schema doc: <https://docs.salla.dev/1726826m0.md>

| Trigger                 | MCP name              |
| ----------------------- | --------------------- |
| `shipping.zone.created` | Shipping Zone Created |
| `shipping.zone.updated` | Shipping Zone Updated |

Context type `Shippings`. `payload.data`:

```jsonc
{
  "id": 870442223,
  "zone_code": ".AE.ajman-city",
  "company": { "id": 488260393, "slug": null },
  "country": { "id": …, "name": "…", "name_en": "United Arab Emirates", "code": "AE", "mobile_code": "+971" },
  "city": { "id": …, "name": "…", "name_en": "AJMAN CITY" },
  "cities_excluded": [ { "id": …, "name": "…", "name_en": "…" } ],
  "fees": { "amount": "30", "currency": "SAR", "type": "rate", "weight_unit": "kg", "up_to_weight": "15", "amount_per_unit": "2", "per_unit": "1" },
  "cash_on_delivery": { "status": true, "fees": "12" },
  "duration": "3-5"
}
```

## Shipping Companies — 🔄 — `merchant_events`

Schema doc: <https://docs.salla.dev/1726832m0.md>

| Trigger                    | MCP name                 |
| -------------------------- | ------------------------ |
| `shipping.company.created` | Shipping Company Created |
| `shipping.company.updated` | Shipping Company Updated |
| `shipping.company.deleted` | Shipping Company Deleted |

Context type `Shippings`. `payload.data` (the documented `deleted` example is minimal):

```jsonc
{ "id": 488260393, "name": "شركة سريع", "status": false }
```

## Customers — 🔄 — `merchant_events`

Schema doc: <https://docs.salla.dev/1726829m0.md>

| Trigger                | MCP name             |
| ---------------------- | -------------------- |
| `customer.created`     | Customer Created     |
| `customer.updated`     | Customer Updated     |
| `customer.login`       | Customer Login       |
| `customer.otp.request` | Customer OTP Request |

Context type `Customer`. `payload.data` for `customer.login` / `created` / `updated`:

```jsonc
{
  "id": 225167971,
  "first_name": "User",
  "last_name": "Mohammed",
  "mobile": 555555555,
  "mobile_code": "+966",
  "email": "test@gmail.com",
  "urls": { "customer": "…", "admin": "…" },
  "avatar": "https://…",
  "gender": "female",
  "birthday": { "date": "…", "timezone_type": 3, "timezone": "Asia/Riyadh" },
  "city": "الرياض",
  "country": "السعودية",
  "country_code": "SA",
  "currency": "AED",
  "location": "14",
  "updated_at": { "date": "…", "timezone_type": 3, "timezone": "Asia/Riyadh" },
  "groups": [],
  "source": { "device": "desktop", "user-agent": "…", "ip": "127.0.0.1" },
  "is_notifications_enabled": true,
}
```

`customer.otp.request` carries a **minimal, different** `payload.data`:

```jsonc
{ "code": "5331", "contact": "+96652318526" }
```

## Store Branches & Tax — 🔄 — `merchant_events`

Schema doc: <https://docs.salla.dev/1726831m0.md>

| Trigger                   | MCP name                 |
| ------------------------- | ------------------------ |
| `store.branch.created`    | Store Branch Created     |
| `store.branch.updated`    | Store Branch Updated     |
| `store.branch.setDefault` | Store Branch Set Default |
| `store.branch.activated`  | Store Branch Activated   |
| `store.branch.deleted`    | Store Branch Deleted     |
| `storetax.created`        | Store Tax Created        |

Context type `Store`. The branch doc documents `created`/`updated`/`deleted` only;
`store.branch.setDefault`, `store.branch.activated`, and `storetax.created` are confirmed
live triggers but have **no documented payload example** — confirm via the schema doc.
`payload.data` for a branch event:

```jsonc
{
  "id": 1594346156,
  "name": "الفرع الرئيسي",
  "status": "active",
  "is_default": true,
  "location": { "lat": "21.38…", "lng": "39.77…" },
  "short_address": null, "street": "Street", "address_description": "Adress",
  "postal_code": "24222",
  "contacts": { "phone": "…", "telephone": "…", "whatsapp": "…" },
  "is_open": true,
  "working_hours": [ { "name": "Thursday", "times": [ { "from": "10:00", "to": "21:00" } ] } ],
  "is_cod_available": true, "is_stock": true, "type": "branch", "cod_cost": "0.00",
  "branch_code": "FFc",
  "country": { "id": …, "name": "Saudi Arabia", "code": "SA", "mobile_code": "+966" },
  "city": { "id": …, "name": "Mecca", "country_id": … },
  "district": null
}
```

## Invoices — 🔄 — `merchant_events`

Schema doc: <https://docs.salla.dev/1726824m0.md>

| Trigger           | MCP name        |
| ----------------- | --------------- |
| `invoice.created` | Invoice Created |

Context type `Invoice`. `payload.data`:

```jsonc
{
  "id": 1197159170,
  "invoice_number": 1,
  "uuid": "77d5bb30-…",
  "order_id": 1848408264,
  "invoice_reference_id": null,
  "type": "فاتورة ضريبية",
  "slug": 1,
  "date": "2025-11-06 10:10:40",
  "qr_code": null,
  "payment_method": "bank",
  "sub_total": { "amount": 588, "currency": "SAR" },
  "shipping_cost": { "amount": 0, "taxable": true, "currency": "SAR" },
  "cod_cost": { "amount": 0, "taxable": true, "currency": "SAR" },
  "discount": { "amount": 0, "currency": "SAR" },
  "tax": { "percent": 15, "amount": { "amount": 88.2, "currency": "SAR" } },
  "total": { "amount": 676.2, "currency": "SAR" },
  "shipping_cost_discount": { "amount": 0, "currency": "SAR" },
  "items": [ { "id": …, "item_id": …, "product_id": …, "name": "…", "sku": "…", "quantity": 1, "type": "product", "price": {…}, "tax": {…}, "total": {…}, "options": [...] } ],
  "company": null,
  "customer": { "id": …, "first_name": "…", "last_name": "…", "mobile": …, "mobile_code": "+962", "email": "…", "address": {…} }
}
```

## Special Offers — 🔄 — `merchant_events`

Schema doc: <https://docs.salla.dev/1726828m0.md>

| Trigger                | MCP name              |
| ---------------------- | --------------------- |
| `specialoffer.created` | Special Offer Created |
| `specialoffer.updated` | Special Offer Updated |

Context type `SpecialOffer`. `payload.data`:

```jsonc
{
  "id": 421868142,
  "name": "Osama Test Offer",
  "message": "…",
  "start_date": "2025-11-13 16:08:06",
  "expiry_date": "2025-11-29 09:00:00",
  "formatted_date": "29 نوفمبر 2025",
  "offer_type": "buy_x_get_y",
  "status": "active",
  "buy": { "type": "product", "quantity": "1", "products": [] },
  "get": { "type": "category", "categories": [ { "id": …, "name": "…" } ], "discount_type": "percentage", "quantity": "1", "discount_amount": "10" }
}
```

## Reviews — 🔄 — `merchant_events`

Schema doc: <https://docs.salla.dev/1726833m0.md>

| Trigger        | MCP name     |
| -------------- | ------------ |
| `review.added` | Review Added |

Context type `Misc`. `payload.data` (nests `customer`, `product`, and the full `order`):

```jsonc
{
  "type": "rating",
  "rating": "4",
  "content": "Tamam",
  "customer": { "id": …, "name": "…", "mobile": "…", "email": "…", "country": "…", "city": "…" },
  "product": { "id": 802593739, "type": "product", "status": "sale", "is_available": true, "sku": "…", "name": "فستان", "price": {…}, "sale_price": {…}, "url": "…", "thumbnail": "…", "features": { "show_rating": true } },
  "order": { "id": 1848408264, "reference_id": …, "total": {…}, "status": { "slug": "shipped" }, "items": [...], "customer": {…} }
}
```

## Abandoned Cart — 🔄 — `merchant_events`

Schema doc: <https://docs.salla.dev/1726838m0.md>

| Trigger          | MCP name       |
| ---------------- | -------------- |
| `abandoned.cart` | Abandoned Cart |

`abandoned.cart` is the only abandoned-cart trigger in the live `list_triggers`. The cart
doc additionally describes `abandoned.cart.updated`, `abandoned.cart.status.changed`, and
`abandoned.cart.purchased` payload shapes, but those names are **not** in the current
`merchant_events` list — confirm via `list_triggers` before relying on them.

`payload.data` for `abandoned.cart`:

```jsonc
{
  "id": 1097962121,
  "total": { "amount": 100, "currency": "SAR" },
  "subtotal": { "amount": 60, "currency": "SAR" },
  "total_discount": { "amount": 10, "currency": "SAR" },
  "checkout_url": "https://…",
  "age_in_minutes": 83,
  "created_at": { "date": "…", "timezone_type": 3, "timezone": "Asia/Riyadh" },
  "updated_at": { "date": "…", "timezone_type": 3, "timezone": "Asia/Riyadh" },
  "customer": { "id": …, "name": "…", "mobile": "…", "email": "…", "country": "…", "city": "…" },
  "coupon": { "id": …, "code": "…", "status": "active", "type": "percentage", "amount": 20, "expiry_date": "…", "free_shipping": true },
  "items": [ { "id": …, "product_id": …, "quantity": 2 } ]
}
```

Context type `Cart` in the doc handlers.

---

# Customer Events (storefront / `ecommerce_events`)

🔄 Always asynchronous. Triggered by shopper behavior on the storefront. **If the work
belongs in the shopper's browser** rather than a server-side handler, use a storefront
snippet (**salla-snippets**, Device Mode) instead of an App Function.

> ⚠️ **Payload caveat:** the public customer-event docs use **illustrative/placeholder**
> payloads (e.g. `"merchant": 101`, string ids like `"5001"`, simplified `data`). Treat the
> field shapes below as illustrative of the documented structure, and confirm exact field
> names/types via the linked schema doc or `salla_functions action=get` before relying on
> them.

## Product Interactions — `ecommerce_events`

Schema doc: <https://docs.salla.dev/1726820m0.md>

`products.searched` (Products Searched) · `product.list.viewed` (Product List Viewed) ·
`product.list.filtered` (Product List Filtered) · `product.list.sorted` (Product List
Sorted) · `product.viewed` (Product Viewed) · `product.clicked` (Product Clicked) ·
`product.shared` (Product Shared) · `product.reviewed` (Product Reviewed)

Illustrative `payload.data` (Product Viewed):

```jsonc
{
  "product_id": "12345",
  "sku": "TSH-BLK-L-001",
  "category": "Clothing/T-Shirts",
  "name": "Premium Cotton T-Shirt",
  "brand": "Urban Style",
  "variant": "Black / Large",
  "price": 99.0,
  "currency": "SAR",
  "quantity": 1,
  "url": "…",
  "image_url": "…",
}
```

## Cart & Checkout — `ecommerce_events`

Schema doc: <https://docs.salla.dev/1726822m0.md>

`product.added` (Product Added) · `product.removed` (Product Removed) · `cart.viewed`
(Cart Viewed) · `cart.updated` (Cart Updated) · `cart.shared` (Cart Shared) ·
`checkout.started` (Checkout Started) · `checkout.step.viewed` (Checkout Step Viewed) ·
`checkout.step.completed` (Checkout Step Completed) · `payment.info.entered` (Payment Info
Entered) · `payment.failed` (Payment Failed) · `order.completed` (Order Completed) ·
`ecommerce.order.updated` (Order Updated) · `ecommerce.order.cancelled` (Order Cancelled) ·
`ecommerce.order.refunded` (Order Refunded)

Illustrative `payload.data` (Product Added):

```jsonc
{
  "cart_id": "cart_abc123",
  "total": 198.0,
  "currency": "SAR",
  "products": [
    {
      "product_id": "5001",
      "name": "Premium Cotton T-Shirt",
      "price": 99.0,
      "quantity": 2,
    },
  ],
}
```

The cart/checkout context type varies in the docs (`Checkout`,
`CheckoutStepCompletedEvent`); confirm via `salla_functions action=get` for your trigger.

## Promotions & Coupons — `ecommerce_events`

Schema doc: <https://docs.salla.dev/1726821m0.md>

`promotion.viewed` (Promotion viewed) · `promotion.clicked` (Promotion clicked) ·
`coupon.entered` (Coupon Entered) · `coupon.applied` (Coupon Applied) · `coupon.removed`
(Coupon Removed) · `coupon.denied` (Coupon Denied)

Illustrative `payload.data` (Coupon Applied):

```jsonc
{
  "promotion_id": "promo_123",
  "coupon": "WELCOME10",
  "discount": 44.7,
  "order_id": "order_xyz789",
}
```

Note: a separate, **richer** `coupon.applied` (cart-wrapped) example also appears in the
abandoned-cart doc (<https://docs.salla.dev/1726838m0.md>); the live `coupon.applied` is the
storefront `ecommerce_events` trigger. Confirm the exact shape via `action=get`.

## Wishlist — `ecommerce_events`

Schema doc: <https://docs.salla.dev/1726823m0.md>

`product.added.to.wishlist` (Product Added to Wishlist) · `product.removed.from.wishlist`
(Product Removed from Wishlist) · `wishlist.product.added.to.cart` (Wishlist Product Added
to Cart)

Illustrative `payload.data` (Product Added to Wishlist):

```jsonc
{
  "wishlist_id": "wishlist_abc123",
  "wishlist_name": "My Favorites",
  "product_id": "5001",
  "name": "Premium Cotton T-Shirt",
  "price": 99.0,
}
```

## User Account — `ecommerce_events`

Schema doc: <https://docs.salla.dev/1726819m0.md>

`signed.in` (Signed In) · `signed.up` (Signed up) · `signed.out` (Signed Out) ·
`user.profile.updated` (User Profile Updated)

Illustrative `payload.data` (Signed Up):

```jsonc
{
  "user_id": "user_98765",
  "email": "ahmed@example.com",
  "name": "Ahmed Mohammed",
}
```

---

# Communication Events — `communication_events` — 🔄

Schema doc: <https://docs.salla.dev/1726830m0.md> (see catalog
<https://docs.salla.dev/1726818m0.md>; payloads from the communication event doc).

| Trigger                       | MCP name |
| ----------------------------- | -------- |
| `communication.sms.send`      | Sms      |
| `communication.email.send`    | Email    |
| `communication.whatsapp.send` | Whatsapp |

These power Communication Apps — see **salla-communication-app**. Context type
`CommunicationEvent`. `payload.data`:

```jsonc
{
  "notifiable": ["+96656000000"],
  "type": "order.status.updated",
  "content": "أصبحت حالة طلبك #218103278 [تم الشحن]",
  "entity": { "id": 1741773897, "type": "order" }, // or null
  "locale": "ar",
  "meta": { "customer_id": 239462497, "status": { "name": "تم الشحن" } }, // shape varies by type (otp → { code }, etc.)
}
```

---

## Typed context interfaces

The doc handler examples name a context type per event family — observed in the official
event docs: `Order` (orders), `Shipments`/`Shipment` (shipments — note `shipment.creating`
returns `Promise<Shipment>`), `Brand`, `Category`, `Customer`, `Store`, `Invoice`,
`SpecialOffer`, `Shippings` (zones & companies), `Cart` (abandoned cart), `Misc` (reviews),
`CommunicationEvent` (communication), and storefront names like `ProductViewedEvent`,
`CheckoutStepCompletedEvent`, `SignedInEvent`, `CouponAppliedEvent`,
`ProductAddedToWishlistEvent`. These appear in doc samples; the **authoritative `.d.ts`** for
any trigger is the `types` URL returned by `salla_functions action=get` — type-check against
that before relying on a name.

When a precise interface isn't available, fall back to the generic envelope and type
`payload.data` from the event's schema doc:

```typescript
interface GenericContext<TData = Record<string, unknown>> {
  payload: { event: string; merchant: number; created_at: string; data: TData };
  settings: Record<string, string | number | boolean | undefined>;
  merchant: { id: number };
}
```

---

## Hand-offs

- Token storage / OAuth / merchant access tokens → **salla-app-auth**.
- Webhook signature verification & idempotency (webhook equivalent of an event) →
  **salla-webhooks**.
- Shipping-specific shipment behavior (labels, tracking, cancellation) →
  **salla-shipping-app**.
- `Response`/`Shipment` builder mechanics, sandbox limits, then validation & release →
  **salla-app-functions-handler** → **salla-app-functions-validate** /
  **salla-app-functions-release**.
