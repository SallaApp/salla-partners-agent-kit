# Getting Started — Salla Partners AI Plugin

This plugin has two halves: **skills** (knowledge — step-by-step workflows for every
Salla surface) and the **Partners MCP** (actions — tools that create apps, configure
OAuth/webhooks, subscribe to events, publish, and more). Skills tell the agent _how_;
MCP tools let it _do_. You can use skills alone, but connecting MCP is what makes the
agent act for you.

---

## 1. Prerequisites

- A **Salla Partner account** — https://salla.partners
- A supported AI client: Claude Code, Cursor, Claude Desktop, or any HTTP MCP client
- **Node.js 18+** (for `npx plugins`)

---

## 2. Install

**Claude Code** (skills + master agent):

```bash
claude plugin marketplace add SallaApp/salla-partners-ai-plugin
```

**All other agents** (Cursor, Copilot, Codex, etc.):

```bash
npx plugins add SallaApp/salla-partners-ai-plugin
```

**Manual** — clone and copy skills into your agent's skills directory, then add the MCP
config below separately.

---

## 3. Connect the Partners MCP

The Partners MCP is a remote HTTP server secured with OAuth 2.1 (PKCE). Add it once; a
browser login mints a partner token (~14 days) that refreshes automatically.

Add to your MCP config file:

```json
{
  "mcpServers": {
    "salla-partners": {
      "type": "http",
      "url": "https://mcp.salla.dev/partners"
    }
  }
}
```

**Claude Code** — run instead of editing a file:

```bash
claude mcp add --transport http salla-partners https://mcp.salla.dev/partners
```

Then `/mcp` to authorize. (`--scope project` or `--scope user` to control visibility.)

**Cursor** — paste the JSON above into `~/.cursor/mcp.json` (global) or
`.cursor/mcp.json` (per-project), reload, then Settings → MCP to authorize.

**Claude Desktop** — Settings → Connectors → Add custom connector →
`https://mcp.salla.dev/partners`, approve in browser.

---

## 4. MCP Tools

| Tool                     | Actions                                                           | Purpose                                    |
| ------------------------ | ----------------------------------------------------------------- | ------------------------------------------ |
| `salla_apps`             | `list` `get` `create` `update` `connect` `set_status` `publish`   | Create, configure, and publish apps        |
| `salla_events`           | `list` `subscribe`                                                | Subscribe an app to store/lifecycle events |
| `salla_snippets`         | `list` `parameters` `create` `update` `delete`                    | Storefront snippet (HTML/JS) management    |
| `salla_embedded_pages`   | `list` `create` `update` `delete`                                 | Iframe dashboard pages                     |
| `salla_onboarding_steps` | `list` `create` `update` `delete` `sort`                          | Post-install onboarding steps              |
| `salla_settings`         | `define_form` `set_validation_url` `list_features` `set_features` | Merchant settings form + feature flags     |
| `salla_shipping`         | `get_zones` `set_zones` `set_settings`                            | Shipping zones + carrier settings          |
| `salla_upload`           | —                                                                 | Upload images/docs → returns a file `id`   |
| `salla_reference`        | `categories` `countries` `cities`                                 | Read-only lookups                          |
| `salla_scopes`           | `get` `set`                                                       | Read/update an app's OAuth scopes          |

> **What stays code:** webhooks (receive/verify), OAuth token storage + refresh, embedded
> SDK calls, and App Function source are runtime concerns the MCP can't perform. The skills
> cover these as explicit code steps.

---

## 5. How It Works

Describe your goal — the agent routes to the right skill and drives the MCP tools:

```
You:    "Create a private Salla app called Acme Sync"
Agent:  → salla-app-builder skill
        1. salla_reference categories  → resolve sub_category_id
        2. salla_upload logo.png        → file id
        3. salla_apps create            → app_id
        4. salla_scopes get             → available scope slugs
        5. salla_apps connect           → OAuth + webhook + secret
        6. salla_events subscribe       → order.created, app.store.authorize, …
        Each step ends at a Gate — you confirm before continuing.
```

Use a skill by name when you want a specific flow: _"use the salla-shipping-app skill"_.

---

## 6. Skills

| Layer                    | Skills                                                                                                                                 |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| Foundation               | `salla-app-expert` (master router) · `salla-api-core` · `salla-app-auth` · `salla-app-authorization` · `salla-webhooks` · `salla-docs` |
| Hookables                | `salla-app-functions` · `salla-snippets` · `salla-embedded-app` · `salla-app-settings` · `salla-app-ui-builder`                        |
| App types                | `salla-app-builder` · `salla-shipping-app` · `salla-communication-app`                                                                 |
| Lifecycle & monetization | `salla-app-lifecycle` · `salla-app-billing` · `salla-addon-purchase` · `salla-addon-purchase-embedded`                                 |
| Quality & release        | `salla-ui-compliance` · `salla-live-testing` · `salla-publication-consistency`                                                         |

---

## 7. Troubleshooting

| Symptom               | Fix                                                                                                              |
| --------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Tools don't appear    | Check connection (Claude Code: `/mcp`; Cursor: Settings → MCP). Confirm URL is `https://mcp.salla.dev/partners`. |
| Session expired       | Token lapsed (~14 days). Re-authorize via your client's MCP login.                                               |
| Tool unknown/disabled | Some tools are server-gated (e.g. `salla_functions` needs the App Builder service). Contact your Salla admin.    |
| Skill not triggering  | Name it explicitly or re-run `npx plugins add SallaApp/salla-partners-ai-plugin`.                                |
| Skills only (no MCP)  | Skills work offline as a reference — you just can't execute Portal actions without MCP.                          |

---

## 8. Reference

- Partners Portal — https://portal.salla.partners
- Developer docs — https://docs.salla.dev
- Apps Marketplace — https://apps.salla.sa/en
- Developer community (Telegram) — https://t.me/salladev
