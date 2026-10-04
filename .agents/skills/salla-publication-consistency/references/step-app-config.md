# Step — App Config (scopes / webhooks)

Owner: **salla-app-auth** (scopes) + **salla-webhooks** (webhook transport). This is **NOT an
`app_publish set` section** — scopes/webhooks are set with their own tools and are **snapshotted**
into the publication automatically. The server readiness has no "app_config" section.

## Data retrieval

Read the **live** values — `app_publish action=get` returns them under `webhooks` (the same
fields are on `salla_apps action=get` → `app`):

| Field             | Path                                           | Notes                                                |
| ----------------- | ---------------------------------------------- | ---------------------------------------------------- |
| OAuth scopes      | `get.scopes`                                   | `{slug → "read" \| "read_write" \| ""}`.             |
| Webhook URL       | `get.webhooks.webhook_url`                     | the receiver; `null` only when genuinely unset.      |
| Security strategy | `get.webhooks.webhook_security_strategy`       | `signature` \| `token` \| `none`.                    |
| Webhook secret    | `salla_apps action=get` → `app.webhook_secret` | created/rotated in the Portal; read, never set here. |
| Subscribed events | `get.webhooks.subscribed_events`               | event slugs (app events auto-deliver).               |
| Custom headers    | `get.webhooks.webhook_header_keys`             | header keys only (values can be secrets).            |

**Never judge these from `publication.webhook_*`.** The draft's webhook fields are a copy the
Portal refreshes at `validate` and **submit** — right after a `connect` they're stale or empty.
Reporting the webhook URL as missing from `publication.webhook_url` is the bug this rule prevents.

**If the webhook config can't be read** — `webhooks` is missing/null, carries `unavailable`, or
`salla_apps action=get` returns `webhook_config_unavailable` — retry with `salla_apps action=get`;
if it's still unavailable, say the webhook config **couldn't be checked**. Never report it as missing.

### Development vs published vs draft

A public app has up to three webhook configs. Name which one you mean:

| Config      | Where                        | Who uses it                                                             |
| ----------- | ---------------------------- | ----------------------------------------------------------------------- |
| Development | `get.webhooks.*` (top level) | what `connect`/`subscribe` edit — demo stores get it **immediately**.   |
| Published   | `get.webhooks.published`     | merchants' **live stores**, until the next publication is **approved**. |
| Draft       | `publication.webhook_*`      | a copy taken at `validate`/submit; becomes Published on approval.       |

- `published` is `null` for a private app (live stores use the development config directly) or
  before the first approval.
- `published` carries the approved publication's URL, strategy and secret (from `app.publication`)
  only — subscribed events and headers aren't compared, but changes to them also reach live stores
  only on approval. After changing events or headers on a published app, say so; don't claim they're
  live for merchants.
- `published_differs: true` → the development URL/strategy/secret changed after the last approval:
  demo stores already get the new config, live stores still get the old one. Tell the
  partner, and that it reaches live stores only after a new publish request (`validate` → partner
  review → `send_publish_request`) is approved. Never say a `connect` change is live for merchants
  until then.
- `published.webhook_secret_differs: true` → the secret was created/rotated after the last approval,
  so live stores still sign with the approved secret, returned as `published.webhook_secret`. The
  partner's server must accept **both** it and the current secret until the new publication is
  approved — dropping it rejects every live-store delivery (401). Set it as
  `SALLA_WEBHOOK_SECRET_PREVIOUS` (**salla-webhooks** secret-sync gate); never print either secret.
- OAuth scopes follow the same rule: a public app's live stores get the approved publication's
  scopes until the next approval.

## Submission schema

Not submitted via `app_publish`. Use the owning tools:

| What                         | Tool                                                                                                                       |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Scopes (minimum needed)      | `salla_scopes action=set` → **salla-app-auth**                                                                             |
| Webhook url/strategy/headers | `salla_apps action=connect` → **salla-webhooks**                                                                           |
| Webhook secret               | create/rotate in the Portal; read via `salla_apps action=get`                                                              |
| Store-event subscriptions    | `salla_events action=subscribe` (store events only — `order.*`, `product.*`; app events auto-deliver to the `webhook_url`) |

## How to submit

Finalize these **before** the publish request — the Portal copies them into the publication at
`validate` and submit, and live stores switch to them only when that publication is approved.
After changing any of them, read them back live (`app_publish action=get` → `webhooks`, or
`salla_apps action=get`) and flag one as missing only when the live value is empty.
