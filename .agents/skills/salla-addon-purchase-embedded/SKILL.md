---
name: salla-addon-purchase-embedded
description: >
  The in-app addon purchase UX inside an embedded Salla app — present purchasable addons and
  start checkout via the embedded SDK Checkout module (Salla owns billing; never collect
  payment in the iframe), then handle the return. Use when building the buy/upsell UI in an
  embedded page or wiring the checkout handoff. This is part of the embedded flow →
  salla-embedded-app. Activation + entitlement lifecycle after purchase → salla-addon-purchase.
---

# Salla Addon Purchase — Embedded UX

Buying an addon happens **inside the embedded app** — it is part of the embedded flow, not a
separate page or redirect-based flow. This skill owns only the **purchase UX**: show the
offer, hand off to Salla's checkout, handle the return. Everything after payment —
activation, entitlement, renewal — is webhook-driven and owned by
[salla-addon-purchase](../salla-addon-purchase/SKILL.md).

## Tools & MCPs

The in-iframe purchase is an **embedded-SDK Checkout call, not an MCP tool**. No MCP action
is performed here; subscribing the activation webhook belongs to **salla-addon-purchase**.

> Salla owns billing — never collect payment in the iframe. SDK init/handshake + No-Chrome →
> **salla-embedded-app** · the addon definition, activation webhook, and entitlement
> lifecycle → **salla-addon-purchase** · pricing primitives → **salla-app-billing**.

---

## Prerequisite — a working embedded app

Your page must already be a working embedded app (SDK initialized, handshake done, session
token verified server-side, No-Chrome). Don't re-implement it — follow
**salla-embedded-app**.

**Gate:** "Embedded SDK initialized and the session token verified server-side?"

---

## Step 1 — Present Purchasable Addons

Render the offer inside the page with Salla's design tokens (No-Chrome). Keep it to the addon
name, what it unlocks, and price — let Salla's checkout handle the money.

```typescript
embedded.ui.loading.show();
// fetch the addons you want to surface (your catalog mapped to Salla addon item_slugs)
const addons = await fetch("/api/addons").then((r) => r.json());
embedded.ui.loading.hide();
// render cards; each "Buy" button calls startAddonPurchase(addon) (Step 2)
```

---

## Step 2 — Start Checkout via the Embedded SDK Checkout Module

The purchase entry point is the embedded SDK **Checkout module** — the authoritative source
for the method names and shapes.

> **Must read before implementing — do not guess method signatures or return shapes:**
> Embedded SDK Checkout module — https://docs.salla.dev/embedded-sdk/modules/checkout/create.md

The Checkout module covers listing the app's add-ons, creating the checkout for the chosen
addon, and hearing the payment result in the iframe. Confirm the exact calls there, then:

```typescript
async function startAddonPurchase(addon: { item_slug: string }) {
  try {
    embedded.ui.loading.show();
    // Use the Checkout module call confirmed in the docs above to open Salla's checkout.
    // The merchant pays inside Salla billing, then returns to the iframe.
  } catch (e) {
    embedded.ui.toast.error("Couldn't start checkout");
  } finally {
    embedded.ui.loading.hide();
  }
}
```

After checkout the merchant returns to the iframe. The session token may have rotated — if an
API call returns `401`, call `embedded.auth.refresh()` (→ salla-embedded-app) and
re-bootstrap.

**Gate:** "Checkout opened via a Checkout-module call confirmed in the docs — not a guessed
method or hardcoded URL?"

---

## Step 3 — Don't Unlock on Return — Hand Off to the Webhook

The redirect/return only means checkout was _opened_, not paid. **Do not unlock the feature
here.** Activation is webhook-driven and owned by **salla-addon-purchase** (it processes
`app.subscription.started`, `item_type: "addon"`, matched by `item_slug`).

On return, show a **pending state** and let the activation flip it:

```typescript
// merchant is back in the iframe — show pending, poll/refresh entitlements
embedded.ui.toast.show("Finishing your purchase…");
// when salla-addon-purchase has activated the entitlement, reveal the feature:
embedded.ui.toast.success("Addon activated 🎉"); // after entitlement is persisted
```

Never block on the redirect; if the webhook hasn't landed yet, keep the pending state.

**Gate:** "Return shows pending only; the feature reveals only after salla-addon-purchase
persists the entitlement?"

---

## End-to-End (this skill owns the top half)

```text
[embedded page] present addon  (this skill)
      │  merchant clicks Buy
      ▼
Checkout module → Salla checkout  (this skill — doc-confirmed call)
      │  merchant pays in Salla billing
      ▼
return to iframe → pending state  (this skill; token may rotate → embedded.auth.refresh)
      ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄
      ▼  (webhook — salla-addon-purchase owns this)
app.subscription.started (addon) → activate entitlement → reveal feature
```

---

## Key Resources

| Resource                           | URL / Skill                                                    |
| ---------------------------------- | -------------------------------------------------------------- |
| Embedded SDK setup / No-Chrome     | salla-embedded-app skill                                       |
| Embedded SDK Checkout module       | https://docs.salla.dev/embedded-sdk/modules/checkout/create.md |
| Activation + entitlement lifecycle | salla-addon-purchase skill                                     |
| Pricing / definition               | salla-app-billing skill                                        |
| `@salla.sa/embedded-sdk`           | npm package (purchase-method authority)                        |
| Partners Portal                    | https://salla.partners                                         |
