---
name: salla-shipping-app
description: >
  Build a Salla Shipping or Order Fulfillment App: create it (shipping sub-category),
  configure zones/settings via salla_shipping, implement the synchronous App Functions
  shipment.creating and shipment.cancelling (they return a Shipment to shape the
  operation), subscribe the async shipment events (created/cancelled/updated), then set
  tracking, label, cost, and status via PUT /shipments/{id}. Use for any carrier, rate,
  label, tracking, COD, cancellation, or return task. App Function mechanics →
  salla-app-functions; Token/OAuth → salla-app-auth; webhook verification → salla-webhooks;
  publish → salla-app-builder.
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
| `salla_events`    | `list` / `subscribe`                            | Subscribe to the async shipment events                                |
| `salla_functions` | `list_triggers` / `save` / `preview`            | Implement + test the sync shipment App Functions                      |
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
   sub-category** picked from `sub_categories` — a non-shipping sub-category is rejected.
   (Currently Fulfillment / Other / Drop-shipping = ids `45 / 46 / 54`; these ids are
   illustrative — always read the live values from `salla_reference action=categories`
   rather than hard-coding them. The `main_category_id` used at publish comes from
   `main_categories`.)
2. Upload the logo: `salla_upload` (square 1:1, ≥ 250×250 px) → file `id`.
3. Create it: `salla_apps action=create` with `type` = shipping, `sub_category_id`,
   `name`, `short_description` (50–200), `app_url`, `email`, `logo`. Shipping apps are
   public — do **not** use `type: "private"`.

The result returns the `app_id`.

> **Shipping Company ID:** assigned **only by Salla** (contact shipping-team@salla.sa).
> You cannot set it yourself, and publication is blocked until Salla sets it.

**Manual fallback:** Portal → **My Apps → Create App** (Public, category Shipping App).
Full walkthrough: https://docs.salla.dev/422995m0.md

**Gate:** "App created — confirm the `app_id` (`salla_apps action=get`)."

---

## Step 2 — OAuth, Scopes & Webhook Connection

Configure OAuth + webhooks in one `salla_apps action=connect` call (read the valid scope
slugs from `salla_apps action=get` — there is no scope-catalog reference endpoint):

- `scopes` — shipping + order access (`slug → "read" | "read_write"`). Request the
  **minimum** scopes the app needs; pick `read` over `read_write` unless a write is
  required, and don't request broad scopes you won't use.
- `redirect_urls`, `webhook_url`, `webhook_security_strategy: "signature"`
- `generate_secret: true` — returns the webhook secret (store it for HMAC verification)

OAuth, token storage/refresh, and the per-merchant refresh lock → **`salla-app-auth`**.
Webhook signature verification (verify `X-Salla-Signature` against the raw body, reject
invalid signatures, never log the secret) and idempotency → **`salla-webhooks`**. Route
these concerns there — don't reimplement them here.

**Gate:** "Connect applied with no `_partial`. Is your webhook URL live and returning 200?"

---

## Step 3 — Configure Shipping Zones & Settings

Use `salla_shipping` instead of the Portal form:

