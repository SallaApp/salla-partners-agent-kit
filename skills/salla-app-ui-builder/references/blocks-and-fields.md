# Blocks and Fields

Two schemas matter: the **block** (a section in the app's view) and the **element/field** (an editable input inside a block's form). All examples below are real responses from the Partners API.

---

## BlockSchema

Returned by `GET /api/apps/builder/blocks` (catalog) and `GET /api/apps/{appId}/builder/blocks` (the app's added blocks).

| Field | Type | Meaning / how it gates actions |
| --- | --- | --- |
| `id` | number | The block definition id. **Add** via `POST …/blocks/{id}`, **edit** via `PUT …/blocks/{id}`. |
| `slug` | string | Stable machine name (`app-features`, `app-faq`, …). |
| `label` | string | Display name; language follows `Accept-Language`. |
| `icon` | string | Icon class (`sicon-*`). |
| `order` | number | Position in the view. Change with `PUT …/blocks/sort`. |
| `has_form` | boolean | `false` → no editable fields; don't GET/PUT a schema. |
| `is_visible` | boolean | Whether the block shows in the rendered view. |
| `is_required` | boolean | `true` → cannot be deleted; stays pinned. |
| `editable` | boolean | `false` → no editable form (e.g. Pricing); never GET/PUT its schema. |
| `preview` | string? | Thumbnail image URL for the catalog. |

---

## The catalog (8 blocks)

From `GET /api/apps/builder/blocks`:

| Slug | Label (EN) | `id` | required | editable | has_form |
| --- | --- | --- | --- | --- | --- |
| `app-information` | App Information | 745999872 | ✅ | ✅ | ✅ |
| `app-features` | App Features | 2038173539 | — | ✅ | ✅ |
| `app-pricing` | Pricing / Plans | 625478135 | ✅ | ❌ | ❌ |
| `app-reviews` | App Reviews | 1131548349 | — | ✅ | ✅ |
| `app-contact-info` | Contact Info | 392563753 | ✅ | ✅ | ✅ |
| `app-brands` | Brands | 1617628556 | — | ✅ | ✅ |
| `app-faq` | FAQ | 1247874246 | — | ✅ | ✅ |
| `app-stats` | App Stats | 1984760154 | — | ✅ | ✅ |

> `id` values come from the dev environment and are stable there, but always read them from the live catalog rather than hardcoding. `app-pricing` is required **and** non-editable — it appears in the view but has no form.

---

## Element (field) schema

Returned inside `GET /api/apps/{appId}/builder/blocks/{blockId}` `data[]`. Common keys:

| Key | Meaning |
| --- | --- |
| `id` | Field key used in the payload (`title`, `bg_color_light`, …). For collection children it is **prefixed** (`features.title`). |
| `type` | High-level kind: `string`, `number`, `items`, `collection`. |
| `format` | Specific input: `string`, `email`, `url`, `color`, `image`, `richtext`, `icon`, `number`, `telinput`, `dropdown-list`, `collection`. |
| `label`, `placeholder`, `description` | UI text (language follows `Accept-Language`). |
| `lingual` | `true` → value is `{ ar, en }`. |
| `required` | Whether a value must be present. |
| `wide` | Layout hint (full-width). |
| `value` | Current saved value (shape depends on `format`). |
| `items` | For `image`: current uploaded files as `[{ id, url }]`. |
| `options` | For `dropdown-list`: `[{ value, label, key }]`. |
| `source` | For `dropdown-list`: option source (e.g. `"Manual"`). |
| `fields` | For `collection`: the child field schemas. |
| `itemLabel` | For `collection`: singular label per item. |
| `minLength`/`maxLength` | String length **or** collection item-count bounds. |
| `min`/`max` | Numeric bounds. |
| `multiple` | For `image`: allow multiple files. |
| `conditions` | Conditional visibility: `[{ id, operation, value }]` — shown only when another field matches. |

### `type` / `format` combinations

| `type` | `format` | Value shape in payload | Notes |
| --- | --- | --- | --- |
| `string` | `string` | `"text"` or `{ ar, en }` if `lingual` | Plain text. |
| `string` | `email` | `"x@y.com"` | Email validation. |
| `string` | `url` | `"https://…"` | URL validation. |
| `string` | `color` | `"#a3ffe5"` | Hex; portal defaults empty to `#a3ffe5`. |
| `string` | `image` | `[{ id, url }]` | Upload first; see [payloads.md](payloads.md). `multiple` allows >1. |
| `string` | `richtext` | `{ ar: "<p>…</p>", en: "<p>…</p>" }` | HTML; lingual. |
| `string` | `icon` | `"hgi-mail-01"` | Icon picker (hugeicons). |
| `number` | `number` | `5` | Respects `min`/`max`. |
| `number` | `telinput` | `"+9665…"` | Flattened from `{ value, code }`. |
| `items` | `dropdown-list` | `"images"` (an option `value`) | Choose from `options`. |
| `collection` | `collection` | `[ { "<id>.child": … }, … ]` | Array of items; child keys prefixed. |

---

## Real examples

### Lingual string + dropdown + color + collection (`app-features`)

```jsonc
[
  { "id": "title", "type": "string", "format": "string", "lingual": true,
    "required": true, "value": { "en": "", "ar": "" } },

  { "id": "view_section", "type": "items", "format": "dropdown-list", "required": true,
    "options": [ { "value": "images", "label": "صور الميزات", "key": "images" } ],
    "source": null },

  { "id": "bg_color_light", "type": "string", "format": "color", "required": false },
  { "id": "bg_color_dark",  "type": "string", "format": "color", "required": false },

  { "id": "features", "type": "collection", "format": "collection", "required": false,
    "value": [], "itemLabel": "ميزه", "minLength": 3, "maxLength": 3,
    "fields": [
      { "id": "features.image", "format": "image", "required": true, "multiple": false },
      { "id": "features.title", "format": "string", "lingual": true, "required": true,
        "value": { "en": "", "ar": "" }, "maxLength": 255 },
      { "id": "features.description", "format": "string", "lingual": true, "required": true,
        "value": { "en": "", "ar": "" }, "maxLength": 255 }
    ] }
]
```

The `features` collection requires **exactly 3** items (`minLength`/`maxLength` = 3), each with a prefixed `features.image`, `features.title`, `features.description`.

### Image, richtext, conditional dropdown (`app-information`)

```jsonc
[
  { "id": "view_section", "type": "items", "format": "dropdown-list",
    "options": [ { "value": "scroll", "label": "صور التمرير", "key": "…" },
                 { "value": "grid",   "label": "صور الشبكة",  "key": "…" } ],
    "source": "Manual" },

  // Shown only when view_section = grid:
  { "id": "image_orientation", "type": "items", "format": "dropdown-list",
    "conditions": [ { "id": "view_section", "operation": "=", "value": "grid" } ],
    "options": [ { "value": "start", "label": "يمين" }, { "value": "end", "label": "يسار" } ] },

  { "id": "logo", "format": "image", "required": true, "multiple": false,
    "items": [ { "id": 175920, "url": "https://…/logo.png" } ] },

  { "id": "screenshots", "format": "image", "required": true, "multiple": true,
    "items": [ { "id": 176983, "url": "https://…/a.jpg" }, { "id": 176984, "url": "https://…/b.jpg" } ] },

  { "id": "name", "format": "string", "lingual": true, "required": true,
    "value": { "en": "My App", "ar": "تطبيقي" } },

  { "id": "description", "format": "richtext", "lingual": true, "required": false,
    "value": { "en": "<p>…</p>", "ar": "<p>…</p>" } }
]
```

Note: `image` fields return their current files under **`items`** (`[{ id, url }]`), not `value`.

### Collection with a saved value (`app-contact-info` → `links`)

```jsonc
{ "id": "links", "type": "collection", "format": "collection",
  "itemLabel": "الرابط", "minLength": 1, "maxLength": 10,
  "value": [
    { "links.title": { "ar": "جديد", "en": "new" }, "links.url": "https://asddasd.com" }
  ],
  "fields": [
    { "id": "links.title", "format": "string", "lingual": true, "required": true },
    { "id": "links.url",   "format": "url",    "required": true }
  ] }
```

This confirms the stored/submitted shape: each collection item is an object whose keys are the **prefixed child ids** (`links.title`, `links.url`). Build payloads the same way — see [payloads.md](payloads.md).
