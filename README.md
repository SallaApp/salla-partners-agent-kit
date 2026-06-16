# Salla Partners AI Plugin

Build Salla Apps with AI. This plugin gives any coding agent (Claude, Cursor, Codex,
Gemini, Copilot, and more) the **skills** to reason about the Salla platform natively
and — together with the Partners MCP (a private remote server, connected over HTTP) — the
**tools** to act on it: create, configure, hook, monetize, and publish apps without
touching the Portal UI.

## Installation

```bash
# Agent Skills standard (any client)
npx plugins add SallaApp/salla-partners-ai-plugin

# Claude Code (also installs the master agent)
claude plugin marketplace add SallaApp/salla-partners-ai-plugin
```

For full setup — connecting the Partners MCP action tools for Claude Code, Cursor,
Claude Desktop, Codex, and other MCP clients — see
**[docs/getting-started.md](docs/getting-started.md)**.

## Per-agent install

| Agent              | Install                                                                                                                          |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| **Claude Code**    | `claude plugin marketplace add SallaApp/salla-partners-ai-plugin` (skills + the `salla-app-expert` agent), or `npx plugins add` |
| **Cursor**         | `npx plugins add …`, or clone into the workspace — `.cursor/skills/` mirrors `skills/`                                        |
| **GitHub Copilot** | works on this repo out of the box via `.github/skills/`; elsewhere use `npx plugins add`                                        |
| **Codex / others** | `npx plugins add …` or copy `skills/` to your agent's skills directory                                                        |

Cross-agent conventions live in [AGENTS.md](AGENTS.md).

## How it's organized

A Salla app is **reactions to events attached at hookables**. The plugin mirrors that:

- **Master agent** — [`agents/salla-app-expert.md`](agents/salla-app-expert.md):
  routes intent → skills → MCP tools, end to end. For clients that support agent prompts.
- **Master router skill** — [`salla-app-expert`](skills/salla-app-expert/SKILL.md):
  the same routing as a plain skill, for clients that don't support agent prompts. Holds
  the hookable rule (snippet vs App Function vs webhook) and the intent → skill map.
- **21 composable skills** — each owns one domain and hands off to the others:

| Layer                    | Skills                                                                                                                                            |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Foundation               | `salla-api-core` · `salla-app-auth` · `salla-app-authorization` · `salla-webhooks` · `salla-docs`                                                |
| Hookables                | `salla-app-functions` · `salla-snippets` · `salla-embedded-app` · `salla-app-settings` · `salla-app-ui-builder`                                |
| App types                | `salla-app-builder` · `salla-shipping-app` · `salla-communication-app`                                                                          |
| Lifecycle & monetization | `salla-app-lifecycle` · `salla-app-billing` · `salla-addon-purchase` · `salla-addon-purchase-embedded` · `salla-app-subscription-management` |
| Quality & release        | `salla-ui-compliance` · `salla-live-testing` · `salla-publication-consistency`                                                                  |

Each skill is a workflow: a discovery step, numbered steps with gates, and references
loaded only when needed. Descriptions are the routing interface — agents pick the right
skill from the description alone.

## Validation

```bash
npm run validate
```

Checks metadata completeness, file existence, and symlink consistency across all 22 skills
and both agent surfaces (Cursor + GitHub Copilot).

## Code Quality & Formatting

Before committing changes to any `.md` files, format them with Prettier:

```bash
pnpx prettier . --write
```
