# Changelog

All notable changes to the Salla Partners Agent Kit are recorded here. Partners who
installed an earlier kit can use this to tell whether their skills are stale after a Salla
platform change.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). This kit
versions the **skill content as a whole** — the `version` field in `package.json`,
`.claude-plugin/plugin.json`, `.plugin/plugin.json`, `.hermes-plugin/plugin.yaml`, and
`gemini-extension.json` moves together (the structural validator enforces this).
`.claude-plugin/marketplace.json` carries no version field and is not bumped.

## [1.0.6] — 2026-06-23

### Changed

- **`salla-webhooks`** — document that `salla_events action=subscribe` REPLACES the whole
  subscription list, and that removing ALL subscriptions is done with `clear_all: true` (an
  empty `events: []` is rejected to avoid an accidental wipe).

## [1.0.5] — 2026-06-23

### Changed

- **The merchant settings form is for public/private/communication apps — not shipping
  apps.** `salla-app-settings` now states up front that the form (`salla_settings
define_form` / `set_validation_url`) applies to public, private, and communication apps,
  and that shipping apps have no merchant settings form — they configure shipping via
  `salla_shipping` (zones/settings); the Portal rejects `POST /settings` for a shipping app.
  Added a Red Flags row to that effect, routing to `salla-shipping-app`. `salla-shipping-app`
  Step 3 gains the matching note (don't call `salla_settings define_form`; shipping config is
  `salla_shipping`), routing the settings-form concept back to `salla-app-settings`.
- **Private apps are published in the Portal, not via the MCP.** `salla_apps action=publish_private`
  was removed from the Salla Partners MCP. A private app has no onboarding and no MCP publish
  action — the partner sends its publish request from the app-details page
  `https://portal.salla.partners/apps/{app_id}`; public apps still use the stepwise
  `app_publish` flow. Swept every `publish_private` / `POST /app/{id}/private-publish`
  reference accordingly (and dropped the obsolete `update_note`) across `salla-app-builder`
  (Tools table, Step 8 decision + Gate, publishing Red Flags), `salla-app-expert` (MCP/routing
  tables), `salla-publication-consistency` (private hand-off), `salla-shipping-app` (Tools
  table + publish note), `salla-app-functions` (Step-6 row + `salla_apps` cell), and
  `salla-app-functions-release` (description, publish step, checklist, gate).
- **Documented the free-private-app limit.** A company gets a limited number of free private
  apps (`private_apps_limit`, effectively one); creating an additional private app requires it
  be paid — set `is_paid: "1"` on `salla_apps action=create`, otherwise `create` returns
  `free_private_apps_disabled` (403). `salla-app-builder` Step 1 now states this as a positive
  recipe (create-app field table + a create-step Red Flags row).

## [1.0.4] — 2026-06-23

### Changed

- **Publish flow now stops at a validated draft.** `app_publish` no longer submits to admin
  review — its terminal action is `validate`, which validates every section and **saves a
  DRAFT**, returning a valid publication. After a clean validate, the agent guides the
  **partner** to review and submit in one click at
  `https://portal.salla.partners/apps/{app_id}/publish` (with the app's **real** id
  substituted). The agent never submits to Salla review itself. Updated
  `salla-publication-consistency` (loop table, sequence, gates, Red Flags),
  `salla-app-builder` (Step 8), and the `salla-app-expert` routing/MCP tables.
- **Swept every remaining `salla_apps action=publish` reference** (that action was removed —
  publishing is now `app_publish` for public apps, `salla_apps action=publish_private` for
  private apps) across `salla-app-builder`, `salla-app-expert`, `salla-app-billing`,
  `salla-addon-purchase`, `salla-app-functions`, `salla-app-functions-release`, and
  `salla-shipping-app`. Pricing/plans/addons are now set via the publication's `pricing`
  section (`app_publish action=set section=pricing`) then `validate`, not a separate publish
  call. `salla-app-functions-release` reframed: the agent **validates** the publication
  (saves a draft) and the **partner** does the one-click submit in the Portal — the agent
  never admin-submits; the pre-publish security scan runs before the partner submits.
- **salla-webhooks** — document the two verification strategies distinctly: `token` is
  plain equality (`Authorization` header `===` `webhook_secret`, **not** HMAC); `signature`
  is HMAC-SHA256 of the raw body. `webhook_security_strategy` must be set **explicitly** —
  unset = `none` = no verification. Added the `@salla.sa/*` server packages
  (`webhooks-actions`, `passport-strategy`, `event`, `embedded-sdk`) with the Next.js
  serverless caveat on `webhooks-actions`' file-dispatch.
