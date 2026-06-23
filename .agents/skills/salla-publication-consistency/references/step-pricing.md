# Step — Pricing

Owner: **salla-app-billing** (plan / addon / one-time modelling). Set via `app_publish action=set
section=pricing`. The full field shapes (subscriptions + one-time, plans, addons, the
`plan_features` matrix, on_demand) live in **salla-app-billing** — this reference covers retrieval
and routing.

## Data retrieval

Read current values from `app_publish action=get` → `publication.*`:

| Field                          | Path                                                           | Notes                                                                            |
| ------------------------------ | -------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Plan type                      | `publication.plan_type`                                        | `free` \| `once` \| `recurring` \| `on_demand`.                                  |
| Plans (recurring/on_demand)    | `publication.plans`                                            | array of plan objects (carry `id` — round-trips for update).                     |
| One-time price / old price     | `publication.one_time_price` / `.one_time_old_price`           | once model; old price `>` price.                                                 |
| One-time additional features   | `publication.plan_additional_features`                         | once model; `{key,name,price,adjustable,min,max}`.                               |
| Plan-feature comparison matrix | `publication.plan_features`                                    | recurring/on_demand; pivoted across plans.                                       |
| Addons                         | `publication.addons`                                           | all types; `{name,description,price,price_model,slug,support_renew,frequency?}`. |
| Trial (top-level)              | `publication.plan_trial`                                       | integer days.                                                                    |
| On-demand type                 | `publication.on_demand_type`                                   | `emails` \| `messages` \| `per-transaction`.                                     |
| Unsubscribe rewards            | `publication.unsubscribe_reward` / `.unsubscribe_email_reward` | churn-prevention.                                                                |

**Naming traps:** `plan_additional_features` (top-level, **once**) ≠ per-plan `additional_features`
(**recurring** `plans[].additional_features`); and `plan_type:"recurring"` (the model) ≠ per-plan
`recurring:"monthly"` (the period). Full shapes → **salla-app-billing**.

> **Paid pricing obliges a billing cycle.** A recurring plan or any addon means the app must
> handle `app.subscription.*` (+ `app.trial.*` if a trial) and, for `external_recurring`, the
> renew API. This is gated before submit — see the billing-cycle gate in the master skill and
> **salla-app-billing** / **salla-addon-purchase**.

## Submission schema

_(Filled in Step 1/2 — routes to salla-app-billing for the full plan/addon/once/matrix shapes.)_

## How to submit

_(Filled in Step 1 — `app_publish action=set section=pricing data={…}`; per-type examples in salla-app-billing.)_
