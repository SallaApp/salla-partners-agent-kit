# App Presentation Builder — data shapes (manual, Portal builder)

The App Presentation Builder is a **manual tool in the Partners Portal**. There is **no MCP tool and no public/Partners API** for its block/element operations today, and there is **no token to handle**. This file documents the **shapes** the builder works with — block definitions and their field schemas — so you can describe _what_ the partner fills in and _what shape_ each value takes. Treat every shape here as **illustrative** (placeholder ids/URLs), confirm it against what the live Portal builder presents, and remember these are **content shapes, not request bodies**.

> **Current state (for now).** Block/element customization is done **by hand in the Portal builder**, after the partner completes the publish details. The only MCP tool that applies is **`salla_upload`**, and only to upload **media for the publish/publication details** (`source_url` → integer image `id`); that media then auto-fills the default presentation template. This file will be revisited when a `salla_app_builder` MCP tool ships.

The language of `label`, `placeholder`, and option labels follows the Portal locale (`ar` / `en`). Locale does **not** translate stored content — lingual fields always carry both `ar` and `en`.

---

## Auto-fill vs. manual customization

- **Auto-fill (default):** if the partner never opens the builder, the publication-provided images, screenshots, and description populate the **default template** — the page exists and renders without any manual work.
- **Manual (builder):** to go beyond the default template, the partner edits the blocks below by hand in the Portal builder. Partial customization can mix with publication data.

---

## What the builder presents (no API)

| Capability                            | How it's done today                            |
| ------------------------------------- | ---------------------------------------------- |
| See the block catalog                 | In the Portal builder (manual)                 |
| See the app's added blocks            | In the Portal builder (manual)                 |
| See a block's fields + current values | In the Portal builder (manual)                 |
| Add / edit / reorder / delete a block | In the Portal builder (manual)                 |
| Have required blocks present          | Seeded automatically; not a partner action     |
| Upload media for publication details  | **`salla_upload`** (pass a `source_url`) — MCP |

There is no programmatic path for the rows marked "Portal builder (manual)" — do not invent MCP tools or direct API calls for them.

---

## Block definition shape

Each block in the catalog is a `BlockSchema`. A definition looks like:

```json
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
}
```

The app's added blocks use the same `BlockSchema` shape, in display `order`. See [blocks-and-fields.md](blocks-and-fields.md) for every field's meaning.

---

## Block field-schema shape (with current values)

A block with a form exposes its editable fields as an array of element schemas, with the **current saved values merged in** (`value`, or `items` for images). Only blocks where `has_form: true` and `editable: true` have a form:

```jsonc
[
  { "id": "title", "type": "string", "format": "string", "lingual": true,
    "required": true, "value": { "en": "", "ar": "" }, "maxLength": null },
  { "id": "features", "type": "collection", "format": "collection",
    "required": false, "value": [], "itemLabel": "ميزه",
    "minLength": 3, "maxLength": 3, "fields": [ … ] }
]
```

Field shapes (string/color/image/richtext/dropdown-list/collection/telinput/…) are documented in [blocks-and-fields.md](blocks-and-fields.md). How a populated value is shaped is in [payloads.md](payloads.md).

---

## Content shape notes

- An app's presentation is an ordered set of blocks; **App Information stays first** and **App Plans** has no editable form (pricing renders automatically).
- When editing a block in the builder, carry over every value you aren't changing — especially `required` fields — and keep already-stored images by leaving their `{ id, url }` in place.
- Required blocks (App Information, App Plans) are always present and can't be deleted.
- Lingual fields carry both `ar` and `en`; collection items use prefixed child ids (`features.title`).

---

## Validation feedback

The builder surfaces field-level validation when a value is missing or malformed — for example a lingual field missing its `en` value, or a collection holding the wrong number of items. The cues map back to a field id (and, for collections, an item index and language). See [payloads.md](payloads.md#validation-feedback) for how to read them.
