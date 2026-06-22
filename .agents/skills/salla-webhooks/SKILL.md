---
name: salla-webhooks
description: >
  Salla webhooks end to end — registering/subscribing, choosing a security strategy
  (signature = HMAC of the raw body; token = plain equality of the Authorization
  header; or none) and verifying each correctly, the payload envelope, idempotency,
  fast 200, conditional rules, and versions (v1/v2). Use when building a webhook server
  (Node/Express `@salla.sa/webhooks-actions` or Laravel/PHP / Salla CLI), subscribing
  events, or debugging delivery. Prefer an App Function (salla-app-functions) when a
  trigger exists. Lifecycle → salla-app-lifecycle; tokens → salla-app-auth.
---

# Salla Webhooks Flow

Stand up a reliable webhook integration — build the server, subscribe to events, verify
every delivery, respond fast, and stay idempotent. Work through the steps in order;
complete each gate before moving on. Step 2 **performs actions** with the Salla Partners
MCP; the server and verification are runtime code.

> **Prefer an App Function when the event has one.** If a trigger exists in
> [salla-app-functions](../salla-app-functions/SKILL.md), use it instead of a webhook — it
> runs in Salla's sandbox (no signature to verify), gets `context.settings`, calls the
> Salla API with built-in auth, and can run **synchronously** on action events (e.g.
> `shipment.creating`) where the return value shapes the operation. Use a webhook only
> when no App Function trigger covers the event.

## Tools & MCPs

