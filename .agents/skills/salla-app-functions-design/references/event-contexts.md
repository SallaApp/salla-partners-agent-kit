# App Function Trigger Events & Typed Contexts

Triggers selectable from the Portal **Select Action** dropdown. The lists below are
**verified** against the Salla Partners MCP (`salla_functions action=list_triggers`,
80 triggers, retrieved 2026-06). Triggers can change over time — **re-enumerate the live
list with `salla_functions action=list_triggers`** (no `app_id` needed) before relying on
a name, and **always confirm the exact `payload.data` fields and the typed-context name
for a given event in the App Functions events reference**
(https://docs.salla.dev/1726818m0.md) before writing a handler. Only a subset of context
interface names is publicly documented.

The MCP groups triggers into four categories: `merchant_actions` (synchronous — the only
blocking triggers), `merchant_events`, `ecommerce_events`, `communication_events`.

---

## Synchronous vs Asynchronous

- **Synchronous (blocking, 5 s total — keep each internal async call < 2 s):** ONLY triggers
  in the `merchant_actions` category.
  As of the 2026-06 enumeration these are exactly **`shipment.creating`** and
  **`shipment.cancelling`** — each intercepts the operation before it completes
  (`Resp.error()` blocks, `Resp.success().setData({…})` modifies). Do **not** infer sync
  behavior from the verb form alone; confirm the category via
  `salla_functions action=list_triggers`.
- **Asynchronous (non-blocking, 30 s):** everything in `merchant_events`,
  `ecommerce_events`, and `communication_events` runs after the operation.

---

## merchant_actions (synchronous)

`shipment.creating` · `shipment.cancelling`

## merchant_events (asynchronous)

Order: `order.created` · `order.status.updated` · `order.deleted` ·
`order.products.updated` · `order.payment.updated` · `order.coupon.updated` ·
`order.total.price.updated`

Product: `product.created` · `product.updated` · `product.deleted` ·
`product.available` · `product.quantity.low`

Shipping: `shipping.zone.created` · `shipping.zone.updated` ·
`shipping.company.created` · `shipping.company.updated` · `shipping.company.deleted`

Shipment: `shipment.created` · `shipment.cancelled` · `shipment.updated`

Customer: `customer.created` · `customer.updated` · `customer.login` ·
`customer.otp.request`

Catalog & store: `category.created` · `category.updated` · `brand.created` ·
`brand.updated` · `brand.deleted` · `store.branch.created` · `store.branch.updated` ·
`store.branch.setDefault` · `store.branch.activated` · `store.branch.deleted` ·
`storetax.created` · `specialoffer.created` · `specialoffer.updated`

Other: `abandoned.cart` · `invoice.created` · `review.added`

## ecommerce_events (asynchronous, storefront/browser-originated)

These mirror storefront shopper behavior. If the work belongs in the shopper's browser
instead of a server-side handler, use a storefront snippet (**salla-snippets**, Device
Mode) rather than an App Function.

`order.completed` · `ecommerce.order.cancelled` · `ecommerce.order.refunded` ·
`ecommerce.order.updated` · `checkout.started` · `checkout.step.viewed` ·
`checkout.step.completed` · `payment.info.entered` · `payment.failed` ·
`products.searched` · `product.list.viewed` · `product.list.sorted` ·
`product.list.filtered` · `product.added` · `product.removed` · `product.clicked` ·
`product.viewed` · `product.shared` · `product.reviewed` · `cart.viewed` ·
`cart.updated` · `cart.shared` · `coupon.applied` · `coupon.removed` ·
`coupon.denied` · `coupon.entered` · `product.added.to.wishlist` ·
`product.removed.from.wishlist` · `wishlist.product.added.to.cart` ·
`promotion.viewed` · `promotion.clicked` · `signed.up` · `signed.in` · `signed.out` ·
`user.profile.updated`

## communication_events (asynchronous)

`communication.sms.send` · `communication.email.send` · `communication.whatsapp.send`

These power Communication Apps — see the **salla-communication-app** skill.

---

## Security & merchant-data hand-offs

This skill only picks the trigger. When the handler will touch tokens, merchant
authentication, or outbound calls:

- Token storage / OAuth / merchant access tokens → **salla-app-auth**.
- Webhook signature verification & idempotency (for the webhook equivalent of an event)
  → **salla-webhooks**.
- Shipping-specific shipment behavior (labels, tracking, cancellation) →
  **salla-shipping-app**.
- Handler validation & release after design → **salla-app-functions-handler** then
  **salla-app-functions-validate** / **salla-app-functions-release**.

---

## Typed context interfaces

The only context interface name confirmed in the public docs is **`OrderCreatedContext`**.
Other handlers commonly reference `OrderStatusUpdated`, `ProductAddedContext`,
`ShipmentCreatingContext`, and `CommunicationEvent` (the latter for Communication Apps —
see the salla-communication-app skill). Treat these unconfirmed names as illustrative and
verify against the `.d.ts` URLs returned by `salla_functions action=get` for your trigger,
or the events reference (https://docs.salla.dev/1726818m0.md), before relying on them.

When a precise interface name isn't documented, fall back to the generic shape and type
`payload.data` from the events reference (https://docs.salla.dev/1726818m0.md) for that
event. The shape below is **illustrative** — confirm exact field names per event:

```typescript
interface GenericContext<TData = Record<string, unknown>> {
  merchant: { id: string };
  payload: { event: string; created_at: string; data: TData };
  settings: Record<string, string | undefined>;
}
```
