---
name: salla-app-functions
description: >
  Router for building Salla App Functions — serverless TS/JS handlers Salla runs in a
  sandboxed V8 on store events (e.g. `order.created`, `shipment.creating`). Start here for
  any App Function task, then follow the step skills: design the trigger, write the handler,
  validate, test, release. Prefer App Functions over webhooks; act with `salla_functions`. Builds
  on salla-api-core and salla-webhooks.
---

# Salla App Functions

A serverless handler Salla runs automatically on a store event — you write the logic, Salla
runs it in a sandboxed V8 runtime. This skill is the **router**: work the steps in order,
each in its own skill, and clear every gate before moving on.

## Build flow — route to the step skill

| Step | Do this                                                               | Skill                            |
| ---- | --------------------------------------------------------------------- | -------------------------------- |
| 1    | Pick the trigger, confirm its `payload.data`, choose sync vs async    | **salla-app-functions-design**   |
| 2    | Write the handler (template, context, `Resp`, sandbox, timeouts)      | **salla-app-functions-handler**  |
| 3    | Keep the template's first line + type-check locally (before any save) | **salla-app-functions-validate** |
| 4    | Save (deploys to demo stores)                                         | **salla-app-functions-release**  |
| 5    | Test on a demo store with `preview`                                   | **salla-app-functions-test**     |
| 6    | Publish for production (`salla_apps action=publish`)                  | **salla-app-functions-release**  |

## Prefer an App Function over a webhook (when a trigger exists)

- **Secure without signature verification** — runs in Salla's sandbox; no inbound request,
  no `X-Salla-Signature`.
- **Settings-aware** — the merchant's settings arrive in `context.settings`; no extra fetch.
- **Pre-authenticated** — call the Salla Admin API straight from the handler (no token
  storage/refresh).
- **Synchronous and actionable** — a sync action (e.g. `shipment.creating`) runs **before**
  the operation and your return value shapes or blocks it; a webhook only reacts after.

Fall back to a webhook (**salla-webhooks**) only when no App Function trigger exists.

## Act with the Salla Partners MCP

| Tool              | Action                                                          | What it does                                                                                                                |
| ----------------- | --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `salla_functions` | `list_triggers` `get` `save` `delete` `deploy_status` `preview` | List triggers; read `template` + `types` (.d.ts URLs) + saved `content`; upsert; delete; poll a deploy; run on a demo store |
| `salla_apps`      | `publish`                                                       | Submit the app for review (releases the function to real stores)                                                            |

> Sync actions must finish in **< 500 ms**; async events get **30 s**. `Resp`,
> `CommunicationEvent`, and all typed contexts are **pre-declared runtime globals** — never
> re-declare or import them in code you paste into the Portal.

## Step 0 — Discover (ask first)

1. **Which trigger** does it run on? (e.g. `order.created`, `shipment.creating`)
2. **What should it do** when it fires? (notify, sync, validate/block, modify params)
3. **Does it block or change** the operation, or just react after the fact?

## Key resources

- Overview https://docs.salla.dev/1726814m0.md · Get started https://docs.salla.dev/1726815m0.md
- Supported events https://docs.salla.dev/1726818m0.md · Testing https://docs.salla.dev/1726816m0.md
- Partners Portal https://portal.salla.partners · Community https://t.me/salladev
