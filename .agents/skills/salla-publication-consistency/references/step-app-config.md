# Step — App Config (scopes / webhooks)

Owner: **salla-app-auth** (scopes) + **salla-webhooks** (webhook transport). This is **NOT an
`app_publish set` section** — scopes/webhooks are set with their own tools and are **snapshotted**
into the publication automatically. The server readiness has no "app_config" section.

## Data retrieval

Read current values from `app_publish action=get`:

| Field             | Path                                       | Notes                                                |
| ----------------- | ------------------------------------------ | ---------------------------------------------------- |
| OAuth scopes      | `get.scopes` (or `publication.scopes`)     | `{slug → "read" \| "read_write" \| ""}`.             |
| Webhook URL       | `publication.webhook_url`                  | the receiver.                                        |
| Security strategy | `publication.webhook_security_strategy`    | `signature` \| `token` \| `none`.                    |
| Webhook secret    | `publication.webhook_secret`               | created/rotated in the Portal; read, never set here. |
| Subscribed events | `publication.webhooks` (or `get.webhooks`) | array of event ids.                                  |
| Custom headers    | `publication.webhook_headers`              | array of `{key,value}`.                              |

## Submission schema

Not submitted via `app_publish`. Use the owning tools:

| What                         | Tool                                                          |
| ---------------------------- | ------------------------------------------------------------- |
| Scopes (minimum needed)      | `salla_scopes action=set` → **salla-app-auth**                |
| Webhook url/strategy/headers | `salla_apps action=connect` → **salla-webhooks**              |
| Webhook secret               | create/rotate in the Portal; read via `salla_apps action=get` |
| Event subscriptions          | `salla_events action=subscribe`                               |

## How to submit

Finalize these **before** `app_publish action=validate` — they snapshot into the draft when it's
saved. After changing any of them, re-run `app_publish action=readiness` (re-`open` if needed).
