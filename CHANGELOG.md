# Changelog

All notable changes to the Salla Partners Agent Kit are recorded here. Partners who
installed an earlier kit can use this to tell whether their skills are stale after a Salla
platform change.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). This kit
versions the **skill content as a whole** — the `version` field in `package.json`,
`.claude-plugin/plugin.json`, `.plugin/plugin.json`, `.hermes-plugin/plugin.yaml`, and
`gemini-extension.json` moves together (the structural validator enforces this).
`.claude-plugin/marketplace.json` carries no version field and is not bumped.

## [1.0.4] — 2026-06-22

### Changed

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
