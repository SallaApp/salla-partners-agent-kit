# Salla Partners AI Plugin

Build Salla apps with AI. This plugin gives any coding agent the **skills** to reason
about the Salla platform natively and — with the Partners MCP server — the **tools** to
act on it: create, configure, hook, monetize, and publish apps without touching the Portal.

## Install

```bash
# Claude Code — skills + master agent
claude plugin marketplace add SallaApp/salla-partners-ai-plugin

# All other agents (Cursor, Copilot, Codex, etc.)
npx plugins add SallaApp/salla-partners-ai-plugin
```

For MCP setup and per-client instructions, see **[docs/getting-started.md](docs/getting-started.md)**.

## Skills — 22 across 5 layers

| Layer | Skills |
| --- | --- |
| Foundation | `salla-app-expert` · `salla-api-core` · `salla-app-auth` · `salla-app-authorization` · `salla-webhooks` · `salla-docs` |
| Hookables | `salla-app-functions` · `salla-snippets` · `salla-embedded-app` · `salla-app-settings` · `salla-app-ui-builder` |
| App types | `salla-app-builder` · `salla-shipping-app` · `salla-communication-app` |
| Lifecycle & monetization | `salla-app-lifecycle` · `salla-app-billing` · `salla-addon-purchase` · `salla-addon-purchase-embedded` · `salla-app-subscription-management` |
| Quality & release | `salla-ui-compliance` · `salla-live-testing` · `salla-publication-consistency` |

`salla-app-expert` is the master router — describe your goal and it picks the right skill.
Each skill is a step-by-step workflow with checkpoints; agents load them on demand.

## Validate

```bash
npm run validate
```

Checks skill count, metadata, file references, and symlink consistency.
