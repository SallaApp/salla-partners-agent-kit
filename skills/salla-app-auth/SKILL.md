---
name: salla-app-auth
description: >
  Salla OAuth 2.0 and merchant token management — the Salla delta on standard OAuth:
  Easy Mode (tokens arrive via the app.store.authorize webhook, no callback URL; how
  published apps work) vs Custom Mode (standard authorization-code, dev/testing only),
  the offline_access scope, single-use refresh tokens that need a per-merchant refresh
  lock, and the User Info endpoint. Use before writing any Salla token-handling code.
  Lifecycle event handling → salla-app-lifecycle; webhook verification → salla-webhooks;
  API usage → salla-api-core.
---

# Salla App Authorization Flow

Get and keep valid merchant tokens for your app — choose the OAuth mode, configure the
app, receive/exchange tokens, and refresh them safely. Work through the steps in order;
complete each gate before moving on. Step 2 **performs actions** with the Salla Partners
MCP; the token handling is runtime code.

## Tools & MCPs

| Tool           | Action               | What it does                                                            |
| -------------- | -------------------- | ----------------------------------------------------------------------- |
| `salla_scopes` | `get` / `set`        | Read or update the app's OAuth scopes (slugs, disabled flags, selected) |
| `salla_apps`   | `connect`            | Set scopes, redirect URLs, and the webhook receiver in one call         |
| `salla_events` | `list` / `subscribe` | Subscribe to `app.store.authorize` (+ lifecycle events)                 |

> Easy Mode is required for all published App Store apps. Custom Mode is for local dev and
> Postman testing only. Docs: https://docs.salla.dev/421118m0.md · App Events:
> https://docs.salla.dev/421413m0.md · API header: `Authorization: Bearer <access_token>`.

---

## Step 0 — Discover

1. **Is this app going on the App Store** (→ Easy Mode) or are you testing locally/Postman
   (→ Custom Mode)?
2. **Where will tokens be stored?** (DB keyed by `merchant` id, with expiry)
3. **Do you have a token-refresh concurrency story?** (you will need one — Step 5)

---

## Step 1 — Choose Your OAuth Mode

|                             | Easy Mode ✅                              | Custom Mode                         |
| --------------------------- | ----------------------------------------- | ----------------------------------- |
| How tokens arrive           | Via `app.store.authorize` webhook payload | Via `/oauth/callback` code exchange |
| Callback URL needed?        | No                                        | Yes                                 |
| Allowed for published apps? | Yes — required                            | No                                  |
| Allowed for testing?        | Yes                                       | Yes (Postman, local dev)            |
| Token handling              | Salla handles everything; you just save   | You implement the full exchange     |

**Decision rule:** App Store app → Easy Mode. Postman/local server → Custom Mode.

**Gate:** "Mode chosen, and it matches whether the app is published?"

---

## Step 2 — Configure the App (Partners MCP)

Set up the OAuth + webhook config that makes tokens flow. Do this with the Partners MCP:

1. **Scopes** — read the slugs (+ per-app disabled flags) with `salla_scopes action=get`,
   `app_id`; update them with `salla_scopes action=set` (a flat
   `slug → "read" | "read_write" | ""` map) or as part of Connect below.
2. **Connect** — `salla_apps action=connect`, `app_id`, with `scopes`
   (`{ "<slug>": "read" | "read_write" }` — slug and access level are separate keys,
   e.g. `{"orders": "read_write"}`). For Easy Mode also pass `webhook_url` +
   `webhook_security_strategy: "signature"` + `generate_secret: true`; for Custom Mode
   pass `redirect_urls`. (Set trusted IPs here too — Part: IP whitelisting below.)

   > **`offline_access` does NOT go in the `connect` scopes map.** It is an OAuth2
   > token scope that enables refresh tokens and belongs only in the authorize URL
   > (space-delimited, e.g. `scope=offline_access orders.read_write`). The `connect`
   > map takes resource slugs only (e.g. `{"orders": "read_write"}`).

3. **Subscribe** — `salla_events action=subscribe`, `app_id`,
   `events: ["app.store.authorize"]` (plus other lifecycle events you need).

**Manual fallback:** Partners Portal → App Keys / Webhooks / App Scope.

**Gate:** "Webhook (or redirect) set, resource scopes applied, and `app.store.authorize`
subscribed?"

---

## Step 3 — Receive or Exchange Tokens

### Easy Mode (production)

1. Merchant installs the app → Salla fires `app.store.authorize` to your webhook.
2. Your handler reads `access_token` + `refresh_token` from `payload.data` and saves both,
   keyed by `merchant`.
3. When the merchant updates the app, Salla fires `app.updated` then `app.store.authorize`
   again — the **same handler** receives fresh tokens.

