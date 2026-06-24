---
name: salla-addon-purchase-embedded
description: >
  The in-app addon purchase UX inside an embedded Salla app — list the app's add-ons, open a
  native checkout, and hear the payment result via the embedded SDK Checkout module
  (`embedded.checkout.getAddons` / `.create` / `.onResult`). Salla owns billing; never collect
  payment in the iframe. Use when building the buy/upsell UI in an embedded page or wiring the
  checkout handoff. Part of the embedded flow → salla-embedded-app. Activation + entitlement
  lifecycle after purchase → salla-addon-purchase.
---

# Salla Addon Purchase — Embedded UX

Buying an addon happens **inside the embedded app** — a native checkout drawer opens in the
Salla Merchant Dashboard, not a separate page or external redirect. This skill owns only the
**purchase UX**: list the add-ons, open the checkout, react to the result. Everything after
payment — activation, entitlement, renewal — is webhook-driven and owned by
[salla-addon-purchase](../salla-addon-purchase/SKILL.md).

## Tools & MCPs

The in-iframe purchase is an **embedded-SDK Checkout call, not an MCP tool** — no MCP action
runs here.

| Hand-off                                          | Skill                    |
| ------------------------------------------------- | ------------------------ |
| SDK init / handshake / No-Chrome                  | **salla-embedded-app**   |
| Addon definition, activation webhook, entitlement | **salla-addon-purchase** |
| Pricing primitives                                | **salla-app-billing**    |

---

## Prerequisite — a working embedded app

Build the embedded app first via **salla-embedded-app** (SDK initialized, handshake done,
session token verified server-side, No-Chrome). From here on, assume an authenticated
embedded session.

**Gate:** "Embedded SDK initialized and the session token verified server-side?"

---

## The Checkout module

The purchase entry point is the embedded SDK **Checkout module** — three methods cover the
full flow:

- `embedded.checkout.getAddons()` — fetch your app's add-ons (slugs, names, prices).
  Docs: https://docs.salla.dev/embedded-sdk/modules/checkout/add-ons.md
- `embedded.checkout.create(input, config?)` — open the native checkout drawer.
  Docs: https://docs.salla.dev/embedded-sdk/modules/checkout/create.md
- `embedded.checkout.onResult(callback)` — hear the payment result (incl. after a 3DS redirect).
  Docs: https://docs.salla.dev/embedded-sdk/modules/checkout/result.md

These three Checkout-module docs are the source of truth for the **frontend purchase cycle**.
SDK signatures and payloads are version-dependent across `@salla.sa/embedded-sdk` releases —
confirm them against the docs or the package, and don't hardcode prices or URLs. The addon
**`slug` is YOUR pre-known identifier** — you set it as the addon's `slug` at publish and match it
as `item_slug` in the subscription webhooks + API — so referencing your own slug directly is
expected.

---

## Step 1 — List the app's add-ons (`getAddons`)

Add-ons are defined in the Pricing step of the App Publish form in the Partners Portal.
`getAddons` returns the authoritative list at runtime; the host caches it for ~30 minutes, so
repeated calls are cheap.

> Source: https://docs.salla.dev/embedded-sdk/modules/checkout/add-ons.md

```typescript
import { embedded } from "@salla.sa/embedded-sdk";

// embedded.checkout.getAddons(): Promise<GetAddonsResult>
//   GetAddonsResult = { success: boolean; addons?: AddonInfo[]; error?: { code; message } }
//   AddonInfo = { slug; name; price; product_id; product_price_id }
async function loadAddons() {
  embedded.ui.loading.show();
  const result = await embedded.checkout.getAddons();
  embedded.ui.loading.hide();

  if (!result.success) {
    embedded.ui.toast.error(result.error?.message ?? "Could not load addons.");
    return;
  }

  // Render with Salla's design tokens (No-Chrome): name, what it unlocks, price.
  // Each "Buy" wires the addon's slug straight into startAddonPurchase (Step 2).
  result.addons!.forEach((addon) => {
    renderAddonCard({
      name: addon.name,
      price: addon.price,
      onBuy: () => startAddonPurchase(addon.slug),
    });
  });
}
```

`getAddons()` resolves (never throws) on network/timeout errors — always handle
`success: false`. Use the returned `slug` values verbatim in `create()`; a slug that doesn't
match an available addon fails checkout.

**Gate:** "Slugs and prices come from `getAddons()`, not hardcoded?"

---

## Step 2 — Open the checkout (`create`) and hear the result (`onResult`)

`create()` opens the native payment drawer in the Salla Dashboard. The merchant pays inside
Salla billing — you never collect payment. Register `onResult` **first** (before any
`create()` call) so you don't miss the response, including results delivered after a 3DS
redirect reloads the iframe.

> Sources:
> https://docs.salla.dev/embedded-sdk/modules/checkout/create.md ·
> https://docs.salla.dev/embedded-sdk/modules/checkout/result.md

