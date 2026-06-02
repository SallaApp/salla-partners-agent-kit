---
name: salla-shipping-app
description: >
  Use this skill whenever building, configuring, or debugging a Salla Shipping App or Order
  Fulfillment App — including creating the app on the Partners Portal, handling shipment
  webhooks, configuring shipping zones and settings, generating labels, setting tracking IDs,
  and publishing. Invoke it for tasks like "create a shipping app", "handle shipment webhook",
  "set up shipping zones", "generate a label", "set tracking ID", "configure fulfillment",
  or "publish my shipping app".
license: Copyright (c) 2026 Salla
metadata:
  authors: Ilyas
  version: 1.0
---

# Salla Shipping App

A Shipping App integrates a third-party carrier or fulfillment provider with Salla stores. It must be a **Public** app — Shipping Apps cannot be Private.

## App Types

| Type | Purpose |
| --- | --- |
| **Shipping App** | Provides carrier rates, creates labels, tracks shipments |
| **Order Fulfillment App** | Manages multi-carrier order dispatch, parcel assignment across branches |

---

## End-to-End Workflow

### Step 1 — Create the App on the Partners Portal

1. Log in to [portal.salla.partners](https://portal.salla.partners/)
2. Go to **My Apps → Create App**
3. Choose **Public** (required for Shipping Apps)
4. Set **Category** to `Shipping App`
5. Fill in basic information (icon 250×250px, name in EN+AR, description, website, support email)
6. Click **Create App**

Full walkthrough: https://docs.salla.dev/doc-422995

---

### Step 2 — Configure OAuth & App Keys

- Copy your **Client ID** and **Client Secret**
- Choose `Easy Mode` (recommended — token delivered via webhook) or `Custom Mode` (your own callback)
- Set required OAuth **Scopes** for shipping and order access

For OAuth patterns, see [OAuth reference](../salla-app-builder/references/oauth.md).

---

### Step 3 — Configure Shipping Settings in the Portal

In the App Details page, under **Setup Shipping App**:

- Set your **Shipping Settings URL** — Salla loads this in the merchant's dashboard to collect carrier credentials (API key, account number, etc.)
- Define **Shipping Zones** — regions and countries your carrier covers
- Set supported **Package Types** and weight/dimension limits
- Configure **Cash on Delivery (COD)** support if applicable

Full setup guide: https://docs.salla.dev/doc-422996

---

### Step 4 — Handle Shipment Webhooks

Register your **Webhook URL** and subscribe to shipping-related store events. Key events in the shipment lifecycle:

| Event | Trigger |
| --- | --- |
| `order.created` | New order placed — evaluate if shipment is needed |
| `shipping.shipment.creating` | Merchant initiates shipment — respond with available rates |
| `shipping.shipment.created` | Shipment confirmed — create label with the carrier |
| `shipping.shipment.cancelled` | Merchant cancels — notify carrier and void label |
| `shipping.shipment.return.created` | Return initiated — create reverse shipment |

Verify every incoming webhook using HMAC-SHA256 with your Webhook Secret.

For signature verification, see [Webhooks reference](../salla-app-builder/references/webhooks.md).

---

### Step 5 — Implement the Shipping App Cycle

The shipment lifecycle your app must handle:

```
Order Created
    ↓
Merchant requests shipment → your app returns available rates
    ↓
Merchant selects rate → your app creates the shipment with the carrier
    ↓
Generate Label → return label URL to Salla
    ↓
Set Tracking ID → Salla links tracking to the order
    ↓
[If cancelled] → Void label, notify carrier
[If returned]  → Create reverse shipment
```

Key API actions:

```http
# Create shipment label
POST https://api.salla.dev/admin/v2/shipping/shipments/{shipment_id}/label

# Set tracking ID
PUT https://api.salla.dev/admin/v2/shipping/shipments/{shipment_id}/tracking
{ "tracking_number": "1Z999AA10123456784" }
```

Full lifecycle reference: https://docs.salla.dev/doc-422994
Full API endpoint list: https://docs.salla.dev/api-5578809

---

### Step 6 — Order Fulfillment (if applicable)

If your app manages order fulfillment across multiple carriers or branches:

1. Register as an **Order Fulfillment App** (separate app type in the portal)
2. Handle order assignment across carriers per zone/weight rules
3. Manage parcel dispatch, status updates, and multi-branch inventory

Fulfillment cycle: https://docs.salla.dev/doc-423000
Setup guide: https://docs.salla.dev/doc-423002

---

### Step 7 — Test with a Demo Store

Use **App Testing** in the Partners Portal to connect a demo store. Simulate:

- New order creation
- Shipment rate requests
- Label generation
- Tracking ID assignment
- Cancellation and returns

Test guide: https://docs.salla.dev/doc-422998

---

### Step 8 — Publish

Click **Start Publishing your App** and complete all publishing sections. Once approved, your app appears in the [Salla Apps Marketplace](https://apps.salla.sa/en) under the Shipping category.

Publishing guide: https://docs.salla.dev/doc-422990

---

## When to read the reference files

- [Shipping API Overview](references/shipping-api-overview.md) — full documentation map, Postman collection link, API endpoint index, and support channels.
- [Shipment Cycle](references/shipment-cycle.md) — full lifecycle diagram, exact webhook payloads and response shapes for `shipping.shipment.creating` (rate request), `shipping.shipment.created` (label creation), cancellation, and returns — with a complete webhook handler template.
- [Fulfillment Cycle](references/fulfillment-cycle.md) — Order Fulfillment App lifecycle, branch management (list, assign), multi-carrier adapter pattern, carrier routing logic, order status update codes, and a webhook handler template for fulfillment.
- [API Endpoints](references/api-endpoints.md) — organized endpoint cheatsheet for shipments (create, label, tracking, return), orders (status update, branch assign), branches, and app settings — with request bodies, status value table, response envelope shape, and error format.

## Resources

| Topic | Link |
| --- | --- |
| Shipping API Reference | https://docs.salla.dev/api-5578809 |
| Shipping App Cycle | https://docs.salla.dev/doc-422994 |
| Setup Shipping App | https://docs.salla.dev/doc-422996 |
| Order Fulfillment Cycle | https://docs.salla.dev/doc-423000 |
| Publish Apps | https://docs.salla.dev/doc-422990 |
| Postman Collection | https://www.postman.com/salla-app/workspace/salla-e-commerce-platform/collection/17687195-d700cd60-adf3-4b20-82ee-94851e88bd44 |
| Developer Community | https://t.me/salladev |
