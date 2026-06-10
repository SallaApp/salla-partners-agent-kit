---
name: salla-app-functions
description: >
  Use this skill for any task involving Salla App Functions — serverless
  TypeScript/JavaScript handlers that Salla runs automatically on store events.
  Trigger when a developer is: writing an App Function handler, choosing between a
  synchronous action and an asynchronous event, using the pre-declared `Resp`
  builder or returning the equivalent plain JSON, reading `context.payload` /
  `context.merchant` / `context.settings`, fighting the locked Portal template,
  hitting the V8 sandbox limits (no npm, no `fs`/`http`, Web Crypto only),
  deploying/publishing a function from the Partners Portal, reading the execution
  logs / preview panel, managing the 500 ms (sync) or 30 s (async) timeout with
  `AbortController`, or setting up local IDE type mocks for `Resp` and the typed
  contexts.

  Trigger also when you see: "App Function", "Resp.success", "Resp.error",
  "setData", "OrderCreatedContext", "ShipmentCreatingContext", "CommunicationEvent",
  "context.settings", "Select Action", "Save and Preview", "synchronous action",
  "asynchronous event", "shipment.creating", "App Functions sandbox", "edge function
  timeout", or any question about running custom code on a Salla trigger without
  hosting a server.

  Always use this skill before writing or reviewing any App Function code. The MCP
  server (apidog-mcp-server, site-id: 451700) has the live event list and payload
  schemas — query it to confirm an event's `payload.data` shape before writing a
  handler. Builds on the salla-api-core and salla-webhooks skills.
---

# Salla App Functions Skill

Serverless TypeScript/JavaScript handlers that execute automatically on Salla
events. No infrastructure to manage — you write the logic, Salla runs it in a
sandboxed V8 runtime.

**Two MCPs — different jobs:**
- **`apidog-mcp-server`** (site-id: `451700`) — *read-only*. Query for the live event
  list and each event's `payload.data` shape before writing a handler. Never assume a
  payload.
- **Salla Partners MCP** — *performs actions*. Once you've written the handler, use
  `salla_functions` (`list` / `get` / `delete`) to inspect deployed functions and
  `salla_apps action=publish` to ship them (deploy happens on publish — Part 8).
**Docs:** https://docs.salla.dev/1726817m0 (overview) · https://docs.salla.dev/1726815m0 (get started)
**Events:** https://docs.salla.dev/1726818m0 · **Testing:** https://docs.salla.dev/1726816m0

> Synchronous actions must finish in **< 500 ms**. Asynchronous events get **30 s**.
> `Resp`, `CommunicationEvent`, and all typed contexts are **pre-declared runtime
> globals** — never re-declare or import them in code you paste into the Portal.

---

## Part 1 — Execution Types (decide this first)

| Type                   | Timing               | Blocks user? | Timeout      | Return value effect                                                    |
| ---------------------- | -------------------- | ------------ | ------------ | ---------------------------------------------------------------------- |
| **Asynchronous event** | After the operation  | No           | 30 s         | Fire-and-forget: logged for debugging, does **not** affect the flow.   |
| **Synchronous action** | Before the operation | Yes          | **< 500 ms** | Blocking: can **modify** parameters or **reject/block** the operation. |

### Synchronous actions (blocking)

Sync actions (e.g. `shipment.creating`) let you intercept the store lifecycle:

- **Reject/block:** return `Resp.error().setMessage("…")` to cancel the operation and
  show the message to the customer/merchant.
- **Modify parameters:** return `Resp.success().setData({ … })` to alter the operation's
  data (e.g. adjust shipment details) before it completes.

### Asynchronous events (non-blocking)

Async events (e.g. `order.created`, `product.added`) run out-of-band. Return values do
not change the merchant flow, but still return a valid `Resp.success()` / `Resp.error()`
so the result is recorded in the execution logs.

---

## Part 2 — The Context Object

Every function receives a single `context` argument:

```typescript
context.merchant; // { id: string, … }
context.payload; // { event: string, created_at: string, data: { … } }
context.settings; // Record<string, string | undefined> — your per-merchant App Settings
```

