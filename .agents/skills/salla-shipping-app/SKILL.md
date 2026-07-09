---
name: salla-shipping-app
description: >
  Build a Salla shipping app in two models — Shipping Management (one carrier: the modern
  Salla AWB model, App Functions inside Salla Partners, no backend) or Order Fulfilment
  (auto-dispatch across carriers). Create it, configure zones via salla_shipping,
  implement the sync App Functions shipment.creating (returns a Shipment with AWB + PDF
  label) and shipment.cancelling (returns Resp). Use when building for any carrier, AWB, label,
  tracking, COD, or return task. App Functions → salla-app-functions; OAuth → salla-app-auth; webhooks,
  publish → salla-webhooks, salla-app-builder.
---

# Salla Shipping App Flow

Build a shipping app by **performing the actions** with the Salla Partners MCP tools.
Follow the steps in order — complete each gate before moving on.

> **Shipping Apps must be Public** — Private apps are not supported for this category
> (https://docs.salla.dev/422995m0.md).

## Two app models — pick first

Salla has **two distinct shipping app models** (https://docs.salla.dev/422988m0.md). They
share creation and OAuth but diverge on setup, lifecycle, and testing:

| Model                                   | What it is                                                                                                                                                                                                               | Owns the lifecycle in             |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------- |
| **Shipping Management** (carrier / AWB) | Integrates **one shipping company**. The modern **Salla AWB** model — write **App Functions inside Salla Partners (no backend to build or host)** that call your carrier API to generate the AWB and return it to Salla. | `references/shipment-cycle.md`    |
| **Order Fulfilment**                    | Sits **across carriers** — receives the order, auto-assigns the best carrier/branch, then drives the assigned Shipping App.                                                                                              | `references/fulfillment-cycle.md` |

> **Salla AWB is the preferred Shipping Management model** — your shipping service appears
> natively in the merchant's **AWB creation screen** (Orders → Create shipping label) with
> no servers, deployments, or polling to maintain. Logic runs in Salla's App Function
> runtime with direct access to the Salla Shipping API
> (https://docs.salla.dev/1792089m0.md).

> **Appear in AWB couriers / Shipping Company ID:** to list a Shipping Management (AWB) app
> in the merchant's AWB courier options, email **partners@salla.sa**
> (https://docs.salla.dev/1792111m0.md). The **Shipping Company ID** is assigned by Salla
> only — you cannot set it yourself.

## Tools

| Tool              | Action                                     | What it does                                                                                                            |
| ----------------- | ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| `salla_reference` | `categories`                               | `type=shipping` → pick `sub_category_id` from `sub_categories`; `main_category_id`/`categories` for publish come from the same call's `main_categories`/`categories` (App Theme, not shipping-scoped) |
| `salla_upload`    | —                                          | Upload the logo → file `id`                                                                                             |
| `salla_apps`      | `create` / `connect` / `set_status`        | Create + configure OAuth/webhooks; a private app is published by the partner from its app-details page, not via the MCP |
| `app_publish`     | `open` / `set` / `validate`                | Public apps: validate the publication (saves a DRAFT; partner submits in Portal)                                        |
| `salla_events`    | `list` / `subscribe`                       | Subscribe to the async shipment events                                                                                  |
| `salla_functions` | `list_triggers` / `save` / `preview`       | Implement + test the sync shipment App Functions                                                                        |
| `salla_shipping`  | `get_zones` / `set_zones` / `list_settings` / `get_setting` / `create_setting` / `set_settings` / `delete_setting` / `set_policy_options` | Configure shipping zones, shipping settings (discoverable — no Portal round-trip needed), and policy search-options |

> **Prerequisite:** the Salla Partners MCP server must be connected. Carry the `app_id`
> through every step. If a tool returns "Salla session expired", re-run the login flow.

---

## Step 0 — Discover

Ask before starting:

1. **Which model?** (decides which reference owns the lifecycle — see the table above)
   - **Shipping Management / AWB** — integrates one carrier; you write the
     `shipment.creating` / `shipment.cancelling` App Functions that generate the AWB
   - **Order Fulfilment** — auto-assigns the best carrier/branch across multiple
     shipping apps
2. **Which carrier or provider are you integrating?**
3. **Do you support Cash on Delivery (COD)?**
4. **Which regions / shipping zones does your carrier cover?**

---

## Step 1 — Create the App

1. Resolve the category: `salla_reference action=categories type=shipping` → `sub_categories`.
   The `sub_category_id` **must be a shipping sub-category** picked from `sub_categories` — a
   non-shipping sub-category is rejected. (Currently Fulfillment / Other / Drop-shipping = ids
   `45 / 46 / 54`; these ids are illustrative — always read the live values rather than
   hard-coding them.) **Don't** reuse that same call's `main_categories`/`categories` for the
   publish-time `main_category_id`/`categories` — those are a separate, type-independent "App
   Theme"/"App Impact" list, not shipping-specific →
   [step-basic-information.md](../salla-publication-consistency/references/step-basic-information.md).
2. Upload the logo: `salla_upload` (square 1:1, ≥ 250×250 px) → file `id`.
3. Create it: `salla_apps action=create` with `type` = shipping, `sub_category_id`,
   `name`, `short_description` (50–200), `app_url`, `email`, `logo`. Set the app **public**
   (the only mode this category supports).

The result returns the `app_id`. (To appear in AWB courier options, email
**partners@salla.sa** — see the model section above.)

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

The webhook signing secret isn't minted by `connect` — create/rotate it in the Partner Portal
(`https://portal.salla.partners/apps/{app_id}`) and read the current value with
`salla_apps action=get` (the `webhook_secret` field) before deploy; store it for HMAC
verification.

OAuth, token storage/refresh, and the per-merchant refresh lock → **`salla-app-auth`**.
Webhook signature verification (verify `X-Salla-Signature` against the raw body, reject
invalid signatures, never log the secret) and idempotency → **`salla-webhooks`**. Route
these concerns there — don't reimplement them here.

**Gate:** "Connect applied with no `_partial`. Is your webhook URL live and returning 200?"

---

## Step 3 — Configure Shipping Zones & Settings

> **A shipping app has no merchant settings form.** Don't call `salla_settings
define_form` — that form is for public/private/communication apps, and the Portal rejects
> `POST /settings` for a shipping app. Shipping configuration is the `salla_shipping` zones
> and settings below; carrier credentials go through the Shipping Settings URL. The
> settings-form concept itself → [salla-app-settings](../salla-app-settings/SKILL.md).

Use `salla_shipping` instead of the Portal form:

1. Inspect current zones: `salla_shipping action=get_zones`, `app_id`. **Note:** a newly
   created shipping app already has a pre-seeded default zone (All Countries → All Cities,
   fixed fee) — a non-empty response does not mean you've already configured it. Verify
   against the live `get_zones` response and the Portal Setup flow
   (https://docs.salla.dev/422996m0.md) before assuming a zone is yours.
2. Set zones (regions/countries your carrier covers, package types, COD):
   `salla_shipping action=set_zones`, `app_id`, `shipping` (array of zone objects —
   `country`, `city[]`, `fees{type: "fixed"|"rate"|"automatic", amount?}`,
   `cash_on_delivery{status, fees?}`, `duration?`). This **replaces the full zone list** —
   include every zone you want to keep, not just the one you're adding/changing.
3. Discover or create the shipping settings record (country + company type + enabled
   service types) — no more copying `setting_id` from the Portal by hand:
   - `salla_shipping action=list_settings`, `app_id` (optional `status`
     `"draft"`/`"publish"`, `per_page`) — returns existing settings with their ids. An
     empty result means none exist yet.
   - If none exist for the country you need, create one: `salla_shipping
     action=create_setting`, `app_id`, `country_id`, `company_types` (1-2 of
     `"fulfillment"` / `"shipping_delivery"` — labels, not numbers), `support_change_name`
     (boolean), optional `service_type_ids`. One setting per country per app.
   - Update an existing setting: `salla_shipping action=set_settings`, `app_id`,
     `setting_id` (from `list_settings`), any of `company_types` / `support_change_name` /
     `service_type_ids`.
   - Inspect one in full or remove it: `action=get_setting` / `action=delete_setting`,
     `app_id`, `setting_id`.
4. Set the policy / shipment-feature search-options shown on the app's public listing
   (allowed product types, packaging types, dimension/box-count support, and similar
   required-option toggles): `salla_shipping action=set_policy_options`, `app_id`,
   `search_options` (array of `{id, is_required?, values?}` — `id` is a search-option id,
   `values` the selected search-option-value ids). This **replaces the current
   selection** — include every option you want to keep.

You still set a **Shipping Settings URL** in the Portal — the page Salla loads in the
merchant dashboard to collect carrier credentials (API key, account number). This is a
separate concept from the shipping-settings record above (country/company-type/service
types) — the URL page collects the merchant's per-store carrier credentials, not your
app's own configuration. Authenticate the merchant/session before showing or saving any
credentials, store them encrypted, and never log them. (Embedded-page session auth →
**`salla-embedded-app`**.)

Setup guide: https://docs.salla.dev/422996m0.md

**Gate:** "`salla_shipping action=get_zones` reflects your zones, `action=list_settings`
shows the settings you created/updated, and a demo-store merchant can enter carrier
credentials on your Shipping Settings page."

---

## Step 4 — Core App Functions (Shipping Management / AWB)

A Shipping Management (AWB) app implements **two sync App Functions**
(`salla_functions action=list_triggers` category `merchant_actions`) and may subscribe
**three async events** (`merchant_events`). The App Functions run inside Salla's runtime,
shape the operation by their **return value**, and are tested via the App Function MCP
preview — **not** a webhook endpoint.

| Trigger               | Category (MCP-confirmed)      | Return type         | When it fires                                                                                                     | What your handler does                                                                          |
| --------------------- | ----------------------------- | ------------------- | ----------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `shipment.creating`   | **`merchant_actions`** (sync) | `Promise<Shipment>` | A shipment **or return** is created (order → `completed`, or **Create shipping label** / **Create return label**) | Call your carrier API → generate the AWB; **return a `Shipment`** (number + PDF label + status) |
| `shipment.cancelling` | **`merchant_actions`** (sync) | `Promise<Resp>`     | Before a shipment/return is cancelled                                                                             | Call your carrier API to void / cancel; **return `Resp.success()`** (or error to decline)       |
| `shipment.created`    | `merchant_events` (async)     | —                   | After a shipment is created                                                                                       | Sync downstream state (background)                                                              |
| `shipment.cancelled`  | `merchant_events` (async)     | —                   | After a shipment is cancelled                                                                                     | Reconcile / notify (background)                                                                 |
| `shipment.updated`    | `merchant_events` (async)     | —                   | After shipment details change                                                                                     | Sync tracking/status (background)                                                               |

> **Name to `save` against:** the sync cancel function is **`shipment.cancelling`**
> (`merchant_actions`, returns `Resp`), even though the AWB docs label its screen "Shipment
> Cancelled" (https://docs.salla.dev/1797616m0.md). `shipment.cancelled` is the separate
> async event. Reconcile names with `salla_functions action=list_triggers` (detail →
> `references/shipment-cycle.md`).

`shipment.creating` handles **both new shipments and returns** — one function, branch on the
payload's `type` field (`"shipment"` vs `"return"`) (https://docs.salla.dev/1792119m0.md).

**These sync triggers are App Functions, not webhooks.** Implement each with
`salla_functions action=save` (one function per trigger) using the locked wrapper from
`salla_functions action=get`. Handler signatures (first line of each is locked):

```ts
// shipment.creating — generate the AWB and return a Shipment
export default async (context: Shipments): Promise<Shipment> => {
  const { payload, settings, merchant } = context;
  const { data: shipment } = payload; // type: "shipment" | "return"

  const result = await callCarrierAwbApi(shipment); // your third-party API

  // setShipmentNumber() is REQUIRED; setPdfLabel/setStatus shape the AWB.
  // Return Shipment.error("…") on carrier failure.
  return Shipment.success()
    .setShipmentNumber(result.awb_number)
    .setPdfLabel(result.label_url)
    .setStatus(ShipmentStatusEnum.IN_TRANSIT);
};
```

```ts
// shipment.cancelling — void with the carrier, return Resp (NOT a Shipment)
export default async (context: Shipments): Promise<Resp> => {
  await voidWithCarrier(context.payload.data.shipping_number);
  return Resp.success().setData({});
};
```

> **App Function mechanics live in the `salla-app-functions` family** — the V8 sandbox
> limits, the locked template/first-line rule, save/validate, the **5-second sync budget**
> (each internal async call < 2s), pre-authenticated Admin API (no `Authorization` header),
> and the `Resp`/`Shipment` builder runtime: design → **`salla-app-functions-design`**,
> handler body → **`salla-app-functions-handler`**, save/validate →
> **`salla-app-functions-validate`**, test/preview → **`salla-app-functions-test`**.
> The shipping specifics — the full `Shipment` builder method list, `ShipmentStatusEnum`,
> the `Shipments` context payload, and the three AWB processing flows — live in
> [`references/shipment-cycle.md`](references/shipment-cycle.md).

**Before you save: confirm the payload field names from the fetched types.** Between getting
the template (`salla_functions action=get`) and `salla_functions action=save`, route the
handler body to **`salla-app-functions-handler`** — it owns writing the body, including the
rule that you fetch **every URL in the `types` array** from `action=get` and read the exact
`shipment.creating` / `shipment.cancelling` payload field names (addresses, parcel, weight,
`type: "shipment" | "return"`) off `context.payload.data` from those `.d.ts` definitions. Don't
guess carrier-API-style names like `sender_address` / `receiver_address` / `weight`.

**Gate:** "Handler body written via salla-app-functions-handler, with every
`context.payload.data` field confirmed against the trigger's fetched `types` `.d.ts` — none
guessed — before `salla_functions action=save`?"

**Test via the App Function MCP preview** (owned by **`salla-app-functions-test`**): save the
function, poll `salla_functions action=deploy_status` until `COMPLETED`, then run
`salla_functions action=preview` with `app_id`, `trigger`, a demo `store_id`, and the
trigger's form fields (e.g. a real `shipment_id`).

The **async events** (`shipment.created` / `shipment.cancelled` / `shipment.updated`) are
ordinary store events — subscribe them with `salla_events action=subscribe` (it **replaces**
the full list, so include every event you want active). Verify with `salla_events
action=list`. Transport (signature, fast-200, idempotency) → **`salla-webhooks`**.

The App Function returns the AWB synchronously. For **out-of-band** updates after the carrier
confirms (real shipping cost, tracking, status changes), push them with the partner-initiated
**Update Shipment Details** REST call (`PUT /shipments/{id}`, stored merchant `access_token` —
token storage/refresh → **`salla-app-auth`**; endpoint shape, required fields, and status enum
→ [`references/api-endpoints.md`](references/api-endpoints.md)). Validate the
`PUT /shipments/{id}` body against its documented OpenAPI schema (in the endpoint's
`docs.salla.dev/<id>.md` page — find it via **salla-docs**) and fix before relying on it,
via the read-schema → build → validate → fix → retry loop in **salla-api-core**.

**Gate:** "`salla_functions action=preview` returns a valid `Shipment` for `shipment.creating`
(both `type: shipment` and `type: return`) and `Resp.success()` for `shipment.cancelling` on
the demo store, and the AWB number / tracking appears on the order."

---

## Step 5 — Order Fulfilment (if that's your model)

If your model from Step 0 is **Order Fulfilment** (https://docs.salla.dev/423000m0.md), the
flow differs: you don't write a `shipment.creating` App Function — you react to
`order.created`, pick the carrier/branch, and **assign** the shipment, which triggers the
assigned Shipping App's `shipment.creating` function. Setup scopes (Basic Info, Orders,
Webhooks, Shipping) and events (`order.created`, `shipment.created`) per
https://docs.salla.dev/423002m0.md.

Full assignment + return/cancel cycle →
[`references/fulfillment-cycle.md`](references/fulfillment-cycle.md).

---

## Step 6 — Test & Publish

**Testing:** Connect a demo store via **App Testing** and simulate: new order → rate
request → label → tracking → cancellation → return. End-to-end demo-store validation is
owned by **`salla-live-testing`**. Use demo/non-sensitive data: keep production carrier
credentials, OAuth/bearer tokens, webhook signing secrets, and real customer PII out of any
third-party capture/inspection tool, and restore real config when done.

**Publishing:** public app → `app_publish` stepwise (`open` → `set` each section →
`validate` saves a DRAFT; the partner then submits one-click in the Portal `/publish` page —
owned by **salla-publication-consistency**). Private app → the partner sends the publish
request from the app-details page `https://portal.salla.partners/apps/{app_id}` (no MCP
action, no onboarding). Two shipping-specific blockers:

- The `sub_category_id` must be a shipping sub-category from `sub_categories`
  (`salla_reference action=categories type=shipping`).
- To appear in the merchant's **AWB courier options**, your app must be enabled by Salla —
  email **partners@salla.sa** (https://docs.salla.dev/1792111m0.md).

Once approved, your app is listed at https://apps.salla.sa/en under Shipping.

Test guide: https://docs.salla.dev/422998m0.md ·
Publishing guide: https://docs.salla.dev/422990m0.md

**Gate:** "Published — `salla_apps action=get` shows the expected status."

---

## Resources

| Topic                             | Link                                                                                                                           |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Shipping overview (both models)   | https://docs.salla.dev/422988m0.md                                                                                             |
| List of Shipping API              | https://docs.salla.dev/api-5578809                                                                                             |
| **Salla AWB** — getting started   | https://docs.salla.dev/1792089m0.md                                                                                            |
| AWB — create app                  | https://docs.salla.dev/1792111m0.md                                                                                            |
| AWB — setup app                   | https://docs.salla.dev/1792112m0.md                                                                                            |
| AWB function — Shipment Creating  | https://docs.salla.dev/1792119m0.md                                                                                            |
| AWB function — Shipment Cancelled | https://docs.salla.dev/1797616m0.md                                                                                            |
| Shipping Management — create      | https://docs.salla.dev/422995m0.md                                                                                             |
| Shipping Management — setup       | https://docs.salla.dev/422996m0.md                                                                                             |
| Shipping Management — app cycle   | https://docs.salla.dev/422994m0.md                                                                                             |
| Shipping Management — test        | https://docs.salla.dev/422998m0.md                                                                                             |
| Order Fulfilment — create         | https://docs.salla.dev/423001m0.md                                                                                             |
| Order Fulfilment — setup          | https://docs.salla.dev/423002m0.md                                                                                             |
| Order Fulfilment — app cycle      | https://docs.salla.dev/423000m0.md                                                                                             |
| Order Fulfilment — test           | https://docs.salla.dev/423003m0.md                                                                                             |
| Postman Collection                | https://www.postman.com/salla-app/workspace/salla-e-commerce-platform/collection/17687195-d700cd60-adf3-4b20-82ee-94851e88bd44 |
| Developer Community               | https://t.me/salladev                                                                                                          |
