# App Settings Form Builder

App Settings is a per-merchant configuration form rendered inside the Salla Merchant Dashboard after the merchant installs your app. You define the fields; Salla stores and serves the values.

---

## Where It Lives

**Partners Portal → App Details → App Settings**

Two things to configure:

1. **Settings Form** — the JSON/HTML schema that defines the fields shown to the merchant
2. **Validation URL** — an optional endpoint Salla calls to validate values before saving

---

## Field Schema (`type` + `format`)

Salla's form-builder renders from `type` **+** `format`, not a single loose `type`. Bare
aliases (`toggle`, `text`, `number`, `select`) save but render broken/empty — always use a
real pair.

The table below is the supported set (matching the `salla_settings action=define_form` MCP
schema). The form-builder source has a few extra string/number formats and a `collection`
type; they are complex or have a simpler equivalent here — prefer these pairs:

| Control                  | `type`    | `format`        | Extra props          |
| ------------------------ | --------- | --------------- | -------------------- |
| Switch                   | `boolean` | `switch`        | `value`, `icon`      |
| Checkbox                 | `boolean` | `checkbox`      | `value`              |
| Text                     | `string`  | `text`          | `placeholder`        |
| Email                    | `string`  | `email`         |                      |
| URL                      | `string`  | `url`           | `placeholder`        |
| Password / secret        | `string`  | `password`      |                      |
| Integer                  | `number`  | `integer`       | `minimum`, `maximum` |
| Float                    | `number`  | `float`         | `minimum`, `maximum` |
| Single choice (radio)    | `items`   | `radio-list`    | `options`            |
| Single choice (dropdown) | `items`   | `dropdown-list` | `options`            |
| Multi choice             | `items`   | `checkbox-list` | `options`            |

Common props: `id` (**snake_case**), `type`, `format`, `label`, `value` (the **default** —
required fields MUST have one), `required`, `public`, `icon` (a Salla icon, e.g.
`sicon-toggle-off`), `placeholder`, `labelHTML`, `multilanguage`.

**Labels are Arabic-first.** Most merchants are Arabic — write `label` / `description` in
Arabic and set `multilanguage: true` to also supply English. `public: true` = safe to read
client-side (storefront); secrets stay `public: false`.

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
      "multilanguage": true,
      "public": false
    },
    {
      "id": "sandbox_mode",
      "type": "boolean",
      "format": "switch",
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
**plain strings** — set `multilanguage: true` to translate a field's text (no inline
`{en, ar}` objects).

---

## Validation URL Contract (validation only)

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
2. **Labels are plain strings** — set `multilanguage: true` to translate a field (no inline
   `{en, ar}` objects).
3. **Secrets stay `public: false`** — API keys, passwords, and tokens are read only
   server-side or from `context.settings`, stored encrypted, never logged or sent to
   client code.
4. **Validation URL validates, never stores** — public, signature-free; settings are
   persisted from the `app.settings.updated` webhook.
5. **Use a real `type`+`format` pair** — loose aliases save but render broken.

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
Salla calls your Validation URL (if set)
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
