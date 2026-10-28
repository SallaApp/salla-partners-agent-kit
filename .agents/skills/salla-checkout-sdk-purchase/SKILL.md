---
name: salla-checkout-sdk-purchase
description: >
  Charging a merchant a server-computed amount (usage, credits, top-ups, quotes) from an embedded
  Salla app through the Checkout SDK. Use when the amount is computed by your backend rather than a
  fixed publication add-on price. Hand-offs → salla-addon-purchase-embedded (fixed-price add-ons),
  salla-webhooks (signature), salla-app-auth (store token), salla-embedded-app (SDK init).
---

# Salla Checkout SDK Purchase — dynamic amounts

Your backend computes the amount, Salla collects the payment in the merchant's native checkout
drawer, and Salla tells your backend when it is paid. This skill owns the whole cycle: create →
open → fulfil. Payouts follow the normal partner payout flow, with Salla's Checkout SDK
commission (default 15 %, set per partner company, separate from payment links); there is
nothing to configure.

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
2. **App installed** on the store, with that store's access token held by your backend
   (→ [salla-app-auth](../salla-app-auth/SKILL.md)). The Checkout SDK uses this normal app token,
   like `POST /apps/balance` — it needs no extra OAuth scope.
3. **Feature availability** — Salla enables the Checkout SDK per store during rollout. Where it is
   not enabled, every call answers `403 checkout_not_enabled`.
4. **Webhook URL** set on the app and `app.checkout.paid` handled (Steps 4–5).

## Step 1 — Call from your backend with the store's token

Every Checkout SDK API call runs on your backend with
`Authorization: Bearer <store access token>` — the token Salla issued for that store at install
(`app.store.authorize`). The embedded page never holds this token; it asks your backend for a
`checkout_id`. On `401`, refresh the token (→ [salla-app-auth](../salla-app-auth/SKILL.md)) and
retry once.

**Gate:** "The create call runs server-side with the access token of the store being charged?"

## Step 2 — Create the checkout on your backend

Call `POST https://api.salla.dev/admin/v2/apps/checkouts`. Full request, response and error
tables → [`references/api-contract.md`](references/api-contract.md) (load now).

- `reference_id` — your own order id (1–64 chars, `[A-Za-z0-9_-]`), unique per app + store. A
  new create with the same `reference_id` **replaces** the unpaid checkout (the old id answers
  `404` from then on); once that checkout is paid, a create answers `403 reference_id_already_paid`.
- `items` — 1–5 lines, each `name`, `unit_price` (SAR, VAT-exclusive, ≤ 2 decimals), `quantity`
  (1–10000), optional `description`.
- `taxable` — send `true` (the default) unless the app is approved for VAT-exempt checkouts (Step 6).
- `redirect_uri` — optional dashboard path where the merchant lands after paying. Set it to your
  embedded page (for example `/embedded/app/<app_id>/<page>`) so the page reloads and `onResult`
  fires (Step 3).

A checkout has no expiry: it stays `pending` until it is paid or replaced.

Correlate the checkout and the `app.checkout.paid` webhook with your order by `reference_id`.

The create answers `201` with the checkout. Persist `data.id` (the `checkout_id`) next to your
order — replacing any id stored for the same `reference_id` — then return it to the embedded page.

Handle each error with its action:

| `error.code`                        | Action                                                                                          |
| ----------------------------------- | ----------------------------------------------------------------------------------------------- |
| `amount_out_of_range` (422)         | Show the merchant `min_total` / `max_total` from the response and ask for an amount inside them |
| `non_taxable_not_allowed` (403)     | Send `taxable: true`, or complete the VAT-exempt approval (Step 6) first                        |
| `reference_id_already_paid` (403)   | The order is already paid: fulfil it (Step 4) and create nothing new for this `reference_id`    |
| `rate_limit_exceeded` (429)         | Back off exponentially and retry (default limit: 60 requests/min per app token + store)         |
| `validation_failed` (422)           | Read `fields`, fix the body, resend                                                             |
| any other 422                       | Passed through from the checkout service: read `error.message`, fix the body, resend            |
| `checkout_not_found` (404)          | Not this app + store, or replaced by a newer create: use the id you stored last                 |
| `checkout_not_enabled` (403)        | Checkout SDK not enabled for this store; show "unavailable" and retry later                     |
| `checkout_limits_unavailable` (503) | Price limits temporarily unavailable; retry later with backoff                                  |
| `upstream_error` (502)              | Retry later with backoff                                                                        |
| HTTP `401`                          | Token missing, invalid or expired: refresh it (Step 1) and retry once                           |

**Gate:** "Amount computed server-side, `reference_id` is your order id, `data.id` stored, every
error code above mapped to an action?"

## Step 3 — Open it in the embedded page

Register `embedded.checkout.onResult` first, then open the drawer with the id from your backend:

