---
name: salla-docs
description: >
  Find the right Salla documentation or API schema fast. Use when you need a doc link,
  an endpoint's exact request/response shape, an event payload schema, or you're unsure
  where something is documented. Routes each topic to its scoped docs entry point and
  uses the apidog-mcp-server docs MCP (site-id 451700) for live API specs. Never start
  from the full docs index (llms.txt) — it spans the Merchant API, storefront themes,
  and more; app development is only a small slice of it.
---

# Salla Docs — Find the Right Reference

The Salla docs cover far more than app development (the whole Merchant/Admin API,
Twilight themes, storefront…). Reading broad indexes burns context on irrelevant
material. Work in this order:

## 1. Prefer the domain skill

Each Salla skill embeds its own deep links and verified deltas. If a skill covers the
topic, follow it instead of the docs ([salla-app-architect](../salla-app-architect/SKILL.md)
routes by intent). Come here when the skills don't answer it.

## 2. API shapes → the docs MCP

For an endpoint's exact request/response or an event's payload schema, query
**`apidog-mcp-server`** (site-id `451700`, read-only):

- Search for the endpoint or event name first, then fetch its schema.
- Trust the MCP over prose docs for field names and types — it serves the live spec.
- It covers the Partner API, app events, and webhook payloads.

## 3. Topic → scoped docs entry point

Open the scoped page, not an index:

| Topic                            | Entry point                                            |
| -------------------------------- | ------------------------------------------------------ |
| OAuth 2.0 (Easy & Custom Mode)   | https://docs.salla.dev/doc-421118                      |
| Webhooks guide + event list      | https://docs.salla.dev/421119m0                        |
| App events (lifecycle)           | https://docs.salla.dev/doc-421413                      |
| App Functions — overview         | https://docs.salla.dev/1726817m0                       |
| App Functions — supported events | https://docs.salla.dev/1726818m0                       |
| Storefront events (snippets)     | https://docs.salla.dev/1724504m0                       |
| Communication App payloads       | https://docs.salla.dev/2006119m0                       |
| Embedded SDK modules             | https://docs.salla.dev/embedded-sdk/                   |
| Merchant/Admin API reference     | https://docs.salla.dev/doc-421117                      |
| App Settings form (guide)        | https://salla.dev/blog/how-to-build-app-settings-form/ |

## 4. Know what to avoid

- **`https://docs.salla.dev/llms.txt`** — the full LLM index. Huge; most of it (store
  API resources, theme/Twilight docs) is irrelevant to app development. Only use it as
  a last resort to _locate_ a scoped page, never to read wholesale.
- **Merchant API reference** — hundreds of endpoints; open only the resource you need
  ([salla-api-core](../salla-api-core/SKILL.md) covers the calling conventions).
- **Theme (Twilight) docs** — out of scope for app development entirely.

## Community & escalation

| Channel                        | Link                          |
| ------------------------------ | ----------------------------- |
| Partners Portal                | https://portal.salla.partners |
| Developer blog                 | https://salla.dev/blog/       |
| Developer community (Telegram) | https://t.me/salladev         |
