# Getting Started — Salla Partners AI Plugin

Build and manage Salla Partner apps with an AI coding assistant. This plugin has **two
halves that work together**:

| Half | What it is | What it gives you |
| --- | --- | --- |
| **Skills** | Markdown workflows installed into your AI agent | The *knowledge* — guided, step-by-step flows for every Salla app surface (OAuth, webhooks, App Functions, embedded pages, shipping, settings…) |
| **Partners MCP** | A remote HTTP MCP server you connect to your client | The *actions* — tools that actually create apps, configure OAuth/webhooks, subscribe to events, define settings, publish, and more |

The skills tell the agent *how* to build a Salla app; the MCP tools let it *do* the work
against the Salla Developers Portal. You can use the skills alone (as a reference), but
connecting the MCP is what turns them into an agent that performs the actions for you.

---

## 1. Prerequisites

- A **Salla Partner account** — sign up at https://salla.partners.
- A supported AI client: **Claude Code**, **Cursor**, **Claude Desktop**, or any
  HTTP MCP-capable client.
- **Node.js 18+** (for the `npx plugins` installer).

---

## 2. Install

### Claude Code

```bash
claude plugin marketplace add SallaApp/salla-partners-ai-plugin
```

Installs the 22 skills and the `salla-app-expert` master agent. The agent picks the right
skill automatically — describe your goal and it routes to the correct domain skill.

### Other agents (Cursor, Copilot, Codex, etc.)

```bash
npx plugins add SallaApp/salla-partners-ai-plugin
```

### Manual install — skills + MCP separately

If you prefer to install skills by hand or configure the MCP connection yourself:

**Skills:**

```bash
git clone https://github.com/SallaApp/salla-partners-ai-plugin.git
cp -R salla-partners-ai-plugin/skills/* ~/.claude/skills/   # adjust path per agent
```

**MCP** — add to your agent's MCP config file (HTTP only):

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

---

## 3. Connect the Partners MCP

The Partners MCP is a **remote HTTP MCP server secured with OAuth 2.1 (PKCE)**.
You add it once; on first use your browser opens the Salla Developers Portal to log in and
approve access. The minted partner token is valid for ~14 days, after which the client
re-runs the login automatically.

### Claude Code

```bash
claude mcp add --transport http salla-partners https://mcp.salla.dev/partners
```

Then run `/mcp` inside Claude Code to trigger the OAuth login and authorize. (Add
`--scope project` to scope it to one project; `--scope user` to share across projects.)

### Cursor

Add to `~/.cursor/mcp.json` (global) or `.cursor/mcp.json` (per-project):

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

Reload Cursor, open **Settings → MCP**, and complete the OAuth login when prompted.

### Claude Desktop

**Settings → Connectors → Add custom connector**, paste `https://mcp.salla.dev/partners`,
and approve the OAuth login in the browser.

### Any other HTTP MCP client

Add the following to your client's MCP configuration:

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

The first connection opens a browser for the Portal login + consent; the token is cached
locally afterward.

---

## 4. The MCP Tools

Once connected, these tools become available. Each is one tool driven by an `action`
parameter:

| Tool | Actions | Purpose |
| --- | --- | --- |
| `salla_apps` | `list` · `get` · `create` · `update` · `connect` · `set_status` · `publish` | Create, configure (OAuth + webhooks), and publish apps |
| `salla_events` | `list` · `subscribe` | Discover and subscribe an app to store/lifecycle events |
| `salla_snippets` | `list` · `parameters` · `create` · `update` · `delete` | Storefront snippets (HTML/JS injection) |
| `salla_embedded_pages` | `list` · `create` · `update` · `delete` | Embedded (iframe) dashboard pages |
| `salla_onboarding_steps` | `list` · `create` · `update` · `delete` · `sort` | Post-install onboarding steps |
| `salla_settings` | `define_form` · `set_validation_url` · `list_features` · `set_features` | Merchant settings form + feature flags |
| `salla_shipping` | `get_zones` · `set_zones` · `set_settings` | Shipping zones + carrier settings |
| `salla_upload` | — | Upload an image/document → returns a file `id` (e.g. for an app logo) |
| `salla_reference` | `categories` · `scopes` · `countries` · `cities` | Read-only lookups other tools need |
| `salla_request` | `search` · `call` | Generic GET fallback for partner endpoints (may be disabled by the server) |

---

## 5. How Skills + Tools Work Together

The skills are written to **drive these tools**. A typical session:

```
You:    "Create a private Salla app called Acme Sync"
Agent:  (loads the salla-app-builder skill → follows its workflow)
        1. salla_reference action=categories      → resolve type / sub_category_id
        2. salla_upload url=…logo.png              → file id (checks 1:1, ≥250×250)
        3. salla_apps action=create …             → returns app_id
        4. salla_reference action=scopes app_id=… → available scope slugs
        5. salla_apps action=connect …            → OAuth + webhook + secret
        6. salla_events action=subscribe …        → order.created, app.store.authorize, …
        … each step ends at a Gate so you confirm before moving on.
```

You don't have to name the tools — describe the goal, and the agent uses the matching
skill + tools. Use a skill directly by mentioning it (e.g. "use the salla-shipping-app
skill") when you want a specific flow.

**What stays code (no tool):** runtime pieces the MCP can't perform — receiving/verifying
webhooks, OAuth token storage + refresh, embedded SDK calls, App Function source, and
reading/writing per-merchant settings *values* with the merchant token. The skills cover
these as labelled code steps.

---

## 6. What's included — 22 skills

| Layer | Skills |
| --- | --- |
| **Foundation** | `salla-app-expert` (master router) · `salla-api-core` · `salla-app-auth` · `salla-app-authorization` · `salla-webhooks` · `salla-docs` |
| **Hookables** | `salla-app-functions` · `salla-snippets` · `salla-embedded-app` · `salla-app-settings` · `salla-app-ui-builder` |
| **App types** | `salla-app-builder` · `salla-shipping-app` · `salla-communication-app` |
| **Lifecycle & monetization** | `salla-app-lifecycle` · `salla-app-billing` · `salla-addon-purchase` · `salla-addon-purchase-embedded` · `salla-app-subscription-management` |
| **Quality & release** | `salla-ui-compliance` · `salla-live-testing` · `salla-publication-consistency` |

Each skill is a **workflow** — a `Step 0 — Discover` intake, numbered steps with
checkpoints (**Gates**), and inline links to references. The `salla-app-expert` skill
(and agent) is the master router: describe your goal and it picks the right domain skill.

---

## 7. Troubleshooting

| Symptom | Fix |
| --- | --- |
| Tools don't appear | Confirm the MCP server is added and shows "connected" (Claude Code: `/mcp`; Cursor: Settings → MCP). Re-check the URL is `https://mcp.salla.dev/partners`. |
| `Salla session expired — reconnect` | The partner token lapsed (~14 days). Re-run the client's MCP login/authorize to mint a new one. |
| A tool says it's unknown/disabled | Some tools are gated by server config (e.g. `salla_request`). Use the curated tool for that task, or contact your Salla admin. |
| Skill not triggering | Mention it by name ("use the salla-app-settings skill"), or re-run `npx plugins add SallaApp/salla-partners-ai-plugin` to ensure it's installed/updated. |

---

## 8. Reference

- Salla Developers Portal — https://portal.salla.partners
- Salla docs — https://docs.salla.dev
- Apps Marketplace — https://apps.salla.sa/en
- Developer community (Telegram) — https://t.me/salladev
