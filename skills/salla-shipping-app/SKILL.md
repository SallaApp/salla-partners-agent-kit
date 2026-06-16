---
name: salla-shipping-app
description: >
  Build a Salla Shipping App or Order Fulfillment App: create it (shipping sub-category
  required), configure zones/settings via salla_shipping, handle the four default
  shipment webhooks (rates on creating, label on create, void on cancel, reverse on
  return) — shipment.creating is also an App Function trigger (preferred, salla-app-
  functions) — and set labels/tracking via the Shipping API. Use for any carrier, rate,
  label, tracking, COD, cancellation, or return task. Shipping Company ID is assigned
  only by Salla. Publish → salla-app-builder.
---

# Salla Shipping App Flow

Build a Shipping App or Order Fulfillment App by **performing the actions** with the
Salla Partners MCP tools. Follow the steps in order — complete each gate before moving on.

> **Shipping Apps must be Public** — Private apps are not supported for this category.

## Tools

| Tool              | Action                                          | What it does                                                          |
| ----------------- | ----------------------------------------------- | --------------------------------------------------------------------- |
| `salla_reference` | `categories`                                    | Get the shipping `type`; pick `sub_category_id` from `sub_categories` |
| `salla_upload`    | —                                               | Upload the logo → file `id`                                           |
| `salla_apps`      | `create` / `connect` / `set_status` / `publish` | Create + configure OAuth/webhooks + publish                           |
| `salla_events`    | `list` / `subscribe`                            | Subscribe to shipment events                                          |
| `salla_shipping`  | `get_zones` / `set_zones` / `set_settings`      | Configure shipping zones + settings                                   |

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

1. Resolve the category: `salla_reference action=categories type=shipping` → returns
   `main_categories` and `sub_categories`. The `sub_category_id` **must be a shipping
   sub-category** picked from `sub_categories` (45 / 46 / 54) — a non-shipping
   sub-category is rejected. (The `main_category_id` used at publish comes from
   `main_categories`.)
2. Upload the logo: `salla_upload` (square 1:1, ≥ 250×250 px) → file `id`.
3. Create it: `salla_apps action=create` with `type` = shipping, `sub_category_id`,
   `name`, `short_description` (50–200), `app_url`, `email`, `logo`. Shipping apps are
   public — do **not** use `type: "private"`.

The result returns the `app_id`.

> **Shipping Company ID:** assigned **only by Salla** (contact shipping-team@salla.sa).
> You cannot set it yourself, and publication is blocked until Salla sets it.

**Manual fallback:** Portal → **My Apps → Create App** (Public, category Shipping App).
Full walkthrough: https://docs.salla.dev/doc-422995

**Gate:** "App created — confirm the `app_id` (`salla_apps action=get`)."

---

## Step 2 — OAuth, Scopes & Webhook Connection

Configure OAuth + webhooks in one `salla_apps action=connect` call (read the valid scope
slugs from `salla_apps action=get` — there is no scope-catalog reference endpoint):

- `scopes` — shipping + order access (`slug → "read" | "read_write"`)
- `redirect_urls`, `webhook_url`, `webhook_security_strategy: "signature"`
- `generate_secret: true` — returns the webhook secret (store it for HMAC verification)

OAuth patterns → **`salla-app-auth`** skill.

**Gate:** "Connect applied with no `_partial`. Is your webhook URL live and returning 200?"

---

## Step 3 — Configure Shipping Zones & Settings

Use `salla_shipping` instead of the Portal form:

1. Inspect current zones: `salla_shipping action=get_zones`, `app_id`. **Note:** a newly
   created shipping app already has a pre-seeded default zone (All Countries → All Cities,
   fixed fee) — a non-empty response does not mean you've already configured it.
2. Set zones (regions/countries your carrier covers, package types, COD):
   `salla_shipping action=set_zones`, `app_id`, `shipping: {…zones payload…}`.
