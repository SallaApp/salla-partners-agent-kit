# app.store.authorize — Full Payload Reference

Source: https://docs.salla.dev/421413m0.md#app-store-authorize

Fired in two situations:

1. Merchant installs the app for the first time
2. Merchant updates the app — Salla fires `app.updated` then immediately fires this

Your handler covers both cases. Always upsert, never insert-only.

> The field shape below is authoritative (from the App Events doc above); the token
> **values** are placeholders. Never hard-code or log real token values from a live
> payload. Event slugs are confirmable via the Partners MCP (`salla_events action=list`).

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

| Field                | Type   | Notes                                                 |
| -------------------- | ------ | ----------------------------------------------------- |
| `merchant`           | number | Use this as your DB key to store tokens per merchant  |
| `data.access_token`  | string | Bearer token for all Merchant API calls               |
| `data.expires`       | number | Unix timestamp — multiply by 1000 for JS milliseconds |
| `data.refresh_token` | string | Single-use — store immediately, never discard         |
| `data.scope`         | string | Space-separated granted scopes                        |
| `data.token_type`    | string | Always `"bearer"`                                     |

## What to Do On Receipt

**Verify the webhook signature FIRST.** This handler runs only after the request has
passed `X-Salla-Signature` verification — see [salla-webhooks](../../salla-webhooks/SKILL.md)
for the verification + idempotency contract. Never persist tokens from an unverified
request.

**Validate before persisting.** Guard against a missing `data`, missing tokens, a
malformed `expires`, or an unexpected `token_type` rather than writing garbage to the DB.

**Persist to a real datastore, keyed by `merchant`.** `db.merchants` below must be a durable
store (Postgres, MySQL, DynamoDB, persisted Redis, …). On serverless/Vercel, `/tmp` and
module-level variables are wiped on every cold start, so a token written there is gone before
the next request and the merchant's API calls start returning 403 — `app.store.authorize`
fires only on install/update, so the token is not re-delivered until a reinstall.

**Secret hygiene** (store encrypted, HTTPS-only, never log token/secret values): see the
SKILL.md secret-hygiene callout.

```typescript
if (payload.event === "app.store.authorize") {
  const data = payload.data;
  // Validate before persisting — never write a partial/garbage record
  if (
    !data ||
    typeof data.access_token !== "string" ||
    typeof data.refresh_token !== "string" ||
    !Number.isFinite(data.expires) ||
    data.token_type !== "bearer"
  ) {
    // Log the shape, NOT the token values
    throw new Error("app.store.authorize: malformed payload.data");
  }
  const { access_token, refresh_token, expires, scope } = data;

  await db.merchants.upsert({
    where: { id: payload.merchant },
    create: {
      id: payload.merchant,
      accessToken: access_token,
      refreshToken: refresh_token,
      tokenExpiresAt: new Date(expires * 1000),
      scope,
    },
    update: {
      accessToken: access_token,
      refreshToken: refresh_token,
      tokenExpiresAt: new Date(expires * 1000),
      scope,
    },
  });
}
```

## Related events & routing

- Signature verification, idempotency, fast-200 → **[salla-webhooks](../../salla-webhooks/SKILL.md)**.
- `app.updated` / `app.uninstalled` and the rest of the install/trial/subscription
  lifecycle → **[salla-app-lifecycle](../../salla-app-lifecycle/SKILL.md)**
  (on uninstall, revoke and delete the stored tokens).
