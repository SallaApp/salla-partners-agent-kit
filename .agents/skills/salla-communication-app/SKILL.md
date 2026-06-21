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

A Communication App is an **App Function that takes over message delivery** for SMS, Email,
or WhatsApp. When a store event fires (order status change, OTP request, abandoned cart, …),
Salla calls your function with the composed message instead of sending it itself. Your
function reads provider credentials from `context.settings`, calls the provider
(Twilio / SendGrid / 360dialog / Unifonic / any), and returns the result via the `Resp`
utility. **Salla never touches the delivery layer** — you own routing and delivery; Salla
owns the trigger. ([Overview](https://docs.salla.dev/2006115m0.md))

Prerequisite: a working grasp of App Functions
([salla-app-functions](../salla-app-functions/SKILL.md)) — the runtime, `Resp`, and the
sandbox limits are not duplicated here. ([Get Started](https://docs.salla.dev/2006118m0.md))

## Step 1 — Create the app

Follow [salla-app-builder](../salla-app-builder/SKILL.md) with `type: "communication"`.
Selecting the Communication App category is what unlocks the **Supported Features** section
(Step 2) — without it the channel options never appear.
([Channels Config](https://docs.salla.dev/2081234m0.md)) Deltas from a General App:

- **No `sub_category_id`** — communication apps don't use one (only `app` and `shipping` types do).
- **0 default webhooks** — nothing is subscribed for you (shipping apps get default shipment events; you get none).
- `is_embedded` defaults to `true`.

## Step 2 — Declare supported channels (publish-blocker)

Supported Features declare which channels your app handles. Once a merchant installs your
app and sets it as the active handler for a channel, Salla stops using its default delivery
layer and routes every matching message to your App Function — **your app takes full
ownership of that message type**. Before publishing you MUST declare at least one channel:
([Channels Config](https://docs.salla.dev/2081234m0.md))

- MCP: `salla_settings action=set_features` with any of `sms_local`,
  `sms_international`, `email_all`, `whatsapp`.
- Read currently-set features: `salla_settings action=list_features`. (Returns only the features already configured, **not** the full types schema. Valid channel values — `sms_local`, `sms_international`, `email_all`, `whatsapp` — come from the tool schema, not the API response. The tool wraps the supported-features endpoints — never call them directly.)

| Feature           | `set_features` value | Event                         | What you handle              |
| ----------------- | -------------------- | ----------------------------- | ---------------------------- |
| Local SMS         | `sms_local`          | `communication.sms.send`      | SMS to KSA numbers (`+966…`) |
| International SMS | `sms_international`  | `communication.sms.send`      | SMS outside KSA              |
| Email             | `email_all`          | `communication.email.send`    | All email                    |
| WhatsApp          | `whatsapp`           | `communication.whatsapp.send` | All WhatsApp                 |

Publishing without features fails with **403 `communication_app_not_have_features`**
(slug and channel values are surfaced by the `salla_settings` tool schema — verify
current values via the Partners MCP or the Portal if they ever change).

## Step 3 — Set up the provider

Pick a delivery provider and obtain its credentials before writing code. The doc walks
**Twilio** as the worked case ([Provider/Twilio](https://docs.salla.dev/2081235m0.md)):
create an account, claim a phone number, and save the **Account SID**, **Auth Token**, and
**sender number** (for WhatsApp, join the Twilio sandbox from your own verified number — in
testing, messages only reach verified sandbox numbers). The same shape applies to any
provider (SendGrid API key, Meta Graph token + phone-number id, etc.) — only the field
names differ.

You enter these as **App Settings** so each merchant supplies their own; never hardcode
them. The settings FORM definition (field schema, `public:false` for secrets) lives in
[salla-app-settings](../salla-app-settings/SKILL.md); at runtime they arrive as
`context.settings`.

## Step 4 — Build the App Function

The three events are **App Function triggers** — per the hookable rule, implement them as
App Functions ([salla-app-functions](../salla-app-functions/SKILL.md)) rather than webhooks:
no server, and the merchant's provider credentials arrive in `context.settings`.

In the Portal function builder, click **Select Action** and pick the channel event you
want to handle. One function per channel, or a single master function that branches on
`context.payload.event`. The handler reads the payload + settings, calls the provider, and
returns `Resp.success()` / `Resp.error()`:

```typescript
export default async (context: CommunicationEvent): Promise<Resp> => {
  const { payload, settings } = context;
  const { notifiable, content } = payload.data;

  if (!settings.sms_api_key) {
    return Resp.error()
      .setMessage("Missing provider credentials.")
      .setStatus(422);
  }
  try {
    const res = await fetch(`${settings.sms_base_url}/send`, {
      method: "POST",
      signal: AbortSignal.timeout(10_000),
      headers: {
        Authorization: `Bearer ${settings.sms_api_key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ to: notifiable[0], text: content }),
    });
    return res.ok ? Resp.success() : Resp.error().setStatus(res.status);
  } catch (err: any) {
    return Resp.error().setMessage("Delivery failed.").setStatus(500);
  }
};
```

Every event delivers the same payload in `context.payload.data`
(`notifiable`, `type`, `content`, `entity`, `meta`) plus credentials in `context.settings`.
Local SMS and International SMS share the single `communication.sms.send` event — route by
the `notifiable[0]` number prefix if you need provider-specific handling. Full event list,
typed shape, real examples, and handling patterns:
[references/communication-events.md](references/communication-events.md).

Only fall back to webhook subscriptions for these events if delivery must run on your
own infrastructure ([salla-webhooks](../salla-webhooks/SKILL.md)).

**Secret & PII hygiene** (this app sends real customer messages):

- Never log message `content`, recipients (`notifiable`), or provider credentials
  (`api_key`, tokens, sender IDs). Redact them from any error report or trace.
- Treat provider endpoints and API keys as untrusted input read from settings —
  validate the endpoint (allowed host/scheme) before calling it.
- Handle provider auth failures safely: surface a generic error, don't echo the
  provider's raw response or your credentials back to Salla or the merchant.
- If you handle the merchant's own OAuth token (e.g. to call the Admin API), token
  storage/refresh rules live in [salla-app-auth](../salla-app-auth/SKILL.md).

## Step 5 — Test

Two stages ([Test & Go Live](https://docs.salla.dev/2081250m0.md)):

1. **Preview panel** — in the function editor, **Select Store** (demo store), enter a
   preview parameter (usually a customer id whose phone is your verified test number),
   then **Save and Preview**. The panel shows execution status, returned data, run time,
   `console.log()` output, and error traces. If `context.settings` is empty, you haven't
   filled the App Settings form on the demo store. Preview via
   [salla-app-functions-test](../salla-app-functions-test/SKILL.md).
2. **End-to-end from the dashboard** — install on the demo store, set your app as the
   active handler under **Apps → Settings → Customize**, then trigger a real message
   (e.g. change an order status to fire `communication.*.send`) and confirm it arrives via
   your provider. Full demo-store run: [salla-live-testing](../salla-live-testing/SKILL.md).

## Step 6 — Go live

Standard publish flow via [salla-app-builder](../salla-app-builder/SKILL.md). Gate: Step 2
features are set and send handlers pass both test stages above. Edits stay in a sandbox
until you publish; merchants who already installed the app receive the updated function
automatically once published — no reinstall.
([Test & Go Live](https://docs.salla.dev/2081250m0.md))

## Resources

| Topic                         | Link                                |
| ----------------------------- | ----------------------------------- |
| Overview                      | https://docs.salla.dev/2006115m0.md |
| Get Started                   | https://docs.salla.dev/2006118m0.md |
| App Channels Configuration    | https://docs.salla.dev/2081234m0.md |
| Set Up Your Provider (Twilio) | https://docs.salla.dev/2081235m0.md |
| Build Your App Function       | https://docs.salla.dev/2081248m0.md |
| Test & Go Live                | https://docs.salla.dev/2081250m0.md |
| Event & Payload Reference     | https://docs.salla.dev/2006119m0.md |
| Examples                      | https://docs.salla.dev/2006120m0.md |
