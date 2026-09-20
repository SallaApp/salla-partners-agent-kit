---
name: salla-theme-builder
description: >
  Partner-side Salla Twilight themes through the `salla_themes` MCP tool — find and
  inspect themes, read a theme's twilight.json (components + global settings), and
  create a new store, landing-page, or bundle theme. Use when a partner wants to start,
  find, or understand a Salla theme. Not an app listing's "App Theme" category →
  salla-publication-consistency. App UI inside the storefront → salla-storefront-ui.
  Storefront JS for an app → salla-snippets. Twilight docs → salla-docs.
---

# Salla Theme Builder (`salla_themes`)

A **theme** is not an app. It is a GitHub repository the Portal creates and owns on the
partner's behalf, plus a **`twilight.json`** in that repo that declares the theme's
**components** (per page/path) and **global settings**. That shapes everything here: a
theme cannot exist without a GitHub App installation, creating one creates a repo, and
the theme's structure is only readable from the repo — not from the theme record.

Every theme action goes through **`salla_themes`**.

## When to use / hand-offs

- **Use this skill** to list, inspect, or create a partner's Twilight theme.
- **Two paths:** _Inspect_ → Step 1, then Steps 2–3. _Create_ → Step 1, then Step 4.
- **Hand-offs:** an app listing's "App Theme" / "App Impact" category →
  `salla-publication-consistency`; app UI inside a storefront → `salla-storefront-ui`;
  Twilight concepts and schemas → `salla-docs`.

## What the MCP covers today — and what it doesn't

| Partner wants to…                                                     | Do                                       |
| --------------------------------------------------------------------- | ---------------------------------------- |
| List / search their themes                                            | `salla_themes action=list`               |
| Read a theme's record (price, status, repo, preview store)            | `salla_themes action=get`                |
| Read its components and global settings                               | `salla_themes action=github_config`      |
| Look up theme category ids                                            | `salla_themes action=categories`         |
| Create a new theme                                                    | `salla_themes action=create` (Step 4)    |
| Edit details / price / support contact, components, settings, publish | **Not in the MCP yet** — Partners Portal |
| Develop and preview the theme's code locally                          | Salla CLI (`salla theme …`)              |

