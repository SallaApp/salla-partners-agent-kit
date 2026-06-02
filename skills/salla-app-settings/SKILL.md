---
name: salla-app-settings
description: >
  Use this skill whenever building, reading, or updating the merchant settings form for a Salla app —
  including designing the settings schema, fetching current values (GET), writing updated values (POST),
  and wiring up a validation URL. Invoke it for tasks like "add an API key setting", "read merchant
  settings", "update all settings on install", or "validate settings before saving".
license: Copyright (c) 2026 Salla
metadata:
  authors: Ilyas
  version: 1.0
---

# Salla App Settings

App Settings are custom per-merchant parameters defined by the app developer. They are stored by Salla and accessible from App Functions and the Partners Portal.

## Key Constraint

> **Always send ALL keys on every POST.** Omitting a key sets it to `null` — there is no partial update.

## Workflow

### Step 1 — Design the Settings Schema

Define what fields your app needs from the merchant. Common types:

| Type | Example field |
| --- | --- |
| `string` | API key, endpoint URL, email |
| `string` (secret) | Password, secret token |
| `number` | Contract number, timeout (seconds) |
| `boolean` | Feature toggle, fast delivery enabled |

Keep the schema flat — nested objects are not supported.

### Step 2 — Build the Settings Form

Register the form in the **Partners Portal** under **App Settings**. Set a **Settings Validation URL** if you need to validate values server-side before Salla saves them.

Guide: https://salla.dev/blog/how-to-build-app-settings-form/

### Step 3 — Read Settings (GET)

Call `GET /apps/{app_id}/settings` to retrieve current merchant values.

```http
GET https://api.salla.dev/admin/v2/apps/513499943/settings
Authorization: Bearer {access_token}
```

```json
{
  "status": 200,
  "success": true,
  "data": {
    "app_id": "513499943",
    "app_slug": "my-app",
    "settings": {
      "email": "merchant@store.sa",
      "fast_delivery": true
    }
  }
}
```

### Step 4 — Write Settings (POST)

Call `POST /apps/{app_id}/settings` to update. **Send every key, every time.**

```http
POST https://api.salla.dev/admin/v2/apps/513499943/settings
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "email": "merchant@store.sa",
  "password": "secret123",
  "fast_delivery": true,
  "contact_no": 50
}
```

### Step 5 — Access Settings in App Functions

Inside an App Function, read settings from the context object:

```ts
export default async function (context: AppContext) {
  const { email, fast_delivery } = context.settings;
  // use settings in your logic
}
```

See [App Functions reference](../salla-app-builder/references/app-functions.md) for the full context shape.

## When to read the reference files

- [API Spec](references/api-spec.md) — GET and POST endpoint details, request/response schemas, error codes.
- [Form Builder](references/form-builder.md) — supported field types, full JSON schema example, Validation URL request/response contract, bilingual label requirements, and the install flow from merchant click to stored value.
- [Settings Patterns](references/settings-patterns.md) — reading settings in App Functions, fetching server-side, writing defaults on install, safely updating a single key (read-all → merge → write-all), validating signature on incoming requests, and settings behaviour across the app lifecycle.

## Resources

| Topic | Link |
| --- | --- |
| Build an App Settings form | https://salla.dev/blog/how-to-build-app-settings-form/ |
| Salla Admin API reference | https://docs.salla.dev/doc-421117 |