- **salla-app-auth** — persist merchant tokens in a real datastore keyed by `merchant`
  (`/tmp` / in-memory are wiped on cold start → 403, app looks uninstalled); `generate_secret`
  **rotates** the signing secret, so read the live `webhook_secret` via `salla_apps action=get`
  before deploy and never reuse one carried across sessions.
- **salla-app-expert / salla-app-builder** — read every concrete value (URLs/domains,
  secrets, event names, algorithms, package APIs) from its **live source at point of use**,
  never invented or carried across a context compaction; verify the deployed domain before
  writing any URL into Salla; domain-change consistency checklist; read back after every mutate.

### Added

- **Listing-image asset rule** (owned by `salla-app-ui-builder`, referenced from
  `salla-publication-consistency`): the listing needs real `logo` + ≥3 screenshots (App
  Information) and `banner` + `embedded_image` (App Features). Ask the user to provide the
  required images; if they decline, proceed with clearly-marked placeholders **and**
  explicitly tell the partner to replace them in the Portal before the one-click submit.
  Never invent a real-looking image or silently ship a placeholder as final. Added as a
  positive recipe plus Red Flags rows on both skills.
- **Public app vs Private app publish decision** (owned by `salla-app-builder`, Step 8): a
  type-based rule — `type: private` → direct one-shot `salla_apps action=publish_private`
  (`POST /app/{id}/private-publish`, body just `update_note` on updates; no public listing,
  no stepwise onboarding, no readiness sections; prerequisites: `type: private` +
  DEVELOPMENT, ID-verified company, not already submitted, `private_apps_limit` /
  `free_private_apps_disabled` 403 guard). Public apps → the stepwise `app_publish`
  onboarding (hand off to `salla-publication-consistency`). Scoped
  `salla-publication-consistency` to **public** apps with a one-line hand-off to
  `publish_private`. Added a publishing Red Flags table on `salla-app-builder`.

Closes the skill gaps from the ConversionKit build post-mortem (paired with partners-mcp's
required `webhook_security_strategy` + `generate_secret` rotation warning).

## [1.0.3] — 2026-06-22

### Added

- `CHANGELOG.md` — version history so installed kits can detect when their skills are stale.
- `docs/skill-anatomy.md` — contributor guide and checklist for authoring new skills
  (required sections, description-as-trigger format, red-flags tables, progressive
  disclosure, line limits).
- **Red Flags tables** on the gated skills most exposed to rationalization shortcuts —
  `salla-app-auth`, `salla-webhooks`, `salla-app-billing`, `salla-app-lifecycle` — each
  pairing a tempting "skip" thought with why it breaks in production, tied to the step it
  guards.

### Changed

- **Progressive disclosure:** moved heavy code/payloads out of the largest `SKILL.md`
  files into their `references/` sidecars, keeping steps, gates, and Red Flags inline —
  `salla-app-auth` (`token-refresh.md`, `custom-mode.md`), `salla-webhooks`
  (`server-setup.md`), `salla-app-billing` (`subscription-api.md`), `salla-app-builder`
  (`onboarding-steps.md`).

- Reworded skill `description` frontmatter that lacked an explicit trigger so each
  self-activates with a "Use when…" clause on hosts that read the description in isolation
  (Cursor, Copilot): `salla-app-billing`, `salla-app-settings`, `salla-app-ui-builder`,
  `salla-embedded-app`.
- Documented the authoring standard (description triggers, gates + red-flags, progressive
  disclosure, changelog/version discipline) in `AGENTS.md`.

## [1.0.2] — 2026-06-22

### Changed

- Stepwise publication flow and the App Store presentation **builder** flow
  (`app_page_builder`), plus build-feedback hardening across skills (#23). Added the
  `salla-embedded-ui` skill and a consolidated `salla-docs` docs map.

## [1.0.1] — 2026-06-21

### Changed

- `salla-app-auth`: default to **Easy Mode**; flag Custom Mode's review-rejection risk
  (#21).
- Grounded skills in source-of-truth docs and corrected API facts across the kit (#20).
- Replaced external blog links with captured local references plus a link finder
  (`scripts/find-blog-links.sh`) (#18).

### Added

- SessionStart hook that injects the routing rule so any Salla task starts with
  `salla-app-expert`; tighter `salla-app-expert` routing (#17).

## [1.0.0] — 2026-06

### Added

- Initial release: skills covering the full Salla Partner app lifecycle (create, hook
  events, build UI, monetize, publish), a `salla-app-expert` master agent, an `audit`
  command, and the Salla Partners MCP wiring.
- Native multi-host packaging: Claude Code + Cursor (`.claude-plugin/`), vendor-neutral
  Codex target (`.plugin/`), single canonical `.agents/skills/` tree with no symlinks
  (CI-enforced).
- App Functions skill split into a router plus step skills (design, handler, validate,
  test, release) (#12).
