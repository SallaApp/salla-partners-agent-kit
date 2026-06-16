---
name: salla-app-builder
description: >
  Step-by-step flow to create, configure, and publish a Salla app with the Salla
  Partners MCP: create the app (category, sub_category_id, logo upload), connect OAuth
  scopes + webhook URL, subscribe events, then branch by capability — snippets
  (salla-snippets), embedded pages (salla-embedded-app), App Functions
  (salla-app-functions), settings (salla-app-settings) — and publish. Use for "create a
  new Salla app" or any create-to-publish step. Type deltas: salla-shipping-app,
  salla-communication-app. Deep mechanics live in the routed skills.
license: Copyright (c) 2026 Salla
metadata:
  authors: Hazem Khaled
  version: 1.0
---

# Salla App Builder — Create an App from Scratch

Build a complete Salla app by **performing the actions**, not just describing them.
Each step calls a Salla Partners MCP tool to do the work. Follow the steps in order —
complete each gate before moving to the next.

## Tools

These steps drive the **Salla Partners MCP** tools. Each is one tool with an `action`:

| Tool              | What it does                                                                                                           |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `salla_reference` | Look up `categories`, `countries`, `cities`                                                                            |
| `salla_upload`    | Upload a logo/file → returns a file `id`                                                                               |
| `salla_apps`      | `create` / `update` / `get` / `list` / `connect` (OAuth+webhooks) / `set_status` / `publish` / `demo_stores` (testing) |
| `salla_events`    | `list` subscribable events / `subscribe` an app to slugs                                                               |

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

1. **Resolve the category.** Call `salla_reference` with `action: "categories"` and the
   `type` (`"app"` or `"shipping"`). It returns both `main_categories` and
   `sub_categories`. Private apps use `type: "app"` here — `"private"` is **not** a valid
   `salla_reference` category type. For `app` / `shipping`, a `sub_category_id` is
   required and **must be a sub-category id** (pick from `sub_categories` — for `app`
   these are POS, OMS, Subscription, Cross-sell/Upsell, Manage Store, AI, Others). The
   `main_category_id` used at publish is a **main** category (from `main_categories`).
2. **Upload the logo.** Call `salla_upload` with a public image `source_url`. The logo
   must be a **square (1:1) image, ≥ 250×250 px** — ensure the source image satisfies
   that **before** uploading. The result returns only `{id, url}` (no dimensions are
   echoed), so use the returned `id`.
3. **Create the app.** Call `salla_apps` with `action: "create"` and:

| Field                        | Requirement                                                                                                                                                                                                 |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `name` + `name_ar`           | **bilingual** — the API rejects missing variants (`name_ar` defaults to `name`). Both must be globally unique; `name_ar` must be plain Arabic letters with NO diacritics/tashkeel (e.g. هريفاي, not هرّفاي) |
| `type`                       | from step 1 (`private` or a public category)                                                                                                                                                                |
| `short_description` (+`_ar`) | 50–200 chars each — bilingual like `name`                                                                                                                                                                   |
| `app_url`                    | URL                                                                                                                                                                                                         |
| `email`                      | support email                                                                                                                                                                                               |
| `logo`                       | file `id` from `salla_upload`                                                                                                                                                                               |
| `sub_category_id`            | required when `type` is `app` / `shipping`                                                                                                                                                                  |
| `is_paid`                    | optional, boolean                                                                                                                                                                                           |

The result returns the new `app_id` — carry it through every later step. **Open the app in
the Partners Portal to view, configure, and test it:**
`https://portal.salla.partners/apps/{app_id}` (substitute the returned id). Surface this
link to the user after every create.

> **Note on `salla_apps action=update`:** it returns `{"app": {}}` (empty object) on
> success — the Portal does not echo changed fields. Always follow up with
> `salla_apps action=get` to confirm the update was applied.

**Manual fallback:** Portal → **My Apps → Create App**.

**Gate:** "App created — confirm the returned `app_id` (`salla_apps action=get`)."

---

## Step 2 — OAuth, Scopes & Webhook Connection

Configure OAuth and webhooks in **one** `salla_apps action=connect` call. First check the
app's valid scope slugs and current selection:

1. Call `salla_apps` with `action: "get"` and the `app_id` to read the valid scope slugs,
   their current selection, and any per-app disabled flags. (There is **no** scope-catalog
   reference endpoint.) Request only the minimum the app needs.
