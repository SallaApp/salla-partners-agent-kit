---
name: salla-app-billing
description: >
  Salla app monetization: plans and addons are defined inside the publish payload (no
  pricing endpoint) and billed by Salla. Track merchant plan state from
  app.subscription.* / app.trial.* events (one payload family — item_type distinguishes
  plan vs addon), gate features by the merchant's combined plan + addon entitlements
  (features[]), reconcile via Partners API GET /apps/{app_id}/subscriptions, and meter
  usage-based billing against the subscription balance. In-app addon purchase UI →
  salla-addon-purchase; event wiring → salla-app-lifecycle.

  Trigger also when you see: "pricing plan", "Custom Plans", "plan_type", "recurring",
  "on_demand", "app.subscription.started", "app.subscription.renewed", "subscription_id",
  "GET /apps/{app_id}/subscriptions", "plan_name", "end_date", "renew_date", "free trial",
  "Pay As You Go", or any question about how a merchant pays for an app or what plan
  they're on.

  Always use this skill before writing subscription/plan logic. Plan and addon events
  share one payload family — `item_type` distinguishes them; for addons see
  salla-app-billing and salla-addon-purchase. Lifecycle event
  wiring is in salla-app-lifecycle; feature gating in salla-app-billing.
---

# Salla App Subscription Management Flow

Set up how merchants pay for your app and keep a reliable picture of each merchant's plan.
Salla owns billing — you react to events and (optionally) read the subscriptions endpoint;
you never charge cards yourself. Follow the steps in order; complete each gate before
moving on. Steps 1, 2 and 5 **perform actions** with the Salla Partners MCP; Steps 3–4 and
6 are the runtime logic you write.

## Tools & MCPs

**Two MCPs:** `apidog-mcp-server` (site-id `451700`) is _read-only_ — confirm payloads and
the subscriptions schema before coding. The **Salla Partners MCP** _performs actions_:

| Tool            | Action               | What it does                                                       |
| --------------- | -------------------- | ------------------------------------------------------------------ |
| `salla_apps`    | `publish`            | Submit the app for publishing (pricing is set in the publish flow) |
| `salla_events`  | `list` / `subscribe` | Subscribe to `app.subscription.*` / `app.trial.*`                  |
| `salla_request` | `search` / `call`    | Call the read-only `GET /apps/{app_id}/subscriptions`              |

> There is **no Merchant-API endpoint** for a store's own subscription. Plan state is
> **event-driven** (`app.subscription.*` / `app.trial.*`) and queryable from the
> **Partners API** keyed by `app_id`. Treat events as the source of truth, the endpoint as
> reconciliation. Docs: https://docs.salla.dev/doc-421412 (Apps API) ·
> https://docs.salla.dev/421413m0 (App Events). Related: salla-app-lifecycle (event
> wiring) · salla-addon-purchase (in-app purchase UI).

### Plans vs Addons (reference)

| Concept | What it is                                  | `item_type` | `item_slug`      |
| ------- | ------------------------------------------- | ----------- | ---------------- |
| Plan    | The merchant's main subscription to the app | `"plan"`    | `null`           |
| Addon   | An extra purchased on top of a plan         | `"addon"`   | addon identifier |

Both flow through the same `app.subscription.*` events. **This skill owns plans, addons,
entitlement gating, and usage billing.** Buying addons in-app → salla-addon-purchase.
`plan_type` values: `free` · `once` (one-time / trial) · `recurring` (monthly/yearly) ·
`on_demand` (Pay As You Go).

---

## Step 0 — Discover

Ask before starting:

1. **Which plan types** will you offer? (Free, Monthly, Yearly, Trial, One-Time, Pay As
   You Go)
2. **What does each plan unlock?** (the `features[]` → entitlement mapping)
3. **Do you need a free trial** before the paid plan?

---

## Step 1 — Define Pricing Plans & Publish

Plans **and addons are defined inside the publish payload** submitted by
`salla_apps action=publish` — there is **no separate pricing endpoint**. The Portal's
Pricing wizard step is a UI helper that batches everything into the single
`POST /app/{id}/publish` body (verified):

- `plan_type` — `"free"` | `"one_time"` | `"recurring"` | `"pay_as_you_go"` (required).
- `plans` — for recurring pricing: up to **8 plans** (0–4 monthly, 0–4 yearly), each
  carrying its price and `features[]`. An optional trial period can be enabled per plan.
- `addons` — extra purchasables, allowed with **all** pricing types.
- `action: "save" | "submit"` is always required — full payload →
  salla-create-app's publish step.

| Plan type        | Use                                                                       |
| ---------------- | ------------------------------------------------------------------------- |
| Free             | No charge                                                                 |
| Monthly / Yearly | Recurring (`plan_type: recurring`)                                        |
| Trial            | Time-boxed free access before a paid plan                                 |
| One-Time         | Single charge (`plan_type: one_time`)                                     |
| Pay As You Go    | Usage / on-demand (`plan_type: pay_as_you_go`; events report `on_demand`) |
| Addon            | Extra on top of a plan (defined in `addons`)                              |

After the app exists, **App details → Custom Plans** exposes per-merchant/tailored plans.

**Gate:** "Plans configured in the Pricing section and the app submitted via
`salla_apps action=publish`?"

---

## Step 2 — Subscribe to Subscription Events

The events are your source of truth, so subscribe the app to them (a `webhook_url` must
be set — see salla-app-lifecycle Step 1):

