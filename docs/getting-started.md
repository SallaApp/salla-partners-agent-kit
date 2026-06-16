# Getting Started — Salla Partners AI Plugin

Build and manage Salla Partner apps with an AI coding assistant. This plugin has **two
halves that work together**:

| Half | What it is | What it gives you |
| --- | --- | --- |
| **Skills** | Markdown workflows installed into your AI agent | The *knowledge* — guided, step-by-step flows for every Salla app surface (OAuth, webhooks, App Functions, embedded pages, shipping, settings…) |
| **Partners MCP** | A remote MCP server you connect to your client | The *actions* — tools that actually create apps, configure OAuth/webhooks, subscribe to events, define settings, publish, and more |

The skills tell the agent *how* to build a Salla app; the MCP tools let it *do* the work
against the Salla Developers Portal. You can use the skills alone (as a reference), but
connecting the MCP is what turns them into an agent that performs the actions for you.

---

## 1. Prerequisites

- A **Salla Partner account** — sign up at https://salla.partners.
- A supported AI client: **Claude Code**, **Cursor**, **Claude Desktop**, **Codex**, or
  any MCP-capable client.
- **Node.js 18+** (for the `npx skills` installer and the `mcp-remote` bridge).
- The **MCP server URL** for your environment (the `/mcp` endpoint), e.g.
  `https://<your-salla-mcp-host>/mcp`. Get the canonical URL from the Salla Developers
  Portal / your Salla contact — referred to below as `<MCP_URL>`.

---

## 2. Install the Skills

The skills are distributed as a plugin. The standard, client-agnostic way:

```bash
npx skills add SallaApp/salla-partners-ai-plugin
```

This downloads the plugin and installs its skills into your detected agent's skills
directory. Re-run it any time to update.

### Per-client notes

- **Claude Code** — installs to `~/.claude/skills/`. Skills load automatically; the agent
  picks the right one by its description. (You can also manage it as a plugin via
  `/plugin`.)
- **Cursor** — the installer places the skills where Cursor reads agent skills/rules.
- **Codex** — installs to `~/.codex/skills/`.
- **Other clients** — point the installer at your agent, or copy the `skills/` folder
  manually (see below).

### Manual install (any client)

```bash
git clone https://github.com/SallaApp/salla-partners-ai-plugin.git
# Copy the skills you want into your agent's skills directory, e.g. for Claude Code:
cp -R salla-partners-ai-plugin/skills/* ~/.claude/skills/
```

### What's included

Each skill is a **workflow** — a `Step 0 — Discover` intake, numbered steps with
checkpoints (**Gates**), and inline links to references.

**Core / foundation**
- `salla-api-core` — Admin API base: auth, requests, pagination, errors, rate limits, settings read-modify-write.
- `salla-app-authorization` — OAuth 2.0 (Easy vs Custom mode), token storage, the refresh-mutex danger zone.
- `salla-webhooks` — webhook server, event subscription, signature verification, idempotency.
- `salla-app-builder` — overview + capability → tool map + App Functions reference.

**Build an app end to end**
- `salla-general-app` — the master flow: create → OAuth/webhooks → events → snippets → embedded → functions → publish.
- `salla-app-settings` — define the merchant settings form, validation URL, features.
- `salla-embedded-app` — iframe pages inside the merchant dashboard (SDK, auth, theme).
- `salla-storefront-snippets` — Device Mode (browser) vs Cloud Mode (App Function) storefront integrations.
- `salla-shipping-app` — shipping/fulfillment apps: zones, settings, shipment lifecycle.

**App Functions & lifecycle**
- `salla-app-functions` — serverless V8 handlers: execution types, `Resp` API, sandbox limits, deploy on publish.
- `salla-app-lifecycle` — install/update/uninstall/trial/subscription events + merchant state machine.
- `salla-app-subscription-management` — pricing plans, plan-state tracking, reconciliation.
- `salla-addon-purchase-embedded` — in-iframe addon purchase + webhook-driven activation.

---

## 3. Connect the Partners MCP (the action tools)

The Partners MCP is a **remote Streamable-HTTP MCP server secured with OAuth 2.1 (PKCE)**.
You add it once; on first use your browser opens the Salla Developers Portal to log in and
approve access. The minted partner token is valid for ~14 days, after which the client
re-runs the login automatically.

> Replace `<MCP_URL>` with your environment's `/mcp` endpoint (e.g.
> `https://<your-salla-mcp-host>/mcp`).

### Claude Code

```bash
claude mcp add --transport http salla-partners <MCP_URL>
```

Then run `/mcp` inside Claude Code to trigger the OAuth login and authorize. (To scope it
to one project, add `--scope project`; to share across projects, `--scope user`.)

### Cursor

Add to `~/.cursor/mcp.json` (global) or `.cursor/mcp.json` (per-project):

```json
{
  "mcpServers": {
    "salla-partners": {
      "url": "<MCP_URL>"
    }
  }
}
```

Reload Cursor, open **Settings → MCP**, and complete the OAuth login when prompted.

### Claude Desktop

**Settings → Connectors → Add custom connector**, paste `<MCP_URL>`, and approve the
OAuth login in the browser. (On plans without remote connectors, use the `mcp-remote`
bridge below.)

### Codex

Codex speaks stdio MCP, so bridge the remote server with `mcp-remote`. In
`~/.codex/config.toml`:

```toml
[mcp_servers.salla-partners]
command = "npx"
args = ["-y", "mcp-remote", "<MCP_URL>"]
```

### Any stdio-only MCP client (generic)

Use the [`mcp-remote`](https://www.npmjs.com/package/mcp-remote) bridge:

```json
{
  "mcpServers": {
    "salla-partners": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "<MCP_URL>"]
    }
  }
}
```

The first run opens a browser for the Portal login + consent; the token is cached locally
afterward.

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
| `salla_functions` | `list` · `get` · `delete` | Inspect/remove deployed App Functions (deploy happens on publish) |
| `salla_upload` | — | Upload an image/document → returns a file `id` (e.g. for an app logo) |
| `salla_reference` | `categories` · `scopes` · `countries` · `cities` | Read-only lookups other tools need |
| `salla_request` | `search` · `call` | Generic GET fallback for partner endpoints (may be disabled by the server) |

---

## 5. How Skills + Tools Work Together

The skills are written to **drive these tools**. A typical session:

```
You:    "Create a private Salla app called Acme Sync"
Agent:  (loads the salla-general-app skill → follows its workflow)
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

## 6. Troubleshooting

| Symptom | Fix |
| --- | --- |
| Tools don't appear | Confirm the MCP server is added and shows "connected" (Claude Code: `/mcp`; Cursor: Settings → MCP). Re-check `<MCP_URL>` ends in `/mcp`. |
| `Salla session expired — reconnect` | The partner token lapsed (~14 days). Re-run the client's MCP login/authorize to mint a new one. |
| Browser login didn't open | For stdio bridges, run the `mcp-remote` command once in a terminal to complete OAuth, then restart the client. |
| A tool says it's unknown/disabled | Some tools are gated by server config (e.g. `salla_request`, `salla_functions`). Use the curated tool for that task, or contact your Salla admin. |
| Skill not triggering | Mention it by name ("use the salla-app-settings skill"), or re-run `npx skills add SallaApp/salla-partners-ai-plugin` to ensure it's installed/updated. |

---

## 7. Reference

- Salla Developers Portal — https://portal.salla.partners
- Salla docs — https://docs.salla.dev
- Apps Marketplace — https://apps.salla.sa/en
- Developer community (Telegram) — https://t.me/salladev
