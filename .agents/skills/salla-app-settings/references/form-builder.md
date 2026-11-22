# App Settings Form Builder

App Settings is a per-merchant configuration form rendered inside the Salla Merchant Dashboard after the merchant installs your app. You define the fields; Salla stores and serves the values.

---

## Where It Lives

**Partners Portal → App Details → App Settings**

Two things to configure:

1. **Settings Form** — the JSON/HTML schema that defines the fields shown to the merchant
2. **Settings validation** — an optional `app.settings.validating` App Function Salla runs to
   validate values before saving (the Validation URL is legacy)

---

## Field Schema (`type` + `format`)

Salla's form-builder renders from `type` **+** `format`, not a single loose `type`. Always
use a real pair from the taxonomy (a bare alias like `toggle` / `text` / `number` /
`select` is not Portal-safe).

This is the **curated core** of pairs to use:

| `type`                   | `format` (core)                                | Notes                                   |
| ------------------------ | ---------------------------------------------- | --------------------------------------- |
| `boolean`                | `checkbox` (a `switch` is the same boolean)    | `value`, `icon`                         |
| `string`                 | `text`, `textarea`, `password`, `url`, `email` | `minLength`, `maxLength`; `placeholder` |
| `string` (value pickers) | `color`, `image`, `date`, `time`, `datetime`   |                                         |
| `number`                 | `integer`, `float`                             | `minimum`, `maximum`, `step`            |
| `items`                  | `dropdown-list`, `radio-list`, `checkbox-list` | `options` + scalar default `value`      |

**Prefer the simplest type that fits the data.** A `number` (with `minimum` / `maximum` /
`step`) covers what a slider or unit-input would do — don't reach for those. `checkbox`
covers on/off (a `switch` is the same boolean). Use `textarea` for multi-line text.

**Advanced formats exist but add complexity — avoid unless genuinely required:** `richtext`
(use `textarea` unless rich formatting is essential), `code`, `icon`, the nested
`collection` type (repeatable sub-field groups), and `static` display blocks
(`title` / `description` / `line`). Prefer the core; only use these when the use case truly
needs them.

Common props: `id` (**snake_case**), `type`, `format`, `label`, `value` (the **default** —
required fields MUST have one), `required`, `public`, `icon` (a Salla icon, e.g.
`sicon-toggle-off`), `placeholder`, `labelHTML`, `multilanguage`. The builder seeds string
fields with `minLength` / `maxLength` and number fields with `minimum` / `maximum` / `step`;
`items` fields carry `options` plus a scalar default `value`.

**Labels are Arabic-first.** Most merchants are Arabic — write `label` / `description` in
Arabic and set `multilanguage: true` to also supply English. `multilanguage` applies to
string `text` / `textarea` fields only (the builder gates it via `supportsMultilanguage`).
`public: true` = safe to read client-side (storefront); secrets stay `public: false`.

---

## Form Schema Example

Pass these field objects as the **`settings`** array to `salla_settings action=define_form`
(the MCP param is `settings`, not `fields`).

```json
{
  "settings": [
    {
      "id": "api_key",
      "type": "string",
      "format": "password",
      "label": "مفتاح API",
      "required": true,
      "value": "",
      "placeholder": "أدخل مفتاح API",
      "public": false
    },
    {
      "id": "sandbox_mode",
      "type": "boolean",
      "format": "checkbox",
      "label": "الوضع التجريبي",
      "icon": "sicon-toggle-off",
      "value": false,
      "public": true
    },
    {
      "id": "environment",
      "type": "items",
      "format": "dropdown-list",
      "label": "البيئة",
      "value": "production",
      "options": [
        { "value": "production", "label": "الإنتاج" },
        { "value": "staging", "label": "التجريب" }
      ]
    }
  ]
}
```

The field identifier is **`id`** (snake_case); `label` / `placeholder` / `description` are
**plain strings** — set `multilanguage: true` (string `text` / `textarea` only) to
translate a field's text (no inline `{en, ar}` objects).

