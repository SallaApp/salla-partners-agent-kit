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

The Salla docs cover far more than app development (the whole Merchant/Admin API,
Twilight themes, storefront…). Reading broad indexes burns context on irrelevant
material. Work in this order:

## 1. Prefer the domain skill

Each Salla skill embeds its own deep links and verified deltas. If a skill covers the
topic, follow it instead of the docs ([salla-app-expert](../salla-app-expert/SKILL.md)
routes by intent). Come here when the skills don't answer it.

## 2. API shapes → the scoped docs page

For an endpoint's exact request/response or an event's payload schema, open the scoped
page on **docs.salla.dev** (table below) instead of guessing:

- Find the endpoint or event on its topic page, then read the request/response schema.
- Trust the published spec for field names and types.
- The Partner API, app events, and webhook payloads each have a scoped page below.

## 3. Topic → scoped docs entry point

Open the scoped page, not an index:

| Topic                            | Entry point                                            |
| -------------------------------- | ------------------------------------------------------ |
| OAuth 2.0 (Easy & Custom Mode)   | https://docs.salla.dev/421118m0.md                     |
| Webhooks guide + event list      | https://docs.salla.dev/421119m0.md                     |
| App events (lifecycle)           | https://docs.salla.dev/421413m0.md                     |
| App Functions — overview         | https://docs.salla.dev/1726814m0.md                    |
| App Functions — supported events | https://docs.salla.dev/1726818m0.md                    |
| Storefront events (snippets)     | https://docs.salla.dev/1724504m0.md                    |
| Communication App payloads       | https://docs.salla.dev/1380572m0.md                    |
| Embedded SDK modules             | https://docs.salla.dev/embedded-sdk/overview.md        |
| Merchant/Admin API reference     | https://docs.salla.dev/421117m0.md                     |
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
