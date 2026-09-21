# Theme API notes

Reference for [salla-theme-builder](../SKILL.md). Load at Step 4, or when a `salla_themes`
call returns something the skill doesn't describe.

## Create — what the Portal enforces

What the partner supplies, and what the Portal does with it:

| Field                | Rule                                                                                            | Notes                                                                                                                                                                        |
| -------------------- | ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `name` (+ `name_ar`) | **Required**, ≤ 50 chars, required per locale (`ar` + `en`), unique across **all** Salla themes | The tool sends `{ en: name, ar: name_ar ?? name }` — a plain string would 422. On a 422 for `name.en` / `name.ar`, the name is taken: agree a different one with the partner |
| `author_email`       | **Required**                                                                                    | Doubles as the theme's support email, editable later through `update_details`                                                                                                |
| `installation_id`    | Required integer; one of the company's GitHub App installations                                 | The tool rejects a non-numeric id and resolves it when exactly one exists                                                                                                    |
| `type`               | `store` (default) · `landing` · `bundle`                                                        | Anything else is rejected by the tool schema before the call                                                                                                                 |
| `theme_url`          | Optional marketing URL                                                                          |                                                                                                                                                                              |
| `public`             | Optional; defaults to `true`                                                                    |                                                                                                                                                                              |
| `categories`         | Optional, 1–3 existing theme category ids                                                       | From `salla_themes action=categories` (the store activities)                                                                                                                 |

**Server-side, not from input:** every new theme gets `price = 250`, and the company's mobile
number as `author_mobile`. Price bounds when it is changed later: public themes 250–50000, private
1000–50000. Creating also creates the theme's private GitHub repository, so a create is never safe
to repeat blindly.

## Error decision table

The Portal gates theme routes two different ways, and the messages differ. A **403** is the user's
role missing `manage-themes` (`manage-bundles` for bundles) — it applies to every theme route. A
**401** is the `theme_allowed_users` allowlist, and only `GithubAuthorizationMiddleware` routes
carry it: the theme record (`get`, `create`), the GitHub installation lookup `create` runs first,
and the components and settings controllers' own routes (`component_get` plus the `component_*`
writes, and `settings_update`). `update_details` and `publishing` are behind it too — not their
write endpoints, but the `GET /theme/{id}` each one opens with. The other reads — `list`,
`github_config`, `action=components` and `action=settings` (both read through `github_config`) —
plus screenshots, status and the preview/sample stores are not allowlisted, so a 401 there is the
session.

| Call                                        | What comes back                              | Meaning                                                                    | Do                                                                           |
| ------------------------------------------- | -------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `list` / `get` / `github_config` / `create` | 403 — "lacks the `manage-themes` permission" | This user's role is missing the theme permission                           | Company owner grants `manage-themes` (`manage-bundles`) in the Portal.       |
| `list` / `github_config`                    | 401 — "not behind the themes allowlist"      | Session expired                                                            | Partner reconnects the connector; retry.                                     |
| `get` / `create`                            | 401, while `list` still works                | Company not on the `theme_allowed_users` allowlist                         | Stop. Partner asks Salla to enable themes. Reconnecting won't help.          |
| `component_*` / `settings_update`           | 401, while `list` still works                | Company not on the allowlist — these writes are behind it                  | Same as the `get` / `create` 401.                                            |
| `update_details` / `publishing`             | 401 on the first call                        | Both open with `GET /theme/{id}`, which is allowlisted                     | Same as the `get` / `create` 401.                                            |
| `get` / `create`                            | 401, and `list` also 401s                    | Session expired                                                            | Partner reconnects the connector; retry.                                     |
| `create`                                    | 401 before anything was created              | The installation lookup is allowlisted too — same meaning as the row above | Same as `get` / `create` 401.                                                |
| `create`                                    | "no GitHub App installation" + install URL   | No installation to own the repo; nothing was created                       | Give the partner the URL; create again after they install.                   |
| `create`                                    | "N GitHub App installations … one of: …"     | Repo owner is ambiguous; nothing was created                               | Ask the partner which account; create again with `installation_id`.          |
| `create`                                    | Tool error listing field problems (422)      | A Portal validation rule failed                                            | Fix the named field with a value the partner confirms.                       |
| any                                         | "Salla Portal error (5xx) on salla_themes"   | Portal-side failure                                                        | For `create`, run `list` with `q`=name before retrying — it may have landed. |

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
  Portal knows — store and landing themes only, never bundles) and **`branches`**.
