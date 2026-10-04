# Step — App Config (scopes / webhooks)

Owner: **salla-app-auth** (scopes) + **salla-webhooks** (webhook transport). This is **NOT an
`app_publish set` section** — scopes/webhooks are set with their own tools and are **snapshotted**
into the publication automatically. The server readiness has no "app_config" section.

## Data retrieval

`app_publish action=get` and `salla_apps action=get` both return **`webhook_config`** — the same
object, also attached to `app_publish validate` / `send_publish_request`. It relates the three
webhook configs a public app can have:

| State              | Path                                | Who gets it                                                                          |
| ------------------ | ----------------------------------- | ------------------------------------------------------------------------------------ |
| Development        | `webhook_config.development`        | what `connect` / `salla_events subscribe` edit — demo stores get it **immediately**. |
| Latest publication | `webhook_config.latest_publication` | the newest publication row (`status`): what the next approval would ship.            |
| Approved (live)    | `webhook_config.approved`           | merchants' **live stores**, until the next publication is **approved**.              |

`development` carries `webhook_url` (`null` only when genuinely unset), `webhook_security_strategy`
(`signature` \| `token` \| `none`), `subscribed_events` (slugs; app events auto-deliver) and
`webhook_header_keys` (keys only). The other two add `differs_from_development` — the field names
that differ: `webhook_url`, `webhook_security_strategy`, `webhook_secret`, `subscribed_events`,
`webhook_headers`. OAuth scopes are `get.scopes`; the secret is `salla_apps action=get` →
`app.webhook_secret`.

**Relay `webhook_config.note`.** It already says, in plain words, what demo stores, live stores and
any publication in review get, and what to do. When you report webhooks, name the state you mean —
"development", "in review", "live" — never just "the webhook URL".

**Never judge webhooks from `publication.webhook_*`** (the draft's own fields) — that's the copy
`latest_publication` describes, refreshed only at `validate` and submit. Reporting the URL as missing
from it is the bug this rule prevents.

**If `webhook_config` is `{ unavailable }`**, retry with `salla_apps action=get`; if it's still
unavailable, say the webhooks **couldn't be checked**. Never report them as missing.

### Reading the states

- `latest_publication` and `approved` are `null` for a **private** app (every store uses development
  at once) and `approved` is `null` **before the first approval** (stores use development).
- `approved.differs_from_development` not empty → demo stores already get the change, live stores
  don't. Tell the partner it reaches live stores only after a new publish request (`validate` →
  partner review → `send_publish_request`) is approved. Never say a `connect` change is live for
  merchants until then.
- `approved.not_compared` lists fields this response doesn't carry for the approved row (events and
  headers when a newer publication exists). Changes to them also need approval — say so; don't claim
  they match.
- `approved.webhook_secret` (present only when the secret was created/rotated after the last
  approval) is what live stores still sign with. The partner's server must accept **both** it and the
  current secret until the new publication is approved — dropping it rejects every live-store
  delivery (401). Set it as `SALLA_WEBHOOK_SECRET_PREVIOUS` (**salla-webhooks** secret-sync gate);
  never print either secret.
- `latest_publication.status`:
  - `draft` — a stale copy is fine; `validate`/submit refresh it from development.
  - `submitted` / `prelaunch` / `reviewing` / `reviewed` with `differs_from_development` → the review
    carries an **older** config. To ship the current one: `app_publish action=withdraw`, then
    `validate` and submit again — or publish again after approval. Ask the partner which.
  - `approved` with `is_approved: true` → it is the live row (`approved` then compares every field).
  - `rejected` / `withdrawn` → no effect on live stores.
- OAuth scopes follow the same rule: a public app's live stores get the approved publication's
  scopes until the next approval.

### At each step

| Step                                 | Tell the partner                                                                                     |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| `connect` / `salla_events subscribe` | relay `_publication_note`: saved to development; what live stores and any review still get.          |
| `app_publish get` (resume / review)  | the three states from `webhook_config`, before changing anything.                                    |
| `app_publish validate`               | what this draft will ship (development) next to what live stores use now (`approved`).               |
| before `send_publish_request`        | confirm the development webhook config is the one to ship — it's what submit snapshots.              |
| after `send_publish_request`         | live stores switch on approval; keep accepting `approved.webhook_secret` until then if it's present. |

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
After changing any of them, read them back (`webhook_config.development` on `app_publish action=get`
or `salla_apps action=get`) and flag one as missing only when that value is empty.
