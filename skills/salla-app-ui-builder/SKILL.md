---
name: salla-app-ui-builder
description: >
  Customize a Salla app's public App-Store view (the App Builder) — the block list a
  merchant sees before installing. Initialize, then add/remove/reorder blocks and edit
  their content. Images upload via salla_upload; block reads and mutations have no MCP
  tool yet, so they use the Partners API directly. Create/configure/publish →
  salla-app-builder; merchant settings → salla-app-settings; schemas → salla-docs.
license: Copyright (c) 2026 Salla
metadata:
  authors: Abdelrahman Abdelhamid
  version: 1.1
---

# Salla App UI Builder

The **App Builder** is how a partner customizes the public-facing view of their app — the page a merchant sees in the App Store before installing. That view is an **ordered list of blocks** (App Information, Features, Plans, Reviews, Brands, FAQ, Stats), customized through the Partners API under `/api/apps/{appId}/builder/blocks`. A fresh app's builder is empty until you **initialize** it (Step 3).

Reference implementation (the portal UI that calls these same endpoints): `ui-partners-portal-apps/src/layouts/builder-layout/AppBuilderLayout.tsx`.

## Tools

The App Builder is **partly** covered by the Salla Partners MCP. Use the tool where one exists (`salla_upload` for images); all block operations — reads and mutations — have no tool yet and use the Partners API directly (see the gap note).

| Capability                                               | Tool · how                                                         |
| -------------------------------------------------------- | ------------------------------------------------------------------ |
| Upload a block image → file `id` (+`url`)                | `salla_upload` (pass a `url` or `base64`)                          |
| Read the block catalog / app blocks / one block's schema | **No MCP tool** — call the Partners API directly (endpoints below) |

> **No MCP tool yet for App Builder blocks.** Listing, reading, adding, editing, reordering, deleting, initializing, and resetting blocks are **not** exposed as MCP tools — every block step uses the **direct Partners API**. These are planned as a dedicated **`salla_app_builder`** tool (actions: `list_blocks`, `get_block`, `add_block`, `edit_block`, `sort_blocks`, `delete_block`, `init_blocks`, `reset_blocks`); when it ships, this skill switches to it and the direct-API path goes away.

> **Prerequisite:** the Salla Partners MCP server should be connected so `salla_upload` appears in your tool list. If it isn't, fall back to the Portal at https://portal.salla.partners and the direct-API notes below. Re-run the OAuth/login flow if a tool returns "Salla session expired — reconnect".

## The model

- An **app's view** = an ordered array of blocks the partner has added.
- The **catalog** is the full set of available block definitions (`GET /api/apps/builder/blocks`).
- The app's **added blocks** come from `GET /api/apps/{appId}/builder/blocks`. They share the same `BlockSchema` shape, and **a block's `id` IS its catalog definition id** — you add a block by POSTing to that id and edit it by the same id.
- A block that has a form (`has_form: true`) exposes a list of **fields** (the "element schema"). `GET /api/apps/{appId}/builder/blocks/{blockId}` returns those fields with their current values merged in.

## Key constraints

> - **Initialize first.** A new app's builder is empty (`GET …/blocks` → `data: []`); call `init` once before adding/editing (Step 3) — it seeds the required blocks (App Information, App Plans).
> - **`app-contact-info` was removed** — its contact channels now live on **App Information** as flat `support_*` fields (`support_email`, `support_telegram`, `support_whatsapp`, `support_title`, `support_description`); the old `links` collection is gone. Read App Information's live schema (Step 5) for its current fields.
> - **Required blocks** (`is_required: true`, e.g. App Information, App Plans) cannot be deleted. This is a backend rule and does **not** by itself fix position or block reordering.
> - **App Information is pinned to the top** and excluded from sorting — but that's a **portal-UI rule keyed on its slug**, not a backend guarantee. When reordering through the API, keep `app-information` first.
> - **`editable: false`** blocks (e.g. App Plans) have no editable form — never GET/PUT a schema for them.
> - **`has_form: false`** → the block renders fixed content; there are no fields to edit.
> - **Lingual fields** (`lingual: true`) must be sent as `{ "ar": "…", "en": "…" }` — never a bare string.
> - **Collection** field children are keyed with the collection id as a prefix (`features.title`, `features.image`), exactly as they appear in the schema. See [payloads.md](references/payloads.md).
> - Authentication uses the short-lived **partners** access token, not a merchant Admin token. With the MCP connected the tools attach it for you; direct-API fallback calls need it yourself. See [api-spec.md](references/api-spec.md).

## Workflow

### Step 1 — Get the app id (and, for fallback calls, a token)

`appId` is the numeric id of the app (visible in the portal URL / My Apps).

- **MCP path** (`salla_upload`): the MCP holds and attaches the partner token for you — you don't handle it.
- **Direct Partners API** (every block step — list, read, and mutate): you need a partners access token yourself. That's the labelled "stays code" path — see [api-spec.md](references/api-spec.md) for how to obtain one. Attach it as `Authorization: Bearer {token}` and set `Accept-Language: ar` or `en` (controls the language of labels/placeholders in schema responses).

