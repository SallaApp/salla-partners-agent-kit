---
name: salla-general-app
description: >
  Use this skill whenever creating, configuring, or troubleshooting a general-purpose Salla app
  end to end — from registering on the Partners Portal through OAuth setup, webhook configuration,
  optional capabilities (snippets, settings, custom plans), demo store testing, and publishing.
  Invoke it for tasks like "create a new Salla app", "set up webhooks", "configure OAuth",
  "add app settings", "publish to the App Store", or "how do I test my app".
license: Copyright (c) 2026 Salla
metadata:
  authors: Ilyas
  version: 1.0
---

# Salla General App

A General App is a Salla app that integrates with the platform for purposes other than shipping or communication — analytics, automation, ERP sync, loyalty programs, and so on.

## End-to-End Creation Workflow

### Step 1 — Register on the Partners Portal

1. Create a verified account at [portal.salla.partners](https://portal.salla.partners/)
2. Go to **My Apps → Create App**
3. Choose **Public** (visible in the App Store) or **Private** (invite-only)
4. Select **General App** as the category

Fill in required fields:

| Field | Requirement |
| --- | --- |
| Icon | Min 250×250px, 1:1 ratio |
| Name | English + Arabic |
| Description | Up to 50 characters |
| App Website | URL |
| Support Email | Email address |

Click **Create App**.

---

### Step 2 — Configure OAuth

On the App Details page, open **App Keys**:

- Copy your **Client ID** and **Client Secret**
- Choose **OAuth Mode**:
  - `Easy Mode` — Salla handles the authorization flow; token is delivered to your webhook
  - `Custom Mode` — you provide a callback URL and handle the code exchange yourself

For token handling patterns, see [OAuth reference](../salla-app-builder/references/oauth.md).

---

### Step 3 — Set App Scope

Define which Salla API resources your app needs access to. Request only the minimum required scopes.

---

### Step 4 — Configure Webhooks

1. Enter your **Webhook URL**
2. Copy the **Webhook Secret** — use it to verify HMAC-SHA256 signatures on every incoming request
3. Subscribe to **App Events** (lifecycle triggers):
   - `app.installed`, `app.updated`
   - `app.trial.started`, `app.trial.ended`
   - `app.subscription.started`, `app.subscription.ended`, `app.subscription.renewed`
   - `app.rated`
4. Subscribe to **Store Events** relevant to your use case (orders, products, customers, etc.)

For signature verification patterns, see [Webhooks reference](../salla-app-builder/references/webhooks.md).

---

### Step 5 — Add Optional Capabilities

Enable what your app needs — all are optional:

| Capability | What it does | Skill to use |
| --- | --- | --- |
| **App Settings** | Per-merchant config form shown after install | `salla-app-settings` |
| **Embedded Page** | Custom UI inside the Salla dashboard (iframe) | `salla-embedded-app` |
| **App Snippets** | HTML/JS injected into the storefront | `salla-storefront-snippets` |
| **App Functions** | Serverless TypeScript handlers for events | see [App Functions](../salla-app-builder/references/app-functions.md) |
| **Trusted IPs** | Allowlist server IPs for API calls | Partners Portal → Trusted IPs |
| **Custom Plans** | Tiered pricing and feature gating | Partners Portal → Custom Plans |
| **DNS Management** | Map a domain to the merchant's store | Partners Portal → DNS Management |

---

### Step 6 — Test with a Demo Store

In **App Testing** on the App Details page, connect a demo store. This mirrors a live merchant environment and lets you trigger real events, test OAuth, and validate settings.

Guide: https://salla.dev/blog/how-to-test-your-app-using-salla-demo-stores/

---

### Step 7 — Publish

Click **Start Publishing your App** and complete all six sections:

1. Basic Information
2. App Configurations
3. App Features
4. Pricing
5. Contact Information
6. Service Trial

Once approved, your app is listed on the [Salla Apps Marketplace](https://apps.salla.sa/en).

Guide: https://salla.dev/blog/standards-salla-apps-publications/

---

## When to read the reference files

- [Create App Guide](references/create-app-guide.md) — step-by-step portal walkthrough with all section details, screenshots context, and publishing checklist.
- [OAuth Patterns](references/oauth-patterns.md) — Easy Mode vs Custom Mode comparison, full authorization flows, token exchange, refresh strategy, token introspection, and scopes reference.
- [Webhook Events](references/webhook-events.md) — HMAC-SHA256 signature verification code, complete App Events (lifecycle) table, Store Events by category (orders, products, customers, shipments, stores, etc.), payload envelope, and best practices (idempotency, fast ACK, retry handling).
- [Salla API Usage](references/salla-api-usage.md) — common endpoint cheatsheet (orders, products, customers, store, app settings), cursor pagination pattern, error handling by status code, and calling the API from App Functions.

## Resources

| Topic | Link |
| --- | --- |
| Partners Portal | https://portal.salla.partners/ |
| Apps Marketplace | https://apps.salla.sa/en |
| Webhooks guide + event list | https://docs.salla.dev/421119m0 |
| App Events (lifecycle) | https://docs.salla.dev/doc-421413 |
| Salla Admin API reference | https://docs.salla.dev/doc-421117 |
| Developer community (Telegram) | https://t.me/salladev |
