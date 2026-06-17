---
name: salla-app-authorization
description: >
  Use this skill for any task involving Salla OAuth 2.0 and app authorization. Trigger when
  a developer is: choosing between Easy Mode and Custom Mode OAuth, implementing the
  app.store.authorize webhook handler, storing or refreshing access tokens, implementing a
  token refresh lock or mutex, working with OAuth scopes including offline_access, using the
  salla/oauth2-merchant PHP package, using the @salla.sa/passport-strategy JS package,
  using the Laravel OAuth controller or starter kit, calling the User Info endpoint, setting
  up IP whitelisting, handling app lifecycle events (app.installed, app.updated,
  app.uninstalled, app.trial.*, app.subscription.*), building a Postman OAuth flow for
  testing, or asking why a merchant had to reinstall an app.

  Trigger also when you see: "Easy Mode", "Custom Mode", "access token", "refresh token",
  "offline_access", "app.store.authorize", "accounts.salla.sa", "token expired",
  "token refresh", "OAuth callback", "client_id", "client_secret", "authorization_code",
  "grant_type", or any question about how Salla authentication works.

  Always use this skill before writing any OAuth or token-handling code.
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
> Postman testing only. Docs: https://docs.salla.dev/421118m0 · App Events:
> https://docs.salla.dev/421413m0 · API header: `Authorization: Bearer <access_token>`.

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

1. **Scopes** — read the available slugs (and per-app disabled flags) with
   `salla_scopes action=get`, `app_id`; update them with `salla_scopes action=set` (a flat
   `slug → "read" | "read_write" | ""` map) or as part of Connect below. Always
   include `offline_access` (required for refresh tokens).
2. **Connect** — `salla_apps action=connect`, `app_id`, with `scopes`
   (`slug → "read" | "read_write"`), and for Easy Mode `webhook_url` +
   `webhook_security_strategy: "signature"` + `generate_secret: true`; for Custom Mode
   `redirect_urls`. (Set trusted IPs here too — Part: IP whitelisting below.)
3. **Subscribe** — `salla_events action=subscribe`, `app_id`,
   `events: ["app.store.authorize"]` (plus other lifecycle events you need).

**Manual fallback:** Partners Portal → App Keys / Webhooks / App Scope.

**Gate:** "`offline_access` in scope, webhook (or redirect) set, and `app.store.authorize`
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

```typescript
// POST /webhooks — receives all events including app.store.authorize
async function handleWebhook(req: Request): Promise<Response> {
  // 1. Always verify signature first (see salla-webhooks skill)
  const valid = await verifySignature(req, process.env.SALLA_WEBHOOK_SECRET!);
  if (!valid) return new Response("Unauthorized", { status: 401 });

  const payload = await req.json();

  if (payload.event === "app.store.authorize") {
    const merchantId = payload.merchant;
    const { access_token, refresh_token, expires, scope } = payload.data;

    // expires is a Unix timestamp — store it so you know when to refresh
    await db.merchants.upsert({
      where: { id: merchantId },
      data: {
        accessToken: access_token,
        refreshToken: refresh_token,
        tokenExpiresAt: new Date(expires * 1000),
        scope,
        updatedAt: new Date(),
      },
    });
  }

  return new Response("OK", { status: 200 }); // always respond 200 immediately
}
```

Easy Mode checklist: webhook URL set (Step 2) · scope includes `offline_access` ·
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

| Parameter       | Notes                                             |
| --------------- | ------------------------------------------------- |
| `client_id`     | From Partners Portal → App Keys                   |
| `response_type` | Always `code`                                     |
| `redirect_uri`  | Must match exactly what's registered              |
| `scope`         | Space-separated; always include `offline_access`  |
| `state`         | Random string; verify on callback to prevent CSRF |

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

Always include `offline_access` (space-separated in the auth URL). Confirm the app's scope
slugs (and any per-app disabled flags) via `salla_scopes action=get`:

```text
offline_access          required for refresh tokens
orders.read_write
products.read_write
customers.read_write
branches.read_write
settings.read
webhooks.read_write
payments.read
taxes.read_write
specialoffers.read_write
categories.read_write
brands.read_write
metadata.read_write
```

### App events

| Event                                                    | When                          | Action                                      |
| -------------------------------------------------------- | ----------------------------- | ------------------------------------------- |
| `app.store.authorize`                                    | Install or token refresh      | Save/update both tokens + expiry            |
| `app.installed`                                          | First install                 | Provision resources                         |
| `app.updated`                                            | App updated by developer      | Wait for `app.store.authorize` that follows |
| `app.uninstalled`                                        | Merchant removes app          | Clean up merchant data                      |
| `app.trial.started`                                      | Trial begins                  | Enable trial features                       |
| `app.trial.expired` / `app.trial.canceled`               | Trial ended                   | Restrict access                             |
| `app.subscription.started`                               | Paid plan starts              | Unlock paid features; check `item_type`     |
| `app.subscription.expired` / `app.subscription.canceled` | Plan lapsed/cancelled         | Restrict access                             |
| `app.subscription.renewed`                               | Plan renewed                  | Confirm active; check new `end_date`        |
| `app.feedback.created`                                   | Merchant leaves review        | Log rating/comment                          |
| `app.settings.updated`                                   | Merchant changes app settings | Apply new `data.settings`                   |

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
