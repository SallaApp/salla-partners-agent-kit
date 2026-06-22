---
name: salla-app-lifecycle
description: >
  Salla app lifecycle webhook events — what Salla fires as a merchant installs,
  updates, uninstalls, trials, and subscribes. Use when handling `app.installed`,
  `app.store.authorize`, `app.updated`, `app.uninstalled`, `app.trial.*`, or
  `app.subscription.*`; provisioning on install; cleaning up on uninstall; or building
  the merchant state machine (installed → trial → active → expired → uninstalled).
  Builds on salla-webhooks (signature, idempotency, fast 200) and salla-app-auth
  (token storage). Plan/trial state and entitlements → salla-app-billing.
---

# Salla App Lifecycle Flow

Keep your backend in sync with each merchant's relationship to your app — from install
through trial, subscription, and uninstall. Follow the steps in order; complete each gate
before moving on. Step 1 **performs** the subscription with the Salla Partners MCP; Steps
2–6 are the runtime handlers you write.

## Tools & MCPs

The App Events doc (https://docs.salla.dev/421413m0.md) is the authoritative source for
every lifecycle payload shape. The **Salla Partners MCP** _performs actions_:

| Tool           | Action               | What it does                                 |
| -------------- | -------------------- | -------------------------------------------- |
| `salla_apps`   | `connect` / `get`    | Set the webhook receiver / inspect app state |
| `salla_events` | `list` / `subscribe` | Discover + subscribe to lifecycle events     |

> All events arrive on your single webhook endpoint inside the standard envelope
> (`event`, `merchant`, `created_at`, `data`). **Verify the signature, acknowledge fast
> with `200`, then process asynchronously. Always upsert keyed by `merchant`.**
> Prerequisites: signature + idempotency + fast 200 → **salla-webhooks**; token
> persistence from `app.store.authorize` → **salla-app-auth**.

### Event Catalog (reference)

| Event                       | When                             | What to do                                                                 |
| --------------------------- | -------------------------------- | -------------------------------------------------------------------------- |
| `app.installed`             | First install                    | Provision merchant resources, set defaults                                 |
| `app.store.authorize`       | Install **or** token refresh     | Save/update `access_token` + `refresh_token` + expiry per merchant         |
| `app.updated`               | Merchant updates the app         | Salla fires `app.store.authorize` right after — wait for it for new tokens |
| `app.settings.updated`      | Merchant changes app settings    | Apply `data.settings` — schema/validation owned by **salla-app-settings**  |
| `app.trial.started`         | Trial begins                     | Enable trial features                                                      |
| `app.trial.expired`         | Trial ended without upgrade      | Restrict access                                                            |
| `app.trial.canceled`        | Trial cancelled                  | Restrict access                                                            |
| `app.subscription.started`  | Paid plan **or addon** activated | Unlock features; branch on `data.item_type`                                |
| `app.subscription.renewed`  | Plan/addon renewed               | Confirm active; store new `data.end_date` / `renew_date`                   |
| `app.subscription.expired`  | Plan/addon lapsed                | Restrict access, notify merchant                                           |
| `app.subscription.canceled` | Plan/addon cancelled             | Restrict access                                                            |
| `app.feedback.created`      | Merchant leaves a review         | Log rating/comment                                                         |

> `app.subscription.*` fires for **both** plans and addons — `data.item_type`
> (`"plan"` | `"addon"`) tells them apart. `app.trial.*` carries a **smaller** payload than
> subscription (no `subscription_id`, `item_type`, pricing, etc.) — see the reference. Full
> subscription payload + plan-state handling → **salla-app-billing**. Full per-event JSON
> (authoritative shapes from https://docs.salla.dev/421413m0.md) →
> **[references/lifecycle-payloads.md](references/lifecycle-payloads.md)**.

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
   `webhook_security_strategy: "signature"`, `generate_secret: true`. Store the returned
   secret in a secret manager/KMS (never in source or logs) — secure storage and HMAC
   verification are owned by **salla-webhooks**.
2. List valid slugs: `salla_events action=list`, `app_id`.
3. Subscribe: `salla_events action=subscribe`, `app_id`, `events: [...]` — e.g.
   `app.store.authorize`, `app.updated`, `app.uninstalled`, `app.trial.started`,
   `app.subscription.started`, `app.subscription.renewed`, `app.subscription.expired`.

Inspect the app's current configuration any time with `salla_apps action=get`, `app_id`.

**Gate:** "Webhook set + events subscribed (`salla_events action=list` shows them), and
your endpoint returns 200?"

---

## Step 2 — Handle the Install Flow

On first install Salla fires **`app.installed`** and **`app.store.authorize`**. Treat
each handler as independent and idempotent; arrival order is not guaranteed.

> **Upsert the per-`merchant` record (create-or-update) in every handler.** Any lifecycle
> event — e.g. `app.trial.started` — can land **before** `app.store.authorize`, so the row
> may not exist yet. Each handler creates the merchant row if missing and updates it if
> present, keyed by `merchant`. This keeps every handler safe in any arrival order and on
> re-install.

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
  // Persist tokens — see salla-app-auth for the full upsert + refresh rules.
  // Encrypt access_token/refresh_token at rest and keep them out of logs.
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

> **Manage the merchant/token tables with a versioned migration tool** (versioned
> `ALTER TABLE`s). This keeps the schema in lockstep with the code as you add or change
> columns, where a create-on-boot step would skip an already-existing table.

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
- **Acknowledge fast** with `200`, then process async — Salla retries failed deliveries;
  the timeout + retry policy is owned by [salla-webhooks](../salla-webhooks/SKILL.md).
- **Be idempotent** — key on a stable discriminator from the payload (e.g.
  `subscription_id`) or a hash of the raw body. (`created_at` is second-resolution, so
  `${merchant}:${event}:${created_at}` alone can collide.)
- **Upsert** so the same merchant can re-install and re-authorize.
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

## Red Flags

Assumptions about lifecycle delivery that hold in a quick test and fail with a real
merchant. If one of these is your plan, re-read the named step.

| Tempting thought                                        | Why it's wrong                                                                                                                     |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| "`app.installed` arrives before `app.store.authorize`." | Order isn't guaranteed — any event can land first. Make each handler independent and idempotent, upserting by `merchant` (Step 2). |
| "`app.updated` carries the new tokens."                 | It's a signal only — tokens come in the `app.store.authorize` that follows. Don't read tokens from the update payload (Step 3).    |
| "`insert` is fine — installs only happen once."         | Merchants re-install and re-authorize. Insert-only throws or duplicates; always **upsert** keyed by `merchant` (Steps 2, 6).       |
| "The async job is queued, so the work is safe."         | The `200` is already sent — a throw in the worker is invisible to Salla. Dead-letter, retry idempotently, and alert (Step 6).      |
| "`${merchant}:${event}:${created_at}` is a unique key." | `created_at` is second-resolution; two same-type events in one second collide. Add `subscription_id` or a raw-body hash (Step 6).  |
| "I'll bill test-store subscription events as revenue."  | Watch `data.store_type` — only `live` is real; development/demo installs would corrupt revenue and entitlements (Step 5).          |
| "Uninstall just flips a status flag."                   | Cleanup (revoke tokens, delete/anonymize PII) is an App Store requirement reviewed at submission — enqueue the full job (Step 4).  |

---

## Key Resources

| Resource            | URL                                |
| ------------------- | ---------------------------------- |
| App Events docs     | https://docs.salla.dev/421413m0.md |
| Webhooks (security) | salla-webhooks skill               |
| Token handling      | salla-app-auth skill               |
| Plan/trial state    | salla-app-billing skill            |
| Partners Portal     | https://salla.partners             |
| Telegram community  | https://t.me/salladev              |
