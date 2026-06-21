# Blocks and Fields

Two schemas matter: the **block** (a section in the app's presentation page) and the **element/field** (an editable input inside a block's form). These describe **what the partner customizes by hand in the Partners Portal's App Presentation Builder** — there is no MCP tool or public API for these operations today. The examples below are **illustrative shapes** describing the builder's blocks and fields, not a published contract. Block `id`s, option lists, and field sets drift between environments and over time; treat the values here as illustrative and confirm against what the **live Portal builder** presents, and cross-check via docs (`salla-docs`). `image` and `richtext` values render as **public App-Store content** — use only trusted, sanitized assets/HTML.

> **Current state (for now).** Customizing these blocks is a **manual** step in the Portal builder, done after completing the publish details. If the partner skips it, publication data fills the default template automatically. The only MCP tool that applies is `salla_upload`, for publication media. Revisit when a `salla_app_builder` MCP tool ships.

---

## BlockSchema

The shape behind each block in the Portal builder's catalog and in the app's added blocks.

| Field         | Type    | Meaning / how it gates actions                                                                                                           |
| ------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `id`          | number  | The block definition id; identifies the block in the Portal builder.                                                                     |
| `slug`        | string  | Stable machine name (`app-features`, `app-faq`, …).                                                                                      |
| `label`       | string  | Display name; language follows the request locale.                                                                                       |
| `description` | string  | Short catalog blurb for the block (e.g. "Display information about your app").                                                           |
| `icon`        | string  | Icon class (`sicon-*`).                                                                                                                  |
| `order`       | number  | Position in the presentation page. Change by reordering in the Portal builder.                                                           |
| `has_form`    | boolean | `false` → no editable fields; no schema to read or write.                                                                                |
| `is_visible`  | boolean | Whether the block shows in the rendered page.                                                                                            |
| `is_required` | boolean | `true` → cannot be deleted (e.g. App Information, App Plans). Backend rule — it does **not** by itself pin position or block reordering. |
| `editable`    | boolean | `false` → no editable form (e.g. Pricing); don't read or write its schema.                                                               |
| `preview`     | string? | Thumbnail image URL for the catalog.                                                                                                     |

---

## The catalog (7 blocks)

The blocks the Portal builder offers (live order in parentheses):

| Slug              | Label (EN)      | `id`       | order | required | editable | has_form |
| ----------------- | --------------- | ---------- | ----- | -------- | -------- | -------- |
| `app-information` | App Information | 745999872  | 1     | ✅       | ✅       | ✅       |
| `app-features`    | App Features    | 2038173539 | 2     | —        | ✅       | ✅       |
| `app-pricing`     | App Plans       | 625478135  | 3     | ✅       | ❌       | ❌       |
| `app-reviews`     | App Reviews     | 1131548349 | 4     | —        | ✅       | ✅       |
| `app-brands`      | App Brands      | 1617628556 | 6     | —        | ✅       | ✅       |
| `app-faq`         | App FAQ         | 1247874246 | 7     | —        | ✅       | ✅       |
| `app-stats`       | App Statistics  | 1984760154 | 8     | —        | ✅       | ✅       |

> `id` values come from the dev environment and are stable there, but always confirm them against the live Portal builder rather than hardcoding. `app-pricing` is required **and** non-editable — it appears in the page but has no form (pricing renders automatically). `app-information` cannot be deleted (`is_required`); the **portal UI** also pins it to the top and excludes it from sorting — so it stays first.

> **`app-contact-info` (was `id` 392563753) has been removed** from the catalog — that's why the catalog has 7 blocks and `order` 5 is absent. Its contact **channels** were merged into `app-information` as flat **`support_*`** fields (`support_title`, `support_description`, `support_email`, `support_telegram`, `support_whatsapp`) — the old `links` collection did **not** carry over. Confirm `app-information`'s field list against the live Portal builder before relying on it.

> **Required blocks are always present.** `app-information` and `app-pricing` are seeded automatically (not a partner action) and are present from the start in the Portal builder; they can't be removed.

---

## Element (field) schema

The fields a block's form exposes in the Portal builder. Common keys:

