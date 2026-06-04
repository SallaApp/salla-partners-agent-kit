---
name: salla-app-subscription-management
description: >
  Use this skill for any task involving Salla app plan subscriptions — defining
  pricing plans in the Partners Portal, tracking a merchant's current plan state,
  and handling renewals, trials, expiry, and cancellation. Trigger when a developer
  is: creating or configuring pricing plans (Free, Monthly, Yearly, Trial, One-Time,
  Pay As You Go), reading a merchant's subscription via the Partners API
  `GET /apps/{app_id}/subscriptions`, persisting plan state from `app.subscription.*`
  events, deciding what to unlock per plan, handling `app.subscription.renewed` /
  `.expired` / `.canceled`, mapping a plan's `features[]` to entitlements, or
  distinguishing a plan subscription from an addon subscription via `item_type`.

  Trigger also when you see: "pricing plan", "Custom Plans", "plan_type", "recurring",
  "on_demand", "app.subscription.started", "app.subscription.renewed", "subscription_id",
  "GET /apps/{app_id}/subscriptions", "plan_name", "end_date", "renew_date", "free trial",
  "Pay As You Go", or any question about how a merchant pays for an app or what plan
  they're on.

  Always use this skill before writing subscription/plan logic. Plan and addon events
  share one payload family — `item_type` distinguishes them; for addons see
  salla-addon-subscription-management and salla-addon-purchase-embedded. Lifecycle event
  wiring is in salla-app-lifecycle; feature gating in salla-subscription-system. The MCP
  (apidog-mcp-server, site-id: 451700) has live schemas — confirm before coding.
---

# Salla App Subscription Management Skill

How merchants pay for your app, and how you keep a reliable picture of each merchant's
plan. Salla owns billing — you react to events and (optionally) read the subscriptions
endpoint; you never charge cards yourself.

