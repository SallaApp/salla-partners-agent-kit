# Salla Partners AI Plugin

Build Salla Apps with AI. This plugin gives any coding agent (Claude, Cursor, Codex,
Gemini, Copilot, and more) the **skills** to reason about the Salla platform natively
and — together with the Partners MCP (a private remote server, connected over HTTP) — the
**tools** to act on it: create, configure, hook, monetize, and publish apps without
touching the Portal UI.

## Installation

```bash
# Agent Skills standard (any client)
npx skills add SallaApp/salla-partners-ai-plugin

# Claude Code (as a plugin — also installs the master agent)
claude plugin marketplace add SallaApp/salla-partners-ai-plugin
```

Per-agent notes:

| Agent              | Install                                                                                                                        |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| **Claude Code**    | `claude plugin marketplace add SallaApp/salla-partners-ai-plugin` (skills + the `salla-app-expert` agent), or `npx skills add` |
| **Cursor**         | `npx skills add …`, or clone this repo into the workspace — `.cursor/skills/` mirrors `skills/`                                |
| **GitHub Copilot** | works on this repo out of the box via `.github/skills/`; elsewhere use `npx skills add`                                        |
| **Codex / others** | `npx skills add …` or copy `skills/` to your agent's skills directory                                                          |

Cross-agent conventions live in [AGENTS.md](AGENTS.md). For full setup — installing the
skills **and** connecting the Partners MCP action tools — see
**[docs/getting-started.md](docs/getting-started.md)**.

## How it's organized

A Salla app is **reactions to events attached at hookables**. The plugin mirrors that:

- **Master agent** — [`agents/salla-app-expert.md`](agents/salla-app-expert.md):
  routes intent → skills → MCP tools, end to end. For clients that support agent prompts.
- **Master router skill** — [`salla-app-expert`](skills/salla-app-expert/SKILL.md):
  the same routing as a plain skill, for clients that don't support agent prompts. Holds
  the hookable rule (snippet vs App Function vs webhook) and the intent → skill map.
- **15 composable skills** — each owns one domain and hands off to the others:

| Layer                    | Skills                                                                                                          |
| ------------------------ | --------------------------------------------------------------------------------------------------------------- |
| Foundation               | `salla-api-core` · `salla-app-auth` · `salla-webhooks` · `salla-docs`                                           |
| Hookables                | `salla-app-functions` · `salla-snippets` · `salla-embedded-app` · `salla-app-settings` · `salla-app-ui-builder` |
| App types                | `salla-app-builder` · `salla-shipping-app` · `salla-communication-app`                                          |
| Lifecycle & monetization | `salla-app-lifecycle` · `salla-app-billing` · `salla-addon-purchase`                                            |

Each skill is a workflow: a discovery step, numbered steps with gates, and references
loaded only when needed. Descriptions are the routing interface — agents pick the right
skill from the description alone.

## Validation

Lint every skill with the open-source `skill-validator` (static rules: frontmatter,
structure, secret scanning). The expired-token workaround (`npm_config_userconfig`)
is only needed if your `~/.npmrc` carries a stale token:

```bash
for f in skills/*/SKILL.md skills/*/references/*.md; do
  npm_config_userconfig=/dev/null npx -y skill-validator validate "$f"
done
```

Notes: the tool's "code blocks without language specification" counter counts closing
fences (ignore it), and its Overview/Parameters/Returns section warnings assume
tool-doc layout, not agent-skill workflows.

## Code Quality & Formatting

Before committing changes to any `.md` files, format them with Prettier:

```bash
pnpx prettier . --write
```
