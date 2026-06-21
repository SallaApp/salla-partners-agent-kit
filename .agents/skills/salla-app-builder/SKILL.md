---
name: salla-app-builder
description: >
  End-to-end flow to create, configure, and publish a Salla app via the Salla Partners
  MCP — create, connect OAuth scopes + webhook, subscribe events, then branch to the
  owning skill and publish. Use for "create a new Salla app" or any create-to-publish
  step. Hand off mechanics: snippets → salla-snippets, embedded pages → salla-embedded-app,
  App Functions → salla-app-functions, settings → salla-app-settings, tokens/OAuth →
  salla-app-auth, webhook verification → salla-webhooks, billing → salla-app-billing.
  Type deltas: salla-shipping-app, salla-communication-app.
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

| Tool              | What it does                                                                                                           |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `salla_reference` | Look up `categories`, `countries`, `cities`                                                                            |
| `salla_upload`    | Upload a logo/file → returns a file `id`                                                                               |
| `salla_apps`      | `create` / `update` / `get` / `list` / `connect` (OAuth+webhooks) / `set_status` / `publish` / `demo_stores` (testing) |
| `salla_scopes`    | `get` valid scope slugs (+ `disabled` / `selected`) / `set` selected scopes (flat `slug → read \| read_write \| ""`)   |
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

