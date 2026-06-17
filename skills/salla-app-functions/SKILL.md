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

  Always use this skill before writing or reviewing any App Function code. Builds on
  the salla-api-core and salla-webhooks skills.
---

# Salla App Functions Flow

Build a serverless handler that Salla runs automatically on a store event — you write
the logic, Salla runs it in a sandboxed V8 runtime. Follow the steps in order; complete
each gate before moving on. Steps 1–3 are mostly code you author; Steps 4–5 **perform
actions** with the Salla Partners MCP.

**Prefer an App Function over a webhook whenever a trigger exists.** Salla runs the code,
so it is:

- **Secure without signature verification** — it runs inside Salla's sandbox, so there's
  no inbound request and no `X-Salla-Signature` to validate.
- **Settings-aware** — the merchant's saved settings arrive in `context.settings`; no
  extra fetch.
- **Pre-authenticated** — call the Salla Admin API straight from the handler with
  **built-in authentication** (the function is already authorized for the app — no token
  storage or refresh to manage).
- **Synchronous and actionable** — on an action event such as `shipment.creating` it runs
  **before** the operation and your return value shapes or blocks it; a webhook can only
  react after the fact.

Fall back to a webhook (**salla-webhooks**) only when no App Function trigger exists.

## Tools & MCPs

