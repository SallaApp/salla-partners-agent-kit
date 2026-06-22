---
name: salla-app-billing
description: >
  Salla app monetization: plans and addons live in the publish payload (no pricing
  endpoint), billed by Salla. Track plan state from app.subscription.* / app.trial.* events
  (one family — item_type splits plan vs addon), gate features by combined plan + addon
  entitlements, reconcile via salla_apps action=subscriptions, meter usage against the
  balance. Verify event signatures first → salla-webhooks; tokens → salla-app-auth; event
  wiring → salla-app-lifecycle; in-app addon purchase UI → salla-addon-purchase /
  salla-addon-purchase-embedded.
---

# Salla App Billing Flow

Set up how merchants pay for your app and keep a reliable picture of each merchant's plan.
Salla owns billing — you react to events and (optionally) read the subscriptions endpoint;
you never charge cards yourself. Follow the steps in order; complete each gate before
moving on. Steps 1, 2 and 5 **perform actions** with the Salla Partners MCP; Steps 3–4 and
6 are the runtime logic you write.

## Source of truth

Plan state is **event-driven** — drive it from verified `app.subscription.*` /
`app.trial.*` webhooks, then reconcile against the **Admin (Merchant) API** on
`https://api.salla.dev/admin/v2` (OAuth, `offline_access`). Two real endpoints back this
skill:

- **`GET /apps/{app_id}/subscriptions`** — read plan state, entitlements,
  `subscription_balance` (reconciliation; Step 5).
- **`POST /apps/balance`** — write back the Pay-As-You-Go usage balance (Step 5b).

