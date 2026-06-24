# Subscription & Trial — Payload Reference

Source: https://docs.salla.dev/421413m0.md — confirm exact fields there. These are the
**webhook event** payloads (same family for plans and addons; `item_type` distinguishes
them); the shapes below are **illustrative** — confirm them via `salla_events action=list`
or the docs link before coding. To **read** the current subscription detail use
`GET /apps/{app_id}/subscriptions` and to **write** the usage balance use
`POST /apps/balance` — see salla-app-billing Steps 5 and 5b.

> **Security — these are billing events.** Verify the webhook signature and enforce
> idempotency before mutating any entitlement; grant or revoke access only from a verified
> server event (or the reconciled Partners API), never a client-reported plan. Full trust
> model and ownership (salla-webhooks / salla-app-auth) → salla-app-billing Step 3.

---

## Shared shape

```json
{
  "event": "app.subscription.started",
  "merchant": 1234509876,
  "created_at": "2022-12-31 12:31:25",
  "data": {
    "subscription_id": 657032372,
    "item_type": "plan",
    "item_slug": null,
    "plan_name": "Yearly",
    "plan_type": "recurring",
    "plan_period": "12",
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

| Field                   | Notes                                                                                                                                                                                       |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `subscription_id`       | Subscription identifier                                                                                                                                                                     |
| `item_type`             | `"plan"` \| `"addon"`                                                                                                                                                                       |
| `item_slug`             | `null` for plans; addon identifier for addons                                                                                                                                               |
| `plan_name`             | e.g. `"Yearly"` (`"trail"` in docs samples is a sample artifact — never match on it)                                                                                                        |
| `plan_type`             | `free` \| `once` \| `recurring` \| `on_demand`                                                                                                                                              |
| `plan_period`           | plan period **in months as a string**, e.g. `"12"`; nullable. (The monthly/yearly choice is made when **defining** the plan at app creation — the webhook payload carries the month count.) |
| `start_date`/`end_date` | dates (nullable depending on plan type)                                                                                                                                                     |
| `renew_date`            | present on `app.subscription.renewed`                                                                                                                                                       |
| `price`/`tax`/`total`   | amounts (no currency field in the payload)                                                                                                                                                  |
| `initialization_cost`   | one-time setup fee                                                                                                                                                                          |
| `coupon`                | applied coupon, or `null`                                                                                                                                                                   |
| `quantity`              | seats / units                                                                                                                                                                               |
| `features[]`            | `{ key, quantity }` entitlements granted by the plan                                                                                                                                        |
| `store_type`            | `development` \| `demo` \| `live` — skip revenue logic if not live                                                                                                                          |

---

## Events in this family

| Event                       | Meaning                     | Key fields to persist          |
| --------------------------- | --------------------------- | ------------------------------ |
| `app.subscription.started`  | Plan/addon activated        | all of the above; set `active` |
| `app.subscription.renewed`  | Plan/addon renewed          | new `end_date` / `renew_date`  |
| `app.subscription.expired`  | Lapsed (no renewal)         | set `inactive`                 |
| `app.subscription.canceled` | Cancelled by merchant       | set `inactive`                 |
| `app.trial.started`         | Trial begins                | trial end; set `trial`         |
| `app.trial.expired`         | Trial ended without upgrade | set `inactive`                 |
| `app.trial.canceled`        | Trial cancelled             | set `inactive`                 |

> **App events auto-deliver — no subscribe call.** These are all `app.*` events, and the app
> is subscribed to its own app events by default, so Salla delivers the whole family
> (`started`/`renewed`/`expired`/`canceled` + `app.trial.*`) to your `webhook_url`
> automatically — whether or not a slug appears in the `salla_events action=list` catalog
> (`renewed`/`expired`/`canceled` aren't even in it). Set the `webhook_url` and HANDLE them
> all here; `salla_events action=subscribe` is for store events only (→ SKILL Step 2).

Filter on `data.item_type`:

- `"plan"` → handle here (salla-app-billing).
- `"addon"` → **entitlement activation** (recording the addon and unlocking its
  `features[]` from the verified event) is owned by salla-app-billing; the **purchase UX**
  (in-app/embedded buy flow) lives in salla-addon-purchase /
  salla-addon-purchase-embedded.
