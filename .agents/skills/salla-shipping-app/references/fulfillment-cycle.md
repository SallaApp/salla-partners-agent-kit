# Order Fulfillment App Cycle — Detailed Reference

Order Fulfillment Apps manage dispatching orders across multiple carriers and branches, abstracting multi-carrier complexity from merchants. Source of truth: https://docs.salla.dev/423000m0.md and https://docs.salla.dev/422988m0.md.

> **Security & ownership (route, don't duplicate):** token storage/refresh → **`salla-app-auth`**;
> webhook signature verification, idempotency, and fast-200 transport → **`salla-webhooks`**;
> generic order/branch API mechanics → **`salla-api-core`**; App Function rate handlers →
> **`salla-app-functions`**. Handling orders, addresses, branch inventory, and carrier
> credentials means PII + secrets: store credentials encrypted and never log tokens,
> addresses, phones, or labels.
>
> The endpoint paths and event names below are the **real** Shipping API
> (https://docs.salla.dev/api-5578809); the TypeScript blocks are **pseudo-code**
> (undefined helper types/functions) meant to show the pattern, not drop-in code.

---

## How It Differs from a Shipping App

|                    | Shipping App               | Order Fulfillment App                |
| ------------------ | -------------------------- | ------------------------------------ |
| **Focus**          | Single carrier integration | Multi-carrier, multi-branch dispatch |
| **Decision maker** | Merchant picks carrier     | Your app auto-assigns best carrier   |
| **Inventory**      | Not managed                | Managed across branches              |
| **Complexity**     | Lower                      | Higher                               |

---

## Fulfillment Lifecycle

```text
Order created in Salla
        ↓
Salla fires: order.created  (shipment status "pending")
        ↓
Your app evaluates order:
  - GET /shipping/companies → which carriers the merchant has enabled
  - Which branch has stock?  Which carrier serves the destination?  Cheapest/fastest?
        ↓
Your app assigns the order: POST /shipments  (shipment status "creating")
        ↓
Salla runs the assigned Shipping App's shipment.creating App Function (sync)
        ↓
Shipping App creates the shipment with the carrier (returns a Shipment), then PUT /shipments/{id}
        ↓
Salla fires the async shipment.created event back to the Order Fulfilment App (status sync)
        ↓
Carrier delivers → status updated via PUT /shipments/{id}
        ↓
[If return]  POST /shipments/{id}/return    [If cancel]  POST /shipments/{id}/cancel
```

---

## Key Events

| Event                | Description                                  | Your action                                            |
| -------------------- | -------------------------------------------- | ------------------------------------------------------ |
| `order.created`      | New order placed (shipment status `pending`) | `GET /shipping/companies`, evaluate, `POST /shipments` |
| `shipment.created`   | A Shipping App updated an assigned shipment  | Sync shipment/order status                             |
| `shipment.cancelled` | A shipment/return was cancelled              | Reconcile and notify                                   |

> The Order Fulfilment App **assigns** shipments via `POST /shipments` (which makes Salla
> run the Shipping App's `shipment.creating` App Function) and is notified back via the
> async `shipment.created` event.
> It drives returns/cancellations through `POST /shipments/{id}/return` and
> `POST /shipments/{id}/cancel`. See shipment-cycle.md for the Shipping App's side.

---

## Discover the Merchant's Carriers

Before assigning, list the shipping apps/companies the merchant has enabled
(https://docs.salla.dev/api-5394239):

```http
GET https://api.salla.dev/admin/v2/shipping/companies
Authorization: Bearer {access_token}
```

```json
{
  "status": 200,
  "success": true,
  "data": [
    {
      "id": 1723506348,
      "name": "سمسا",
      "app_id": "1683195908",
      "activation_type": "manual",
      "slug": null
    },
    {
      "id": 814202285,
      "name": "DHL Express",
      "app_id": "827885927",
      "activation_type": "api",
      "slug": "dhl-express"
    }
  ]
}
```

`activation_type` is `manual` or `api`; `slug`/`courier_id` feed the `GET /shipments`
filters. The order's `pickup_branch` and branch ids arrive inside the `order.created`
payload (see below), so you usually do not need a separate branch lookup; generic
branch/order endpoints are owned by **`salla-api-core`**.

---

## Carrier Assignment Logic

Implement routing rules based on your business model:

```ts
async function assignCarrier(
  order: Order,
  branches: Branch[],
): Promise<Assignment> {
  // 1. Find branches with all items in stock
  const availableBranches = await filterByStock(branches, order.items);

  // 2. Find nearest branch to receiver
  const nearestBranch = findNearest(availableBranches, order.receiver.address);

  // 3. Select carrier for that zone
  const carrier = await selectCarrierForZone(
    nearestBranch.city,
    order.receiver.address.city,
    order.is_cod,
  );

  return { branch: nearestBranch, carrier };
}
```

---

## Multi-Carrier Integration Pattern

```ts
interface CarrierAdapter {
  createShipment(params: ShipmentParams): Promise<ShipmentResult>;
  getLabel(shipmentId: string): Promise<string>; // returns label URL
  track(trackingNumber: string): Promise<TrackingStatus>;
  voidShipment(shipmentId: string): Promise<void>;
}

// Register adapters
const carriers: Record<string, CarrierAdapter> = {
  aramex: new AramexAdapter(),
  smsa: new SmsaAdapter(),
  dhl: new DhlAdapter(),
  naqel: new NaqelAdapter(),
};

// Use in fulfillment handler
const adapter = carriers[assignment.carrier];
const result = await adapter.createShipment(params);
```

---

## Shipment / Order Status Updates

A single endpoint — **Update Shipment Details** (`PUT /shipments/{id}`,
https://docs.salla.dev/api-5578810) — updates both the shipment and the order status as
fulfillment progresses. `shipment_number` and `status` are **required**:

```http
PUT https://api.salla.dev/admin/v2/shipments/{shipment_id}
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "shipment_number": "846984645",
  "tracking_number": "4324233",
  "tracking_link": "https://carrier.com/track/4324233",
  "cost": 25.5,
  "status": "shipped"
}
```

**Available `status` values** (https://docs.salla.dev/422994m0.md): `created`, `shipped`,
`delivering`, `delivered`, `in_progress`, `cancelled`. **Exception:** once `shipped`,
`delivering`, or `delivered`, the status cannot move back to `created` or `in_progress`.
(`GET /shipments?status=` accepts a wider read-only enum — see api-endpoints.md.)

---

## Webhook Handler for Fulfillment

> Verify `X-Salla-Signature` (raw body) and dedupe by event id for **idempotency** before
> doing work — these belong to **`salla-webhooks`**. The async events below are **fast-ack**:
> acknowledge with `200` **first**, then enqueue the carrier/assignment work in a durable
> queue/background job with retries and failure recording — never `await` carrier or API
> calls after sending the response. `shipment.created`/`shipment.cancelled` are the async
> events a fulfilment app receives back; `shipment.creating` / `shipment.cancelling` (5s
> sync App Functions, not webhooks) run on the Shipping App side (shipment-cycle.md) — see
> **`salla-app-functions`**.

```ts
app.post("/webhook", verifySignature, async (req, res) => {
  const { event, data } = req.body;

  // Fast-ack: respond first, then queue — no awaited work after res.send
  res.status(200).send("OK");

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

## Resources

| Topic                          | Link                               |
| ------------------------------ | ---------------------------------- |
| Order Fulfillment App overview | https://docs.salla.dev/423001m0.md |
| Fulfillment App Cycle          | https://docs.salla.dev/423000m0.md |
| List of Shipping API           | https://docs.salla.dev/api-5578809 |
| List Shipping Apps (companies) | https://docs.salla.dev/api-5394239 |
| Setup Fulfillment App          | https://docs.salla.dev/423002m0.md |
| Test Fulfillment App           | https://docs.salla.dev/423003m0.md |
