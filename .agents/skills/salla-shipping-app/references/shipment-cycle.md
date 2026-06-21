# Shipping App Cycle — Detailed Reference

The complete lifecycle of a shipment, split into the **synchronous App Functions** that
shape the operation and the **async events** that report it, with the API calls at each
step. Source of truth: https://docs.salla.dev/1726835m0.md (Shipment Events — the App
Function model), https://docs.salla.dev/422988m0.md, https://docs.salla.dev/422994m0.md.

> **App Function mechanics → `salla-app-functions` family** (sandbox, locked template,
> save/validate/test, 5-second sync budget with each internal async call < 2s, the
> pre-authenticated Admin API, and the `Shipment`/`Resp` builders). This reference owns the
> **shipping specifics**: the Shipment context object, what to compute in the handler, and
> the partner-initiated REST calls.

> **Security & ownership (route, don't duplicate):** token storage/refresh →
> **`salla-app-auth`**; signature verification, idempotency, and fast-200 transport for the
> **async events** → **`salla-webhooks`**. Payloads carry PII (names, phones, addresses) and
> labels — do not log them.

---

## Full Lifecycle Diagram

```text
Merchant receives order
        ↓
Order status → "completed", OR merchant clicks "Generate Policy"
        ↓
Salla runs the App Function: shipment.creating (sync, type: "shipment")
   ← YOUR HANDLER CREATES THE SHIPMENT WITH THE CARRIER AND RETURNS A Shipment
        ↓
Async event shipment.created fires; you push tracking/label/cost/status with PUT /shipments/{id}
        ↓
Carrier picks up → in transit → delivered  (push each via PUT /shipments/{id};
                                             shipment.updated fires after each change)
        ↓
[If returned]   Order status → "restoring"/"restored", OR "Generate Return Policy"
                → shipment.creating (sync, type: "return")  ← HANDLER CREATES REVERSE SHIPMENT
[If cancelled]  shipment.cancelling (sync App Function)  ← YOUR HANDLER VOIDS THE LABEL
                → then async shipment.cancelled
```

> **Two sync App Functions, three async events.** `shipment.creating` and
> `shipment.cancelling` are **synchronous App Functions** (`merchant_actions`) — they run
> before the operation and **return a `Shipment`** to shape it. `shipment.created`,
> `shipment.cancelled`, and `shipment.updated` are **async events** (`merchant_events`).
> `shipment.creating` fires for both new shipments and returns — distinguish them by the
> payload's `type` field (`"shipment"` vs `"return"`). Confirm trigger names/categories with
> `salla_functions action=list_triggers`; subscribe the async events with
> `salla_events action=subscribe` (it **replaces** the full list, so include every event you
> want active).

---

## Step 1 — `shipment.creating` (Synchronous App Function)

`shipment.creating` is a **synchronous App Function** in the `merchant_actions` category. It
runs **before** the shipment is created, can modify the data, and **returns a `Shipment`**.
Salla enforces a **5-second** total budget (each internal async call < 2s) — keep it fast;
budget mechanics are owned by **`salla-app-functions`**.

### Shipment context object

The handler receives `context: Shipments`; `context.payload.data` is the **Shipment** object
(names/phones/addresses are placeholders — treat real values as PII; never log addresses,
phones, labels, or tokens):

```json
{
  "payload": {
    "event": "shipment.creating",
    "merchant": 136409261,
    "created_at": "Sun Jan 29 2023 21:16:38 GMT+0300",
    "data": {
      "id": 362985662,
      "order_id": 560695738,
      "order_reference_id": 48927,
      "reference": {
        "external_id": "34567898",
        "external_additional_id": "OM656545543"
      },
      "type": "shipment",
      "courier_id": 1927161457,
      "courier_name": "Shipping App",
      "courier_logo": "https://company.com/logo.png",
      "shipping_number": "846984645",
      "tracking_number": "4324233",
      "pickup_id": null,
      "trackable": true,
      "tracking_link": "https://www.company/tracking?tracking-id=12345",
      "label": { "format": "pdf", "url": "https://company.com/lable.pdf" },
      "payment_method": "cod",
      "source": "api",
      "status": "delivered",
      "total": { "amount": 25.5, "currency": "SAR" },
      "cash_on_delivery": { "amount": 10.7, "currency": "SAR" },
      "is_international": false,
      "total_weight": { "value": 5, "units": "kg" },
      "billing_account": "merchant",
      "description": "Fashion Apparel - 3 T-Shirts",
      "remarks": "Customer requested delivery after 5 PM",
      "shipping_route": { "id": 1867988940, "name": "Default Route" },
      "service_types": ["international", "normal", "fulfillment"],
      "packages": [
        {
          "item_id": 2077288690,
          "external_id": null,
          "name": "منتج تجريبي",
          "sku": "6ytrrhrhr",
          "price": { "amount": 25.5, "currency": "SAR" },
          "quantity": 1,
          "weight": { "value": 5, "unit": "kg" }
        }
      ],
      "ship_from": {
        "type": "branch",
        "name": "الفرع الرئيسي",
        "phone": "966920034002",
        "country": "السعودية",
        "city": "Mecca",
        "branch_id": 1987977866
      },
      "ship_to": {
        "type": "address",
        "name": "Username",
        "phone": "966501806978",
        "country": "السعودية",
        "city": "الرياض",
        "postal_code": "95128"
      },
      "meta": { "app_id": 1222362158, "policy_options": { "boxes": 1 } }
    }
  },
  "settings": {},
  "merchant": { "id": 136409261 }
}
```

A return looks identical but with `"type": "return"`.

### Handler — create with the carrier and return a `Shipment`

The handler signature is `export default async (context: Shipments): Promise<Shipment>`.
`setShipmentNumber()` is **required** to identify the shipment; use `Shipment.error()` to
fail the operation. Other setters (e.g. `setLabel`, tracking) are available.

```ts
export default async (context: Shipments): Promise<Shipment> => {
  const { payload, settings, merchant } = context;
  const { data: shipment } = payload; // the Shipment context object above

  // Carrier API call. Pre-authenticated Admin API needs no Authorization header
  // (→ salla-app-functions). Keep each internal async call < 2s.
  const labelRequest = {
    shipment_id: shipment.id,
    order_id: shipment.order_id,
    origin_address: shipment.ship_from,
    shipping_address: shipment.ship_to,
    label_options: { format: settings.label_format, size: settings.label_size },
  };
  const response = await fetch("https://api.mock.com/label/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(labelRequest),
  });
  const result = await response.json();

  return Shipment.success()
    .setShipmentNumber(shipment.id)
    .setLabel(result.label_url);
};
```

If a carrier is unavailable, return `Shipment.error()` so Salla surfaces it to the merchant
rather than throwing.

> **Returns** reuse `shipment.creating` with `type: "return"` (order status → `restoring` /
> `restored`, or **Generate Return Policy**). Create the reverse shipment (sender ↔ receiver
> are effectively swapped by Salla in the payload) and return the return's `Shipment`.

---

## Step 2 — `shipment.cancelling` (Synchronous App Function)

`shipment.cancelling` is the **second synchronous App Function** (`merchant_actions`,
confirmed via `salla_functions action=list_triggers`). It runs **before** a shipment or
return is cancelled, so you can void the label / stop pickup and **return a `Shipment`** (or
`Shipment.error()` to block the cancellation). Same `context: Shipments` shape and 5-second
budget as `shipment.creating`.

```ts
export default async (context: Shipments): Promise<Shipment> => {
  const { data: shipment } = context.payload; // type: "shipment" | "return"

  await voidWithCarrier(shipment.shipping_number); // carrier void / stop pickup

  return Shipment.success().setShipmentNumber(shipment.id);
};
```

---

## Step 3 — Async events and pushing results back

`shipment.created`, `shipment.cancelled`, and `shipment.updated` are **async events**
(`merchant_events`) delivered as ordinary store webhooks — subscribe them with
`salla_events action=subscribe`. Handle them fast-ack + idempotent (→ **`salla-webhooks`**).

After the carrier confirms a shipment, push tracking, label, cost, and status with a single
**Update Shipment Details** call — a partner-initiated REST call using the stored merchant
`access_token` (token storage/refresh → **`salla-app-auth`**), separate from the App
Function flow (https://docs.salla.dev/api-5578810):

```http
PUT https://api.salla.dev/admin/v2/shipments/{shipment_id}
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "shipment_number": "846984645",
  "tracking_number": "4324233",
  "tracking_link": "https://carrier.com/track/4324233",
  "label": { "format": "pdf", "url": "https://carrier.com/labels/SHP-001.pdf" },
  "cost": 25.5,
  "status": "shipped"
}
```

> `shipment_number` and `status` are **required** and must match the value used in the
> first update. Include VAT in `cost` — it is the actual shipping cost the merchant is
> charged. There is no separate `/label` or `/tracking` sub-resource; this one endpoint
> carries all of it.

**Available `status` values** (https://docs.salla.dev/422994m0.md): `created`, `shipped`,
`delivering`, `delivered`, `in_progress`, `cancelled`. **Exception:** once a shipment is
`shipped`, `delivering`, or `delivered`, it cannot move back to `created` or `in_progress`.

---

## Step 4 — Test via the App Function MCP preview

The sync App Functions are tested with the **App Function MCP preview**, not a webhook
endpoint or preview URL (owned by **`salla-app-functions-test`**):

1. Install your app on a demo store and create a shipment for an order.
2. `salla_functions action=save` the function, then poll
   `salla_functions action=deploy_status` until `COMPLETED`.
3. `salla_functions action=preview` with `app_id`, `trigger` (`shipment.creating` /
   `shipment.cancelling`), the demo `store_id`, and the trigger's form fields (a real
   `shipment_id`) — inspect the returned `Shipment`.

---

## Resources

| Topic                           | Link                                |
| ------------------------------- | ----------------------------------- |
| Shipment Events (App Functions) | https://docs.salla.dev/1726835m0.md |
| Shipping API getting started    | https://docs.salla.dev/422988m0.md  |
| Shipping App Cycle guide        | https://docs.salla.dev/422994m0.md  |
| List of Shipping API            | https://docs.salla.dev/api-5578809  |
| Update Shipment Details         | https://docs.salla.dev/api-5578810  |
