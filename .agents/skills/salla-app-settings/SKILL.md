---
name: salla-app-settings
description: >
  Per-merchant settings for a Salla app. Use when designing a settings schema, registering
  the form, or reading/writing merchant config. Covers the salla_settings form + optional
  Validation URL, supported-features declaration (publish-blocker for communication apps),
  seeding defaults on install, value read/write (POST is a full replace — send ALL keys),
  reacting to app.settings.updated (activates the app AND is the storage source of truth),
  and context.settings in App Functions. Admin API → salla-api-core; lifecycle →
  salla-app-lifecycle.
---

# Salla App Settings Flow

Set up per-merchant configuration for a Salla app by **performing the actions** with the
Salla Partners MCP tools. Follow the steps in order — complete each gate before moving on.

> **Applies to public, private, and communication apps.** The merchant settings form
> (`salla_settings define_form` / `set_validation_url`) is for these app types. **Shipping
> apps have no merchant settings form** — they configure shipping via `salla_shipping`
> (zones/settings), a separate concept; the Portal rejects `POST /settings` for a shipping
> app. For a shipping app go to [salla-shipping-app](../salla-shipping-app/SKILL.md).

> **Critical rule:** at runtime, always send ALL keys on every settings POST. Omitting a
> key sets it to `null` — there is no partial update.

## Red Flags

| Tempting thought                                        | Why it's wrong                                                                                                                                                                                    |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "Define a `salla_settings` form for this shipping app." | Shipping apps have no merchant settings form; the Portal rejects `POST /settings` for them. Configure zones/settings via `salla_shipping` → [salla-shipping-app](../salla-shipping-app/SKILL.md). |

## Tools

| Tool             | Action               | What it does                                        |
| ---------------- | -------------------- | --------------------------------------------------- |
| `salla_settings` | `define_form`        | Register the merchant settings form (field objects) |
| `salla_settings` | `set_validation_url` | Set the server-side Validation URL                  |
| `salla_settings` | `list_features`      | Read the app's supported features                   |
| `salla_settings` | `set_features`       | Set supported features                              |

> **Prerequisite:** the Salla Partners MCP server must be connected. Every action needs
> the app's `app_id`. If a tool returns "Salla session expired", re-run the login flow.

---

## Step 0 — Discover

Ask before starting:

1. **What merchant inputs does your app need?** (API keys, URLs, toggles, numbers?)
2. **Do you need server-side validation** before Salla saves the values?
3. **When are settings first written?** On install, or when the merchant fills the form?

---

## Step 1 — Design the Settings Schema

Salla renders the merchant form from a **form-builder schema**: every field uses a real
`type` **+** `format` pair from the taxonomy below. Use a real pair (a bare alias like
`toggle` / `text` / `select` is not Portal-safe). Rules:

- **Flat only** — no nested objects.
- **`id` is snake_case** (`stock_threshold`, not `stockThreshold`) — the installed-app save
  path is reliable only with snake_case.
- **Every required field carries a default `value`** — required for first activation/save.
- **Arabic-first labels.** Most Salla merchants are Arabic — write `label` / `description`
  in Arabic; set `multilanguage: true` to also provide English. `multilanguage` applies to
  string `text` / `textarea` fields only (the builder gates it via
  `supportsMultilanguage`).
- `public: true` marks a value safe to read client-side. A storefront snippet reads a
  public setting via `salla.config.get('app.<key>')`; `public: false` values stay
  server-side only. → [salla-snippets](../salla-snippets/SKILL.md).
- **Secrets** (API keys, passwords, tokens) use `format: "password"`, stored encrypted at
  runtime and read only server-side or via `context.settings`. A password field is
  inherently non-public — the builder's password control carries `hide: true`, which removes
  the public option, so a secret can never be exposed to the storefront (keep `public: false`
  to make the intent explicit). OAuth/merchant access tokens are not settings — handle those
  via [salla-app-auth](../salla-app-auth/SKILL.md).
