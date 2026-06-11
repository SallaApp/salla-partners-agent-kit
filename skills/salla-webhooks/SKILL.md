---
name: salla-webhooks
description: >
  Register, secure, and handle Salla webhooks delivered to YOUR server: webhook URL +
  event subscriptions (salla_apps connect / salla_events tools), Signature (HMAC-SHA256
  over the raw body) or Token verification, conditional rules, the payload envelope,
  idempotent fast-200 handlers, and delivery debugging. Use only when no App Function
  trigger covers the event — App Functions are preferred (salla-app-functions).
  Lifecycle events → salla-app-lifecycle; shopper-browser behavior → salla-snippets.

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

## Tools & MCPs

**Two MCPs:** `apidog-mcp-server` (site-id `451700`) is _read-only_ — always query it for
live event payload schemas; never assume a shape. The **Salla Partners MCP** _performs
actions_:

| Tool           | Action               | What it does                                                           |
| -------------- | -------------------- | ---------------------------------------------------------------------- |
| `salla_apps`   | `connect`            | Set the app's `webhook_url`, security strategy, secret, custom headers |
| `salla_events` | `list` / `subscribe` | Subscribe the app to store/lifecycle events                            |

> All new webhooks default to **version 2** and **Signature** security strategy.
> Register endpoint (store-level, merchant token): `POST /admin/v2/webhooks/subscribe`.
> Docs: https://docs.salla.dev/421119m0 · Conditional: https://docs.salla.dev/421120m0 ·
> Node/Express repo: https://github.com/SallaApp/webhook-actions-js

---

## Step 0 — Discover

1. **Which events** do you need? (lifecycle, orders, products, shipments…) — confirm exact
   names/payloads via the apidog MCP.
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

> The webhook **URL** and the **event subscriptions** are two separate Partner-API
> endpoints — `POST /app/{id}/webhooks/url` (URL + strategy + secret) and
> `POST /app/{id}/webhooks` (subscriptions only) — wrapped for you by
> `salla_apps action=connect` and `salla_events` respectively. Setting one never sets
> the other.

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
<64-char HMAC-SHA256 hex>`, computed as `HMAC-SHA256(rawRequestBody, secret)`. The three
Salla-specific rules: read those exact **header names**, hash the **raw body** (capture it
before any JSON body-parser touches it), and compare **timing-safely — never `===`**.

```typescript
import { createHmac, timingSafeEqual } from "crypto";
const expected = createHmac("sha256", secret).update(rawBody).digest(); // raw body, pre-parse
const valid =
  signatureHex.length === 64 &&
  timingSafeEqual(expected, Buffer.from(signatureHex, "hex"));
```

(On Web Crypto runtimes — Deno, Cloudflare Workers — use `crypto.subtle.verify("HMAC", …)`,
which is timing-safe by design.)

### Strategy B: Token

Salla sends `Authorization: Bearer <your-static-token>`; set the value in the Portal or
the registration request. Compare the token with the same timing-safe, length-checked
pattern as above — never `===`.

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

Full attribute reference: https://docs.salla.dev/421120m0

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

| Rule                         | Detail                                                                                                                                                                                               |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Respond 200 immediately**  | Return `200 OK` within **3 seconds** — Salla won't wait longer                                                                                                                                       |
| **Never block on slow work** | Queue DB writes, emails, external calls — respond first, process after                                                                                                                               |
| **Retry behavior**           | Salla retries failed deliveries (non-2xx or timeout); the exact count/interval is not publicly documented — treat every event as redeliverable and check the Portal Webhooks Log for actual attempts |
| **Idempotency required**     | Webhooks can be delivered more than once — always deduplicate                                                                                                                                        |

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

All 13 app lifecycle events (`app.installed`, `app.store.authorize`, `app.updated`,
`app.uninstalled`, `app.settings.updated`, `app.trial.*`, `app.subscription.*`,
`app.feedback.created`) are owned by **salla-app-lifecycle** — subscribe here, handle there.
`app.store.authorize` is how Easy Mode delivers the merchant's tokens — handling →
**salla-app-auth**.

---

## Step 7 — Event Reference

Never hardcode an event list — discover the current events with
`salla_events action=list` and pull each event's exact payload schema from the apidog
MCP before writing handlers.

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
| Webhooks docs        | https://docs.salla.dev/421119m0                                                  |
| Conditional webhooks | https://docs.salla.dev/421120m0                                                  |
| Node.js/Express repo | https://github.com/SallaApp/webhook-actions-js                                   |
| Laravel/CLI guide    | https://salla.dev/blog/salla-cli-webhook-server-laravel/                         |
| Custom headers guide | https://salla.dev/blog/custom-webhook-header-is-now-available/                   |
| Best practices       | https://salla.dev/blog/best-practices-to-handle-webhooks-for-salla-applications/ |
| Partner Portal       | https://salla.partners                                                           |
| Telegram community   | https://t.me/salladev                                                            |
