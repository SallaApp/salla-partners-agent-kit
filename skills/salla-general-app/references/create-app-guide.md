# Create Your First Salla App

Salla supports **60,000+ active retailers**. Apps are published on the [Salla Apps Marketplace](https://apps.salla.sa/en) or kept private.

## Prerequisites

- Verified [Salla Partners account](https://portal.salla.partners/)
- App type decision: **Public** (visible in App Store) or **Private** (invite-only)

> **Note:** Shipping Apps can only be Public.

---

## Step 1 — Create the App

1. Log in to [Salla Partners Portal](https://portal.salla.partners/)
2. Click **My Apps** in the left menu
3. Click **Create App** and choose **Public** or **Private**
4. Fill in basic information:

| Field | Requirement |
| --- | --- |
| Icon | Min 250×250px, 1:1 ratio |
| Name | English + Arabic |
| Category | `General App` / `Shipping App` / `Communication App` |
| Description | Up to 50 characters |
| App Website | URL |
| Support Email | Email address |

5. Click **Create App** — you are redirected to the App Details page.

---

## Step 2 — App Keys

On the App Details page, locate **App Keys**:

- **Client ID** — used in OAuth flows
- **Client Secret** — keep private; rotate if compromised
- **OAuth Mode** — `Easy Mode` (Salla handles the flow) or `Custom Mode` (your own callback)

---

## Step 3 — App Scope

Restrict which Salla resources your app can access. Only request scopes your app genuinely needs.

---

## Step 4 — Webhooks & Notifications

1. Enter your **Webhook URL** (receives all selected events)
2. Copy your **Webhook Secret** (used to verify HMAC-SHA256 signatures)
3. Subscribe to **App Events** (lifecycle):
   - `app.installed`, `app.updated`, `app.trial.started`, `app.trial.ended`
   - `app.subscription.started`, `app.subscription.ended`, `app.subscription.renewed`
   - `app.rated`
4. Subscribe to **Store Events** by category:
   - Orders, Products, Customers, Categories, Brands, Stores, Miscellaneous

---

## Step 5 — Optional Capabilities

| Section | Purpose | Guide |
| --- | --- | --- |
| **Trusted IPs** | Allowlist your server IPs for secure API calls | https://salla.dev/blog/secure-your-apps-with-the-trusted-ip-address-now/ |
| **App Snippets** | Inject HTML/JS into storefront pages | https://salla.dev/blog/a-guide-to-app-snippet/ |
| **App Settings** | Per-merchant config form with validation URL | https://salla.dev/blog/how-to-build-app-settings-form/ |
| **Custom Plans** | Tiered pricing and feature gating | https://salla.dev/blog/comprehensive-guide-to-custom-plans-on-salla-partners/ |
| **DNS Management** | Map a domain to the merchant's store | https://salla.dev/blog/easily-manage-dns-records-on-salla-partners/ |

---

## Step 6 — Test with a Demo Store

Use **App Testing** on the App Details page to connect a demo store — a real sandbox that mirrors a live merchant environment.

Guide: https://salla.dev/blog/how-to-test-your-app-using-salla-demo-stores/

---

## Step 7 — Publish

Click **Start Publishing your App** and complete the six publishing sections:

1. Basic Information
2. App Configurations
3. App Features
4. Pricing
5. Contact Information
6. Service Trial

Guide: https://salla.dev/blog/standards-salla-apps-publications/

---

## Resources

| Topic | Link |
| --- | --- |
| Partners Portal | https://portal.salla.partners/ |
| Apps Marketplace | https://apps.salla.sa/en |
| Webhooks guide + event list | https://docs.salla.dev/421119m0 |
| App Events (lifecycle) | https://docs.salla.dev/doc-421413 |
| Salla Admin API reference | https://docs.salla.dev/doc-421117 |
| Developer community (Telegram) | https://t.me/salladev |
