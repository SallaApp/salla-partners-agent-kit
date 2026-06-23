# Publication pricing shapes (subscriptions + one-time)

The `pricing` section of the publication (`app_publish action=set section=pricing`). Grounded in
real `save` payloads + the server `PublishRequest` / `PublicationSectionRequest` rules + the FE
Zod. `plan_type` selects which fields apply.

## `plan_type` ∈ `free` | `once` | `recurring` | `on_demand`

These are the exact API values — there is no `one_time` or `pay_as_you_go`.

## Two naming traps (read first)

- `plan_type: "recurring"` (the **model**) vs a plan's own `recurring: "monthly"` (the **period**).
  Different fields, same word.
- `plan_additional_features` (top-level, **once** model) vs a plan's `additional_features` (inside a
  **recurring** `plans[]` entry). Different things, near-identical names.

## Recurring (`plan_type: "recurring"`)

`plans[]` — up to **8** (0–4 monthly, 0–4 yearly). Each plan object:

| Field                 | Type / rule                                                                         |
| --------------------- | ----------------------------------------------------------------------------------- |
| `id`                  | existing plan id — round-trip it to UPDATE a plan in place (omit to create)         |
| `name`                | `{ar,en}`, required                                                                 |
| `subtitle`            | `{ar,en}`                                                                           |
| `price`               | numeric (required unless `recurring: "free"`)                                       |
| `recurring`           | `free` \| `monthly` \| `yearly` \| **`one-time`**                                   |
| `recommended`         | bool — highlight this plan                                                          |
| `is_compare_included` | bool — show in the comparison table                                                 |
| `hidden`              | bool                                                                                |
| `initialization_cost` | numeric, nullable — one-time setup fee                                              |
| `discount`            | bool                                                                                |
| `additional_features` | array (per-plan)                                                                    |
| `promotions`          | array, **max 1**: `{requirement 1–9, reward 1–6, start_date, end_date}`             |
| `balance`             | numeric, nullable — **required for one-time / on_demand** plans, null for recurring |

`plan_features[]` — the comparison **matrix**, pivoted across plans (NOT per-plan):
`{ key, title{ar,en}, display_type: 1=checkbox | 2=text, display_value[] (one per plan), hidden[] (one per plan) }`.

`plan_trial` — top-level, integer days (min 1, capped by the company's max-trial-days, default 7).

## Once (`plan_type: "once"`)

No `plans[]`. Top-level:

| Field                      | Type / rule                                                                             |
| -------------------------- | --------------------------------------------------------------------------------------- |
| `one_time_price`           | numeric, digits 1–5, min 1                                                              |
| `one_time_old_price`       | numeric, digits 1–5 — **must be `>` `one_time_price`** (strikethrough)                  |
| `plan_additional_features` | array: `{ key (alnum/hyphen, distinct), name{ar,en} ≤50, price, adjustable, min, max }` |
| `plan_trial`               | integer days                                                                            |

## On-demand (`plan_type: "on_demand"`, Pay As You Go)

`plans[]` (as recurring) with **`balance` required** per plan, plus:

| Field            | Type / rule                                 |
| ---------------- | ------------------------------------------- |
| `on_demand_type` | `emails` \| `messages` \| `per-transaction` |

Usage balance is written back at runtime via `POST /apps/balance` (see salla-app-billing Step 5b).

## Addons (allowed with ALL plan types)

`addons[]` — each:

| Field           | Type / rule                                                    |
| --------------- | -------------------------------------------------------------- |
| `name`          | `{ar,en}`, required                                            |
| `description`   | `{ar,en}`                                                      |
| `price`         | numeric, 1–999999.99                                           |
| `price_model`   | `once` \| `recurring` \| `on_demand`                           |
| `frequency`     | `monthly` \| `yearly` — only when `price_model: "recurring"`   |
| `slug`          | string ≤100 — the `item_slug` you match on in lifecycle events |
| `support_renew` | bool — supports renewal (recurring/external_recurring addons)  |

> **`external_recurring` addons renew on ANY logic you choose** — a fixed period, a custom period,
> pay-as-you-go, or your own rule (the partner drives each renewal via the renew API). The merchant
> can't infer it, so **state the renewal model plainly in the addon `description`** (what recurs,
> how often, what triggers a charge). In-app purchase of addons runs through the **checkout SDK**
> (frontend purchase cycle) → **salla-addon-purchase-embedded**.

## Top-level (any type)

`unsubscribe_reward`, `unsubscribe_email_reward` — churn-prevention discounts (nullable).

## Reminder — paid pricing obliges a billing cycle

A recurring plan or any addon means the app must handle `app.subscription.*` (+ `app.trial.*`)
and, for `external_recurring`, call the renew API. This is gated before submit — see
salla-app-billing (subscription lifecycle + renew) and salla-addon-purchase. Live docs (source of
truth):

- Subscription webhook events: https://docs.salla.dev/2213496m0.md
- Renew API — OpenAPI schema and full error contract: https://docs.salla.dev/37396517e0.md
- Subscription schema: https://docs.salla.dev/5401098e0.md
