---
name: salla-app-settings
description: >
  Per-merchant settings for a Salla app: design the schema, register the form and
  Validation URL via the salla_settings tool, declare supported features (publish-
  blocker for communication apps), seed defaults on install, read/write values (POST is
  a full replace — always send ALL keys), react to app.settings.updated (the event that
  activates the app), and read context.settings inside App Functions. Admin API
  mechanics → salla-api-core; lifecycle wiring → salla-app-lifecycle.
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

Define the fields based on Step 0. Keep the schema **flat** — nested objects are not
supported. Each field is an object (`id`, `label`, `type`, …); `label` / `placeholder` / `description` are **bilingual objects `{en, ar}`** — the API fails when a variant is missing.

| Type              | Example field                         |
| ----------------- | ------------------------------------- |
| `string`          | API key, endpoint URL, email          |
| `string` (secret) | Password, secret token                |
| `number`          | Contract number, timeout              |
| `boolean`         | Feature toggle, fast delivery enabled |

Field-object reference → [`references/form-builder.md`](references/form-builder.md)

**Gate:** "Do you have a complete list of setting keys and their types?"

---

## Step 2 — Register the Form

1. Call `salla_settings` with `action: "define_form"`, the `app_id`, and `settings` (the
   array of field objects from Step 1). Provide bilingual labels (English + Arabic) on
   each field.
2. If you need server-side validation, call `salla_settings` with
   `action: "set_validation_url"`, `app_id`, and `validation_url`. Salla POSTs the values
   there before saving — respond with field errors or `200 OK`.

**Manual fallback:** Portal → open the app → **App Settings** form builder.

**Gate:** "Form registered — open the app settings page from a demo store and confirm
merchants see the fields."

---

## Step 3 — Declare Supported Features

Optional for most apps — **required before publish for communication apps** (channel
declaration; see [salla-communication-app](../salla-communication-app/SKILL.md)).
Manage the flags with the tool:

- Read current: `salla_settings action=list_features`, `app_id`.
- Set them: `salla_settings action=set_features`, `app_id`, `features: [...]`.

---

## Step 4 — Write Defaults on Install (runtime)

There is no MCP tool for writing per-merchant **values** — that happens at runtime with
the merchant's `access_token`. When `app.store.authorize` fires on install, seed any
required defaults so the merchant starts with a working configuration. Note:
`app.settings.updated` (fired when the merchant saves the form) is what **activates**
the app — handle it even if you only re-read the values:

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

**Update — always send every key** (read first, merge your change, write all):

```http
POST https://api.salla.dev/admin/v2/apps/{app_id}/settings
Authorization: Bearer {access_token}
Content-Type: application/json

{ "api_key": "sk-abc123", "fast_delivery": true, "contact_no": 50 }
```

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

App Functions context shape → [`salla-app-builder`](../salla-app-builder/SKILL.md)

---

## Resources

| Topic                      | Link                                                   |
| -------------------------- | ------------------------------------------------------ |
| Build an App Settings form | https://salla.dev/blog/how-to-build-app-settings-form/ |
| Salla Admin API reference  | https://docs.salla.dev/doc-421117                      |
