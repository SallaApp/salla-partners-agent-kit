# App Builder API Spec

Base URL: `https://api.salla.dev/partners/v1`
Auth: **partners** access token, `Authorization: Bearer {token}`
Header: `Accept-Language: ar` or `en` — controls the language of `label`, `placeholder`, and option labels returned in schema responses. It does **not** translate stored content (lingual fields always carry both `ar` and `en`).

> This is the **Partners** API, not the merchant Admin API. The token is the partner's portal token, not a merchant OAuth token.

> **Prefer the MCP where a tool exists.** When the Salla Partners MCP is connected you do **not** handle the token for `salla_upload` — call it and the MCP attaches it. The App Builder **block** endpoints have **no MCP tool**, so the auth/token instructions in this file apply to all of them (reads and mutations) via the direct Partners API.

---

## Authentication & app id

- **MCP (for `salla_upload`)** — no token handling; `salla_upload` runs with the MCP-managed partner token; reconnect (re-run the login) if it reports "Salla session expired".
- **Fallback token — direct API only** — for the direct calls below you need a partners access token yourself. In the Partners Portal it lives in `localStorage["partners-token"]` as `{ "access_token": "…", … }`; the axios interceptor at `ui-partners-portal-apps/src/services/http/portal-apps-instance.ts` reads it and attaches `Authorization: Bearer {access_token}`. Tokens are short-lived (hours) — always use a fresh one. To grab the current token from a logged-in portal tab:

  ```js
  JSON.parse(localStorage.getItem("partners-token")).access_token;
  ```

- **`appId`** — the numeric app id. Visible in the portal URL (`portal.salla.partners/apps/{appId}/…`) and under My Apps.

---

## Response envelope

Every response wraps data in a standard envelope:

```json
{ "status": 200, "success": true, "data": … }
```

