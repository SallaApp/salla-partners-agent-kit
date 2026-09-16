# Theme API notes

Reference for [salla-theme-builder](../SKILL.md). Load at Step 4, or when a `salla_themes`
call returns something the skill doesn't describe.

## Create — what the Portal enforces

The field list is in SKILL.md Step 4. This is what the Portal does with it:

| Field             | Portal rule                                                     | Notes                                                                          |
| ----------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `name`            | Required per locale (`ar` + `en`), string, ≤ 50                 | The tool sends `{ en: name, ar: name_ar ?? name }` — a plain string would 422. |
| `installation_id` | Required integer; one of the company's GitHub App installations | The tool rejects a non-numeric id and resolves it when exactly one exists.     |
| `type`            | `store` · `landing` · `bundle`                                  | Anything else is rejected by the tool schema before the call.                  |
| `categories`      | 1–3 existing theme category ids                                 | The ids come from `salla_themes action=categories` (the store activities).     |

**Server-side, not from input:** every new theme gets `price = 250`, and the company's mobile
number as `author_mobile`. Price bounds when the partner changes it later: public themes
250–50000, private themes 1000–50000. Creating also creates the theme's private GitHub
repository, so a create is never safe to repeat blindly.

## Error decision table

The Portal gates theme routes twice: a **permission** check on every theme route (403), and
the **`theme_allowed_users` allowlist** (401) on `get`, `create` and the GitHub installation
lookup that `create` runs first — but not on `list` or `github_config`.

| Call                     | What comes back                              | Meaning                                                                    | Do                                                                           |
| ------------------------ | -------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| any                      | 403 — "lacks the `manage-themes` permission" | This user's role is missing the theme permission                           | Company owner grants `manage-themes` (`manage-bundles`) in the Portal.       |
| `list` / `github_config` | 401 — "not behind the themes allowlist"      | Session expired                                                            | Partner reconnects the connector; retry.                                     |
| `get` / `create`         | 401, while `list` still works                | Company not on the `theme_allowed_users` allowlist                         | Stop. Partner asks Salla to enable themes. Reconnecting won't help.          |
| `get` / `create`         | 401, and `list` also 401s                    | Session expired                                                            | Partner reconnects the connector; retry.                                     |
| `create`                 | 401 before anything was created              | The installation lookup is allowlisted too — same meaning as the row above | Same as `get` / `create` 401.                                                |
| `create`                 | "no GitHub App installation" + install URL   | No installation to own the repo; nothing was created                       | Give the partner the URL; create again after they install.                   |
| `create`                 | "N GitHub App installations … one of: …"     | Repo owner is ambiguous; nothing was created                               | Ask the partner which account; create again with `installation_id`.          |
| `create`                 | Tool error listing field problems (422)      | A Portal validation rule failed                                            | Fix the named field with the partner — don't guess a value to make it pass.  |
| any                      | "Salla Portal error (5xx) on salla_themes"   | Portal-side failure                                                        | For `create`, run `list` with `q`=name before retrying — it may have landed. |

A successful `github_config` does not prove themes are enabled either — it is not allowlisted.
Every 401/403 message also carries the upstream body; if it names a different cause, follow it.

## What `github_config` returns

The theme's config file — `twilight.json`, or `twilight-bundle.json` for a bundle — **filtered
by the Portal**. Only these keys arrive:

- **`components`** — each has a `key` (a uuid), a `path` (the page/placement, e.g.
  `home.hero`), a localized `title`, and `fields` (its schema, which may nest `collection`
  fields). A component's template lives in the repo at `src/views/components/<path>.twig`.
- **`settings`** — the theme's global settings: `id`, `type`, `label`, `format`, and the
  current value.
- **`features`**, **`tags`**, **`templates`**, plus **`all_features`** (every feature the
  Portal knows) and **`branches`**.
- **`twilight_json`** — the filtered object above, as returned.

## Not yet in the MCP

These exist in the Partners Portal but have no `salla_themes` action in this kit version.
Route the partner to the Portal (or the Salla CLI for local development) — several are easy to
get destructively wrong:

- **Details, support contact, price, visibility options.** Spread over separate Portal endpoints,
  and the support-contact and options writes each require _all_ of their fields — a partial
  update is rejected, and a naive "fill the rest with blanks" would overwrite real values.
- **Components.** Writes are commits to the theme's repository. Creating one also creates its
  `.twig` file; changing a component's field schema can break stores already using the theme.
- **Global settings.** The Portal's settings write **replaces the entire settings array** —
  sending only the setting you mean to change deletes every other one.
- **Publishing and preview stores.** Publishing submits the theme for Salla review; it is not an
  instant visibility change.
