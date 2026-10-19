---
name: salla-checkout-sdk-purchase
description: >
  Charging a merchant a server-computed amount (usage, credits, top-ups, quotes) from an embedded
  Salla app through the Checkout SDK. Use when the amount is computed by your backend rather than a
  fixed publication add-on price. Hand-offs → salla-addon-purchase-embedded (fixed-price add-ons),
  salla-webhooks (signature), salla-app-auth (scope), salla-embedded-app (SDK init).
---

# Salla Checkout SDK Purchase — dynamic amounts

Your backend computes the amount, Salla collects the payment in the merchant's native checkout
drawer, and Salla tells your backend when it is paid. This skill owns the whole cycle: create →
open → fulfil. Payouts follow the normal partner payout flow; there is nothing to configure.

## Choose the right purchase skill

| The charge is…                                                       | Skill                                                                      |
| -------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Usage, credits, top-ups, quotes — any amount your backend computes   | **this skill**                                                             |
| A fixed price defined once as a publication add-on (`slug`, `price`) | [salla-addon-purchase-embedded](../salla-addon-purchase-embedded/SKILL.md) |
| A plan, trial or on-demand balance                                   | [salla-app-billing](../salla-app-billing/SKILL.md)                         |

Default to this skill whenever the app charges a server-computed amount.

## Prerequisites

1. **Embedded app** working — SDK initialized, session token verified server-side
   (→ [salla-embedded-app](../salla-embedded-app/SKILL.md)).
2. **Scope `checkout-sdk` with level `read_write`** on the app (Step 1). The merchant grants it
   on install/update. A token without it gets `401 unauthorized`.
3. **Feature availability** — Salla enables the `checkout-sdk` scope per partner during rollout;
   `salla_scopes action=get` lists it for an enabled partner. Platform-wide switch off → every
   create answers `403 checkout_not_enabled`.
4. **App installed** on the store, with that store's access token held by your backend
   (→ [salla-app-auth](../salla-app-auth/SKILL.md)).
5. **Webhook URL** set on the app and `app.checkout.paid` handled (Step 4).

## Step 1 — Add the scope