- **`twilight_json`** — the filtered object above, as returned.

## Write rules, per action

Every one of these is a real Portal constraint the tool works around — the point is what the agent
must still get right.

| Write               | The Portal's behaviour                                                                                                                                                                                                                                                   | What that means for you                                                                                                                                                                                                                                                                                                                                                                                    |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `update_details`    | Four endpoints (`/details`, `/support`, `/price`, `/options`). Support and options require **all** their fields on every call; `%description%` expands to required `description.ar` + `description.en`                                                                   | Pass only what changed. The tool reads the record and merges, so nothing is blanked. There is no transaction: if a later endpoint fails, the result names what already saved — resend only the rest                                                                                                                                                                                                        |
| `screenshot_set`    | `title` and `description` per locale, `type`, plus a source                                                                                                                                                                                                              | An image needs `file_id` from `salla_upload`; a video needs `url`. Never both                                                                                                                                                                                                                                                                                                                              |
| `component_create`  | Commits `twilight.json` **and** writes `src/views/components/<path>.twig`; seeds `fields: []`; duplicate `path` → 422                                                                                                                                                    | The schema comes from a follow-up `component_update`. Paths are unique per theme                                                                                                                                                                                                                                                                                                                           |
| `component_update`  | Replaces the whole component object                                                                                                                                                                                                                                      | The tool merges the current one, so omitted keys survive. A `fields` change is proposed first and needs `confirm: true` — live stores read those fields                                                                                                                                                                                                                                                    |
| `component_delete`  | Removes it from `twilight.json` and deletes the `.twig`                                                                                                                                                                                                                  | Needs `confirm: true`. Any store page using it loses that section                                                                                                                                                                                                                                                                                                                                          |
| `settings_update`   | `PUT /theme/{id}/settings` replaces the **entire** settings array                                                                                                                                                                                                        | The tool merges onto the current list; a write that would drop a setting you did not name in `remove` is refused                                                                                                                                                                                                                                                                                           |
| `publish`           | Creates a publication for Salla's review team                                                                                                                                                                                                                            | Not a go-live. Needs `confirm: true` and a 25+ character update note per locale. The version is frozen from edits until review acts; `publish_withdraw` pulls it back                                                                                                                                                                                                                                      |
| `preview_store_set` | Requires `store_id`, `category_id`, `thumbnail_id`, `color`, `is_default` on create **and** update. Capped per theme (`theme_preview_store_number`, default 4); a `store_id` may back only one preview store across **all** themes; the first one is forced `is_default` | Updating one field merges the current row. Category ids come from `action=categories`, the thumbnail from `salla_upload`. `default_preview_store` only matters from the second store onwards                                                                                                                                                                                                               |
| `sample_store_*`    | `SampleStoreRequest::prepareForValidation` fills `name` and `url` from the theme's active-store lookup and nulls `store_id` when that store isn't active. Capped at 6 per theme. Behind a Portal feature flag, like `default_preview_store`                              | Pass `store_id` (from `action=sample_stores`, which lists the stores available to **add**, paginated) and `image_id` (800×450). To replace or delete, pass `sample_store_id` from `action=get` → `sample_stores[].id`; a replace is full, nothing is merged. A 422 naming name, url and store_id means the Portal couldn't resolve the store — the tool says so. A 404 means the company lacks the feature |

Component and settings writes are **GitHub commits**, so they are slower than a DB write and
subject to GitHub rate limits. After one, re-read with `action=components` / `action=settings`
rather than assuming the previous response is still current.