Confirm each event's live `payload.data` shape in the App Functions events reference
(https://docs.salla.dev/1726818m0.md) before writing a handler. Never assume a payload.

The **Salla Partners MCP** _performs actions_:

| Tool              | Action              | What it does                                           |
| ----------------- | ------------------- | ------------------------------------------------------ |
| `salla_apps`      | `publish`           | Publish the app                                        |
| `salla_functions` | `deploy` / `delete` | Deploy or remove the app's functions (no `list`/`get`) |

> Sync actions must finish in **< 500 ms**; async events get **30 s**. `Resp`,
> `CommunicationEvent`, and all typed contexts are **pre-declared runtime globals** —
> never re-declare or import them in code you paste into the Portal.
>
> Docs: https://docs.salla.dev/1726814m0.md (overview) · https://docs.salla.dev/1726818m0.md
> (events) · https://docs.salla.dev/1726816m0.md (testing)

---

## Step 0 — Discover

Ask before starting:

1. **Which event/trigger** does the function run on? (e.g. `order.created`,
   `shipment.creating`)
2. **What should it do** when it fires? (notify, sync, validate/block, modify params)
3. **Does it need to block or change** the operation, or just react after the fact?

---

## Step 1 — Confirm the Event Contract

Confirm the event's exact `payload.data` shape in the App Functions events reference
(https://docs.salla.dev/1726818m0.md) **before** writing any handler. The event →
typed-context mapping and the supported trigger list live in
**[references/event-contexts.md](references/event-contexts.md)**.

**Gate:** "Do you have the confirmed `payload.data` field names for this event?"

---

## Step 2 — Choose the Execution Type

| Type                   | Timing               | Blocks user? | Timeout      | Return value effect                                                    |
| ---------------------- | -------------------- | ------------ | ------------ | ---------------------------------------------------------------------- |
| **Asynchronous event** | After the operation  | No           | 30 s         | Fire-and-forget: logged, does **not** affect the flow.                 |
| **Synchronous action** | Before the operation | Yes          | **< 500 ms** | Blocking: can **modify** parameters or **reject/block** the operation. |

- **Sync actions** (e.g. `shipment.creating`) intercept the lifecycle:
  `Resp.error().setMessage("…")` cancels the operation (message shown to the
  customer/merchant); `Resp.success().setData({ … })` alters the operation's data before
  it completes.
- **Async events** (e.g. `order.created`, `product.added`) run out-of-band; return a
  valid `Resp.success()` / `Resp.error()` so the result is recorded in logs.

**Gate:** "Sync or async decided, and the timeout budget understood?"

---

## Step 3 — Write the Handler

The Portal wraps your code in a fixed template. **Lines 1 and 4 are locked** — edit only
the body; nothing goes before line 1 or after line 4:

```text
1  export default async (context: ContextType): Promise<Resp> => {
2    // editable body
3    ...
4  };
```

### Context object

```typescript
context.merchant; // { id: string, … }
context.payload; // { event: string, created_at: string, data: { … } }
context.settings; // Record<string, string | undefined> — your per-merchant App Settings
```

Salla API calls made **inside** a function are authenticated automatically — no
`Authorization` header needed (see salla-api-core). Use typed contexts for autocomplete:

```typescript
export default async (context: OrderCreatedContext): Promise<Resp> => {
  const orderId = context.payload.data.id;
  return Resp.success().setData({ order_id: orderId });
};
```

### Sandbox constraints (V8, like edge functions)

- **No external npm packages** — only pre-declared globals and web-standard APIs.
- **Unsupported Node core** (throw at runtime): `child_process`, `cluster`, `dgram`,
  `fs`, `fs/promises`, `http`, `https`, `net`, `repl`, `readline`, `tls`,
  `worker_threads`, `zlib`.
- **Partially supported:** `crypto` → use **Web Crypto** (`globalThis.crypto`);
  `buffer`/`stream` → web-standard / WHATWG Streams; plus `os`, `path`, `util`, `events`.
- **HTTP:** always use browser-native **`fetch()`**.

### The `Resp` API (mandatory return)

```typescript
// Success — setData is STRICTLY MANDATORY (pass {} if there's no payload)
Resp.success().setData({ order_id: id });
Resp.success().setData({}); // correct empty success

// Error — setMessage and/or setStatus; setData optional
Resp.error().setMessage("Something went wrong").setStatus(500);
```

Plain-object equivalent (if not using the builder):

```typescript
return { success: true, data: { order_id: 123 } }; // data mandatory, even if {}
return { success: false, error: "Validation failed", status: 400 };
```

### Settings

```typescript
const apiKey = context.settings?.apiKey; // optional chaining — undefined until configured
```

### Bound every external `fetch` to the timeout (`AbortController`)

```typescript
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 400); // 400ms for a sync action
try {
  const res = await fetch("https://api.example.com/data", {
    signal: controller.signal,
  });
  return Resp.success().setData(await res.json());
} catch (error) {
  if ((error as Error).name === "AbortError")
    console.error("External request timed out");
  return Resp.error().setMessage("Upstream timeout").setStatus(504);
} finally {
  clearTimeout(timeout);
}
```

### Local IDE mock pattern

`Resp` and contexts are runtime globals, so local TypeScript won't know them. Put mocks
**after** the handler and paste **only** the handler into the Portal (stop before the
comment):

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

**Gate:** "Handler returns `Resp.success().setData(...)` on every path, no npm/unsupported
core modules, every `fetch` bounded, no secrets logged?"

---

## Step 4 — Deploy & Publish

The function **source** is authored in the Portal (no source-upload tool): open your app
→ **App Functions → Add New Function** → name it → pick the trigger in **Select Action**
→ paste the handler body into the locked template → Save (it lives in the **sandbox**
until published).

Shipping it is an **action** — use the Partners MCP instead of clicking Publish:

- **Deploy the functions:** `salla_functions action=deploy`, `app_id` — deploys the app's
  App Functions to the Salla App Builder. The tool is listed but **operator-gated**: if the
  MCP server hasn't enabled the App Builder service it returns a clear "App Functions are
  disabled on this deployment" error (ask the operator to enable the functions toolset).
- **Remove:** `salla_functions action=delete`, `app_id`, `trigger` (e.g. `"order.created"`).
- **Publish the app:** `salla_apps action=publish`, `app_id` (optional `update_note`);
  installed merchants get the update automatically.

There is **no `list`/`get` action** — inspect a deployed function in the Portal (preview
panel / execution logs). The function **source** is authored in the Portal (or via the
platform App-Builder API), not through `salla_functions`.

**Gate:** "The Portal shows the function deployed after publish."

---

## Step 5 — Test & Verify

Test through the **preview panel** in the Portal: select a demo store, enter a test record
ID matching the trigger, click **Save and Preview**. The panel reports Execution Status,
Response Data, Execution Time (watch it vs your timeout), Console Logs, and Errors.

**Never log secrets** — preview logs are visible in the Portal.

Checklist:

- [ ] `payload.data` shape confirmed against https://docs.salla.dev/1726818m0.md (Step 1).
- [ ] Sync body completes well under 500 ms (`fetch` bounded with `AbortController`).
- [ ] `Resp.success().setData(...)` always called — `{}` if empty.
- [ ] No npm imports / unsupported core modules; `globalThis.crypto`.
- [ ] No secrets in `console.log`.
- [ ] Tested in the preview panel against a demo store with a real record ID.
- [ ] App published (`salla_apps action=publish`) after the sandbox test passes.

**Gate:** "Execution Status = success in the preview panel, within the timeout budget?"

---

## Key Resources

| Resource               | URL                                                                  |
| ---------------------- | -------------------------------------------------------------------- |
| App Functions overview | https://docs.salla.dev/1726814m0.md                                  |
| Get started            | https://docs.salla.dev/1726815m0.md                                  |
| Supported events       | https://docs.salla.dev/1726818m0.md                                  |
| Testing guide          | https://docs.salla.dev/1726816m0.md                                  |
| Demo store testing     | https://salla.dev/blog/how-to-test-your-app-using-salla-demo-stores/ |
| Partners Portal        | https://portal.salla.partners                                        |
| Telegram community     | https://t.me/salladev                                                |
