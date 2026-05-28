# Salla Admin API

Docs: https://docs.salla.dev/doc-421117 | App Settings guide: https://salla.dev/blog/how-to-build-app-settings-form/

Base URL: `https://api.salla.dev/admin/v2`

All requests need `Authorization: Bearer <access_token>`.

## Identify a merchant from a token

```
GET /oauth2/user/info
```

Response: `data.merchant.id` — use this as your stable internal key for the merchant.

## Common API Resources

For core e-commerce integrations, use these standard endpoints:

| Resource  | Method | Endpoint     | Documentation Reference           |
| --------- | ------ | ------------ | --------------------------------- |
| Orders    | GET    | `/orders`    | https://docs.salla.dev/doc-421124 |
| Products  | GET    | `/products`  | https://docs.salla.dev/doc-421121 |
| Customers | GET    | `/customers` | https://docs.salla.dev/doc-421126 |

### Pagination & Request Limits

Collection endpoints support standard pagination parameters:

- `page`: Page number (1-indexed, default: 1)
- `per_page`: Records per page (default: 20, max: 50)

Example: `GET /orders?page=2&per_page=30`

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
