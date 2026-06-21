---
name: salla-docs
description: >
  Find the right Salla documentation or API schema fast. Use when you need a doc link,
  an endpoint's exact request/response shape, an event payload schema, or you're unsure
  where something is documented. Routes each topic to its scoped public docs entry point
  on docs.salla.dev. Never start from the full docs index (llms.txt) — it spans the
  Merchant API, storefront themes, and more; app development is only a small slice of it.
---

# Salla Docs — Find the Right Reference

App development is a small slice of the Salla docs (which also span the Merchant/Admin
API, Twilight themes, and storefront). Go straight to a scoped page; work in this order:

## 1. Prefer the domain skill

Each Salla skill embeds its own deep links and verified deltas. If a skill covers the
topic, follow it instead of the docs ([salla-app-expert](../salla-app-expert/SKILL.md)
routes by intent). Come here when the skills don't answer it.

## 2. API shapes → the scoped docs page (schemas are inline OpenAPI)

For an endpoint's exact request/response or an event's payload schema, open the scoped
page on **docs.salla.dev** (table below), find the endpoint or event on its topic page,
and read the published schema as the source of truth for field names and types.

Many endpoint pages embed a **full OpenAPI 3.x spec** in a ` ```yaml ` block — top-level
`openapi, info, servers, paths, components, securitySchemes, security`, with request/response
schemas, field types, enums, and required fields. To get an endpoint's exact contract, open
its `https://docs.salla.dev/<id>.md` page and read the `openapi:` YAML block — that block is
the source of truth (e.g. `https://docs.salla.dev/5394153e0.md` = `POST /orders/options`).
To build and validate a call against it, follow the closed-loop in
[salla-api-core](../salla-api-core/SKILL.md).

### Current-reference workflow (validation & upgrade checks)

To pin behavior to the **live** spec: find the resource in
[`references/docs-map.md`](references/docs-map.md) → fetch the live
`https://docs.salla.dev/<id>.md` → read its inline OpenAPI block. Use it for:

- **Validation** — build/verify against the live schema (field names, types, enums,
  required); loop mechanics are in [salla-api-core](../salla-api-core/SKILL.md).
- **Upgrade checks** — diff what the current spec offers vs what the app uses, then
  surface available upgrades.
- **Freshness guard** — always fetch live, never a cached shape; on a `404` the handle
  was renumbered, so relocate the page via step 3/4.

## 3. Topic → scoped docs entry point

Open the scoped page, not an index. The numeric URLs below are stable handles that can
be renumbered or moved — verify the page is current; if one 404s, use step 4 to relocate
it from the full index, then read just that page.

| Topic                            | Entry point                                     |
| -------------------------------- | ----------------------------------------------- |
| OAuth 2.0 (Easy & Custom Mode)   | https://docs.salla.dev/421118m0.md              |
| Webhooks guide + event list      | https://docs.salla.dev/421119m0.md              |
| App events (lifecycle)           | https://docs.salla.dev/421413m0.md              |
| App Functions — overview         | https://docs.salla.dev/1726814m0.md             |
| App Functions — supported events | https://docs.salla.dev/1726818m0.md             |
| Storefront events (snippets)     | https://docs.salla.dev/1724504m0.md             |
| Communication App payloads       | https://docs.salla.dev/1380572m0.md             |
| Embedded SDK modules             | https://docs.salla.dev/embedded-sdk/overview.md |
| Merchant/Admin API reference     | https://docs.salla.dev/421117m0.md              |
| App Settings form (guide)        | `salla-app-settings` skill                      |

## 4. Last resort: relocate a page from the full index

- **`https://docs.salla.dev/llms.txt`** is the full LLM index — most of it (store API
  resources, theme/Twilight docs) is outside app development. Use it only to _locate_ a
  scoped page when a handle above 404s, then read just that page.
- **Merchant API reference** has hundreds of endpoints; open only the resource you need
  ([salla-api-core](../salla-api-core/SKILL.md) covers the calling conventions).
- **Theme (Twilight) internals** are out of scope. For storefront snippet UI or
  native-UI compliance (which can touch the storefront), route to
  [salla-snippets](../salla-snippets/SKILL.md) or
  [salla-ui-compliance](../salla-ui-compliance/SKILL.md).

## Community & escalation

| Channel                        | Link                          |
| ------------------------------ | ----------------------------- |
| Partners Portal                | https://portal.salla.partners |
| Developer blog                 | https://salla.dev/blog/       |
| Developer community (Telegram) | https://t.me/salladev         |
