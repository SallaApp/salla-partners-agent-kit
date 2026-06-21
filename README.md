# Salla Partners Agent Kit

Build Salla apps with AI. This plugin gives any coding agent the **skills** to reason
about the Salla platform natively and — with the Partners MCP server — the **tools** to
act on it: create, configure, hook, monetize, and publish apps without touching the Portal.

## Install

```bash
# Claude Code — skills + master agent
claude plugin marketplace add SallaApp/salla-partners-agent-kit

# Cursor, Copilot, Codex
npx plugins add SallaApp/salla-partners-agent-kit

# Gemini CLI (loads skills, AGENTS.md routing, and the MCP from gemini-extension.json)
gemini extensions install https://github.com/SallaApp/salla-partners-agent-kit

# Hermes (clones + links .hermes-plugin/ into ~/.hermes; re-run to update)
curl -fsSL https://raw.githubusercontent.com/SallaApp/salla-partners-agent-kit/master/.hermes-plugin/install.sh | bash
```

For MCP setup and per-client instructions, see **[docs/getting-started.md](docs/getting-started.md)**.

## Skills — 26 across 5 layers

| Layer                    | Skills                                                                                                          |
| ------------------------ | --------------------------------------------------------------------------------------------------------------- |
| Foundation               | `salla-app-expert` · `salla-api-core` · `salla-app-auth` · `salla-webhooks` · `salla-docs`                      |
| Hookables                | `salla-app-functions` · `salla-snippets` · `salla-embedded-app` · `salla-app-settings` · `salla-app-ui-builder` |
| App types                | `salla-app-builder` · `salla-shipping-app` · `salla-communication-app`                                          |
| Lifecycle & monetization | `salla-app-lifecycle` · `salla-app-billing` · `salla-addon-purchase` · `salla-addon-purchase-embedded`          |
| Quality & release        | `salla-storefront-ui` · `salla-embedded-ui` · `salla-live-testing` · `salla-publication-consistency`            |

`salla-app-expert` is the master router — describe your goal and it picks the right skill.
Each skill is a step-by-step workflow with checkpoints; agents load them on demand.

## Validate

```bash
npm run validate
```

Checks skill count, metadata, manifest skill paths, file references, and that the tree is
symlink-free (`scripts/check-no-symlinks.sh` — Codex/Cursor install safety).