### Step 2 — List the catalog and the app's current blocks

- **Direct Partners API** (no MCP tool):

  ```http
  GET https://api.salla.dev/partners/v1/api/apps/builder/blocks            # catalog
  GET https://api.salla.dev/partners/v1/api/apps/{appId}/builder/blocks    # this app's view
  ```

If the app's view comes back **empty** (`data: []`), the builder hasn't been initialized — do Step 3 first.

**Gate:** "Catalog + current blocks listed — confirm which block (by catalog `id`/`slug`) you're acting on, or that the view is empty and needs init."

### Step 3 — Initialize the builder (first time)

**Required before customizing a fresh app.** If Step 2 returned `data: []`, the builder is empty — call `init` **once** to seed the required blocks (App Information + App Plans) so they exist and become editable by id. Idempotent-ish: on an already-initialized app it just ensures the required blocks are present. **No MCP tool — direct Partners API (fallback)** (planned `salla_app_builder init_blocks`).

```http
POST https://api.salla.dev/partners/v1/api/apps/{appId}/builder/blocks/init
```

**Gate:** "Re-list (Step 2) and confirm the required blocks now appear, with App Information first."

### Step 4 — Add a block

**No MCP tool — direct Partners API (fallback).** POST to the catalog block id. Body may be `null` (add with defaults) or an initial payload.

```http
POST https://api.salla.dev/partners/v1/api/apps/{appId}/builder/blocks/{blockId}
```

**Gate:** "Re-list the app's blocks (Step 2) and confirm the new block appears."

### Step 5 — Fetch the block's field schema (with current values)

- **Direct Partners API** (no MCP tool):

  ```http
  GET https://api.salla.dev/partners/v1/api/apps/{appId}/builder/blocks/{blockId}
  ```

Only do this for blocks where `has_form: true` and `editable: true`.

### Step 6 — Edit the block

**No MCP tool — direct Partners API (fallback).** Build the payload to match the field schema and the backend's expected shapes (lingual objects, collection prefixes, image objects). For images, upload first with **`salla_upload`** and use the returned `id`/`url` in the image-field array. See [payloads.md](references/payloads.md).

```http
PUT https://api.salla.dev/partners/v1/api/apps/{appId}/builder/blocks/{blockId}
```

**Gate:** "PUT returned `success: true` (no 422). Re-fetch the block (Step 5) and confirm the values stuck."

### Step 7 — Reorder, delete, reset

**No MCP tool — direct Partners API (fallback).** (Init lives in Step 3.)

```http
PUT    /api/apps/{appId}/builder/blocks/sort     # body: { "blocks": [id1, id2, …] } — keep app-information first
DELETE /api/apps/{appId}/builder/blocks/{blockId}
DELETE /api/apps/{appId}/builder/blocks          # reset (remove all)
```

**Gate (destructive):** `delete` and `reset` remove content — confirm the exact target with the user before calling. `is_required` blocks (App Information, App Plans) cannot be deleted, and the portal expects `app-information` to stay first when sorting.

## What stays code (no tool)

These are runtime pieces no MCP tool performs:

- **Fallback token** — obtaining/refreshing the partners access token for the direct-API mutation calls (the MCP manages its own token internally and never exposes it). See [api-spec.md](references/api-spec.md).
- **Live preview** — the app-blocks read returns `meta.preview_token` (a PASETO) used to render the live preview; rendering it is UI work, not an app-builder action.
- **Image bytes** — `salla_upload` ingests the image and returns an `id`/`url`; producing/hosting the file itself is yours.

## When to read the reference files

- [API Spec](references/api-spec.md) — every endpoint with method, path, request body, and real response; auth (MCP vs. the direct-API fallback token) and how to obtain `appId`; the response envelope and 422 validation-error shape; which endpoints have MCP coverage.
- [Blocks and Fields](references/blocks-and-fields.md) — the `BlockSchema` fields and how they gate actions; the catalog of 7 blocks (App Information, Features, Plans, Reviews, Brands, FAQ, Stats — `app-contact-info` removed, merged into App Information); the field/element schema with every `type`/`format` combination (lingual string, color, image, richtext, email/url, dropdown-list, collection, telinput, conditions) shown with real API data.
- [Payloads](references/payloads.md) — turning a field schema into a valid POST/PUT body: lingual objects, collection key-prefixing, image objects + `salla_upload`, telinput flattening, color and dropdown values, plus a full end-to-end worked example and 422 error mapping.

## Resources

| Topic                                | Link                                                                      |
| ------------------------------------ | ------------------------------------------------------------------------- |
| Partners Portal                      | https://portal.salla.partners                                             |
| App Builder reference implementation | `ui-partners-portal-apps/src/layouts/builder-layout/AppBuilderLayout.tsx` |
| Developer blog                       | https://salla.dev/blog/                                                   |
| Developer community (Telegram)       | https://t.me/salladev                                                     |
