---
name: salla-webhooks
description: >
  Use this skill for any task involving Salla webhooks. Trigger when a developer is:
  registering or updating a webhook, choosing a security strategy (Signature vs Token),
  adding custom headers to a webhook, subscribing to store events, writing conditional
  webhook rules, verifying webhook signatures, handling the standard payload envelope,
  setting up a webhook server with Node.js/Express or Laravel/PHP, using the
  @salla.sa/webhooks-actions npm package, using the Salla CLI to scaffold webhook
  handlers, debugging webhook delivery failures, implementing idempotency, handling
  app lifecycle events (app.store.authorize, app.installed, app.uninstalled, etc.),
  or managing webhook versions (v1 vs v2).

  Trigger also when you see: "webhook", "SallaWebhook", "webhook-actions-js",
  "event subscription", "signature verification", "X-Salla-Signature",
  "app.store.authorize", "order.created", "shipment.creating", "conditional webhook",
  "webhook rule", "salla app create-webhook", or any Salla store event name.

  Always use this skill before writing any webhook code.
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

> All new webhooks default to **version 2** and **Signature** security strategy.
> Register endpoint (store-level, merchant token): `POST /admin/v2/webhooks/subscribe`.
> Docs: https://docs.salla.dev/421119m0.md · Conditional: https://docs.salla.dev/421120m0.md ·
> Node/Express repo: https://github.com/SallaApp/webhook-actions-js

---

## Step 0 — Discover

1. **Which events** do you need? (lifecycle, orders, products, shipments…) — confirm exact
   names/payloads in the webhooks reference (https://docs.salla.dev/421119m0.md).
2. **App-level or store-level?** App/lifecycle events → subscribe via the Partners MCP
   (`salla_events`); store-level merchant webhooks → the Admin API `webhooks/subscribe`.
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
2. List + subscribe: `salla_events action=list`, `app_id` → `salla_events
action=subscribe`, `app_id`, `events: [...]`.

### Store-level webhooks (Admin API, merchant token)

```json
{
  "name": "Order Created Handler",
  "event": "order.created",
  "url": "https://your-app.com/webhooks",
  "version": 2,
  "rule": "total > 100",
  "headers": [{ "key": "X-My-Token", "value": "your-secret-value" }]
}
```

| Field     | Type   | Notes                                    |
| --------- | ------ | ---------------------------------------- |
| `name`    | string | Human-readable label                     |
| `event`   | string | From the events list — verify via MCP    |
| `url`     | string | Must accept POST requests                |
| `version` | number | Always `2` unless legacy requirement     |
| `rule`    | string | Optional conditional filter — see Step 4 |
| `headers` | array  | Custom headers sent with every delivery  |
| `secret`  | string | Required for Signature strategy          |

| Action          | Method + Path                       |
| --------------- | ----------------------------------- |
| Register        | `POST /admin/v2/webhooks/subscribe` |
| Update          | `PUT /admin/v2/webhooks/{id}`       |
| List active     | `GET /admin/v2/webhooks`            |
| List all events | `GET /admin/v2/webhooks/events`     |
| Deactivate      | `DELETE /admin/v2/webhooks/{id}`    |

Re-subscribing with the same URL **updates** the existing webhook (no duplicate). Default
version `2`, default strategy `Signature`; pass `"version": 1` only for legacy.

**Gate:** "Subscribed to the right events (`salla_events action=list` / `GET /webhooks`
confirms), webhook URL registered?"

---

## Step 3 — Secure Every Delivery

### Strategy A: Signature (default ✅)

Salla sends `X-Salla-Security-Strategy: Signature` and `X-Salla-Signature:
<64-char HMAC-SHA256 hex>`, computed as `HMAC-SHA256(rawRequestBody, secret)`. **Always
use timing-safe comparison — never `===` on signatures.**

