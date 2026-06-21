# Subscription & Trial — Payload Reference

Source: https://docs.salla.dev/421413m0.md — confirm exact fields there. The same payload
family covers plans and addons; `item_type` distinguishes them. The payloads below are
**illustrative**; confirm the exact shapes (and any new fields) via the Partners MCP
(`salla_events action=list`) or the docs link above before coding.

> These are the **webhook event** payloads. To **read** a merchant's current subscription
> detail (plan state, entitlements, `subscription_balance`) the authoritative API is the
> App Subscription Details endpoint `GET /apps/{app_id}/subscriptions`
> (https://docs.salla.dev/5401098e0.md); to **write** the usage balance, the Update
> Subscription Balance endpoint `POST /apps/balance`
> (https://docs.salla.dev/5401099e0.md), both on `https://api.salla.dev/admin/v2`. See
> salla-app-billing Steps 5 and 5b.

> **Security — these are billing events.** A subscription/trial payload grants or revokes
> paid access, so treat it as untrusted until proven authentic. **Verify the webhook
> signature and enforce idempotency before mutating any entitlement** — transport security
> (signature verification, replay protection, fast 2xx) is owned by **salla-webhooks**;
> token/OAuth handling by **salla-app-auth**. Never grant or revoke access from a
> client-reported plan state — only a verified server-side event (or the reconciled
> Partners API in salla-app-billing Step 5) is authoritative.

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

| Field                   | Notes                                                                                |
| ----------------------- | ------------------------------------------------------------------------------------ |
| `subscription_id`       | Subscription identifier                                                              |
| `item_type`             | `"plan"` \| `"addon"`                                                                |
| `item_slug`             | `null` for plans; addon identifier for addons                                        |
| `plan_name`             | e.g. `"Yearly"` (`"trail"` in docs samples is a sample artifact — never match on it) |
| `plan_type`             | `free` \| `once` \| `recurring` \| `on_demand`                                       |
| `plan_period`           | `monthly` / `yearly` / …                                                             |
| `start_date`/`end_date` | dates (nullable depending on plan type)                                              |
| `renew_date`            | present on `app.subscription.renewed`                                                |
| `price`/`tax`/`total`   | amounts (no currency field in the payload)                                           |
| `initialization_cost`   | one-time setup fee                                                                   |
| `coupon`                | applied coupon, or `null`                                                            |
| `quantity`              | seats / units                                                                        |
| `features[]`            | `{ key, quantity }` entitlements granted by the plan                                 |
| `store_type`            | `development` \| `demo` \| `live` — skip revenue logic if not live                   |

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

Filter on `data.item_type`:

- `"plan"` → handle here (salla-app-billing).
- `"addon"` → **entitlement activation** (recording the addon and unlocking its
  `features[]` from the verified event) is owned by salla-app-billing; the **purchase UX**
  (in-app/embedded buy flow) lives in salla-addon-purchase /
  salla-addon-purchase-embedded.
