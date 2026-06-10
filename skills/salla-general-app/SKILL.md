---
name: salla-general-app
description: >
  Use when a developer wants to create or build a Salla app end to end —
  from app creation through OAuth, webhooks, store events, storefront
  snippets, embedded pages, App Functions, and app-type-specific configuration
  (communication or shipping).
---

# Salla App Builder Flow

Build a complete Salla app by **performing the actions**, not just describing them.
Each step calls a Salla Partners MCP tool to do the work. Follow the steps in order —
complete each gate before moving to the next.

## Tools

These steps drive the **Salla Partners MCP** tools. Each is one tool with an `action`:

| Tool | What it does |
| --- | --- |
| `salla_reference` | Look up `categories`, `scopes`, `countries`, `cities` |
| `salla_upload` | Upload a logo/file → returns a file `id` |
| `salla_apps` | `create` / `update` / `get` / `list` / `connect` (OAuth+webhooks) / `set_status` / `publish` |
| `salla_events` | `list` subscribable events / `subscribe` an app to slugs |
| `salla_functions` | `list` / `get` / `delete` an app's App Functions |

> **Prerequisite:** the Salla Partners MCP server must be connected (the tools above
> appear in your tool list). If it isn't, fall back to the Portal at
> https://portal.salla.partners and the inline manual notes. Run the OAuth/login flow
> if a tool returns "Salla session expired — reconnect".

## Step 0 — Discover

Ask before starting:

1. **What does your app do?** (brief description)
2. **App type:** General / Communication / Shipping
3. **Visibility:** Public (App Store) or Private (invite-only)?

Use the answers to tailor Steps 1, 4–7.

---

## Step 1 — Create the App

1. **Resolve the category.** Call `salla_reference` with `action: "categories"` to get
   valid `type` / `sub_category_id` values. `type` is `"private"` for a private app, or
   a public category value (e.g. `app`, `shipping`, `communication`). For `app` /
   `shipping`, a `sub_category_id` is required.
2. **Upload the logo.** Call `salla_upload` with a public `url` or `base64`. The logo
   must be a **square (1:1) image, ≥ 250×250 px**. The result returns `id` plus
   `width`/`height` — confirm they satisfy the rule, then use the returned `id`.
3. **Create the app.** Call `salla_apps` with `action: "create"` and:

| Field | Requirement |
| --- | --- |
| `name` | string (→ English) or locale map `{en, ar}` |
| `type` | from step 1 (`private` or a public category) |
| `short_description` | 50–200 chars |
| `app_url` | URL |
| `email` | support email |
| `logo` | file `id` from `salla_upload` |
| `sub_category_id` | required when `type` is `app` / `shipping` |
| `is_paid` | optional, boolean |

The result returns the new `app_id` — carry it through every later step.

**Manual fallback:** Portal → **My Apps → Create App**.

**Gate:** "App created — confirm the returned `app_id` (`salla_apps action=get`)."

---

## Step 2 — OAuth, Scopes & Webhook Connection

Configure OAuth and webhooks in **one** `salla_apps action=connect` call. First look up
the available scopes:

1. Call `salla_reference` with `action: "scopes"` and the `app_id` to list scope slugs
   and their current selection. Request only the minimum the app needs (e.g.
   `offline_access` for refresh tokens, `orders.read`, `products.read`).
2. Call `salla_apps` with `action: "connect"`, `app_id`, and any of:
   - `scopes` — map of `slug → "read" | "read_write"`
   - `redirect_urls` — OAuth redirect URL(s)
   - `webhook_url` — your webhook receiver
   - `webhook_security_strategy` — `"signature"` (recommended) or `"token"`
   - `generate_secret: true` — mints + returns the webhook signing secret
   - `trusted_ips`, `webhook_headers`

   Partial failures come back under `_partial` — re-apply only the failed pieces.

Store the returned **webhook secret** securely; it verifies the HMAC-SHA256 signature on
every webhook. Signature-verification code → [`references/webhook-events.md`](references/webhook-events.md).
Token-handling (Easy vs Custom mode) → [`references/oauth-patterns.md`](references/oauth-patterns.md).

**Gate:** "Scopes + redirect + webhook applied (no `_partial`). Is your webhook URL live
and returning 200, with the secret stored?"

---

## Step 3 — Store Events Subscription

1. Call `salla_events` with `action: "list"` and `app_id` to get the valid event slugs
   the app can subscribe to (always call this first — slugs are validated).
