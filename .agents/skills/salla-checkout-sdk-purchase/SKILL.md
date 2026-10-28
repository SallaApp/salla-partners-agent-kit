---
name: salla-checkout-sdk-purchase
description: >
  Charging a merchant a server-computed amount (usage, credits, top-ups, quotes) from an embedded
  Salla app through the Checkout SDK. Use when the amount is computed by your backend rather than a
  fixed publication add-on price. Hand-offs → salla-addon-purchase-embedded (fixed-price add-ons),
  salla-webhooks (signature), salla-app-auth (scope, token), salla-embedded-app (SDK init).
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

1. **Public app** — the `checkouts` scope is not offered to private apps.
2. **Embedded app** working — SDK initialized, session token verified server-side, and a
   **default embedded page** that handles the payment result (Step 3)
   (→ [salla-embedded-app](../salla-embedded-app/SKILL.md)).
3. **App installed and active** on the store, with that store's access token held by your
   backend (→ [salla-app-auth](../salla-app-auth/SKILL.md)).
4. **Webhook URL** set on the app and `app.checkout.paid` handled (Steps 4–5).

## Step 1 — Add the `checkouts` scope; call from your backend

`salla_scopes action=set`, `app_id`, the app's full scope map plus `"checkouts": "read_write"`
(`read_write` creates checkouts; `read` only reads them). Merchants who installed earlier
re-authorise the app on its next update before their token carries the scope; a token without
it gets `401`.

Every Checkout SDK call runs on your backend with `Authorization: Bearer <store access token>` —
the token Salla issued for that store. The store and the app come from the token. The embedded
page never holds this token; it asks your backend for a checkout id. On `401`, refresh the token
(→ [salla-app-auth](../salla-app-auth/SKILL.md)) and retry once.

**Gate:** "`salla_scopes action=get` shows `checkouts` with `read_write`, and the create call runs
server-side with the access token of the store being charged?"

## Step 2 — Create the checkout on your backend

Call `POST https://api.salla.dev/admin/v2/checkouts`. Full request, response and error tables →
[`references/api-contract.md`](references/api-contract.md) (load now).

- `reference_id` — **required**, your own order id (≤ 64 chars), unique per app + store. A new
  create with the same `reference_id` **replaces** the unpaid checkout (the old id answers `404`
  from then on); once that checkout is paid, a create answers `403 reference_id_already_paid`.
- `items` — at least one line, each `amount` (the **line total** in SAR, VAT-exclusive, 1–999999.99),
  `quantity` (default 1), `name` as `{ "ar": "…", "en": "…" }` (Arabic is shown first), optional
  `description` (≤ 500).
- `taxable` — send `true` (the default) unless the app is approved for VAT-exempt checkouts (Step 6).