Confirm live event payload schemas in the webhooks reference
(https://docs.salla.dev/421119m0.md) before coding; never assume a shape. The **Salla
Partners MCP** _performs actions_:

| Tool           | Action               | What it does                                                                    |
| -------------- | -------------------- | ------------------------------------------------------------------------------- |
| `salla_apps`   | `connect`            | Set the app's `webhook_url`, security strategy, custom headers (secret: Portal) |
| `salla_events` | `list` / `subscribe` | Subscribe the app to store/lifecycle events                                     |

> New webhooks default to **version 2**. **Always set `webhook_security_strategy` explicitly**
> (`signature` | `token` | `none`) — the Partners MCP now requires it on
> `salla_apps action=connect`. Picking **`none`** disables verification: Salla then sends
> deliveries with **no `Authorization` header and no signature**, so there is nothing to
> verify (Step 3). Because `none` runs **no** verification, a wrong or missing verify (e.g.
> HMAC-ing a `token` webhook) stays **invisible** under it — confirm the active strategy is
> `token`/`signature`, not `none`, before trusting that "verification works." Store-level
> management base URL (merchant token):
> `https://api.salla.dev/admin/v2`; register is `POST /webhooks/subscribe`.
> Docs: https://docs.salla.dev/421119m0.md · Conditional: https://docs.salla.dev/421120m0.md ·
> Node/Express repo: https://github.com/SallaApp/webhook-actions-js

---

## Step 0 — Discover

1. **Which events** do you need? (lifecycle, orders, products, shipments…) — confirm exact
   names/payloads in the webhooks reference (https://docs.salla.dev/421119m0.md).
2. **App-level or store-level?** App/lifecycle events → subscribe via the Partners MCP
   (`salla_events`); store-level merchant webhooks → the Admin API `POST /webhooks/subscribe`
   with a merchant token (`webhooks.read_write` scope).
3. **Stack?** Node/Express (`@salla.sa/webhooks-actions`) or Laravel/PHP (Salla CLI)?

---

## Step 1 — Build the Webhook Server

Two supported paths, both with a single POST endpoint and the secret loaded from env:

- **Node.js / Express with `@salla.sa/webhooks-actions`** — the official server-side package.
  It dispatches events (`Actions.setSecret(secret)`, `Actions.on(event, cb)`,
  `Actions.checkActions(body, token)`) and does **token** verification internally — its check
  is `if (secret !== this._secret) return;`, i.e. plain equality of the `Authorization` value
  against the secret (Step 3, `token` strategy). Routes events to `on(<event>, …)` listeners
  or file-based `Actions/<domain>/<event>.js` handlers (`salla app create-webhook`).
  - **Caveat — Express only.** The package is **CommonJS** and dispatches handlers via dynamic
    `require()` over the file system, which **does not work on Next.js (or other) serverless**
    runtimes. The listener API and the token-equality model are portable; the file-dispatch is
    not. On serverless, verify and dispatch by hand (Step 3) instead of relying on the package.
- **Laravel / PHP via Salla CLI** (`salla app create`) — scaffolds the server; verify
  manually with `hash_hmac('sha256', $rawBody, $secret)` + `hash_equals` for the **signature**
  strategy.

The decision that matters: if you verify the **signature manually** (Step 3), the HMAC must
run on the **raw request body** — capture the unparsed bytes before any JSON middleware.
Don't mix a parsed body with a manual HMAC check on the same route.

> **Check for an official `@salla.sa` package before hand-writing server-side code.** Run
> `npm search "@salla.sa"` — alongside `@salla.sa/webhooks-actions` you may use
> `@salla.sa/passport-strategy` (OAuth), `@salla.sa/event`, and `@salla.sa/embedded-sdk`.
> Confirm the package's runtime fit (the serverless caveat above) before adopting it.

**Full scaffolding (env vars, Express Pattern A/B, the file-handler tree, PHP verify):
load [references/server-setup.md](references/server-setup.md).**

**Gate:** "Server up, single POST endpoint receives events, secret loaded from env?"

---

## Step 2 — Register / Subscribe to Events

### App / lifecycle events (Partners MCP) ✅ for partner apps

1. Set the receiver: `salla_apps action=connect`, `app_id`, `webhook_url`,
   `webhook_security_strategy` (**required** — `signature` | `token` | `none`),
   optional `webhook_headers`. (The signing secret is created/rotated in the Portal, not here.)
   - Set the strategy **explicitly every time**. Omitting it is treated as **`none`** —
     Salla then delivers with **no `Authorization` header and no signature**, so there is
     nothing to verify and your guard silently passes everything (Red Flags).
   - `signature` → HMAC; `token` → plain header equality; `none` → no verification (Step 3).

   > **Secret-sync gate:** the signing secret is created/rotated **in the Partner Portal**
   > (`https://portal.salla.partners/apps/{app_id}`, real id substituted), not by the MCP — a
   > rotation invalidates the old value. **Immediately before deploying, read the live value with
   > `salla_apps action=get` (the `webhook_secret` field)** — never reuse a secret from an
   > earlier session or assume your local/env value still matches Salla's. Tie verification
   > to that live value and update **every** deployment environment (prod, staging, preview).
   > Confirm **deployed env == Portal secret** before testing; a mismatch fails verification
   > and returns **401 on every delivery**.

2. List + subscribe: `salla_events action=list`, `app_id` → `salla_events
action=subscribe`, `app_id`, `events: [...]`.

### Store-level webhooks (Admin API, merchant token)

Base URL `https://api.salla.dev/admin/v2`; all five operations need the
`webhooks.read_write` scope (reads accept `webhooks.read`). Register body
([5394134](https://docs.salla.dev/5394134e0.md)):

```json
{
  "name": "Order Created Handler",
  "event": "order.created",
  "url": "https://your-app.com/webhooks",
  "version": 2,
  "rule": "total > 100",
  "headers": [{ "key": "Authorization", "value": "your-secret-value" }]
}
```

| Field     | Type   | Notes                                                       |
| --------- | ------ | ----------------------------------------------------------- |
| `event`   | string | **Required.** From `GET /webhooks/events` — verify the name |
| `url`     | string | **Required.** Must accept POST; no `localhost`/`test.` URLs |
| `name`    | string | Optional human-readable label                               |
| `version` | number | `1` or `2`; defaults to `2` — pass `1` only for legacy      |
| `rule`    | string | Optional conditional filter — see Step 4                    |
| `headers` | array  | Optional `{key, value}[]` sent with every delivery          |

`security_strategy` (`signature`\|`token`) and `secret` (required when
`security_strategy=signature`) are **not** register-body fields — set them via
`salla_apps action=connect` / the Portal, or on **Update** (which accepts both).

| Action          | Method + Path                  | Doc                                  |
| --------------- | ------------------------------ | ------------------------------------ |
| Register        | `POST /webhooks/subscribe`     | https://docs.salla.dev/5394134e0.md  |
| Update          | `PUT /webhooks/{id}`           | https://docs.salla.dev/10312606e0.md |
| List active     | `GET /webhooks`                | https://docs.salla.dev/5394135e0.md  |
| List all events | `GET /webhooks/events`         | https://docs.salla.dev/5394136e0.md  |
| Deactivate      | `DELETE /webhooks/unsubscribe` | https://docs.salla.dev/5394137e0.md  |

- **Register** returns `200` with the created `{ id, name, event, type, url, version, rule, headers }`.
  Re-subscribing with the **same URL updates events / restores** the existing webhook (no duplicate).
- **Update** takes the `id` as a path segment; body may carry `name`, `url`, `version`,
  `rule`, `headers`, `security_strategy`, `secret`.
- **List active** returns the store's webhooks plus a `pagination` block (`webhooks.read`).
- **List events** returns `{ id, label, event }[]` — the subscribable event names (`webhooks.read`).
- **Deactivate** selects the target by **query param** `id` **and/or** `url` (one is
  required); passing `url` **deletes every webhook registered to that URL**. Returns `202`.

**Gate:** "Subscribed to the right events (`salla_events action=list` / `GET /webhooks`
confirms), webhook URL registered?"

---

## Step 3 — Secure Every Delivery

**Verify against the strategy you set on connect (Step 2) — the two strategies use _different_
verification, and using the wrong one rejects (or admits) everything.** Read the live secret
with `salla_apps action=get` first (Step 2 secret-sync gate). Keep `SALLA_WEBHOOK_SECRET` in
env only, out of logs. Docs: https://docs.salla.dev/421119m0.md

| `webhook_security_strategy` | What Salla sends                           | How you verify                                        |
| --------------------------- | ------------------------------------------ | ----------------------------------------------------- |
| `token`                     | `Authorization: <webhook_secret>` header   | **Plain equality**: header value **===** the secret   |
| `signature`                 | `x-salla-signature` = HMAC of the raw body | **HMAC-SHA256(rawBody, secret)** compared timing-safe |
| `none`                      | No `Authorization`, no signature           | Nothing to verify — verification is **disabled**      |

### Strategy `token` — plain equality (NOT HMAC)

Salla sends the secret **verbatim** in the `Authorization` header; verification is a direct
**equality** check of that header value against your `webhook_secret`. This is exactly what
`@salla.sa/webhooks-actions` does internally: `if (secret !== this._secret) return;` — no
hashing, no HMAC. A parsed JSON body is fine, since the body is not part of the check.

```typescript
import { timingSafeEqual } from "crypto";

// `token` strategy: the Authorization header value IS the secret (no "Bearer" prefix,
// no HMAC). Compare it directly to webhook_secret. timingSafeEqual avoids a timing leak;
// the plain-equality model is `received === secret`.
function verifyToken(authHeader: string, secret: string): boolean {
  const a = Buffer.from(authHeader ?? "");
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}
```

### Strategy `signature` — HMAC of the raw body

Salla appends the request body's **64-character SHA256 HMAC hash** to the
`x-salla-signature` header (alongside `X-Salla-Security-Strategy: Signature`), computed as
`HMAC-SHA256(rawRequestBody, secret)`. Verify it with a **timing-safe comparison** before
processing or persisting any payload. The HMAC must run on the **raw body** — capture the
unparsed bytes before any JSON middleware.

```typescript
// TypeScript — Web Crypto API (Node 16+, Deno, Cloudflare Workers).
// Pass the RAW request body (the exact bytes Salla sent). HMAC must run on the
// unparsed body, so capture it BEFORE any JSON middleware parses it.
async function verifySignature(
  rawBody: string,
  signatureHex: string,
  secret: string,
): Promise<boolean> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );

  return crypto.subtle.verify(
    "HMAC",
    key,
    hexToBytes(signatureHex),
    new TextEncoder().encode(rawBody),
  );
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2)
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  return bytes;
}
```

### Custom headers

Both strategies support additional headers (internal routing, gateway auth, multi-tenant):

```json
"headers": [
  { "key": "X-App-Source", "value": "salla-prod" },
  { "key": "X-Tenant-ID", "value": "merchant-123" }
]
```

Set via the Portal UI, the register/update API, or `salla_apps action=connect`
`webhook_headers`. Use **standard header names** (e.g. `X-App-Source`, `X-Tenant-ID`) and
let the **Partners MCP validate** what's accepted.

**Gate:** "Verification matches the strategy I set on connect (`token` → header equality,
`signature` → HMAC of the raw body), runs timing-safe, and unverified deliveries get 401?
(If `none`, is leaving it unverified a deliberate choice, not an accident?)"

---

## Step 4 — (Optional) Conditional Webhook Rules

A **conditional webhook** carries a `rule` string ("Salla Rules"): Salla evaluates it against
the event payload and **only delivers when the rule is true**, so your endpoint sees less
noise and less load. Pass `rule` in the register/update body — it is filtering on the sender
side, not in your handler. Rules require **version 2** (421120).

A rule is one or more `attribute operator value` conditions, combined with `AND` / `OR`:

```text
field = value      equality        field != value   inequality
field > value      greater than    field < value    less than
condition1 AND condition2          condition1 OR condition2
```

Quote string/Arabic literals in **backticks**; numbers are bare. Use only the attributes
listed for that event's category (below) — an unsupported attribute won't match.

Examples (from 421120): `"total > 100"` · `"payment_method = mada OR price < 50"` ·
``"status = `active` OR applied_to = `first_order`"`` ·
``"city = `الرياض` AND location != `حي اليرموك`"``.

Each category supports a fixed set of **events** and **attributes** — a rule may only use its
category's attributes:

| Category      | Filterable attributes (subset — full list in 421120)                                                                         |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Order         | `id`, `reference_id`, `total`, `sub_total`, `payment_method`, `status_id`, `branch_id`, `coupon_code`, `shipment_company_id` |
| Product       | `id`, `name`, `sku`, `type`, `price`, `quantity`, `status`, `is_available`, `brand_id`                                       |
| Customer      | `id`, `first_name`, `last_name`, `email`, `mobile`, `gender`, `city`, `country`, `location`                                  |
| Special Offer | `id`, `name`, `offer_type`, `status`, `expiry_date`                                                                          |
| Category      | `id`, `name`, `parent_id`, `status`, `sort_order`                                                                            |
| Brand         | `id`, `name`, `status`, `custom_url`                                                                                         |
| Cart          | `id`, `subtotal`, `total`, `currency`, `coupon_code`, `customer_id`                                                          |
| Miscellaneous | `parent_id`, `store_id`, `customer_id`, `product_id`, `order_id`, `rating`, `status` (event `review.added`)                  |

Full event + attribute reference per category: https://docs.salla.dev/421120m0.md

---

## Step 5 — Respond Fast & Stay Idempotent

Every webhook wraps its data in the standard envelope (values below are **illustrative** —
confirm the exact envelope and per-event `data` shape via the Partners MCP
(`salla_events action=list`) or the webhooks docs before coding):

```json
{
  "event": "order.created",
  "merchant": 123456789,
  "created_at": "2026-05-28T13:34:45+03:00",
  "data": {
    /* event-specific — verify shape via MCP */
  }
}
```

> **Read the store id from `payload.merchant` (top-level), including on
> `app.store.authorize`.** It is not nested under `data`, so `payload.data.merchant.id` is
> `undefined`. `merchant` is your key to look up the right access/refresh tokens.

Response & retry rules — **non-negotiable** (421119):

| Rule                         | Detail                                                                                                                                                                  |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Acknowledge fast**         | Salla waits **~30s** for the connection + HTTP response, then treats the delivery as failed — ack well before that                                                      |
| **Never block on slow work** | Queue DB writes, emails, external calls — respond first, process after                                                                                                  |
| **Retry behavior**           | On a non-success response/timeout Salla resends the event **3 times**, **~5 minutes** apart; a success stops further tries ([docs](https://docs.salla.dev/421119m0.md)) |
| **Idempotency required**     | Webhooks can be delivered more than once — always deduplicate                                                                                                           |

> **Retry interval:** follow the doc (421119) — **3 retries ~5 minutes apart**, ~30s
> timeout. An earlier observation recorded the intervals as **30s / 15s / 10s**; treat that
> as possibly-stale and verify on a live store before relying on it. Either way, ack fast
> and dedupe rather than depend on exact timing.

```typescript
// Fast response + async processing (Express). This route uses the `signature` strategy.
// Mount a RAW body parser on this route — NOT a global express.json(), which would
// consume the body and break HMAC. Parse JSON only AFTER the signature checks out.
// (For the `token` strategy, verify req.get("Authorization") === secret instead — a
// parsed body is then fine. See Step 3 for both.)
app.post("/webhooks/salla", express.raw({ type: "*/*" }), async (req, res) => {
  const raw = req.body.toString("utf8"); // Buffer from express.raw
  const signature = req.get("X-Salla-Signature") ?? "";
  const valid = await verifySignature(
    raw,
    signature,
    process.env.SALLA_WEBHOOK_SECRET!,
  );
  if (!valid) return res.status(401).end();
  res.status(200).end(); // respond immediately (well under Salla's ~30s wait)
  processWebhookAsync(JSON.parse(raw)).catch(console.error); // parse AFTER verifying
});
```

```typescript
// Idempotency — prefer the stable discriminator subscription_id (unique per lifecycle
// event); otherwise hash the RAW request body (the exact bytes Salla sent), NOT a
// re-stringified object. JSON.stringify(payload) is brittle — key order and number/date
// re-serialization can change the hash for the same delivery. Pass `rawBody` from the same
// express.raw() buffer you verified the signature against.
async function handleWebhook(
  payload: WebhookPayload,
  rawBody: string,
): Promise<void> {
  const discriminator =
    (payload.data as any)?.subscription_id ??
    crypto.createHash("sha256").update(rawBody).digest("hex").slice(0, 16);
  const key = `${payload.merchant}:${payload.event}:${discriminator}`;
  const seen = await db.webhookEvents.exists({ key });
  if (seen) return; // already processed
  await db.webhookEvents.insert({ key, received_at: new Date() }); // insert BEFORE processing
  await processEvent(payload);
}
```

**Gate:** "Endpoint verifies → 200s fast (well under ~30s) → processes async → dedupes with `subscription_id` or a hash of the raw body (not resource id, `created_at`, or a re-stringified object)?"

---

## Step 6 — Handle App Lifecycle Events

Subscribe to all of these — they keep your app in sync with merchant state:

| Event                      | When                     | What to do                                                    |
| -------------------------- | ------------------------ | ------------------------------------------------------------- |
| `app.installed`            | First install            | Provision resources, set defaults                             |
| `app.store.authorize`      | Install OR token refresh | Save/update tokens in DB per merchant                         |
| `app.updated`              | Merchant updates app     | Salla fires `app.store.authorize` right after — wait for that |
| `app.trial.started`        | Trial begins             | Enable trial features                                         |
| `app.subscription.started` | Paid plan activated      | Mark active, unlock paid features                             |
| `app.trial.expired`        | Trial ended, no upgrade  | Restrict access                                               |
| `app.subscription.expired` | Paid plan lapsed         | Restrict access, notify merchant                              |
| `app.uninstalled`          | Merchant removes app     | Clean up merchant data per retention policy                   |

`app.store.authorize` payload (illustrative shape — confirm exact fields via the MCP/docs):

```json
{
  "event": "app.store.authorize",
  "merchant": 123456789,
  "data": {
    "access_token": "...",
    "refresh_token": "...",
    "expires": 1234567890,
    "scope": "orders.read_write products.read_write"
  }
}
```

Full lifecycle handling → **salla-app-lifecycle**; token storage → **salla-app-auth**.

---

## Red Flags

Shortcuts that look harmless on a webhook server and cause silent data loss or security
holes in production. If one of these is your plan, re-read the named step.

| Tempting thought                                                | Why it's wrong                                                                                                                                                                                                                      |
| --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "I'll just leave `webhook_security_strategy` unset on connect." | Unset is treated as **`none`** — Salla then sends **no `Authorization` and no signature**, so your guard verifies nothing and admits every request. Always set it explicitly (Step 2). This footgun caused a ~1h production outage. |
| "I'll HMAC the body to verify a `token` webhook."               | `token` is **plain equality** — `Authorization` header **===** the secret, not a hash. HMAC'ing it rejects every valid delivery. Match the verification to the strategy you set (Step 3).                                           |
| "I'll verify the signature after I parse the JSON."             | HMAC must run on the **raw bytes** Salla sent. `express.json()` first and the body is already mutated — verification breaks. Capture raw first (Step 3).                                                                            |
| "`===` is fine for comparing the signature."                    | A naive string compare is timing-attackable. Use a timing-safe comparison for both the signature HMAC and the token equality check (Step 3).                                                                                        |
| "An App Function trigger exists, but a webhook is what I know." | App Functions run in Salla's sandbox with built-in auth, settings, and synchronous control — prefer them when a trigger exists (top of skill).                                                                                      |
| "I'll do the DB write / email, then return 200."                | Salla waits ~30s then marks the delivery failed and **retries 3×**. Ack first, process async (Step 5).                                                                                                                              |
| "Each event is delivered once, so I can skip idempotency."      | Webhooks can arrive more than once. Dedupe on `subscription_id` or a raw-body hash — not the resource id or `created_at` (Step 5).                                                                                                  |
| "I'll read the store id from `payload.data.merchant`."          | `merchant` is **top-level** in the envelope. `data.merchant.id` is `undefined`, so you persist the wrong/empty store (Step 5).                                                                                                      |
| "Verification returns 401 — must be a code bug."                | First suspect is secret parity: deployed `SALLA_WEBHOOK_SECRET` ≠ Portal secret after a Portal secret rotation (or reconnect) rejects every delivery (Step 8).                                                                      |

---

## Step 7 — Event Reference

The events catalogue and the exact payload schema for each event are **maintained by
Salla** — treat the docs as the source of truth, not a list baked into this skill (event
names and shapes change). Resolve names two ways:

- **Live, programmatic:** `salla_events action=list` (`app_id`) returns the events your app
  can subscribe to right now.
- **Docs:** store-events and their per-event payload schemas are split by domain — use the
  page for the domain you need (transport + overview: https://docs.salla.dev/421119m0.md):

  | Domain    | Doc                                | Domain        | Doc                                 |
  | --------- | ---------------------------------- | ------------- | ----------------------------------- |
  | Order     | https://docs.salla.dev/433804m0.md | Store         | https://docs.salla.dev/433811m0.md  |
  | Product   | https://docs.salla.dev/433805m0.md | Cart          | https://docs.salla.dev/433812m0.md  |
  | Shipping  | https://docs.salla.dev/433806m0.md | Invoice       | https://docs.salla.dev/433813m0.md  |
  | Shipments | https://docs.salla.dev/433807m0.md | Special Offer | https://docs.salla.dev/433814m0.md  |
  | Customer  | https://docs.salla.dev/433808m0.md | Miscellaneous | https://docs.salla.dev/433815m0.md  |
  | Category  | https://docs.salla.dev/433809m0.md | Communication | https://docs.salla.dev/1380572m0.md |
  | Brand     | https://docs.salla.dev/433810m0.md |               |                                     |

Always confirm the exact name (case-sensitive) and `data` shape from one of those before
writing a handler. Where an event's payload (or a register/update body) is documented (the
OpenAPI block in its `docs.salla.dev/<id>.md` page — find it via **salla-docs**), validate
your handler's parse and any registration body against that schema and fix before relying on
it, via the read-schema → build → validate → fix → retry loop in **salla-api-core**.

---

## Step 8 — Troubleshoot

When webhooks aren't arriving:

- [ ] **Every delivery returns 401 → check secret parity FIRST.** Deployed
      `SALLA_WEBHOOK_SECRET` must equal the Portal secret; a Portal rotation (or reconnect) mints
      a new one. This single mismatch rejects every webhook.
- [ ] Webhook URL set and `webhooks.read_write` scope enabled
- [ ] App installed on demo store (reinstall if needed — uninstall first from "Installed Apps")
- [ ] Subscribed to the correct event name (case-sensitive)
- [ ] Endpoint returns `200`/`201` well under Salla's ~30s wait and accepts POST (not just GET)
- [ ] No TLS/SSL issues on your server
- [ ] Check the Salla Webhooks Log in the Portal for delivery attempts and response codes

**Test with webhook.site:** copy a unique URL → set it as the webhook URL → trigger an
event from your demo store → check webhook.site. Payload appears → your server is the
problem; nothing appears → subscription or scope is the problem. Add custom headers on the
same page to test header delivery.

**Webhook Activity Log:** Partners Portal → Your App → Webhooks Log shows every delivery
attempt, HTTP code, and full payload — check here before debugging your server.

---

## Key Resources

| Resource                                            | URL                                            |
| --------------------------------------------------- | ---------------------------------------------- |
| Webhooks docs                                       | https://docs.salla.dev/421119m0.md             |
| Conditional webhooks                                | https://docs.salla.dev/421120m0.md             |
| Register webhook (`POST /webhooks/subscribe`)       | https://docs.salla.dev/5394134e0.md            |
| Update webhook (`PUT /webhooks/{id}`)               | https://docs.salla.dev/10312606e0.md           |
| List active webhooks (`GET /webhooks`)              | https://docs.salla.dev/5394135e0.md            |
| List events (`GET /webhooks/events`)                | https://docs.salla.dev/5394136e0.md            |
| Deactivate (`DELETE /webhooks/unsubscribe`)         | https://docs.salla.dev/5394137e0.md            |
| Node.js/Express repo                                | https://github.com/SallaApp/webhook-actions-js |
| Operations (retries, custom headers, CLI local dev) | references/operations.md                       |
| Partner Portal                                      | https://salla.partners                         |
| Telegram community                                  | https://t.me/salladev                          |