Salla API calls made **inside** a function are authenticated automatically — no
`Authorization` header needed (see salla-api-core for the API surface).

---

## Part 3 — Typed Contexts

Every event has a typed interface so `payload.data` autocompletes:

```typescript
export default async (context: OrderCreatedContext): Promise<Resp> => {
  const orderId = context.payload.data.id;
  return Resp.success().setData({ order_id: orderId });
};
```

Common contexts: `OrderCreatedContext`, `OrderStatusUpdated`, `ProductAddedContext`,
`ShipmentCreatingContext`, `CommunicationEvent`, and more. Full event → context mapping
and the supported trigger list live in **[references/event-contexts.md](references/event-contexts.md)**.
Confirm the exact `payload.data` fields for an event via the MCP before relying on them.

---

## Part 4 — The Locked Portal Template

The Portal wraps your code in a fixed template. **Lines 1 and 4 are locked** — you can
only edit the body. Nothing may go before line 1 or after line 4:

```text
1  export default async (context: ContextType): Promise<Resp> => {
2    // editable body
3    ...
4  };
```

`Resp`, `CommunicationEvent`, and every context type are pre-declared by the runtime.
**Do NOT re-declare or import them** in the pasted code.

---

## Part 5 — Sandbox & Environment Constraints

App Functions run in a sandboxed V8 runtime (like Cloudflare Workers / edge functions):

- **No external npm packages.** Only pre-declared globals and web-standard APIs.
- **Unsupported Node core modules** (throw at runtime): `child_process`, `cluster`,
  `dgram`, `fs`, `fs/promises`, `http`, `https`, `net`, `repl`, `readline`, `tls`,
  `worker_threads`, `zlib`.
- **Partially supported:** `crypto` → use **Web Crypto** (`globalThis.crypto`) instead;
  `buffer`/`stream` → web-standard / WHATWG Streams versions; plus `os`, `path`, `util`,
  `events`.
- **HTTP:** always use the browser-native **`fetch()`** for outbound calls.

---

## Part 6 — The `Resp` API

Every handler must return a structured response via the pre-declared `Resp` builder.
All methods are chainable (return `this`).

```typescript
// Success — setData is STRICTLY MANDATORY (pass {} if there's no payload)
Resp.success().setData({ order_id: id });
Resp.success().setData({}); // correct empty success

// Error — setMessage and/or setStatus; setData optional
Resp.error().setMessage("Something went wrong").setStatus(500);
Resp.error().setStatus(res.status);
```

### Plain-object equivalent (if not using the builder)

```typescript
return { success: true, data: { order_id: 123 } }; // data is mandatory, even if {}
return { success: false, error: "Validation failed", status: 400 };
```

---

## Part 7 — Settings

Merchant-configured values (API keys, URLs, flags) arrive in `context.settings`, set by
the merchant in the Partners Portal App Settings UI (see salla-app-settings):

```typescript
const apiKey = context.settings?.apiKey;
const endpoint = context.settings?.webhookUrl;
```

Always use optional chaining — settings may be `undefined` until the merchant configures them.

---

## Part 8 — Deploy / Publish

App Function **source** is authored in the Partners Portal (there is no source-upload
tool — write the handler body inside the locked template, Part 4):

1. Sign in at https://portal.salla.partners and open your app.
2. **App Functions** section → **Add New Function** → name it (e.g. `order-status-notifier`).
3. Pick the trigger in the **Select Action** dropdown (the event/action list).
4. Write the handler body inside the locked template; Save — it lives in the **sandbox**
   until you publish.

**Shipping it is an action** — use the Salla Partners MCP instead of clicking Publish:

- **Publish (= deploy):** `salla_apps action=publish`, `app_id` (optional `update_note`).
  Salla deploys the function when the app is published; installed merchants get the
  update automatically. There is **no deploy tool** — publishing is the deploy.
- **Inspect what's deployed:** `salla_functions action=list`, `app_id` (optional
  `category`, e.g. `"custom_scripts_events"`); `action=get` with a `trigger` for one
  function's source.
