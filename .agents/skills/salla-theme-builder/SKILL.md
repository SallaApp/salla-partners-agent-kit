---
name: salla-theme-builder
description: >
  Partner-side Salla Twilight themes through the `salla_themes` MCP tool — find and
  inspect themes, create one, edit its details, price, media, components and global
  settings, and submit it for publication. Use when a partner wants to start, find,
  change, or publish a Salla theme. Not an app listing's "App Theme" category →
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

- **Use this skill** to list, inspect, create, edit or publish a partner's Twilight theme.
- **Three paths:** _Inspect_ → Step 1, then Steps 2–3. _Create_ → Step 1, then Step 4.
  _Edit or publish_ → Steps 1–3, then Steps 5–7.
- **Hand-offs:** an app listing's "App Theme" / "App Impact" category →
  `salla-publication-consistency`; app UI inside a storefront → `salla-storefront-ui`;
  Twilight concepts and schemas → `salla-docs`.

## What `salla_themes` covers

Every theme task is one action on `salla_themes`: reads (`list`, `get`, `github_config`,
`categories`, `components`, `component_get`, `settings`, `screenshots`, `publishing`, the store
lists) and writes
— `create` (Step 4), `update_details` and `screenshot_*` (Step 5), `component_*` and
`settings_update` (Step 6), `publish`, `publish_withdraw`, `set_status` and the store families
(Step 7). The theme's
own code is not the MCP's: that is the Salla CLI (`salla theme …`).

Every write changes the partner's live theme — component and settings writes are **commits to its
GitHub repository**, publishing goes to Salla's review team. Read
[theme-api-notes.md](references/theme-api-notes.md) before the first write in a session.

## Step 1 — Confirm the partner can reach themes

```
salla_themes action=list
```

- **Succeeds** (even empty) → the session is valid and the user has the theme permission.
- **401** → the MCP session expired. The partner reconnects the connector, then retry.
- **403** → this user's Portal role lacks `manage-themes` (`manage-bundles` for bundles). The
  company owner grants it in the Partners Portal; reconnecting will not help.

> `list` is **not** behind the themes allowlist, so success here does **not** prove this company
> can open or create themes. `get` and `create` show that.

**Gate:** "`list` succeeded in this session?"

## Step 2 — Find the theme

Narrow the list rather than paging blindly, then read the record:

```
salla_themes action=list q="<name>" status=development|live|archive type=store|landing|bundle
# `published` is accepted but the Portal's list filter ignores it
salla_themes action=get theme_id=<id>
```

Take `theme_id` from that result or from the partner (e.g. a Portal URL). If `get` returns **401
while `list` still works**, the session is fine and this company is **not enabled for themes** —
the `theme_allowed_users` allowlist. Stop and tell the partner to ask Salla to enable it;
retrying or reconnecting will not help.

**Gate:** "`theme_id` came from a `list` result or from the partner, and `get` returned it?"

## Step 3 — Read the structure before describing or changing anything

```
salla_themes action=github_config theme_id=<id>
```

Returns the theme's config file — `twilight.json`, or `twilight-bundle.json` for a bundle —
**filtered by the Portal** to `features`, `settings`, `components`, `tags` and `templates`, plus
`all_features` (store and landing themes only) and `branches`; other keys never arrive. The
Portal has no components or settings GET, so this config is the source for both — `action=components`
and `action=settings` read the same thing, narrowed to one list. Component `key`s and setting
`id`s come from here: quote them from this theme, never another.

**Gate:** "Any statement about this theme's components or settings is backed by a
`github_config` read from this session?"

## Step 4 — Create a theme

