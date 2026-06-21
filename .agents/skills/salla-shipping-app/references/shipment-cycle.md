# Shipping Management (AWB) Cycle — Detailed Reference

The shipment lifecycle for a **Shipping Management / Salla AWB** app: the two **synchronous
App Functions** that generate and void the AWB, the **`Shipment` builder** they return, the
**three AWB processing flows**, and the async events that report progress. Source of truth:
the Salla AWB docs (https://docs.salla.dev/1792089m0.md,
https://docs.salla.dev/1792119m0.md, https://docs.salla.dev/1797616m0.md, the
`awb-gen-*` flow guides) and the Shipping App Cycle (https://docs.salla.dev/422994m0.md).
Order Fulfilment apps have a different cycle → `fulfillment-cycle.md`. The Salla AWB
"no-backend" model (App Functions inside Salla Partners, native presence in the AWB creation
screen) is described in the parent `SKILL.md`.

> **App Function runtime mechanics → `salla-app-functions` family** (V8 sandbox, locked
> template / first-line rule, save/validate/test, the 5-second sync budget with each internal
> async call < 2s, the pre-authenticated Admin API, and how the `Shipment`/`Resp` builders
> are injected). This reference owns the **shipping specifics**: the `Shipment` builder
> shipping methods, the `Shipments` context shape, the AWB flows, and the partner-initiated
> REST update (whose endpoint shape lives in `api-endpoints.md`).

> **Security & ownership (route, don't duplicate):** token storage/refresh →
> **`salla-app-auth`**; signature verification, idempotency, and fast-200 transport for the
> **async events** → **`salla-webhooks`**; merchant settings schema → **`salla-app-settings`**.
> Payloads carry PII (names, phones, addresses) and labels — do not log them.

---

## Triggers (MCP-confirmed)

`salla_functions action=list_triggers` confirms these exact triggers and categories:

| Trigger               | Category           | Kind              | Return type         |
| --------------------- | ------------------ | ----------------- | ------------------- |
| `shipment.creating`   | `merchant_actions` | sync App Function | `Promise<Shipment>` |
| `shipment.cancelling` | `merchant_actions` | sync App Function | `Promise<Resp>`     |
| `shipment.created`    | `merchant_events`  | async event       | —                   |
| `shipment.cancelled`  | `merchant_events`  | async event       | —                   |
| `shipment.updated`    | `merchant_events`  | async event       | —                   |

> **The sync cancel function is `shipment.cancelling`, not `shipment.cancelled`.** The AWB
> docs label the function screen "Shipment Cancelled" (https://docs.salla.dev/1797616m0.md),
> but the trigger you `save` against is the `merchant_actions` trigger **`shipment.cancelling`**,
> which returns a **`Resp`** (not a `Shipment`). `shipment.cancelled` is the separate async
> `merchant_events` notification. Always reconcile names with `salla_functions action=list_triggers`.

---

## Full Lifecycle Diagram

```text
Merchant: Orders → order status "completed", OR "Create shipping label" / "Create return label"
        ↓
Salla runs the App Function: shipment.creating (sync; payload type "shipment" or "return")
   ← YOUR HANDLER CALLS THE CARRIER AWB API AND RETURNS A Shipment (number + PDF label + status)
        ↓
Salla updates the order with the AWB; async shipment.created fires
        ↓
Carrier moves the parcel → push real cost/status out-of-band via PUT /shipments/{id}
                           (shipment.updated fires after each change)
        ↓
[Return]  "Create return label"  → shipment.creating (sync, type "return") ← REVERSE AWB
[Cancel]  "Cancel shipment"      → shipment.cancelling (sync, returns Resp) ← VOID WITH CARRIER
                                   → then async shipment.cancelled
```

---

## The `Shipment` builder (shipping methods)

`shipment.creating` returns a `Shipment` built with these setters (from the injected
`salla-functions-sdk` types). `setShipmentNumber()` is **required**; the rest are optional and
shape the AWB shown to the merchant:

| Method                            | Purpose                                                             |
| --------------------------------- | ------------------------------------------------------------------- |
| `setShipmentNumber(id)`           | **Required** — the AWB / shipment number that identifies the parcel |
| `setPdfLabel(url)`                | URL of the generated AWB PDF label                                  |
| `setTrackingNumber(num)`          | Carrier tracking number                                             |
| `setTrackingLink(url)`            | Public tracking URL                                                 |
| `setStatus(ShipmentStatusEnum.…)` | Shipment status (enum below)                                        |
| `setStatusNote(text)`             | Human-readable status note (e.g. "Your package is on the way!")     |
| `setCost(amount)`                 | Actual shipping cost (include VAT) charged to the merchant          |

Static: `Shipment.success()` starts a success builder; `Shipment.error("message")` fails the
operation so Salla surfaces it to the merchant (use it when the carrier is unavailable rather
than throwing). For `shipment.cancelling`, return the generic builder: `Resp.success().setData({})`.

**`ShipmentStatusEnum`** values: `IN_PROGRESS`, `IN_TRANSIT`, `RECEIVED_AT_FINAL_HUB`,
`TO_BE_REATTEMPTED`, `REATTEMPTED`, `UNABLE_TO_DELIVER`, `DELIVERING`, `DELIVERED`,
`PARTIALLY_DELIVERED`, `SHIPPED`, `CANCELLED`, `LOST`, `DAMAGED`, `RETURN_TO_ORIGIN`,
`RETURN_IN_PROGRESS`.

---

## `shipment.creating` (sync App Function)

Runs **before** a shipment or return is created, calls your carrier API, and **returns a
`Shipment`**. One function handles **both** new shipments (`type: "shipment"`) and returns
(`type: "return"`) (https://docs.salla.dev/1792119m0.md). 5-second total budget (each
internal async call < 2s; budget mechanics → **`salla-app-functions`**).

### `Shipments` context object

The handler receives `context: Shipments`; `context.payload.data` is the **Shipment** object
(treat names/phones/addresses/labels as PII — never log them):

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
      "service_types": ["international", "normal", "fulfillment"],
      "packages": [
        {
          "item_id": 2077288690,
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

A return is identical with `"type": "return"`. `context.settings` carries your app settings
(e.g. `label_format`, `label_size`, carrier `customer_id`); `context.merchant` is the store.

### Handler — generate the AWB and return a `Shipment`

First line is locked to the trigger template (`salla_functions action=get`). Edit only the body:

```ts
export default async (context: Shipments): Promise<Shipment> => {
  const { payload, settings, merchant } = context;
  const { data: shipment } = payload; // type: "shipment" | "return"

  // Call the shipping company's third-party API to generate the AWB.
  const labelRequest = {
    shipment_id: shipment.id,
    order_id: shipment.order_id,
    tracking_number: shipment.tracking_number,
    origin_address: shipment.ship_from,
    shipping_address: shipment.ship_to,
    customer: { id: settings.customer_id },
    label_options: { format: settings.label_format, size: settings.label_size },
  };
  const response = await fetch("https://api.mock.com/label/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(labelRequest),
  });
  const result = await response.json();

  // setShipmentNumber() is REQUIRED. Return Shipment.error("…") on carrier failure.
  return Shipment.success()
    .setShipmentNumber(shipment.id)
    .setPdfLabel(result.label_url)
    .setStatus(ShipmentStatusEnum.IN_TRANSIT);
};
```

---

## `shipment.cancelling` (sync App Function)

The second `merchant_actions` trigger. Runs **before** a shipment/return is cancelled so you
can void the label / stop pickup with the carrier, then **return a `Resp`** (not a
`Shipment`). Return `Resp.error()` to decline — a carrier may reject cancellation if the
shipment is already dispatched or delivered (https://docs.salla.dev/1797616m0.md). Same
`context: Shipments` shape and 5-second budget as `shipment.creating`.

```ts
export default async (context: Shipments): Promise<Resp> => {
  // Cancel/void the shipment in the shipping company.
  await fetch("https://{SHIPMENT_COMPANY_BASE_URL}/{CANCEL_SHIPMENT}", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(context.payload.data),
  });

  return Resp.success().setData({});
};
```

---

## AWB Processing Flows

Three scenarios drive the App Functions (the `awb-gen-*` guides):

### 1. Shipment AWB (https://docs.salla.dev/1797625m0.md)

Standard new-shipment flow. Merchant creates an order, selects your app as the AWB courier
(**Shipping page → Couriers** lists registered AWB apps), then **Create shipping label** (or
the order status changes to `completed`). Salla calls `shipment.creating` (`type: "shipment"`);
your handler calls the carrier API, receives the **PDF label, tracking link, and tracking
number**, and maps them into the returned `Shipment`. On success the shipment appears on the
order; an error in the function code is surfaced on the merchant screen.

### 2. Shipment Return AWB (https://docs.salla.dev/1797627m0.md)

Reverse logistics. From an order that already has a label, the merchant picks **Create return
label** (or order status → `returned`). Salla calls the **same `shipment.creating`** function
with `type: "return"`; you generate the **return AWB** (label + tracking) with the carrier and
return the `Shipment`. Sender/receiver are effectively swapped by Salla in the return payload.

### 3. Shipment Cancelled AWB (https://docs.salla.dev/1797626m0.md)

Cancellation. From an order with a label, the merchant picks **Cancel shipment**. Salla calls
`shipment.cancelling`; you cancel/void with the carrier and update the status to cancelled.
The carrier may reject if the shipment is already dispatched/delivered — return `Resp.error()`
to decline.

---

## Async events and out-of-band updates

`shipment.created`, `shipment.cancelled`, and `shipment.updated` are **async events**
(`merchant_events`) delivered as ordinary store webhooks — subscribe with
`salla_events action=subscribe`, handle fast-ack + idempotent (→ **`salla-webhooks`**).

The App Function returns the AWB synchronously. For **out-of-band** updates after the carrier
confirms (real shipping cost, later status/tracking changes), push them with the
partner-initiated **Update Shipment Details** REST call (`PUT /shipments/{id}`, stored merchant
`access_token` — token storage/refresh → **`salla-app-auth`**). The endpoint shape, required
fields (`shipment_number` + `status`), and the writable status enum / transition rules live in
[`api-endpoints.md`](api-endpoints.md) — they are not restated here.

---

## Test via the App Function MCP preview

The sync App Functions are tested with the **App Function MCP preview**, not a webhook
endpoint or preview URL (owned by **`salla-app-functions-test`**):

1. Install the app on a demo store and create an order/shipment.
2. `salla_functions action=save` the function, then poll
   `salla_functions action=deploy_status` until `COMPLETED`.
3. `salla_functions action=preview` with `app_id`, the `trigger` (`shipment.creating` /
   `shipment.cancelling`), the demo `store_id`, and the trigger's form fields (a real
   `shipment_id`) — inspect the returned `Shipment` / `Resp`. Test `shipment.creating` for
   **both** `type: "shipment"` and `type: "return"`.

---

## Resources

| Topic                             | Link                                 |
| --------------------------------- | ------------------------------------ |
| Salla AWB — getting started       | https://docs.salla.dev/1792089m0.md  |
| AWB function — Shipment Creating  | https://docs.salla.dev/1792119m0.md  |
| AWB function — Shipment Cancelled | https://docs.salla.dev/1797616m0.md  |
| AWB flow — Shipment AWB           | https://docs.salla.dev/1797625m0.md  |
| AWB flow — Return AWB             | https://docs.salla.dev/1797627m0.md  |
| AWB flow — Cancelled AWB          | https://docs.salla.dev/1797626m0.md  |
| Shipping App Cycle guide          | https://docs.salla.dev/422994m0.md   |
| Shipping overview (both models)   | https://docs.salla.dev/422988m0.md   |
| Shipping REST endpoints           | [api-endpoints.md](api-endpoints.md) |
