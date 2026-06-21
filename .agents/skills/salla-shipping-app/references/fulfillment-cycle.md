# Order Fulfilment App Cycle — Detailed Reference

An **Order Fulfilment** app sits **across multiple carriers**: it receives the order,
auto-assigns the best carrier/branch, and drives the assigned Shipping App — abstracting
multi-carrier complexity from the merchant. This is the **second shipping app model**; the
single-carrier **Shipping Management / AWB** model (where you write the `shipment.creating`
App Function) lives in `shipment-cycle.md`. Source of truth:
https://docs.salla.dev/423000m0.md, https://docs.salla.dev/423001m0.md,
https://docs.salla.dev/423002m0.md, https://docs.salla.dev/422988m0.md.

> **Security & ownership (route, don't duplicate):** token storage/refresh →
> **`salla-app-auth`**; webhook signature verification, idempotency, and fast-200 transport →
> **`salla-webhooks`**; generic order/branch API mechanics → **`salla-api-core`**; the
> Shipping REST endpoint shapes (`GET /shipping/companies`, `POST /shipments`,
> `PUT /shipments/{id}`, return/cancel) → [`api-endpoints.md`](api-endpoints.md). Orders,
> addresses, branch inventory, and carrier credentials mean PII + secrets: store credentials
> encrypted, never log tokens, addresses, phones, or labels.
>
> The TypeScript blocks are **pseudo-code** (undefined helper types/functions) showing the
> pattern, not drop-in code.

---

## Two models — how Fulfilment differs from Shipping Management

|                    | Shipping Management (AWB)                                                | Order Fulfilment                                        |
| ------------------ | ------------------------------------------------------------------------ | ------------------------------------------------------- |
| **Scope**          | One shipping company                                                     | Multiple carriers + branches                            |
| **Decision maker** | Merchant picks the carrier                                               | Your app auto-assigns the best carrier                  |
| **Inventory**      | Not managed                                                              | Managed across branches                                 |
| **Core code**      | `shipment.creating` / `shipment.cancelling` App Functions (generate AWB) | React to `order.created`, **assign** shipments via REST |
| **Reference**      | `shipment-cycle.md`                                                      | this file                                               |

> A Fulfilment app **does not** write a `shipment.creating` function — it **assigns** the
> order to a Shipping App, and that Shipping App's `shipment.creating` function (its AWB
> logic) runs. The Fulfilment app is then notified back via the async `shipment.created` event.

---

## Setup (https://docs.salla.dev/423002m0.md)

Minimum scopes: **Basic Info**, **Orders**, **Webhooks**, **Shipping**. Store events to
subscribe: **Order Created** (`order.created`) and **Shipment Created** (`shipment.created`).

---

## Fulfilment Lifecycle

```text
Customer places order  (checkout, or Create Order API)
        ↓
Salla fires order.created  (shipment status "pending")
        ↓
Your app evaluates the order:
  - GET /shipping/companies → which carriers the merchant has enabled
  - which branch has stock? which carrier serves the destination? cheapest/fastest?
        ↓
Your app assigns the order: POST /shipments  (shipment status "creating")
        ↓
Salla runs the assigned Shipping App's shipment.creating App Function (its AWB logic)
        ↓
Salla fires async shipment.created back to your Fulfilment app  (status sync)
        ↓
Carrier delivers → status updated via PUT /shipments/{id}
        ↓
[Return]  POST /shipments/{id}/return     [Cancel]  POST /shipments/{id}/cancel
```

(Endpoint shapes, payloads, and the writable status enum → [`api-endpoints.md`](api-endpoints.md).)

---

## Key Events

| Event                | Description                                  | Your action                                            |
| -------------------- | -------------------------------------------- | ------------------------------------------------------ |
| `order.created`      | New order placed (shipment status `pending`) | `GET /shipping/companies`, evaluate, `POST /shipments` |
| `shipment.created`   | A Shipping App updated an assigned shipment  | Sync shipment/order status                             |
| `shipment.cancelled` | A shipment/return was cancelled              | Reconcile and notify                                   |

The `order.created` payload carries the order, items, addresses, and `pickup_branch`/branch
ids, so you usually do **not** need a separate branch lookup. Generic order/branch endpoints
are owned by **`salla-api-core`**.