1. Inspect current zones: `salla_shipping action=get_zones`, `app_id`. **Note:** a newly
   created shipping app already has a pre-seeded default zone (All Countries → All Cities,
   fixed fee) — a non-empty response does not mean you've already configured it. Verify
   against the live `get_zones` response and the Portal Setup flow
   (https://docs.salla.dev/422996m0.md) before assuming a zone is yours.
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
Authenticate the merchant/session before showing or saving any credentials, store them
encrypted, and never log them. (Embedded-page session auth → **`salla-embedded-app`**.)

Setup guide: https://docs.salla.dev/422996m0.md

**Gate:** "`salla_shipping action=get_zones` reflects your zones, and a demo-store
merchant can enter carrier credentials on your Shipping Settings page."

---

## Step 4 — Handle the Shipment Lifecycle

The shipment lifecycle splits into **two synchronous App Functions** and **three async
events** (source of truth: https://docs.salla.dev/1726835m0.md). The App Functions run
inside Salla's runtime, can shape the operation by **returning a `Shipment`**, and are
tested via the App Function MCP preview — **not** a webhook endpoint. Confirm the trigger
names and categories with `salla_functions action=list_triggers`.

| Trigger               | Kind                           | When it fires                                                              | What your handler does                                            |
| --------------------- | ------------------------------ | -------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `shipment.creating`   | **App Function** — sync action | Before a shipment is created (order → `completed`, or **Generate Policy**) | Create with the carrier; **return** a `Shipment` (number + label) |
| `shipment.cancelling` | **App Function** — sync action | Before a shipment is cancelled                                             | Void the label / stop pickup; **return** a `Shipment` (or error)  |
| `shipment.created`    | Async event                    | After a shipment is created                                                | Sync downstream state (background)                                |
| `shipment.cancelled`  | Async event                    | After a shipment is cancelled                                              | Reconcile / notify (background)                                   |
| `shipment.updated`    | Async event                    | After shipment details change                                              | Sync tracking/status (background)                                 |

Returns reuse `shipment.creating` with the payload's `type` field set to `"return"`
(new shipments use `"shipment"`).

**The two sync triggers are App Functions, not webhooks.** Implement them with
`salla_functions action=save` (one function per trigger) and the locked wrapper from
`salla_functions action=get`. The handler signature is:

```ts
// shipment.creating — runs before the shipment is created, returns the Shipment
export default async (context: Shipments): Promise<Shipment> => {
  const { payload, settings, merchant } = context;
  const { data: shipment } = payload; // the Shipment context object

  const result = await createWithCarrier(shipment); // carrier API call

  // setShipmentNumber() is required to identify the shipment; use Shipment.error()
  // to fail the operation. Other setters (setLabel, setTracking…) are available.
  return Shipment.success()
    .setShipmentNumber(result.shipment_number)
    .setLabel(result.label_url);
};
```

> **App Function mechanics live in the `salla-app-functions` family** — the V8 sandbox
> limits, the locked template/first-line rule, save/validate, the **5-second sync budget**
> (each internal async call < 2s), pre-authenticated Admin API (no `Authorization` header),
> and `Resp`/`Shipment` builders. Don't reimplement them here:
> design → **`salla-app-functions-design`**, the handler body → **`salla-app-functions-handler`**,
> save/validate → **`salla-app-functions-validate`**, test/preview → **`salla-app-functions-test`**.
> This skill owns the shipping specifics: what to compute in the handler (rates, labels,
> tracking, COD) and the **Shipment context object** shape
> ([`references/shipment-cycle.md`](references/shipment-cycle.md)).

**Test via the App Function MCP preview:** save the function, poll
`salla_functions action=deploy_status` until `COMPLETED`, then run
`salla_functions action=preview` with `app_id`, `trigger`, a demo `store_id`, and the
trigger's form fields (e.g. a real `shipment_id`). Do **not** use a preview URL or a
webhook endpoint for these — owned by **`salla-app-functions-test`**.

The **async events** (`shipment.created` / `shipment.cancelled` / `shipment.updated`) are
ordinary store events — subscribe them with `salla_events action=subscribe` (it **replaces**
the full list, so include every event you want active). Verify with `salla_events
action=list`. Transport (signature, fast-200, idempotency) → **`salla-webhooks`**.

After the carrier confirms a shipment, push tracking, label, cost, and status back with a
single **Update Shipment Details** call (use the stored merchant `access_token` — token
storage/refresh → **`salla-app-auth`**). This is a partner-initiated REST call, separate
from the App Function flow:

```http
# Update Shipment Details — set tracking, label, cost, and status in one call
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

Full App Function context payloads + handler shapes →
[`references/shipment-cycle.md`](references/shipment-cycle.md); the Shipping API
endpoints (update, list, return, cancel) →
[`references/api-endpoints.md`](references/api-endpoints.md)

**Gate:** "`salla_functions action=preview` returns a valid `Shipment` for `shipment.creating`
and `shipment.cancelling` on the demo store, and the tracking ID appears on the order."

---

## Step 5 — Order Fulfillment (if applicable)

If your app type from Step 0 is **Order Fulfillment App**:

1. Create it under the **Order Fulfillment** category (`salla_reference action=categories`
   → matching `sub_category_id`).
2. Handle order assignment across carriers by zone/weight rules.
3. Manage branch inventory, parcel dispatch, and status updates.

Fulfillment lifecycle → [`references/fulfillment-cycle.md`](references/fulfillment-cycle.md)
Setup guide: https://docs.salla.dev/423002m0.md

---

## Step 6 — Test & Publish

**Testing:** Connect a demo store via **App Testing** and simulate: new order → rate
request → label → tracking → cancellation → return. End-to-end demo-store validation is
owned by **`salla-live-testing`**. Use demo/non-sensitive data only — never send
production carrier credentials, OAuth/bearer tokens, webhook signing secrets, or real
customer PII (names, phones, addresses) to third-party capture/inspection tools, and
restore real config after testing.

**Publishing:** `salla_apps action=publish`, `app_id` (optional `update_note`). Complete
the publishing sections in the Portal. Two shipping-specific blockers:

- The `sub_category_id` must be a shipping sub-category from `sub_categories`
  (`salla_reference action=categories type=shipping`).
- The **Shipping Company ID** must already be assigned by Salla
  (shipping-team@salla.sa) — publication is blocked until it is set.

Once approved, your app is listed at https://apps.salla.sa/en under Shipping.

Test guide: https://docs.salla.dev/422998m0.md ·
Publishing guide: https://docs.salla.dev/422990m0.md

**Gate:** "Published — `salla_apps action=get` shows the expected status."

---

## Resources

| Topic                          | Link                                                                                                                           |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| Shipping API (getting started) | https://docs.salla.dev/422988m0.md                                                                                             |
| List of Shipping API           | https://docs.salla.dev/api-5578809                                                                                             |
| Shipping App Cycle             | https://docs.salla.dev/422994m0.md                                                                                             |
| Create Shipping App            | https://docs.salla.dev/422995m0.md                                                                                             |
| Setup Shipping App             | https://docs.salla.dev/422996m0.md                                                                                             |
| Shipping API Migration Guide   | https://docs.salla.dev/422989m0.md                                                                                             |
| Shipping API Change Log        | https://docs.salla.dev/422992m0.md                                                                                             |
| New Order Fulfillment App      | https://docs.salla.dev/423001m0.md                                                                                             |
| Order Fulfillment Cycle        | https://docs.salla.dev/423000m0.md                                                                                             |
| Test Order Fulfillment App     | https://docs.salla.dev/423003m0.md                                                                                             |
| Postman Collection             | https://www.postman.com/salla-app/workspace/salla-e-commerce-platform/collection/17687195-d700cd60-adf3-4b20-82ee-94851e88bd44 |
| Developer Community            | https://t.me/salladev                                                                                                          |