2. Call `salla_apps` with `action: "connect"`, `app_id`, and any of:
   - `scopes` — map of `slug → "read" | "read_write"` (e.g.
     `{"orders": "read", "products": "read"}`). Pass **only** the resource map here —
     `offline_access` belongs in the OAuth authorize URL, not in the `scopes` map.
   - `redirect_urls` — OAuth redirect URL(s)
   - `webhook_url` — your webhook receiver
   - `webhook_security_strategy` — `"signature"` (recommended) or `"token"`
   - `generate_secret: true` — mints + returns the webhook signing secret. An app
     already has a secret from creation, so this **rotates** it — don't regenerate if
     the current secret is already deployed and in use.
   - `trusted_ips`, `webhook_headers`

   Partial failures come back under `_partial` — re-apply only the failed pieces.

Store the returned **webhook secret** securely; it verifies the HMAC-SHA256 signature on
every webhook. Signature-verification code → **`salla-webhooks`** skill.
Token-handling (Easy vs Custom mode) → **`salla-app-auth`** skill.

**Gate:** "Scopes + redirect + webhook applied (no `_partial`). Is your webhook URL live
and returning 200, with the secret stored?"

---

## Step 3 — Store Events Subscription

1. Call `salla_events` with `action: "list"` and `app_id` to get the valid event slugs
   the app can subscribe to (always call this first — slugs are validated).
2. Ask: "Which domains does your app react to?" Subscribe only to what's needed by
   calling `salla_events` with `action: "subscribe"`, `app_id`, and `events: [...slugs]`.

> **Hookable rule — App Functions first.** BEFORE subscribing a webhook for a STORE event
> (order / product / cart / customer …), check the App Function trigger catalog
> (**`salla-app-functions`**) and prefer an App Function: it runs inside Salla, reads
> `context.settings`, and calls the Salla API without your own token/refresh plumbing or
> signature verification. Use **webhooks only** for lifecycle/auth events with no trigger —
> `app.store.authorize` (delivers Easy-Mode tokens), install/uninstall, trial/subscription.
> The clean split: **lifecycle/auth → webhook · store automation → App Function ·
> storefront UI → snippet · merchant config → embedded dashboard.**

Common slugs by domain:

| Domain             | Key events                                                                                                                 |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| Lifecycle (always) | `app.store.authorize`, `app.updated`, `app.subscription.started`                                                           |
| Orders             | `order.created`, `order.updated`, `order.status.updated`                                                                   |
| Products           | `product.created`, `product.updated`, `product.deleted`                                                                    |
| Customers          | `customer.created`, `customer.updated`                                                                                     |
| Shipments          | `order.shipment.creating`, `order.shipment.cancelled`, `order.shipment.return.creating`, `order.shipment.return.cancelled` |

> A `webhook_url` must be set (Step 2) before events will deliver. Unknown slugs are
> rejected with the valid list — pick from it (`salla_events action=list` is the source
> of truth).

**Gate:** "Subscribed. Trigger one event from the demo store and confirm your webhook
receives it."

---

## Step 4 — Storefront Snippets

Ask: "Does your app need to inject HTML/JS into the merchant's storefront?"

- **Yes** → follow the **`salla-snippets`** skill (it uses `salla_snippets`
  to create the snippet).
- **No** → skip to Step 5.

---

## Step 5 — Embedded App Pages

Ask: "Does your app need a custom UI inside the Salla merchant dashboard?"

- **Yes** → follow the **`salla-embedded-app`** skill (it uses `salla_embedded_pages`
  to register the iframe page, plus SDK setup, auth, and theme sync).
- **No** → skip to Step 5a.

---

## Step 5a — Post-Install Onboarding Steps (Optional)

Ask: "Does your app need guided setup steps shown to the merchant right after install?"
Common use cases: creating an account on your platform for the first time, entering
credentials before the app activates, or configuring settings that cannot be changed
later.

- **Yes** → use `salla_onboarding_steps`:
  1. Call `salla_onboarding_steps action=create`, `app_id` with:
     - `slug` — **lowercase letters and digits only** (no hyphens or underscores)
     - `icon`, `title`, `iframe_url` (the page the merchant completes this step on)
  2. Repeat for each step, then call `action=sort` to set their order.
  > `action=update` is a **full revalidation** — resend `slug`, `icon`, and `title`
  > together; a partial payload 422s.
- **No** → skip to Step 6.

---

## Step 6 — App Functions

Ask: "Does your app need serverless handlers triggered by Salla events?"

- **Yes** → follow the **`salla-app-functions`** skill for the App Function source,
  context shape, `Resp` API, timeouts, and lifecycle-event handling.

**Deployment is done by Salla when you publish the app** (`salla_apps action=publish`) —
there is no separate deploy tool. To inspect, edit, or remove deployed functions, use the
Partners Portal → **App Functions** tab (no MCP tool exists for this).

**Gate:** "Function source ready and the App Functions tab in the Portal shows it after a
test publish?"

---

## Step 7 — App-Type-Specific Settings

Branch on the app type from Step 0:

### General App

Needs per-merchant config (API keys, toggles, URLs)? → follow the
**`salla-app-settings`** skill (it uses `salla_settings action=define_form`).

