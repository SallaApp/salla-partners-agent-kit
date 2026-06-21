---
name: salla-app-auth
description: >
  Salla OAuth 2.0 and merchant token management — the Salla delta on standard OAuth:
  Easy Mode (tokens via the app.store.authorize webhook, no callback — published apps)
  vs Custom Mode (authorization-code, dev/testing only), the offline_access scope,
  single-use refresh tokens needing a per-merchant refresh lock, and the User Info
  endpoint. Use before writing any Salla token-handling code. Lifecycle events →
  salla-app-lifecycle; webhook verification → salla-webhooks; API usage → salla-api-core.
---

# Salla App Auth Flow

Get and keep valid merchant tokens for your app — choose the OAuth mode, configure the
app, receive/exchange tokens, and refresh them safely. Work through the steps in order;
complete each gate before moving on. Step 2 **performs actions** with the Salla Partners
MCP; the token handling is runtime code.

> **Publishing the app? → default to Easy Mode.** Tokens arrive in the `app.store.authorize`
> webhook, so you don't need an OAuth `/callback` or `state` handling. Custom Mode (a
> `/callback` code exchange) is mainly for local dev / Postman; shipping it in a published app
> without a real, justifiable use case can be rejected at Salla's admin review — so reach for
> Easy Mode rather than a familiar OAuth2 callback out of habit.

## Tools & MCPs

| Tool           | Action               | What it does                                                            |
| -------------- | -------------------- | ----------------------------------------------------------------------- |
| `salla_scopes` | `get` / `set`        | Read or update the app's OAuth scopes (slugs, disabled flags, selected) |
| `salla_apps`   | `connect`            | Set scopes, redirect URLs, and the webhook receiver in one call         |
| `salla_events` | `list` / `subscribe` | Subscribe to `app.store.authorize` (+ lifecycle events)                 |

> Docs: https://docs.salla.dev/421118m0.md · App Events: https://docs.salla.dev/421413m0.md
> · API header: `Authorization: Bearer <access_token>`.

---

## Step 0 — Discover

1. **Is this app going on the App Store** (→ Easy Mode) or are you testing locally/Postman
   (→ Custom Mode)?
2. **Where will tokens be stored?** (DB keyed by `merchant` id, with expiry)
3. **Do you have a token-refresh concurrency story?** (you will need one — Step 5)

---

## Step 1 — Choose Your OAuth Mode

|                      | Easy Mode ✅                              | Custom Mode                                                   |
| -------------------- | ----------------------------------------- | ------------------------------------------------------------- |
| How tokens arrive    | Via `app.store.authorize` webhook payload | Via `/oauth/callback` code exchange                           |
| Callback URL needed? | No                                        | Yes                                                           |
| Published apps?      | Recommended (default)                     | Allowed with a justified use case — may be rejected at review |
| Allowed for testing? | Yes                                       | Yes (Postman, local dev)                                      |
| Recommendation       | **Default — recommended for every app**   | Dev only; needs a real use case                               |
| Token handling       | Salla handles everything; you just save   | You implement the full exchange                               |

**Decision rule — default to Easy Mode.** Easy Mode is the **recommended default for every
app** — it's the more reliable and straightforward path and the easiest to implement for most
use cases: Salla delivers the tokens via the `app.store.authorize` webhook, so there's no
callback or `state` flow to build, secure, and maintain. Use it unless you have a concrete
technical reason it cannot work. Custom Mode is for **local dev / Postman during development**;
if you genuinely need it in production, be ready to justify the use case — a published app that
ships Custom Mode without a real one can be rejected at review.

**Gate:** "Defaulted to Easy Mode (or have a real, reviewable reason for Custom Mode)?"

---

## Step 2 — Configure the App (Partners MCP)

Set up the OAuth + webhook config that makes tokens flow. Do this with the Partners MCP:

1. **Scopes** — read the slugs (+ per-app disabled flags) with `salla_scopes action=get`,
   `app_id`; update them with `salla_scopes action=set` (a flat
   `slug → "read" | "read_write" | ""` map) or as part of Connect below.
   **Request least privilege:** grant only the resource slugs the app actually uses, and
   prefer `"read"` over `"read_write"` unless the app writes that resource — don't apply a
   broad `read_write` default across slugs.
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

Handler shape: verify the signature first ([salla-webhooks](../salla-webhooks/SKILL.md)),
then on `app.store.authorize` **upsert** `access_token` / `refresh_token` /
`expires * 1000` keyed by `merchant`, and return 200 immediately. Full handler code:
[references/app-events.md](references/app-events.md).

