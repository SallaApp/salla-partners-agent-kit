---
name: salla-app-billing
description: >
  Salla app monetization: plans and addons live in the publication's pricing section (no
  separate pricing endpoint), billed by Salla. Use when pricing the app, tracking plan/addon
  state, or gating features by entitlement. Track state from app.subscription.* /
  app.trial.* events (one family — item_type splits plan vs addon), reconcile via salla_apps
  action=subscriptions, meter usage against the balance. Signatures → salla-webhooks; tokens
  → salla-app-auth; wiring → salla-app-lifecycle; in-app purchase UI → salla-addon-purchase /
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

- **`GET /apps/{app_id}/subscriptions`** — retrieve the app's subscription statuses + details
  for **both plans AND addons** (filter by `item_type`): plan state, entitlements, dates,
  `subscription_balance` (reconciliation; Step 5). Full OpenAPI schema (source of truth):
  https://docs.salla.dev/5401098e0.md
- **`POST /apps/balance`** — write back the Pay-As-You-Go usage balance (Step 5b).
- **`POST /apps/subscriptions/{subscription_id}/renew`** — for **`external_recurring`** plans/addons
  the **partner drives each renewal** (Salla does not auto-renew them). Take `subscription_id` from
  the subscription webhook; needs `offline_access`. Returns the renewed subscription
  (`item_type`/`item_slug`/`plan_*`/`start_date`/`end_date`/`subscription_balance`/`features`).
  Handle the errors: `not_renewable`, `subscription_not_active`, `auto_renew_disabled`,
  `payment_failed` (403), `rate_limit_exceeded` (429 — once/day). Applies to addons with
  `support_renew: true`. (Salla-managed recurring renews automatically — you only receive
  `app.subscription.renewed`.) **Read the exact request/response schema and the full
  error-response contract from the live OpenAPI doc — it is the source of truth:**
  https://docs.salla.dev/37396517e0.md (don't hand-code the shapes; mirror the doc).

