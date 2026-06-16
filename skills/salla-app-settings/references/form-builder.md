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

Salla's form-builder renders from `type` **+** `format` — not a single loose `type`. Bare
aliases (`toggle`, `text`, `number`, `select`, `url`, `textarea`) are **NOT Portal-safe**:
they can render as broken form-builder output and silently fail to save. Use:

| Control                  | `type`    | `format`        | Extra props          |
| ------------------------ | --------- | --------------- | -------------------- |
| Switch                   | `boolean` | `switch`        | `value`, `icon`      |
| Checkbox                 | `boolean` | `checkbox`      | `value`              |
| Text                     | `string`  | `text`          | `placeholder`        |
| Email                    | `string`  | `email`         |                      |
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

```json
{
  "fields": [
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

`id` is **snake_case**; `value` is the default (required fields MUST set one). Bare `type`
without `format` is not Portal-safe — see the Field Schema table above.

Field identifier is **`id`**; `label` / `placeholder` / `description` are **plain
strings**. To translate a field's text, set `multilanguage: true` on it — there are no
inline `{en, ar}` objects. `public: true`
marks a value as safe for client-side use
(e.g. tracking IDs) — API keys and secrets must stay `public: false` (server/App
Function only).

---

## Validation URL Contract

If you set a Validation URL, Salla will POST to it before saving the merchant's settings.

**Request from Salla:**

```http
POST https://your-app.com/settings/validate
Content-Type: application/json
Authorization: Bearer <hex-hmac-sha256>

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

Always verify the `Authorization: Bearer` signature (HMAC-SHA256, Web Crypto `subtle.verify`) before processing. See [settings-patterns.md](settings-patterns.md) for the verification implementation.

---

## Critical Rules

1. **Always send ALL keys on POST** — partial updates set omitted keys to `null`
2. **Labels are plain strings** — set `multilanguage: true` on a field to translate its text (no inline `{en, ar}` objects)
3. **Never store sensitive values client-side** — always read from `context.settings` in App Functions
4. **Validate on your server** — don't trust values without server-side validation

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

| Topic                             | Link                                                   |
| --------------------------------- | ------------------------------------------------------ |
| How to build an App Settings form | https://salla.dev/blog/how-to-build-app-settings-form/ |
| App Settings API spec             | api-spec.md                                            |
