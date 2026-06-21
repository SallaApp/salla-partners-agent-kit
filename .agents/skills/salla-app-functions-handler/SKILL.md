---
name: salla-app-functions-handler
description: >
  Step 3 of building a Salla App Function: write the handler from the trigger's `template`,
  using typed contexts (`context.payload` / `merchant` / `settings`), the mandatory `Resp`
  return builder, Web-Crypto-only sandbox limits (no npm / `fs` / `http`), and
  AbortController-bounded fetch for the 5 s (sync) / 30 s (async) timeouts. Routed from
  salla-app-functions; validate next with salla-app-functions-validate.
---

# App Functions — Write the Handler

Start from the trigger's default `template` and its `types` — fetch both with
`salla_functions action=get`, `app_id`, `trigger`. **The `template` is the source of truth:
copy it verbatim and fill in only the body.**

> Decide sync-vs-async and what `Resp.success` / `Resp.error` mean for this trigger class
> **before** writing the body — that's **salla-app-functions-design** (a sync `merchant_actions`
> trigger blocks/modifies the operation; an async event is fire-and-forget). This skill assumes
> that decision is made.

> **Never change the template wrapper** — its **first line** (signature) or its **last line**
> (the close) — and put ALL code INSIDE the body — no `const` / `function` / `import` above or
> below the wrapper. `save` validates **only** those two lines and rejects a mismatch. Full
> rule + local type-check: **salla-app-functions-validate**.

```typescript
export default async (context: Shipments): Promise<Resp> => {
  // ↑ template's first line, unchanged    ↓ ALL your code goes inside the body
  console.log("Shipment cancelled event triggered");
  return Resp.success().setData({});
};
```

## Context object

Illustrative shape — the **authoritative** types are the trigger's `types` `.d.ts` from
`salla_functions action=get`; type-check against those (the `data` shape is per-trigger).

```typescript
context.merchant; // { id: number | string, … }
context.payload; // { event, created_at, merchant, data: { … } } — data varies by trigger
context.settings; // per-merchant App Settings; optional (undefined/null until configured)
```

Salla Admin API calls made **inside** a function are **pre-authenticated**: call the Admin
API straight from the handler with **no `Authorization` header** — Salla injects the
merchant's credentials for you, so you never store, refresh, or attach a token. For the call
itself — base URL, endpoints, scopes, error shapes — see **salla-api-core**. Settings:
`context.settings?.apiKey` (optional chaining — undefined until configured).

## The `Resp` API (mandatory return)

```typescript
Resp.success().setData({ order_id: id }); // setData is MANDATORY — pass {} if empty
Resp.error().setMessage("Something went wrong").setStatus(500);
return { success: true, data: {} }; // plain-object equivalent; data mandatory, even if {}
```

## Sandbox constraints (V8, like edge functions)

- **No external npm packages** — only pre-declared globals and web-standard APIs.
- **Unsupported Node core** (throw at runtime): `child_process`, `fs`, `http`, `https`,
  `net`, `tls`, `zlib`, `worker_threads`, … Use **`fetch()`** for HTTP and **Web Crypto**
  (`globalThis.crypto`) for `crypto`.

## Bound every external `fetch` to the timeout

Budget: a **sync** action has **5 s total**; keep each internal async call **under 2 s** so
one slow upstream can't blow it. An **async** event gets **30 s**. (Budget rationale →
**salla-app-functions-design**.)

```typescript
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 2000); // < 2s per call in a sync action
try {
  const res = await fetch("https://api.example.com/data", {
    signal: controller.signal,
  });
  if (!res.ok) return Resp.error().setMessage("Upstream error").setStatus(502);
  return Resp.success().setData(await res.json());
} catch (error) {
  return Resp.error().setMessage("Upstream timeout").setStatus(504);
} finally {
  clearTimeout(timeout);
}
```

Outbound-call safety: check `res.ok` before returning upstream data (don't forward an error
body as success); call only known, hard-coded endpoints — never a merchant-supplied URL
without an allowlist; never log `context.settings` or tokens. If a call needs a merchant
access token or OAuth, that's **salla-app-auth**, not here.

**Gate:** "Returns `Resp.success().setData(...)` on every path, no npm/unsupported core,
every `fetch` bounded, `res.ok` checked, no secrets logged?" → **salla-app-functions-validate**.