- **Scopes.** Rendering a form or receiving `app.settings.updated` needs no settings scope;
  a settings scope is required only to read/write values via the Admin API when activation
  happens partner-side (not from the merchant dashboard). The **Webhooks** scope is
  required if your app listens to any store events.

Use this **curated core** of `type` + `format` pairs:

| `type`                   | `format` (core)                                        |
| ------------------------ | ------------------------------------------------------ |
| `boolean`                | `checkbox` (a `switch` is the same boolean, toggle UI) |
| `string`                 | `text`, `textarea`, `password`, `url`, `email`         |
| `string` (value pickers) | `color`, `image`, `date`, `time`, `datetime`           |
| `number`                 | `integer`, `float`                                     |
| `items`                  | `dropdown-list`, `radio-list`, `checkbox-list`         |

**Prefer the simplest type that fits the data.** A `number` (with `minimum` / `maximum` /
`step`) covers what a slider or unit-input would do — don't reach for those. `checkbox`
covers on/off (a `switch` is the same boolean). Use `textarea` for multi-line text.

**Advanced formats exist but add complexity — avoid unless genuinely required:** `richtext`
(use `textarea` unless rich formatting is essential), `code`, `icon`, the nested
`collection` type (repeatable sub-field groups), and `static` display blocks
(`title` / `description` / `line`). Prefer the core; only use these when the use case truly
needs them.

Common props: `id` (snake_case), `type`, `format`, `label`, `value` (default),
`required`, `public`, `icon`, `placeholder`, `labelHTML`, `multilanguage`. Numbers carry
`minimum` / `maximum` / `step`; strings carry `minLength` / `maxLength`; `items` carry
`options` plus a scalar default `value`. `multilanguage` applies to string `text` /
`textarea` only. Example checkbox:

```json
{
  "id": "hurrify_enabled",
  "type": "boolean",
  "format": "checkbox",
  "label": "تفعيل هيرفاي",
  "icon": "sicon-toggle-off",
  "value": true,
  "required": false,
  "public": true
}
```

Field-object reference → [`references/form-builder.md`](references/form-builder.md)

Where the field schema is documented (the OpenAPI block in its `docs.salla.dev/<id>.md`
page — find it via **salla-docs**), validate each field object against it — `type`/`format`
pairs, `required`, enums — and fix before `define_form`, via the read-schema → build →
validate → fix → retry loop in **salla-api-core**.

**Gate:** "Every field uses `type`+`format`, snake_case ids, Arabic labels, and a default
value on each required field?"

---

## Step 2 — Register the Form

1. Call `salla_settings` with `action: "define_form"`, the `app_id`, and `settings` (the
   array of field objects from Step 1). Give each field a plain-string `label`; set
   `multilanguage: true` on a string `text` / `textarea` field whose text should be
   translated.
2. **Optional Validation URL — validation only, not storage.** To reject bad input before
   Salla saves it, call `salla_settings` with `action: "set_validation_url"`, `app_id`, and
   `validation_url`. Salla POSTs the proposed values there before saving; respond with field
   errors (to block) or `200 OK` (to allow). It is a **public endpoint with no signature** —
   validate the values and respond, nothing more. Storage happens via the
   `app.settings.updated` webhook (Step 4). Contract →
   [`references/form-builder.md`](references/form-builder.md).

**Manual fallback:** Portal → open the app → **App Settings** form builder.