**You do NOT build an `/oauth/callback` endpoint in Easy Mode.**

Handler shape: verify the signature first ([salla-webhooks](../salla-webhooks/SKILL.md)),
then on `app.store.authorize` **upsert** `access_token` / `refresh_token` /
`expires * 1000` keyed by `merchant`, and return 200 immediately. Full handler code:
[references/app-events.md](references/app-events.md).

Easy Mode checklist: webhook URL set (Step 2) · OAuth authorize URL `scope` includes `offline_access` (authorize URL only — not in the `connect` scopes map) ·
`app.store.authorize` subscribed · DB stores `access_token` / `refresh_token` /
`token_expires_at` per merchant · handler upserts (not inserts).

### Custom Mode (testing / local dev)

**Step 3a — Authorization request:**

```http
GET https://accounts.salla.sa/oauth2/auth
  ?client_id=YOUR_CLIENT_ID
  &response_type=code
  &redirect_uri=https://your-app.com/callback
  &scope=offline_access orders.read_write products.read_write
  &state=RANDOM_CSRF_STRING
```

Standard OAuth2 parameters — the Salla deltas: `redirect_uri` must exactly match the
Portal registration, and `scope` must always include `offline_access`.

**Step 3b — Handle the callback** (`GET /callback?code=…&state=…`): verify `state`, extract `code`.

**Step 3c — Exchange code for tokens:**

```bash
POST https://accounts.salla.sa/oauth2/token
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code
&code=AUTHORIZATION_CODE
&client_id=YOUR_CLIENT_ID
&client_secret=YOUR_CLIENT_SECRET
&redirect_uri=https://your-app.com/callback
```

```json
{
  "token_type": "bearer",
  "access_token": "KGsnBcNN...",
  "expires": 1634819484,
  "refresh_token": "fWcceFWF...",
  "scope": "offline_access orders.read_write"
}
```

PHP — `oauth2-merchant`:

```php
use Salla\OAuth2\Client\Provider\Salla;

$provider = new Salla([
    'clientId'     => env('SALLA_OAUTH_CLIENT_ID'),
    'clientSecret' => env('SALLA_OAUTH_CLIENT_SECRET'),
    'redirectUrl'  => 'https://your-app.com/callback',
]);

if (empty($_GET['code'])) {
    $authUrl = $provider->getAuthorizationUrl(['scope' => 'offline_access']);
    header('Location: ' . $authUrl);
    exit;
}

$token = $provider->getAccessToken('authorization_code', ['code' => $_GET['code']]);
$accessToken  = $token->getToken();
$refreshToken = $token->getRefreshToken();
$expires      = $token->getExpires(); // Unix timestamp
$user = $provider->getResourceOwner($token); // ->getId(), ->getStoreID(), …
```

Laravel facade + full controller:
https://github.com/SallaApp/laravel-starter-kit/blob/master/app/Http/Controllers/OAuthController.php

**Gate:** "Tokens are persisted per merchant with `tokenExpiresAt` derived from `expires`?"

---

## Step 4 — Understand the Token Lifecycle

| Token         | Lifetime    | Notes                                         |
| ------------- | ----------- | --------------------------------------------- |
| Access token  | **14 days** | `expires` in the response is a Unix timestamp |
| Refresh token | **1 month** | Single-use — invalidated after first use      |

`expires` is a **Unix timestamp** (seconds), not a duration — convert before storing:

```typescript
const expiresAt = new Date(payload.data.expires * 1000); // ms
```

Refresh tokens are only issued when `offline_access` is in scope. **Always include
`offline_access`** — without it, tokens expire after 14 days and the merchant must reinstall.

**Gate:** "Both tokens + a converted `expiresAt` are stored, and scope includes
`offline_access`?"

---

## Step 5 — Refresh Tokens Safely (the danger zone)

This is where most production bugs happen.

**The fatal mistake: parallel refresh.** When a refresh token is used more than once,
Salla's OAuth server (per RFC 6819 §5.2.2.3) invalidates the refresh token, revokes all
access tokens obtained with it, and forces the merchant to reinstall. **There is no
recovery.** Never call refresh from multiple processes simultaneously.

**Required: distributed mutex per merchant.**

Acquire a per-merchant lock before calling the token endpoint. If another process already
holds it, wait briefly then re-read the now-refreshed token from the DB rather than
retrying the refresh. Use a proven distributed-lock library (e.g. `redlock` for Redis,
or a DB advisory lock) so owner-token and atomic release are handled for you — don't
hand-roll `SET NX / DEL`.