---

## Discover the merchant's carriers

Before assigning, list the shipping companies the merchant has enabled with
`GET /shipping/companies` (shape and response fields — `id`, `app_id`, `activation_type`
`manual`/`api`, `slug` — are documented in [`api-endpoints.md`](api-endpoints.md)). `slug` /
`courier_id` feed the `GET /shipments` filters.

---

## Carrier assignment logic (your business rules)

```ts
async function assignCarrier(
  order: Order,
  branches: Branch[],
): Promise<Assignment> {
  // 1. Branches that have all items in stock
  const availableBranches = await filterByStock(branches, order.items);
  // 2. Nearest branch to the receiver
  const nearestBranch = findNearest(availableBranches, order.receiver.address);
  // 3. Pick a carrier for that zone (consider COD support)
  const carrier = await selectCarrierForZone(
    nearestBranch.city,
    order.receiver.address.city,
    order.is_cod,
  );
  return { branch: nearestBranch, carrier };
}
```

### Multi-carrier adapter pattern

```ts
interface CarrierAdapter {
  createShipment(params: ShipmentParams): Promise<ShipmentResult>;
  getLabel(shipmentId: string): Promise<string>;
  track(trackingNumber: string): Promise<TrackingStatus>;
  voidShipment(shipmentId: string): Promise<void>;
}

const carriers: Record<string, CarrierAdapter> = {
  aramex: new AramexAdapter(),
  smsa: new SmsaAdapter(),
  dhl: new DhlAdapter(),
};

const adapter = carriers[assignment.carrier];
const result = await adapter.createShipment(params);
```

---

## Status updates

As fulfilment progresses, update both the shipment and the order status with the single
**Update Shipment Details** call (`PUT /shipments/{id}`) — required fields, the writable
status enum, and the no-going-backwards transition rule live in
[`api-endpoints.md`](api-endpoints.md). Returns and cancellations go through
`POST /shipments/{id}/return` and `POST /shipments/{id}/cancel` (same reference).

---

## Webhook handler (fast-ack + idempotent)

> Verify `X-Salla-Signature` (raw body) and dedupe by event id **before** doing work — these
> belong to **`salla-webhooks`**. The events below are **fast-ack**: respond `200` **first**,
> then enqueue the carrier/assignment work in a durable queue with retries — never `await`
> carrier or API calls after sending the response. (`shipment.creating` /
> `shipment.cancelling` are 5s sync App Functions on the **Shipping App** side, not webhooks —
> see `shipment-cycle.md` and **`salla-app-functions`**.)

```ts
app.post("/webhook", verifySignature, async (req, res) => {
  const { event, data } = req.body;
  res.status(200).send("OK"); // fast-ack: respond first, then queue

  switch (event) {
    case "order.created":
      await queue.enqueue("assign-and-fulfill", { order: data });
      break;
    case "shipment.created":
      await queue.enqueue("sync-shipment-status", { shipment: data });
      break;
    case "order.cancelled":
    case "shipment.cancelled":
      await queue.enqueue("cancel-fulfillment", { id: data.id });
      break;
  }
});
```

---

## Test (https://docs.salla.dev/423003m0.md)

Install on a demo store, create an order, and confirm `order.created` fires in the Partners
**Webhooks Log**, then that your app assigns a shipment and reacts to the `shipment.created`
event. End-to-end demo-store validation → **`salla-live-testing`**.

---

## Resources

| Topic                           | Link                                   |
| ------------------------------- | -------------------------------------- |
| Order Fulfilment — create       | https://docs.salla.dev/423001m0.md     |
| Order Fulfilment — setup        | https://docs.salla.dev/423002m0.md     |
| Order Fulfilment — app cycle    | https://docs.salla.dev/423000m0.md     |
| Order Fulfilment — test         | https://docs.salla.dev/423003m0.md     |
| Shipping overview (both models) | https://docs.salla.dev/422988m0.md     |
| Shipping REST endpoints         | [api-endpoints.md](api-endpoints.md)   |
| Shipping Management (AWB) cycle | [shipment-cycle.md](shipment-cycle.md) |