These are **two independent choices** ([docs.salla.dev/421410m0.md](https://docs.salla.dev/421410m0.md)):
**Public** apps appear in the [Salla App Store](https://apps.salla.sa/en) for any merchant
to browse, download, or purchase; **Private** apps are built for specific merchants and
never surface in the store's listings or search. **Category** (General vs Shipping) is the
separate axis — a Shipping app may be Public _or_ Private (Communication apps are Public).

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
3. **Create the app.** The basic info Salla requires at create is **icon, name, category,
   description, app website, and support email**
   ([docs.salla.dev/421410m0.md](https://docs.salla.dev/421410m0.md)); via the MCP these
   map to the fields below. Call `salla_apps` with `action: "create"` and:

| Field                        | Requirement                                                                                                                                                                                                                                                                                                                                                       |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `name` + `name_ar`           | The app name **must be Arabic** and **must be globally unique** (a name that does not already exist across **all** Salla apps). Plain Arabic letters with NO diacritics/tashkeel (e.g. هريفاي, not هرّفاي). **Do not pre-validate uniqueness client-side** — submit `create` and handle the Portal's validation error (rename and resubmit if the name is taken). |
| `type`                       | from step 1 (`private` or a public category)                                                                                                                                                                                                                                                                                                                      |
| `short_description` (+`_ar`) | 50–200 chars each — bilingual like `name`                                                                                                                                                                                                                                                                                                                         |
| `app_url`                    | URL                                                                                                                                                                                                                                                                                                                                                               |
| `email`                      | support email                                                                                                                                                                                                                                                                                                                                                     |
| `logo`                       | file `id` from `salla_upload`                                                                                                                                                                                                                                                                                                                                     |
| `sub_category_id`            | required when `type` is `app` / `shipping`                                                                                                                                                                                                                                                                                                                        |
| `is_paid`                    | optional, boolean                                                                                                                                                                                                                                                                                                                                                 |

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
   - `generate_secret: true` — mints + returns the webhook signing secret. An app
     already has a secret from creation, so this **rotates** it — don't regenerate if
     the current secret is already deployed and in use.
   - `trusted_ips`, `webhook_headers`

   Partial failures come back under `_partial` — re-apply only the failed pieces.

Store the returned **webhook secret** in a secret manager (never in source/repo); it
verifies the HMAC-SHA256 signature on every webhook. Don't `generate_secret` again once a
secret is live on production traffic — rotating it breaks in-flight verification.
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

- **Yes** → use `salla_onboarding_steps` (one tool, `action`-driven):

  1. **Create each step** — `action=create`, `app_id`, with:
     - `icon`, `title`, `slug` — **all required**. `title` is the step label shown to the
       merchant; `slug` is the unique system key you reference later (e.g.
       `api_auth_step`).
     - `fields` (optional) — the step's form inputs. Each field's **unique id** is what
       the completion payload keys the merchant's input under, so set it deliberately.
     - `sort`, `required` (optional) — `required: true` blocks the merchant from
       activating the app until the step is saved.
  2. **Order them** — call `action=sort` with an ordered `steps` id array.
  3. **Manage** — `action=list` reads the app's steps; `action=delete` (`step_id`) removes
     one.
     > `action=update` (`app_id`, `step_id`) is a **full revalidation** — resend `icon`,
     > `title`, and `slug` together; a partial payload 422s. `fields`/`required` optional.

  **Step Function (validation handler).** A step backed by `fields` runs a function when
  the merchant submits it. On completion Salla invokes your handler with an `Onboarding`
  context and expects a `Resp`:

  ```js
  export default async (context: Onboarding): Promise<Resp> => {
    const { fields } = context.payload.data; // merchant input, keyed by field unique id
    if (!fields.email || !fields.password) {
      return Resp.error()
        .setMessage("Authentication not complete")
        .setStatus(422)
        .setFields("Email or password incorrect", {
          email: ["البريد الإلكتروني مطلوب"],
        });
    }
    return Resp.success().setMessage("Authentication complete");
  };
  ```

  - `Resp.success()` lets onboarding **continue**; `Resp.error()` **stops** progression
    and shows validation feedback. `.setFields(message, { field_id: [msg, …] })` renders
    the error directly under that field; validation runs in real time, so keep it fast.
  - **Completion payload (`context`)** — `payload` carries `event`, `merchant`,
    `created_at`, and `data`, where `data` is
    `{ id, app_name, app_description, app_type, step: { slug, sort }, fields: { … } }`
    (`fields` = merchant input keyed by each field's unique id). The top level also has
    `merchant` and an optional `settings` (existing app settings, or `null`). There is
    **no** `iframe_url`, and the inputs live under `data.fields` (not a top-level `fields`).

- **No** → skip to Step 6.

---

## Step 6 — App Functions

Ask: "Does your app need serverless handlers triggered by Salla events?"

- **Yes** → follow the **`salla-app-functions`** skill for the App Function source,
  context shape, `Resp` API, and timeouts. App Functions handle **store-event automation**
  (where a trigger exists); **lifecycle/auth events stay on webhooks** (Step 3) and are
  owned by **`salla-app-lifecycle`** / **`salla-app-auth`** — don't route them here.

**Save the function with `salla_functions action=save` (`app_id`, `trigger`, `content`,
`name`) — an upsert (create or update).** Saving is live on the app's demo stores
immediately; submit the app with `salla_apps action=publish` to release it to real stores
after review. Read with `salla_functions action=get`, remove with `action=delete`.
(`salla_functions` is operator-gated: it errors clearly if the App Builder service is not
enabled on the MCP deployment.) Details → **`salla-app-functions`**.

**Gate:** "Function saved (live on a demo store) and the app submitted for publish for
production?"

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
   private-publish; optional `update_note`). Pass the listing payload in `publication`.
   The Portal's publication flow covers **Basic Information, App Configurations, App
   Features, Pricing, Contact Information, and Service Trial**
   ([docs.salla.dev/421410m0.md](https://docs.salla.dev/421410m0.md)) — the `publication`
   payload spans the same ground. The example shapes below are **illustrative** — confirm
   exact field names/shapes via the Partners MCP tool schema or docs before relying on them:
   - **`publish_action` is always required** (separate from the tool's `action: "publish"`):
     `"save"` drafts the publication, `"submit"` sends it for full-validation review.
   - **`save` is NOT fully lenient** — it still requires `name: {en, ar}` and
     `short_description: {en, ar}` (bilingual nested objects). Heavier fields (logo id,
     screenshots, plans, etc.) are only required at `submit`.
   - `name`, `short_description`, and other user-facing text are bilingual nested objects:
     `{en: "…", ar: "…"}` — not flat strings.
   - Upload media first via `salla_upload` → integer image IDs: `logo` and
     `screenshots` as `[{image: id}]`.
   - `categories` and `main_category_id` are **main** categories (`type=app` from
     `salla_reference`), distinct from the `sub_category_id` used at create time.
   - Plans **and** addons are defined **inside the publish payload** (`plan_type`,
     `plans`, `addons`) — there is no separate pricing endpoint. In the Portal's
     publication flow, **addons appear under Pricing**. → **`salla-app-billing`**.
   - `support_email` is required when `contact_method = "email"`.
4. Once approved the app is live on https://apps.salla.sa/en.

Testing guide: references/demo-store-testing.md

**Gate:** "Published — `salla_apps action=get` shows the expected status."

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
