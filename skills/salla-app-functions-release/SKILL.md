---
name: salla-app-functions-release
description: >
  Save & publish a Salla App Function: `salla_functions action=save` triggers an async deploy
  to demo stores (returns a `job` — poll `action=deploy_status` until COMPLETED), then test
  (salla-app-functions-test) and `salla_apps action=publish` for admin approval to reach real
  stores. Use after validating. Routed from salla-app-functions.
---

# App Functions — Save, Test & Publish

Save only after a clean validate pass (**salla-app-functions-validate**).

## Save (create or update)

Every function is **keyed by its trigger**, so `get` / `save` / `delete` take `app_id` **and**
`trigger`. A given app runs a single function — `save` is an **upsert**.

- **Save:** `salla_functions action=save`, `app_id`, `trigger`, `content` (the whole function
  as a string), `name`. Keep the template's first line exactly — save **rejects** a change.
  Returns a deploy `job`; the function deploys to demo stores (poll
  `salla_functions action=deploy_status`, `job_id` until `COMPLETED`). Operator-gated: if the
  App Builder service is off, it returns a clear "disabled" error.
- **Read:** `salla_functions action=get`, `app_id`, `trigger` → `template` + `types` (.d.ts
  URLs) + the app's saved `content` (or `null`).
- **Remove:** `salla_functions action=delete`, `app_id`, `trigger`.

Saving triggers an **async deploy** to the app's demo stores — poll `deploy_status` (the
save `job`) until `COMPLETED`, then test it (**salla-app-functions-test**). You don't call a
separate deploy action, manage versions, or re-save the publication draft. It reaches **real
stores only after the publish request is approved**:

- **Publish:** `salla_apps action=publish`, `app_id` (optional `update_note`) → review; admin
  approval releases it to live stores.

## Test before publishing

Run it on a demo store with `salla_functions action=preview` — see
**salla-app-functions-test**. (Manual alternative: the Portal preview panel → pick a demo
store, enter a real record id, **Save and Preview**.) **Never log secrets** — preview logs
are visible.

## Checklist

- [ ] `payload.data` confirmed (design) · strict `tsc` clean (validate).
- [ ] Sync body well under 500 ms; every `fetch` bounded.
- [ ] `Resp.success().setData(...)` on every path — `{}` if empty.
- [ ] No npm/unsupported core; `globalThis.crypto`; no secrets logged.
- [ ] Tested in preview against a demo store with a real record ID.
- [ ] Saved (`action=save`) then submitted for publish (`salla_apps action=publish`).

**Gate:** "Execution Status = success in preview, within the timeout budget, and submitted
for publish?"
