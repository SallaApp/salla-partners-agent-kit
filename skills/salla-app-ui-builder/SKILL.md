---
name: salla-app-ui-builder
description: >
  Use this skill whenever customizing a Salla app's public view (the App Builder) — listing the
  block catalog, adding/removing/reordering blocks on an app, or editing a block's content via the
  Partners API. Invoke it for tasks like "add a features block", "reorder the app view", "edit the
  FAQ block", "fill the app information", or "reset the app builder".
license: Copyright (c) 2026 Salla
metadata:
  authors: Abdelrahman Abdelhamid
  version: 1.0
---

# Salla App UI Builder

The **App Builder** is how a partner customizes the public-facing view of their app — the page a merchant sees in the App Store before installing. That view is an **ordered list of blocks** (App Information, Features, Pricing, Reviews, Contact Info, Brands, FAQ, Stats). You drive it entirely through the Partners API under `/api/apps/{appId}/builder/blocks`.

Reference implementation (the portal UI that calls these same endpoints): `ui-partners-portal-apps/src/layouts/builder-layout/AppBuilderLayout.tsx`.

## The model

- An **app's view** = an ordered array of blocks the partner has added.
- The **catalog** is the full set of available block definitions. `GET /api/apps/builder/blocks` returns it.
- The app's **added blocks** come from `GET /api/apps/{appId}/builder/blocks`. They share the same `BlockSchema` shape, and **a block's `id` IS its catalog definition id** — you add a block by POSTing to that id and edit it by the same id.
- A block that has a form (`has_form: true`) exposes a list of **fields** (the "element schema"). `GET /api/apps/{appId}/builder/blocks/{blockId}` returns those fields with their current values merged in.

## Key constraints

> - **Required blocks** (`is_required: true`, e.g. App Information, Pricing) cannot be deleted and stay pinned.
> - **`editable: false`** blocks (e.g. Pricing) have no editable form — never GET/PUT a schema for them.
> - **`has_form: false`** → the block renders fixed content; there are no fields to edit.
> - **Lingual fields** (`lingual: true`) must be sent as `{ "ar": "…", "en": "…" }` — never a bare string.
> - **Collection** field children are keyed with the collection id as a prefix (`features.title`, `links.url`), exactly as they appear in the schema. See [payloads.md](references/payloads.md).
> - The Bearer token is the short-lived **partners** token, not a merchant Admin token. See [api-spec.md](references/api-spec.md).

## Workflow

### Step 1 — Get the app id and a fresh token

`appId` is the numeric id of the app (visible in the portal URL / My Apps). The token is the partners access token — see [api-spec.md](references/api-spec.md) for how to obtain it. Attach it as `Authorization: Bearer {token}` and set `Accept-Language: ar` or `en` (controls the language of labels/placeholders in schema responses).

### Step 2 — List the catalog and the app's current blocks

```http
GET https://api.salla.dev/partners/v1/api/apps/builder/blocks            # catalog
GET https://api.salla.dev/partners/v1/api/apps/{appId}/builder/blocks    # this app's view
```

### Step 3 — Add a block

POST to the catalog block id. Body may be `null` (add with defaults) or an initial payload.

```http
POST https://api.salla.dev/partners/v1/api/apps/{appId}/builder/blocks/{blockId}
```

### Step 4 — Fetch the block's field schema (with current values)

```http
GET https://api.salla.dev/partners/v1/api/apps/{appId}/builder/blocks/{blockId}
```

### Step 5 — Edit the block

Build the payload to match the field schema and the backend's expected shapes (lingual objects, collection prefixes, image objects). See [payloads.md](references/payloads.md).

```http
PUT https://api.salla.dev/partners/v1/api/apps/{appId}/builder/blocks/{blockId}
```

### Step 6 — Reorder, delete, init, reset

```http
PUT    /api/apps/{appId}/builder/blocks/sort     # body: { "blocks": [id1, id2, …] }
DELETE /api/apps/{appId}/builder/blocks/{blockId}
POST   /api/apps/{appId}/builder/blocks/init     # add all required blocks
DELETE /api/apps/{appId}/builder/blocks          # reset (remove all)
```

## When to read the reference files

- [API Spec](references/api-spec.md) — every endpoint with method, path, request body, and real response; auth (partners Bearer token) and how to obtain `appId` + token; the response envelope and 422 validation-error shape.
- [Blocks and Fields](references/blocks-and-fields.md) — the `BlockSchema` fields and how they gate actions; the catalog of 8 blocks; the field/element schema with every `type`/`format` combination (lingual string, color, image, richtext, email/url, dropdown-list, collection, telinput, conditions) shown with real API data.
- [Payloads](references/payloads.md) — turning a field schema into a valid POST/PUT body: lingual objects, collection key-prefixing, image objects + upload, telinput flattening, color and dropdown values, plus a full end-to-end worked example and 422 error mapping.

## Resources

| Topic | Link |
| --- | --- |
| Partners Portal | https://portal.salla.partners |
| App Builder reference implementation | `ui-partners-portal-apps/src/layouts/builder-layout/AppBuilderLayout.tsx` |
| Developer blog | https://salla.dev/blog/ |
| Developer community (Telegram) | https://t.me/salladev |
