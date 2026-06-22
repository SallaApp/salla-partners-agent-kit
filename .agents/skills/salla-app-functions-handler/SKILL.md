---
name: salla-app-functions-handler
description: >
  Step 3 of building a Salla App Function: write the handler body from the trigger's
  `template`. Use when coding the logic — reading typed `context` (payload/merchant/settings),
  returning the response contract via the `Resp` (or entity `Shipment`) builder, staying
  inside the V8-isolate sandbox (web-standard APIs, `fetch` for HTTP), and bounding each
  `fetch` to the sync/async timeout. Routed from salla-app-functions; validate next with
  salla-app-functions-validate. Token-handling → salla-app-auth; API details → salla-api-core.
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

Calling the Salla Admin API from inside a function typically needs no token wiring — confirm
the exact auth the runtime injects from the trigger's `types` / function context, then call
the Admin API directly. Request the **minimum OAuth scopes** for the endpoints you call
(scope setup and token handling → **salla-app-auth**); base URL, endpoints, and error shapes
→ **salla-api-core**. Settings: `context.settings?.apiKey` (optional chaining — undefined
until configured).

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
return Resp.success().setData({ order_id: id }); // .setData({}) is the recommended convention
return Resp.error().setMessage("Something went wrong").setStatus(500);
```

Builder methods (chainable): `Resp.success()` / `Resp.error()` start a response; `.setData(obj)`
is optional but recommended — pass `{}` even when empty, and especially on sync actions, where
the returned `data` is merged/applied to the entity; `.setStatus(code)` is optional (default
`200`); `.setMessage(msg)` is optional. `Resp` is a pre-declared runtime global — use it
directly, no import.

**Entity-named builders.** Some triggers expose an entity-specific builder instead of the
generic `Resp` — same `.success()` / `.error()` shape plus entity setters. `shipment.creating`
**requires** the `Shipment` class (context type `Shipments`, return type `Promise<Shipment>`):
`return Shipment.success().setShipmentNumber(id)` (always call `.setShipmentNumber()` on
success), `return Shipment.error().setMessage("…")`. Confirm the exact builder + setters from
the trigger's
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

Bound each `fetch` with an `AbortController` so one slow upstream can't blow the budget. Keep
each call well under the trigger's budget — a sync action targets < 500 ms total, an async
event has up to 30 s (confirm the exact limits → **salla-app-functions-design**). Validate and
shape the response before applying it: extract the specific fields you need and return only
those, so a malformed or hostile upstream body never flows into the entity.

```typescript
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 2000); // < 2s per call in a sync action
try {
  const res = await fetch("https://api.example.com/data", {
    signal: controller.signal,
  });
  if (!res.ok) return Resp.error().setMessage("Upstream error").setStatus(502);

  const body = await res.json();
  // Validate the shape and extract only the fields you trust — don't return raw JSON.
  if (typeof body?.tracking_number !== "string") {
    return Resp.error().setMessage("Invalid upstream response").setStatus(502);
  }
  return Resp.success().setData({ tracking_number: body.tracking_number });
} catch (error) {
  return Resp.error().setMessage("Upstream timeout").setStatus(504);
} finally {
  clearTimeout(timeout);
}
```

Outbound-call safety:

- **Validate before applying** — check `res.ok`, then validate the body's shape and return
  only the fields you need (above), so an error body or extra fields never reach the entity.
- **Trust your own endpoints** — call hard-coded URLs; when a URL comes from settings, match
  it against an allowlist of hosts you control before the `fetch`.
- **Sanitize merchant input** — `context.settings` is merchant-controlled. Validate type and
  format, and encode/escape each value for its target (path/query encoding, header value)
  before placing it in an outbound request.
- **Keep secrets out of logs** — never log `context.settings` or tokens.

**Gate:** "Returns `Resp.success().setData(...)` on every path, no npm/unsupported core, every
`fetch` bounded, response validated/shaped before use, settings sanitized, no secrets logged?"
→ **salla-app-functions-validate**.
