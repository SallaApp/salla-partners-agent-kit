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

Three rules make this safe: **only one process refreshes** (per-merchant lock),
**re-read the token *after* acquiring the lock** (never refresh with a value read before
the lock — it may already be consumed), and **release the lock owner-safely** (compare-
and-delete, so an expired holder can't delete another process's lock).

```ts
const NEAR_EXPIRY_MS = 5 * 60 * 1000;
const fresh = (t: { expires_at: string }) =>
  new Date(t.expires_at).getTime() - Date.now() >= NEAR_EXPIRY_MS;

async function getValidToken(merchantId: number): Promise<string> {
  let stored = await db.getToken(merchantId);
  if (fresh(stored)) return stored.access_token; // fast path — no refresh needed

  const lockKey = `token_refresh_lock:${merchantId}`;
  const lockId = crypto.randomUUID(); // unique owner marker for this attempt
  const acquired = await redis.set(lockKey, lockId, 'NX', 'EX', 30); // 30s TTL

  if (!acquired) {
    // Another process is refreshing — wait for IT to finish, then use its result.
    for (let i = 0; i < 20; i++) {
      await sleep(250);
      stored = await db.getToken(merchantId);
      if (fresh(stored)) return stored.access_token;
    }
    throw new Error('Timed out waiting for token refresh');
  }

  try {
    // Double-check under the lock — someone may have refreshed between our read and the lock.
    stored = await db.getToken(merchantId);
    if (fresh(stored)) return stored.access_token;

    // Refresh with the LATEST stored refresh token (single-use — never the pre-lock value).
    const next = await refreshToken(stored.refresh_token);
    await db.saveToken(merchantId, next); // ALWAYS persist BOTH new tokens + new expires_at
    return next.access_token;
  } finally {
    // Owner-safe release: delete only if we still hold the lock (atomic compare-and-delete).
    await redis.eval(
      "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end",
      1, lockKey, lockId
    );
  }
}
```

If a refresh can outlast the 30s lock TTL, also fence the DB write (e.g. only save when
the lock is still held / via a token version) so a slow holder can't overwrite a newer refresh.

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
