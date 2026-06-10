---
name: salla-app-builder
description: >
  Use this skill whenever building, debugging, or reviewing any Salla app — including
  General Apps, Shipping Apps, Communication Apps, webhooks, App Functions, Embedded Pages,
  App Settings, or Salla API calls. Invoke it even for partial tasks like "add a setting",
  "write a webhook handler", or "fix the app function" — the Salla platform has many
  non-obvious constraints that this skill prevents you from getting wrong.
license: Copyright (c) 2026 Salla
metadata:
  authors: Hazem Khaled
  version: 1.0
---

# Salla App Builder

## App Types

Salla classifies apps by their primary purpose:

| Type              | Purpose                                                         |
| ----------------- | --------------------------------------------------------------- |
| General App       | General-purpose integrations and automations                    |
| Shipping App      | Custom shipping providers / logistics                           |
| Communication App | Sends messages on behalf of merchants (WhatsApp, SMS, email, …) |

## App Capabilities

Any app type can use any combination of these capabilities:

| Capability    | Purpose                                                                         |
| ------------- | ------------------------------------------------------------------------------- |
| Webhooks      | Receive real-time Salla events (orders, customers, lifecycle, …)                |
| Embedded Page | Custom UI rendered inside the Salla merchant dashboard (iframe)                 |
| App Snippets  | HTML/JS injected into the merchant's storefront pages                           |
| App Settings  | Per-merchant config stored by Salla, accessible in App Functions and the Portal |
| App Functions | Serverless TypeScript handlers triggered by Salla events                        |

## Perform actions with the Salla Partners MCP

When the **Salla Partners MCP** server is connected, do the work with these tools instead
of hand-writing Portal clicks or HTTP calls. Each is one tool driven by an `action`:

| Capability | Tool · actions |
| --- | --- |
| Create / configure / publish apps | `salla_apps` · `list` `get` `create` `update` `connect` (OAuth+webhooks) `set_status` `publish` |
| Events / webhooks | `salla_events` · `list` `subscribe` |
| Storefront snippets | `salla_snippets` · `list` `parameters` `create` `update` `delete` |
| Embedded pages | `salla_embedded_pages` · `list` `create` `update` `delete` |
| Onboarding steps | `salla_onboarding_steps` · `list` `create` `update` `delete` `sort` |
| App settings & features | `salla_settings` · `define_form` `set_validation_url` `list_features` `set_features` |
| Shipping zones & settings | `salla_shipping` · `get_zones` `set_zones` `set_settings` |
| App Functions | `salla_functions` · `list` `get` `delete` |
| File upload (logos) | `salla_upload` |
| Lookups (categories/scopes/countries/cities) | `salla_reference` |

> **App Functions deploy is internal** — Salla deploys functions when the app is
> published. `salla_functions` only lists/gets/deletes; there is no deploy tool. Write
> the source per the App Functions reference below, then publish.

The task-specific skills (`salla-general-app`, `salla-app-settings`, `salla-embedded-app`,
`salla-shipping-app`, `salla-storefront-snippets`) drive these tools step by step.

## When to read each reference file

Read only what you need — each reference is self-contained:

- [Implementing OAuth](references/oauth.md) (Easy Mode token delivery via webhook,
  no callback URL needed, handling token refresh).

- [Webhooks](references/webhooks.md) — Verifying webhook signatures (HMAC-SHA256, timing-safe)
  and handling lifecycle events (authorize → trial → subscription → uninstalled).

- [Salla API](references/salla-api.md) — Calling the Salla Admin API: identifying merchants via the
  introspect endpoint, reading and writing App Settings (critical: always send ALL keys).

- [App Functions](references/app-functions.md) — Writing App Functions in TypeScript: execution types
  (sync vs async), context object shape, typed context interfaces, the locked Portal
  template, pre-declared runtime globals (`Resp`, typed contexts), the Resp API, settings
  access, and the local mock pattern for IDE support.

- [Communication App](references/communication-app.md) — Communication App event types
  (`communication.sms.send`, `communication.whatsapp.send`, `communication.email.send`),
  the `CommunicationEvent` payload structure, and delivery patterns.

- [Embedded App](references/embedded-app.md) — Embedding a custom page inside the Salla dashboard:
  `@salla.sa/embedded-sdk` setup, reading token/lang/theme from query params, RTL support
  for Arabic.

## Resources

| Topic                              | Link                                                   |
| ---------------------------------- | ------------------------------------------------------ |
| Partners Portal                    | https://portal.salla.partners                          |
| OAuth2.0 (Easy Mode & Custom Mode) | https://docs.salla.dev/doc-421118                      |
| Webhooks guide + event list        | https://docs.salla.dev/421119m0                        |
| App Events (lifecycle)             | https://docs.salla.dev/doc-421413                      |
| Merchant API reference             | https://docs.salla.dev/doc-421117                      |
| App Functions overview             | https://docs.salla.dev/1726817m0                       |
| App Functions supported events     | https://docs.salla.dev/1726818m0                       |
| Communication App payload          | https://docs.salla.dev/2006119m0                       |
| App Settings (blog guide)          | https://salla.dev/blog/how-to-build-app-settings-form/ |
| Developer blog                     | https://salla.dev/blog/                                |
| Developer community (Telegram)     | https://t.me/salladev                                  |