2. Ask: "Which domains does your app react to?" Subscribe only to what's needed by
   calling `salla_events` with `action: "subscribe"`, `app_id`, and `events: [...slugs]`.

Common slugs by domain:

| Domain | Key events |
| --- | --- |
| Lifecycle (always) | `app.store.authorize`, `app.updated`, `app.subscription.started` |
| Orders | `order.created`, `order.updated`, `order.status.updated` |
| Products | `product.created`, `product.updated`, `product.deleted` |
| Customers | `customer.created`, `customer.updated` |
| Shipments | `shipping.shipment.creating`, `shipping.shipment.created`, `shipping.shipment.cancelled` |

> A `webhook_url` must be set (Step 2) before events will deliver. Unknown slugs are
> rejected with the valid list — pick from it.

**Gate:** "Subscribed. Trigger one event from the demo store and confirm your webhook
receives it."

---

## Step 4 — Storefront Snippets

Ask: "Does your app need to inject HTML/JS into the merchant's storefront?"

- **Yes** → follow the **`salla-storefront-snippets`** skill (it uses `salla_snippets`
  to create the snippet).
- **No** → skip to Step 5.

---

## Step 5 — Embedded App Pages

Ask: "Does your app need a custom UI inside the Salla merchant dashboard?"

- **Yes** → follow the **`salla-embedded-app`** skill (it uses `salla_embedded_pages`
  to register the iframe page, plus SDK setup, auth, and theme sync).
- **No** → skip to Step 6.

---

## Step 6 — App Functions

Ask: "Does your app need serverless handlers triggered by Salla events?"

- **Yes** → follow the **`salla-app-builder`** skill for the App Function source,
  context shape, and `Resp` API.

Inspect deployed functions with `salla_functions` (`action: "list" | "get" | "delete"`).
**Deployment is done by Salla when you publish the app** — there is no deploy tool.

Key requirements:
- Handle `app.store.authorize` to store `access_token` + `refresh_token` + expiry.
- Use `context.settings` for per-merchant configuration.
- Sync actions: **< 500 ms** | Async events: **30 s** timeout.
- Always return `Resp.success().setData({})` or `Resp.error().setMessage("…")`.

**Gate:** "Function source ready and `salla_functions action=list` shows it after a test
publish?"

---

## Step 7 — App-Type-Specific Settings

Branch on the app type from Step 0:

### General App

Needs per-merchant config (API keys, toggles, URLs)? → follow the
**`salla-app-settings`** skill (it uses `salla_settings action=define_form`).

### Communication App

Sends messages on behalf of merchants (WhatsApp, SMS, email):
- Create with `type` = the communication category (`salla_reference action=categories`).
- Handle events: `communication.sms.send`, `communication.whatsapp.send`,
  `communication.email.send`.
- Return delivery status in the webhook response payload.
- Payload reference → [`salla-app-builder/references/communication-app.md`](../salla-app-builder/references/communication-app.md)

### Shipping App

Integrates a carrier or fulfillment provider:
- Must be **Public** — Shipping Apps cannot be Private.
- Follow the **`salla-shipping-app`** skill (it uses `salla_shipping` for zones/settings
  and `salla_apps` for the full lifecycle).

---

## Step 8 — Test & Publish

1. Connect a demo store via **App Testing** in the Portal and trigger each subscribed
   event to verify end-to-end behavior.
2. Move the app to live when ready: `salla_apps action=set_status`, `status: "live"`.
3. Submit for review: `salla_apps action=publish`, `app_id` (set `private: true` for a
   private-publish; optional `update_note`). Complete the publishing sections in the
   Portal (Basic Information → Configurations → Features → Pricing → Contact → Trial).
4. Once approved the app is live on https://apps.salla.sa/en.

Testing guide: https://salla.dev/blog/how-to-test-your-app-using-salla-demo-stores/
Publishing guide: https://salla.dev/blog/standards-salla-apps-publications/

**Gate:** "Published — `salla_apps action=get` shows the expected status."

---

## Resources

| Topic | Link |
| --- | --- |
| Partners Portal | https://portal.salla.partners/ |
| Apps Marketplace | https://apps.salla.sa/en |
| Webhooks guide + event list | https://docs.salla.dev/421119m0 |
| App Events (lifecycle) | https://docs.salla.dev/doc-421413 |
| Salla Admin API reference | https://docs.salla.dev/doc-421117 |
| Developer community (Telegram) | https://t.me/salladev |
