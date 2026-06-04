---
name: salla-addon-purchase-embedded
description: >
  Use this skill for any task where a merchant buys an addon from INSIDE your
  embedded (iframe) Salla app — the in-app purchase UI, the billing/checkout
  redirect, and activating the addon after purchase. Trigger when a developer is:
  showing purchasable addons inside an embedded page, kicking off an addon purchase /
  billing redirect from the embedded SDK, handling the merchant's return from
  checkout, confirming a purchase via the `app.subscription.started` webhook with
  `item_type: "addon"`, or unlocking an addon's features after payment.

  Trigger also when you see: "buy addon", "purchase addon in app", "in-app purchase",
  "addon checkout", "billing redirect", "embedded addon", "addon item_slug",
  "activate addon", "upsell inside dashboard", or any question about selling an addon
  without sending the merchant out to the App Store listing.

  This skill sits on top of three others: the embedded SDK setup and No-Chrome rules
  (salla-embedded-app), how addons are priced/defined (salla-app-subscription-management),
  and how addon entitlements are tracked after purchase (salla-addon-subscription-management).
  Feature gating is salla-subscription-system. The MCP (apidog-mcp-server, site-id:
  451700) and the @salla.sa/embedded-sdk package are the authorities for the purchase
  method — confirm it there before writing the redirect, it is not fully documented.
---

# Salla Addon Purchase (Embedded) Skill

Let a merchant buy an addon without leaving your embedded app: present the offer, send
them through Salla billing, and unlock the addon when Salla confirms payment.

**MCP:** `apidog-mcp-server` (site-id: `451700`) — confirm the purchase/redirect mechanism
and the `app.subscription.started` (addon) payload before coding.
**Embedded SDK:** `@salla.sa/embedded-sdk` — see **salla-embedded-app** for init/handshake.
**Pricing/definition:** **salla-app-subscription-management** · **Entitlements after
purchase:** **salla-addon-subscription-management** · **Gating:** **salla-subscription-system**.

> Salla owns billing. You never collect payment in the iframe — you hand off to Salla's
> checkout and react to the resulting webhook. Activation is **webhook-driven**, not
> redirect-driven: the redirect starts checkout; `app.subscription.started` (addon)
> finishes it.

---

## Part 1 — Prerequisites (Embedded Context)

Your page must already be a working embedded app: SDK initialized, handshake done, token
verified server-side. Don't re-implement this — follow **salla-embedded-app**:

```typescript
import { embedded } from "@salla.sa/embedded-sdk";
const { layout } = await embedded.init({
  debug: process.env.NODE_ENV !== "production",
});
// token verified via POST https://api.salla.dev/exchange-authority/v1/introspect
embedded.ready();
```

Honor the **No-Chrome rule** — use Salla's native title/actions/toasts/loading, not your
own chrome.

---

## Part 2 — Define the Addon First

The addon must exist as a plan of type **Addon** in the Partners Portal (Pricing / Custom
Plans) before it can be purchased. Each addon has an `item_slug` you'll match on later.
See **salla-app-subscription-management** for how plans/addons are defined.

---

## Part 3 — Present Purchasable Addons

Render the offer inside your page using Salla's design tokens (No-Chrome). Keep it to the
addon name, what it unlocks, and price; let Salla's checkout handle the money.

```typescript
embedded.ui.loading.show();
// fetch the addons you want to surface (your own catalog mapped to Salla addon slugs)
const addons = await fetch("/api/addons").then((r) => r.json());
embedded.ui.loading.hide();
// render cards; each "Buy" button calls startAddonPurchase(addon) (Part 4)
```

---

## Part 4 — Start the Purchase / Billing Redirect

> ⚠️ **Unverified mechanism.** The exact embedded purchase entry point is **not fully
> documented**. Before implementing, confirm via the MCP and the `@salla.sa/embedded-sdk`
> source/README which of these Salla actually exposes:
>
> - an SDK method (e.g. an `embedded.*` billing/checkout call) that opens Salla billing
>   over the iframe, **or**
> - a billing/checkout **redirect URL** keyed by app id + addon `item_slug`.
>
> Do not ship a hardcoded URL or method name you couldn't confirm — surface the
> uncertainty to the user and verify first.

