# Salla Partners Agent Kit

**Build Salla apps with AI — faster, and the right way.**

Welcome 👋 This kit turns your coding agent into a Salla app developer. It gives the agent
the **skills** to reason about the Salla platform natively, and — paired with the Partners
MCP server — the **tools** to act on it: create, configure, hook, monetize, and publish
apps without hand-writing Portal calls.

New to building on Salla? You don't need to memorize the platform. Just describe your goal
in plain language and the master router loads the right skill and walks you through it,
step by step:

> _"Build a shipping app for my carrier."_
> _"Add a monthly subscription plan with a 7-day trial."_
> _"Show a dashboard page inside the merchant's Salla admin."_
> _"Send a WhatsApp message when an order is placed."_

## Install

```bash
# Claude Code — skills + master agent
claude plugin marketplace add SallaApp/salla-partners-agent-kit

# Cursor, Copilot, Codex
npx plugins add SallaApp/salla-partners-agent-kit

# Gemini CLI (loads skills, AGENTS.md routing, and the MCP from gemini-extension.json)
gemini extensions install https://github.com/SallaApp/salla-partners-agent-kit

# Hermes — download, review, then run (clones + links .hermes-plugin/ into ~/.hermes)
curl -fsSL https://raw.githubusercontent.com/SallaApp/salla-partners-agent-kit/master/.hermes-plugin/install.sh -o salla-hermes-install.sh
bash salla-hermes-install.sh   # review the script first; re-run to update
```

For MCP setup and per-client instructions, see **[docs/getting-started.md](docs/getting-started.md)**.

## What you can build

- **Storefront experiences** — JS that runs in the shopper's browser (`salla-snippets`).
- **Dashboard pages** — native iframe UI inside the merchant's Salla admin
  (`salla-embedded-app`).
- **Event-driven automation** — serverless handlers on store events, or webhooks
  (`salla-app-functions`, `salla-webhooks`).
- **Monetized apps** — plans, addons, trials, and entitlement gating (`salla-app-billing`).
- **Shipping & communication apps** — carriers/labels, or SMS/WhatsApp/email
  (`salla-shipping-app`, `salla-communication-app`).

## Skills — 28 across 6 layers

| Layer                    | Skills                                                                                                                                       |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Foundation               | `salla-app-expert` · `salla-api-core` · `salla-app-auth` · `salla-webhooks` · `salla-docs`                                                   |
| Hookables                | `salla-app-functions` · `salla-snippets` · `salla-snippets-migration` · `salla-embedded-app` · `salla-app-settings` · `salla-app-ui-builder` |
| App types                | `salla-app-builder` · `salla-shipping-app` · `salla-communication-app`                                                                       |
| Lifecycle & monetization | `salla-app-lifecycle` · `salla-app-billing` · `salla-addon-purchase` · `salla-addon-purchase-embedded`                                       |
| Themes                   | `salla-theme-builder`                                                                                                                        |
| Quality & release        | `salla-storefront-ui` · `salla-embedded-ui` · `salla-live-testing` · `salla-publication-consistency`                                         |

`salla-app-expert` is the master router — describe your goal and it picks the right skill.
Each skill is a step-by-step workflow with checkpoints; agents load them on demand.
(The `salla-app-functions` router also fans out to five App Function step skills —
design, handler, validate, test, release.)

## Versioning & contributing

- **Changelog** — see [CHANGELOG.md](CHANGELOG.md) to track what changed between kit
  releases, and to tell whether your installed skills are stale after a Salla platform
  update.
- **Authoring skills** — building or extending a skill? Follow
  [docs/skill-anatomy.md](docs/skill-anatomy.md): the required structure,
  description-as-trigger format, and pre-ship checklist.

## Validate

```bash
npm run validate
```

Checks skill count, metadata, manifest skill paths, file references, and that the tree is
symlink-free (`scripts/check-no-symlinks.sh` — Codex/Cursor install safety).

## Need help?

- 📚 Start here: **[docs/getting-started.md](docs/getting-started.md)**
- 💬 Salla developer community: **[t.me/salladev](https://t.me/salladev)**
- 🛠️ Partner Portal: **[salla.partners](https://salla.partners)**

Happy building! 🚀