| Key                                   | Meaning                                                                                                                              |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `id`                                  | Field key used in the payload (`title`, `bg_color_light`, …). For collection children it is **prefixed** (`features.title`).         |
| `type`                                | High-level kind: `string`, `number`, `items`, `collection`.                                                                          |
| `format`                              | Specific input: `string`, `email`, `url`, `color`, `image`, `richtext`, `icon`, `number`, `telinput`, `dropdown-list`, `collection`. |
| `label`, `placeholder`, `description` | UI text (language follows the request locale).                                                                                       |
| `lingual`                             | `true` → value is `{ ar, en }`.                                                                                                      |
| `required`                            | Whether a value must be present.                                                                                                     |
| `wide`                                | Layout hint (full-width).                                                                                                            |
| `value`                               | Current saved value (shape depends on `format`).                                                                                     |
| `items`                               | For `image`: current uploaded files as `[{ id, url }]`.                                                                              |
| `options`                             | For `dropdown-list`: `[{ value, label, key }]`.                                                                                      |
| `source`                              | For `dropdown-list`: option source (e.g. `"Manual"`).                                                                                |
| `fields`                              | For `collection`: the child field schemas.                                                                                           |
| `itemLabel`                           | For `collection`: singular label per item.                                                                                           |
| `minLength`/`maxLength`               | String length **or** collection item-count bounds.                                                                                   |
| `min`/`max`                           | Numeric bounds.                                                                                                                      |
| `multiple`                            | For `image`: allow multiple files.                                                                                                   |
| `conditions`                          | Conditional visibility: `[{ id, operation, value }]` — shown only when another field matches.                                        |

### `type` / `format` combinations

| `type`       | `format`        | Value shape in payload                | Notes                                                               |
| ------------ | --------------- | ------------------------------------- | ------------------------------------------------------------------- |
| `string`     | `string`        | `"text"` or `{ ar, en }` if `lingual` | Plain text.                                                         |
| `string`     | `email`         | `"x@y.com"`                           | Email validation.                                                   |
| `string`     | `url`           | `"https://…"`                         | URL validation.                                                     |
| `string`     | `color`         | `"#a3ffe5"`                           | Hex; portal defaults empty to `#a3ffe5`.                            |
| `string`     | `image`         | `[{ id, url }]`                       | Upload first; see [payloads.md](payloads.md). `multiple` allows >1. |
| `string`     | `richtext`      | `{ ar: "<p>…</p>", en: "<p>…</p>" }`  | HTML; lingual.                                                      |
| `string`     | `icon`          | `"hgi-mail-01"`                       | Icon picker (hugeicons).                                            |
| `number`     | `number`        | `5`                                   | Respects `min`/`max`.                                               |
| `number`     | `telinput`      | `"+9665…"`                            | Flattened from `{ value, code }`.                                   |
| `items`      | `dropdown-list` | `"images"` (an option `value`)        | Choose from `options`.                                              |
| `collection` | `collection`    | `[ { "<id>.child": … }, … ]`          | Array of items; child keys prefixed.                                |

---

## Real examples

### Lingual string + dropdown + color + collection (`app-features`)

```jsonc
[
  {
    "id": "title",
    "type": "string",
    "format": "string",
    "lingual": true,
    "required": true,
    "value": { "en": "", "ar": "" },
  },

  {
    "id": "view_section",
    "type": "items",
    "format": "dropdown-list",
    "required": true,
    "options": [{ "value": "images", "label": "صور الميزات", "key": "images" }],
    "source": null,
  },

  {
    "id": "bg_color_light",
    "type": "string",
    "format": "color",
    "required": false,
  },
  {
    "id": "bg_color_dark",
    "type": "string",
    "format": "color",
    "required": false,
  },

  {
    "id": "features",
    "type": "collection",
    "format": "collection",
    "required": false,
    "value": [],
    "itemLabel": "ميزه",
    "minLength": 3,
    "maxLength": 3,
    "fields": [
      {
        "id": "features.image",
        "format": "image",
        "required": true,
        "multiple": false,
      },
      {
        "id": "features.title",
        "format": "string",
        "lingual": true,
        "required": true,
        "value": { "en": "", "ar": "" },
        "maxLength": 255,
      },
      {
        "id": "features.description",
        "format": "string",
        "lingual": true,
        "required": true,
        "value": { "en": "", "ar": "" },
        "maxLength": 255,
      },
    ],
  },
]
```