Pattern, written against whichever entry point the MCP confirms:

```typescript
async function startAddonPurchase(addon: { slug: string }) {
  try {
    // CONFIRM the real call via MCP / embedded-sdk before relying on it.
    // e.g. embedded.billing?.purchase({ addon: addon.slug })  — or a returned checkout URL.
    await embedded.ui.loading.show();
    await /* confirmed purchase entry point */ startSallaCheckout(addon.slug);
    // Merchant completes payment in Salla billing, then returns to the iframe.
  } catch (e) {
    embedded.ui.toast.error("Couldn't start checkout");
  } finally {
    embedded.ui.loading.hide();
  }
}
```

After checkout the merchant returns to your embedded page. The session token may have
rotated — if an API call returns `401`, call `embedded.auth.refresh()` (see
salla-embedded-app) and re-bootstrap.

---

## Part 5 — Activation (Webhook-Driven, Source of Truth)

Do **not** unlock features just because the redirect returned. Wait for Salla to confirm
payment via webhook:

```typescript
if (
  payload.event === "app.subscription.started" &&
  payload.data.item_type === "addon"
) {
  const { item_slug, subscription_id, end_date, features } = payload.data;
  await entitlements.activateAddon(payload.merchant, {
    addonSlug: item_slug,
    subscriptionId: subscription_id,
    endDate: end_date,
    features: features ?? [],
  });
}
```

- Match the addon by **`item_slug`** (plans have `item_slug: null`; addons carry the slug).
- Persist + track the addon subscription via **salla-addon-subscription-management**
  (recurring vs one-time, renewal, stacking on the plan).
- Verify the signature, respond 200 fast, dedup — see **salla-webhooks**.

---

## Part 6 — Reflect the New State in the UI

Once activated, confirm to the merchant inside the iframe and reveal the unlocked feature:

```typescript
embedded.ui.toast.success("Addon activated 🎉");
// re-fetch entitlements and re-render; gate features via salla-subscription-system
```

If the webhook hasn't landed yet when the merchant returns, show a pending state and let
the activation handler flip it — never block on the redirect.

---

## Part 7 — End-to-End Flow

```text
[embedded page] show addon
      │  merchant clicks Buy
      ▼
start purchase (SDK method OR billing redirect)   ← confirm via MCP/embedded-sdk
      │  merchant pays in Salla billing
      ▼
merchant returns to iframe  ── (token may rotate → embedded.auth.refresh)
      │
      ▼   (independently, source of truth)
webhook app.subscription.started  item_type="addon"  item_slug=…
      │
      ▼
activateAddon() → entitlements updated → toast + UI reveal
```

---

## Part 8 — Checklist

- [ ] Addon defined as an Addon plan in the Portal; you know its `item_slug`.
- [ ] Embedded SDK initialized + token verified server-side (salla-embedded-app).
- [ ] Purchase entry point (SDK method vs redirect URL) **confirmed via MCP/embedded-sdk** — not guessed.
- [ ] Activation handled on `app.subscription.started` + `item_type === "addon"`, matched by `item_slug`.
- [ ] Signature verified, 200 fast, idempotent (salla-webhooks).
- [ ] Token refresh on post-checkout `401` (`embedded.auth.refresh()`).
- [ ] UI reveals the feature only after entitlement is persisted.

---

## Key Resources

| Resource                     | URL / Skill                               |
| ---------------------------- | ----------------------------------------- |
| Embedded SDK setup           | salla-embedded-app skill                  |
| Addon pricing / definition   | salla-app-subscription-management skill   |
| Addon entitlement tracking   | salla-addon-subscription-management skill |
| Feature gating               | salla-subscription-system skill           |
| Webhook security/idempotency | salla-webhooks skill                      |
| App Events                   | https://docs.salla.dev/421413m0           |
| `@salla.sa/embedded-sdk`     | npm package (purchase method authority)   |
| Partners Portal              | https://salla.partners                    |
| Telegram community           | https://t.me/salladev                     |
