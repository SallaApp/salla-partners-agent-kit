# Blocks and Elements

The listing page has two layers: the **block** (a section of the listing page) and the **element** (an editable key → value input inside a block). Block types come from `action=catalog`; a block's element keys come from `action=show`. Ids, option lists, and element sets drift between environments and over time, so confirm them at call time (cross-check via `salla-docs`) — the examples below are illustrative.

Prerequisite and standard sequence: [SKILL.md](../SKILL.md#prerequisite-open-a-draft-first).

---

## Block shape

What `action=list` / `action=catalog` / `action=show` return for a block.

| Field      | Type    | Meaning                                                                                     |
| ---------- | ------- | ------------------------------------------------------------------------------------------- |
| `id`       | number  | Block id — used in `action=show`, `action=remove`, and the ordered list for `action=sort`.  |
| `slug`     | string  | Stable machine name (`app-information`, `app-features`, `app-faq`, …).                      |
| `order`    | number  | Position in the listing page. Change it with `action=sort` (pass the full ordered id list). |
| `required` | boolean | `true` → cannot be removed (e.g. App Information, App Plans).                               |
| `label`    | string? | Display name; language follows the request locale.                                          |

`action=show` additionally returns the block's **element keys** — the keys `action=set` accepts. Always read `show` before `set`.

---

## Discovering block types (`action=catalog`)

`action=catalog` returns the block types you can `add`. The known set (slugs are stable; confirm ids with `catalog`):

| Slug              | Label (EN)      | required | editable | Notes                                        |
| ----------------- | --------------- | -------- | -------- | -------------------------------------------- |
| `app-information` | App Information | ✅       | ✅       | Seeded by `init`; stays first; can't remove. |
| `app-features`    | App Features    | —        | ✅       | The `features`/`benefits` collection.        |
| `app-pricing`     | App Plans       | ✅       | ❌       | No form — pricing renders automatically.     |
| `app-reviews`     | App Reviews     | —        | ✅       |                                              |
| `app-brands`      | App Brands      | —        | ✅       |                                              |
| `app-faq`         | App FAQ         | —        | ✅       |                                              |
| `app-stats`       | App Statistics  | —        | ✅       |                                              |

> Contact details live in the publication's **`contact_information`** section (salla-publication-consistency). Some support/contact channels may surface on `app-information` as flat `support_*` elements — confirm with `action=show`.
>
> `app-information` and `app-pricing` are **required**: `init` seeds them and `remove` rejects them. `app-pricing` is required **and** non-editable (no element keys to `set`).

---

## The shared listing fields

Editing block elements writes these **shared listing fields** into the draft publication. They are the fields this tool owns:

| Field         | Typical element / block | Value shape (confirm via `show`)         | Dimensions / required                           |
| ------------- | ----------------------- | ---------------------------------------- | ----------------------------------------------- |
| `name`        | App Information         | lingual `{ ar, en }`                     | required                                        |
| `description` | App Information         | lingual richtext `{ ar, en }`            | —                                               |
| `logo`        | App Information         | image `[{ id, url }]` (upload first)     | 1:1, ≥ 250×250 px (JPG/JPEG/PNG); required      |
| `screenshots` | App Information         | image `[{ id, url }, …]` (multiple)      | 263×350 px each; required, **≥ 3**              |
| `benefits`    | App Features            | collection (array of prefixed-key items) | benefit image per `benefits.image`; **3** items |

> `short_description` belongs to the publication `basic_information` section, not here → salla-publication-consistency.
> `banner` / `embedded_image` are publication media (not builder fields) → salla-publication-consistency. The image-generation recipe for ALL these fields lives in [SKILL.md](../SKILL.md#generating-missing-listing-images-canonical-recipe).

---

## Element shape

`action=show` returns a block's elements. Common keys (illustrative — confirm per element):

| Key                                   | Meaning                                                                                                                              |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `id`                                  | Element key used in `action=set` (`name`, `bg_color_light`, …). Collection children are **prefixed** (`benefits.title`).             |
| `type`                                | High-level kind: `string`, `number`, `items`, `collection`.                                                                          |
| `format`                              | Specific input: `string`, `email`, `url`, `color`, `image`, `richtext`, `icon`, `number`, `telinput`, `dropdown-list`, `collection`. |
| `label`, `placeholder`, `description` | UI text (language follows the request locale).                                                                                       |
| `lingual`                             | `true` → value is `{ ar, en }`.                                                                                                      |
| `required`                            | Whether a value must be present.                                                                                                     |
| `wide`                                | Layout hint (full-width).                                                                                                            |
| `value`                               | Current saved value (shape depends on `format`).                                                                                     |
| `items`                               | For `image`: current uploaded files as `[{ id, url }]`.                                                                              |
| `options`                             | For `dropdown-list`: `[{ value, label, key }]`.                                                                                      |
| `fields`                              | For `collection`: the child element schemas.                                                                                         |
| `itemLabel`                           | For `collection`: singular label per item.                                                                                           |
| `minLength`/`maxLength`               | String length **or** collection item-count bounds.                                                                                   |
| `min`/`max`                           | Numeric bounds.                                                                                                                      |
| `multiple`                            | For `image`: allow multiple files.                                                                                                   |
| `conditions`                          | Conditional visibility: `[{ id, operation, value }]` — shown only when another element matches.                                      |

### `type` / `format` combinations

| `type`       | `format`        | Value shape in `set`                  | Notes                                                  |
| ------------ | --------------- | ------------------------------------- | ------------------------------------------------------ |
| `string`     | `string`        | `"text"` or `{ ar, en }` if `lingual` | Plain text.                                            |
| `string`     | `email`         | `"x@y.com"`                           | Email validation.                                      |
| `string`     | `url`           | `"https://…"`                         | URL validation.                                        |
| `string`     | `color`         | `"#a3ffe5"`                           | Hex; empty defaults to `#a3ffe5`.                      |
| `string`     | `image`         | `[{ id, url }]`                       | Upload via `salla_upload` first. `multiple` allows >1. |
| `string`     | `richtext`      | `{ ar: "<p>…</p>", en: "<p>…</p>" }`  | HTML; lingual.                                         |
| `string`     | `icon`          | `"hgi-mail-01"`                       | Icon picker (hugeicons).                               |
| `number`     | `number`        | `5`                                   | Respects `min`/`max`.                                  |
| `number`     | `telinput`      | `"+9665…"`                            | Flattened from `{ value, code }`.                      |
| `items`      | `dropdown-list` | `"images"` (an option `value`)        | Choose from `options`.                                 |
| `collection` | `collection`    | `[ { "<id>.child": … }, … ]`          | Array of items; child keys prefixed.                   |

---

## Examples (confirm via `action=show`)

### Lingual string + dropdown + color + collection (`app-features`)

The `benefits`/`features` collection on `app-features` (element keys as `action=show` would return them):

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
    "id": "benefits",
    "type": "collection",
    "format": "collection",
    "required": false,
    "value": [],
    "itemLabel": "ميزه",
    "minLength": 3,
    "maxLength": 3,
    "fields": [
      {
        "id": "benefits.image",
        "format": "image",
        "required": true,
        "multiple": false,
      },
      {
        "id": "benefits.title",
        "format": "string",
        "lingual": true,
        "required": true,
        "value": { "en": "", "ar": "" },
        "maxLength": 255,
      },
      {
        "id": "benefits.description",
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

The collection requires the item count within `minLength`..`maxLength`, each item with a prefixed `benefits.image`, `benefits.title`, `benefits.description`.

### App Information elements (`app-information`)

The block that carries `name`, `description`, `logo`, `screenshots` (labels in `en`, blanks trimmed). Confirm the exact element keys with `action=show`:

```jsonc
[
  {
    "id": "view_section",
    "type": "items",
    "format": "dropdown-list",
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

  // Logo must be 250x250 (JPG/JPEG/PNG):
  { "id": "logo", "format": "image", "required": true, "multiple": false },
  // Main Title → the shared `name` field:
  {
    "id": "name",
    "format": "string",
    "lingual": true,
    "required": true,
    "value": { "en": "", "ar": "" },
  },
  // Images — appropriate size 263 x 350 → the shared `screenshots` field:
  {
    "id": "screenshots",
    "format": "image",
    "required": true,
    "multiple": true,
  },
  // App Details → the shared `description` field:
  {
    "id": "description",
    "format": "richtext",
    "lingual": true,
    "required": false,
    "value": { "en": "", "ar": "" },
  },

  // Some support/contact channels may appear here as flat support_* elements —
  // confirm with action=show. Primary contact details live in the publication
  // contact_information section (salla-publication-consistency).
  {
    "id": "support_title",
    "format": "string",
    "lingual": true,
    "required": false,
  },
  { "id": "support_email", "format": "email", "required": false },
  {
    "id": "support_whatsapp",
    "type": "number",
    "format": "telinput",
    "required": false,
  },
]
```

Note: `image` elements (`logo`, `screenshots`) carry current files under **`items`** (`[{ id, url }]`), not `value`; upload new ones via `salla_upload` first. Contact details live in the publication `contact_information` section (salla-publication-consistency), not on this block.

Each collection value serializes as an array of items keyed by **prefixed child ids** (`benefits.title`, not `title`). Full `set` value shapes → [payloads.md](payloads.md).
