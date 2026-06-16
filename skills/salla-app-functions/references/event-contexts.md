# App Function Trigger Events & Typed Contexts

Supported triggers selectable from the Portal **Select Action** dropdown, grouped by
category. **Always confirm the exact `payload.data` fields and the typed-context name for
a given event via the MCP (`apidog-mcp-server`, site-id 451700) before writing a handler** —
only a subset of context interface names is publicly documented.

Full event reference: https://docs.salla.dev/1726818m0

---

## Synchronous vs Asynchronous

- **Synchronous (blocking, < 500 ms):** events ending in a present-participle "-ing"
  form intercept the operation before it completes. The canonical example is
  `shipment.creating` → return `Resp.error()` to block or `Resp.success().setData({…})`
  to modify.
- **Asynchronous (non-blocking, 30 s):** everything else runs after the operation.

---

## Order events

`order.created` · `order.completed` · `order.updated` · `order.status.updated` ·
`order.cancelled` · `order.refunded` · `order.deleted` · `order.products.updated` ·
`order.payment.updated` · `order.coupon.updated` · `order.total.price.updated`

## Product events

`product.added` · `product.created` · `product.updated` · `product.deleted` ·
`product.available` · `product.quantity.low`

## Shipment events

`shipment.creating` _(synchronous)_ · `shipment.created` · `shipment.cancelled` ·
`shipment.updated`

## Customer events

`customer.created` · `customer.updated` · `customer.login` · `customer.otp.request`

## Storefront / e-commerce customer events

`product.viewed` · `product.clicked` · `product.shared` · `product.reviewed` ·
`cart.viewed` · `cart.updated` · `checkout.started` · `checkout_step.viewed` ·
`checkout_step.completed` · `payment_info.entered` · `signed_in` · `signed_up` ·
`signed_out` · wishlist events

## Other

`abandoned.cart` · `coupon.applied` · `invoice.created` · `review.added` ·
category / brand / store-branch / shipping-zone / shipping-company events

---

## Typed context interfaces

The only context interface name confirmed in the public docs is **`OrderCreatedContext`**.
Other handlers commonly reference `OrderStatusUpdated`, `ProductAddedContext`,
`ShipmentCreatingContext`, and `CommunicationEvent` (the latter for Communication Apps —
see the salla-communication-app skill).

When a precise interface name isn't documented, fall back to the generic shape and type
`payload.data` from the MCP schema for that event:

```typescript
interface GenericContext<TData = Record<string, unknown>> {
  merchant: { id: string };
  payload: { event: string; created_at: string; data: TData };
  settings: Record<string, string | undefined>;
}
```
