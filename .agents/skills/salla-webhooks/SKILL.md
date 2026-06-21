---
name: salla-webhooks
description: >
  Salla webhooks end to end — registering/subscribing, choosing a security strategy
  (Signature vs Token), verifying signatures (`X-Salla-Signature`), the standard
  payload envelope, idempotency, fast 200, conditional rules, and webhook versions
  (v1/v2). Use when building a webhook server (Node/Express `@salla.sa/webhooks-actions`
  or Laravel/PHP / Salla CLI), subscribing store or app events, or debugging delivery.
  Prefer an App Function (salla-app-functions) when a trigger exists. Lifecycle event
  handling → salla-app-lifecycle; token storage → salla-app-auth.
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

| Tool           | Action               | What it does                                                           |
| -------------- | -------------------- | ---------------------------------------------------------------------- |
| `salla_apps`   | `connect`            | Set the app's `webhook_url`, security strategy, secret, custom headers |
| `salla_events` | `list` / `subscribe` | Subscribe the app to store/lifecycle events                            |

> New webhooks default to **version 2**; when no `security_strategy` is sent on a Partner
> app's webhook Salla assigns **Signature** by default (421119). Store-level management base
> URL (merchant token): `https://api.salla.dev/admin/v2`; register is `POST /webhooks/subscribe`.
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

### Option A: `@salla.sa/webhooks-actions` (Node.js / Express) ✅ Recommended

Handles signature verification and event routing for you.

```bash
npm install @salla.sa/webhooks-actions
```

`.env` (created automatically by Salla CLI):

```bash
SALLA_OAUTH_CLIENT_ID=xxxxx
SALLA_OAUTH_CLIENT_SECRET=xxxxx
SALLA_WEBHOOK_SECRET=xxxxx
SALLA_AUTHORIZATION_MODE=easy
SALLA_APP_ID=123456789
```

**Pattern A — Listener functions (inline):**

```js
const express = require("express");
const bodyParser = require("body-parser");
const SallaWebhook = require("@salla.sa/webhooks-actions");
require("dotenv").config();

const app = express();
app.use(bodyParser.json());

SallaWebhook.setSecret(process.env.SALLA_WEBHOOK_SECRET);

SallaWebhook.on("app.store.authorize", (eventBody, userArgs) => {
  // Save access_token + refresh_token to DB
});
SallaWebhook.on("order.created", (eventBody, userArgs) => {
  // Handle new order
});
SallaWebhook.on("all", (eventBody, userArgs) => {
  // Catch-all — good for logging unhandled events
});

app.post("/webhook", (req, res) => {
  SallaWebhook.checkActions(req.body, req.headers.authorization, {});
  res.status(200).end();
});

app.listen(8081);
```

**Pattern B — File-based handlers.** Use `salla app create-webhook <event.name>` to
scaffold handler files:

```text
Actions/
├── app/{installed.js, store.authorize.js}
├── order/{created.js, cancelled.js}
├── customer/{created.js, updated.js}
└── store/branch.created.js
```

```js
// Actions/order/created.js
module.exports = async (eventBody, userArgs) => {
  const order = eventBody.data;
  // process order...
};
```

### Option B: Laravel/PHP via Salla CLI

```bash
salla app create                       # scaffold a Laravel app with webhook server
salla app create-webhook order.created # add a new event handler file
```

Manual PHP verification (if not using the CLI scaffold):

```php
function verifySignature(string $payload, string $signature, string $secret): bool {
    $expected = hash_hmac('sha256', $payload, $secret);
    return hash_equals($expected, $signature); // timing-safe
}

$payload   = file_get_contents('php://input');
$signature = $_SERVER['HTTP_X_SALLA_SIGNATURE'] ?? '';
if (!verifySignature($payload, $signature, getenv('SALLA_WEBHOOK_SECRET'))) {
    http_response_code(401);
    exit;
}
```

**Gate:** "Server up, single POST endpoint receives events, secret loaded from env?"

---

## Step 2 — Register / Subscribe to Events

### App / lifecycle events (Partners MCP) ✅ for partner apps

