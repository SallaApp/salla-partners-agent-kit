# Theme API notes

Reference for [salla-theme-builder](../SKILL.md). Load at Step 4, or when a `salla_themes`
call returns something the skill doesn't describe.

## Create — what the Portal validates

| Field             | Portal rule                                                     | Notes                                                                              |
| ----------------- | --------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `name`            | Required per locale (`ar` + `en`), string, ≤ 50                 | The tool sends `{ en: name, ar: name_ar ?? name }` — a plain string would 422.     |
| `author_email`    | Required, email, ≤ 255                                          | Support email shown for the theme.                                                 |
| `installation_id` | Required; must be one of the company's GitHub App installations | The tool resolves it when exactly one exists.                                      |
| `type`            | `store` · `landing` · `bundle`; defaults to `store`             | Enumerated in the tool schema — anything else is rejected before the call.         |
| `theme_url`       | Optional URL, ≤ 255                                             |                                                                                    |
| `public`          | Optional boolean; defaults to public                            |                                                                                    |
| `categories`      | Optional, 1–3 existing theme category ids                       | No MCP lookup exists for theme categories — use ids the partner supplies, or omit. |

**Server-side, not from input:** every new theme gets `price = 250`, and the company's mobile
number as `author_mobile`. Creating also initialises the theme's GitHub repository, so a create
is never safe to repeat blindly.

## Error decision table

| Call             | What comes back                                    | Meaning                                              | Do                                                                          |
| ---------------- | -------------------------------------------------- | ---------------------------------------------------- | --------------------------------------------------------------------------- |
| `list`           | 401 / 403 themes message                           | Session expired — `list` is not behind the allowlist | Partner reconnects the connector; retry.                                    |
| `get` / `create` | 401 / 403 themes message, while `list` still works | Company not on the `theme_allowed_users` allowlist   | Stop. Partner asks Salla to enable themes. Reconnecting won't help.         |
| `create`         | "no GitHub App installation" + install URL         | No installation to own the repo                      | Give the partner the URL; retry after they install.                         |
| `create`         | "N GitHub App installations … one of: …"           | Repo owner is ambiguous                              | Ask the partner which account; retry with `installation_id`.                |
| `create`         | Tool error listing field problems (422)            | A Portal validation rule failed                      | Fix the named field with the partner — don't guess a value to make it pass. |
| any              | "Salla Portal error (5xx) on salla_themes"         | Portal-side failure                                  | For `create`, run `list` before retrying — the first call may have landed.  |

## What `github_config` returns

The theme's `twilight.json`, straight from its repository, plus branch info:

- **`components`** — each has a `key` (a uuid), a `path` (the page/placement, e.g.
  `home.hero`), a localized `title`, and `fields` (its schema, which may nest `collection`
  fields). A component's template lives in the repo at `src/views/components/<path>.twig`.
- **`settings`** — the theme's global settings: `id`, `type`, `label`, `format`, and the
  current value.
- **`twilight_json`** — the full document, for anything else it declares.

## Not yet in the MCP

These exist in the Partners Portal but have no `salla_themes` action in this kit version.
Route the partner to the Portal (or the Salla CLI for local development) rather than
improvising — several are easy to get destructively wrong:

- **Details, support contact, price, visibility options.** Spread over separate Portal endpoints,
  and the support-contact and options writes each require _all_ of their fields — a partial
  update is rejected, and a naive "fill the rest with blanks" would overwrite real values.
- **Components.** Writes are commits to the theme's repository. Creating one also creates its
  `.twig` file; changing a component's field schema can break stores already using the theme.
- **Global settings.** The Portal's settings write **replaces the entire settings array** —
  sending only the setting you mean to change deletes every other one.
- **Publishing and preview stores.** Publishing submits the theme for Salla review; it is not an
  instant visibility change.
