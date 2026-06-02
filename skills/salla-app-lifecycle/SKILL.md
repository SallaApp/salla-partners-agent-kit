---
name: salla-app-lifecycle
description: >
  Use this skill for any task involving Salla app lifecycle webhook events — the
  events Salla fires as a merchant installs, updates, uninstalls, trials, and
  subscribes to your app. Trigger when a developer is: handling `app.installed`,
  `app.store.authorize`, `app.updated`, `app.uninstalled`, `app.trial.started`,
  `app.trial.expired`, `app.trial.canceled`, `app.subscription.started`,
  `app.subscription.renewed`, `app.subscription.expired`, `app.subscription.canceled`,
  `app.feedback.created`, or `app.settings.updated`; provisioning resources on
  install; cleaning up merchant data on uninstall; deciding what to do when an app
  is updated; building a merchant state machine (installed → trial → active →
  expired → uninstalled); or wiring the order in which install + authorize events
  arrive.

  Trigger also when you see: "app.installed", "app.uninstalled", "app.store.authorize",
  "app.updated", "app.trial.started", "app.subscription.started", "lifecycle event",
  "install webhook", "uninstall cleanup", "store_type", "development store",
  "demo store", or any question about reacting to install/trial/subscription state.

  Always use this skill before writing any lifecycle event handler. It builds on the
  salla-webhooks skill (signature verification, idempotency, fast 200 response) and
  the salla-app-authorization skill (token storage from app.store.authorize). The MCP
  server (apidog-mcp-server, site-id: 451700) has the live payload schemas — confirm
  before coding. For plan/trial state logic see salla-app-subscription-management.
---

# Salla App Lifecycle Skill

The lifecycle events keep your backend in sync with each merchant's relationship to your
app — from first install through trial, subscription, and uninstall.

**MCP:** `apidog-mcp-server` (site-id: `451700`) — confirm every payload shape before coding.
**Docs:** https://docs.salla.dev/421413m0 (App Events)
**Prerequisites:** signature verification + idempotency + fast 200 → see **salla-webhooks**.
Token persistence from `app.store.authorize` → see **salla-app-authorization**.

> These all arrive on your single webhook endpoint inside the standard envelope
> (`event`, `merchant`, `created_at`, `data`). Verify the signature, respond `200`
> within 3 s, then process asynchronously. Always **upsert** keyed by `merchant`.

---

## Part 1 — Event Catalog

| Event                       | When                             | What to do                                                                 |
| --------------------------- | -------------------------------- | -------------------------------------------------------------------------- |
| `app.installed`             | First install                    | Provision merchant resources, set defaults                                 |
| `app.store.authorize`       | Install **or** token refresh     | Save/update `access_token` + `refresh_token` + expiry per merchant         |
| `app.updated`               | Merchant updates the app         | Salla fires `app.store.authorize` right after — wait for it for new tokens |
| `app.settings.updated`      | Merchant changes app settings    | Apply new values from `data.settings`                                      |
| `app.trial.started`         | Trial begins                     | Enable trial features                                                      |
| `app.trial.expired`         | Trial ended without upgrade      | Restrict access                                                            |
| `app.trial.canceled`        | Trial cancelled                  | Restrict access                                                            |
| `app.subscription.started`  | Paid plan **or addon** activated | Unlock features; branch on `data.item_type` (plan vs addon)                |
| `app.subscription.renewed`  | Plan/addon renewed               | Confirm active; store new `data.end_date` / `renew_date`                   |
| `app.subscription.expired`  | Plan/addon lapsed                | Restrict access, notify merchant                                           |
| `app.subscription.canceled` | Plan/addon cancelled             | Restrict access                                                            |
| `app.feedback.created`      | Merchant leaves a review         | Log rating/comment                                                         |

> `app.subscription.*` and `app.trial.*` fire for **both** plans and addons — the
> `data.item_type` field (`"plan"` | `"addon"`) tells them apart. Full subscription
> payload + plan-state handling lives in **salla-app-subscription-management**.

---

## Part 2 — Install Flow

On first install Salla fires **`app.installed`** and **`app.store.authorize`**. Don't
assume an order — make each handler independent and idempotent.

```typescript
if (payload.event === "app.installed") {
  // Provision: create the merchant row, seed defaults, queue a welcome step.
  await db.merchants.upsert({
    where: { id: payload.merchant },
    create: {
      id: payload.merchant,
      status: "installed",
      installedAt: new Date(),
    },
    update: { status: "installed" },
  });
}

if (payload.event === "app.store.authorize") {
  // Persist tokens — see salla-app-authorization for the full upsert + refresh rules.
  const { access_token, refresh_token, expires, scope } = payload.data;
  await db.merchants.upsert({
    where: { id: payload.merchant },
    create: {
      id: payload.merchant,
      accessToken: access_token,
      refreshToken: refresh_token,
      tokenExpiresAt: new Date(expires * 1000),
      scope,
    },
    update: {
      accessToken: access_token,
      refreshToken: refresh_token,
      tokenExpiresAt: new Date(expires * 1000),
      scope,
    },
  });
}
```

