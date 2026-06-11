---
name: salla-app-expert
description: >
  Master router for Salla app development. Use when the task is broad ("build a
  Salla app", "add X to my app") or you're unsure which Salla skill applies — it
  dispatches intent to the right skill and maps each Salla Partners MCP tool to
  its capability. Also the entry point on platforms without agent support. For a
  specific task (OAuth, webhooks, settings, billing, publishing…), go straight
  to the dedicated skill named below.
---

# Salla App Expert — Master Router

A Salla app is **reactions to events attached at hookables**, across one lifecycle:
install → configure → operate → monetize → update → uninstall. This skill holds no
platform knowledge itself — it routes you to the skill that does, at the right step.

## App types

| Type          | Delta                                                                                                                           |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| General       | Needs `sub_category_id` → [salla-app-builder](../salla-app-builder/SKILL.md)                                                    |
| Shipping      | Shipping sub-category, 4 default shipment webhooks, Salla-set Company ID → [salla-shipping-app](../salla-shipping-app/SKILL.md) |
| Communication | No sub-category; must declare channels before publish → [salla-communication-app](../salla-communication-app/SKILL.md)          |

## Choosing the surface (the hookable rule)

Every behavior attaches at exactly one surface. Decide in this order:

1. **Runs in the shopper's browser / storefront?** → snippet → [salla-snippets](../salla-snippets/SKILL.md)
2. **An App Function trigger exists for the event?** → App Function (**preferred** — runs inside Salla, no server) → [salla-app-functions](../salla-app-functions/SKILL.md)
3. **Otherwise** → webhook to your server → [salla-webhooks](../salla-webhooks/SKILL.md)

Check triggers via the `salla_functions` tool or salla-app-functions' event reference
before reaching for a webhook.

## Route by intent

| Intent                                                             | Skill                                                          |
| ------------------------------------------------------------------ | -------------------------------------------------------------- |
| Create / configure / publish an app end to end                     | [salla-app-builder](../salla-app-builder/SKILL.md)             |
| OAuth, tokens, refresh, Easy vs Custom Mode                        | [salla-app-auth](../salla-app-auth/SKILL.md)                   |
| Register, verify, handle webhooks (transport)                      | [salla-webhooks](../salla-webhooks/SKILL.md)                   |
| Install / uninstall / trial / subscription **events**              | [salla-app-lifecycle](../salla-app-lifecycle/SKILL.md)         |
| Serverless handlers on Salla triggers                              | [salla-app-functions](../salla-app-functions/SKILL.md)         |
| Storefront JS / e-commerce events                                  | [salla-snippets](../salla-snippets/SKILL.md)                   |
| Iframe UI inside the merchant dashboard                            | [salla-embedded-app](../salla-embedded-app/SKILL.md)           |
| Per-merchant settings schema & values                              | [salla-app-settings](../salla-app-settings/SKILL.md)           |
| Plans, addons, trials, entitlement gating, usage balance           | [salla-app-billing](../salla-app-billing/SKILL.md)             |
| Selling an addon from inside the embedded UI                       | [salla-addon-purchase](../salla-addon-purchase/SKILL.md)       |
| SMS / WhatsApp / email channel apps                                | [salla-communication-app](../salla-communication-app/SKILL.md) |
| Carriers, shipments, labels, tracking, returns                     | [salla-shipping-app](../salla-shipping-app/SKILL.md)           |
| Direct Admin (Merchant) API calls, pagination, errors, rate limits | [salla-api-core](../salla-api-core/SKILL.md)                   |
| Find the right doc / live API schema                               | [salla-docs](../salla-docs/SKILL.md)                           |

## Perform actions with the Salla Partners MCP

When the **Salla Partners MCP** server is connected, do the work with these tools instead
of hand-writing Portal clicks or HTTP calls. Each is one tool driven by an `action`:

| Capability                                   | Tool · actions                                                                                  |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Create / configure / publish apps            | `salla_apps` · `list` `get` `create` `update` `connect` (OAuth+webhooks) `set_status` `publish` |
| Events / webhooks                            | `salla_events` · `list` `subscribe`                                                             |
| Storefront snippets                          | `salla_snippets` · `list` `parameters` `create` `update` `delete`                               |
| Embedded pages                               | `salla_embedded_pages` · `list` `create` `update` `delete`                                      |
| Onboarding steps                             | `salla_onboarding_steps` · `list` `create` `update` `delete` `sort`                             |
| App settings & features                      | `salla_settings` · `define_form` `set_validation_url` `list_features` `set_features`            |
| Shipping zones & settings                    | `salla_shipping` · `get_zones` `set_zones` `set_settings`                                       |
| App Functions                                | `salla_functions` · `list` `get` `delete`                                                       |
| File upload (logos)                          | `salla_upload`                                                                                  |
| Lookups (categories/scopes/countries/cities) | `salla_reference`                                                                               |

The routed skills drive these tools step by step — follow the skill, not the raw API.

## Resources

| Topic                          | Link                                 |
| ------------------------------ | ------------------------------------ |
| Finding docs / API schemas     | [salla-docs](../salla-docs/SKILL.md) |
| Partners Portal                | https://portal.salla.partners        |
| Developer blog                 | https://salla.dev/blog/              |
| Developer community (Telegram) | https://t.me/salladev                |