The `features` collection requires **exactly 3** items (`minLength`/`maxLength` = 3), each with a prefixed `features.image`, `features.title`, `features.description`.

### Full block: image, richtext, conditional dropdown, contact fields (`app-information`)

The `app-information` block (id `745999872`) as the Portal builder presents it (labels shown in `en`, trimmed of blank `placeholder`/`description`). After `app-contact-info` was removed, its contact channels live here as flat **`support_*`** fields (no `links` collection):

```jsonc
[
  {
    "id": "view_section",
    "type": "items",
    "format": "dropdown-list",
    "source": "Manual",
    "options": [
      { "value": "scroll", "label": "Scroll Images" },
      { "value": "grid", "label": "Grid Images" },
    ],
  },

  // Shown only when view_section = grid:
  {
    "id": "image_orientation",
    "type": "items",
    "format": "dropdown-list",
    "conditions": [{ "id": "view_section", "operation": "=", "value": "grid" }],
    "options": [
      { "value": "start", "label": "Left" },
      { "value": "end", "label": "Right" },
      { "value": "below", "label": "Bottom" },
    ],
  },
  {
    "id": "description_orientation",
    "type": "items",
    "format": "dropdown-list",
    "options": [
      { "value": "below", "label": "Below Images" },
      { "value": "above", "label": "Above Images" },
    ],
  },

  // Logo must be 250x250 (JPG/JPEG/PNG):
  { "id": "logo", "format": "image", "required": true, "multiple": false },
  // Main Title:
  {
    "id": "name",
    "format": "string",
    "lingual": true,
    "required": true,
    "value": { "en": "", "ar": "" },
  },
  // Images — appropriate size 263 x 350:
  {
    "id": "screenshots",
    "format": "image",
    "required": true,
    "multiple": true,
  },
  // App Details (optional):
  {
    "id": "description",
    "format": "richtext",
    "lingual": true,
    "required": false,
    "value": { "en": "", "ar": "" },
  },

  // Support / contact section (formerly the app-contact-info block):
  {
    "id": "support_title",
    "format": "string",
    "lingual": true,
    "required": false,
  },
  {
    "id": "support_description",
    "format": "string",
    "lingual": true,
    "required": false,
    "wide": true,
  },
  { "id": "support_email", "format": "email", "required": false }, // icon hgi-mail-01
  { "id": "support_telegram", "format": "string", "required": false }, // icon hgi-telegram, "@username"
  {
    "id": "support_whatsapp",
    "type": "number",
    "format": "telinput",
    "required": false,
    "wide": true,
  }, // icon hgi-whatsapp
]
```

Notes: `image` fields (`logo`, `screenshots`) carry current files under **`items`** (`[{ id, url }]`), not `value`. `support_email` is `email`, `support_whatsapp` is a `telinput` (flatten to the dialed string — see [payloads.md](payloads.md)), and `support_telegram` is a plain string. The old `app-contact-info` `links` collection is **not** present — only these flat support fields carried over. `logo` and `screenshots` are the same media that flow in from your publication details and auto-fill the default template; upload them via `salla_upload`.

### Collection with a saved value (shape reference)

> Illustrates how **any** populated collection serializes. This is the former `app-contact-info` `links` collection — that block is now removed, so treat it purely as a shape reference; the live collection today is `features` on `app-features` (above). Always confirm field ids against the live schema.

```jsonc
{
  "id": "links",
  "type": "collection",
  "format": "collection",
  "itemLabel": "الرابط",
  "minLength": 1,
  "maxLength": 10,
  "value": [
    {
      "links.title": { "ar": "جديد", "en": "new" },
      "links.url": "https://asddasd.com",
    },
  ],
  "fields": [
    {
      "id": "links.title",
      "format": "string",
      "lingual": true,
      "required": true,
    },
    { "id": "links.url", "format": "url", "required": true },
  ],
}
```

The lesson holds for every collection: each item is an object whose keys are the **prefixed child ids** (`links.title`, `features.title`). The same shape applies when filling a collection in the builder — see [payloads.md](payloads.md).
