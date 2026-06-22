# Changelog

All notable changes to the Salla Partners Agent Kit are recorded here. Partners who
installed an earlier kit can use this to tell whether their skills are stale after a Salla
platform change.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). This kit
versions the **skill content as a whole** — the `version` field in `package.json`,
`.claude-plugin/plugin.json`, `.plugin/plugin.json`, `.hermes-plugin/plugin.yaml`, and
`gemini-extension.json` moves together (the structural validator enforces this).
`.claude-plugin/marketplace.json` carries no version field and is not bumped.

## [1.0.5] — 2026-06-22

### Changed

- **Publish flow now stops at a validated draft.** `app_publish` no longer submits to admin
  review — its terminal action is `validate`, which validates every section and **saves a
  DRAFT**, returning a valid publication. After a clean validate, the agent guides the
  **partner** to review and submit in one click at
  `https://portal.salla.partners/apps/{app_id}/publish` (with the app's **real** id
  substituted). The agent never submits to Salla review itself. Updated
  `salla-publication-consistency` (loop table, sequence, gates, Red Flags),
  `salla-app-builder` (Step 8), and the `salla-app-expert` routing/MCP tables.

### Added

- **Listing-image asset rule** (owned by `salla-app-ui-builder`, referenced from
  `salla-publication-consistency`): the listing needs real `logo` + ≥3 screenshots (App
  Information) and `banner` + `embedded_image` (App Features). Ask the user to provide the
  required images; if they decline, proceed with clearly-marked placeholders **and**
  explicitly tell the partner to replace them in the Portal before the one-click submit.
  Never invent a real-looking image or silently ship a placeholder as final. Added as a
  positive recipe plus Red Flags rows on both skills.

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
