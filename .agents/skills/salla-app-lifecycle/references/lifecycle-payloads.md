# App Lifecycle — Payload Reference

Source of truth: the App Events doc — https://docs.salla.dev/421413m0.md. The payload
shapes below (including the trial vs subscription field differences) are taken from that
doc. Event slugs are verified against the Partners MCP (`salla_events action=list`).

> The token, id, and date **values** in the JSON below are placeholders from the doc, shown
> to illustrate shape only. Treat real payload tokens as secrets — keep them out of logs and
> source (signature verification → **salla-webhooks**; encrypting tokens at rest →
> **salla-app-auth**).

Every event uses the standard webhook envelope:

```json
{
  "event": "<event.name>",
  "merchant": 1234509876,
  "created_at": "2022-12-31 12:31:25",
  "data": {
    /* event-specific */
  }
}
```

`merchant` is your DB key for the store. For idempotency, key on a stable discriminator from
the payload (e.g. `subscription_id`) or a hash of the raw body — `created_at` is
second-resolution, so `merchant` + `event` + `created_at` alone can collide.

---

## app.store.authorize

Fired on first install **and** on every app update (after `app.updated`). Always upsert.

```json
{
  "event": "app.store.authorize",
  "merchant": 1234509876,
  "created_at": "2022-12-31 12:31:25",
  "data": {
    "access_token": "KGsnBcNN...",
    "expires": 1634819484,
    "refresh_token": "fWcceFWF...",
    "scope": "settings.read branches.read offline_access",
    "token_type": "bearer"
  }
}
```

| Field           | Type   | Notes                                             |
| --------------- | ------ | ------------------------------------------------- |
| `access_token`  | string | OAuth 2.0 access token for Merchant API calls     |
| `expires`       | number | **Unix timestamp** — multiply by 1000 for JS ms   |
| `refresh_token` | string | **Single-use** — store immediately, never discard |
| `scope`         | string | Space-separated granted scopes                    |
| `token_type`    | string | OAuth 2.0 token type, always `"bearer"`           |

Handling rules (single-use refresh token, mutex on refresh) → **salla-app-auth**.

---

## app.installed / app.updated / app.uninstalled

```json
{ "event": "app.installed",   "merchant": 1234509876, "created_at": "…", "data": { } }
{ "event": "app.updated",     "merchant": 1234509876, "created_at": "…", "data": { } }
{ "event": "app.uninstalled", "merchant": 1234509876, "created_at": "…", "data": { } }
```

- `app.installed` — provision resources/defaults.
- `app.updated` — signal only; wait for the `app.store.authorize` that follows for tokens.
- `app.uninstalled` — clean up merchant data per retention/GDPR policy.

---

## app.settings.updated

```json
{
  "event": "app.settings.updated",
  "merchant": 1234509876,
  "created_at": "…",
  "data": { "settings": { "apiKey": "…", "webhookUrl": "…" } }
}
```

`data.settings` keys are whatever **you** defined in your app's settings schema — the
`apiKey` / `webhookUrl` above are arbitrary examples, not Salla-defined fields. Apply them
to your stored per-merchant configuration; schema design is owned by **salla-app-settings**.

---

## app.subscription.\*

