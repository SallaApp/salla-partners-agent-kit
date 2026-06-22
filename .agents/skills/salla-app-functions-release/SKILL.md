---
name: salla-app-functions-release
description: >
  Save & publish a Salla App Function. `salla_functions action=save` deploys to demo stores
  (poll `action=deploy_status`); then test (salla-app-functions-test) and `salla_apps
  action=publish` for admin approval to reach real stores. Use after validating. Routed from
  salla-app-functions; OAuth/tokens → salla-app-auth, webhook verification → salla-webhooks.
---

# App Functions — Save, Test & Publish

Save only after a clean validate pass (**salla-app-functions-validate**).

## Save (create or update)

An app has **one function, keyed by its trigger**, so `get` / `save` / `delete` take `app_id`
**and** `trigger`. `save` is an **upsert** for that trigger's function.

- **Save:** `salla_functions action=save`, `app_id`, `trigger`, `content` (the whole function
  as a string), `name`. Keep the template's first line exactly. Returns a deploy `job` and
  triggers an **async deploy to the app's demo stores** — poll
  `salla_functions action=deploy_status`, `job_id` until `COMPLETED`, then test it
  (**salla-app-functions-test**). One save covers deploy; there is no separate deploy action
  or versioning.
- **Read:** `salla_functions action=get`, `app_id`, `trigger` → `template` + `types` (.d.ts
  URLs) + the app's saved `content` (or `null`).
- **Remove:** `salla_functions action=delete`, `app_id`, `trigger`.

Param names and job shape above are illustrative — confirm exact fields with `salla_functions`
before relying on them.

> Note: if you later change app config that the publication snapshot captured, re-open
> publish to refresh it — see **salla-publication-consistency**. The function deploy itself
> does not need re-saving.

## Test before publishing

Run it on a demo store with `salla_functions action=preview` — see
**salla-app-functions-test**. (Manual alternative: the Portal preview panel → pick a demo
store, enter a real record id, **Save and Preview**.) Preview logs are visible, so keep
secrets out of them — covered by the pre-publish scan below.

## Publish (production)

The already-saved function reaches **real merchant stores only after the publish request is
approved** — publish via `salla_apps`, not by re-running `save`:

- **Publish:** `salla_apps action=publish`, `app_id`, **`publish_action`** (`"save"` drafts
  the publication, `"submit"` sends for review) with the `publication` payload; optional
  `update_note`. Admin approval releases the saved function to live stores. Confirm the exact
  required `publication` fields with `salla_apps` / **salla-publication-consistency** before
  submitting — they are version-specific.

**Pre-publish security check.** Before `publish_action="submit"`, scan the saved `content`
(`salla_functions action=get`): no hardcoded tokens, secrets, or API keys; no debug dumps of
`context` or merchant PII into preview logs; no over-broad outbound `fetch` calls. Token/OAuth
handling belongs in your backend, not the function — see **salla-app-auth**; webhook signature
verification → **salla-webhooks**.

## Checklist

- [ ] `payload.data` confirmed (**salla-app-functions-design**) · strict `tsc` clean (**salla-app-functions-validate**).
- [ ] Sync body within the 5 s total budget (each internal async call < 2 s); every `fetch` bounded.
- [ ] `Resp.success().setData(...)` on every path — `{}` if empty.
- [ ] No npm/unsupported core; `globalThis.crypto`; no hardcoded secrets/tokens, no PII logged.
- [ ] Tested in preview against a demo store with a real record ID (**salla-app-functions-test**).
- [ ] Saved (`action=save`) then submitted (`salla_apps action=publish`, `publish_action="submit"`).

**Gate:** "Execution Status = success in preview, within the timeout budget, and submitted
for publish?"
