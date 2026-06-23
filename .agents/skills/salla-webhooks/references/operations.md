# Webhook Operations — Reliability, Custom Headers, Local Dev

> Transport rules (signature, idempotency, fast 200) are owned by the parent `SKILL.md`.
> The retry policy and 200/201 rule below are from the webhooks docs
> (https://docs.salla.dev/421119m0.md). The CLI / local-dev defaults are best confirmed
> against the live Portal or the Partners MCP (`salla_events action=list`) before relying
> on them.

## Timeout, retry / resend mechanism

Salla waits **~30 seconds** for the connection to open and the HTTP response to come back;
past that the delivery is treated as failed (source: https://docs.salla.dev/421119m0.md).

When it doesn't get a success response, Salla resends the event **3 times**, with an interval
of **~5 minutes** between attempts. A prompt success response stops further retries. (An
earlier observation recorded the intervals as 30s / 15s / 10s — see `SKILL.md` Step 5; the
doc value is primary, so ack fast and dedupe rather than depend on exact timing.)

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

> **Acknowledge only authenticated deliveries.** Verify the signature/token _before_ the
> 2xx ack; return **401** on a failed verification, and only acknowledge (then queue)
> requests you've authenticated.

## Custom webhook headers — Portal UI mechanics

The transport rules for custom headers (what they're for, validation, never trust them for
auth) live in `SKILL.md` Step 3. This is just where to set them by hand:

- Partner Portal → **My Apps** → your App → **Webhooks/Notifications** → **Custom Headers**
  → **Add Custom Header** (or via `salla_apps action=connect` `webhook_headers`, or the
  register/update API `headers: [{ key, value }]`).
- Edit/delete from the row's ⋯ menu.

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
  > The client secret and `SALLA_WEBHOOK_SECRET` are credentials — keep `.env` git-ignored
  > and the webhook secret out of logs and error output.
- Portal setup to receive events: App Keys → OAuth mode; App Scope → enable **Webhooks
  Read/Write**; Notifications/Webhooks → security strategy (set it **explicitly** —
  `signature` | `token` | `none`; leaving it unset means `none` = no verification). The CLI
  starter scaffolds for the **Token** strategy (plain equality, via
  `@salla.sa/webhooks-actions`); match whichever strategy your handler verifies. Set the
  webhook URL (append your framework's route prefix, e.g. `/api/webhook`); subscribe the
  **Store Events** you need; then install on a demo store
  (see `salla-app-builder/references/demo-store-testing.md`).
- Update the CLI: `npm update @salla.sa/cli -g`.
