# AGENTS.md — Salla Partners AI Plugin

Guidance for any AI agent working in (or installed from) this repository.

## What this is

Skills for building **Salla Partner apps** end to end — create, hook events, build UI,
monetize, publish — designed to pair with the
[Salla Partners MCP](https://github.com/SallaApp/partners-mcp) action tools.

## How to use the skills

- **Start at the router**: the `salla-app-expert` skill dispatches any Salla intent
  to the right skill (on Claude Code, the `salla-app-expert` agent in `agents/`
  plays this role). Creating an app from scratch → `salla-app-builder`.
- **The hookable rule** (how behavior attaches to the platform): shopper's browser →
  snippet (`salla-snippets`); an App Function trigger exists → App Function
  (`salla-app-functions`, preferred); otherwise → webhook (`salla-webhooks`).
- **Act through the MCP** when connected (`salla_apps`, `salla_events`, …) instead of
  hand-writing Portal HTTP calls. Connection guide: `docs/getting-started.md`.
- **Finding docs**: use the `salla-docs` skill — scoped entry points + the apidog docs
  MCP. Don't read `docs.salla.dev/llms.txt` wholesale; most of it is not app
  development.

## Repository layout

- `skills/` — the canonical skills (Agent Skills standard: `SKILL.md` + `references/`).
- `.cursor/skills/`, `.github/skills/` — **generated symlinks** to `skills/` for Cursor
  and GitHub Copilot. Never hand-edit; recreate with
  `ln -sfn ../../skills/<name> .cursor/skills/<name>` (same for `.github/skills/`).
- `agents/` — the master agent definition (Claude Code plugin format).
- `.claude-plugin/` — plugin + marketplace manifests for Claude Code.

## Editing rules

- Skill `description` frontmatter is the routing interface — keep it ≤80 words,
  self-routing, with explicit hand-offs to other skills. No keyword dumps.
- One owner per topic: lifecycle events → `salla-app-lifecycle`; settings →
  `salla-app-settings`; webhook transport → `salla-webhooks`. Route, don't duplicate.
- Format Markdown with Prettier before committing: `pnpx prettier . --write`.