### Communication App

Sends messages on behalf of merchants (WhatsApp, SMS, email):

- Create with `type` = the communication category — **no `sub_category_id`** for
  communication apps.
- **Publish blocker:** you must declare supported features via
  `salla_settings action=set_features` (`sms_local`, `sms_international`, `email_all`,
  `whatsapp`) **before** publishing — submitting without them returns 403.
- Full flow (channels, payloads, delivery status) → **`salla-communication-app`** skill.

### Shipping App

Integrates a carrier or fulfillment provider:

- Must be **Public** — Shipping Apps cannot be Private.
- Follow the **`salla-shipping-app`** skill (it uses `salla_shipping` for zones/settings
  and `salla_apps` for the full lifecycle).

---

## Step 8 — Test & Publish

1. **Test on a demo store.** List the company's demo stores with
   `salla_apps action=demo_stores`, `app_id`. Each store returns:
   - `connected` — `true` means the app is already installed on that store.
   - `install_url` — open in a browser to **install** the app on that store.
   - `dashboard_url` — auto-login to that store's admin (to open the embedded dashboard,
     change settings, etc.).
   - `url` — storefront preview (to verify snippets/urgency signals on product pages).

   Pick a store, open its `install_url` to install, then `dashboard_url` to manage it, and
   trigger each subscribed event to verify end-to-end behavior. Surface these links to the
   user. You can also open the app itself in the Portal:
   `https://portal.salla.partners/apps/{app_id}`.

2. Move the app to live when ready: `salla_apps action=set_status`, `status: "live"`.
3. Submit for review: `salla_apps action=publish`, `app_id` (set `private: true` for a
   private-publish; optional `update_note`). Payload facts (verified):
   - `action` is **always required**: `"save"` (draft) or `"submit"` (full validation).
   - **`save` is NOT fully lenient** — it still requires `name: {en, ar}` and
     `short_description: {en, ar}` (bilingual nested objects). Heavier fields (logo id,
     screenshots, plans, etc.) are only required at `submit`.
   - `name`, `short_description`, and other user-facing text are bilingual nested objects:
     `{en: "…", ar: "…"}` — not flat strings.
   - Upload media first via `salla_upload` → integer image IDs: `logo` (≥ 250×250, 1:1)
     and `screenshots` as `[{image: id}]`, **min 3** (required at submit).
   - `categories` and `main_category_id` are **main** categories (`type=app` from
     `salla_reference`), distinct from the `sub_category_id` used at create time.
   - Publishing **snapshots** the app's current snippets into the publication (with new
     ids), so `salla_apps action=get` shows both the live snippet and its publication
     copy — expected, not a duplicate-bug.
   - Plans **and** addons are defined **inside the publish payload** (`plan_type`,
     `plans`, `addons`) — there is no separate pricing endpoint → **`salla-app-billing`**.
   - `trial_description` is a plain string, **≥ 30 chars**.
   - `support_email` is required when `contact_method = "email"`.
4. **Consistency gate (before submit / review).** Re-read and confirm everything is in
   sync — a config change that isn't re-saved into the publication ships a stale snapshot:
   - `salla_apps action=get` — scopes, webhook/redirect URLs, status are as intended.
   - **Publication draft matches the app** — `publication_last_save.app_settings` (plus
     logo / categories / plans) reflect your latest config; **re-save the publication after
     ANY config change** (settings schema, snippet, scope) or review uses the old snapshot.
   - **No duplicate snippets** — `salla_snippets action=list` shows one per purpose.
   - **Embedded page** — `salla_embedded_pages action=list` URL is reachable and loads.
   - **Webhook ↔ App Function split** is correct (lifecycle/auth on webhooks; store events
     on App Functions where a trigger exists).
   - **Settings save** verified on a real demo store (salla-app-settings save smoke test).

   Full readback → **salla-publication-consistency**; live checks → **salla-live-testing**.

5. Once approved the app is live on https://apps.salla.sa/en.

Testing guide: https://salla.dev/blog/how-to-test-your-app-using-salla-demo-stores/
Publishing guide: https://salla.dev/blog/standards-salla-apps-publications/

**Gate:** "Published — `salla_apps action=get` shows the expected status."

---

## Resources

| Topic                          | Link                              |
| ------------------------------ | --------------------------------- |
| Partners Portal                | https://portal.salla.partners/    |
| Apps Marketplace               | https://apps.salla.sa/en          |
| Webhooks guide + event list    | https://docs.salla.dev/421119m0   |
| App Events (lifecycle)         | https://docs.salla.dev/doc-421413 |
| Salla Admin API reference      | https://docs.salla.dev/doc-421117 |
| Developer community (Telegram) | https://t.me/salladev             |
