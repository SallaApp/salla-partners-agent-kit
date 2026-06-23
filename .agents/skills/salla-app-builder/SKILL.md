---
name: salla-app-builder
description: >
  Use when creating a new Salla app or driving any create-to-publish step via the Salla
  Partners MCP — "create a new Salla app", configure scopes/webhooks, or publish. The
  spine; it hands off mechanics to the owning skill: snippets → salla-snippets, embedded
  pages → salla-embedded-app, App Functions → salla-app-functions, settings →
  salla-app-settings, OAuth/tokens → salla-app-auth, webhooks → salla-webhooks, billing →
  salla-app-billing, publish checks → salla-publication-consistency. Type deltas:
  salla-shipping-app, salla-communication-app.
license: Copyright (c) 2026 Salla
metadata:
  authors: Hazem Khaled
  version: 1.0
---

# Salla App Builder — Create an App from Scratch

Build a complete Salla app by **performing the actions**, not just describing them.
Each step calls a Salla Partners MCP tool to do the work. Follow the steps in order —
complete each gate before moving to the next.

**The arc:** **create → configure → publish.** Creating the app is only the first gate —
a created app is **not** published; it still needs scopes, webhooks/events, any UI, then
review before it reaches merchants ([docs.salla.dev/421410m0.md](https://docs.salla.dev/421410m0.md)).
The home for all of this is the **Salla Partners account** (verified) →
[portal.salla.partners](https://portal.salla.partners) → **My Apps**
([docs.salla.dev/421412m0.md](https://docs.salla.dev/421412m0.md)). The MCP tools below
drive that same Portal, so prefer them when connected.

## Tools

These steps drive the **Salla Partners MCP** tools. Each is one tool with an `action`:

| Tool              | What it does                                                                                                                                                                                               |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `salla_reference` | Look up `categories`, `countries`, `cities`                                                                                                                                                                |
| `salla_upload`    | Upload a logo/file → returns a file `id`                                                                                                                                                                   |
| `salla_apps`      | `create` / `update` / `get` / `list` / `connect` (OAuth+webhooks) / `set_status` / `publish_private` (private apps) / `demo_stores` (testing). Public-app publishing uses the separate `app_publish` tool. |
| `salla_scopes`    | `get` valid scope slugs (+ `disabled` / `selected`) / `set` selected scopes (flat `slug → read \| read_write \| ""`)                                                                                       |
| `salla_events`    | `list` subscribable events / `subscribe` an app to slugs                                                                                                                                                   |

> **Prerequisite:** the Salla Partners MCP server must be connected (the tools above
> appear in your tool list). If it isn't, fall back to the Portal at
> https://portal.salla.partners and the inline manual notes. Run the OAuth/login flow
> if a tool returns "Salla session expired — reconnect".

## Step 0 — Discover

Ask before starting:

1. **What does your app do?** (brief description)
2. **App type:** General / Communication / Shipping
3. **Visibility:** Public (App Store) or Private (invite-only)?

These are **two independent choices** ([docs.salla.dev/421410m0.md](https://docs.salla.dev/421410m0.md)):
**Public** apps appear in the [Salla App Store](https://apps.salla.sa/en) for any merchant
to browse, download, or purchase; **Private** apps are built for specific merchants and
never surface in the store's listings or search. **Category** (General vs Shipping) is the
separate axis — a Shipping app may be Public _or_ Private, while Communication apps are
typically Public. Visibility is Portal-enforced per type, so let `create`/publish validate
the combination rather than assuming it.

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
   echoed), so use the returned `id`. If there's no logo at creation and an
   image-generation tool is available, generate one (**1:1, ≥ 250×250**) and upload it —
   full canonical recipe (and every other listing/publication image field + its dimensions)
   → [salla-app-ui-builder](../salla-app-ui-builder/SKILL.md#generating-missing-listing-images-canonical-recipe).
3. **Create the app.** The basic info Salla requires at create is **icon, name, category,
   description, app website, and support email**
   ([docs.salla.dev/421410m0.md](https://docs.salla.dev/421410m0.md)); via the MCP these
   map to the fields below. Call `salla_apps` with `action: "create"` and:

| Field                        | Requirement                                                                                                                                                                                                                                                                                                                                                                                           |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `name` + `name_ar`           | Salla expects the app name in Arabic, in plain letters with no diacritics/tashkeel (e.g. هريفاي, not هرّفاي), and unique across Salla apps. Treat these as Portal-enforced — let `create` validate: submit, then act on the error (rename and resubmit if the name is taken or invalid) rather than pre-checking client-side. Confirm the exact constraints from the `create` response when in doubt. |
| `type`                       | from step 1 (`private` or a public category)                                                                                                                                                                                                                                                                                                                                                          |
| `short_description` (+`_ar`) | 50–200 chars each — bilingual like `name`                                                                                                                                                                                                                                                                                                                                                             |
| `app_url`                    | URL                                                                                                                                                                                                                                                                                                                                                                                                   |
| `email`                      | support email                                                                                                                                                                                                                                                                                                                                                                                         |
| `logo`                       | file `id` from `salla_upload`                                                                                                                                                                                                                                                                                                                                                                         |
| `sub_category_id`            | required when `type` is `app` / `shipping`                                                                                                                                                                                                                                                                                                                                                            |
| `is_paid`                    | optional, boolean                                                                                                                                                                                                                                                                                                                                                                                     |

The result returns the new `app_id` — carry it through every later step. **Open the app in
the Partners Portal to view, configure, and test it:**
`https://portal.salla.partners/apps/{app_id}` (substitute the returned id). Surface this
link to the user after every create. That **App Details** page is the hub for everything
the next steps configure — App Keys (Client ID/Secret, OAuth mode), Scope, Webhooks,
Trusted IPs, App Functions, Settings, Onboarding, Embedded Pages, Snippets, Custom Plans,
Testing, and Publishing ([docs.salla.dev/421410m0.md](https://docs.salla.dev/421410m0.md)).

> **Note on `salla_apps action=update`:** it returns `{"app": {}}` (empty object) on
> success — the Portal does not echo changed fields. Always follow up with
> `salla_apps action=get` to confirm the update was applied.

**Manual fallback:** Portal → **My Apps → Create App**.

**Gate:** "App created — confirm the returned `app_id` (`salla_apps action=get`)." A
created app is **not yet published** ([docs.salla.dev/421410m0.md](https://docs.salla.dev/421410m0.md));
keep going through configure → publish.

---

## Step 2 — OAuth, Scopes & Webhook Connection

> **Default to Easy Mode.** Easy Mode (tokens via the `app.store.authorize` webhook, no
> callback) is the **recommended default for every app** — use it unless there's a concrete
> technical reason it can't work. Custom Mode (an OAuth `/callback` code exchange) is for
> **local dev / Postman during development**; shipping a published app on Custom Mode
> **without a real, justified use case can get it rejected at review**. Mode mechanics →
> [salla-app-auth](../salla-app-auth/SKILL.md).

Configure OAuth and webhooks in **one** `salla_apps action=connect` call. First check the
app's valid scope slugs and current selection:

1. Call `salla_scopes` with `action: "get"` and the `app_id` to read the valid scope slugs,
   their current selection, and any per-app `disabled` flags. (There is **no** scope-catalog
   reference endpoint — `salla_scopes` reads them from the app.) **Least privilege:**
   request only the minimum slugs the app needs, and prefer `read` over `read_write`
   unless the app actually writes — excessive scopes risk review delay/rejection. Sending a
   `disabled` option returns 422, so honour the flags from `get`.
2. Call `salla_apps` with `action: "connect"`, `app_id`, and any of:
   - `scopes` — map of `slug → "read" | "read_write"` (e.g.
     `{"orders": "read", "products": "read"}`). Pass **only** the resource map here —
     `offline_access` belongs in the OAuth authorize URL, not in the `scopes` map.
     (You can also adjust the selection on its own with `salla_scopes action=set`.)
   - `redirect_urls` — OAuth redirect URL(s). **HTTPS-only**; keep the allowlist tight
     (register only the exact callbacks you use).
   - `webhook_url` — your webhook receiver (**HTTPS-only**, must authenticate inbound
     requests via the signature/token strategy below)
   - `webhook_security_strategy` — `"signature"` (recommended) or `"token"`
   - `generate_secret: true` — mints + returns the webhook signing secret. An app already
     has a secret from creation, so this **rotates** it; only pass it when you intend to
     replace the current secret (rotating a secret already live on production traffic
     breaks in-flight verification).
   - `trusted_ips`, `webhook_headers`

   Partial failures come back under `_partial` — re-apply only the failed pieces.

Store the returned **webhook secret** in a secret manager (never in source/repo); it
verifies the HMAC-SHA256 signature on every webhook.
Signature verification + idempotency → **`salla-webhooks`** skill. Token handling
(Easy vs Custom mode, storage, refresh) → **`salla-app-auth`** skill. (Route, don't
reimplement here.)

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

| Domain             | Key events                                                                                                                                                                |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lifecycle (always) | `app.store.authorize`, `app.installed`, `app.uninstalled`, `app.updated`, `app.subscription.started`                                                                      |
| Orders             | `order.created`, `order.updated`, `order.status.updated`                                                                                                                  |
| Products           | `product.created`, `product.updated`, `product.deleted`                                                                                                                   |
| Customers          | `customer.created`, `customer.updated`                                                                                                                                    |
| Shipments          | `shipment.created`, `shipment.cancelled`, `shipment.updated` (async webhooks) — `shipment.creating`/`shipment.cancelling` are sync App Functions (see salla-shipping-app) |

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
The onboarding flow is **optional** and, when present, runs **once per merchant on their
first install**. Common use cases: collecting credentials (e.g. email + password) before
the app activates, gathering store profile info, or configuring settings that cannot be
changed later.

- **Yes** → use `salla_onboarding_steps` (one `action`-driven tool): `action=create` each
  step (`icon`, `title`, `slug` all required; optional `fields`, `sort`, `required`),
  `action=sort` to order them, `action=list`/`delete` to manage. A step with `fields` runs a
  validation Step Function on submit that returns `Resp.success()` (continue) or
  `Resp.error().setFields(...)` (stop + show feedback); validate credentials provider-side
  and store only an encrypted/hashed form. **Full tool params, the `update` revalidation
  rule, the Step Function handler, credential handling, and the completion payload shape:
  load [references/onboarding-steps.md](references/onboarding-steps.md).**
- **No** → skip to Step 6.

---

## Step 6 — App Functions

Ask: "Does your app need serverless handlers triggered by Salla events?"

- **Yes** → follow the **`salla-app-functions`** skill for the App Function source,
  context shape, `Resp` API, and timeouts. App Functions handle **store-event automation**
  (where a trigger exists); lifecycle/auth events stay on webhooks (Step 3, owned by
  **`salla-app-lifecycle`** / **`salla-app-auth`**).

**Save the function with `salla_functions action=save` (`app_id`, `trigger`, `content`,
`name`) — an upsert (create or update).** A saved function is live on the app's demo
stores immediately; it reaches real stores only after the app is published (Step 8). Read
with `salla_functions action=get`, remove with `action=delete`. (`salla_functions` is
operator-gated: it errors clearly if the App Builder service is not enabled on the MCP
deployment.) Details → **`salla-app-functions`**.

**Gate:** "Function saved and working on a demo store?" (Publishing to production is the
later dedicated publish step — not here.)

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

- Typically **Public**; if you target Private, let `create`/publish validate the
  visibility rather than assuming it is allowed.
- Follow the **`salla-shipping-app`** skill (it uses `salla_shipping` for zones/settings
  and `salla_apps` for the full lifecycle).

---

## Step 8 — Test, Validate the Draft & Hand Off to the Partner

### Public app vs Private app — how each publishes

**Decide the path by app type before publishing — they do not share a flow:**

- **If `type` is `private`** (installed only by specific merchant(s) via a private
  request) → **direct one-shot publish**: call `salla_apps action=publish_private`
  (`app_id`; `update_note` **required only when it's an update**) →
  `POST /app/{id}/private-publish`. This snapshots the app's current config (snippets,
  webhooks, scopes) and publishes to the target merchant(s). There is **no public listing,
  no stepwise onboarding, and no readiness sections** — skip Steps 3–7's publication
  sections entirely. **Prerequisites (Portal-enforced):** the app must be `type: private`
  and in **DEVELOPMENT**, the company must be **ID-verified**, and the app must not already
  be submitted. Free private apps may be capped by a `private_apps_limit` — exceeding it
  returns `free_private_apps_disabled` (403). Let `publish_private` validate these and act
  on the error.
- **Else (a public app — App Store, any merchant can discover/install)** → the **stepwise
  `app_publish` onboarding** in sub-steps 1–4 below: `open` → guided `set` per section →
  `app_publish action=validate` (validates + saves a DRAFT) → guide the partner to submit
  one-click in the Portal. This needs the full public listing (categories, pricing,
  screenshots, benefits, contact, etc.). Mechanics → **follow
  [salla-publication-consistency](../salla-publication-consistency/SKILL.md)**.

**Gate:** "Is `type` `private`? → publish with `salla_apps action=publish_private`
(`update_note` on updates), confirm ID-verification + DEVELOPMENT status, and STOP — do not
run the public onboarding. Otherwise continue with the public `app_publish` flow below."

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
3. **Validate + save the draft.** The agent's terminal publish action is **validate**, not
   submit — it validates every section, **saves a DRAFT**, and stops there. Use the guided
   path:

   - **Primary — guided, stepwise `app_publish`:** `open` → (set `<section>` →
     `readiness`)\* → `validate`. `open` creates the draft (and unlocks `app_page_builder`
     for the listing page); then for each of the 5 sections (`basic_information`,
     `features`, `pricing`, `contact_information`, `service_trial`) call `set`, re-check
     `readiness`, and fix one section at a time off the returned `missing` list until every
     section reads `complete`; then run `app_publish action=validate` to validate and save
     the draft. **First-time publish is a guided onboarding, not a blind fill:** the sections
     carry the partner's business decisions (listing copy, categories, pricing, contact) —
     ask the partner per section, suggest Salla-grounded options, and fill from their
     answers; never auto-invent them. **Section fields, the guided-onboarding rule, the
     listing-image rule, and the Portal hand-off →
     [salla-publication-consistency](../salla-publication-consistency/SKILL.md)** (follow it
     for the mechanics).
     The same server-side gate (`app_publish action=validate`) runs and returns **422** with the
     still-missing sections if it isn't ready. Listing content
     (name/description/logo/screenshots/benefits) is written via `app_page_builder` →
     [salla-app-ui-builder](../salla-app-ui-builder/SKILL.md); plan/addon pricing →
     [salla-app-billing](../salla-app-billing/SKILL.md).

4. **Partner reviews, then send the publish request.** `validate` only saves a DRAFT. After a
   clean validate, give the partner their real `/publish` link with the app's actual id
   substituted (never the placeholder): `https://portal.salla.partners/apps/{app_id}/publish`
   (e.g. `.../apps/1234567/publish`) and ask them to **review** the draft there. It goes to
   Salla review only **either** when they submit one-click in the Portal **or**, after they
   **explicitly confirm**, when you call `app_publish action=send_publish_request` (`confirm:
true`) — **never before** review + confirmation. Once submitted and approved it's live on
   https://apps.salla.sa/en. Mechanics → **salla-publication-consistency**.

Testing guide: references/demo-store-testing.md

**Gate:** "Sections validated + saved as a draft, the partner reviewed the real `/publish`
link, and the publish request is sent only on their one-click submit or explicit confirmation?"

### Red Flags — publishing

| Tempting thought                                                                      | Why it's wrong                                                                                                                                                                                               |
| ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| "It's a private app, I'll run the public `app_publish` onboarding to publish it."     | Private apps don't use the stepwise listing flow. Publish with `salla_apps action=publish_private` (one call, `update_note` on updates) — no sections, no listing.                                           |
| "I'll `app_publish action=submit` / push the private app through the readiness gate." | A private app has no public listing to validate. The private path is `publish_private` → `POST /app/{id}/private-publish`; the public `validate` gate doesn't apply.                                         |
| "Private publish keeps failing — I'll retry."                                         | Check the prerequisites: `type: private` + DEVELOPMENT, company **ID-verified**, not already submitted; a `free_private_apps_disabled` 403 means the `private_apps_limit` is hit. Act on the specific error. |

---

## Resources

| Topic                          | Link                               |
| ------------------------------ | ---------------------------------- |
| Get Started                    | https://docs.salla.dev/421412m0.md |
| Create Your First App          | https://docs.salla.dev/421410m0.md |
| Partners Portal                | https://portal.salla.partners/     |
| Apps Marketplace               | https://apps.salla.sa/en           |
| Webhooks guide + event list    | https://docs.salla.dev/421119m0.md |
| App Events (lifecycle)         | https://docs.salla.dev/421413m0.md |
| Salla Admin API reference      | https://docs.salla.dev/421117m0.md |
| Developer community (Telegram) | https://t.me/salladev              |
