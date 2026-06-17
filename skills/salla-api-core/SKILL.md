---
name: salla-api-core
description: >
  Foundation reference for the Salla Admin (Merchant) API. Covers the base URL,
  Bearer-token auth, request headers, merchant identity lookup, common resource
  endpoints, pagination shape, rate-limit tiers and headers, all HTTP status
  codes with their slugs, structured error shapes (single and multi-field), and
  the App Settings read-modify-write pattern. Every other Salla skill builds on
  top of this one.

  Use this skill whenever you are writing, reviewing, or debugging any code or
  instructions that call the Salla Admin API — including auth setup, paginating
  through results, handling errors, reading or writing app settings, or checking
  rate limits. If the task mentions "Salla", "salla.dev", merchant tokens,
  access tokens for a store, or any Salla API endpoint, consult this skill first.
---

# Salla Admin API — Core Flow

The foundation every other Salla skill builds on: authenticate, call resources, paginate,
handle errors and rate limits, and read/write app settings safely. Work through the steps
in order; complete each gate before moving on. This is runtime code against a **merchant
`access_token`** (obtained via salla-app-authorization) — not a Partners MCP action.

**Base URL:** `https://api.salla.dev/admin/v2` (all paths below are relative to it).
Docs (Get Started): https://docs.salla.dev/421117m0.md

## Step 0 — Discover

1. **Which resource/endpoint** are you calling? (orders, products, customers, settings…)
2. **Do you have a valid merchant `access_token`?** (if not → salla-app-authorization)
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

`data.merchant.id` is the stable internal key — cache it rather than re-fetching per request.

Token error cases (all return **401**):

| Scenario                | Key signal in response                                                  |
| ----------------------- | ----------------------------------------------------------------------- |
| Deleted user            | `"The User is not exists."`                                             |
| Inactive account        | Arabic message about account being inactive                             |
| Refresh token reused    | `"error": "invalid_grant"` — both tokens revoked                        |
| Missing scope           | `"The access token should have access to one of those scopes: <scope>"` |
| Expired / invalid token | `"The access token is invalid"`                                         |

On `invalid_grant`, both access and refresh tokens are invalidated — the merchant must
re-authorize (see salla-app-authorization).

**Gate:** "`GET /oauth2/user/info` returns 200 and you've cached `data.merchant.id`?"

---

## Step 2 — Make Requests

Common resource endpoints:

| Resource  | Method | Endpoint     | Docs                               |
| --------- | ------ | ------------ | ---------------------------------- |
| Orders    | GET    | `/orders`    | https://docs.salla.dev/421124m0.md |
| Products  | GET    | `/products`  | https://docs.salla.dev/421121m0.md |
| Customers | GET    | `/customers` | https://docs.salla.dev/421126m0.md |

A 2xx response always wraps `data`:

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
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
      "Content-Type": "application/json",
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

Collection endpoints accept:

| Parameter  | Default | Max | Notes                                         |
| ---------- | ------- | --- | --------------------------------------------- |
| `page`     | 1       | —   | 1-indexed                                     |
| `per_page` | 15      | 60  | `count` alias also accepted on some endpoints |

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

Error envelope (single + multi-field share the same shape — `fields` is field → messages):

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

Rate limiting uses a **leaky bucket**, per store plan per minute:

| Plan    | Max Requests/min | Leak Rate |
| ------- | ---------------- | --------- |
| Plus    | 120              | 1 req/sec |
| Pro     | 360              | 1 req/sec |
| Special | 720              | 1 req/sec |

**Customer endpoints** have a separate cap: **500 requests per 10 minutes**, regardless of
plan. Exceeding limits or unusual patterns may cause temporary restrictions (403).

Headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`, `Retry-After`.

```typescript
if (response.status === 429) {
  const retryAfter = parseInt(response.headers["retry-after"] ?? "60", 10);
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

| Topic                     | URL                                                    |
| ------------------------- | ------------------------------------------------------ |
| Get Started               | https://docs.salla.dev/421117m0.md                     |
| Authorization (OAuth 2.0) | https://docs.salla.dev/421118m0.md                     |
| Responses & Errors        | https://docs.salla.dev/421123m0.md                     |
| Pagination                | https://docs.salla.dev/421124m0.md                     |
| Rate Limiting             | https://docs.salla.dev/421125m0.md                     |
| Versioning                | https://docs.salla.dev/421126m0.md                     |
| App Settings guide        | https://salla.dev/blog/how-to-build-app-settings-form/ |