Fired for **both plans and addons** (`app.subscription.started` / `.renewed` / `.expired`
/ `.canceled`). `data.item_type` is `"plan"` or `"addon"`; `data.item_slug` is `null` for
plans and the addon identifier for addons. Per the App Events doc, the subscription payload
carries the full billing detail (pricing, tax, coupon, features). Example (plan
subscription, from https://docs.salla.dev/421413m0.md):

```json
{
  "event": "app.subscription.started",
  "merchant": 1234509876,
  "created_at": "2022-12-31 12:31:25",
  "data": {
    "id": 6789012345,
    "subscription_id": 1510766049,
    "item_type": "plan",
    "item_slug": null,
    "quantity": 1,
    "app_name": "Shipping app",
    "description": "App Description",
    "app_type": "app",
    "categories": ["Marketing"],
    "plan_type": "recurring",
    "plan_name": null,
    "plan_period": "1",
    "start_date": "2021-10-09T21:00:00.000000Z",
    "end_date": "2022-10-09T21:00:00.000000Z",
    "coupon": { "name": "SPZGRDFS", "amount": "0.15" },
    "initialization_cost": 10,
    "price_before_discount": 5,
    "price": "20.00",
    "tax": "0.15",
    "tax_value": "3.00",
    "total": "23.00",
    "subscription_balance": "null",
    "features": [
      { "key": "Feature1", "quantity": 1 },
      { "key": "Feature3", "quantity": 5 }
    ],
    "store_type": "development"
  }
}
```

| Field                             | Notes                                                                                                |
| --------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `id`                              | App id                                                                                               |
| `subscription_id`                 | Subscription identifier — good idempotency discriminator                                             |
| `item_type`                       | `"plan"` \| `"addon"`                                                                                |
| `item_slug`                       | `null` for plans; addon identifier for addons                                                        |
| `quantity`                        | Purchased quantity (e.g. addon units)                                                                |
| `plan_type`                       | e.g. `recurring` \| `one_time`                                                                       |
| `plan_name`                       | **Free string** — any plan name; `null` is valid. Match by your own plan definitions, never hardcode |
| `plan_period`                     | Billing period, e.g. `"1"` (nullable)                                                                |
| `start_date`/`end_date`           | ISO dates (nullable depending on plan)                                                               |
| `renew_date`                      | present **only** on `app.subscription.renewed`                                                       |
| `coupon`                          | `{ name, amount }` or absent                                                                         |
| `initialization_cost`             | One-off setup cost                                                                                   |
| `price_before_discount`           | Pre-discount price (nullable)                                                                        |
| `price`/`tax`/`tax_value`/`total` | amounts as strings (no currency field in the payload)                                                |
| `subscription_balance`            | Remaining balance                                                                                    |
| `features[]`                      | array of `{ key, quantity }` entitlements                                                            |
| `store_type`                      | `development` \| `demo` \| `live` — skip revenue logic for non-live                                  |
| `promotion`                       | `{ id, requirement, reward }` when a promotion applied (start only)                                  |

`renewed` adds `renew_date`. Addon payloads set `item_type: "addon"` + `item_slug` and may
null out `plan_period` / `start_date` / `end_date` for one-time addons. Full per-event JSON
(plan **and** addon variants) → https://docs.salla.dev/421413m0.md and **salla-app-billing**.

## app.trial.\*

The trial payload is smaller than the subscription one. Per the App Events doc,
`app.trial.started` carries exactly the fields below — read only these on a trial event.
The subscription-only fields it omits: `subscription_id`, `item_type`, `item_slug`,
`quantity`, `plan_period`, `coupon`, `price`/`tax`/`total`, `subscription_balance`,
`promotion`.

```json
{
  "event": "app.trial.started",
  "merchant": 1234509876,
  "created_at": "2022-12-31 12:31:25",
  "data": {
    "id": 6789012345,
    "app_name": "Shipping app",
    "app_description": "App Description",
    "app_type": "app",
    "categories": ["Accounting & Finance"],
    "plan_name": "Diamond Plan",
    "plan_type": "one_time",
    "start_date": "2023-07-27",
    "end_date": "2023-07-28",
    "created_at": "2023-07-27 12:23:19",
    "features": [],
    "store_type": "development"
  }
}
```

| Field                   | Notes                                                                                                                             |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `id`                    | App id                                                                                                                            |
| `plan_name`             | **Free string** — any plan name; can be `null` (e.g. on `app.trial.canceled`). Match by your own plan definitions, never hardcode |
| `plan_type`             | e.g. `one_time` \| `recurring`                                                                                                    |
| `start_date`/`end_date` | trial window (date or ISO datetime, depending on event)                                                                           |
| `features[]`            | array of `{ key, quantity }` entitlements (may be empty)                                                                          |
| `store_type`            | `development` \| `demo` \| `live`                                                                                                 |

`app.trial.canceled` additionally carries `subscription_at`; `app.trial.expired` omits
`created_at` and `features`. Branch on the **event name** and `store_type`. Source of truth
for the exact per-event shape: https://docs.salla.dev/421413m0.md. Plan-state handling →
**salla-app-billing**.
