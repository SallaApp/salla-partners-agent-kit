# Webhook Server Setup — Node/Express and Laravel/PHP

Load this at **Step 1** of `salla-webhooks`. The SKILL.md keeps the decision and the gate;
the scaffolding code lives here.

The one rule that drives everything: **the signature HMAC must run on the raw request body**
(Step 3). Either let the SDK verify internally (parsed body is then fine) or capture the raw
bytes before any JSON middleware and verify manually — never mix the two on one route.

## Option A: `@salla.sa/webhooks-actions` (Node.js / Express) ✅ Recommended

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

> **Pick ONE verification path.** Either let this SDK verify the delivery **internally**
> (then parsed JSON via `bodyParser.json()` + `req.body` is fine), or verify the
> **Signature manually** (Step 3, Strategy A) and run HMAC on the **raw request body** —
> capturing the unparsed bytes before any JSON middleware. Use one path per route.

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

## Option B: Laravel/PHP via Salla CLI

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
