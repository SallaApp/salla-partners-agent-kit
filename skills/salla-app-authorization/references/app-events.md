# app.store.authorize — Full Payload Reference

Source: https://docs.salla.dev/421413m0#app-store-authorize

Fired in two situations:
1. Merchant installs the app for the first time
2. Merchant updates the app — Salla fires `app.updated` then immediately fires this

Your handler covers both cases. Always upsert, never insert-only.

```json
{
  "event": "app.store.authorize",
  "merchant": 1234509876,
  "created_at": "2022-12-31 12:31:25",
  "data": {
    "access_token": "KGsnBcNNkR2AgHnrd0U9lCIjrUiukF_-Fb8OjRiEcog.NuZv_mJaB46jA2OHaxxxx",
    "expires": 1634819484,
    "refresh_token": "fWcceFWF9eFH4yPVOCaYHy-UolnU7iJNDH-dnZwakUE.bpSNQCNjbNg6hTxxxx",
    "scope": "settings.read branches.read offline_access",
    "token_type": "bearer"
  }
}
```

## Field Notes

| Field | Type | Notes |
|---|---|---|
| `merchant` | number | Use this as your DB key to store tokens per merchant |
| `data.access_token` | string | Bearer token for all Merchant API calls |
| `data.expires` | number | Unix timestamp — multiply by 1000 for JS milliseconds |
| `data.refresh_token` | string | Single-use — store immediately, never discard |
| `data.scope` | string | Space-separated granted scopes |
| `data.token_type` | string | Always `"bearer"` |

## What to Do On Receipt

```typescript
if (payload.event === "app.store.authorize") {
  const { access_token, refresh_token, expires, scope } = payload.data;

  await db.merchants.upsert({
    where:  { id: payload.merchant },
    create: { id: payload.merchant, accessToken: access_token, refreshToken: refresh_token, tokenExpiresAt: new Date(expires * 1000), scope },
    update: { accessToken: access_token, refreshToken: refresh_token, tokenExpiresAt: new Date(expires * 1000), scope },
  });
}
```