**Gate (save smoke test):** "Form registered — install the app on a demo store
(`salla_apps action=demo_stores` → open a store's `install_url`, then `dashboard_url`),
open its settings page, **change a value and SAVE**, and confirm it persists. The Portal
accepting the schema is NOT proof the installed-app form saves — test the real save."

**Validate config usage (this skill owns the contract).** The **public** fields you define
here ARE the keys a storefront snippet can read via `salla.config.get('app.<key>')`. After
every `define_form`, confirm: (a) the field schema is valid (the `type`+`format` /
snake_case / required-default checks in Step 1), and (b) every `salla.config.get('app.<key>')`
your snippets read maps to a field defined here with `public: true` — a missing or private
key reads `undefined` on the storefront. Settings own the contract; the browser-side check
of those reads lives in [salla-snippets](../salla-snippets/SKILL.md).

---

## Step 3 — Declare Supported Features

Optional for most apps — **required before publish for communication apps** (channel
declaration; see [salla-communication-app](../salla-communication-app/SKILL.md)).
Manage the flags with the tool:

- Read current: `salla_settings action=list_features`, `app_id`. **Note:** returns 404
  for non-communication apps — this is expected; `list_features` is only meaningful for
  communication-type apps.
- Set them: `salla_settings action=set_features`, `app_id`, `features: [...]`.

---

## Step 4 — Write Defaults on Install (runtime)

There is no MCP tool for writing per-merchant **values** — that happens at runtime with
the merchant's `access_token`. When `app.store.authorize` fires on install, seed any
required defaults so the merchant starts with a working configuration.

> **`app.settings.updated` is the storage source of truth**
> ([docs](https://docs.salla.dev/421413m0.md)). It fires when the merchant saves the form,
> **activates** the app, and carries the full settings in `data.settings` — persist THAT on
> every activation/update. It is authoritative (and may arrive before you hold a token), so
> rely on it rather than a GET. Payload:
>
> ```json
> {
>   "event": "app.settings.updated",
>   "merchant": 1234509876,
>   "data": {
>     "id": 6789012345,
>     "app_type": "public",
>     "settings": {
>       "door_to_door": true,
>       "pickup_time": "09:00:00",
>       "box_size": ["25x25", "10x10"],
>       "ads_activated": "true"
>     }
>   }
> }
> ```
>
> Note booleans may arrive as the string `"true"` — coerce defensively. Wiring →
> [salla-app-lifecycle](../salla-app-lifecycle/SKILL.md).

Seed defaults on install (handle even if you only re-read the values):

```http
POST https://api.salla.dev/admin/v2/apps/{app_id}/settings
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "api_key": "",
  "fast_delivery": false,
  "contact_no": null
}
```

Send every key — even empty values. Full install pattern →
[`references/settings-patterns.md`](references/settings-patterns.md)

---

## Step 5 — Read & Update Settings (runtime)

**Read:**

```http
GET https://api.salla.dev/admin/v2/apps/{app_id}/settings
Authorization: Bearer {access_token}
```

```json
{
  "status": 200,
  "success": true,
  "data": {
    "app_id": "513499943",
    "settings": { "api_key": "sk-abc123", "fast_delivery": true }
  }
}
```

**Update the form definition** (fields, formats, defaults, Validation URL) **via the
Partners MCP only** — `salla_settings action=define_form`. That is the one supported way
to change the schema; there is no Portal-side hand-edit you should script around.

**Update per-merchant values** (runtime) **— always send every key** (read first, merge
your change, write all):

```http
POST https://api.salla.dev/admin/v2/apps/{app_id}/settings
Authorization: Bearer {access_token}
Content-Type: application/json

{ "api_key": "sk-abc123", "fast_delivery": true, "contact_no": 50 }
```

> The POST **response body doesn't matter** — don't parse or rely on what it echoes back.
> Treat a 2xx as accepted, then confirm by a follow-up GET (or by the
> `app.settings.updated` webhook, which is the storage source of truth).

API spec → [`references/api-spec.md`](references/api-spec.md) ·
Safe single-key update → [`references/settings-patterns.md`](references/settings-patterns.md)

**Gate:** "POST a full settings object and confirm GET returns the updated values."

---

## Step 6 — Access Settings in App Functions

Inside any App Function, settings are on the context object — no API call needed:

```ts
export default async function (context: AppContext) {
  const apiKey = context.settings?.api_key;
  const fastDelivery = context.settings?.fast_delivery;
  // always use optional chaining — undefined until merchant configures them
}
```

App Functions context shape → [`salla-app-functions`](../salla-app-functions/SKILL.md)

---

## Resources

| Topic                      | Link                               |
| -------------------------- | ---------------------------------- |
| Build an App Settings form | references/form-builder.md         |
| Salla Admin API reference  | https://docs.salla.dev/421117m0.md |