- `salla_events action=list`, `app_id` → confirm valid slugs.
- `salla_events action=subscribe`, `app_id`,
  `events: ["app.subscription.started","app.subscription.renewed","app.subscription.expired","app.subscription.canceled","app.trial.started","app.trial.expired","app.trial.canceled"]`.

**Gate:** "All subscription + trial events subscribed (`salla_events action=list` confirms)?"

---

## Step 3 — Track Plan State from Events

Wire the events via salla-app-lifecycle. The deltas that matter here:

- **Branch on `item_type`** — `"plan"` updates plan state; `"addon"` updates addon
  entitlements (same payload family; `item_slug` identifies which addon).
- **Trials are the same payload shape** — handle `app.trial.started/.expired/.canceled`
  too, or a trial start/expiry falls through and the merchant gets the wrong gating.
- **Persist `end_date ?? renew_date`** on `started`/`renewed`; mark the subscription
  inactive on `expired`/`canceled`.
- **Skip billing logic when `store_type !== "live"`** (development/demo stores).

Payload fields and full examples →
[references/subscription-events.md](references/subscription-events.md).

**Gate:** "A demo-store subscription event upserts the stored plan with the right status?"

---

## Step 4 — Handle Renewals, Expiry & Trials

- **`app.subscription.renewed`** — confirm still active; persist the new
  `end_date` / `renew_date`. Don't assume the old end date.
- **`app.subscription.expired`** — plan lapsed (no renewal). Restrict access; consider a
  grace banner.
- **`app.subscription.canceled`** — merchant cancelled. Restrict per your policy.
- **Trials** arrive as `app.trial.started` / `.expired` / `.canceled` (zero-price
  `plan_type: once`; docs samples show `plan_name: "trail"` — that value is a docs-sample
  artifact, never match on it). On `trial.started` enable trial features and record the
  trial end; on expiry/cancel downgrade. A converting merchant then triggers
  `app.subscription.started`.

Drive feature access from the stored `status` + `end_date`, not from the moment an event
arrives (events can be late or duplicated — be idempotent). Step 5 is your backstop for
missed events.

**Gate:** "Renewal updates `end_date`; expiry/cancel restricts; trials gate correctly?"

---

## Step 5 — Reconcile via the Partners API

After downtime (a missed webhook), reconcile against the read-only subscriptions endpoint
through the `salla_request` tool:

1. `salla_request mode=search`, `keyword: "subscriptions"` → find the `operationId`.
2. `salla_request mode=call`, `operationId`, `path_params: { app_id }` → the response.

`salla_request` is GET-only and may be off by default (`MCP_EXPOSE_GENERIC_TOOLS`); if it
isn't exposed, fall back to the raw call:

```http
GET /apps/{app_id}/subscriptions
Authorization: Bearer <token>
```

This endpoint returns subscriptions for **all merchants** of the app. Always filter the
response by merchant ID before updating any stored state — applying another merchant's
subscription data silently corrupts plan gating.

```json
{
  "id": "657032372",
  "merchant": 1234509876,
  "item_type": "plan",
  "plan_type": "recurring",
  "plan_name": "Yearly",
  "price": 20,
  "start_date": "2022-05-23",
  "end_date": "2023-05-23",
  "quantity": 1
}
```

| Field                               | Notes                                                                                |
| ----------------------------------- | ------------------------------------------------------------------------------------ |
| `merchant`                          | **Filter on this** before updating stored state                                      |
| `item_type`                         | `"plan"` \| `"addon"` — filter to `plan` for plan state                              |
| `plan_type`                         | `free` \| `once` \| `recurring` \| `on_demand`                                       |
| `plan_name`                         | e.g. `"Yearly"` (`"trail"` in docs samples is a sample artifact — never match on it) |
| `price` / `start_date` / `end_date` | nullable                                                                             |
| `quantity`                          | seats/units                                                                          |

Use this to reconcile — not as your hot path.

**Gate:** "Reconciliation returns the merchant's current plan and matches your stored state?"

---

## Addons

Addons are extra purchasables on top of a plan — **recurring or one-time**. They flow
through the **same** `app.subscription.*` / `app.trial.*` event family with
`item_type: "addon"`; `item_slug` tells you which addon. Define them in the publish
payload's `addons` array (Step 1). For the in-app purchase UI (embedded SDK Checkout) →
**salla-addon-purchase**.

## Entitlement Gating

Merge the active plan's `features[]` **and** every active addon's `features[]` into
**one entitlement set per merchant**. Recompute that set on every
`app.subscription.*` / `app.trial.*` event, and gate at **feature-use time** (look up the
stored entitlement set, never the raw event).

## Usage Balance (Pay As You Go)

For `on_demand` plans, meter each billable action against the merchant's **subscription
balance**: check the remaining balance before performing the action, decrement as usage
occurs, and block (or warn) when exhausted. Reconcile balances and subscription state via
`GET /apps/{app_id}/subscriptions` (Step 5).

---

## Step 6 — Schema & Gating (reference)

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

Map `features[]` → entitlements per the **Entitlement Gating** section above (plan +
addon features merged into one set). Full payloads:
**[references/subscription-events.md](references/subscription-events.md)**.

---

## Key Resources

| Resource                 | URL                                |
| ------------------------ | ---------------------------------- |
| Apps API                 | https://docs.salla.dev/doc-421412  |
| App Events               | https://docs.salla.dev/421413m0    |
| App Subscription details | https://docs.salla.dev/api-5401098 |
| Lifecycle wiring         | salla-app-lifecycle skill          |
| Feature gating           | salla-app-billing skill            |
| Partners Portal          | https://salla.partners             |
| Telegram community       | https://t.me/salladev              |
