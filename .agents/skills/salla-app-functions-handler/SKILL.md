---
name: salla-app-functions-handler
description: >
  Step 3 of building a Salla App Function: write the handler from the trigger's `template`,
  using typed contexts (`context.payload` / `merchant` / `settings`), the mandatory response
  contract (plain object or the `Resp` / entity `Shipment` builders), V8-isolate sandbox limits
  (no npm, no `fs`/`net`/`http` servers/`child_process`, Web Crypto only, `fetch` for HTTP),
  and AbortController-bounded fetch for the 5 s (sync) / 30 s (async) timeouts. Routed from
  salla-app-functions; validate next with salla-app-functions-validate.
---

# App Functions — Write the Handler

Start from the trigger's default `template` and its `types` — fetch both with
`salla_functions action=get`, `app_id`, `trigger`. Copy the `template` verbatim and write all
your code inside the body. Keep the wrapper's first and last lines exactly as given (full rule
plus local type-check → **salla-app-functions-validate**).

This skill assumes sync-vs-async is already decided in **salla-app-functions-design** (a sync
`merchant_actions` trigger blocks/modifies the operation; an async event is fire-and-forget).

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

## The response contract (mandatory return)

Every handler returns an object conforming to the `Response` contract
([Responses](https://docs.salla.dev/1758222m0.md)):

| Field     | Type      | Required | Meaning                                                              |
| --------- | --------- | -------- | -------------------------------------------------------------------- |
| `success` | `boolean` | Yes      | Did your logic complete? (sync: drives proceed-vs-reject)            |
| `data`    | `object`  | No       | Payload to return / **apply to the entity** (sync actions)           |
| `error`   | `string`  | No       | Human-readable error; required when `success:false` on a sync action |
| `status`  | `number`  | No       | Optional HTTP status (via the builder); default `200`                |
| `message` | `string`  | No       | Optional informative message (via the builder)                       |

Two return styles — both valid:

```typescript
// 1. Plain object — simplest, lowest overhead (good for sync actions, simple events)
return { success: true, data: {} }; // data is optional; include it (even {}) on sync actions

// 2. Response utility class — recommended for Customer Events and complex Merchant Events
Resp.success().setData({ order_id: id }); // .setData({}) is the recommended convention
Resp.error().setMessage("Something went wrong").setStatus(500);
```

Builder methods (chainable): `Resp.success()` / `Resp.error()` start a response; `.setData(obj)`
is optional but recommended — pass `{}` even when empty, and especially on sync actions, where
the returned `data` is merged/applied to the entity; `.setStatus(code)` is optional (default
`200`); `.setMessage(msg)` is optional. `Resp` is a pre-declared runtime global — use it
directly, no import.

**Entity-named builders.** Some triggers expose an entity-specific builder instead of the
generic `Resp` — same `.success()` / `.error()` shape plus entity setters. `shipment.creating`
**requires** the `Shipment` class (context type `Shipments`, return type `Promise<Shipment>`):
`Shipment.success().setShipmentNumber(id)` (always call `.setShipmentNumber()` on success),
`Shipment.error().setMessage("…")`. Confirm the exact builder + setters from the trigger's
`types` (see **salla-app-functions-validate**) before relying on them.

### Sync actions: what the return does

For a **sync** action (e.g. `shipment.creating`) the merchant is **blocked** waiting on you:

- `success: true` → the action **proceeds**, and your `data` is **merged/applied** to the
  resulting entity.
- `success: false` → the action is **rejected** and your `error` / `.setMessage()` is shown
  to the merchant immediately. Make it clear and actionable.

For an **async** event the return is **informational only** — logged, never affecting the
already-completed operation. Still always return a response on every path.

## Sandbox constraints (V8 isolate — NOT full Node.js)

App Functions run in a **V8 isolate**, not a Node.js runtime
([Node.js Support](https://docs.salla.dev/1769435m0.md)). Native Node APIs are limited:

- **No external packages** — npm / external libraries are **not** importable (planned for a
  future version). Only pre-declared globals and web-standard APIs.
- **Unsupported Node core modules** (using them errors): `fs`, `fs/promises`, `net`, `tls`,
  `dgram`, `http`/`https` **servers**, `child_process`, `cluster`, `worker_threads`, `repl`,
  `readline`, `zlib`.
- **Partially supported:** `crypto` = **Web Crypto API only** (`globalThis.crypto`); `buffer`
  = basic; `stream` = **WHATWG streams only**; `os` / `path` / `util` / `events` = partial.
- **Outbound HTTP** → the standard **`fetch()`** API (no `http`/`https` client modules, no
  servers). This is the only supported way to reach external or Salla APIs.

## Bound every external `fetch` to the timeout

Bound each `fetch` with an `AbortController` so one slow upstream can't blow the budget. In a
sync action (5 s hard limit, < 500 ms goal) keep each call under 2 s; an async event has 30 s
total. (Budget rationale → **salla-app-functions-design**.)

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

Outbound-call safety: check `res.ok` before returning upstream data, so an error body never
becomes a success response. Call hard-coded endpoints (allowlist any merchant-supplied URL).
Keep `context.settings` and tokens out of logs. A call that needs a merchant access token or
OAuth → **salla-app-auth**.

**Gate:** "Returns `Resp.success().setData(...)` on every path, no npm/unsupported core,
every `fetch` bounded, `res.ok` checked, no secrets logged?" → **salla-app-functions-validate**.
