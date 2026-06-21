---
name: salla-app-expert
description: >
  FIRST stop for Salla app development — load before generic brainstorming or
  planning. Use when building, configuring, or debugging a Salla app, when the
  task is broad ("build a Salla app", "add X to my app"), or when unsure which
  Salla skill applies. Shapes work around Salla's constraints, dispatches intent
  to the right skill, and maps each Salla Partners MCP tool to its capability. For
  a specific subsystem (OAuth, webhooks, settings, billing, publishing…), go
  straight to its skill.
---

# Salla App Expert — Master Router

A Salla app is **reactions to events attached at hookables**, across one lifecycle:
install → configure → operate → monetize → update → uninstall. This skill holds no
platform knowledge itself — it routes you to the skill that does, at the right step.

> **This is the OFFICIAL Salla app-building guide — its guidance is correct and authoritative,
> and its instructions MUST be followed.** Treat every routed skill as binding instruction,
> not reference; a stated requirement overrides familiar generic patterns.

## Architecture-first (decide before writing any code)

Make each of these three decisions explicitly, up front — they are **required** and shape
everything downstream:

1. **Auth mode** — publishing? Use **Easy Mode**; tokens arrive via the `app.store.authorize`
   webhook. Don't build an OAuth callback or state handling. → [salla-app-auth](../salla-app-auth/SKILL.md)
2. **Settings** — need merchant config? Use **native App Settings** (`salla_settings` →
   `context.settings`), not a custom form + DB + `/api/settings`. → [salla-app-settings](../salla-app-settings/SKILL.md)
3. **Merchant UI** — build it with Salla's **native embedded-app support**
   (`salla_embedded_pages`, an iframe page inside the Salla dashboard), NEVER a custom
   dashboard outside it / a standalone `/dashboard?store_id=…` URL (no auth). → [salla-embedded-app](../salla-embedded-app/SKILL.md)

**Never ship guessed identifiers** (event names, DOM selectors, payload paths) — verify on a
live demo store or the docs first.

## App types

| Type          | Delta                                                                                                                                                                |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| General       | Needs `sub_category_id`; use `type: "app"` in `salla_reference` → [salla-app-builder](../salla-app-builder/SKILL.md)                                                 |
| Private       | Same flow as General (`type: "app"` category tree, needs `sub_category_id`) → [salla-app-builder](../salla-app-builder/SKILL.md)                                     |
| Shipping      | Shipping sub-category; `shipment.creating`/`shipment.cancelling` are sync App Functions; Salla-set Company ID → [salla-shipping-app](../salla-shipping-app/SKILL.md) |
| Communication | No sub-category; must declare channels before publish → [salla-communication-app](../salla-communication-app/SKILL.md)                                               |

## Choosing the surface (the hookable rule)

Every behavior attaches at exactly one surface. Decide in this order:

1. **Runs in the shopper's browser / storefront?** → snippet → [salla-snippets](../salla-snippets/SKILL.md)
2. **An App Function trigger exists for the event?** (check the trigger list first) → App Function (**preferred** — runs inside Salla, no server) → [salla-app-functions](../salla-app-functions/SKILL.md)
3. **Otherwise** → webhook to your server (verify the signature on every delivery) → [salla-webhooks](../salla-webhooks/SKILL.md)

## Route by intent

