---
name: salla-shipping-app
description: >
  Use when building, configuring, or debugging a Salla Shipping App or Order
  Fulfillment App — creating the app, configuring shipping zones and settings,
  subscribing to shipment webhooks, generating labels, setting tracking IDs, managing
  cancellations and returns, or publishing.
---

# Salla Shipping App Flow

Build a Shipping App or Order Fulfillment App by **performing the actions** with the
Salla Partners MCP tools. Follow the steps in order — complete each gate before moving on.

> **Shipping Apps must be Public** — Private apps are not supported for this category.

## Tools

| Tool | Action | What it does |
| --- | --- | --- |
| `salla_reference` | `categories` | Get the shipping `type` + `sub_category_id` |
| `salla_upload` | — | Upload the logo → file `id` |
| `salla_apps` | `create` / `connect` / `set_status` / `publish` | Create + configure OAuth/webhooks + publish |
| `salla_events` | `list` / `subscribe` | Subscribe to shipment events |
| `salla_shipping` | `get_zones` / `set_zones` / `set_settings` | Configure shipping zones + settings |

> **Prerequisite:** the Salla Partners MCP server must be connected. Carry the `app_id`
> through every step. If a tool returns "Salla session expired", re-run the login flow.

---

## Step 0 — Discover

Ask before starting:

1. **What type of app?**
   - **Shipping App** — provides carrier rates, creates labels, tracks shipments
   - **Order Fulfillment App** — manages multi-carrier dispatch across branches
2. **Which carrier or provider are you integrating?**
3. **Do you support Cash on Delivery (COD)?**
4. **Which regions / shipping zones does your carrier cover?**

---

## Step 1 — Create the App

1. Resolve the category: `salla_reference action=categories` → the shipping `type` and
   its `sub_category_id`.
2. Upload the logo: `salla_upload` (square 1:1, ≥ 250×250 px) → file `id`.
3. Create it: `salla_apps action=create` with `type` = shipping, `sub_category_id`,
   `name`, `short_description` (50–200), `app_url`, `email`, `logo`. Shipping apps are
   public — do **not** use `type: "private"`.

The result returns the `app_id`.

**Manual fallback:** Portal → **My Apps → Create App** (Public, category Shipping App).
Full walkthrough: https://docs.salla.dev/doc-422995

**Gate:** "App created — confirm the `app_id` (`salla_apps action=get`)."

---

## Step 2 — OAuth, Scopes & Webhook Connection

Configure OAuth + webhooks in one `salla_apps action=connect` call (see
`salla_reference action=scopes` for available scope slugs):

- `scopes` — shipping + order access (`slug → "read" | "read_write"`)
- `redirect_urls`, `webhook_url`, `webhook_security_strategy: "signature"`
- `generate_secret: true` — returns the webhook secret (store it for HMAC verification)

OAuth patterns → [`references/shipping-api-overview.md`](references/shipping-api-overview.md)

**Gate:** "Connect applied with no `_partial`. Is your webhook URL live and returning 200?"

---

## Step 3 — Configure Shipping Zones & Settings

Use `salla_shipping` instead of the Portal form:

1. Inspect current zones: `salla_shipping action=get_zones`, `app_id`.
2. Set zones (regions/countries your carrier covers, package types, COD):
   `salla_shipping action=set_zones`, `app_id`, `shipping: {…zones payload…}`.
3. Set carrier settings: `salla_shipping action=set_settings`, `app_id`, `setting_id`,
   `company_types`, `support_change_name`, `service_type_ids`.

You still set a **Shipping Settings URL** in the Portal — the page Salla loads in the
merchant dashboard to collect carrier credentials (API key, account number).

Setup guide: https://docs.salla.dev/doc-422996

**Gate:** "`salla_shipping action=get_zones` reflects your zones, and a demo-store
merchant can enter carrier credentials on your Shipping Settings page."

---

## Step 4 — Handle the Shipment Lifecycle

Subscribe with `salla_events action=subscribe` (call `action=list` first for valid
slugs), then implement each handler in your webhook receiver:

| Event | What your app must do |
| --- | --- |
| `shipping.shipment.creating` | Return available rates for the merchant to choose |
| `shipping.shipment.created` | Create the label with your carrier; return the label URL |
| `shipping.shipment.cancelled` | Void the label and notify the carrier |
| `shipping.shipment.return.created` | Create a reverse shipment |

Runtime API calls (merchant `access_token`, no MCP tool):

```http
# Set label URL after creating it with your carrier
POST https://api.salla.dev/admin/v2/shipping/shipments/{shipment_id}/label

# Set tracking ID
PUT https://api.salla.dev/admin/v2/shipping/shipments/{shipment_id}/tracking
{ "tracking_number": "1Z999AA10123456784" }
```

Full webhook payloads and response shapes →
[`references/shipment-cycle.md`](references/shipment-cycle.md)

**Gate:** "Simulate a full shipment in the demo store: rate request → label → tracking →
confirm tracking ID appears on the order."

---

## Step 5 — Order Fulfillment (if applicable)

If your app type from Step 0 is **Order Fulfillment App**:

1. Create it under the **Order Fulfillment** category (`salla_reference action=categories`
   → matching `sub_category_id`).
2. Handle order assignment across carriers by zone/weight rules.
3. Manage branch inventory, parcel dispatch, and status updates.

Fulfillment lifecycle → [`references/fulfillment-cycle.md`](references/fulfillment-cycle.md)
Setup guide: https://docs.salla.dev/doc-423002

---

## Step 6 — Test & Publish

**Testing:** Connect a demo store via **App Testing** and simulate: new order → rate
request → label → tracking → cancellation → return.

**Publishing:** `salla_apps action=publish`, `app_id` (optional `update_note`). Complete
the publishing sections in the Portal. Once approved, your app is listed at
https://apps.salla.sa/en under Shipping.

Test guide: https://docs.salla.dev/doc-422998 ·
Publishing guide: https://docs.salla.dev/doc-422990

**Gate:** "Published — `salla_apps action=get` shows the expected status."

---

## Resources

| Topic | Link |
| --- | --- |
| Shipping API Reference | https://docs.salla.dev/api-5578809 |
| Shipping App Cycle | https://docs.salla.dev/doc-422994 |
| Setup Shipping App | https://docs.salla.dev/doc-422996 |
| Order Fulfillment Cycle | https://docs.salla.dev/doc-423000 |
| Postman Collection | https://www.postman.com/salla-app/workspace/salla-e-commerce-platform/collection/17687195-d700cd60-adf3-4b20-82ee-94851e88bd44 |
| Developer Community | https://t.me/salladev |