3. Set carrier settings: `salla_shipping action=set_settings`, `app_id`, `setting_id`,
   `company_types`, `support_change_name`, `service_type_ids`.
   > **Limitation:** on a brand-new shipping app `has_shipping_settings` is `false`
   > and `set_settings` returns **404** because the `setting_id` does not exist yet
   > and is **not discoverable via the MCP** (`get_zones` returns a zone id, not the
   > setting id). The settings record is created through the Portal's shipping
   > onboarding flow; retrieve the `setting_id` from there before calling
   > `set_settings`.

You still set a **Shipping Settings URL** in the Portal — the page Salla loads in the
merchant dashboard to collect carrier credentials (API key, account number).

Setup guide: https://docs.salla.dev/doc-422996

**Gate:** "`salla_shipping action=get_zones` reflects your zones, and a demo-store
merchant can enter carrier credentials on your Shipping Settings page."

---

## Step 4 — Handle the Shipment Lifecycle

Shipping apps get **four shipment webhooks by default** — do not subscribe them again.
Use `salla_events action=list` to look up the exact event slugs (it returns the available
event catalog, not your current subscriptions), then implement each handler in your
webhook receiver:

| Event                             | What your app must do                              |
| --------------------------------- | -------------------------------------------------- |
| `order.shipment.creating`         | Return available rates for the merchant to choose  |
| `order.shipment.cancelled`        | Void the label and notify the carrier              |
| `order.shipment.return.creating`  | Create a reverse shipment                          |
| `order.shipment.return.cancelled` | Void the reverse shipment / stop the return pickup |

> There is **no `.created` event** — after the merchant confirms, attach the label and
> tracking via the Shipping API calls below.

> **Prefer an App Function for rates:** `shipment.creating` is a **synchronous App
> Function trigger** — the rate-responder can be an App Function instead of a webhook
> (see **`salla-app-functions`**).

Runtime API calls (merchant `access_token`, no MCP tool):

```http
# Set label URL after creating it with your carrier
POST https://api.salla.dev/admin/v2/shipping/shipments/{shipment_id}/label

# Set tracking ID
PUT https://api.salla.dev/admin/v2/shipping/shipments/{shipment_id}/tracking
{ "tracking_number": "1Z999AA10123456784" }
```

Full webhook payloads and response shapes →
[`references/shipment-cycle.md`](references/shipment-cycle.md); the Shipping API
endpoints (labels, tracking, status) →
[`references/api-endpoints.md`](references/api-endpoints.md)

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
the publishing sections in the Portal. Two shipping-specific blockers:

- The `sub_category_id` must be a shipping sub-category from `sub_categories`
  (`salla_reference action=categories type=shipping`).
- The **Shipping Company ID** must already be assigned by Salla
  (shipping-team@salla.sa) — publication is blocked until it is set.

Once approved, your app is listed at https://apps.salla.sa/en under Shipping.

Test guide: https://docs.salla.dev/doc-422998 ·
Publishing guide: https://docs.salla.dev/doc-422990

**Gate:** "Published — `salla_apps action=get` shows the expected status."

---

## Resources

| Topic                        | Link                                                                                                                           |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Shipping API Reference       | https://docs.salla.dev/api-5578809                                                                                             |
| Shipping App Cycle           | https://docs.salla.dev/doc-422994                                                                                              |
| Create Shipping App          | https://docs.salla.dev/doc-422995                                                                                              |
| Setup Shipping App           | https://docs.salla.dev/doc-422996                                                                                              |
| Shipping API Migration Guide | https://docs.salla.dev/doc-422989                                                                                              |
| Shipping API Change Log      | https://docs.salla.dev/doc-422992                                                                                              |
| New Order Fulfillment App    | https://docs.salla.dev/doc-423001                                                                                              |
| Order Fulfillment Cycle      | https://docs.salla.dev/doc-423000                                                                                              |
| Test Order Fulfillment App   | https://docs.salla.dev/doc-423003                                                                                              |
| Postman Collection           | https://www.postman.com/salla-app/workspace/salla-e-commerce-platform/collection/17687195-d700cd60-adf3-4b20-82ee-94851e88bd44 |
| Developer Community          | https://t.me/salladev                                                                                                          |
