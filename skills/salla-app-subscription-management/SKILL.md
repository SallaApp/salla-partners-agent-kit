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
  wiring is in salla-app-lifecycle; feature gating in salla-subscription-system.
---

# Salla App Subscription Management Flow

Set up how merchants pay for your app and keep a reliable picture of each merchant's plan.
Salla owns billing — you react to events and (optionally) read the subscriptions endpoint;
you never charge cards yourself. Follow the steps in order; complete each gate before
moving on. Steps 1, 2 and 5 **perform actions** with the Salla Partners MCP; Steps 3–4 and
6 are the runtime logic you write.

## Tools & MCPs

**Two MCPs:** `apidog-mcp-server` (site-id `451700`) is *read-only* — confirm payloads and
the subscriptions schema before coding. The **Salla Partners MCP** *performs actions*:

| Tool | Action | What it does |
| --- | --- | --- |
| `salla_apps` | `publish` | Submit the app for publishing (pricing is set in the publish flow) |
| `salla_events` | `list` / `subscribe` | Subscribe to `app.subscription.*` / `app.trial.*` |
| `salla_request` | `search` / `call` | Call the read-only `GET /apps/{app_id}/subscriptions` |

> There is **no Merchant-API endpoint** for a store's own subscription. Plan state is
> **event-driven** (`app.subscription.*` / `app.trial.*`) and queryable from the
> **Partners API** keyed by `app_id`. Treat events as the source of truth, the endpoint as
> reconciliation. Docs: https://docs.salla.dev/doc-421412 (Apps API) ·
> https://docs.salla.dev/421413m0 (App Events). Related: salla-app-lifecycle (event
> wiring) · salla-subscription-system (gating) · salla-addon-subscription-management.

### Plans vs Addons (reference)

| Concept | What it is | `item_type` | `item_slug` |
| --- | --- | --- | --- |
| Plan | The merchant's main subscription to the app | `"plan"` | `null` |
| Addon | An extra purchased on top of a plan | `"addon"` | addon identifier |

Both flow through the same `app.subscription.*` events. **This skill = plans.** Addons →
salla-addon-subscription-management; buying addons in-app → salla-addon-purchase-embedded.
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

Pricing is configured in the Portal **publish flow** (six sections: Basic Information ·
App Configurations · App Features · **Pricing** · Contact Information · Service Trial). In
**Pricing** create plans of these types:

| Plan type | Use |
| --- | --- |
| Free | No charge |
| Monthly / Yearly | Recurring |
| Trial | Time-boxed free access before a paid plan |
| One-Time | Single charge |
| Pay As You Go | Usage / on-demand (`plan_type: on_demand`) |
| Addon | Extra on top of a plan (see addon skills) |

After the app exists, **App details → Custom Plans** exposes per-merchant/tailored plans.

There is **no MCP tool for defining plans** — but submitting the app for publishing **is**
an action: `salla_apps action=publish`, `app_id` (optional `update_note`; see
salla-general-app Step 8).

> The exact per-field Portal steps aren't fully documented — confirm current UI via the
> MCP/docs rather than asserting field names you can't see.

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

Wire the events via salla-app-lifecycle, branch on `item_type === "plan"` here. Handle the
**trial** family too — otherwise a trial start/expiry falls through and the merchant gets
the wrong gating:

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

**Gate:** "A demo-store subscription event upserts the stored plan with the right status?"

---

## Step 4 — Handle Renewals, Expiry & Trials

- **`app.subscription.renewed`** — confirm still active; persist the new
  `end_date` / `renew_date`. Don't assume the old end date.
- **`app.subscription.expired`** — plan lapsed (no renewal). Restrict access; consider a
  grace banner.
- **`app.subscription.canceled`** — merchant cancelled. Restrict per your policy.
- **Trials** arrive as `app.trial.started` / `.expired` / `.canceled` (and as zero-price
  `plan_type: once`, `plan_name: "trail"`). On `trial.started` enable trial features and
  record the trial end; on expiry/cancel downgrade. A converting merchant then triggers
  `app.subscription.started`.

Drive feature access from the stored `status` + `end_date`, not from the moment an event
arrives (events can be late or duplicated — be idempotent).

**Handle async-job failure** — you respond `200` then process off the request path, so a
throw in the worker is invisible to Salla. Route failed jobs to a dead-letter queue, retry
with backoff (idempotent), and alert on exhausted retries — otherwise a dropped
`renewed`/`expired` silently leaves a merchant on the wrong tier. Step 5 is your backstop.

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
{ "id": "657032372", "merchant": 1234509876, "item_type": "plan", "plan_type": "recurring",
  "plan_name": "Yearly", "price": 20, "start_date": "2022-05-23",
  "end_date": "2023-05-23", "quantity": 1 }
```

| Field | Notes |
| --- | --- |
| `merchant` | **Filter on this** before updating stored state |
| `item_type` | `"plan"` \| `"addon"` — filter to `plan` for plan state |
| `plan_type` | `free` \| `once` \| `recurring` \| `on_demand` |
| `plan_name` | e.g. `"Yearly"`; trial commonly `"trail"` |
| `price` / `start_date` / `end_date` | nullable |
| `quantity` | seats/units |

Use this to reconcile — not as your hot path.

**Gate:** "Reconciliation returns the merchant's current plan and matches your stored state?"

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

Map `features[]` → entitlements and enforce them via **salla-subscription-system** (which
also merges in addon entitlements). Full payloads:
**[references/subscription-events.md](references/subscription-events.md)**.

---

## Key Resources

| Resource | URL |
| --- | --- |
| Apps API | https://docs.salla.dev/doc-421412 |
| App Events | https://docs.salla.dev/421413m0 |
| App Subscription details | https://docs.salla.dev/api-5401098 |
| Lifecycle wiring | salla-app-lifecycle skill |
| Feature gating | salla-subscription-system skill |
| Partners Portal | https://salla.partners |
| Telegram community | https://t.me/salladev |
