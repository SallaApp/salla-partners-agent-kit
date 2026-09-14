---
name: salla-theme-builder
description: >
  Partner-side Salla Twilight themes through the `salla_themes` MCP tool — find and
  inspect themes, read a theme's twilight.json (components + global settings), and
  create a new store, landing-page, or bundle theme (needs a GitHub App installation).
  Use when a partner wants to start, find, or understand a Salla theme. App UI drawn
  inside the storefront → salla-storefront-ui. Storefront JS for an app →
  salla-snippets. Twilight docs → salla-docs.
---

# Salla Theme Builder (`salla_themes`)

A **theme** is not an app. It is a GitHub repository the Portal creates and owns on the
partner's behalf, plus a **`twilight.json`** in that repo that declares the theme's
**components** (per page/path) and **global settings**. That shapes everything here: a
theme cannot exist without a GitHub App installation, creating one creates a repo, and
the theme's structure is only readable from the repo — not from the theme record.

Drive theme work through **`salla_themes`**. Do not hand-write Partners Portal HTTP calls.

## What the MCP covers today — and what it doesn't

| Partner wants to…                                                     | Do                                                            |
| --------------------------------------------------------------------- | ------------------------------------------------------------- |
| List / search their themes                                            | `salla_themes action=list`                                    |
| Read a theme's record (price, status, repo, preview store)            | `salla_themes action=get`                                     |
| Read its components and global settings                               | `salla_themes action=github_config`                           |
| Create a new theme                                                    | `salla_themes action=create` (Step 4)                         |
| Edit details / price / support contact, components, settings, publish | **Not in the MCP yet** — Partners Portal or `salla theme` CLI |

When a request lands in the last row, say so plainly and point the partner at the
[Partners Portal](https://portal.salla.partners) theme page or the Salla CLI
(`salla theme …`). Never improvise the write through another tool or a raw API call —
see [theme-api-notes.md](references/theme-api-notes.md#not-yet-in-the-mcp) for why
several of those writes are destructive if done naively.

## Step 1 — Confirm the partner can reach themes

```
salla_themes action=list
```

- **Succeeds** (even with an empty list) → the MCP session is valid. Continue.
- **401 / 403** → the MCP session expired. Ask the partner to reconnect the connector,
  then retry. Do not proceed on a failed list.

> `list` is **not** behind the Portal's themes allowlist, so a successful `list` does
> **not** prove this partner can open or create themes. Step 2 is where that shows.

**Gate:** "`list` succeeded in this session?"

## Step 2 — Find the theme (never guess an id)

Narrow the list rather than paging blindly:

```
salla_themes action=list q="<name>" status=development|live|archive type=store|landing|bundle
```

Take `theme_id` from the result, then read the record:

```
salla_themes action=get theme_id=<id>
```

If `get` returns the **401/403 themes message while `list` still works**, the session is
fine and this company is **not enabled for themes** — the Portal gates theme access behind
the `theme_allowed_users` allowlist. Stop and tell the partner to ask Salla to enable themes
for their account. Retrying or reconnecting will not help.

**Gate:** "`theme_id` came from a `list` result in this session — not recalled or invented?"

## Step 3 — Read the structure before describing or changing anything

```
salla_themes action=github_config theme_id=<id>
```

Returns `components` (each with a `key`, `path`, localized `title`, and its field schema),
`settings` (global settings: `id`, `type`, `label`, `format`, value), and the raw
`twilight_json` with branch info. This is the **only** read path for either list — the theme
record from `get` carries neither.

Summarize from what came back. Component `key`s and setting `id`s are repo data — quote them,
never assume them from another theme.

**Gate:** "Any statement about this theme's components or settings is backed by a
`github_config` read from this session?"

## Step 4 — Create a theme

Collect from the partner — do not invent:

| Field             | Rule                                                                      |
| ----------------- | ------------------------------------------------------------------------- |
| `name`            | **Required** English name, ≤ 50 chars                                     |
| `name_ar`         | Arabic name, ≤ 50 chars — defaults to `name`; ask for real Arabic         |
| `author_email`    | **Required** — the theme's support email                                  |
| `type`            | `store` (default) · `landing` · `bundle`                                  |
| `theme_url`       | Optional marketing URL                                                    |
| `public`          | Optional; the Portal defaults it to public                                |
| `categories`      | Optional, 1–3 theme category ids — **only** ids the partner gives you     |
| `installation_id` | GitHub App installation that will own the repo — usually resolved for you |

**GitHub installation.** Omit `installation_id` and the tool resolves it:

- **Exactly one** installation → used automatically.
- **None** → the tool returns an error carrying the GitHub App install URL. Hand that URL to
  the partner and stop; a theme cannot be created until they install the app.
- **Several** → the tool lists them. **Ask the partner which account owns the repo** and
  re-run with that `installation_id`.

**Confirm, then create once.** Creating makes a theme _and_ a GitHub repository, so it is not
safe to repeat. Show the partner the exact values, get an explicit yes, then:

```
salla_themes action=create name="…" name_ar="…" author_email="…" type=store
```

**Report the forced price.** The Portal sets every new theme's `price` to **250** regardless
of input. Tell the partner, and tell them to set the real price before publishing — in the
Portal today (see the table at the top).

**Gate:** "Partner confirmed the values, the call ran once, and the partner was told the price
is 250 until they change it?"

## Step 5 — Hand off

After a successful create, give the partner the new `theme_id` and the repo from `get`, then
route what they do next:

- Develop and preview the theme locally → Salla CLI (`salla theme …`).
- Price, details, support contact, components, settings, publishing → Partners Portal until
  the MCP supports them.
- Twilight concepts, component and setting schemas → **salla-docs**.

## Red Flags

| Tempting thought                                                        | Why it's wrong                                                                                                                                               |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| "`list` worked, so themes are enabled for this partner."                | `list` isn't allowlisted. A non-enabled company lists fine and then gets 401 on `get` / `create`. Only those calls answer the question.                      |
| "It's a 401 — tell them to regenerate their token."                     | If `list` still works, the token is fine; it's the themes allowlist. Reconnecting wastes the partner's time and changes nothing.                             |
| "Several GitHub installations — I'll just take the first."              | That picks which GitHub account owns the partner's theme repo. It's the partner's decision, and a wrong pick means a repo in the wrong place.                |
| "Create timed out — retry it."                                          | Create isn't idempotent: a retry can leave a second theme and a second repo. `list` first to see whether the first call landed.                              |
| "The theme costs 250, that's what they chose."                          | 250 is forced server-side on every new theme. Reporting it as the partner's price misleads them into publishing at the wrong price.                          |
| "No tool for settings — I'll send the updated settings some other way." | Out of scope for the MCP today, and the Portal's settings write replaces the **whole** settings array — a partial write wipes the rest. Route to the Portal. |

## References

- [theme-api-notes.md](references/theme-api-notes.md) — field constraints, the full error
  decision table, what `twilight.json` holds, and why the not-yet-supported writes are risky.
  Load it at Step 4, or whenever a call returns something this skill doesn't describe.

## Cross-links

- **salla-storefront-ui** — native styling for an **app's** UI drawn inside a storefront theme.
- **salla-snippets** — storefront JavaScript injected by an app.
- **salla-docs** — Twilight and theme documentation.
- **salla-app-expert** — back to the router when the task isn't a theme.
