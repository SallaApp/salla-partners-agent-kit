# App Settings Values API (runtime — not an MCP tool)

This is the **runtime, per-merchant values** API: your deployed app's backend calls it
with **each merchant's OAuth access token** (delivered via `app.store.authorize`). It
cannot be an MCP tool — the Partners MCP authenticates as the partner and never holds
merchant tokens. Don't confuse it with defining the settings **form schema**, which IS
an MCP action (`salla_settings action=define_form`, Partner API).

Base URL: `https://api.salla.dev/admin/v2`
Auth: the **merchant's** Bearer token (OAuth2). The `offline_access` scope is only needed
when you must call these endpoints **in the background** (with a refresh token) outside an
active merchant session — not for the call itself. Request the minimum scopes your app
needs. Acquiring and refreshing the token → [salla-app-auth](../../salla-app-auth/SKILL.md).

## How these endpoints fit the settings model

There are three moving parts, each with one owner — these endpoints are the **read/write
of per-merchant values**, not a replacement for the other two:

| Concern                                                      | Owner                                                                                                        |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| **Form definition** (fields, types, defaults)                | Partners MCP `salla_settings action=define_form` (Partner API) — the only supported way to add/change fields |
| **Storage / source of truth** for the values merchants enter | the `app.settings.updated` webhook ([docs](https://docs.salla.dev/421413m0.md)) — persist what it delivers   |
| **Reading / writing those values via API**                   | the GET / POST endpoints below                                                                               |

So: you define the form once via the MCP; merchants fill it in and Salla pushes the
authoritative values to your `app.settings.updated` webhook; these GET/POST endpoints let
your backend **read** or **write** values programmatically. The field names in every payload
below come from **your app's own form definition**, not a fixed list. The Validation URL
Salla calls before saving is public (no signature) — see [form-builder.md](./form-builder.md).

> **Secrets** (API keys, passwords, tokens): use `format: "password"` with `public: false`,
> store the values encrypted, never log a raw settings object, never return them to client
> code.

---

## GET /apps/{app_id}/settings

Fetch the current settings values for a specific merchant's store.

Source: [App Setting Details](https://docs.salla.dev/5401096e0.md)
(`get-apps-app_id-settings`).

**Path parameter:** `app_id` (integer) — found in Salla Partners → My Apps → Your App
(example: `513499943`).

**Security:** `oauth21` with `offline_access` (background reads).

### Response 200 (`AppSettingsBodyResponse`)

```json
{
  "status": 200,
  "success": true,
  "data": {
    "app_id": "513499943",
    "app_slug": "allrights",
    "settings": {
      "email": "test@store.sa",
      "password": "123456789",
      "contact_no": 50,
      "fast_delivery": true
    }
  }
}
```

| Field           | Type    | Description                                             |
| --------------- | ------- | ------------------------------------------------------- |
| `status`        | number  | Response status code                                    |
| `success`       | boolean | Whether the response succeeded                          |
| `data.app_id`   | string  | Salla App ID, provided by Salla                         |
| `data.app_slug` | string  | Salla App Slug, provided by Salla                       |
| `data.settings` | object  | The merchant's values, keyed by your form's field names |

The keys inside `data.settings` (`email`, `password`, `contact_no`, `fast_delivery` above)
are illustrative of one app's form — yours will differ.

### Response 403 / 404 (`NotFoundResponse`)

```json
{
  "success": false,
  "status": 404,
  "error": {
    "code": 404,
    "message": "The content you are trying to access is no longer available"
  }
}
```

Likely causes: the app is not installed on this merchant's store, the token lacks the
required scope, the token is expired (refresh it — see
[salla-app-auth](../../salla-app-auth/SKILL.md)), or the app is inactive (the merchant has
not yet activated it via the settings form).

---

## POST /apps/{app_id}/settings

Update settings for a specific merchant's store.

Source: [Update App Settings](https://docs.salla.dev/5401097e0.md)
(`post-apps-app_id-settings`).

> **Critical:** You **must** pass ALL settings keys on every update — even if only one
> value changed. Passing only the key you need to update will cause the other values to
> become `null` (data loss).

**Path parameter:** `app_id` (integer)

**Security:** `oauth21` with `offline_access` (background writes).

### Request body (`UpdateAppSettingsBodyRequest`)

```json
{
  "email": "test@salla.sa",
  "password": "3534543534",
  "fast_delivery": true,
  "contact_no": 50
}
```

| Field           | Type    | Description                  |
| --------------- | ------- | ---------------------------- |
| `email`         | string  | Custom app setting parameter |
| `password`      | string  | Custom app setting parameter |
| `fast_delivery` | boolean | Custom app setting parameter |
| `contact_no`    | number  | Custom app setting parameter |

These keys are illustrative of one app's form — send **your** form's full field set.

### Response 200

The docs return the same `UpdateAppSettingsBodyRequest` shape as a 200, but the **response
body doesn't matter** — don't parse or depend on what it echoes. Treat a 2xx as accepted,
then confirm the write with a follow-up `GET` (or rely on the `app.settings.updated`
webhook, which is the storage source of truth —
[docs](https://docs.salla.dev/421413m0.md)).

### Response 403 (`NotFoundResponse`)

```json
{
  "success": false,
  "status": 403,
  "error": { "code": 403, "message": "..." }
}
```

---

## Schema Summary

| Schema                         | Used by                               |
| ------------------------------ | ------------------------------------- |
| `AppSettingsBodyResponse`      | GET 200 response                      |
| `UpdateAppSettingsBodyRequest` | POST request body + POST 200 response |
| `NotFoundResponse`             | GET 403/404 and POST 403 responses    |

---

## Resources

| Topic                             | Link                                |
| --------------------------------- | ----------------------------------- |
| How to build an App Settings form | form-builder.md                     |
| App Setting Details (GET)         | https://docs.salla.dev/5401096e0.md |
| Update App Settings (POST)        | https://docs.salla.dev/5401097e0.md |
| Salla Admin API reference         | https://docs.salla.dev/421117m0.md  |
