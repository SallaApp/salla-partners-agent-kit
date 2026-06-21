---
name: salla-communication-app
description: >
  Build a Salla Communication App that delivers SMS, WhatsApp, or email on the
  merchant's behalf. Use for channel apps, OTP/notification delivery, or the
  communication.*.send events. Salla deltas: no sub_category_id, zero default
  webhooks, channels MUST be declared via supported-features before publish (else
  403), and each send event is an App Function trigger — prefer App Functions.
  App creation → salla-app-builder; credentials → salla-app-settings; handler code
  → salla-app-functions; token/OAuth → salla-app-auth.
---

# Salla Communication App

A Communication App is a **delivery adapter**: Salla composes the message and fires an
event per notification; your code hands it to a provider (Twilio, Unifonic, SMTP, …).

## Step 1 — Create the app

Follow [salla-app-builder](../salla-app-builder/SKILL.md) with `type: "communication"`.
Deltas from a General App:

- **No `sub_category_id`** — communication apps don't use one (only `app` and `shipping` types do).
- **0 default webhooks** — nothing is subscribed for you (shipping apps get default shipment events; you get none).
- `is_embedded` defaults to `true`.

## Step 2 — Declare supported channels (publish-blocker)

Before publishing you MUST declare the channels the app serves:

- MCP: `salla_settings action=set_features` with any of `sms_local`,
  `sms_international`, `email_all`, `whatsapp`.
- Read currently-set features: `salla_settings action=list_features`. (Returns only the features already configured, **not** the full types schema. Valid channel values — `sms_local`, `sms_international`, `email_all`, `whatsapp` — come from the tool schema, not the API response. The tool wraps the supported-features endpoints — never call them directly.)

Publishing without features fails with **403 `communication_app_not_have_features`**
(slug and channel values are surfaced by the `salla_settings` tool schema — verify
current values via the Partners MCP or the Portal if they ever change).

## Step 3 — Hook the send events

The three events are **App Function triggers** — per the hookable rule, implement them
as App Functions ([salla-app-functions](../salla-app-functions/SKILL.md)) rather than
webhooks: no server, and the merchant's provider credentials arrive in `context.settings`.

| Event                         | Channel                          |
| ----------------------------- | -------------------------------- |
| `communication.sms.send`      | SMS (both Local & International) |
| `communication.whatsapp.send` | WhatsApp                         |
| `communication.email.send`    | Email                            |

Local SMS and International SMS share the single `communication.sms.send` event — route by
the `notifiable[0]` number prefix if you need provider-specific handling.

Every event delivers the same payload in `context.payload.data`
(`notifiable`, `type`, `content`, `entity`, `meta`) plus credentials in `context.settings`
— the App Function contract. Full shape, example, and handling patterns:
[references/communication-events.md](references/communication-events.md).

Only fall back to webhook subscriptions for these events if delivery must run on your
own infrastructure ([salla-webhooks](../salla-webhooks/SKILL.md)).

## Step 4 — Provider credentials as settings

Define API keys / sender IDs as app settings ([salla-app-settings](../salla-app-settings/SKILL.md));
they're injected into every App Function call as `context.settings`. Never hardcode them.

**Secret & PII hygiene** (this app sends real customer messages):

- Never log message `content`, recipients (`notifiable`), or provider credentials
  (`api_key`, tokens, sender IDs). Redact them from any error report or trace.
- Treat provider endpoints and API keys as untrusted input read from settings —
  validate the endpoint (allowed host/scheme) before calling it.
- Handle provider auth failures safely: surface a generic error, don't echo the
  provider's raw response or your credentials back to Salla or the merchant.
- If you handle the merchant's own OAuth token (e.g. to call the Admin API), token
  storage/refresh rules live in [salla-app-auth](../salla-app-auth/SKILL.md).

## Step 5 — Publish

Standard publish flow via [salla-app-builder](../salla-app-builder/SKILL.md). Gate: Step 2
features are set, send handlers respond to a test event from the demo store. Preview a
saved handler with [salla-app-functions-test](../salla-app-functions-test/SKILL.md); for
the end-to-end demo-store run see [salla-live-testing](../salla-live-testing/SKILL.md).

## Resources

| Topic                              | Link                                |
| ---------------------------------- | ----------------------------------- |
| Communication App events & payload | https://docs.salla.dev/2006115m0.md |
| Payload examples                   | https://docs.salla.dev/1740884m0.md |
| App Functions overview             | https://docs.salla.dev/1726814m0.md |
