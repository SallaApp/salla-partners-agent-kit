# Webhook Server Setup — Node/Express and Laravel/PHP

Load this at **Step 1** of `salla-webhooks`. The SKILL.md keeps the decision and the gate;
the scaffolding code lives here.

The one rule that drives everything: **the signature HMAC must run on the raw request body**
(Step 3). Either let the SDK verify internally (parsed body is then fine) or capture the raw
bytes before any JSON middleware and verify manually — never mix the two on one route.

## Option A: `@salla.sa/webhooks-actions` (Node.js / Express)

The official server-side package: handles **token** verification (plain equality —
`if (secret !== this._secret) return;`, not HMAC) and event routing for you. CommonJS with
dynamic `require()` file-system dispatch — **Express only; this dispatch does not work on
Next.js (or other) serverless**. On serverless, verify and dispatch by hand (SKILL.md
Step 3); the listener API and token-equality model below are still the right reference.
Before hand-writing anything, `npm search "@salla.sa"` for an official package
(`@salla.sa/webhooks-actions`, `@salla.sa/passport-strategy`, `@salla.sa/event`,
`@salla.sa/embedded-sdk`).

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

> **Pick ONE verification path, matched to your strategy.** `checkActions(body, token, …)`
> verifies the **`token`** strategy internally (plain equality of the `Authorization` value
> against the secret — `setSecret()` sets it), so a parsed body via `bodyParser.json()` +
> `req.body` is fine. For the **`signature`** strategy the package does **not** help: verify
> the HMAC manually (SKILL.md Step 3) on the **raw request body** — capture the unparsed
> bytes before any JSON middleware. Use one path per route.

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
