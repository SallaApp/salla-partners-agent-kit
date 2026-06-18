---
name: salla-addon-purchase
description: >
  The addon billing lifecycle for a Salla app — defining an addon, activating on
  app.subscription.started (item_type "addon", matched by item_slug), persisting the
  entitlement, and handling renewal/cancellation/expiry. Use when wiring what happens AFTER
  a merchant buys an addon, tracking addon subscriptions, or gating features by addon. The
  in-iframe purchase UX is part of the embedded flow → salla-addon-purchase-embedded.
  Plan/pricing/entitlement primitives → salla-app-billing; webhook hygiene → salla-webhooks.
---

# Salla Addon Billing Cycle

An addon is a purchasable extra that **Salla bills** on top of the app's plan. This skill
owns its **billing lifecycle** — define → activate → renew → cancel/expire → gate. The
merchant buys it **inside the embedded app** (the purchase UX is part of that flow →
[salla-addon-purchase-embedded](../salla-addon-purchase-embedded/SKILL.md)); Salla then
drives every state change through webhooks. **Activation is webhook-driven — never unlock on
a redirect.**

## Tools & MCPs

Use the Salla Partners MCP: `salla_events action=subscribe` for the subscription events
below (a `webhook_url` must be set via `salla_apps action=connect`). The addon itself is
defined at publish (`salla_apps action=publish`, `addons[]`).

> Salla owns billing — you never charge. Purchase UX (iframe) →
> **salla-addon-purchase-embedded** · pricing/entitlement primitives & gating →
> **salla-app-billing** · webhook signature/idempotency → **salla-webhooks**.

---

## Step 1 — Define the Addon

Addons live in the `addons[]` array of the publish payload (`salla_apps action=publish`) —
there is no separate pricing endpoint; after publishing they appear under **App Details →
Custom Plans**. Each addon has an `item_slug` you match on for every lifecycle event. Full
payload shape → **salla-app-billing** Step 1.

**Gate:** "Addon in the publish payload, published, and you know its `item_slug`?"

---

## Step 2 — Subscribe to the Lifecycle Events

Subscribe the app (`salla_events action=subscribe`) to the addon subscription events.
Confirm exact slugs via `salla_events action=list` / the App Events doc before coding.

| Event                       | When                              | Do                                          |
| --------------------------- | --------------------------------- | ------------------------------------------- |
| `app.subscription.started`  | Addon purchased / first activated | Activate the entitlement (Step 3)           |
| `app.subscription.renewed`  | Recurring addon renewed           | Extend `end_date`                           |
| `app.subscription.expired`  | Period ended, not renewed         | Revoke the entitlement, re-gate features    |
| `app.subscription.canceled` | Merchant cancels                  | Mark canceled; keep access until `end_date` |

**Gate:** "All addon lifecycle events subscribed?"

---

## Step 3 — Activate on `app.subscription.started` (source of truth)

Do **not** unlock features because a purchase redirect returned — wait for Salla's webhook:

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

- Match the addon by **`item_slug`** (plans carry `item_slug: null`; addons carry the slug).
- Verify the signature, respond `200` fast, dedup → **salla-webhooks**.

**Gate:** "Activation fires on `started` + `item_type === "addon"`, matched by `item_slug`,
signature-verified and idempotent?"

---

## Step 4 — Renewal, Cancellation, Expiry

Keep the stored entitlement in step with Salla — each event is the source of truth:

- **`renewed`** → extend `end_date` (recurring addons; track recurring vs one-time).
- **`canceled`** → mark canceled but keep access **until `end_date`** (don't cut off early).
- **`expired`** → revoke the entitlement and re-gate the addon's features.

Persistence patterns, recurring vs one-time, and stacking the addon on the plan →
**salla-app-billing**.

**Gate:** "Each lifecycle event updates the stored entitlement; expiry revokes access?"

---

## Step 5 — Gate Features by Addon Entitlement

Gate addon-only features on the **persisted entitlement**, never on the purchase redirect or
client state. Gating pattern → **salla-app-billing**. Reflect activation back in the embedded
UI → **salla-addon-purchase-embedded**.

**Gate:** "Addon features are gated on the stored entitlement, re-checked after each event?"

---

## Lifecycle at a Glance

```text
define addon (publish addons[])  →  merchant buys in the embedded app
        (salla-addon-purchase-embedded)
                                   │  Salla bills + confirms payment
                                   ▼  (source of truth — webhooks)
app.subscription.started (addon)  → activate entitlement
        │
        ├─ app.subscription.renewed  → extend end_date
        ├─ app.subscription.canceled → keep until end_date
        └─ app.subscription.expired  → revoke + re-gate
```

---

## Key Resources

| Resource                        | URL / Skill                         |
| ------------------------------- | ----------------------------------- |
| Buying an addon (embedded UX)   | salla-addon-purchase-embedded skill |
| Addon definition / pricing      | salla-app-billing skill             |
| Entitlement tracking & gating   | salla-app-billing skill             |
| Webhook signature / idempotency | salla-webhooks skill                |
| App Events                      | https://docs.salla.dev/421413m0.md  |
| Partners Portal                 | https://salla.partners              |
| Developer community (Telegram)  | https://t.me/salladev               |
