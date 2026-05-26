# Salla Admin API

Docs: https://docs.salla.dev/doc-421117 | App Settings guide: https://salla.dev/blog/how-to-build-app-settings-form/

Base URL: `https://api.salla.dev/admin/v2`

All requests need `Authorization: Bearer <access_token>`.

## Identify a merchant from a token

```
GET /oauth2/user/info
```

Response: `data.merchant.id` — use this as your stable internal key for the merchant.

## App Settings

```
GET  /apps/{appId}/settings    → returns the merchant's saved settings
POST /apps/{appId}/settings    → replaces the entire settings object
```

The POST is a **full replace**, not a merge. If you omit a key, Salla sets it to null.
Always fetch current settings first, merge your changes, then POST everything together.

```typescript
// Wrong — nulls every other key:
await api.post(`/apps/${appId}/settings`, { new_key: "value" });

// Correct — send all keys:
const current = await api.get(`/apps/${appId}/settings`);
await api.post(`/apps/${appId}/settings`, {
  ...current.data,
  new_key: "value",
});
```

Settings entered in the Salla Partners Portal are available as `context.settings`
inside App Functions.
