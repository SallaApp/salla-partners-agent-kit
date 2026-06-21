# Payloads (content shapes)

How a block's field values are shaped. **These are content shapes you fill in the Partners Portal's App Presentation Builder by hand — not request bodies.** There is no MCP tool or public API for editing presentation blocks today; the shapes below describe what each field expects so you can populate the builder correctly and recognize how saved values look.

Each block's content is a flat set of values keyed by field `id`. Each value's shape is dictated by the field's `format` and `lingual` flag.

> Editing a block in the builder replaces the **whole block**. Carry over every value you aren't changing — especially `required` fields — or you'll trigger validation or wipe existing content. Keep already-stored images by leaving their `{ id, url }` in place.
>
> The values below are **illustrative shapes** (placeholder ids/URLs, not a published contract). Confirm them against the **live** field schema the Portal builder presents, and cross-check via docs (`salla-docs`). Image URLs and richtext become **public App-Store content** — only use trusted, sanitized assets/HTML; don't pass through untrusted user input.
>
> **Current state (for now):** manual in the Portal builder, after the publish details. The only MCP tool that applies is `salla_upload`, for uploading publication media (which also auto-fills the default template). Revisit when a `salla_app_builder` MCP tool ships.

---

## Rules by field type

### Lingual fields → `{ ar, en }`

Any field with `lingual: true` (string or richtext) must be an object with **both** languages — never a bare string. Sending only one language fails validation for the missing one.

```jsonc
// schema: { "id": "title", "format": "string", "lingual": true }
"title": { "ar": "مميزاتنا", "en": "Our Features" }

// schema: { "id": "description", "format": "richtext", "lingual": true }
"description": { "ar": "<p>وصف</p>", "en": "<p>Description</p>" }
```

### Collections → array of prefixed-key objects

A `collection` value is an array of items. **Each item's keys are the child field ids exactly as in `fields[].id`** — i.e. prefixed with the collection id (`features.title`, not `title`). Honor `minLength`/`maxLength` as the **item count** (e.g. `features` requires exactly 3 items).

```jsonc
// schema: collection "features" with fields features.image | features.title | features.description
"features": [
  {
    "features.image": [ { "id": 176983, "url": "https://…/a.jpg" } ],
    "features.title": { "ar": "سريع", "en": "Fast" },
    "features.description": { "ar": "وصف", "en": "Blazing fast" }
  },
  { "features.image": […], "features.title": {…}, "features.description": {…} },
  { "features.image": […], "features.title": {…}, "features.description": {…} }
]
```

### Image fields → `[{ id, url }]`

Upload the file first, then reference it. An `image` field's current files are held under `items` as `[{ id, url }]`; the value takes the same shape. `multiple: false` still uses an array (with one entry).

```jsonc
// upload publication media via salla_upload (pass source_url) → image id (e.g. 176983):
"logo": [ { "id": 176983, "url": "https://salla-dev-portal.s3…/a.jpg" } ]
```

`salla_upload` is the one MCP tool that applies here, and only for publication media (logo, screenshots) — the same media that auto-fills the default template. Keep an existing image by leaving its `{ id, url }` in place.

### Telinput → flatten to the value string

The portal's phone widget holds `{ value, code }`; flatten to just the dialed string.

```jsonc
// widget: { "value": "+966500000000", "code": "SA" }
"support_whatsapp": "+966500000000"
```

### Color → hex string

```jsonc
"bg_color_light": "#a3ffe5"   // empty defaults to #a3ffe5 in the portal
```

### Dropdown (`items` / `dropdown-list`) → the option's `value`

Submit the `value` of the chosen option (not its `label` or `key`).

```jsonc
// options: [ { "value": "images", "label": "صور الميزات", "key": "images" } ]
"view_section": "images"
```

### Conditional fields

If a field has `conditions` (e.g. `image_orientation` shown only when `view_section = grid`), only include it when the condition is met. Sending a hidden field's value is unnecessary and may be ignored or rejected.

### Plain string / email / url / number → primitive

```jsonc
"support_telegram": "@my_app",          // string
"support_email": "support@my-app.com",  // email
"app_url": "https://my-app.com",        // url
"images_per_row": 3                     // number (respect min/max)
```

---

## Worked example: filling `app-features` in the builder

1. **Open the block** — in the Portal builder, open the `app-features` block (id `2038173539`). Its form has: lingual `title`, required dropdown `view_section`, optional `images_orientation` + `description_orientation`, two `color`s, and the `features` collection (min/max 3) with `features.image|title|description`.

2. **Fill each field** following every rule above. The resulting content takes this shape:

```json
{
  "title": { "ar": "لماذا تطبيقنا؟", "en": "Why our app?" },
  "view_section": "images",
  "images_orientation": "horizontal",
  "description_orientation": "below",
  "bg_color_light": "#ffffff",
  "bg_color_dark": "#0b0b0b",
  "features": [
    {
      "features.image": [
        { "id": 176983, "url": "https://salla-dev-portal.s3…/a.jpg" }
      ],
      "features.title": { "ar": "سريع", "en": "Fast" },
      "features.description": { "ar": "أداء فوري", "en": "Instant performance" }
    },
    {
      "features.image": [
        { "id": 176984, "url": "https://salla-dev-portal.s3…/b.jpg" }
      ],
      "features.title": { "ar": "آمن", "en": "Secure" },
      "features.description": { "ar": "حماية كاملة", "en": "Fully protected" }
    },
    {
      "features.image": [
        { "id": 176985, "url": "https://salla-dev-portal.s3…/c.jpg" }
      ],
      "features.title": { "ar": "سهل", "en": "Simple" },
      "features.description": { "ar": "إعداد بسيط", "en": "Easy setup" }
    }
  ]
}
```

3. **Save in the builder.** The builder confirms a successful save; if a field is missing or malformed it flags the offending field — fix it and save again.

---

## Validation feedback

The builder flags missing or malformed values per field. The cues map to dotted paths — read each back to a field id (and collection index/language) to correct the content:

| Cue                   | Means                                                              |
| --------------------- | ------------------------------------------------------------------ |
| `title.en`            | The `title` field is missing its `en` value.                       |
| `view_section`        | The `view_section` dropdown value is missing/invalid.              |
| `features`            | The collection item count is outside `minLength`..`maxLength`.     |
| `features.0.title.ar` | Item **0** of `features` is missing `features.title`'s `ar` value. |
| `features.1.image`    | Item **1** of `features` is missing its image.                     |

The dotted path itself tells you the field id, the collection index, and the language to fix.