```typescript
import { embedded } from "@salla.sa/embedded-sdk";

const off = embedded.checkout.onResult((r) => {
  // r.status: "paid" | "pending" | "failed" | "cancelled" | "success"; r.order_id; r.checkout_id; r.context
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
- `onResult` also fires after a 3DS redirect reloads the iframe. Its `checkout_id` is the id the
  host stored when `create()` ran (never read from the URL); keep `context` for restoring the page
  state. Confirm payment on your backend with `GET /apps/checkouts/{checkout_id}` or the webhook.
- The `checkout_id` form needs `@salla.sa/embedded-sdk` `0.2.7` or newer.

**Gate:** "`onResult` registered before `create()`; the client result only shows a pending state?"

## Step 4 — Fulfil on `app.checkout.paid`

Grant the credits (or deliver the service) from your backend only, after Salla confirms payment.
Payload → [`references/webhook-and-fulfilment.md`](references/webhook-and-fulfilment.md) (load now).

1. Verify the signature before any logic (→ [salla-webhooks](../salla-webhooks/SKILL.md)).
2. Idempotency key = `data.checkout.id` (one event per checkout; it arrives as a number, the
   API `id` as a string — compare them as strings). Insert it in a unique-keyed table inside
   the same transaction that applies the fulfilment; a duplicate delivery is a no-op.
3. Match your order with `data.checkout.reference_id`; compare `sub_total` with what you charged.
4. Answer `200` only after the delivery is persisted or enqueued; anything else makes Salla retry.

Refunds: none in phase 1 (D12) — there is no refund endpoint for a paid checkout. Handle business
refunds by adjusting the merchant's balance in your own system.

Reconcile missed events: `GET /apps/checkouts/{id}` with the `checkout_id` you stored, and fulfil
when `status` is `paid`, through the same idempotent path. The API has two endpoints — create and
show — so the stored `checkout_id` is your only lookup key.

**Gate:** "Handler verified, idempotent by `checkout.id`, and the only place that fulfils?"

## Step 5 — Register the event and the webhook URL

`salla_apps action=connect`, `app_id`, `webhook_url`, `webhook_security_strategy: "signature"`
(required — → [salla-webhooks](../salla-webhooks/SKILL.md)); app events auto-deliver there — no
subscribe call. Handle `app.checkout.paid` next to `app.subscription.*` in the same endpoint.

**Gate:** "salla_apps action=get shows webhook_url set, and the endpoint answers app.checkout.paid with 200?"

## Step 6 — VAT-exempt checkouts (only when the business needs them)

Checkouts are VAT-taxed (`taxable: true`). To sell VAT-exempt, the app's publication sets
`checkout_type` to `1` (taxable and VAT-exempt; `0`, the default, is taxable only):

1. `app_publish action=get` → `can_request_non_taxable`. Only when it is `true` does Salla offer
   the option; otherwise the Portal saves `checkout_type: 0`.
2. Partners Portal → publication Pricing step → choose the VAT-exempt checkout option, or
   `app_publish action=set section=pricing` with `checkout_type: 1` (once partners-mcp ships it).
3. Salla reviews it with the publication. Live stores use the **approved** publication; a partner
   demo store uses the **latest** one, so you can test `taxable: false` before approval.

Without it, `taxable: false` answers `403 non_taxable_not_allowed`. → publication flow in
[salla-publication-consistency](../salla-publication-consistency/SKILL.md).

**Gate:** "`checkout_type: 1` on the publication the store reads before any `taxable: false` create?"

## Step 7 — Test on a demo store

Recipe → [`references/webhook-and-fulfilment.md`](references/webhook-and-fulfilment.md#test-recipe)
(install on a demo store, create, pay with a test card, see the webhook).
Follow [salla-live-testing](../salla-live-testing/SKILL.md) for the store setup.

**Gate:** "One end-to-end run: create → drawer → paid → webhook → fulfilment applied once?"

## Red Flags

| Tempting thought                                       | Why it's wrong                                                                                                        |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| "`onResult` says paid — I'll grant the credits now."   | The client result is UX only; fulfil from the verified `app.checkout.paid` webhook or a backend GET (Steps 3–4).      |
| "The webhook may arrive twice; the credits are small." | Deliveries repeat and retry. Key the fulfilment on `checkout.id` in a unique-keyed table (Step 4).                    |
| "I'll build the price client-side and pass the items." | The amount is computed on your backend and sent to the create API; the SDK opens only a `checkout_id` (Steps 2–3).    |
| "A fixed add-on is close enough for top-ups."          | Add-ons carry one publication price. Any computed amount uses this skill (Choose the right purchase skill).           |
| "`taxable: false` is just a flag I can send."          | It needs publication `checkout_type: 1`; otherwise `403 non_taxable_not_allowed` (Step 6).                            |
| "Create failed — I'll retry with a random id."         | Retry with the same `reference_id` (Step 2): it replaces the unpaid checkout; a random id can charge one order twice. |

## Key Resources

| Resource                          | Where                                  |
| --------------------------------- | -------------------------------------- |
| Request / response / error tables | `references/api-contract.md`           |
| Webhook payload, fulfilment, test | `references/webhook-and-fulfilment.md` |
| Fixed-price add-on purchase       | salla-addon-purchase-embedded skill    |
| Webhook transport and signature   | salla-webhooks skill                   |
| Store access token and refresh    | salla-app-auth skill                   |