Salla sets the source, the partner and the post-payment page (your app's default embedded page);
a checkout has no expiry and stays `pending` until it is paid or replaced.

The create answers `201` with `data.cart_id` — the checkout id. Persist it next to your order
(replacing any id stored for the same `reference_id`), then return it to the embedded page. Read
the totals with `GET /admin/v2/checkouts/{cart_id}`.

Handle each error with its action:

| Response                              | Action                                                                                         |
| ------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `403 non_taxable_not_allowed`         | Send `taxable: true`, or complete the VAT-exempt approval (Step 6) first                       |
| `403 reference_id_already_paid`       | The order is already paid: fulfil it (Step 4) and create nothing new for this `reference_id`   |
| `403` app not installed or not active | Ask the merchant to install or re-activate the app                                             |
| `404 not_found` (show)                | Not this app + store, or replaced by a newer create: use the id you stored last                |
| `404 store_owner_not_found`           | The store has no owner user; contact Salla support                                             |
| `422` (with `error.fields`)           | Fix the listed fields and resend (e.g. missing `reference_id`, `amount` out of range)          |
| HTTP `401`                            | Token missing, expired, or without `checkouts`: refresh it, or complete Step 1, and retry once |

**Gate:** "Amount computed server-side, `reference_id` is your order id, `data.cart_id` stored,
every response above mapped to an action?"

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

const { cart_id } = await fetchJson("/api/topup", {
  method: "POST",
  body: { credits: 500 },
});
embedded.checkout.create(
  { checkout_id: String(cart_id) },
  { context: { topup: "8812" } },
);
```

- `create({ checkout_id })` takes the id alone, as a string. Mixing it with `items`, or an empty
  id, throws `INVALID_CHECKOUT_INPUT` before anything is sent — wrap the call in try/catch.
- A checkout that is not this app's answers `{ success:false, status:"failed", error:{ code:"CHECKOUT_NOT_FOUND" } }` — create a fresh one.
- After payment (including 3DS) the merchant returns to `/embedded/app/<app_id>`, and the host
  opens your app's **default embedded page** with the result: register `onResult` on that page
  too. Its `checkout_id` is the id the host stored when `create()` ran (never read from the URL);
  keep `context` for restoring the page state. Confirm payment on your backend with
  `GET /admin/v2/checkouts/{cart_id}` or the webhook.
- The `checkout_id` form needs `@salla.sa/embedded-sdk` `0.2.7` or newer.

**Gate:** "`onResult` registered before `create()` and on the default page; the client result only
shows a pending state?"

## Step 4 — Fulfil on `app.checkout.paid`

Grant the credits (or deliver the service) from your backend only, after Salla confirms payment.
Payload → [`references/webhook-and-fulfilment.md`](references/webhook-and-fulfilment.md) (load now).

1. Verify the signature before any logic (→ [salla-webhooks](../salla-webhooks/SKILL.md)).
2. Idempotency key = `data.checkout.cart_id` — the same integer `cart_id` as create and show;
   one event per checkout. Insert it in a unique-keyed table inside the same transaction that applies the
   fulfilment; a duplicate delivery is a no-op.
3. Match your order with `data.checkout.reference_id`; compare `sub_total` with what you charged.
4. Answer `200` only after the delivery is persisted or enqueued; anything else makes Salla retry.

Refunds: none in phase 1 (D12) — there is no refund endpoint for a paid checkout. Handle business
refunds by adjusting the merchant's balance in your own system.

Reconcile missed events: `GET /admin/v2/checkouts/{cart_id}` with the id you stored, and fulfil
when `status` is `paid`, through the same idempotent path. The API has two endpoints — create and
show — so the stored `cart_id` is your only lookup key.

**Gate:** "Handler verified, idempotent by `checkout.cart_id`, and the only place that fulfils?"

## Step 5 — Register the event and the webhook URL

`salla_apps action=connect`, `app_id`, `webhook_url`, `webhook_security_strategy: "signature"`
(required — → [salla-webhooks](../salla-webhooks/SKILL.md)); app events auto-deliver there — no
subscribe call. Handle `app.checkout.paid` next to `app.subscription.*` in the same endpoint.

**Gate:** "salla_apps action=get shows webhook_url set, and the endpoint answers app.checkout.paid with 200?"

## Step 6 — VAT-exempt checkouts (only when the business needs them)

Checkouts are VAT-taxed (`taxable: true`). To sell VAT-exempt, the app's publication sets
`allow_non_taxable` to `1` (`0`, the default, is taxable only):

1. `app_publish action=get` → `can_request_non_taxable`. Only when it is `true` does Salla offer
   the option; otherwise the Portal saves `allow_non_taxable: 0`.
2. Partners Portal → publication Pricing step → allow VAT-exempt Checkout SDK purchases, or
   `app_publish action=set section=pricing` with `allow_non_taxable: 1` (once partners-mcp ships it).
3. Salla reviews it with the publication. The checkout API reads the value from the **approved**
   publication, on every store — demo stores included.

Without it, `taxable: false` answers `403 non_taxable_not_allowed`. → publication flow in
[salla-publication-consistency](../salla-publication-consistency/SKILL.md).

**Gate:** "`allow_non_taxable: 1` on the approved publication before any `taxable: false` create?"

## Step 7 — Test on a demo store

Recipe → [`references/webhook-and-fulfilment.md`](references/webhook-and-fulfilment.md#test-recipe)
(install on a demo store, create, pay with a test card, see the webhook).
Follow [salla-live-testing](../salla-live-testing/SKILL.md) for the store setup.

**Gate:** "One end-to-end run: create → drawer → paid → webhook → fulfilment applied once?"

## Red Flags

| Tempting thought                                         | Why it's wrong                                                                                                        |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| "My app token already works for orders; skip the scope." | Checkout calls need `checkouts` on the token; without it every call answers `401` (Step 1).                           |
| "`onResult` says paid — I'll grant the credits now."     | The client result is UX only; fulfil from the verified `app.checkout.paid` webhook or a backend GET (Steps 3–4).      |
| "The webhook may arrive twice; the credits are small."   | Deliveries repeat and retry. Key the fulfilment on `checkout.cart_id` in a unique-keyed table (Step 4).               |
| "I'll build the price client-side and pass the items."   | The amount is computed on your backend and sent to the create API; the SDK opens only a checkout id (Steps 2–3).      |
| "A fixed add-on is close enough for top-ups."            | Add-ons carry one publication price. Any computed amount uses this skill (Choose the right purchase skill).           |
| "`taxable: false` is just a flag I can send."            | It needs `allow_non_taxable: 1` on the approved publication; otherwise `403 non_taxable_not_allowed` (Step 6).        |
| "Create failed — I'll retry with a random id."           | Retry with the same `reference_id` (Step 2): it replaces the unpaid checkout; a random id can charge one order twice. |

## Key Resources

| Resource                          | Where                                  |
| --------------------------------- | -------------------------------------- |
| Request / response / error tables | `references/api-contract.md`           |
| Webhook payload, fulfilment, test | `references/webhook-and-fulfilment.md` |
| Fixed-price add-on purchase       | salla-addon-purchase-embedded skill    |
| Webhook transport and signature   | salla-webhooks skill                   |
| Scopes, store access token        | salla-app-auth skill                   |
