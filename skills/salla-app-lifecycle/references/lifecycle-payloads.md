# App Lifecycle — Payload Reference

Source: https://docs.salla.dev/421413m0.md — confirm exact fields there before depending
on them.

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

`merchant` is your DB key for the store. Do not use `created_at` + `event` + `merchant`
as the only idempotency key because `created_at` has second-level resolution. Add a stronger
discriminator when the payload offers one, such as `subscription_id`, or hash the raw body.

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

Apply `data.settings` to your stored per-merchant configuration.

---

## app.trial._ and app.subscription._

These share the subscription payload shape (they fire for **plans and addons**).
`data.item_type` is `"plan"` or `"addon"`; `data.item_slug` is `null` for plans and the
addon identifier for addons.

```json
{
  "event": "app.subscription.started",
  "merchant": 1234509876,
  "created_at": "…",
  "data": {
    "subscription_id": 657032372,
    "item_type": "plan",
    "item_slug": null,
    "plan_name": "Yearly",
    "plan_type": "recurring",
    "plan_period": "yearly",
    "start_date": "2022-05-23",
    "end_date": "2023-05-23",
    "renew_date": "2023-05-23",
    "price": 20,
    "tax": 3,
    "total": 23,
    "initialization_cost": 0,
    "coupon": null,
    "quantity": 1,
    "features": [{ "key": "messages", "quantity": 1000 }],
    "store_type": "live"
  }
}
```

| Field                   | Notes                                                               |
| ----------------------- | ------------------------------------------------------------------- |
| `subscription_id`       | Subscription identifier                                             |
| `item_type`             | `"plan"` \| `"addon"`                                               |
| `item_slug`             | `null` for plans; addon identifier for addons                       |
| `plan_name`             | e.g. `"Yearly"`; trials commonly `"trail"`                          |
| `plan_type`             | `recurring` \| `one_time` (also seen: `free`, `once`, `on_demand`)  |
| `plan_period`           | e.g. `monthly` / `yearly`                                           |
| `start_date`/`end_date` | dates (nullable depending on plan)                                  |
| `renew_date`            | present on `app.subscription.renewed`                               |
| `price`/`tax`/`total`   | amounts (no currency field in the payload)                          |
| `features[]`            | array of `{ key, quantity }` entitlements                           |
| `store_type`            | `development` \| `demo` \| `live` — skip revenue logic for non-live |

Trial events (`app.trial.started` / `.expired` / `.canceled`) use the same envelope; the
trial typically appears as a zero-price `plan_type` like `once` with `plan_name: "trail"`.
Per-event field detail → confirm in https://docs.salla.dev/421413m0.md and see
**salla-app-billing**.
