---
name: salla-app-functions
description: >
  Write Salla App Functions — serverless TypeScript handlers that run INSIDE Salla on
  store-event triggers; no server to host. PREFERRED over webhooks whenever a trigger
  exists for the event. Covers sync (under 500 ms, can modify the operation) vs async
  (30 s), the locked Portal template, pre-declared Resp/typed-context globals, V8
  sandbox limits (no npm, no fs/http, Web Crypto + fetch only), context.settings, and
  deploy-via-app-publish. Storefront/browser behavior → salla-snippets; events without
  triggers → salla-webhooks.
---

# Salla App Functions Flow

Build a serverless handler that Salla runs automatically on a store event — you write
the logic, Salla runs it in a sandboxed V8 runtime. Follow the steps in order; complete
each gate before moving on. Steps 1–3 are mostly code you author; Steps 4–5 **perform
actions** with the Salla Partners MCP.

## Tools & MCPs

**Two MCPs — different jobs:**

- **`apidog-mcp-server`** (site-id: `451700`) — _read-only_. Query for the live event
  list and each event's `payload.data` shape before writing a handler. Never assume a
  payload.
- **Salla Partners MCP** — _performs actions_:

| Tool         | Action    | What it does                            |
| ------------ | --------- | --------------------------------------- |
| `salla_apps` | `publish` | Publish the app (= deploy the function) |

> **No MCP tool exists for inspecting or deleting deployed functions.** To view, edit,
> or delete a deployed App Function, use the Partners Portal → **App Functions** tab.

> Sync actions must finish in **< 500 ms**; async events get **30 s**. `Resp`,
> `CommunicationEvent`, and all typed contexts are **pre-declared runtime globals** —
> never re-declare or import them in code you paste into the Portal.
>
> Docs: https://docs.salla.dev/1726817m0 (overview) · https://docs.salla.dev/1726818m0
> (events) · https://docs.salla.dev/1726816m0 (testing)

---

## Step 0 — Discover

Ask before starting:

1. **Which event/trigger** does the function run on? (e.g. `order.created`,
   `shipment.creating`)
2. **What should it do** when it fires? (notify, sync, validate/block, modify params)
3. **Does it need to block or change** the operation, or just react after the fact?

---

## Step 1 — Confirm the Event Contract

Query `apidog-mcp-server` (site-id `451700`) for the event's exact `payload.data` shape
**before** writing any handler. The event → typed-context mapping and the supported
trigger list live in **[references/event-contexts.md](references/event-contexts.md)**.

> **Fallback:** If `apidog-mcp-server` is not connected, consult
> https://docs.salla.dev/1726818m0 for the trigger event payload shape.

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

### Bound every external `fetch` to the timeout

Pass an `AbortController` signal sized to your budget (e.g. abort at ~400 ms inside a
sync action) and return `Resp.error().setMessage("Upstream timeout").setStatus(504)` on
`AbortError`.

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

Author the function **source** either way:

- **Portal:** open your app → **App Functions → Add New Function** → name it → pick the
  trigger in **Select Action** → paste the handler body into the locked template → Save
  (it lives in the **sandbox** until published).
- **Programmatic upsert:** `PUT /partners/v1/app-builder/api/{appId}/functions` —
  requires the **platform token** (`v4.public…`, NOT the standard partner JWT). The PUT
  on the _collection_ endpoint is a create-or-update upsert keyed by the **trigger slug**
  (one function per trigger; there is no numeric function ID, and
  `PUT /functions/{slug}` → 404). Body fields: `name`, `trigger`, `content` — the source
  field is `content`, **not** `code`. **Gotcha:** for `custom.scripts.*` triggers,
  `content` must be **Base64-encoded**. Deploy is async — the response is
  `{job, version}`, not the function object.

Either way, merchants only get the function via **app publication** — use the Partners
MCP instead of clicking Publish:

- **Publish (= deploy):** `salla_apps action=publish`, `app_id` (optional `update_note`).
  Salla deploys the function on publish; installed merchants get the update
  automatically. There is **no deploy tool** — publishing is the deploy.
- **Inspect / edit / remove deployed functions:** use the Partners Portal →
  **App Functions** tab (no MCP tool exists for this).

**Gate:** "The App Functions tab in the Portal shows the function after publish?"

---

## Step 5 — Test & Verify

Test through the **preview panel** in the Portal: select a demo store, enter a test record
ID matching the trigger, click **Save and Preview**. The panel reports Execution Status,
Response Data, Execution Time (watch it vs your timeout), Console Logs, and Errors.

**Never log secrets** — preview logs are visible in the Portal.

Checklist:

- [ ] `payload.data` shape confirmed via the MCP (Step 1).
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
| App Functions overview | https://docs.salla.dev/1726817m0                                     |
| Get started            | https://docs.salla.dev/1726815m0                                     |
| Supported events       | https://docs.salla.dev/1726818m0                                     |
| Testing guide          | https://docs.salla.dev/1726816m0                                     |
| Demo store testing     | https://salla.dev/blog/how-to-test-your-app-using-salla-demo-stores/ |
| Partners Portal        | https://portal.salla.partners                                        |
| Telegram community     | https://t.me/salladev                                                |
