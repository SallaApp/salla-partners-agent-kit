---
name: salla-app-lifecycle
description: >
  The single owner of Salla's 13 app lifecycle webhook events — app.installed,
  app.store.authorize, app.settings.updated, app.uninstalled, app.trial.*,
  app.subscription.*, app.feedback.created. Use when provisioning on install, cleaning
  up on uninstall, or building the merchant state machine (installed → trial → active →
  expired → uninstalled). Events redeliver — handlers must be idempotent and upsert by
  merchant. Transport (registration, verification, fast 200) → salla-webhooks; token
  storage/refresh → salla-app-auth; plan/trial state → salla-app-billing.

  Trigger also when you see: "app.installed", "app.uninstalled", "app.store.authorize",
  "app.updated", "app.trial.started", "app.subscription.started", "lifecycle event",
  "install webhook", "uninstall cleanup", "store_type", "development store",
  "demo store", or any question about reacting to install/trial/subscription state.

  Always use this skill before writing any lifecycle event handler. Builds on the
  salla-webhooks skill (signature verification, idempotency, fast 200) and the
  salla-app-auth skill (token storage). For plan/trial state logic see
  salla-app-billing.
---

# Salla App Lifecycle Flow

Keep your backend in sync with each merchant's relationship to your app — from install
through trial, subscription, and uninstall. Follow the steps in order; complete each gate
before moving on. Step 1 **performs** the subscription with the Salla Partners MCP; Steps
2–6 are the runtime handlers you write.

## Tools & MCPs

**Two MCPs:** `apidog-mcp-server` (site-id `451700`) is _read-only_ — confirm every
payload shape before coding. The **Salla Partners MCP** _performs actions_:

| Tool           | Action               | What it does                                 |
| -------------- | -------------------- | -------------------------------------------- |
| `salla_apps`   | `connect` / `get`    | Set the webhook receiver / inspect app state |
| `salla_events` | `list` / `subscribe` | Discover + subscribe to lifecycle events     |

> All events arrive on your single webhook endpoint inside the standard envelope
> (`event`, `merchant`, `created_at`, `data`). **Verify the signature, respond `200`
> within 3 s, then process asynchronously. Always upsert keyed by `merchant`.**
> Prerequisites: signature + idempotency + fast 200 → **salla-webhooks**; token
> persistence from `app.store.authorize` → **salla-app-auth**.

### Event Catalog (reference)

