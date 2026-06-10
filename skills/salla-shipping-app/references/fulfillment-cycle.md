# Order Fulfillment App Cycle — Detailed Reference

Order Fulfillment Apps manage dispatching orders across multiple carriers and branches, abstracting multi-carrier complexity from merchants.

---

## How It Differs from a Shipping App

| | Shipping App | Order Fulfillment App |
| --- | --- | --- |
| **Focus** | Single carrier integration | Multi-carrier, multi-branch dispatch |
| **Decision maker** | Merchant picks carrier | Your app auto-assigns best carrier |
| **Inventory** | Not managed | Managed across branches |
| **Complexity** | Lower | Higher |

---

## Fulfillment Lifecycle

```
Order created in Salla
        ↓
Salla fires: order.created
        ↓
Your app evaluates order:
  - Which branch has stock?
  - Which carrier serves the destination?
  - What's the cheapest/fastest option?
        ↓
Your app assigns the order to a branch + carrier
        ↓
Branch prepares the package
        ↓
Your app creates shipment with the carrier
        ↓
Label generated → tracking set → pickup scheduled
        ↓
Carrier delivers → your app updates order status
        ↓
[If return needed] → reverse logistics flow
```

---

## Key Events

| Event | Description | Your action |
| --- | --- | --- |
| `order.created` | New order placed | Evaluate, assign branch + carrier |
| `order.status.updated` | Status changed by merchant | Sync with carrier if relevant |
| `order.cancelled` | Order cancelled | Cancel shipment if already created |
| `shipping.shipment.creating` | Rate request (sync) | Return rates from assigned carrier |
| `shipping.shipment.created` | Confirmed — create label | Create label, set tracking |

---

## Branch Management

### List Branches

```http
GET https://api.salla.dev/admin/v2/store/branches
Authorization: Bearer {access_token}
```

```json
{
  "data": [
    {
      "id": 1,
      "name": { "en": "Riyadh Warehouse", "ar": "مستودع الرياض" },
      "city": "Riyadh",
      "country": "SA",
      "is_active": true
    },
    {
      "id": 2,
      "name": { "en": "Jeddah Branch", "ar": "فرع جدة" },
      "city": "Jeddah",
      "country": "SA",
      "is_active": true
    }
  ]
}
```

### Assign Order to Branch

```http
PUT https://api.salla.dev/admin/v2/orders/{order_id}/branch
Authorization: Bearer {access_token}
Content-Type: application/json

{ "branch_id": 2 }
```

---

## Carrier Assignment Logic

Implement routing rules based on your business model:

```ts
async function assignCarrier(order: Order, branches: Branch[]): Promise<Assignment> {
  // 1. Find branches with all items in stock
  const availableBranches = await filterByStock(branches, order.items);

  // 2. Find nearest branch to receiver
  const nearestBranch = findNearest(availableBranches, order.receiver.address);

  // 3. Select carrier for that zone
  const carrier = await selectCarrierForZone(
    nearestBranch.city,
    order.receiver.address.city,
    order.is_cod
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
  'aramex':  new AramexAdapter(),
  'smsa':    new SmsaAdapter(),
  'dhl':     new DhlAdapter(),
  'naqel':   new NaqelAdapter(),
};

// Use in fulfillment handler
const adapter = carriers[assignment.carrier];
const result = await adapter.createShipment(params);
```

---

## Order Status Updates

Keep Salla updated as the fulfillment progresses:

```http
PUT https://api.salla.dev/admin/v2/orders/{order_id}/status
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "status": "shipping",
  "tracking_number": "1Z999AA10123456784",
  "tracking_company": "SMSA Express",
  "note": "Dispatched from Riyadh warehouse via SMSA Express"
}
```

| Status value | Meaning |
| --- | --- |
| `pending` | Order received, not yet processed |
| `in_progress` | Being prepared at branch |
| `shipping` | Handed to carrier |
| `delivered` | Confirmed delivery |
| `cancelled` | Order cancelled |
| `returned` | Return received |

---

## Webhook Handler for Fulfillment

```ts
app.post('/webhook', verifySignature, async (req, res) => {
  const { event, data } = req.body;

  switch (event) {
    case 'order.created': {
      res.status(200).send('OK'); // acknowledge fast
      const assignment = await assignCarrier(data);
      await fulfillOrder(data, assignment);
      break;
    }
    case 'order.cancelled':
      res.status(200).send('OK');
      await cancelFulfillment(data.id);
      break;

    case 'shipping.shipment.creating': {
      const rates = await getRatesForOrder(data);
      return res.json({ success: true, data: { rates } });
    }
  }
});
```

---

## Resources

| Topic | Link |
| --- | --- |
| Order Fulfillment App overview | https://docs.salla.dev/doc-423001 |
| Fulfillment App Cycle | https://docs.salla.dev/doc-423000 |
| Setup Fulfillment App | https://docs.salla.dev/doc-423002 |
| Test Fulfillment App | https://docs.salla.dev/doc-423003 |
