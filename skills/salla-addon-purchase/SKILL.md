---
name: salla-addon-purchase
description: >
  In-app addon purchase inside an embedded Salla app: present purchasable addons, start
  checkout via the embedded SDK Checkout module (Salla owns billing — never collect
  payment in the iframe), then activate ONLY on the app.subscription.started webhook
  with item_type "addon", matched by item_slug. Use for buying/upselling addons from the
  dashboard, billing redirects, or post-purchase activation. Prerequisites: a working
  embedded app (salla-embedded-app) and an addon defined at publish (salla-app-billing).
  Webhook hygiene → salla-webhooks.
---

# Salla Addon Purchase (Embedded) Flow

Let a merchant buy an addon without leaving your embedded app: present the offer, hand off
to Salla billing, and unlock the addon when Salla confirms payment. Follow the steps in
order; complete each gate before moving on. Activation is **webhook-driven** — the redirect
starts checkout; `app.subscription.started` (addon) finishes it.

## Tools & MCPs

Use the **Salla Partners MCP** for actions: `salla_events action=subscribe` for
`app.subscription.started` (the activation source of truth, Step 3). The in-iframe
purchase itself is an **embedded-SDK Checkout call, not an MCP tool**.

> Salla owns billing — never collect payment in the iframe. SDK init/handshake →
> **salla-embedded-app** · pricing/entitlements/gating → **salla-app-billing** ·
> webhook hygiene → **salla-webhooks**.

---

## Step 0 — Discover

Ask before starting:

1. **Which addon(s)** can the merchant buy from inside the app, and what does each unlock?
2. **Is your page already a working embedded app?** (SDK init + server-side token verify)
3. **Where do you surface the offer** — a dedicated page, or an upsell inside an existing
   one?

---

## Step 1 — Confirm the Embedded Context (prerequisite)

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

**Gate:** "Embedded SDK initialized and the session token verified server-side?"

---

## Step 2 — Define the Addon

The addon must exist as a plan of type **Addon** in the Partners Portal (Pricing / Custom
Plans) before it can be purchased. Each addon has an `item_slug` you'll match on later. See
**salla-app-billing** for how plans/addons are defined.

**Gate:** "Addon defined as an Addon plan, and you know its `item_slug`?"

---

## Step 3 — Subscribe to the Activation Webhook

Activation is confirmed by `app.subscription.started` (addon) — subscribe the app to it
with the Partners MCP (a `webhook_url` must already be set via `salla_apps action=connect`):

- `salla_events action=list`, `app_id` → confirm the slug.
- `salla_events action=subscribe`, `app_id`, `events: ["app.subscription.started"]`.

**Gate:** "`app.subscription.started` is subscribed (`salla_events action=list` confirms)?"

---

## Step 4 — Present Purchasable Addons

Render the offer inside your page using Salla's design tokens (No-Chrome). Keep it to the
addon name, what it unlocks, and price; let Salla's checkout handle the money.

```typescript
embedded.ui.loading.show();
// fetch the addons you want to surface (your own catalog mapped to Salla addon slugs)
const addons = await fetch("/api/addons").then((r) => r.json());
embedded.ui.loading.hide();
// render cards; each "Buy" button calls startAddonPurchase(addon) (Step 5)
```

---

## Step 5 — Start the Purchase / Billing Redirect

The purchase entry point is the embedded SDK **Checkout module** — it exposes
**Create Checkout**, **Get App Add-Ons**, and **Subscribe for Payment**:
https://docs.salla.dev/embedded-sdk/modules/checkout.md

Use **Get App Add-Ons** to list the purchasable addons, **Create Checkout** to open
Salla's checkout for the chosen addon, and **Subscribe for Payment** to hear the payment
result in the iframe.

> Confirm the exact method signatures in the Checkout module docs above before coding —
> do not guess parameter names or return shapes.
> The merchant pays inside Salla billing; your code only opens checkout and reacts.

After checkout the merchant returns to your embedded page. The session token may have
rotated — if an API call returns `401`, call `embedded.auth.refresh()` (see
salla-embedded-app) and re-bootstrap.

**Gate:** "Purchase entry point (SDK method vs redirect URL) confirmed via MCP/embedded-sdk
— not guessed?"

---

## Step 6 — Activate on the Webhook (source of truth)

Do **not** unlock features just because the redirect returned. Wait for Salla to confirm
payment via the webhook you subscribed in Step 3:

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
- Persist + track via **salla-app-billing** (recurring vs one-time,
  renewal, stacking on the plan).
- Verify the signature, respond 200 fast, dedup — see **salla-webhooks**.

**Gate:** "Activation handler fires on `app.subscription.started` + `item_type === "addon"`,
matched by `item_slug`, signature-verified and idempotent?"

---

## Step 7 — Reflect the New State in the UI

Once activated, confirm inside the iframe and reveal the unlocked feature:

```typescript
embedded.ui.toast.success("Addon activated 🎉");
// re-fetch entitlements and re-render; gate features via salla-app-billing
```

If the webhook hasn't landed when the merchant returns, show a pending state and let the
activation handler flip it — never block on the redirect.

**Gate:** "UI reveals the feature only after the entitlement is persisted?"

---

## End-to-End Flow

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

## Key Resources

| Resource                     | URL / Skill                             |
| ---------------------------- | --------------------------------------- |
| Embedded SDK setup           | salla-embedded-app skill                |
| Addon pricing / definition   | salla-app-billing skill                 |
| Addon entitlement tracking   | salla-app-billing skill                 |
| Feature gating               | salla-app-billing skill                 |
| Webhook security/idempotency | salla-webhooks skill                    |
| App Events                   | https://docs.salla.dev/421413m0         |
| `@salla.sa/embedded-sdk`     | npm package (purchase method authority) |
| Partners Portal              | https://salla.partners                  |
| Telegram community           | https://t.me/salladev                   |
