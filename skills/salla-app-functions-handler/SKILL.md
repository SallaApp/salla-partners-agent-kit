---
name: salla-app-functions-handler
description: >
  Step 3 of building a Salla App Function: write the handler from the trigger's `template`,
  using typed contexts (`context.payload` / `merchant` / `settings`), the mandatory `Resp`
  return builder, Web-Crypto-only sandbox limits (no npm / `fs` / `http`), and
  AbortController-bounded fetch for the 500 ms / 30 s timeouts. Routed from
  salla-app-functions; validate next with salla-app-functions-validate.
---

# App Functions — Write the Handler

Start from the trigger's default `template` and its `types` — fetch both with
`salla_functions action=get`, `app_id`, `trigger`. **The `template` is the source of truth:
copy it verbatim and fill in only the body.**

> **Never change the template's first line** (the wrapper signature) and put ALL code INSIDE
> the body — no `const` / `function` / `import` above or below the wrapper. `save` rejects a
> changed first line. Full rule + local type-check: **salla-app-functions-validate**.

```typescript
export default async (context: Shipments): Promise<Resp> => {
  // ↑ template's first line, unchanged    ↓ ALL your code goes inside the body
  console.log("Shipment cancelled event triggered");
  return Resp.success().setData({});
};
```

## Context object

```typescript
context.merchant; // { id: string, … }
context.payload; // { event: string, created_at: string, data: { … } }
context.settings; // Record<string, string | undefined> — per-merchant App Settings
```

Salla API calls made **inside** a function are authenticated automatically — no
`Authorization` header (see salla-api-core). Settings: `context.settings?.apiKey` (optional
chaining — undefined until configured).

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

```typescript
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 400); // 400ms for a sync action
try {
  const res = await fetch("https://api.example.com/data", {
    signal: controller.signal,
  });
  return Resp.success().setData(await res.json());
} catch (error) {
  return Resp.error().setMessage("Upstream timeout").setStatus(504);
} finally {
  clearTimeout(timeout);
}
```

**Gate:** "Returns `Resp.success().setData(...)` on every path, no npm/unsupported core,
every `fetch` bounded, no secrets logged?" → **salla-app-functions-validate**.