**`items` options + default.** At this layer (the `salla_settings action=define_form` MCP
tool + the App Settings docs OpenAPI), an `items` field carries `options: [{label, value}]`
and the default is the **scalar `value`** of the chosen option (`"production"` above), which
is the shape shown here. (The builder UI tracks the selection internally as a `selected`
array of option objects with a `key`; that internal model differs, but define_form and the
runtime GET/POST work in scalar `value`s.)

---

## Settings Validation Function (`app.settings.validating`)

Salla runs this App Function **synchronously** when the merchant saves the settings form,
before anything is saved, and waits up to **10 s**. It validates only; storage is the
`app.settings.updated` webhook's job. Save it with `salla_functions action=save`; it runs on
demo stores at once and on live stores after the next approved publication.

```ts
export default async (context: AppSettingsValidating): Promise<Resp> => {
  const { fields } = context.payload.data; // the values being saved, keyed by field id
  const errors: Record<string, string[]> = {};

  if (!fields.api_key) errors.api_key = ["API key is required"];

  if (Object.keys(errors).length > 0) {
    return Resp.error()
      .setStatus(422)
      .setMessage("Please fix the highlighted fields", errors);
  }

  return Resp.success().setData({});
};
```

- `context.settings` holds the merchant's saved settings (may be a few minutes old; `{}` on first save).
- A 422 with field errors blocks the save and shows each message under its field.
- An error, a timeout or any answer without `success: true` blocks the save with a generic
  error, so keep the check fast and never call a slow API without a time limit.

---

## Validation URL Contract (legacy, validation only)

An app without the `app.settings.validating` function keeps using its Validation URL. The
Portal refuses a new or changed URL once the partner is moved to the function; clear an old one
with `salla_settings action=set_validation_url validation_url=null`.

If you set a Validation URL, Salla POSTs the proposed values to it **before saving** so you
can accept or reject them. It is a **public endpoint with no signature** and **no
`Authorization` header** — validate the values and respond, nothing more. Storage is the
`app.settings.updated` webhook's job ([docs](https://docs.salla.dev/421413m0.md)).

**Request from Salla:**

```http
POST https://your-app.com/settings/validate
Content-Type: application/json

{
  "merchant_id": 12345,
  "store_id": 67890,
  "settings": {
    "api_key": "abc123",
    "sandbox_mode": false,
    "environment": "production"
  }
}
```

**Your response — valid:**

```json
{ "success": true }
```

**Your response — invalid (blocks save, shows error to merchant):**

```json
{
  "success": false,
  "error": {
    "field": "api_key",
    "message": { "en": "Invalid API key", "ar": "مفتاح API غير صالح" }
  }
}
```

---

## Critical Rules

1. **Send ALL keys on POST** — partial updates set omitted keys to `null`.
2. **Labels are plain strings** — set `multilanguage: true` (string `text` / `textarea`
   only) to translate a field (no inline `{en, ar}` objects).
3. **Secrets are non-public** — API keys, passwords, and tokens use `format: "password"`,
   read only server-side or from `context.settings`, stored encrypted, never logged or sent
   to client code. The builder's password control carries `hide: true`, which removes the
   public option, so a secret can never be exposed to the storefront (keep `public: false`
   to make the intent explicit).
4. **Settings validation validates, never stores** — the `app.settings.validating` function
   (or a legacy Validation URL) only accepts or rejects; settings are persisted from the
   `app.settings.updated` webhook.
5. **Use a real `type`+`format` pair** from the taxonomy above.

---

## Typical Install Flow

```text
Merchant installs app
    ↓
app.store.authorize webhook fires → your server receives token
    ↓
Salla redirects merchant to your Settings form
    ↓
Merchant fills form and saves
    ↓
Salla runs your app.settings.validating function (or a legacy Validation URL), if set
    ↓
On success → Salla stores the values itself (your POST /apps/{app_id}/settings is only for runtime writes from your code)
    ↓
Your App Functions can now read settings via context.settings
```

---

## Resources

| Topic                    | Link                 |
| ------------------------ | -------------------- |
| App Settings API spec    | api-spec.md          |
| Common settings patterns | settings-patterns.md |