```typescript
// TypeScript — Web Crypto API (Node 16+, Deno, Cloudflare Workers)
async function verifySignature(req: Request, secret: string): Promise<boolean> {
  const signature = req.headers.get("X-Salla-Signature") ?? "";
  const body = await req.text();

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
    hexToBytes(signature),
    new TextEncoder().encode(body),
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
`webhook_headers`.

**Gate:** "Every request is verified (timing-safe) and unverified ones get 401?"

---

## Step 4 — (Optional) Conditional Webhook Rules

Rules filter payloads so your endpoint only receives matching events — less noise, less load.

```text
field = value           // equality          field != value   // inequality
field > value           // greater than       field < value    // less than
condition1 AND condition2                      condition1 OR condition2
```

Examples: `"total > 100"` · `"payment_method = mada OR price < 50"` ·
`"status = \`active\` OR applied_to = \`first_order\`"`·`"sku = PROD-001"`·`"customer_group_id = 12345"`.

| Category      | Key Filterable Attributes                                   |
| ------------- | ----------------------------------------------------------- |
| Order         | `total`, `price`, `payment_method`, `status`, `coupon_code` |
| Product       | `id`, `name`, `sku`, `status`, `quantity`                   |
| Customer      | `id`, `email`, `customer_group_id`                          |
| Special Offer | `status`, `applied_to`                                      |
| Category      | `id`, `name`, `parent_id`, `status`, `sort_order`           |
| Brand         | `id`, `name`, `status`                                      |
| Cart          | `coupon_code`, `total`                                      |
| Miscellaneous | `id`, `rating`                                              |

Full attribute reference: https://docs.salla.dev/421120m0.md

---

## Step 5 — Respond Fast & Stay Idempotent

Every webhook wraps its data in the standard envelope:

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

`merchant` is your key to look up the right access/refresh tokens.

Response & retry rules — **non-negotiable:**

| Rule                         | Detail                                                                 |
| ---------------------------- | ---------------------------------------------------------------------- |
| **Respond 200 immediately**  | Return `200 OK` within **3 seconds** — Salla won't wait longer         |
| **Never block on slow work** | Queue DB writes, emails, external calls — respond first, process after |
| **Retry behavior**           | Salla retries **3 times** at ~5 minute intervals on non-2xx or timeout |
| **Idempotency required**     | Webhooks can be delivered more than once — always deduplicate          |

```typescript
// Fast response + async processing (Express)
app.post("/webhooks/salla", async (req, res) => {
  const valid = await verifySignature(req, process.env.SALLA_WEBHOOK_SECRET!);
  if (!valid) return res.status(401).end();
  res.status(200).end(); // respond immediately
  processWebhookAsync(req.body).catch(console.error);
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

**Gate:** "Endpoint verifies → 200s within 3s → processes async → dedupes with `subscription_id` or body hash (not resource id or `created_at`)?"

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

`app.store.authorize` payload:

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

Full lifecycle handling → **salla-app-lifecycle**; token storage → **salla-app-authorization**.

---

## Step 7 — Event Reference

Pull exact payload schemas from the webhooks reference
(https://docs.salla.dev/421119m0.md) before writing handlers.

**Order:** `order.created` · `order.updated` · `order.status.updated` · `order.cancelled` ·
`order.refunded` · `order.deleted` · `order.products.updated` · `order.payment.updated` ·
`order.coupon.updated` · `order.total.price.updated` · `order.shipment.creating` ·
`order.shipment.created` · `order.shipment.cancelled` · `order.shipment.return.creating` ·
`order.shipment.return.created` · `order.shipment.return.cancelled` ·
`order.shipping.address.updated`

**Product:** `product.created` · `product.deleted` · `product.quantity.low` ·
`product.price.updated` · `product.status.updated` · `product.image.updated` ·
`product.category.updated` · `product.brand.updated` · `product.tags.updated`

> ~~`product.updated`~~ · ~~`product.available`~~ — deprecated, do not use

**Shipments:** `shipment.creating` · `shipment.created` · `shipment.cancelled` · `shipment.updated`

**Customer:** `customer.created` · `customer.updated` · `customer.login` · `customer.otp.request`

**Store:** `store.branch.created` · `store.branch.updated` · `store.branch.setDefault` ·
`store.branch.activated` · `store.branch.deleted` · `storetax.created`

**Cart:** `abandoned.cart` · `coupon.applied`

**Other:** `category.created` · `category.updated` · `brand.created` · `brand.updated` ·
`brand.deleted` · `invoice.created` · `specialoffer.created` · `specialoffer.updated` ·
`review.added`

---

## Step 8 — Troubleshoot

When webhooks aren't arriving:

- [ ] Webhook URL set and `webhooks.read_write` scope enabled
- [ ] App installed on demo store (reinstall if needed — uninstall first from "Installed Apps")
- [ ] Subscribed to the correct event name (case-sensitive)
- [ ] Endpoint returns `200` within 3 seconds and accepts POST (not just GET)
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

| Resource             | URL                                                                              |
| -------------------- | -------------------------------------------------------------------------------- |
| Webhooks docs        | https://docs.salla.dev/421119m0.md                                               |
| Conditional webhooks | https://docs.salla.dev/421120m0.md                                               |
| Node.js/Express repo | https://github.com/SallaApp/webhook-actions-js                                   |
| Laravel/CLI guide    | https://salla.dev/blog/salla-cli-webhook-server-laravel/                         |
| Custom headers guide | https://salla.dev/blog/custom-webhook-header-is-now-available/                   |
| Best practices       | https://salla.dev/blog/best-practices-to-handle-webhooks-for-salla-applications/ |
| Partner Portal       | https://salla.partners                                                           |
| Telegram community   | https://t.me/salladev                                                            |