Confirm payloads and field shapes via the App Events reference
(https://docs.salla.dev/421413m0.md) or `salla_events action=list` before coding. The
**Salla Partners MCP** performs the actions:

| Tool           | Action               | What it does                                       |
| -------------- | -------------------- | -------------------------------------------------- |
| `salla_apps`   | `publish`            | Submit the app (pricing lives in the publish flow) |
| `salla_events` | `list` / `subscribe` | Subscribe to `app.subscription.*` / `app.trial.*`  |
| `salla_apps`   | `subscriptions`      | Read-only: the app's subscription details          |

### Plans vs Addons

| Concept | What it is                                  | `item_type` | `item_slug`      |
| ------- | ------------------------------------------- | ----------- | ---------------- |
| Plan    | The merchant's main subscription to the app | `"plan"`    | `null`           |
| Addon   | An extra purchased on top of a plan         | `"addon"`   | addon identifier |

Both flow through the same `app.subscription.*` / `app.trial.*` events. **This skill owns
plans, addons, entitlement gating, and usage billing.** Buying addons in-app →
salla-addon-purchase. `plan_type` values: `free` · `once` (one-time) ·
`recurring` (monthly/yearly) · `on_demand` (Pay As You Go).

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

- `plan_type` — `"free"` | `"recurring"` | `"once"` | `"on_demand"` (required; these are the exact API values — there is no `one_time` or `pay_as_you_go`).
- `plans` — for recurring pricing: up to **8 plans** (0–4 monthly, 0–4 yearly), each carrying
  bilingual `name {en,ar}`, `price`, a `recurring` field (`"monthly"` | `"yearly"` | `"free"`),
  and `additional_features[]`.
- Trial is set ONCE at the top level, not per plan: `plan_trial` (integer days, min 1, capped by
  the company's max-trial-days — default 7) plus `trial_description` (30–1000 chars).
- `addons` — extra purchasables, allowed with **all** pricing types.
- `action: "save" | "submit"` is always required — full payload →
  salla-app-builder's publish step.

| Plan type        | Use                                          |
| ---------------- | -------------------------------------------- |
| Free             | No charge                                    |
| Monthly / Yearly | Recurring (`plan_type: recurring`)           |
| Trial            | Time-boxed free access before a paid plan    |
| One-Time         | Single charge (`plan_type: once`)            |
| Pay As You Go    | Usage / on-demand (`plan_type: on_demand`)   |
| Addon            | Extra on top of a plan (defined in `addons`) |

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

> **Security — events grant paid access.** A forged or replayed subscription/trial webhook
> can hand out (or revoke) paid features. Verify the webhook signature and enforce
> idempotency before mutating plan/entitlement state — that transport layer (signature
> verification, replay protection, fast 2xx) is owned by **salla-webhooks**; token/OAuth by
> **salla-app-auth**. Treat an entitlement change as authoritative only from a verified
> server event or the reconciled Partners API (Step 5), never a client-reported plan. Keep
> entitlement reads/writes behind your own authenticated admin path, and signing secrets and
> tokens out of logs.

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
  `plan_type: once`). On `trial.started` enable trial features and record the trial end; on
  expiry/cancel downgrade. A converting merchant then triggers `app.subscription.started`.

Drive feature access from the stored `status` + `end_date`, not from the moment an event
arrives (events can be late or duplicated — be idempotent). Step 5 is your backstop for
missed events.

**Gate:** "Renewal updates `end_date`; expiry/cancel restricts; trials gate correctly?"

---

## Step 5 — Reconcile via the App Subscription Details API

After downtime (a missed webhook), reconcile with `salla_apps action=subscriptions`, which
calls the real **App Subscription Details** endpoint:

```
GET https://api.salla.dev/admin/v2/apps/{app_id}/subscriptions
Authorization: Bearer <access_token>   # OAuth, offline_access
```

`{app_id}` is your Salla Application ID (Salla Partners → My Apps → Your App). The call is
made with the merchant's access token, so the `data[]` is **that merchant's** subscriptions
for the app — one entry per active plan/addon. Doc:
https://docs.salla.dev/5401098e0.md.

**Response (`200`)** — `{ status, success, data: [...] }`, each item a Subscription Detail
(this is where you read plan state, entitlements, and the usage balance):

```json
{
  "status": 200,
  "success": true,
  "data": [
    {
      "id": "657032372",
      "app_name": "BitoShip",
      "description": "BitoShip Description",
      "app_type": "app",
      "categories": ["Others"],
      "item_type": "plan",
      "item_slug": null,
      "plan_type": "recurring",
      "plan_name": "Yearly",
      "plan_period": "12",
      "start_date": "2022-05-23",
      "end_date": "2023-05-23",
      "initialization_cost": 15,
      "price_before_discount": 6,
      "price": 20,
      "tax": 3,
      "tax_value": 3,
      "total": 23,
      "subscription_balance": 50,
      "coupon": null,
      "features": [{ "key": "Feature1", "quantity": 1 }],
      "quantity": 1
    }
  ]
}
```

| Field                                                  | Notes                                                                                                                 |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| `id`                                                   | Subscription identifier (string)                                                                                      |
| `item_type`                                            | `"plan"` \| `"addon"` — filter to `plan` for plan state (required field)                                              |
| `item_slug`                                            | `null` for plans; addon identifier for addons                                                                         |
| `plan_type`                                            | `free` \| `once` \| `recurring` \| `on_demand` (same values in the publish payload and in events)                     |
| `plan_name`                                            | free string, e.g. `"Yearly"` (`"trail"` in docs samples is a sample artifact — never match on it)                     |
| `plan_period`                                          | plan period in months as a string, e.g. `"12"`; nullable                                                              |
| `start_date` / `end_date`                              | dates; nullable (e.g. null on Free/one-time)                                                                          |
| `initialization_cost`                                  | one-time setup fee; nullable                                                                                          |
| `price_before_discount` / `price`                      | amounts; nullable (null on Trial samples)                                                                             |
| `tax` / `tax_value` / `total`                          | tax %, tax amount, total (tax included); nullable                                                                     |
| `subscription_balance`                                 | **usage balance** the merchant owes for the app's service; number, nullable (null on Free/Trial). Written via Step 5b |
| `coupon`                                               | applied coupon `{ name, amount }`, or `null`                                                                          |
| `features[]`                                           | `{ key, quantity }` — entitlements granted (may be empty `[]`)                                                        |
| `quantity`                                             | seats/units purchased (required field)                                                                                |
| `app_name` / `description` / `app_type` / `categories` | app metadata echoed back (`app_type`: `app` \| `shipping`)                                                            |

A `403` (`{ status: 403, success: false, error: { code, message } }`) means the caller
lacks permission for this app. Use this to reconcile — not as your hot path.

**Gate:** "Reconciliation returns the merchant's current plan + balance and matches your stored state?"

---

## Step 5b — Update the Usage Balance (Pay As You Go)

For `on_demand` (Pay As You Go) plans, write the merchant's usage balance back to Salla
with the real **Update Subscription Balance** endpoint:

```
POST https://api.salla.dev/admin/v2/apps/balance
Authorization: Bearer <access_token>   # OAuth, offline_access
Content-Type: application/json

{ "balance": 2399 }
```

`balance` (integer) is **required**. Doc: https://docs.salla.dev/5401099e0.md.

**Response (`201`)** — `{ status, success, data: { message, code } }`.
**Validation error (`422`)** — `{ status: 422, success: false, error: { code, message, fields: { balance: ["..."] } } }`.

> **Security.** Compute the balance server-side from verified usage and `POST` it only
> behind your own authenticated admin path — never from a client-reported value. Read it
> back with `GET /apps/{app_id}/subscriptions` (Step 5) to confirm. (Same trust model as
> Step 3.)

**Gate:** "Balance written via `POST /apps/balance` and confirmed by re-reading the subscription?"

---

## Addons

Addons are extra purchasables on top of a plan — recurring or one-time — defined in the
publish payload's `addons` array (Step 1). They arrive on the same event family with
`item_type: "addon"` (`item_slug` identifies which addon), so you record them and unlock
their `features[]` exactly like a plan. For the in-app purchase UI (embedded SDK Checkout)
→ **salla-addon-purchase**.

## Entitlement Gating

Merge the active plan's `features[]` **and** every active addon's `features[]` into
**one entitlement set per merchant**. Recompute that set on every
`app.subscription.*` / `app.trial.*` event, and gate at **feature-use time** (look up the
stored entitlement set, never the raw event).

## Usage Balance (Pay As You Go)

For `on_demand` plans, meter each billable action against the merchant's
**`subscription_balance`** (what the merchant owes for the app's service): check the
remaining balance before the action, decrement as usage occurs, and block (or warn) when
exhausted. Read it with `GET /apps/{app_id}/subscriptions` (Step 5); write it with
`POST /apps/balance` (Step 5b).

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

| Resource                           | URL                                 |
| ---------------------------------- | ----------------------------------- |
| App Subscription Details (GET)     | https://docs.salla.dev/5401098e0.md |
| Update Subscription Balance (POST) | https://docs.salla.dev/5401099e0.md |
| Apps API                           | https://docs.salla.dev/421412m0.md  |
| App Events                         | https://docs.salla.dev/421413m0.md  |
| Lifecycle wiring                   | salla-app-lifecycle skill           |
| Feature gating                     | this skill — see Entitlement Gating |
| Partners Portal                    | https://salla.partners              |
| Telegram community                 | https://t.me/salladev               |
