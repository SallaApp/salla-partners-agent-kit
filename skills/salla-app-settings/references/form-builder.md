# App Settings Form Builder

App Settings is a per-merchant configuration form rendered inside the Salla Merchant Dashboard after the merchant installs your app. You define the fields; Salla stores and serves the values.

---

## Where It Lives

**Partners Portal → App Details → App Settings**

Two things to configure:

1. **Settings Form** — the JSON/HTML schema that defines the fields shown to the merchant
2. **Validation URL** — an optional endpoint Salla calls to validate values before saving

---

## Field Types

| Type                 | UI control                  | Use for                          |
| -------------------- | --------------------------- | -------------------------------- |
| `text`               | Single-line input           | API keys, URLs, usernames        |
| `password`           | Masked input                | Secrets, tokens                  |
| `email`              | Email input with validation | Contact emails                   |
| `number`             | Numeric input               | Timeouts, limits, IDs            |
| `toggle` / `boolean` | On/Off switch               | Feature flags                    |
| `select`             | Dropdown                    | Fixed option sets                |
| `textarea`           | Multi-line input            | Long text, notes                 |
| `url`                | URL input with validation   | Webhook endpoints, API base URLs |

---

## Form Schema Example

```json
{
  "fields": [
    {
      "id": "api_key",
      "type": "text",
      "label": "API Key",
      "required": true,
      "placeholder": "Enter your carrier API key",
      "public": false
    },
    {
      "id": "sandbox_mode",
      "type": "toggle",
      "label": "Sandbox Mode",
      "default": false
    },
    {
      "id": "environment",
      "type": "select",
      "label": "Environment",
      "options": [
        { "value": "production", "label": "Production" },
        { "value": "staging", "label": "Staging" }
      ],
      "default": "production"
    },
    {
      "id": "webhook_url",
      "type": "url",
      "label": "Callback URL",
      "required": false
    }
  ]
}
```

Field identifier is **`id`**; `label` / `placeholder` / `description` are plain strings
(not bilingual objects). `public: true` marks a value as safe for client-side use
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
2. **Labels must be bilingual** — provide both `en` and `ar` for all user-visible text
3. **Never store sensitive values client-side** — always read from `context.settings` in App Functions
4. **Validate on your server** — don't trust values without server-side validation

---

## Typical Install Flow

```
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