- Read endpoints return data in `data` (and sometimes `meta`).
- Mutations (POST/PUT/DELETE) return `"data": null` on success.
- Validation failures return **422** with field-keyed errors (see [422 errors](#422-validation-errors)).

---

## Endpoints

All App Builder block endpoints have **no MCP tool** — call them directly. They are planned as a dedicated `salla_app_builder` tool.

| Purpose                             | Method + path                                       | MCP coverage                                             |
| ----------------------------------- | --------------------------------------------------- | -------------------------------------------------------- |
| List block catalog                  | `GET /api/apps/builder/blocks`                      | none — direct (planned `salla_app_builder list_blocks`)  |
| List app's added blocks             | `GET /api/apps/{appId}/builder/blocks`              | none — direct (planned `salla_app_builder list_blocks`)  |
| Get a block's field schema + values | `GET /api/apps/{appId}/builder/blocks/{blockId}`    | none — direct (planned `salla_app_builder get_block`)    |
| Add a block to the app              | `POST /api/apps/{appId}/builder/blocks/{blockId}`   | none — direct (planned `salla_app_builder add_block`)    |
| Edit a block's content              | `PUT /api/apps/{appId}/builder/blocks/{blockId}`    | none — direct (planned `salla_app_builder edit_block`)   |
| Reorder blocks                      | `PUT /api/apps/{appId}/builder/blocks/sort`         | none — direct (planned `salla_app_builder sort_blocks`)  |
| Delete a block                      | `DELETE /api/apps/{appId}/builder/blocks/{blockId}` | none — direct (planned `salla_app_builder delete_block`) |
| Initialize required blocks          | `POST /api/apps/{appId}/builder/blocks/init`        | none — direct (planned `salla_app_builder init_blocks`)  |
| Reset (remove all blocks)           | `DELETE /api/apps/{appId}/builder/blocks`           | none — direct (planned `salla_app_builder reset_blocks`) |
| Upload a block image                | `POST /api/upload/image`                            | **`salla_upload`** (preferred — returns `id`/`url`)      |

---

### List block catalog

```http
GET /api/apps/builder/blocks
Authorization: Bearer {token}
```

Returns every available block definition. `data` is an array of `BlockSchema`:

```json
{
  "status": 200,
  "success": true,
  "data": [
    {
      "id": 745999872,
      "slug": "app-information",
      "label": "معلومات التطبيق",
      "icon": "sicon-info-circle",
      "order": 1,
      "has_form": true,
      "is_visible": true,
      "is_required": true,
      "editable": true,
      "preview": "https://…png"
    },
    {
      "id": 2038173539,
      "slug": "app-features",
      "label": "ميزات التطبيق",
      "icon": "sicon-star",
      "order": 2,
      "has_form": true,
      "is_visible": true,
      "is_required": false,
      "editable": true,
      "preview": "https://…png"
    }
  ]
}
```

See [blocks-and-fields.md](blocks-and-fields.md) for the full block list and field meanings.

---

### List the app's added blocks

```http
GET /api/apps/{appId}/builder/blocks
Authorization: Bearer {token}
```

Same `BlockSchema` array — but only the blocks added to this app, in display `order`. Also returns a `meta.preview_token` (a PASETO used to render the live preview):

```json
{
  "status": 200,
  "success": true,
  "data": [ { "id": 745999872, "slug": "app-information", "order": 1, … }, … ],
  "meta": { "preview_token": "v4.public.eyJ…" }
}
```

---

### Get a block's field schema (with current values)

```http
GET /api/apps/{appId}/builder/blocks/{blockId}
Authorization: Bearer {token}
```

Returns the block's editable fields as an array of element schemas, with the **current saved values merged in** (`value`, or `items` for images). Only call this for blocks where `has_form: true` and `editable: true`.

```json
{
  "status": 200,
  "success": true,
  "data": [
    { "id": "title", "type": "string", "format": "string", "lingual": true,
      "required": true, "value": { "en": "", "ar": "" }, "maxLength": null },
    { "id": "features", "type": "collection", "format": "collection",
      "required": false, "value": [], "itemLabel": "ميزه",
      "minLength": 3, "maxLength": 3, "fields": [ … ] }
  ]
}
```

Field shapes (string/color/image/richtext/dropdown-list/collection/telinput/…) are documented in [blocks-and-fields.md](blocks-and-fields.md).

---

### Add a block

```http
POST /api/apps/{appId}/builder/blocks/{blockId}
Authorization: Bearer {token}
Content-Type: application/json

null
```

`{blockId}` is the **catalog** definition id. Body is `null` to add with defaults, or a full payload (same shape as PUT) to add pre-filled. Returns `{ "success": true, "data": null }`. After adding, re-`GET` the app's blocks to confirm placement.

---

### Edit a block

```http
PUT /api/apps/{appId}/builder/blocks/{blockId}
Authorization: Bearer {token}
Content-Type: application/json

{ "title": { "ar": "مميزاتنا", "en": "Our Features" }, "view_section": "images", … }
```

Send the whole block payload built from its field schema. Shapes must match the backend's expectations — see [payloads.md](payloads.md). Returns `{ "success": true, "data": null }`, or **422** on validation failure.

---

### Reorder blocks

```http
PUT /api/apps/{appId}/builder/blocks/sort
Authorization: Bearer {token}
Content-Type: application/json

{ "blocks": [745999872, 2038173539, 625478135] }
```

`blocks` is the full list of the app's block ids in the desired order. Keep `app-information` first — the portal UI pins it to the top via slug validation (a frontend rule, not enforced by `is_required`). Other blocks can be freely reordered.

---

### Delete a block

```http
DELETE /api/apps/{appId}/builder/blocks/{blockId}
Authorization: Bearer {token}
```

Removes a block from the app's view. Blocks with `is_required: true` cannot be deleted.

---

### Initialize required blocks

```http
POST /api/apps/{appId}/builder/blocks/init
Authorization: Bearer {token}
Content-Length: 0
```

**Call this first when customizing an app's view for the first time.** A fresh app's builder is empty (`GET …/blocks` → `data: []`); `init` seeds the required blocks (`app-information`, `app-pricing`) so they exist and become GET/PUT-able by id. Until you init, `GET …/blocks/{blockId}` for a required block returns **404**. Safe to call again — it ensures the required blocks are present.

---

### Reset the builder

```http
DELETE /api/apps/{appId}/builder/blocks
Authorization: Bearer {token}
```

Removes all blocks from the app's view. Destructive — confirm with the user before calling.

---

## 422 validation errors

A failed PUT returns HTTP 422 with errors keyed by dotted field paths. Collection items use a numeric index; lingual fields end in `.ar`/`.en`:

```json
{
  "success": false,
  "status": 422,
  "fields": {
    "title.en": ["The title (en) field is required."],
    "features.0.title.ar": ["The title field is required."]
  }
}
```

Map each key back to a field id (and collection index) to fix the payload. See [payloads.md](payloads.md#validation-errors).
