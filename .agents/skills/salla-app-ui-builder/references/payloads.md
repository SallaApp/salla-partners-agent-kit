# Payloads — `app_page_builder action=set` value shapes

How a block's element values are shaped when you pass them to **`app_page_builder action=set`** (the `values` element-key → value map). Each value's shape is dictated by the element's `format` and `lingual` flag. Read the real element keys with `action=show` before building a `set` payload — the ids and URLs below are illustrative.

> **`set` replaces the whole block.** Carry over every value you aren't changing — especially `required` elements — to avoid validation errors or wiping existing content. Keep already-stored images by leaving their `{ id, url }` in place.
>
> Image URLs and richtext become **public App-Store content** — use only trusted, sanitized assets/HTML.

---

## Rules by element type

### Lingual → `{ ar, en }`

Any element with `lingual: true` (string or richtext) must carry **both** languages as `{ ar, en }`. Sending only one fails validation for the missing language.

```jsonc
// schema: { "id": "name", "format": "string", "lingual": true }
"name": { "ar": "تطبيقنا", "en": "Our App" }

// schema: { "id": "description", "format": "richtext", "lingual": true }
"description": { "ar": "<p>وصف</p>", "en": "<p>Description</p>" }
```

### Collections → array of prefixed-key objects

A `collection` value is an array of items. **Each item's keys are the child element ids exactly as in `fields[].id`** — i.e. prefixed with the collection id (`benefits.title`, not `title`). Honor `minLength`/`maxLength` as the **item count**.

```jsonc
// schema: collection "benefits" with benefits.image | benefits.title | benefits.description
"benefits": [
  {
    "benefits.image": [ { "id": 176983, "url": "https://…/a.jpg" } ],
    "benefits.title": { "ar": "سريع", "en": "Fast" },
    "benefits.description": { "ar": "وصف", "en": "Blazing fast" }
  },
  { "benefits.image": […], "benefits.title": {…}, "benefits.description": {…} },
  { "benefits.image": […], "benefits.title": {…}, "benefits.description": {…} }
]
```

### Image (`logo`, `screenshots`, `*.image`) → `[{ id, url }]`

Upload first, then reference. An `image` element's current files are under `items` as `[{ id, url }]`; the `set` value takes the same shape. `multiple: false` still uses a one-entry array.

```jsonc
// salla_upload (pass source_url) → image id (e.g. 176983):
"logo": [ { "id": 176983, "url": "https://salla-dev-portal.s3…/a.jpg" } ]
```

`salla_upload` is the media path: pass a `source_url`, get an integer `id`, put `[{ id, url }]` in the `set` value. Keep an existing image by leaving its `{ id, url }` in place.

### Telinput → flatten to the value string

The phone widget holds `{ value, code }`; flatten to just the dialed string.

```jsonc
// widget: { "value": "+966500000000", "code": "SA" }
"support_whatsapp": "+966500000000"
```

### Color → hex string

```jsonc
"bg_color_light": "#a3ffe5"   // empty defaults to #a3ffe5
```

### Dropdown (`items` / `dropdown-list`) → the option's `value`

Submit the `value` of the chosen option (not its `label` or `key`).

```jsonc
// options: [ { "value": "images", "label": "صور الميزات", "key": "images" } ]
"view_section": "images"
```

### Conditional elements

If an element has `conditions` (e.g. `image_orientation` shown only when `view_section = grid`), only include it when the condition is met.

### Plain string / email / url / number → primitive

```jsonc
"support_email": "support@my-app.com",  // email
"app_url": "https://my-app.com",        // url
"images_per_row": 3                     // number (respect min/max)
```

---

## Worked example: `set` on `app-features`

1. **Open the draft & init** — `app_publish action=open`, then `app_page_builder action=init`.
2. **Learn the keys** — `app_page_builder action=show block_id=<app-features id>` returns: lingual `title`, dropdown `view_section`, optional orientation dropdowns, two `color`s, and the `benefits` collection (min/max) with `benefits.image|title|description`.
3. **Write the values** — `app_page_builder action=set block_id=<app-features id> values=` :

```json
{
  "title": { "ar": "لماذا تطبيقنا؟", "en": "Why our app?" },
  "view_section": "images",
  "bg_color_light": "#ffffff",
  "bg_color_dark": "#0b0b0b",
  "benefits": [
    {
      "benefits.image": [
        { "id": 176983, "url": "https://salla-dev-portal.s3…/a.jpg" }
      ],
      "benefits.title": { "ar": "سريع", "en": "Fast" },
      "benefits.description": { "ar": "أداء فوري", "en": "Instant performance" }
    },
    {
      "benefits.image": [
        { "id": 176984, "url": "https://salla-dev-portal.s3…/b.jpg" }
      ],
      "benefits.title": { "ar": "آمن", "en": "Secure" },
      "benefits.description": { "ar": "حماية كاملة", "en": "Fully protected" }
    },
    {
      "benefits.image": [
        { "id": 176985, "url": "https://salla-dev-portal.s3…/c.jpg" }
      ],
      "benefits.title": { "ar": "سهل", "en": "Simple" },
      "benefits.description": { "ar": "إعداد بسيط", "en": "Easy setup" }
    }
  ]
}
```

4. **The tool confirms the save**; if an element is missing or malformed it flags the offending key — fix it and `set` again.

---

## Validation feedback

`action=set` flags missing or malformed values per element key, as dotted paths — read each back to an element key (and collection index/language):

| Cue                   | Means                                                              |
| --------------------- | ------------------------------------------------------------------ |
| `name.en`             | The `name` element is missing its `en` value.                      |
| `view_section`        | The `view_section` dropdown value is missing/invalid.              |
| `benefits`            | The collection item count is outside `minLength`..`maxLength`.     |
| `benefits.0.title.ar` | Item **0** of `benefits` is missing `benefits.title`'s `ar` value. |
| `benefits.1.image`    | Item **1** of `benefits` is missing its image.                     |

The dotted path tells you the element key, the collection index, and the language to fix.
