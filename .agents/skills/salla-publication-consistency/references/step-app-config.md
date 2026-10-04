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

**Never judge these from `publication.webhook_*`.** The draft's webhook fields are a snapshot the
Portal takes at **submit** — on a draft they're empty even after a successful `connect`. Reporting
the webhook URL as missing from `publication.webhook_url` is the bug this rule prevents.

## Submission schema

Not submitted via `app_publish`. Use the owning tools:

| What                         | Tool                                                                                                                       |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Scopes (minimum needed)      | `salla_scopes action=set` → **salla-app-auth**                                                                             |
| Webhook url/strategy/headers | `salla_apps action=connect` → **salla-webhooks**                                                                           |
| Webhook secret               | create/rotate in the Portal; read via `salla_apps action=get`                                                              |
| Store-event subscriptions    | `salla_events action=subscribe` (store events only — `order.*`, `product.*`; app events auto-deliver to the `webhook_url`) |

## How to submit

Finalize these **before** the publish request — the Portal snapshots them into the publication
at submit. After changing any of them, read them back live (`app_publish action=get` → `webhooks`,
or `salla_apps action=get`) and flag one as missing only when the live value is empty.