`salla_scopes action=set`, `app_id`, scopes including `"checkout-sdk": "read_write"` (keep the
app's other scopes in the same map). Merchants who installed earlier re-grant on the next app
update, so ask them to update the app before the first charge.

**Gate:** "`salla_scopes action=get` shows `checkout-sdk` selected with `read_write`?"

## Step 2 — Create the checkout on your backend

Call `POST https://api.salla.dev/admin/v2/apps/checkouts` with
`Authorization: Bearer <store access token>`. Full request, response and error tables →
[`references/api-contract.md`](references/api-contract.md) (load now).

- `reference_id` — your own order id (1–64 chars, `[A-Za-z0-9_-]`). It is the idempotency key
  per app + store: replaying the same body returns `200` with the existing checkout.
- `items` — 1–5 lines, each `name`, `unit_price` (SAR, VAT-exclusive, ≤ 2 decimals), `quantity`
  (1–10000), optional `description`.
- `taxable` — send `true` (the default) unless the app is approved for VAT-exempt checkouts (Step 6).
- `expires_in` — optional, minutes 15–10080, default 1440.

Correlate the checkout, its GET responses and the `app.checkout.paid` webhook with your order by
`reference_id`.

Persist `data.id` (the `checkout_id`) next to your order, then return it to the embedded page.

Handle each error with its action:

| `error.code`                    | Action                                                                                          |
| ------------------------------- | ----------------------------------------------------------------------------------------------- |
| `amount_out_of_range`           | Show the merchant `min_total` / `max_total` from the response and ask for an amount inside them |
| `non_taxable_not_allowed`       | Send `taxable: true`, or complete the VAT-exempt approval (Step 6) first                        |
| `reference_id_conflict`         | Reuse the existing checkout: `GET /apps/checkouts?reference_id=<id>`; use a new id for new data |
| `rate_limit_exceeded` (429)     | Back off exponentially (limit: 60 requests/min per app + store) and retry                       |
| `validation_failed`             | Read `fields`, fix the body, resend                                                             |
| `app_not_installed`             | Ask the merchant to reinstall the app                                                           |
| `checkout_not_found` (404)      | The id is not this app + store; create a new checkout                                           |
| `checkout_not_cancelable` (409) | The checkout is no longer pending; read its status with GET and stop                            |
| `checkout_not_enabled`          | Feature switched off platform-wide; show "unavailable" and retry later                          |
| `unauthorized` (401)            | Token lacks `checkout-sdk` (`read_write` for POST): re-run Step 1, merchant updates the app     |

**Gate:** "Amount computed server-side, `reference_id` is your order id, `data.id` stored, every
error code above mapped to an action?"

## Step 3 — Open it in the embedded page

Register `embedded.checkout.onResult` first, then open the drawer with the id from your backend:

```typescript
import { embedded } from "@salla.sa/embedded-sdk";

const off = embedded.checkout.onResult((r) => {
  // r.status: "paid" | "pending" | "failed" | "cancelled"; r.order_id; r.checkout_id; r.context
  if (r.status === "paid") showPending("Finishing your purchase…");
  else if (!r.success)
    embedded.ui.toast.error(r.error?.message ?? "Payment failed");
});

const { checkout_id } = await fetchJson("/api/topup", {
  method: "POST",
  body: { credits: 500 },
});
embedded.checkout.create({ checkout_id }, { context: { topup: "8812" } });
```

- `create({ checkout_id })` takes the id alone. Mixing it with `items`, or an empty id, throws
  `INVALID_CHECKOUT_INPUT` before anything is sent — wrap the call in try/catch.
- A checkout that is not this app's answers `{ success:false, status:"failed", error:{ code:"CHECKOUT_NOT_FOUND" } }` — create a fresh one.
- `onResult` also fires after a 3DS redirect reloads the iframe; keep `context` for restoring the page state.
- Confirm signatures against the installed `@salla.sa/embedded-sdk` version (the `checkout_id` form needs `@salla.sa/embedded-sdk` `0.3.0` or newer, proposed in embedded-sdk#33).

**Gate:** "`onResult` registered before `create()`; the client result only shows a pending state?"

## Step 4 — Fulfil on `app.checkout.paid`

Grant the credits (or deliver the service) from the webhook handler only. Payload →
[`references/webhook-and-fulfilment.md`](references/webhook-and-fulfilment.md) (load now).

1. Verify the signature before any logic (→ [salla-webhooks](../salla-webhooks/SKILL.md)); answer 200 fast, process async.
2. Idempotency key = `data.checkout.id`. Insert it in a unique-keyed table inside the same
   transaction that applies the fulfilment; a duplicate delivery is a no-op.
3. Match your order with `data.checkout.reference_id`; compare `sub_total` with what you charged.
4. Fulfil for the store in `merchant`; `data.store_type` tells a live store from a demo store.

Reconcile missed events: `GET /apps/checkouts/{id}` (or list by `reference_id`) and fulfil when
`status` is `paid`, through the same idempotent path. `POST /apps/checkouts/{id}/cancel` retires a
`pending` checkout you no longer want (`checkout_not_cancelable` once it is not pending).

**Gate:** "Handler verified, idempotent by `checkout.id`, and the only place that fulfils?"

## Step 5 — Register the event and the webhook URL

`salla_apps action=connect`, `app_id`, `webhook_url` (app events auto-deliver there — no
subscribe call). Handle `app.checkout.paid` next to `app.subscription.*` in the same endpoint.

**Gate:** "salla_apps action=get shows webhook_url set, and the endpoint answers app.checkout.paid with 200?"

## Step 6 — VAT-exempt checkouts (only when the business needs them)

Checkouts are VAT-taxed (`taxable: true`). To sell VAT-exempt, the app's publication requests
approval. Primary route: Partners Portal → publication Pricing step → tick the checkbox "Allow
VAT-exempt Checkout SDK purchases" (shown only to partners Salla enabled for it). MCP route, once
partners-mcp ships it: `app_publish action=set section=pricing` with `allow_non_taxable: true`.
It takes effect when an admin approves the publication; then `taxable: false` is accepted on
create. Without approval it answers `403 non_taxable_not_allowed`. → publication flow in
[salla-publication-consistency](../salla-publication-consistency/SKILL.md).

## Step 7 — Test on a demo store

Recipe → [`references/webhook-and-fulfilment.md`](references/webhook-and-fulfilment.md#test-recipe)
(install on a demo store, grant the scope, create, pay with a test card, see the webhook).
Follow [salla-live-testing](../salla-live-testing/SKILL.md) for the store setup.

**Gate:** "One end-to-end run: create → drawer → paid → webhook → fulfilment applied once?"

## Red Flags

| Tempting thought                                        | Why it's wrong                                                                                                     |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| "`onResult` says paid — I'll grant the credits now."    | The client result is UX only; fulfil from the verified `app.checkout.paid` webhook (Steps 3–4).                    |
| "The webhook may arrive twice; the credits are small."  | Deliveries repeat and retry. Key the fulfilment on `checkout.id` in a unique-keyed table (Step 4).                 |
| "I'll build the price client-side and pass the items."  | The amount is computed on your backend and sent to the create API; the SDK opens only a `checkout_id` (Steps 2–3). |
| "A fixed add-on is close enough for top-ups."           | Add-ons carry one publication price. Any computed amount uses this skill (Choose the right purchase skill).        |
| "`taxable: false` is just a flag I can send."           | It needs the admin-approved `allow_non_taxable`; otherwise `403 non_taxable_not_allowed` (Step 6).                 |
| "Create failed with 409 — I'll retry with a random id." | Reuse the existing checkout through `reference_id` (Step 2); a random id double-charges the same order.            |

## Key Resources

| Resource                          | Where                                  |
| --------------------------------- | -------------------------------------- |
| Request / response / error tables | `references/api-contract.md`           |
| Webhook payload, fulfilment, test | `references/webhook-and-fulfilment.md` |
| Fixed-price add-on purchase       | salla-addon-purchase-embedded skill    |
| Webhook transport and signature   | salla-webhooks skill                   |
| Scopes and tokens                 | salla-app-auth skill                   |