Collect the values from the partner — the fields and their Portal rules are in
[theme-api-notes.md](references/theme-api-notes.md#create--what-the-portal-enforces): `name`
(+ `name_ar`) and `author_email` are required; `type`, `theme_url`, `public` and `categories`
(from `action=categories`) are optional.

**GitHub installation.** Omit `installation_id` and the tool resolves it: one installation is used
automatically; **none** returns the GitHub App install URL to hand the partner (nothing was
created); **several** are listed, and which GitHub account owns the repo is the partner's call —
run create again with that `installation_id`.

**Confirm, then create once.** Creating makes a theme _and_ a private GitHub repository, so it
is not idempotent. Show the partner the exact values, get an explicit yes, then:

```
salla_themes action=create name="…" name_ar="…" author_email="…" type=store
```

After a timeout or an unclear error, run `salla_themes action=list q="<name>"` before
calling create again — the first call may have landed.

**Report the price as 250.** The Portal forces it on every new theme, whatever you send. Tell the
partner, and set the real one with Step 5 before publishing.

**Gate:** "Partner confirmed the values, the call ran once, and the partner was told the price
is 250 until they change it?"

## Step 5 — Edit the theme's details

```
salla_themes action=update_details theme_id=<id> price=400
```

Pass only what is changing: the tool calls just the endpoints your fields touch and merges the
rest from the record, because support contact and visibility are all-or-nothing server-side.
Bilingual fields (`description`, `support_description`, each with an `_ar` twin) keep the language
you don't touch. Price bounds: public themes 250–50000, private 1000–50000.

Preview media: upload with `salla_upload`, then `screenshot_set media_type=image file_id=<id>
title=… description=…` (add `title_ar` / `description_ar` for real Arabic; a video takes `url`
instead of `file_id`). Pass `screenshot_id` to replace an existing item rather than add another;
`screenshot_delete screenshot_id=… confirm=true` removes one.

Passing `null` clears `author_email`, `support_description` / `support_description_ar` (both
languages at once), `external_service_id`, `old_price` (which clears the discount) and the two
discount dates. Every other field keeps its value once set, and omitting a field always leaves it
alone. A theme with nothing on record to merge
refuses the call instead: the first support edit carries
`theme_url`, `author_mobile`, `livechat_url` and `documentation_url` together (likewise `price`
and `description`), and the tool names what is missing. If a later endpoint fails after an earlier
one saved, the result says what landed — re-run with only the rest. There is no version check
between the read and the write, so a dashboard edit made in between is overwritten.

**Gate:** "Every value came from the partner, and anything reported as saved was not resent?"

## Step 6 — Components and settings (these commit to GitHub)

```
salla_themes action=components theme_id=<id>
salla_themes action=settings theme_id=<id>
```

Read first — both live in `twilight.json`, and both writes replace what is there.

- **Settings.** `settings_update` merges onto the current list — pass only the settings you are
  changing, and name deletions in `remove`. A write that would drop a setting you did not name is
  refused, because the Portal endpoint replaces the whole array. `replace_all: true` submits your
  array verbatim; the drop check still applies.
- **Components.** `component_create` needs `title`, `icon` and `path` (e.g. `home.hero`, which
  becomes `src/views/components/home/hero.twig` — letters, digits, dot, dash and underscore only,
  no slashes and no `.twig`). The Portal always seeds `fields: []`, so the schema comes from
  `component_update component_key=<the key from action=components> fields=…`, which is **proposed
  first** and needs `confirm: true` — stores already running the theme read those fields.
  `component_delete component_key=… confirm=true` also deletes the `.twig` file.

`component_update` (and Step 7's `preview_store_set`) are not version-checked either: a change
made in the dashboard between the read and the write is overwritten, exactly like Step 5.

**Gate:** "The partner saw the exact change, and any `confirm: true` was their decision, not mine?"

## Step 7 — Publish

```
salla_themes action=publishing theme_id=<id>
salla_themes action=publish theme_id=<id> update_note="<what changed, 25+ chars>" confirm=true
```

Publish is **refused** unless the theme has at least one category, a price above 0, 4 or more
screenshots, no submission already in flight, and the company's ID and services certificate are
verified. Read `publishing` and `screenshots` first; the refusal names the failing rule.

**Publishing is a review request, not a go-live:** it submits the version to Salla's review team
and freezes it from edits until they act, and `publish_withdraw` pulls it back. `set_status` (development | live | archive |
published) needs `confirm: true` — "live" puts the theme in front of merchants, "archive" takes it
out. `publish_withdraw` has its own 403, `has_no_submissions`, when nothing is in flight — that is
not a permissions problem either. `update_details is_public=…` controls marketplace visibility. For the demo stores merchants
browse: `sample_store_set` adds one, or with `sample_store_id` (from `action=get` →
`sample_stores[].id`) fully replaces it — `store_id` comes from `action=sample_stores`, which
lists what is available to add.

**Gate:** "Preconditions checked, partner confirmed the update note or the status change, and was
told publishing goes to review rather than live?"

## Step 8 — Hand off

After a successful create, run `salla_themes action=get theme_id=<new id>` and give the partner the
`theme_id` and its `repo`. Then: anything the MCP covers → Steps 5–7; the theme's own code →
Salla CLI (`salla theme …`); Twilight concepts and schemas → **salla-docs**.

## Red Flags

| Tempting thought                                                    | Why it's wrong                                                                                                                                                                                                                |
| ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "A theme is an app, so the app flow applies." (Step 1)              | A theme is a GitHub repository of Twilight templates: no OAuth, no install webhooks, no App Settings, and it is published from the Partners Portal — `app_publish` is the App Store listing flow. Stay on this skill's steps. |
| "`list` worked, so themes are enabled for this partner." (Step 1)   | `list` isn't allowlisted. A non-enabled company lists fine and then gets 401 on `get` / `create`. Only those calls answer the question.                                                                                       |
| "It's a 401 on `get` — tell them to reconnect." (Step 2)            | If `list` still works, the session is fine; it's the themes allowlist. Reconnecting wastes the partner's time and changes nothing.                                                                                            |
| "It's a 403 — the session expired." (Step 1)                        | A 403 is the user's role missing `manage-themes`. Only the company owner can fix it; reconnecting changes nothing.                                                                                                            |
| "Several GitHub installations — I'll just take the first." (Step 4) | That picks which GitHub account owns the partner's theme repo. It's the partner's decision, and a wrong pick means a repo in the wrong place.                                                                                 |
| "Create timed out — retry it." (Step 4)                             | Create isn't idempotent: a retry can leave a second theme and a second repo. `list` with `q` first to see whether the first call landed.                                                                                      |
| "The theme costs 250, that's what they chose." (Step 4)             | 250 is set server-side on every new theme. Reporting it as the partner's chosen price misleads them into publishing at the wrong price.                                                                                       |
| "I'll send just the setting they changed." (Step 6)                 | The Portal replaces the whole settings array, so everything you leave out is deleted from `twilight.json`. `settings_update` merges for you — never hand-build the full array.                                                |
| "The field change is small, I'll confirm it myself." (Step 6)       | Stores already running the theme read those fields; a rename or removal breaks their pages. The confirmation is the partner's to give.                                                                                        |
| "They asked to publish, so the theme goes live." (Step 7)           | `publish` submits to Salla's review team and freezes that version from edits. Say so before running it, or the partner is surprised twice.                                                                                    |

## References

- [theme-api-notes.md](references/theme-api-notes.md) — Portal validation notes, the full error
  decision table, what `github_config` returns, and the per-action write rules behind Steps 5–7
  (limits, required fields, merge vs replace). Load it at Step 4, before the first write, or
  whenever a call returns something this skill doesn't describe.

## Cross-links

- **salla-storefront-ui** — native styling for an **app's** UI drawn inside a storefront theme.
- **salla-snippets** — storefront JavaScript injected by an app.
- **salla-docs** — Twilight and theme documentation.
- **salla-publication-consistency** — an app listing's "App Theme" / "App Impact" category.
- **salla-app-expert** — back to the router when the task isn't a theme.
