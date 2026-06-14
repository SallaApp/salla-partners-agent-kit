# Payloads

How to turn a block's field schema into a valid `POST`/`PUT` body. The portal applies these same transforms in `ui-partners-portal-apps/src/routes/apps/[id]/builder/edit/utils/formBuilderHelpers.ts` (`prepareFormData` reading, `preparePayload` writing); the backend expects the output shapes below. Calling the API directly, you must produce them yourself.

The payload is a flat object keyed by field `id`. Each value's shape is dictated by the field's `format` and `lingual` flag.

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

Upload the file first, then reference it. An `image` field's current files come back under `items` as `[{ id, url }]`; submit the same shape. `multiple: false` still uses an array (with one entry).

```jsonc
// upload returns { id, url }:
//   POST /api/upload/image   (multipart "file")  → { "data": { "id": 176983, "url": "https://…" } }
"logo": [ { "id": 176983, "url": "https://salla-dev-portal.s3…/a.jpg" } ]
```

Keep an existing image by passing its `{ id, url }` from the GET response unchanged. (The portal also accepts `[{ "url": … }]` for freshly uploaded files; including the `id` for already-stored files is safest.)

### Telinput → flatten to the value string

The portal's phone widget holds `{ value, code }`; flatten to just the dialed string.

```jsonc
// widget: { "value": "+966500000000", "code": "SA" }
"phone": "+966500000000"
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
"telegram": "@my_app",          // string
"email": "support@my-app.com",  // email
"links.url": "https://my-app.com", // url
"images_per_row": 3             // number (respect min/max)
```

---

## End-to-end example: filling `app-features`

1. **Read the schema** — `GET /api/apps/{appId}/builder/blocks/2038173539` returns: lingual `title`, required dropdown `view_section`, optional `images_orientation` + `description_orientation`, two `color`s, and the `features` collection (min/max 3) with `features.image|title|description`.

2. **Build the PUT body** matching every rule above:

```http
PUT /api/apps/{appId}/builder/blocks/2038173539
Authorization: Bearer {token}
Content-Type: application/json
```
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
      "features.image": [ { "id": 176983, "url": "https://salla-dev-portal.s3…/a.jpg" } ],
      "features.title": { "ar": "سريع", "en": "Fast" },
      "features.description": { "ar": "أداء فوري", "en": "Instant performance" }
    },
    {
      "features.image": [ { "id": 176984, "url": "https://salla-dev-portal.s3…/b.jpg" } ],
      "features.title": { "ar": "آمن", "en": "Secure" },
      "features.description": { "ar": "حماية كاملة", "en": "Fully protected" }
    },
    {
      "features.image": [ { "id": 176985, "url": "https://salla-dev-portal.s3…/c.jpg" } ],
      "features.title": { "ar": "سهل", "en": "Simple" },
      "features.description": { "ar": "إعداد بسيط", "en": "Easy setup" }
    }
  ]
}
```

3. **Submit.** `{ "success": true, "data": null }` means saved. A 422 lists the offending fields — fix and resend.

---

## Validation errors

A 422 returns `fields` keyed by dotted paths. Map each back to a field id (and collection index/language) to correct the payload:

| Error key | Means |
| --- | --- |
| `title.en` | The `title` field is missing its `en` value. |
| `view_section` | The `view_section` dropdown value is missing/invalid. |
| `features` | The collection item count is outside `minLength`..`maxLength`. |
| `features.0.title.ar` | Item **0** of `features` is missing `features.title`'s `ar` value. |
| `features.1.image` | Item **1** of `features` is missing its image. |

The portal normalizes these paths to form-field keys in `formErrorsMapper.ts`; for direct API use, the dotted path itself tells you the field id, the collection index, and the language to fix.
