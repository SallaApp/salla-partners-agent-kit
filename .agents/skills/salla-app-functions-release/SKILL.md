---
name: salla-app-functions-release
description: >
  Save & publish a Salla App Function — `salla_functions action=save` deploys to demo stores
  (poll `action=deploy_status`), then the app is published. Use after validating the handler,
  when you're ready to deploy and ship a function to production. Routed from
  salla-app-functions; test first → salla-app-functions-test; app publication →
  salla-app-builder / salla-publication-consistency; OAuth/tokens → salla-app-auth; webhook
  verification → salla-webhooks.
---

# App Functions — Save, Test & Publish

Save only after a clean validate pass (**salla-app-functions-validate**).

## Save (create or update)

An app has **one function, keyed by its trigger**, so `get` / `save` / `delete` take `app_id`
**and** `trigger`. `save` is an **upsert** for that trigger's function.

- **Save:** `salla_functions action=save`, `app_id`, `trigger`, `content` (the whole function
  as a string), `name`. Keep the template's first line exactly. Returns a deploy `job` and
  triggers an **async deploy to the app's demo stores** — poll
  `salla_functions action=deploy_status`, `job` (returned by action=save) until `COMPLETED`, then test it
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

The already-saved function reaches **real merchant stores only after the app is published** —
not by re-running `save`. For a public app the agent prepares the publication and the partner
submits it; for a private app the agent publishes it after the partner confirms.

- **Public app:** the agent **validates** the publication via `app_publish action=validate`,
  which validates every section and **saves a DRAFT** (no admin submission). After a clean
  validate, hand the partner their real Portal `/publish` link
  (`https://portal.salla.partners/apps/{app_id}/publish`, real id substituted) so they review
  the draft and click submit one-click. The agent **never** admin-submits — full stepwise flow
  (`open` → `set` each section → `validate`) is owned by **salla-publication-consistency**.
- **Private app:** publish with `salla_private_apps action=publish` (`confirm: true`, only
  after the partner confirms — a merchant partner's app usually goes live at once; no
  onboarding or listing) → [salla-app-builder → private apps](../salla-app-builder/references/private-apps.md).

**Pre-publish security check.** **Before** anything is submitted or published, scan the saved `content`
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
- [ ] Saved (`action=save`); for a public app the publication validates clean
      (`app_publish action=validate` → draft) and the partner has the Portal `/publish` link;
      for a private app, the partner confirmed the `salla_private_apps` publish.

**Gate:** "Execution Status = success in preview, within the timeout budget, the security
scan is clean, and either the publication validates clean and the partner submits (public) or
the partner confirmed and `salla_private_apps action=publish confirm:true` returned a
publication (private)?"

## Red Flags

| Tempting thought                                        | Why it's wrong                                                                                                                          |
| ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| "Preview passed, so I'll publish the private app."      | Only after the partner's explicit confirmation and a clean security scan — a merchant partner's private app usually goes live at once.  |
| "`save` succeeded, so merchants have the new function." | Saved code reaches real stores only after the app is published (public: partner submits; private: `salla_private_apps action=publish`). |
| "I'll submit the public publication myself."            | The agent validates the draft; the partner submits it one-click in the Portal or explicitly confirms `send_publish_request`.            |