Confirm payloads and field shapes via the App Events reference
(https://docs.salla.dev/421413m0.md) or `salla_events action=list` before coding. The
**Salla Partners MCP** performs the actions:

| Tool          | Action           | What it does                                                                                       |
| ------------- | ---------------- | -------------------------------------------------------------------------------------------------- |
| `app_publish` | `set` `validate` | Set the `pricing` section (plans/addons), then validate the publication                            |
| `salla_apps`  | `connect`        | Set the `webhook_url` that app events (`app.subscription.*` / `app.trial.*`) are auto-delivered to |
| `salla_apps`  | `subscriptions`  | Read-only: the app's subscription details                                                          |

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

## Step 1 — Define Pricing Plans (publication `pricing` section)

Plans **and addons are defined inside the publication's `pricing` section** —
`app_publish action=set section=pricing data={…}`, then `app_publish action=validate`. There
is **no separate pricing endpoint**; the Portal's Pricing wizard step is a UI helper over the
same section. The publish mechanics are owned by **salla-publication-consistency**; the
`pricing` data shape is:

- `plan_type` — `"free"` | `"recurring"` | `"once"` | `"on_demand"` (required; exact API values — no `one_time` or `pay_as_you_go`). It selects which fields apply. **`free` is eligibility-gated** — only when `can_have_free_plan` is true (shipping/communication app or the `show_app_free_plan` feature); read it from app details before offering free (→ references/pricing-shapes.md).
- **Recurring** — `plans[]` (≤8; 0–4 monthly, 0–4 yearly). Each plan: `name{ar,en}`, `subtitle{ar,en}`, `price`, `recurring` (`free` | `monthly` | `yearly` | **`one-time`**), `recommended`, `is_compare_included`, `hidden`, `initialization_cost`, `discount`, `additional_features[]`, `promotions[]` (max 1), `balance` (for one-time/on_demand), and `id` to update a plan in place. Plus the top-level `plan_features[]` comparison matrix.
- **Once** — `one_time_price`, `one_time_old_price` (> price), `plan_additional_features[]` `{key,name,price,adjustable,min,max}`. No `plans[]`.
- **On-demand** — `plans[]` with `balance` required + `on_demand_type` (`emails`|`messages`|`per-transaction`).
- **Addons** (all types) — `{name,description,price,slug,support_renew}`. Always one-time; never send `price_model`/`frequency`. `support_renew:true` ⇒ `external_recurring` (you drive renewals via the renew API; state the cycle in the addon title/description), else `once` events.
- Trial is top-level: `plan_trial` (days, min 1, capped by max-trial-days — default 7) + `trial_description` (30–1000). Churn: `unsubscribe_reward`, `unsubscribe_email_reward`.

> **Naming traps:** `plan_type:"recurring"` (model) ≠ per-plan `recurring:"monthly"` (period);
> and `plan_additional_features` (top-level, **once**) ≠ per-plan `additional_features` (**recurring**).

**Full field tables, types, and server rules: load
[references/pricing-shapes.md](references/pricing-shapes.md).**

Set this section with `app_publish action=set section=pricing`, then `app_publish
action=validate` (saves the draft). Full publish flow → **salla-publication-consistency**.

| Plan type        | Use                                          |
| ---------------- | -------------------------------------------- |
| Free             | No charge                                    |
| Monthly / Yearly | Recurring (`plan_type: recurring`)           |
| Trial            | Time-boxed free access before a paid plan    |
| One-Time         | Single charge (`plan_type: once`)            |
| Pay As You Go    | Usage / on-demand (`plan_type: on_demand`)   |
| Addon            | Extra on top of a plan (defined in `addons`) |

After the app exists, **App details → Custom Plans** exposes per-merchant/tailored plans.

**Gate:** "Plans configured in the publication's `pricing` section
(`app_publish action=set section=pricing`) and the publication validates clean?"

---

## Step 2 — Set the Webhook URL (app events auto-deliver)

The events are your source of truth — and they are **app events** (`app.subscription.*` /
`app.trial.*`), so the app is **subscribed to them by default**: Salla delivers all of them
to your `webhook_url` **automatically**. You do **not** call `salla_events action=subscribe`
for any `app.*` event. The one action here is to set the receiver:

- `salla_apps action=connect`, `app_id`, `webhook_url`,
  `webhook_security_strategy: "signature"` — point app events at your handler (→
  salla-app-lifecycle Step 1 for the full connect + secret-sync recipe).

`salla_events action=subscribe` is **only** for non-app (store) events — `order.*`,
`product.*`, `customer.*`, `cart.*`, store-side `shipment.*` — that the app wants to react
to. Billing rides entirely on app events, so this skill needs no subscribe call.

**App events auto-deliver — set `webhook_url`, then HANDLE them.** Every billing event —
`app.subscription.started`, `app.subscription.renewed`, `app.subscription.expired`,
`app.subscription.canceled`, and the `app.trial.*` events — arrives at your `webhook_url`
the moment it fires, whether or not it appears in the `salla_events action=list` catalog
(`renewed`/`expired`/`canceled` aren't even in it). Your job is to HANDLE all of them in your
webhook handler (Step 4), not to subscribe to any of them. The App Events reference
(https://docs.salla.dev/421413m0.md) lists each as platform-fired.

**Gate:** "`webhook_url` set via `salla_apps action=connect` (app events auto-deliver to it),
and the handler covers the full family — `app.subscription.started`/`renewed`/`expired`/
`canceled` + `app.trial.*` (Step 4)? No `salla_events action=subscribe` call for any
`app.*` event — subscribe is for store events only."

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
[references/subscription-events.md](references/subscription-events.md). Live docs — App
Subscription Webhook Events: https://docs.salla.dev/2213496m0.md ; App Events reference (lifecycle
webhooks with payload examples): https://docs.salla.dev/421413m0.md.

**Gate:** "A demo-store subscription event upserts the stored plan with the right status?"

---

## Step 4 — Handle Renewals, Expiry & Trials

These three are app events — they arrive at your `webhook_url` **automatically** (you don't
subscribe to any `app.*` event — see Step 2); your job is to HANDLE them:

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
(where you read plan state, entitlements, and the usage balance). Read `item_type` (filter
to `"plan"` for plan state), `plan_type`, `start_date`/`end_date`, `features[]`
(`{ key, quantity }`), and `subscription_balance` (the usage balance, written via Step 5b).
A `403` means the caller lacks permission for this app.

**Full response sample + every field's meaning (and the POST /apps/balance shapes):
load [references/subscription-api.md](references/subscription-api.md).**

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

## Red Flags

Billing events grant and revoke paid access, so a shortcut here either leaks paid features
or wrongly locks a paying merchant out. If one of these is your plan, re-read the named step.

| Tempting thought                                             | Why it's wrong                                                                                                                                                                                                                                                                                                           |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| "I'll unlock features straight from the event payload."      | A forged/replayed webhook would hand out paid access. Verify the signature + dedupe, then gate on **stored** entitlement state (Step 3).                                                                                                                                                                                 |
| "Plans and addons need separate event handlers."             | They share one `app.subscription.*` family — branch on `item_type` (`item_slug` picks the addon). Separate handlers miss half the events (Step 3).                                                                                                                                                                       |
| "I only need the subscription events; trials are different." | Trials ride the **same** payload shape (`app.trial.*`). Skip them and trial start/expiry falls through to wrong gating (Steps 3–4).                                                                                                                                                                                      |
| "I'll `subscribe` to the subscription/trial events."         | They're **app events** — the app is subscribed to its own app events by default, so Salla auto-delivers the whole family (`started`/`renewed`/`expired`/`canceled` + `app.trial.*`) to your `webhook_url`. Set the `webhook_url` and HANDLE them; `salla_events action=subscribe` is for store events only (Steps 2, 4). |
| "I'll trust the balance the client sends me."                | Compute usage server-side and `POST /apps/balance` behind your own auth; read it back to confirm. Client-reported balance is spoofable (Step 5b).                                                                                                                                                                        |
| "Events are reliable — I don't need reconciliation."         | A missed webhook during downtime leaves stored state stale forever. `GET /apps/{app_id}/subscriptions` is the backstop (Step 5).                                                                                                                                                                                         |
| "I'll gate at the moment the event arrives."                 | Events are late/duplicated. Drive access from stored `status` + `end_date`, recomputed idempotently (Step 4).                                                                                                                                                                                                            |
| "Demo-store subscription events should bill like real ones." | Skip billing logic when `store_type !== "live"`, or development installs corrupt real plan state (Step 3).                                                                                                                                                                                                               |

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
