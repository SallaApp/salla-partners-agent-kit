# App Settings Values API (runtime — not an MCP tool)

This is the **runtime, per-merchant values** API: your deployed app's backend calls it
with **each merchant's OAuth access token** (delivered via `app.store.authorize`). It
cannot be an MCP tool — the Partners MCP authenticates as the partner and never holds
merchant tokens. Don't confuse it with defining the settings **form schema**, which IS
an MCP action (`salla_settings action=define_form`, Partner API).

Base URL: `https://api.salla.dev/admin/v2`
Auth: the **merchant's** Bearer token (OAuth2). `offline_access` is only needed when you
must call this **in the background** (with a refresh token) outside an active merchant
session — not for the call itself. Request the minimum scopes your app needs. Acquiring
and refreshing the token → [salla-app-auth](../../salla-app-auth/SKILL.md).

> Field names in the payloads below come from each app's own settings schema, not a fixed
> list. The **form schema** itself is defined and updated through the Partners MCP only
> (`salla_settings action=define_form`) — that is the supported way to change fields,
> formats, and defaults.

> **Secrets:** settings can hold API keys, passwords, and tokens. Never log a raw settings
> object, store secret-typed values **encrypted**, and never return them to client-side
> code.

---

## GET /apps/{app_id}/settings

Fetch the current settings values for a specific merchant's store.

**Path parameter:** `app_id` (integer) — found in Salla Partners → My Apps → Your App.

### Response 200

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

### Response 403 / 404

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

> **Critical:** You **must** pass ALL settings keys on every update — even if only one value changed. Omitting a key sets it to `null`.

**Path parameter:** `app_id` (integer)

### Request body

```json
{
  "email": "test@salla.sa",
  "password": "3534543534",
  "fast_delivery": true,
  "contact_no": 50
}
```

| Field           | Type    | Description              |
| --------------- | ------- | ------------------------ |
| `email`         | string  | Custom setting parameter |
| `password`      | string  | Custom setting parameter |
| `fast_delivery` | boolean | Custom setting parameter |
| `contact_no`    | number  | Custom setting parameter |

### Response 200

The **response body doesn't matter** — don't parse or depend on what it echoes. Treat a
2xx as accepted, then confirm the write with a follow-up `GET` (or via the
`app.settings.updated` webhook, which is the storage source of truth —
[docs](https://docs.salla.dev/421413m0.md)).

### Response 403

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
| `NotFoundResponse`             | GET/POST 403 and 404 responses        |

---

## Resources

| Topic                             | Link                               |
| --------------------------------- | ---------------------------------- |
| How to build an App Settings form | form-builder.md                    |
| Salla Admin API reference         | https://docs.salla.dev/421117m0.md |