---

## Part 3 — Update Flow

When the merchant updates the app, Salla fires **`app.updated`** and then immediately
**`app.store.authorize`** with fresh tokens.

- Treat `app.updated` as a signal only — **do not** expect tokens in its payload.
- Let your existing `app.store.authorize` handler persist the new tokens.

---

## Part 4 — Uninstall Cleanup

**`app.uninstalled`** means the merchant removed your app. This is an App Store
requirement: you must clean up merchant data per your retention/GDPR policy.

```typescript
if (payload.event === "app.uninstalled") {
  await jobs.enqueue("cleanupMerchant", { merchantId: payload.merchant });
  // In the job: revoke cached tokens, delete or anonymize PII, cancel scheduled work,
  // mark merchant status = "uninstalled". Keep only what your policy/law requires.
}
```

Document what you store and how it's deleted on uninstall — it's reviewed at submission.

---

## Part 5 — Trial Events

| Event                | Effect                                       |
| -------------------- | -------------------------------------------- |
| `app.trial.started`  | Enable trial-tier features; record trial end |
| `app.trial.expired`  | Downgrade/restrict until they subscribe      |
| `app.trial.canceled` | Restrict immediately                         |

Trials and paid plans are distinct event families. A merchant typically flows
`trial.started` → (`subscription.started` if they convert | `trial.expired` if they don't).

---

## Part 6 — Subscription Events (overview)

`app.subscription.started` / `.renewed` / `.expired` / `.canceled` carry the plan/addon
detail. Minimum handling here; full logic in **salla-app-subscription-management**:

```typescript
if (payload.event === "app.subscription.started") {
  const { item_type, item_slug, end_date } = payload.data; // item_type: "plan" | "addon"
  if (item_type === "addon") {
    await entitlements.activateAddon(payload.merchant, item_slug, end_date);
  } else {
    await merchants.activatePlan(payload.merchant, payload.data);
  }
}
```

Watch `data.store_type` (`development` | `demo` | `live`) to avoid treating test-store
subscriptions as real revenue.

---

## Part 7 — Reliability (from salla-webhooks)

Non-negotiable for every handler here:

- **Verify the signature first** (HMAC-SHA256, timing-safe) — reject otherwise.
- **Respond `200` within 3 s**, then process async (queue the work). Salla retries
  failed deliveries (non-2xx / timeout) up to 5 times with exponential backoff.
- **Be idempotent** — `created_at` is second-resolution, so `${merchant}:${event}:${created_at}`
  collides if the same merchant fires two same-type events in one second (e.g. two
  settings updates). Add a stronger discriminator when the payload offers one
  (e.g. `subscription_id`) or hash the raw body.
- **Upsert, never insert-only** — the same merchant re-installs and re-authorizes.

See the salla-webhooks skill for the verification and idempotency code.

---

## Part 8 — Recommended Merchant State Machine

```
        app.installed
              │
              ▼
  ┌──────► installed ──────┐
  │           │            │ app.trial.started
  │           │            ▼
  │           │          trial ──── app.trial.expired/canceled ──► restricted
  │           │            │ app.subscription.started
  │           ▼            ▼
  │        active ◄── app.subscription.renewed
  │           │
  │           │ app.subscription.expired/canceled
  │           ▼
  │       restricted
  │           │ app.subscription.started (re-subscribe)
  └───────────┘
              │ app.uninstalled (from any state)
              ▼
        uninstalled  (run cleanup)
```

Persist `status` per merchant and transition it from the handlers above. Gate features on
`status` (and on addon entitlements — see salla-subscription-system).

---

## Part 9 — Payload Reference

Full per-event JSON payloads: **[references/lifecycle-payloads.md](references/lifecycle-payloads.md)**.
Confirm field names against the MCP before relying on them.

---

## Key Resources

| Resource            | URL                                     |
| ------------------- | --------------------------------------- |
| App Events docs     | https://docs.salla.dev/421413m0         |
| Webhooks (security) | salla-webhooks skill                    |
| Token handling      | salla-app-authorization skill           |
| Plan/trial state    | salla-app-subscription-management skill |
| Partners Portal     | https://salla.partners                  |
| Telegram community  | https://t.me/salladev                   |
