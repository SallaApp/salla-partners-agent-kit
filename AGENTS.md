# AGENTS.md — Salla Partners AI Plugin

Guidance for any AI agent working in (or installed from) this repository.

## What this is

Skills for building **Salla Partner apps** end to end — create, hook events, build UI,
monetize, publish — designed to pair with the
[Salla Partners MCP](https://github.com/SallaApp/partners-mcp) action tools.

## Routing (this file is the ambient master router)

When this repo sits in your workspace, these rules ARE the router — load the matching
skill before acting. On platforms that install the skills instead, the same routing
lives in the `salla-app-expert` skill (and, on Claude Code, the `salla-app-expert`
agent). One routing brain, three surfaces — keep them in sync.

| Intent                                            | Skill                     |
| ------------------------------------------------- | ------------------------- |
| Broad / unsure                                    | `salla-app-expert`        |
| Create / configure / publish an app end to end    | `salla-app-builder`       |
| OAuth, tokens, refresh                            | `salla-app-auth`          |
| Webhook transport (register, verify, idempotency) | `salla-webhooks`          |
| Install / trial / subscription events             | `salla-app-lifecycle`     |
| Serverless handlers on Salla triggers             | `salla-app-functions`     |
| Storefront JS / e-commerce events                 | `salla-snippets`          |
| Dashboard iframe UI                               | `salla-embedded-app`      |
| Merchant settings                                 | `salla-app-settings`      |
| Plans, addons, entitlements, balance              | `salla-app-billing`       |
| In-app addon purchase                             | `salla-addon-purchase`    |
| SMS / WhatsApp / email apps                       | `salla-communication-app` |
| Carriers, shipments, labels                       | `salla-shipping-app`      |
| Direct Admin API calls                            | `salla-api-core`          |
| Find the right doc / API schema                   | `salla-docs`              |

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