1. Set the receiver: `salla_apps action=connect`, `app_id`, `webhook_url`,
   `webhook_security_strategy: "signature"`, `generate_secret: true` (optional
   `webhook_headers`).

   > **Secret-sync gate:** `generate_secret` mints a NEW secret. Copy the returned value into
   > your runtime env (`SALLA_WEBHOOK_SECRET`) and confirm **deployed env == Portal secret**
   > before testing — a mismatch fails verification and returns **401 on every delivery**.

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

### Strategy A: Signature (default ✅)

A **Secret must be set** when establishing the webhook — this is what enables verification.
Salla appends the request body's **64-character SHA256 HMAC hash** to the
`x-salla-signature` header (alongside `X-Salla-Security-Strategy: Signature`), computed as
`HMAC-SHA256(rawRequestBody, secret)`. The secret is viewable in the partner dashboard.
**Always use timing-safe comparison — never `===` on signatures. Verify the signature
before processing or persisting any payload, and never log the signing secret**
(`SALLA_WEBHOOK_SECRET`) — keep it in env only. Docs:
https://docs.salla.dev/421119m0.md

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

### Strategy B: Token

Salla sends `Authorization: Bearer <your-static-token>`; set the value in the Portal or
the registration request.

```typescript
import { timingSafeEqual } from "crypto";

function verifyToken(authHeader: string, expectedToken: string): boolean {
  const token = authHeader.replace("Bearer ", "");
  const a = Buffer.from(token.padEnd(expectedToken.length));
  const b = Buffer.from(expectedToken);
  return a.length === b.length && timingSafeEqual(a, b);
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
let the **Partners MCP validate** what's accepted — don't assume a custom character rule.

**Gate:** "Every request is verified (timing-safe) and unverified ones get 401?"

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

> **`merchant` is TOP-LEVEL in the envelope, not inside `data`.** Read ✅ `payload.merchant`
> — never ❌ `payload.data.merchant.id` (that's `undefined`, so you save the wrong/empty
> store). Same trap on `app.store.authorize`.

`merchant` is your key to look up the right access/refresh tokens.

Response & retry rules — **non-negotiable** (421119):

| Rule                         | Detail                                                                                                                                                                  |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Acknowledge fast**         | Salla waits **~30s** for the connection + HTTP response, then treats the delivery as failed — ack well before that                                                      |
| **Never block on slow work** | Queue DB writes, emails, external calls — respond first, process after                                                                                                  |
| **Retry behavior**           | On a non-success response/timeout Salla resends the event **3 times**, **~5 minutes** apart; a success stops further tries ([docs](https://docs.salla.dev/421119m0.md)) |
| **Idempotency required**     | Webhooks can be delivered more than once — always deduplicate                                                                                                           |

> **On the retry interval:** the official doc (421119) is the value above — **3 retries
> ~5 minutes apart**, ~30s timeout. An earlier observation recorded the intervals as
> **30s / 15s / 10s**; treat that as possibly-stale and follow the doc unless you verify
> otherwise on a live store. Either way: ack fast, dedupe, don't depend on exact timing.

```typescript
// Fast response + async processing (Express).
// Mount a RAW body parser on this route — NOT a global express.json(), which would
// consume the body and break HMAC. Parse JSON only AFTER the signature checks out.
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
// Idempotency — subscription_id is unique per lifecycle event; for everything else
// hash the raw body so resource IDs (order id, product id) don't collide across updates
async function handleWebhook(payload: WebhookPayload): Promise<void> {
  const discriminator =
    (payload.data as any)?.subscription_id ??
    crypto
      .createHash("sha256")
      .update(JSON.stringify(payload))
      .digest("hex")
      .slice(0, 16);
  const key = `${payload.merchant}:${payload.event}:${discriminator}`;
  const seen = await db.webhookEvents.exists({ key });
  if (seen) return; // already processed
  await db.webhookEvents.insert({ key, received_at: new Date() }); // insert BEFORE processing
  await processEvent(payload);
}
```

**Gate:** "Endpoint verifies → 200s fast (well under ~30s) → processes async → dedupes with `subscription_id` or body hash (not resource id or `created_at`)?"

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
writing a handler.

---

## Step 8 — Troubleshoot

When webhooks aren't arriving:

- [ ] **Every delivery returns 401 → check secret parity FIRST.** Deployed
      `SALLA_WEBHOOK_SECRET` must equal the Portal secret; a `generate_secret`/reconnect mints
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