| Event                       | When                             | What to do                                                                                                     |
| --------------------------- | -------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `app.installed`             | First install                    | Provision merchant resources, set defaults                                                                     |
| `app.store.authorize`       | App installed or updated (never on token refresh — that's your own `grant_type=refresh_token` call) | Save/update `access_token` + `refresh_token` + expiry per merchant                                             |
| `app.updated`               | Merchant updates the app         | Salla fires `app.store.authorize` right after — wait for it for new tokens                                     |
| `app.settings.updated`      | Merchant saves app settings      | Apply new values from `data.settings` — **this event activates the app** (install → settings.updated → active) |
| `app.trial.started`         | Trial begins                     | Enable trial features                                                                                          |
| `app.trial.expired`         | Trial ended without upgrade      | Restrict access                                                                                                |
| `app.trial.canceled`        | Trial cancelled                  | Restrict access                                                                                                |
| `app.subscription.started`  | Paid plan **or addon** activated | Unlock features; branch on `data.item_type`                                                                    |
| `app.subscription.renewed`  | Plan/addon renewed               | Confirm active; store new `data.end_date` / `renew_date`                                                       |
| `app.subscription.expired`  | Plan/addon lapsed                | Restrict access, notify merchant                                                                               |
| `app.subscription.canceled` | Plan/addon cancelled             | Restrict access                                                                                                |
| `app.uninstalled`           | Merchant removes the app         | Clean up per retention/GDPR policy — see Step 4                                                                |
| `app.feedback.created`      | Merchant leaves a review         | Log rating/comment                                                                                             |

> `app.subscription.*` and `app.trial.*` fire for **both** plans and addons — the
> `data.item_type` (`"plan"` | `"addon"`) tells them apart. Full subscription payload +
> plan-state handling → **salla-app-billing**. Full per-event JSON →
> **[references/lifecycle-payloads.md](references/lifecycle-payloads.md)** (confirm field
> names against the MCP before relying on them).

---

## Step 0 — Discover

Ask before starting:

1. **Which lifecycle states** does your app care about? (install only, or trial +
   subscription too?)
2. **What do you provision** on install, and **what must be cleaned up** on uninstall
   (retention / GDPR policy)?
3. **Do you gate features** on plan/trial state? (if so, pair with
   salla-app-billing)

---

## Step 1 — Subscribe to Lifecycle Events

Lifecycle events only arrive if the app is subscribed and a `webhook_url` is set. Do this
with the Partners MCP:

1. Configure the receiver: `salla_apps action=connect`, `app_id`, `webhook_url`,
   `webhook_security_strategy: "signature"`, `generate_secret: true` (store the returned
   secret for HMAC verification).
2. List valid slugs: `salla_events action=list`, `app_id`.
3. Subscribe: `salla_events action=subscribe`, `app_id`, `events: [...]` — e.g.
   `app.store.authorize`, `app.updated`, `app.uninstalled`, `app.trial.started`,
   `app.subscription.started`, `app.subscription.renewed`, `app.subscription.expired`.

Inspect the app's current configuration any time with `salla_apps action=get`, `app_id`.

**Gate:** "Webhook set + events subscribed (`salla_events action=list` shows them), and
your endpoint returns 200?"

---

## Step 2 — Handle the Install Flow

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
```

For `app.store.authorize`, persist `data.access_token` / `refresh_token` / `expires` /
`scope` keyed by `merchant` — the full token-upsert and refresh rules live in
**salla-app-auth**.

The app isn't fully active right after install: **`app.settings.updated` is the event
that activates it** (install → settings.updated → active). Apply `data.settings` there
and treat it as the activation signal.

**Gate:** "Install of a demo store creates the merchant row and persists tokens, in any
arrival order?"

---

## Step 3 — Handle the Update Flow

When the merchant updates the app, Salla fires **`app.updated`** then immediately
**`app.store.authorize`** with fresh tokens.

- Treat `app.updated` as a signal only — **do not** expect tokens in its payload.
- Let your existing `app.store.authorize` handler persist the new tokens.

**Gate:** "An app update refreshes stored tokens via the authorize handler, not the
update handler?"

---

## Step 4 — Handle Uninstall Cleanup

**`app.uninstalled`** means the merchant removed your app. Cleanup is an App Store
requirement — handle it per your retention/GDPR policy.

```typescript
if (payload.event === "app.uninstalled") {
  await jobs.enqueue("cleanupMerchant", { merchantId: payload.merchant });
  // In the job: revoke cached tokens, delete or anonymize PII, cancel scheduled work,
  // mark merchant status = "uninstalled". Keep only what your policy/law requires.
}
```

Document what you store and how it's deleted on uninstall — it's reviewed at submission.

**Gate:** "Uninstall enqueues cleanup and the job revokes tokens + removes/anonymizes PII?"

---

## Step 5 — Handle Trial & Subscription Events

| Event                | Effect                                       |
| -------------------- | -------------------------------------------- |
| `app.trial.started`  | Enable trial-tier features; record trial end |
| `app.trial.expired`  | Downgrade/restrict until they subscribe      |
| `app.trial.canceled` | Restrict immediately                         |

A merchant typically flows `trial.started` → (`subscription.started` if they convert |
`trial.expired` if they don't). Minimum subscription handling here — full logic in
**salla-app-billing**:

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

**Gate:** "Trial and subscription events transition the merchant's stored status, branching
on `item_type`?"

---

## Step 6 — Harden: Reliability & State Machine

Non-negotiable for every handler above:

- **Verify the signature first** (HMAC-SHA256, timing-safe) — reject otherwise.
- **Respond `200` within 3 s**, then process async. Salla retries failed deliveries
  (non-2xx / timeout) — retry behavior and delivery debugging → **salla-webhooks**;
  treat every event as redeliverable.
- **Be idempotent** — `created_at` is second-resolution, so
  `${merchant}:${event}:${created_at}` collides if the same merchant fires two same-type
  events in one second. Add a stronger discriminator when the payload offers one
  (e.g. `subscription_id`) or hash the raw body.
- **Upsert, never insert-only** — the same merchant re-installs and re-authorizes.
- **Handle async-job failure** — the `200` is already sent, so a throw in the queued
  worker is invisible to Salla. Route failed jobs to a dead-letter queue, retry with
  backoff (idempotent), and alert on exhausted retries so a dropped install/uninstall
  doesn't go unnoticed.

Recommended merchant state machine — persist `status` per merchant and transition from the
handlers above:

```text
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

Gate features on `status` (and on addon entitlements — see salla-app-billing).

**Gate:** "Every handler verifies signature, returns 200 fast, is idempotent, and updates
`status` along the state machine?"

---

## Key Resources

| Resource            | URL                             |
| ------------------- | ------------------------------- |
| App Events docs     | https://docs.salla.dev/421413m0 |
| Webhooks (security) | salla-webhooks skill            |
| Token handling      | salla-app-auth skill            |
| Plan/trial state    | salla-app-billing skill         |
| Partners Portal     | https://salla.partners          |
| Telegram community  | https://t.me/salladev           |