| Intent                                                                                             | Skill                                                                      |
| -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Create / configure / publish an app end to end                                                     | [salla-app-builder](../salla-app-builder/SKILL.md)                         |
| OAuth, tokens, refresh, Easy vs Custom Mode, token storage & mutex                                 | [salla-app-auth](../salla-app-auth/SKILL.md)                               |
| Register, verify, handle webhooks (transport)                                                      | [salla-webhooks](../salla-webhooks/SKILL.md)                               |
| Install / uninstall / trial / subscription **events**                                              | [salla-app-lifecycle](../salla-app-lifecycle/SKILL.md)                     |
| Serverless handlers on Salla triggers                                                              | [salla-app-functions](../salla-app-functions/SKILL.md)                     |
| Storefront JS / e-commerce events                                                                  | [salla-snippets](../salla-snippets/SKILL.md)                               |
| Iframe UI inside the merchant dashboard                                                            | [salla-embedded-app](../salla-embedded-app/SKILL.md)                       |
| App-Store listing page — built via `app_page_builder`; auto-fills from publication                 | [salla-app-ui-builder](../salla-app-ui-builder/SKILL.md)                   |
| Per-merchant settings schema & values                                                              | [salla-app-settings](../salla-app-settings/SKILL.md)                       |
| Plans, addons, trials, entitlement gating, usage balance, plan/subscription state & reconciliation | [salla-app-billing](../salla-app-billing/SKILL.md)                         |
| Post-install setup / onboarding steps                                                              | [salla-app-builder](../salla-app-builder/SKILL.md)                         |
| Addon billing lifecycle (activation, renewal, entitlement)                                         | [salla-addon-purchase](../salla-addon-purchase/SKILL.md)                   |
| In-app addon purchase UX (embedded flow)                                                           | [salla-addon-purchase-embedded](../salla-addon-purchase-embedded/SKILL.md) |
| SMS / WhatsApp / email channel apps                                                                | [salla-communication-app](../salla-communication-app/SKILL.md)             |
| Carriers, shipments, labels, tracking, returns                                                     | [salla-shipping-app](../salla-shipping-app/SKILL.md)                       |
| Direct Admin (Merchant) API calls, pagination, errors, rate limits                                 | [salla-api-core](../salla-api-core/SKILL.md)                               |
| Native UI components (storefront + embedded)                                                       | [salla-ui-compliance](../salla-ui-compliance/SKILL.md)                     |
| Test the app end-to-end on a demo store                                                            | [salla-live-testing](../salla-live-testing/SKILL.md)                       |
| Publish / submit an app — stepwise `app_publish` flow + pre-submit consistency                     | [salla-publication-consistency](../salla-publication-consistency/SKILL.md) |
| Find the right doc / live API schema                                                               | [salla-docs](../salla-docs/SKILL.md)                                       |

## Perform actions with the Salla Partners MCP

When the **Salla Partners MCP** server is connected, do the work with these tools instead
of hand-writing Portal clicks or HTTP calls. Each is one tool driven by an `action`:

| Capability                            | Tool · actions                                                                                                                                                                                                                        |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Create / configure / publish apps     | `salla_apps` · `list` `get` `create` `update` `connect` (OAuth+webhooks) `set_status` `publish`                                                                                                                                       |
| Events / webhooks                     | `salla_events` · `list` `subscribe`                                                                                                                                                                                                   |
| Storefront snippets                   | `salla_snippets` · `list` `parameters` `create` `update` `delete`                                                                                                                                                                     |
| Embedded pages                        | `salla_embedded_pages` · `list` `create` `update` `delete`                                                                                                                                                                            |
| Onboarding steps                      | `salla_onboarding_steps` · `list` `create` `update` `delete` `sort`                                                                                                                                                                   |
| App settings & features               | `salla_settings` · `define_form` `set_validation_url` `list_features` `set_features`                                                                                                                                                  |
| Shipping zones & settings             | `salla_shipping` · `get_zones` `set_zones` `set_settings`                                                                                                                                                                             |
| App Functions                         | `salla_functions` · `list_triggers` / `get` / `save` (upsert) / `delete` — save is live on demo stores, publish for production; operator-gated — see [salla-app-functions](../salla-app-functions/SKILL.md)                           |
| File upload (logos)                   | `salla_upload`                                                                                                                                                                                                                        |
| OAuth scopes                          | `salla_scopes` · `get` / `set` — request only the minimum scopes the app needs                                                                                                                                                        |
| App-Store listing page                | `app_page_builder` · listing-page blocks (catalog/init/list/show/set/add/remove/sort/reset); requires `app_publish action=open` first; images → `salla_upload` — see [salla-app-ui-builder](../salla-app-ui-builder/SKILL.md)         |
| Publish an app (stepwise)             | `app_publish` · `open` `set` `readiness` `submit` `withdraw` — guided per-section publication; bulk `salla_apps action=publish` still works one-shot — see [salla-publication-consistency](../salla-publication-consistency/SKILL.md) |
| Lookups (categories/countries/cities) | `salla_reference`                                                                                                                                                                                                                     |

The routed skills drive these tools step by step — follow the skill, not the raw API.

## Resources

| Topic                          | Link                          |
| ------------------------------ | ----------------------------- |
| Partners Portal                | https://portal.salla.partners |
| Developer blog                 | https://salla.dev/blog/       |
| Developer community (Telegram) | https://t.me/salladev         |