When a request is a write the MCP doesn't cover yet, say so plainly and route it to the
[Partners Portal](https://portal.salla.partners) theme page — the CLI is for local development,
not these writes. See [theme-api-notes.md](references/theme-api-notes.md#not-yet-in-the-mcp)
for why several of those writes are destructive if done naively.

## Step 1 — Confirm the partner can reach themes

```
salla_themes action=list
```

- **Succeeds** (even with an empty list) → the session is valid and the user has the theme
  permission. Continue.
- **401** → the MCP session expired. The partner reconnects the connector, then retry.
- **403** → this user's Portal role lacks `manage-themes` (`manage-bundles` for bundles).
  The company owner grants it in the Partners Portal; reconnecting will not help.

> `list` is **not** behind the Portal's themes allowlist, so a successful `list` does
> **not** prove this company can open or create themes. `get` and `create` show that.

**Gate:** "`list` succeeded in this session?"

## Step 2 — Find the theme

Narrow the list rather than paging blindly:

```
salla_themes action=list q="<name>" status=development|live|archive type=store|landing|bundle
```

Take `theme_id` from the result (or from the partner, e.g. a Portal URL), then read the record:

```
salla_themes action=get theme_id=<id>
```

If `get` returns **401 while `list` still works**, the session is fine and this company is
**not enabled for themes** — the Portal gates theme access behind the `theme_allowed_users`
allowlist. Stop and tell the partner to ask Salla to enable themes for their account.
Retrying or reconnecting will not help.

**Gate:** "`theme_id` came from a `list` result or from the partner, and `get` returned it?"

## Step 3 — Read the structure before describing or changing anything

```
salla_themes action=github_config theme_id=<id>
```

Returns the theme's config file — `twilight.json`, or `twilight-bundle.json` for a bundle —
**filtered by the Portal** to `features`, `settings`, `components`, `tags` and `templates`,
plus `all_features` (store and landing themes only) and `branches`. Other keys in the file never arrive. It is the **only**
read path for components and settings; the record from `get` carries neither.

Summarize from what came back. Quote component `key`s and setting `id`s from this theme's
`github_config`.

**Gate:** "Any statement about this theme's components or settings is backed by a
`github_config` read from this session?"

## Step 4 — Create a theme

Collect these values from the partner:

| Field             | Rule                                                                          |
| ----------------- | ----------------------------------------------------------------------------- |
| `name`            | **Required** English name, ≤ 50 chars                                         |
| `name_ar`         | Arabic name, ≤ 50 chars — defaults to `name`; ask for real Arabic             |
| `author_email`    | **Required** — the theme's support email                                      |
| `type`            | `store` (default) · `landing` · `bundle`                                      |
| `theme_url`       | Optional marketing URL                                                        |
| `public`          | Optional; defaults to `true`                                                  |
| `categories`      | Optional, 1–3 ids from `salla_themes action=categories`, picked by partner    |
| `installation_id` | GitHub App installation that will own the repo — usually resolved (see below) |

**GitHub installation.** Omit `installation_id` and the tool resolves it:

- **Exactly one** installation → used automatically.
- **None** → an error carrying the GitHub App install URL. Hand that URL to the partner and
  stop; nothing was created, so create again once they have installed the app.
- **Several** → the tool lists them. **Ask the partner which account owns the repo** and
  run create again with that `installation_id`.

**Confirm, then create once.** Creating makes a theme _and_ a private GitHub repository, so it
is not idempotent. Show the partner the exact values, get an explicit yes, then:

```
salla_themes action=create name="…" name_ar="…" author_email="…" type=store
```

After a timeout or an unclear error, run `salla_themes action=list q="<name>"` before
calling create again — the first call may have landed.

**Report the price as 250.** The Portal sets every new theme's `price` to **250** regardless of
input. Tell the partner to set the real price on the theme's page in the Partners Portal
before publishing (public themes 250–50000, private themes 1000–50000).

**Gate:** "Partner confirmed the values, the call ran once, and the partner was told the price
is 250 until they change it?"

## Step 5 — Hand off

After a successful create, run `salla_themes action=get theme_id=<new id>` and give the partner
the `theme_id` and its `repo`, then route what they do next:

- Develop and preview the theme locally → Salla CLI (`salla theme …`).
- Price, details, support contact, components, settings, publishing → Partners Portal until
  the MCP supports them.
- Twilight concepts, component and setting schemas → **salla-docs**.

## Red Flags

| Tempting thought                                                                 | Why it's wrong                                                                                                                                                                                                                |
| -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "A theme is an app, so the app flow applies." (Step 1)                           | A theme is a GitHub repository of Twilight templates: no OAuth, no install webhooks, no App Settings, and it is published from the Partners Portal — `app_publish` is the App Store listing flow. Stay on this skill's steps. |
| "`list` worked, so themes are enabled for this partner." (Step 1)                | `list` isn't allowlisted. A non-enabled company lists fine and then gets 401 on `get` / `create`. Only those calls answer the question.                                                                                       |
| "It's a 401 on `get` — tell them to reconnect." (Step 2)                         | If `list` still works, the session is fine; it's the themes allowlist. Reconnecting wastes the partner's time and changes nothing.                                                                                            |
| "It's a 403 — the session expired." (Step 1)                                     | A 403 is the user's role missing `manage-themes`. Only the company owner can fix it; reconnecting changes nothing.                                                                                                            |
| "Several GitHub installations — I'll just take the first." (Step 4)              | That picks which GitHub account owns the partner's theme repo. It's the partner's decision, and a wrong pick means a repo in the wrong place.                                                                                 |
| "Create timed out — retry it." (Step 4)                                          | Create isn't idempotent: a retry can leave a second theme and a second repo. `list` with `q` first to see whether the first call landed.                                                                                      |
| "The theme costs 250, that's what they chose." (Step 4)                          | 250 is set server-side on every new theme. Reporting it as the partner's chosen price misleads them into publishing at the wrong price.                                                                                       |
| "No tool for settings — I'll send the updated settings some other way." (Step 5) | Out of scope for the MCP today, and the Portal's settings write replaces the **whole** settings array — a partial write wipes the rest. Route to the Portal.                                                                  |

## References

- [theme-api-notes.md](references/theme-api-notes.md) — Portal validation notes, the full error
  decision table, what `github_config` returns, and why the not-yet-supported writes are risky.
  Load it at Step 4, or whenever a call returns something this skill doesn't describe.

## Cross-links

- **salla-storefront-ui** — native styling for an **app's** UI drawn inside a storefront theme.
- **salla-snippets** — storefront JavaScript injected by an app.
- **salla-docs** — Twilight and theme documentation.
- **salla-publication-consistency** — an app listing's "App Theme" / "App Impact" category.
- **salla-app-expert** — back to the router when the task isn't a theme.
