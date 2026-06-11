---
name: salla-communication-app
description: >
  Build a Salla Communication App — an app that delivers SMS, WhatsApp, or email
  on the merchant's behalf. Use for channel apps, OTP/notification delivery, or
  the three communication.*.send events. The Salla deltas: no sub_category_id at
  creation, ZERO default webhooks, channels MUST be declared via supported-features
  before publish (else 403), and each send event is an App Function trigger —
  prefer App Functions over webhooks. App creation flow → salla-app-builder;
  provider credentials → salla-app-settings.
---

# Salla Communication App

A Communication App is a **delivery adapter**: Salla composes the message and fires an
event per notification; your code hands it to a provider (Twilio, Unifonic, SMTP, …).

## Step 1 — Create the app

Follow [salla-app-builder](../salla-app-builder/SKILL.md) with `type: "communication"`.
Deltas from a General App:

- **No `sub_category_id`** — communication apps don't use one (only `app` and `shipping` types do).
- **0 default webhooks** — nothing is subscribed for you (shipping apps get 4 defaults; you get none).
- `is_embedded` defaults to `true`.

## Step 2 — Declare supported channels (publish-blocker)

Before publishing you MUST declare the channels the app serves:

- MCP: `salla_settings action=set_features` with any of `sms_local`,
  `sms_international`, `email_all`, `whatsapp`.
- Read current features + the full types schema: `salla_settings action=list_features`.
  (The tool wraps the supported-features endpoints — never call them directly.)

Publishing without features fails with **403 `communication_app_not_have_features`**.

## Step 3 — Hook the send events

The three events are **App Function triggers** — per the hookable rule, implement them
as App Functions ([salla-app-functions](../salla-app-functions/SKILL.md)) rather than
webhooks: no server, and the merchant's provider credentials arrive in `context.settings`.

| Event                         | Channel  |
| ----------------------------- | -------- |
| `communication.sms.send`      | SMS      |
| `communication.whatsapp.send` | WhatsApp |
| `communication.email.send`    | Email    |

Payload shape, example, and handling patterns:
[references/communication-events.md](references/communication-events.md).

Only fall back to webhook subscriptions for these events if delivery must run on your
own infrastructure ([salla-webhooks](../salla-webhooks/SKILL.md)).

## Step 4 — Provider credentials as settings

Define API keys / sender IDs as app settings ([salla-app-settings](../salla-app-settings/SKILL.md));
they're injected into every App Function call as `context.settings`. Never hardcode them.

## Step 5 — Publish

Standard publish flow via [salla-app-builder](../salla-app-builder/SKILL.md). Gate: Step 2
features are set, send handlers respond to a test event from the demo store.

## Resources

| Topic                     | Link                             |
| ------------------------- | -------------------------------- |
| Communication App payload | https://docs.salla.dev/2006119m0 |
| Payload examples          | https://docs.salla.dev/2006120m0 |
| App Functions overview    | https://docs.salla.dev/1726817m0 |