> **Secret hygiene (both modes):** access/refresh tokens and the client secret are
> secrets — store them encrypted at rest and never write them to logs, errors, or
> diagnostics. Redirect and webhook URLs are HTTPS-only. Restrict your app to known server
> IPs (IP whitelisting, below).

Easy Mode checklist: webhook URL set (Step 2) · `app.store.authorize` subscribed · the
granted `data.scope` in the payload contains `offline_access` (so refresh tokens are
issued) · DB stores `access_token` / `refresh_token` / `token_expires_at` per merchant ·
handler upserts (not inserts).

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

> **Custom Mode callback rules:**
>
> - **Deploy the callback route before registering `redirect_url`.** Implement and serve the
>   callback, hit the exact URL you will register, and confirm it responds (not 404); register
>   it only after that. A 404 (route not deployed, wrong path, typo) breaks the merchant's
>   install — blank page, lost install, no tokens.
> - **Accept Salla-initiated installs.** When the merchant installs from the App Store, Salla
>   redirects straight to your callback with **its own `state`** — your app never ran the
>   authorize step and set no `state` cookie. Treat a request with no matching cookie as a
>   valid Salla-initiated install and proceed with the code exchange. (Easy Mode skips this —
>   no callback.)
> - **Compare `state` hyphen-insensitively.** Salla strips hyphens from `state` when echoing
>   it back, so a UUID `state` must be matched with hyphens removed (or omit hyphens entirely).
> - **Next.js — set cookies on the returned response.** `redirect()` from `next/navigation`
>   drops cookies set via `cookies().set()` in a GET handler; instead use
>   `const res = NextResponse.redirect(url); res.cookies.set(...); return res;`.
> - **Exchange each `code` once.** Authorization `code`s are single-use; a refresh or back
>   button re-hits a spent code and returns `invalid_grant` — start a fresh install rather than
>   replaying the same code.

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

| Token         | Lifetime                                      | Notes                                                                                                                   |
| ------------- | --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Access token  | **Per the `expires` field** (no fixed number) | `expires` in the `app.store.authorize` payload is the source of truth — a Unix timestamp. Don't assume a fixed duration |
| Refresh token | **Always valid (no expiry)**                  | Single-use _per refresh_ — each refresh returns a new refresh token; save it. The token chain itself does not expire    |

`expires` is an absolute **Unix timestamp** (seconds), not a duration — drive expiry off it,
never a hard-coded number. Convert before storing (Source: https://docs.salla.dev/421413m0.md):

```typescript
// ✅ expires is an absolute Unix timestamp (seconds)
const expiresAt = new Date(payload.data.expires * 1000); // ms
// ❌ it is NOT a duration — never do: new Date(Date.now() + expires * 1000)
```

Refresh tokens are only issued when `offline_access` is in scope. **Always include
`offline_access`** — without it, no refresh token is issued, so the access token cannot be
renewed once `expires` passes and the merchant must reinstall.

**Gate:** "Both tokens + a converted `expiresAt` are stored, and scope includes
`offline_access`?"

---

## Step 5 — Refresh Tokens Safely (the danger zone)

Each refresh is single-use: it returns a fresh refresh token and kills the previous one.
Using the **same** refresh token twice (a parallel-refresh race) makes Salla's OAuth server
treat the chain as compromised — it revokes the chain and the merchant must reinstall, which
is unrecoverable. Serialize refreshes with a per-merchant lock so a refresh token never leaves
its lock without the new one being persisted.

**Required: distributed mutex per merchant.** Acquire a per-merchant lock before calling the
token endpoint. If another process already holds it, wait briefly then re-read the now-refreshed
token from the DB rather than retrying the refresh. Use a proven distributed-lock library
(e.g. `redlock` for Redis, or a DB advisory lock) so owner-token and atomic release are handled
for you.

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

**The store id is `merchant.id` — top level of the response, NOT under `data`.** user/info
has no `data` envelope (unlike webhooks/API responses). Extract defensively:

```typescript
// ✅ user/info shape: { id, name, email, merchant: { id, ... } }
const merchantId = info?.merchant?.id; // number, top level — NOT info.data.merchant.id
if (!merchantId) throw new Error("user/info: missing merchant.id"); // guard BEFORE stringify
const storeId = String(merchantId);
// ❌ String(info?.merchant?.id ?? "") — turns a missing id into "" / a 0 id into "0", both
//    truthy after String(), so the guard silently passes and a bad value reaches the DB
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

Confirm the app's valid resource slugs (and per-app disabled flags) via
`salla_scopes action=get`:

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
