# Webhook Operations — Reliability, Custom Headers, Local Dev

Distilled from Salla Developers articles (the salla.dev/blog is a JS-rendered SPA that
can't be fetched directly; content captured here). Source slugs:
`best-practices-to-handle-webhooks-for-salla-applications`,
`custom-webhook-header-is-now-available`, `salla-cli-webhook-server-laravel`.

## Retry / resend mechanism

Salla retries a delivery **at most 3 times** when it doesn't receive a success response,
waiting these intervals between attempts:

| Attempt     | Wait before next try |
| ----------- | -------------------- |
| 1st         | 30s                  |
| 2nd         | 15s                  |
| 3rd (final) | 10s                  |

A prompt success response stops further retries. (Salla's best-practices article states
these intervals; older material quoted "~5 minutes" — treat 30/15/10s as current.)

## The 200/201 rule

Salla expects **`200` or `201`** to confirm the event was received and accepted. **Any
other status — including `404` for a missing entity — is flagged as a failed request** and
triggers the retry cycle. Acknowledge first; never surface business-logic errors as a
non-2xx response.

## Five-step handling pattern (decouple receipt from processing)

1. **Receiving** — accept the POST and capture the raw payload immediately.
2. **Saving** — persist the payload to the DB or logs.
3. **Responding** — return `200`/`201` right away.
4. **Scheduling** — enqueue a background job for the saved payload.
5. **Processing** — run all business logic in the queued job, not in the request handler.

This keeps responses fast (avoids retries) and isolates processing failures from the ack.
Pairs with the idempotency guidance in `SKILL.md` (dedupe by `subscription_id` or body
hash).

## Custom webhook headers

Salla sends predefined headers (e.g. `user-agent`); you can also define **custom webhook
headers** to tag events for your app:

- Partner Portal → **My Apps** → your App → **Webhooks/Notifications** → **Custom Headers**
  → **Add Custom Header**.
- Key and value accept **letters, numbers, and dash only**.
- Edit/delete from the row's ⋯ menu.

Use these for routing/identification metadata only — verify authenticity with the
`x-salla-signature` HMAC or the security token, not a custom header.

## Local development with the Salla CLI

`@salla.sa/cli` scaffolds an app and tunnels webhooks to localhost (via **ngrok**):

- `salla login` — authenticate through the Portal.
- `salla app create` — prompts for name, short description, email, homepage URL, **type**
  (public/shipping/private), **auth mode** (easy/custom), framework; clones a starter and
  installs deps.
- `salla app serve` — runs the app locally and exposes it through the tunnel.
- The CLI returns a **Remote URL** (→ your localhost) and a **Remote Webhook URL** (where
  Salla delivers events) and syncs credentials into `.env`:
  `SALLA_OAUTH_CLIENT_ID`, `SALLA_OAUTH_CLIENT_SECRET`, `SALLA_OAUTH_CLIENT_REDIRECT_URI`,
  `SALLA_WEBHOOK_SECRET`, `SALLA_AUTHORIZATION_MODE` (easy|custom), `SALLA_APP_ID`.
- Portal setup to receive events: App Keys → OAuth mode; App Scope → enable **Webhooks
  Read/Write**; Notifications/Webhooks → security strategy **Token** (default); set the
  webhook URL (append your framework's route prefix, e.g. `/api/webhook`); subscribe the
  **Store Events** you need; then install on a demo store
  (see `salla-app-builder/references/demo-store-testing.md`).
- Update the CLI: `npm update @salla.sa/cli -g`.
