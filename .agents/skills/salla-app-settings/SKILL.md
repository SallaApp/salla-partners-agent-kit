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

> **Critical rule:** at runtime, always send ALL keys on every settings POST. Omitting a
> key sets it to `null` — there is no partial update.

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

Salla renders the merchant form from a **form-builder schema** (`type` **+** `format`).
Loose aliases (`toggle`, bare `text` / `number` / `select`) **save fine but fail to
render** — the merchant sees broken or empty form-builder output. Always use a real
`type`+`format` pair from the table below. Rules:

- **Flat only** — no nested objects.
- **`id` is snake_case** (`stock_threshold`, not `stockThreshold`). camelCase ids are
  accepted by the API but the installed-app save path is brittle with them.
- **Every required field needs a default `value`** — without one, first activation/save
  can fail.
- **Arabic-first labels.** Most Salla merchants are Arabic — write `label` / `description`
  in Arabic; set `multilanguage: true` to also provide English. Never leave Arabic blank.
- `public: true` marks a value safe to read client-side (storefront / snippet).
- **Secrets stay private and protected.** API keys, passwords, and tokens use
  `format: "password"` and MUST keep `public: false` — never expose them to storefront /
  client code. At runtime, store secret-typed values **encrypted**, and never log raw
  settings (a settings object can carry credentials). OAuth/merchant access tokens are not
  settings — handle those via [salla-app-auth](../salla-app-auth/SKILL.md), and request
  only the minimum scopes you need.
- **Scopes for settings.** You do **not** need a settings scope just to render a form or
  receive `app.settings.updated`. A settings scope is only required when your app reads or
  writes settings values via the Admin API **and** activation happens partner-side (not
  from the merchant dashboard). Separately, the **Webhooks** scope **IS required** if your
  app listens to any store events.

| Control                 | Schema                                                                           |
| ----------------------- | -------------------------------------------------------------------------------- |
| Switch                  | `type: "boolean"`, `format: "switch"`, `value: true`, `icon: "sicon-toggle-off"` |
| Checkbox                | `type: "boolean"`, `format: "checkbox"`                                          |
| Text / email / password | `type: "string"`, `format: "text" \| "email" \| "password"`                      |
| Integer / float         | `type: "number"`, `format: "integer" \| "float"` (+ `minimum`, `maximum`)        |
| Single choice           | `type: "items"`, `format: "radio-list" \| "dropdown-list"` (+ `options`)         |
| Multi choice            | `type: "items"`, `format: "checkbox-list"` (+ `options`)                         |

Common props: `id` (snake_case), `type`, `format`, `label`, `value` (default),
`required`, `public`, `icon`, `placeholder`, `labelHTML`, `multilanguage`. Example switch:

```json
{
  "id": "hurrify_enabled",
  "type": "boolean",
  "format": "switch",
  "label": "تفعيل هيرفاي",
  "icon": "sicon-toggle-off",
  "value": true,
  "required": false,
  "public": true
}
```

Field-object reference → [`references/form-builder.md`](references/form-builder.md)

**Gate:** "Every field uses `type`+`format`, snake_case ids, Arabic labels, and a default
value on each required field?"

---

## Step 2 — Register the Form

1. Call `salla_settings` with `action: "define_form"`, the `app_id`, and `settings` (the
   array of field objects from Step 1). Give each field a plain-string `label`; set
   `multilanguage: true` on any field whose text should be translated.
2. **Optional Validation URL — public validation ONLY, not storage.** If you want to
   reject bad input before Salla saves it, call `salla_settings` with
   `action: "set_validation_url"`, `app_id`, and `validation_url`. Salla POSTs the values
   there before saving; you respond with field errors (to block) or `200 OK` (to allow).
   There is **NO signature on this request** — treat it as a public endpoint, validate
   only, and never use it as your storage trigger. To **store** settings, rely on the
   `app.settings.updated` webhook (Step 4), which is the source of truth
   ([docs](https://docs.salla.dev/421413m0.md)). Contract →
   [`references/form-builder.md`](references/form-builder.md).

**Manual fallback:** Portal → open the app → **App Settings** form builder.

**Gate (save smoke test):** "Form registered — install the app on a demo store
(`salla_apps action=demo_stores` → open a store's `install_url`, then `dashboard_url`),
open its settings page, **change a value and SAVE**, and confirm it persists. The Portal
accepting the schema is NOT proof the installed-app form saves — test the real save."

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
> ([docs](https://docs.salla.dev/421413m0.md)). It fires when the merchant saves the
> form, **activates** the app, and carries the full settings in `data.settings` — persist
> THAT on every activation/update (don't rely solely on a GET; the webhook is authoritative
> and you may not hold a token yet). Payload:
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
