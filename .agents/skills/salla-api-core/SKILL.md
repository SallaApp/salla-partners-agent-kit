---
name: salla-api-core
description: >
  Foundation reference for the Salla Admin (Merchant) API — base URL, Bearer-token
  auth, request headers, merchant identity, common resource endpoints, pagination,
  rate-limit tiers/headers, HTTP status codes with slugs, structured error shapes,
  and the App Settings read-modify-write pattern. Use whenever writing, reviewing,
  or debugging any Salla Admin API call — auth setup, pagination, error handling,
  app-settings read/write, or rate limits. Every other Salla skill builds on this;
  merchant token handling → salla-app-auth.
---

# Salla Admin API — Core Flow

The foundation every other Salla skill builds on: authenticate, call resources, paginate,
handle errors and rate limits, and read/write app settings safely. Work through the steps
in order; complete each gate before moving on. This is runtime code against a **merchant
`access_token`** (obtained via salla-app-auth) — not a Partners MCP action.

**Base URL:** `https://api.salla.dev/admin/v2` (all paths below are relative to it).
Docs (Get Started): https://docs.salla.dev/421117m0.md

**HTTPS only** — plain HTTP is rejected; every call carries
`Authorization: Bearer <ACCESS_TOKEN>` (OAuth 2.0). TLS protects the data in transit
(docs: https://docs.salla.dev/421121m0.md, https://docs.salla.dev/421118m0.md).

The **cross-cutting rules** (base, auth, status codes, error/pagination shapes, rate
limits, versioning, multi-language) are pinned from the official docs and authoritative.
**Per-resource** paths, fields, scopes, and envelopes are **illustrative** — confirm them
against the current resource doc (see `references/api-resources.md`) or the Partners MCP
(`salla_apps` / `salla_reference`) before relying on them. Token mechanics — storage,
refresh, the single-use refresh-token rule, and the refresh mutex — live in salla-app-auth.

## The closed loop — schema-driven calls (verify, don't guess)

Build every per-resource call against the endpoint's **own documented OpenAPI schema**, not
from memory. Each endpoint's `docs.salla.dev/<id>.md` page embeds a full OpenAPI 3.x spec in
a ` ```yaml ` block (request/response schemas, field types, enums, required fields) — that
block is the source of truth. Run this loop:

1. **Find** the endpoint's doc page via [salla-docs](../salla-docs/SKILL.md) (or
   `references/api-resources.md`) and read its embedded `openapi:` YAML block.
2. **Build** the request to match the schema — required fields, types, enums.
3. **Call & validate** the response against the schema; on mismatch, fix the request and
   retry (search → build → validate → fix).

Prefer the doc's OpenAPI block over assumptions; the Partners MCP (`salla_reference`) is the
alternative source when the doc is unclear.

## Step 0 — Discover

1. **Which resource/endpoint** are you calling? (orders, products, customers, settings…)
2. **Do you have a valid merchant `access_token`?** (if not → salla-app-auth)
3. **One record or a collection?** (collection → you'll paginate, Step 3)

---

## Step 1 — Authenticate & Identify the Merchant

Every request authenticates with an access token in the `Authorization` header:

```http
Authorization: Bearer <access_token>
Accept: application/json
Content-Type: application/json   # for POST/PUT/PATCH
```

Resolve the stable merchant key once and cache it:

```http
GET https://accounts.salla.sa/oauth2/user/info
Authorization: Bearer <access_token>
```

`merchant.id` (top level — user/info has **no `data` envelope**) is the stable internal key;
cache it once and reuse it across requests.

### The five official 401 cases

Token / authorization failures return **401** with an `error` object carrying `code` and
`message`. The Responses doc (https://docs.salla.dev/421123m0.md) pins exactly five cases:

| #   | Case                  | `error.message` (representative)                                                  | Action                                                                 |
| --- | --------------------- | --------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| 1   | Deleted user          | `The User is not exists.`                                                         | Merchant gone — stop calling; await re-install.                        |
| 2   | Inactive user         | `حسابك غير مفعل` (account not active)                                             | Stop calling; await re-activation/re-install.                          |
| 3   | Refresh token reused  | `error: "invalid_grant"` — **revokes both access + refresh tokens**               | Merchant must reinstall the app — handle via salla-app-auth.           |
| 4   | Scope not allowed     | `The access token should have access to one of those scopes: products.read_write` | Add the scope to the app; token can't reach this endpoint.             |
| 5   | Invalid/expired token | `The access token is invalid` (expired, app uninstalled, or bad value)            | Refresh the token (salla-app-auth); if it can't refresh, re-authorize. |

Case 3 returns the bare OAuth shape `{ "error": "invalid_grant", ... }` (not the
`{ status, success, error }` envelope) and **invalidates the access token too** — reusing a
single-use refresh token in parallel forces a full reinstall. The refresh mutex that
prevents it lives in salla-app-auth.

Read `error.message` for logging, but **drive behavior off the case**: for 1–3 stop and
wait for re-install/re-activate; for 4 fix scopes; for 5 refresh then retry.

**Gate:** "`GET /oauth2/user/info` returns 200 and you've cached `merchant.id` (top level, not `data.merchant.id`)?"

---

## Step 2 — Make Requests

**API is URI-versioned** — the `/admin/v2` in the base URL _is_ the version. Salla bumps it
only on a **breaking change** (response-format change, type change, or removing part of the
API); non-breaking additions ship in place (docs: https://docs.salla.dev/421126m0.md).

Common resource endpoints:

| Resource  | Method | Endpoint     | Docs                                |
| --------- | ------ | ------------ | ----------------------------------- |
| Orders    | GET    | `/orders`    | https://docs.salla.dev/5394146e0.md |
| Products  | GET    | `/products`  | https://docs.salla.dev/5394168e0.md |
| Customers | GET    | `/customers` | https://docs.salla.dev/841780f0.md  |

For **every** resource group → its landing doc, see **`references/api-resources.md`** (the
"find the right doc" map). Per-resource paths/fields/scopes live in those docs, not here.

**Multi-language (optional):** some endpoints localize their response. Send
`Accept-Language: <iso_code>` to express a preference (and `Content-Language` to declare the
body's language). The `iso_code` values come from the **Languages** endpoint; the default is
`ar` (docs: https://docs.salla.dev/421122m0.md).

A 2xx response with a body wraps `data` (a 204 carries no body — see below):

```json
{ "status": 200, "success": true, "data": {} }
```

| Code | Meaning                             |
| ---- | ----------------------------------- |
| 200  | OK — request succeeded              |
| 201  | Created — resource inserted/updated |
| 202  | Accepted — resource deleted         |
| 204  | No Content — success, no body       |

Minimal request helper (TypeScript):

```typescript
const BASE = "https://api.salla.dev/admin/v2";

async function sallaRequest<T>(
  path: string,
  accessToken: string,
  options: RequestInit = {},
): Promise<T> {
  const method = (options.method ?? "GET").toUpperCase();
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
      // Content-Type only when sending a body
      ...(method === "GET" || method === "DELETE"
        ? {}
        : { "Content-Type": "application/json" }),
      ...options.headers,
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw Object.assign(new Error(err?.error?.message ?? res.statusText), {
      status: res.status,
      body: err,
    });
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}
```

**Gate:** "A simple GET (e.g. `/orders`) returns the `{ status, success, data }` envelope?"

---

## Step 3 — Paginate Collections

Collection endpoints accept (docs: https://docs.salla.dev/421124m0.md):

| Parameter  | Default | Max | Notes         |
| ---------- | ------- | --- | ------------- |
| `page`     | 1       | —   | 1-indexed     |
| `per_page` | 15      | 60  | **max is 60** |

```http
GET /orders?page=2&per_page=40
```

Response shape:

```json
{
  "status": 200,
  "success": true,
  "data": [
    /* records */
  ],
  "pagination": {
    "count": 40,
    "total": 120,
    "perPage": 40,
    "currentPage": 2,
    "totalPages": 3,
    "links": {}
  }
}
```

To iterate all pages: loop while `currentPage < totalPages`, incrementing `page`.

**Gate:** "You can walk every page of a collection using `currentPage`/`totalPages`?"

---

## Step 4 — Handle Errors & Rate Limits

Error envelope (single + multi-field share the same shape — `fields` is field → messages;
docs: https://docs.salla.dev/421123m0.md):

```json
{
  "status": 422,
  "success": false,
  "error": {
    "code": "error",
    "message": "alert.invalid_fields",
    "fields": { "first_name": ["الاسم الاول للعميل مطلوب"] }
  }
}
```

In any **4xx** validation error, each entry under `fields` is `field → [messages…]`; a
multi-field failure just lists more keys. Read `error.fields` to surface per-field messages.

| Status | Slug                  | Meaning                                  |
| ------ | --------------------- | ---------------------------------------- |
| 400    | `bad_request`         | Invalid parameters, fields, or filters   |
| 401    | `unauthorized`        | Invalid or expired token, missing scopes |
| 403    | `forbidden`           | Access refused or temporarily blocked    |
| 404    | `not_found`           | Resource or path not found               |
| 405    | `method_not_allowed`  | HTTP method not supported                |
| 406    | `not_acceptable`      | Format not acceptable                    |
| 410    | `gone`                | Resource no longer available             |
| 422    | `validation_failed`   | Mandatory fields missing or invalid      |
| 429    | `too_many_requests`   | Rate limit exceeded                      |
| 500    | `server_error`        | Internal server error — retry later      |
| 503    | `service_unavailable` | Temporary overload or maintenance        |

### Rate limits (official — docs: https://docs.salla.dev/421125m0.md)

Limits are **per store, by the store's plan**, enforced with a **leaky-bucket** algorithm:

| Plan        | Max requests | Window   | Overflow leak rate |
| ----------- | ------------ | -------- | ------------------ |
| **Plus**    | 120          | 1 minute | 1 request / second |
| **Pro**     | 360          | 1 minute | 1 request / second |
| **Special** | 720          | 1 minute | 1 request / second |

Once the per-minute budget is spent you may still send **1 request/second** (the leak)
until the window resets. **The Customers endpoint has its own tighter cap: 500 requests per
10 minutes** — pace customer-heavy jobs accordingly.

Exceeding limits returns **429 `too_many_requests`**; sustained abuse or unusual patterns
may trigger temporary access restrictions (a **403**).

Headers on every response:

| Header                  | Meaning                                          |
| ----------------------- | ------------------------------------------------ |
| `X-RateLimit-Limit`     | Calls allowed per minute for this plan           |
| `X-RateLimit-Remaining` | Calls left in the current window                 |
| `Retry-After`           | Seconds to wait before retrying (present on 429) |
| `X-RateLimit-Reset`     | UTC epoch seconds when the window resets         |

Read the live headers to drive backoff; the tier numbers above are the documented maximums
to plan against.

```typescript
if (response.status === 429) {
  // Fetch Headers: use .get(), not bracket access
  const retryAfter = parseInt(response.headers.get("retry-after") ?? "60", 10);
  await sleep(retryAfter * 1000);
  // retry the request
}
```

**Gate:** "Your client reads `error.message`/`error.fields` and backs off on 429 via
`Retry-After`?"

---

## Step 5 — Read & Write App Settings (read-modify-write)

```http
GET  /apps/{appId}/settings   # fetch current settings
POST /apps/{appId}/settings   # replace the ENTIRE settings object
```

**POST is a full replace, not a merge.** Any key omitted from the body is set to `null`.
Always read first, merge, then write the full object:

```typescript
// 1. Fetch current settings
const { data: current } = await api.get(`/apps/${appId}/settings`);
// 2. Merge your change
const updated = { ...current, new_key: "value" };
// 3. POST the full merged object
await api.post(`/apps/${appId}/settings`, updated);
```

Settings entered in the Partners Portal (or defined via the Partners MCP `salla_settings`
tool — see salla-app-settings) are available as `context.settings` inside App Functions —
no API call needed there.

**Gate:** "Your settings update reads → merges → POSTs the full object (no key dropped)?"

---

## Quick-Reference Docs Links

| Topic                                   | URL                                                     |
| --------------------------------------- | ------------------------------------------------------- |
| Get Started                             | https://docs.salla.dev/421117m0.md                      |
| Authorization (OAuth 2.0)               | https://docs.salla.dev/421118m0.md                      |
| Security                                | https://docs.salla.dev/421121m0.md                      |
| Responses & Errors                      | https://docs.salla.dev/421123m0.md                      |
| Pagination                              | https://docs.salla.dev/421124m0.md                      |
| Rate Limiting                           | https://docs.salla.dev/421125m0.md                      |
| Versioning                              | https://docs.salla.dev/421126m0.md                      |
| Multi-language                          | https://docs.salla.dev/421122m0.md                      |
| **Resource index** (find the right doc) | `references/api-resources.md`                           |
| App Settings guide                      | `salla-app-settings` skill (references/form-builder.md) |