```typescript
async function refreshTokenSafe(merchantId: string): Promise<string> {
  return await withDistributedLock(`token_refresh:${merchantId}`, async () => {
    // Re-read inside the lock — another holder may have already refreshed
    const merchant = await db.merchants.findById(merchantId);
    if (merchant.tokenExpiresAt.getTime() - Date.now() > 60_000) {
      return merchant.accessToken; // already fresh
    }

    const res = await fetch("https://accounts.salla.sa/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: merchant.refreshToken,
        client_id: process.env.SALLA_CLIENT_ID!,
        client_secret: process.env.SALLA_CLIENT_SECRET!,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw Object.assign(
        new Error(err?.error_description ?? err?.error ?? res.statusText),
        { status: res.status, body: err },
      );
    }
    const data = await res.json();

    // ALWAYS save BOTH new tokens — the old refresh token is now dead
    await db.merchants.update(merchantId, {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      tokenExpiresAt: new Date(data.expires * 1000),
    });
    return data.access_token;
  });
}
```

**Proactive refresh** — don't wait for a 401:

```typescript
async function getValidToken(merchantId: string): Promise<string> {
  const merchant = await db.merchants.findById(merchantId);
  const bufferMs = 24 * 60 * 60 * 1000; // refresh 1 day before expiry
  if (merchant.tokenExpiresAt.getTime() - Date.now() < bufferMs) {
    return await refreshTokenSafe(merchantId);
  }
  return merchant.accessToken;
}
```

PHP refresh: `$provider->getAccessToken('refresh_token', ['refresh_token' => $stored]);`
— then save both `->getToken()` and `->getRefreshToken()`.

**Gate:** "Refresh is guarded by a distributed lock, saves BOTH new tokens, and runs
proactively before expiry?"

---

## Step 6 — Fetch & Store Merchant Info

After obtaining a token (and after every `app.store.authorize`), refresh merchant details:

```bash
GET https://accounts.salla.sa/oauth2/user/info
Authorization: Bearer <access_token>
```

```json
{
  "id": 1771165749,
  "name": "Test User",
  "email": "testuser@email.partners",
  "merchant": {
    "id": 1803665367,
    "username": "dev-store-name",
    "name": "My Store",
    "plan": "special",
    "status": "active",
    "domain": "https://salla.sa/my-store"
  }
}
```

**Gate:** "Merchant id + store details are stored alongside the tokens?"

---

## Reference

### OAuth scopes

There are two distinct scope contexts — do not mix them:

**1. `salla_apps action=connect` scopes map** — resource scopes only, slug + level as
separate fields:

```json
{ "orders": "read_write", "products": "read", "customers": "read_write" }
```

**2. OAuth authorize URL** — space-delimited dotted strings. Include `offline_access`
here (it is an OAuth token scope that enables refresh tokens, not a resource scope):

```text
scope=offline_access orders.read_write products.read customers.read_write
```

`offline_access` must NOT be put in the `connect` scopes map. Confirm the app's valid
resource slugs (and per-app disabled flags) via `salla_scopes action=get`:

```text
orders          products        customers       branches
settings        webhooks        payments        taxes
specialoffers   categories      brands          metadata
```

### App events

| Event                 | When                                                                                            | Action                                        |
| --------------------- | ----------------------------------------------------------------------------------------------- | --------------------------------------------- |
| `app.store.authorize` | App installed or updated (never on token refresh — that's your `grant_type=refresh_token` call) | Save/update both tokens + expiry              |
| `app.installed`       | First install                                                                                   | Provision resources                           |
| `app.uninstalled`     | Merchant removes app                                                                            | Clean up merchant data + revoke stored tokens |

Full payload shapes: `references/app-events.md`. Lifecycle handling →
**salla-app-lifecycle**.

### IP whitelisting

Restrict your app to known server IPs: Partners Portal → My Apps → Your App → **App
Trusted IPs** (or pass `trusted_ips` in `salla_apps action=connect`). Reduces attack
surface for production apps.

---

## Key Endpoints & Libraries

| Purpose                  | URL                                          |
| ------------------------ | -------------------------------------------- |
| Authorization            | `https://accounts.salla.sa/oauth2/auth`      |
| Token exchange + refresh | `https://accounts.salla.sa/oauth2/token`     |
| User info                | `https://accounts.salla.sa/oauth2/user/info` |
| Direct install           | `https://s.salla.sa/apps/install/{app-id}`   |
| Salla API base           | `https://api.salla.dev/admin/v2/`            |

| Library                       | Language    | Repo                                            |
| ----------------------------- | ----------- | ----------------------------------------------- |
| `salla/oauth2-merchant`       | PHP         | https://github.com/SallaApp/oauth2-merchant     |
| `@salla.sa/passport-strategy` | JavaScript  | https://github.com/SallaApp/passport-strategy   |
| Laravel starter kit           | PHP/Laravel | https://github.com/SallaApp/laravel-starter-kit |
