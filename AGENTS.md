# AGENTS.md — Salla Partners Agent Kit

Guidance for any AI agent working in (or installed from) this repository.

## What this is

Skills for building **Salla Partner apps** end to end — create, hook events, build UI,
monetize, publish — designed to pair with the **Salla Partners MCP** action tools (a private remote
server — connect over HTTP per `docs/getting-started.md`).

## Routing (this file is the ambient master router)

When this repo sits in your workspace, these rules ARE the router — load the matching
skill before acting. On platforms that install the skills instead, the same routing
lives in the `salla-app-expert` skill (and, on Claude Code, the `salla-app-expert`
agent). One routing brain, three surfaces — keep them in sync.

| Intent                                                        | Skill                           |
| ------------------------------------------------------------- | ------------------------------- |
| Broad / unsure                                                | `salla-app-expert`              |
| Create / configure / publish an app end to end                | `salla-app-builder`             |
| OAuth, tokens, refresh, Easy vs Custom mode, token mutex      | `salla-app-auth`                |
| Webhook transport (register, verify, idempotency)             | `salla-webhooks`                |
| Install / trial / subscription events                         | `salla-app-lifecycle`           |
| Serverless handlers on Salla triggers                         | `salla-app-functions`           |
| Storefront JS / e-commerce events                             | `salla-snippets`                |
| Dashboard iframe UI                                           | `salla-embedded-app`            |
| Public App-Store view / builder blocks                        | `salla-app-ui-builder`          |
| Merchant settings                                             | `salla-app-settings`            |
| Plans, addons, entitlements, balance, plan/subscription state | `salla-app-billing`             |
| Post-install setup / onboarding steps                         | `salla-app-builder`             |
| Addon billing lifecycle (activation, renewal, entitlement)    | `salla-addon-purchase`          |
| In-app addon purchase UX (embedded flow)                      | `salla-addon-purchase-embedded` |
| SMS / WhatsApp / email apps                                   | `salla-communication-app`       |
| Carriers, shipments, labels                                   | `salla-shipping-app`            |
| Direct Admin API calls                                        | `salla-api-core`                |
| Native UI (storefront + embedded)                             | `salla-ui-compliance`           |
| Test the app on a demo store                                  | `salla-live-testing`            |
| Pre-submit publication consistency                            | `salla-publication-consistency` |
| Find the right doc / API schema                               | `salla-docs`                    |

- **The hookable rule** (how behavior attaches to the platform): shopper's browser →
  snippet (`salla-snippets`); an App Function trigger exists → App Function
  (`salla-app-functions`, preferred); otherwise → webhook (`salla-webhooks`).
- **Act through the MCP** when connected (`salla_apps`, `salla_events`, …) instead of
  hand-writing Portal HTTP calls. Connection guide: `docs/getting-started.md`.
- **Finding docs**: use the `salla-docs` skill — scoped public docs entry points on
  docs.salla.dev. Don't read `docs.salla.dev/llms.txt` wholesale; most of it is not app
  development.

## Repository layout

- `.agents/skills/` — the **single canonical skill tree** (Agent Skills standard:
  `SKILL.md` + `references/`). Real directories, **no symlinks**. GitHub Copilot discovers
  it natively; every host manifest below points at it. Never commit a per-host mirror.
- `.claude-plugin/plugin.json` — manifest for **Claude Code _and_ Cursor** (Cursor's CLI
  install reuses `~/.claude/plugins`); `"skills": "./.agents/skills/"` adds the canonical
  tree to the scan. `.claude-plugin/marketplace.json` — marketplace index.
- `.plugin/plugin.json` — **vendor-neutral, write-once** (`"skills"` + `"mcpServers"`). The
  `plugins` CLI translates it to `.codex-plugin/` for Codex (and any future CLI target) at
  install — so there's no committed `.codex-plugin/` or `.cursor-plugin/`.
- `.mcp.json` — the Salla Partners MCP server (`https://partners.mcp.salla.dev`), shared by
  all hosts (Claude/Codex auto-load it from the plugin root).
- `gemini-extension.json` — **Gemini CLI** manifest: `contextFileName: "AGENTS.md"` loads
  this router at session start, and `mcpServers` inlines the Salla MCP (Gemini's `httpUrl`
  field). Skills come from the auto-discovered `.agents/skills/` tree.
- `.hermes-plugin/` — **Hermes** plugin: `plugin.yaml` (`provides_skills:` for all 25
  skills + MCP wiring), `install.sh` (clones the repo and symlinks `.hermes-plugin/` next
  to `.agents/skills/` in `~/.hermes/` at install time), and `__init__.py` (registers the
  canonical skill tree). No CLI passthrough — partners act through the MCP.
- `agents/`, `commands/` — the master agent + audit command (Claude Code plugin components).
- `hooks/` — a **SessionStart hook** (Claude Code auto-discovers `hooks/hooks.json`;
  `hooks-codex.json` / `hooks-cursor.json` cover the other hosts via the polyglot
  `run-hook.cmd`). It injects the routing rule in `hooks/session-start-context.md` so any
  Salla app task starts with `salla-app-expert` before generic brainstorming/planning.
  Gemini has no SessionStart hook — it primes the router via `contextFileName: AGENTS.md`
  (this file); Hermes loads skills on demand, with this router carried in each `SKILL.md`.
  App/tool usage is recorded server-side by the Partners MCP on each tool call (enabled by
  default) — no client hook or URL.
- **No `.cursor/skills` or `.github/skills` symlinks** — tracked in-tree symlinks crash the
  Codex/Cursor installers (`fs.cp` → `ERR_FS_CP_EINVAL`). CI enforces this via
  `scripts/check-no-symlinks.sh`; skills live only in `.agents/skills/`.
- Each manifest's fields are documented against its host's source (Claude Code docs; the
  open-plugin/`plugins` CLI for Codex & Cursor) in **`docs/plugin-manifests.md`**.

## Editing rules

- Skill `description` frontmatter is the routing interface — keep it ≤80 words,
  self-routing, with explicit hand-offs to other skills. No keyword dumps.
- One owner per topic: lifecycle events → `salla-app-lifecycle`; settings →
  `salla-app-settings`; webhook transport → `salla-webhooks`. Route, don't duplicate.
- Format Markdown with Prettier before committing: `pnpx prettier . --write`.
