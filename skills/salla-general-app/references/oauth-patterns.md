# OAuth Patterns for Salla Apps

Salla uses OAuth 2.0 with two modes. Choose one at app creation — it can be changed later in App Keys.

---

## Mode Comparison

| | Easy Mode | Custom Mode |
| --- | --- | --- |
| **Authorization URL** | Salla-hosted | Your own page |
| **Token delivery** | Via `app.store.authorize` webhook | Via your redirect URI callback |
| **Code exchange** | Handled by Salla | You do it |
| **Best for** | Most apps — simpler setup | Apps needing custom consent UI |

---

## Easy Mode Flow

```
Merchant clicks "Install" on App Store
    ↓
Salla handles OAuth consent
    ↓
Salla fires `app.store.authorize` webhook to your URL
    ↓
Payload contains access_token + refresh_token
    ↓
Store both tokens against `payload.merchant` in your database
```

> The **same `app.store.authorize` event also fires on token refresh** (and right after
> `app.updated`). Your handler must upsert the new tokens every time — see
> **salla-app-authorization** for the full lifecycle and the refresh-mutex rules.

### app.store.authorize payload

`merchant` is the merchant **id** (not an object); the tokens are under `data`. `expires`
is a **Unix timestamp** (seconds) — convert with `new Date(expires * 1000)` before storing.

```json
{
  "event": "app.store.authorize",
  "merchant": 12345,
  "data": {
    "access_token": "eyJ...",
    "refresh_token": "eyJ...",
    "token_type": "Bearer",
    "expires": 1710000000,
    "scope": "offline_access orders.read products.read"
  }
}
```

---

## Custom Mode Flow

```
Merchant clicks "Install" → redirected to your Authorization URL
    ↓
Your app redirects to Salla with client_id + redirect_uri + scope
    ↓
Merchant approves → Salla redirects back with ?code=...
    ↓
Your server exchanges code for tokens (POST to token endpoint)
    ↓
Store access_token + refresh_token against merchant_id
```

### Authorization redirect

```
GET https://accounts.salla.sa/oauth2/auth
  ?client_id=YOUR_CLIENT_ID
  &redirect_uri=https://your-app.com/oauth/callback
  &response_type=code
  &scope=offline_access orders.read
  &state=RANDOM_STATE
```

### Code exchange

```http
POST https://accounts.salla.sa/oauth2/token
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code
&code=AUTH_CODE
&client_id=YOUR_CLIENT_ID
&client_secret=YOUR_CLIENT_SECRET
&redirect_uri=https://your-app.com/oauth/callback
```

---

## Token Refresh

Tokens expire. Use `refresh_token` before expiry:

```http
POST https://accounts.salla.sa/oauth2/token
Content-Type: application/x-www-form-urlencoded

grant_type=refresh_token
&refresh_token=REFRESH_TOKEN
&client_id=YOUR_CLIENT_ID
&client_secret=YOUR_CLIENT_SECRET
```

The response returns a **new `access_token` AND a new `refresh_token`** — always store
both.

> ⚠️ **Refresh tokens are single-use.** Refreshing the **same** refresh token twice (e.g.
> two requests refreshing concurrently) makes Salla invalidate the refresh token and
> **revoke every access token issued from it** — the merchant must reinstall, with no
> recovery. Never refresh from two processes at once: guard refresh with a per-merchant
> distributed lock and always persist both new tokens. Full rules → **salla-app-authorization**.

### Refresh strategy (lock-guarded)

```ts
async function getValidToken(merchantId: number): Promise<string> {
  const stored = await db.getToken(merchantId);
  const expiresAt = new Date(stored.expires_at);

  // Not near expiry — use the stored token as-is
  if (expiresAt.getTime() - Date.now() >= 5 * 60 * 1000) return stored.access_token;

  // Acquire a per-merchant lock so only ONE process refreshes (single-use token).
  const lockKey = `token_refresh_lock:${merchantId}`;
  const acquired = await redis.set(lockKey, '1', 'NX', 'EX', 30); // 30s TTL
  if (!acquired) {
    // Another process is refreshing — wait briefly, then read the token it just saved.
    await sleep(500);
    return (await db.getToken(merchantId)).access_token;
  }

  try {
    const fresh = await refreshToken(stored.refresh_token);
    // ALWAYS save BOTH new tokens — the old refresh token is now dead.
    await db.saveToken(merchantId, fresh); // { access_token, refresh_token, expires_at }
    return fresh.access_token;
  } finally {
    await redis.del(lockKey); // always release the lock
  }
}
```

---

## Identifying the Merchant (Token Introspect)

For a token **you didn't issue** — an Embedded App's short-lived dashboard token — verify
it server-side against Salla's **exchange-authority** introspection service (not the OAuth
introspect endpoint). Send the token in the JSON body with the `S-Source` header set to
your App ID:

```http
POST https://api.salla.dev/exchange-authority/v1/introspect
S-Source: YOUR_APP_ID
Content-Type: application/json

{ "token": "EMBEDDED_TOKEN" }
```

The response identifies the merchant (e.g. `merchant_id`). If it isn't valid, reject the
request. Full implementation → **salla-embedded-app** (`references/auth-and-session.md`).

For a merchant token **you do hold** (from `app.store.authorize` / a code exchange),
resolve the merchant with `GET /oauth2/user/info` (see **salla-api-core**).

---

## Scopes Reference

| Scope | Access granted |
| --- | --- |
| `offline_access` | Refresh tokens (always include) |
| `orders.read` | Read merchant orders |
| `orders.write` | Create/update orders |
| `products.read` | Read product catalog |
| `products.write` | Create/update products |
| `customers.read` | Read customer data |
| `stores.read` | Read store configuration |

Request only the minimum scopes your app needs.

---

## Resources

| Topic | Link |
| --- | --- |
| OAuth2.0 (Easy Mode & Custom Mode) | https://docs.salla.dev/doc-421118 |
| Token Introspect endpoint | https://docs.salla.dev/6394918f0.md |
