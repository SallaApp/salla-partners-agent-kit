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

> Easy Mode is the **recommended default** for published App Store apps.
> Custom Mode is for local dev / Postman during development — shipping it in a published app
> **without a real use case can get the app rejected at review**. Docs:
> https://docs.salla.dev/421118m0.md · App Events:
> https://docs.salla.dev/421413m0.md · API header: `Authorization: Bearer <access_token>`.

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
technical reason it cannot work. Custom Mode is for
**local dev / Postman during development**. **A published app that ships Custom Mode without a
real, justified use case can be rejected at review** — don't pick Custom Mode out of habit or
because it's the familiar OAuth2 callback pattern. If you genuinely need Custom Mode in
production, be ready to justify the use case.

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

**You do NOT build an `/oauth/callback` endpoint in Easy Mode.**

Handler shape: verify the signature first ([salla-webhooks](../salla-webhooks/SKILL.md)),
then on `app.store.authorize` **upsert** `access_token` / `refresh_token` /
`expires * 1000` keyed by `merchant`, and return 200 immediately. Full handler code:
[references/app-events.md](references/app-events.md).

> **Secret hygiene (applies to both modes):** access/refresh tokens and the client
> secret are secrets — store them encrypted at rest and **never log them** or echo them in
> errors/diagnostics. Redirect and webhook URLs must be **HTTPS-only**. Authorization
> `code`s are single-use (Custom Mode). Restrict your app to known server IPs (IP
> whitelisting, below).

Easy Mode checklist: webhook URL set (Step 2) · `offline_access` enabled for the app so
refresh tokens are issued (in Easy Mode you build no authorize URL — confirm the granted
`data.scope` in the `app.store.authorize` payload contains `offline_access`) ·
`app.store.authorize` subscribed · DB stores `access_token` / `refresh_token` /
`token_expires_at` per merchant · handler upserts (not inserts).

### Custom Mode (testing / local dev)

The authorization-code flow — authorize request (`offline_access` required, `redirect_uri`
must match the Portal exactly) → callback (`code` + `state`) → `POST /oauth2/token` exchange
→ persist both tokens. It carries several Salla-specific callback traps (Salla-initiated
installs send their own `state`, hyphens stripped from `state`, single-use `code`s, the
Next.js cookie-in-redirect trap).

**Full flow with the authorize URL, token exchange, callback rules, and PHP/Laravel code:
load [references/custom-mode.md](references/custom-mode.md).**

**Gate:** "Tokens are persisted per merchant with `tokenExpiresAt` derived from `expires`?"

---

## Step 4 — Understand the Token Lifecycle

| Token         | Lifetime                                      | Notes                                                                                                                   |
| ------------- | --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Access token  | **Per the `expires` field** (no fixed number) | `expires` in the `app.store.authorize` payload is the source of truth — a Unix timestamp. Don't assume a fixed duration |
| Refresh token | **Always valid (no expiry)**                  | Single-use _per refresh_ — each refresh returns a new refresh token; save it. The token chain itself does not expire    |

The access token's lifetime is whatever the `expires` field says — drive expiry off that
value, never a hard-coded number. Source: https://docs.salla.dev/421413m0.md

`expires` is a **Unix timestamp** (seconds), not a duration — convert before storing:

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

This is where most production bugs happen.

A refresh token does **not** expire on its own — in normal single-threaded use you can keep
refreshing indefinitely. The danger is **reusing an already-spent refresh token**: each
refresh is single-use and returns a fresh refresh token, so the previous one is dead.

**The fatal mistake: parallel refresh.** When the _same_ refresh token is used more than
once (a double-use race), Salla's OAuth server (per RFC 6819 §5.2.2.3) treats it as a
compromise: it invalidates the token chain, revokes the access tokens obtained with it, and
the merchant must reinstall. That specific failure is unrecoverable — so never call refresh
from multiple processes simultaneously. Avoid it entirely with the per-merchant mutex below;
do not let a refresh token leave its lock without persisting the new one it returned.

**Required: distributed mutex per merchant.**

Acquire a per-merchant lock before calling the token endpoint. If another process already
holds it, wait briefly then re-read the now-refreshed token from the DB rather than
retrying the refresh. Use a proven distributed-lock library (e.g. `redlock` for Redis,
or a DB advisory lock) so owner-token and atomic release are handled for you — don't
hand-roll `SET NX / DEL`. Refresh **proactively** (e.g. ~1 day before `expiresAt`), not on
a 401, and **always persist BOTH** the new access and refresh tokens before releasing the
lock — the old refresh token is dead the moment the call returns.

**Full runnable code (TS `refreshTokenSafe` + `getValidToken`, and the PHP equivalent):
load [references/token-refresh.md](references/token-refresh.md).**

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

## Red Flags

Thoughts that feel reasonable in isolation but break a production Salla app. If you catch
yourself thinking one of these, stop and re-read the named step.

| Tempting thought                                        | Why it's wrong                                                                                                                                              |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "I know OAuth — I'll just build the `/callback` flow."  | That's Custom Mode. Shipping it in a published app without a justified use case can be **rejected at review**. Default to Easy Mode (Step 1).               |
| "The per-merchant refresh mutex is overkill."           | Single-use refresh tokens: a parallel double-use invalidates the whole token chain (RFC 6819) and the **merchant must reinstall**. Non-negotiable (Step 5). |
| "I'll add the distributed lock later / skip it in dev." | Dev habits ship to prod, and the race only shows up under real concurrency — i.e. in production, on a real merchant. Add it once, now (Step 5).             |
| "Refresh succeeded — I'll save the new access token."   | You must save **both** new tokens. The old refresh token is already dead; drop the new one and the next refresh fails (Step 5).                             |
| "`offline_access` is just another resource scope."      | It's an OAuth token scope and goes only in the authorize URL, never the `connect` map. Omit it and **no refresh token is issued** (Step 4).                 |
| "`expires` is how many seconds the token lasts."        | It's an absolute Unix timestamp. Treating it as a duration sets expiry decades out and the token silently dies (Step 4).                                    |
| "Tokens in logs are fine for debugging."                | Access/refresh tokens and the client secret are secrets — encrypt at rest, never log them (Step 3).                                                         |

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