**MCP:** `apidog-mcp-server` (site-id: `451700`) — confirm payloads and the subscriptions
schema before coding.
**Docs:** https://docs.salla.dev/doc-421412 (Apps API) · https://docs.salla.dev/421413m0 (App Events)
**Subscriptions endpoint:** `GET /apps/{app_id}/subscriptions` (https://docs.salla.dev/api-5401098)
**Related skills:** salla-app-lifecycle (event wiring) · salla-subscription-system (gating) ·
salla-addon-subscription-management (addons).

> There is **no Merchant-API endpoint** for a store's own subscription. Plan state is
> **event-driven** (`app.subscription.*` / `app.trial.*`) and queryable from the
> **Partners API** keyed by `app_id`. Treat the events as the source of truth and the
> endpoint as reconciliation.

---

## Part 1 — Plans vs Addons

| Concept | What it is                                  | `item_type` | `item_slug`      |
| ------- | ------------------------------------------- | ----------- | ---------------- |
| Plan    | The merchant's main subscription to the app | `"plan"`    | `null`           |
| Addon   | An extra purchased on top of a plan         | `"addon"`   | addon identifier |

Both flow through the same `app.subscription.*` events. **This skill = plans.** Addons →
salla-addon-subscription-management; buying addons in-app → salla-addon-purchase-embedded.

### `plan_type` values

`free` · `once` (one-time / trial) · `recurring` (monthly/yearly) · `on_demand` (Pay As You Go).

---

## Part 2 — Defining Pricing Plans (Partners Portal)

Pricing is set during app publishing. The publish flow has six sections:
**Basic Information · App Configurations · App Features · Pricing · Contact Information ·
Service Trial.**

In **Pricing** you create plans of these types:

| Plan type     | Use                                        |
| ------------- | ------------------------------------------ |
| Free          | No charge                                  |
| Monthly       | Recurring monthly                          |
| Yearly        | Recurring yearly                           |
| Trial         | Time-boxed free access before a paid plan  |
| One-Time      | Single charge                              |
| Pay As You Go | Usage / on-demand (`plan_type: on_demand`) |
| Addon         | Extra on top of a plan (see addon skills)  |

After the app exists, the **App details** page exposes **Custom Plans** (alongside App
Keys, App Scope, Webhooks/Notifications, App Settings) for per-merchant or tailored plans.

> The exact per-field Portal steps aren't fully documented — confirm current UI via the
> MCP/docs rather than asserting field names you can't see.

---

## Part 3 — Reading a Merchant's Subscription (Partners API)

```http
GET /apps/{app_id}/subscriptions
Authorization: Bearer <token>
```

Returns the subscriptions for the app:

```json
{
  "id": "657032372",
  "item_type": "plan",
  "plan_type": "recurring",
  "plan_name": "Yearly",
  "price": 20,
  "start_date": "2022-05-23",
  "end_date": "2023-05-23",
  "quantity": 1
}
```

| Field                     | Notes                                                   |
| ------------------------- | ------------------------------------------------------- |
| `item_type`               | `"plan"` \| `"addon"` — filter to `plan` for plan state |
| `plan_type`               | `free` \| `once` \| `recurring` \| `on_demand`          |
| `plan_name`               | e.g. `"Yearly"`; trial commonly `"trail"`               |
| `price`                   | nullable                                                |
| `start_date` / `end_date` | nullable                                                |
| `quantity`                | seats/units                                             |

Use this to **reconcile** after downtime (missed a webhook) — not as your hot path.

---

## Part 4 — Tracking Plan State from Events

The events are the source of truth. Wire them via salla-app-lifecycle, branch on
`item_type === "plan"` here. Handle the **trial** family too (`app.trial.*`) — otherwise a
trial start/expiry falls through and the merchant gets the wrong gating:

```typescript
async function onSubscriptionEvent(payload: WebhookPayload) {
  const d = payload.data;
  if (d.item_type !== "plan") return; // addons handled elsewhere

  switch (payload.event) {
    case "app.subscription.started":
    case "app.subscription.renewed":
      await db.subscriptions.upsert(payload.merchant, {
        subscriptionId: d.subscription_id,
        planName: d.plan_name,
        planType: d.plan_type,
        status: "active",
        startDate: d.start_date,
        endDate: d.end_date ?? d.renew_date,
        features: d.features ?? [],
        storeType: d.store_type, // skip billing logic when !== "live"
      });
      break;

    case "app.trial.started":
      await db.subscriptions.upsert(payload.merchant, {
        planName: d.plan_name,
        status: "trial",
        startDate: d.start_date,
        endDate: d.end_date,
        features: d.features ?? [],
        storeType: d.store_type,
      });
      break;

    case "app.subscription.expired":
    case "app.subscription.canceled":
    case "app.trial.expired":
    case "app.trial.canceled":
      await db.subscriptions.update(payload.merchant, { status: "inactive" });
      break;
  }
}
```

---

## Part 5 — Renewals & Expiry

- **`app.subscription.renewed`** — confirm still active and persist the new
  `end_date` / `renew_date`. Don't assume the old end date.
- **`app.subscription.expired`** — plan lapsed (no renewal). Restrict access; consider a
  grace banner.
- **`app.subscription.canceled`** — merchant cancelled. Restrict per your policy.

Drive feature access from the stored `status` + `end_date`, not from the moment an event
arrives (events can be late or duplicated — be idempotent).

**Handle async-job failure** — you respond `200` then process the event off the request
path, so a throw in the worker (DB write, downstream call) is invisible to Salla and
won't be retried by it. Route failed jobs to a dead-letter queue, retry with backoff,
keep the retry idempotent, and alert on exhausted retries — otherwise a dropped
`renewed`/`expired` event silently leaves a merchant on the wrong plan tier. The
`GET /apps/{app_id}/subscriptions` reconciliation in Part 3 is your backstop here.

---

## Part 6 — Trials

Trials arrive as `app.trial.started` / `.expired` / `.canceled` (and as zero-price
`plan_type: once`, `plan_name: "trail"` in subscription data). On `trial.started` enable
trial-tier features and record the trial end; on `trial.expired`/`canceled` downgrade.
A converting merchant then triggers `app.subscription.started`.

---

## Part 7 — Recommended Schema

```text
subscriptions
  merchant_id      (PK / FK)
  subscription_id
  item_type        'plan'
  plan_name
  plan_type        free | once | recurring | on_demand
  status           active | inactive | trial
  start_date
  end_date
  features         json   // [{ key, quantity }]
  store_type       development | demo | live
  updated_at
```

Map `features[]` → entitlements and enforce them via **salla-subscription-system**
(which also merges in addon entitlements).

---

## Part 8 — Payload Reference

Full subscription/trial payloads: **[references/subscription-events.md](references/subscription-events.md)**.

---

## Key Resources

| Resource                 | URL                                |
| ------------------------ | ---------------------------------- |
| Apps API                 | https://docs.salla.dev/doc-421412  |
| App Events               | https://docs.salla.dev/421413m0    |
| App Subscription details | https://docs.salla.dev/api-5401098 |
| Lifecycle wiring         | salla-app-lifecycle skill          |
| Feature gating           | salla-subscription-system skill    |
| Partners Portal          | https://salla.partners             |
| Telegram community       | https://t.me/salladev              |