```typescript
import { embedded } from "@salla.sa/embedded-sdk";

// Register the result listener once, during init — catches post-3DS-redirect results too.
// embedded.checkout.onResult(callback): () => void   (returns an unsubscribe fn)
//   CheckoutResult = {
//     success: boolean;
//     order_id?: string;
//     status: "paid" | "pending" | "failed" | "cancelled" | "success";
//     error?: { code; message };
//     context?: unknown;   // whatever you passed to create()'s config.context
//   }
const unsubscribe = embedded.checkout.onResult((result) => {
  if (result.context?.route) router.push(result.context.route); // restore state after 3DS
  if (result.success) {
    // Checkout completed — show PENDING, do NOT unlock here (Step 3).
    embedded.ui.toast.show("Finishing your purchase…");
  } else if (result.error) {
    embedded.ui.toast.error(result.error.message);
  }
});
// call unsubscribe() on unmount to avoid leaks.

// embedded.checkout.create(input, config?): void
//   input  = CheckoutItem | CheckoutItem[]
//   CheckoutItem = { type: "addon"; slug: string; quantity?: number /* default 1 */ }
//   config = { context?: unknown }   // persisted across 3DS redirects, returned in onResult
function startAddonPurchase(slug: string) {
  try {
    embedded.checkout.create(
      { type: "addon", slug },
      { context: { source: "embedded-upsell" } },
    );
  } catch (e) {
    // create() throws synchronously on invalid input
    // ("At least one item is required", "...must have a valid slug/type").
    embedded.ui.toast.error("Couldn't start checkout");
  }
}
```

For a basket, pass an array — `create([{ type: "addon", slug, quantity: 2 }, …])`. `type` is
currently always `"addon"`. Use `context` to stash the route/step so you can restore it when
the iframe reloads after 3DS.

After checkout the merchant is back in the iframe; the session token may have rotated. If a
backend API call returns `401`, call `embedded.auth.refresh()` (→ salla-embedded-app) and
re-bootstrap.

**Gate:** "`onResult` registered before `create()`, and checkout opened via `create()` with a
real `getAddons()` slug — not a hardcoded URL?"

---

## Step 3 — Hand off to the webhook to unlock

A `success` result (or `status: "paid"`) means checkout **completed in the iframe** — treat it
as a UI signal only. The feature unlocks via the activation webhook, owned by
**salla-addon-purchase** (it processes `app.subscription.started`, `item_type: "addon"`,
matched by `item_slug`, signature-verified and idempotent — transport rules in
**salla-webhooks**).

On a successful result, show a **pending state** and let the activation flip it:

```typescript
// inside onResult, on result.success:
embedded.ui.toast.show("Finishing your purchase…");
// when salla-addon-purchase has activated the entitlement, reveal the feature:
embedded.ui.toast.success("Addon activated"); // after entitlement is persisted server-side
```

Poll/refresh entitlements from your verified backend; reveal the feature once the entitlement
is persisted server-side, and keep the pending state until the webhook lands.

**Gate:** "Result shows pending only; the feature reveals only after salla-addon-purchase
persists the entitlement?"

---

## End-to-End (this skill owns the top half)

```text
[embedded page] getAddons() → render offer  (this skill)
      │  merchant clicks Buy
      ▼
checkout.create({ type:"addon", slug })  (this skill — opens native drawer)
      │  merchant pays in Salla billing  (3DS may redirect & reload the iframe)
      ▼
checkout.onResult(result) → pending state  (this skill; token may rotate → embedded.auth.refresh)
      ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄
      ▼  (webhook — salla-addon-purchase owns this)
app.subscription.started (addon) → activate entitlement → reveal feature
```

---

## Red Flags

| Tempting thought                                                 | Why it's wrong                                                                                                                                                                                                        |
| ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "`onResult` returned success, so I'll unlock the addon now."     | The client result only moves the UI to a pending state — **activate the entitlement only on the signature-verified `app.subscription.started` webhook** (`item_type: "addon"`), via salla-addon-purchase (Steps 2–3). |
| "I'll add my own card form / payment step in the embedded page." | **Salla owns billing.** Open the native drawer with `checkout.create({type:"addon", slug})` — never collect or store payment yourself (The Checkout module / Step 2).                                                 |
| "I'll match the purchased addon by its name or array index."     | Match by **`item_slug`** — the stable identifier you set as the addon's `slug` and receive on every lifecycle event (Step 3).                                                                                         |
| "I'll trust the client result to track what the merchant owns."  | Reconcile entitlement against the **server** (the webhook + the subscriptions API), not the client `onResult` — the token may even rotate mid-flow (`embedded.auth.refresh`) (Step 3).                                |

## Key Resources

| Resource                           | URL / Skill                                                     |
| ---------------------------------- | --------------------------------------------------------------- |
| Embedded SDK setup / No-Chrome     | salla-embedded-app skill                                        |
| Checkout · Get Add-ons             | https://docs.salla.dev/embedded-sdk/modules/checkout/add-ons.md |
| Checkout · Create                  | https://docs.salla.dev/embedded-sdk/modules/checkout/create.md  |
| Checkout · Subscribe Result        | https://docs.salla.dev/embedded-sdk/modules/checkout/result.md  |
| Activation + entitlement lifecycle | salla-addon-purchase skill                                      |
| Pricing / definition               | salla-app-billing skill                                         |
| `@salla.sa/embedded-sdk`           | npm package (Checkout module authority)                         |
| Partners Portal                    | https://salla.partners                                          |