- **Remove a function:** `salla_functions action=delete`, `app_id`, `trigger`
  (e.g. `"order.created"`).

> Versioning, CLI deploy, and explicit draft labels are not documented — confirm current
> behavior via the docs/MCP before asserting them to a user.

---

## Part 9 — Reading Execution Logs

Inspection happens through the **test / preview panel** in the Portal (the same panel
used for testing):

1. Select a **demo store**.
2. Enter a test record ID (Order ID / Product ID / Customer ID matching the trigger).
3. Click **Save and Preview**.

The panel reports:

| Output               | What it shows                                           |
| -------------------- | ------------------------------------------------------- |
| **Execution Status** | success / failure                                       |
| **Response Data**    | the object returned from `Resp.setData(...)`            |
| **Execution Time**   | how long the run took (watch this against your timeout) |
| **Console Logs**     | everything written with `console.log()`                 |
| **Errors**           | thrown errors / rejected promises                       |

**Never log secrets.** Do not `console.log` API keys, tokens, customer PII, payment
data, or passwords — preview logs are visible in the Portal.

> Log filtering, retention windows, and a standalone production log viewer are not
> documented — confirm via the MCP / docs before describing them.

---

## Part 10 — Timeout Management (`AbortController`)

Timeouts are strictly enforced (sync < 500 ms, async 30 s). Any external `fetch` can
blow the budget — always bound it:

```typescript
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 400); // 400ms for a sync action

try {
  const res = await fetch("https://api.example.com/data", {
    signal: controller.signal,
  });
  const data = await res.json();
  return Resp.success().setData(data);
} catch (error) {
  if ((error as Error).name === "AbortError")
    console.error("External request timed out");
  return Resp.error().setMessage("Upstream timeout").setStatus(504);
} finally {
  clearTimeout(timeout);
}
```

---

## Part 11 — Local IDE Mock Pattern

`Resp` and the typed contexts are runtime globals, so local TypeScript won't know them.
Put mocks **after** the handler with a clear comment, and paste **only** the handler into
the Portal (stop before the comment line):

```typescript
export default async (context: MyContextType): Promise<Resp> => {
  // ... handler body ...
};

// Don't paste the following into Salla's App Function — local IDE typing only
interface MyContextType {
  merchant: { id: string };
  payload: { event: string; created_at: string; data: Record<string, unknown> };
  settings: Record<string, string | undefined>;
}
class Resp {
  static success() {
    return new Resp();
  }
  static error() {
    return new Resp();
  }
  setStatus(_: number) {
    return this;
  }
  setMessage(_: string) {
    return this;
  }
  setData(_: Record<string, unknown>) {
    return this;
  }
}
```

---

## Part 12 — Testing Checklist

- [ ] Confirm the event's `payload.data` shape via the MCP before coding.
- [ ] Sync action body completes well under 500 ms (bound every `fetch` with `AbortController`).
- [ ] `Resp.success().setData(...)` always called — `{}` if empty.
- [ ] No npm imports / unsupported core modules; `globalThis.crypto` instead of `crypto`.
- [ ] No secrets in `console.log`.
- [ ] Tested in the preview panel against a demo store with a real record ID.
- [ ] App published after the sandbox test passes.

Testing guide: https://docs.salla.dev/1726816m0 ·
Demo stores: https://salla.dev/blog/how-to-test-your-app-using-salla-demo-stores/

---

## Key Resources

| Resource               | URL                                                                  |
| ---------------------- | -------------------------------------------------------------------- |
| App Functions overview | https://docs.salla.dev/1726817m0                                     |
| Get started            | https://docs.salla.dev/1726815m0                                     |
| Supported events       | https://docs.salla.dev/1726818m0                                     |
| Testing guide          | https://docs.salla.dev/1726816m0                                     |
| Demo store testing     | https://salla.dev/blog/how-to-test-your-app-using-salla-demo-stores/ |
| Partners Portal        | https://portal.salla.partners                                        |
| Telegram community     | https://t.me/salladev                                                |
