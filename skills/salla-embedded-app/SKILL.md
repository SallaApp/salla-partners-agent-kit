---
name: salla-embedded-app
description: >
  Use this skill whenever building, configuring, or debugging a Salla embedded app — an iframe-based
  custom UI running inside the Salla Merchant Dashboard. Covers SDK installation, authentication via
  token introspection, module usage (Auth, Page, Nav, UI, Checkout), design guidelines, and
  playground testing. Invoke it for tasks like "add an embedded page", "verify the merchant token",
  "show a modal in the dashboard", "resize the iframe", "add a nav button", or "set up the SDK".
license: Copyright (c) 2026 Salla
metadata:
  authors: Ilyas
  version: 1.0
---

# Salla Embedded App

An Embedded App adds a custom iframe page directly inside the Salla Merchant Dashboard. The **Salla Embedded SDK** is the communication bridge between your iframe and the dashboard — it handles auth, navigation, UI components, and theme syncing.

## End-to-End Integration Workflow

### Step 1 — Register an Embedded Page in the Portal

1. Open your app in [Salla Partners Portal](https://portal.salla.partners/)
2. Navigate to **App Details → Embedded Pages**
3. Add a new embedded page and provide:
   - **Page URL** — the URL Salla will load in the iframe
   - **Page title** — shown in the dashboard menu
   - **Icon** — displayed in the sidebar

---

### Step 2 — Install the SDK

**NPM:**
```bash
npm install @salla.sa/embedded-sdk
```

**CDN:**
```html
<script src="https://cdn.salla.network/embedded-sdk/latest/index.js"></script>
```

Initialize the SDK as early as possible in your app's lifecycle:

```ts
import Salla from '@salla.sa/embedded-sdk';

Salla.init();
```

---

### Step 3 — Authenticate the Session

On every page load, verify the merchant's identity using the **Token Introspect** endpoint before rendering any content.

1. Read the `token` query parameter from the iframe URL
2. Call `POST /oauth2/introspect` with the token
3. If valid, extract `merchant_id`, `store_id`, and `scope`
4. If invalid or expired, redirect to re-authentication

```ts
// Read token from URL params
const params = new URLSearchParams(window.location.search);
const token = params.get('token');

// Introspect via Salla API
const res = await fetch('https://accounts.salla.sa/oauth2/introspect', {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}` },
});
const { active, merchant_id } = await res.json();
if (!active) { /* redirect */ }
```

Token Introspect reference: https://docs.salla.dev/6394918f0.md

---

### Step 4 — Sync Theme and Locale

Read `lang` and `theme` from query params and apply them so your UI matches the dashboard:

```ts
const lang = params.get('lang') ?? 'ar';   // 'ar' | 'en'
const theme = params.get('theme') ?? 'light'; // 'light' | 'dark'

document.documentElement.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
document.documentElement.setAttribute('data-theme', theme);
```

---

### Step 5 — Use SDK Modules

Call SDK methods to interact with the dashboard shell. Only import what you need.

#### Auth Module — token refresh

```ts
Salla.auth.refreshToken().then(token => { /* new token */ });
```

#### Page Module — title and resize

```ts
Salla.page.setTitle('My App');
Salla.page.resize(); // auto-resizes iframe to content height
```

#### Nav Module — action buttons

```ts
Salla.nav.addButton({
  label: 'Save',
  icon: 'material-outline-save',
  onClick: () => saveChanges(),
});
```

#### UI Module — toasts, modals, confirms

```ts
Salla.ui.toast.success('Saved!');

Salla.ui.modal.open({
  title: 'Confirm delete',
  body: 'This cannot be undone.',
});

const confirmed = await Salla.ui.confirm('Are you sure?');
```

#### Checkout Module — subscriptions and add-ons

```ts
const addOns = await Salla.checkout.getAppAddOns();
await Salla.checkout.subscribe({ plan_id: 'pro' });
```

Full module references: see [Embedded SDK Overview](references/embedded-sdk-overview.md)

---

### Step 6 — Apply Design Guidelines

- Match the dashboard font, spacing, and color tokens
- Support both `ltr` (English) and `rtl` (Arabic) layouts
- Follow the [App Design Guidelines](https://docs.salla.dev) for native look-and-feel

---

### Step 7 — Test in the Playground

Use the **SDK Playground** in the Partners Portal to run and test SDK method calls interactively before going to production.

---

### Step 8 — Publish

Embedded pages are available to merchants once the parent app is published. Follow the general app publishing flow — see [`salla-general-app`](../salla-general-app/SKILL.md) for the publishing checklist.

---

## When to read the reference files

- [Embedded SDK Overview](references/embedded-sdk-overview.md) — full module list, documentation structure, and external links to each module's API reference.
- [Auth & Session](references/auth-and-session.md) — reading query params, token introspection, full page init pattern, proactive refresh strategy, using the token for API calls, and security rules.
- [SDK Modules Guide](references/sdk-modules-guide.md) — complete method signatures and examples for all 5 modules: Auth (getToken, refresh, onTokenRefresh), Page (setTitle, resize, navigate), Nav (addButton, updateButton, setBreadcrumb), UI (toast, modal, confirm, loading), Checkout (getAppAddOns, subscribe, onSubscribed).
- [Design Guidelines](references/design-guidelines.md) — RTL support with CSS logical properties, theme sync via data-theme, typography and spacing tokens, card/button component patterns, and a do/don't table for native dashboard UX.

## Resources

| Topic | Link |
| --- | --- |
| Getting Started | https://docs.salla.dev/1950922 |
| Installation | https://docs.salla.dev/1929172 |
| Authentication | https://docs.salla.dev/1919160 |
| Auth Module | https://docs.salla.dev/embedded-sdk/modules/auth.md |
| Page Module | https://docs.salla.dev/embedded-sdk/modules/page.md |
| Nav Module | https://docs.salla.dev/embedded-sdk/modules/nav.md |
| UI Module | https://docs.salla.dev/embedded-sdk/modules/ui.md |
| Checkout Module | https://docs.salla.dev/embedded-sdk/modules/checkout.md |
| Token Introspect | https://docs.salla.dev/6394918f0.md |
| App Design Guidelines | https://docs.salla.dev/1929178 |
| Playground Testing | https://docs.salla.dev/1929235 |
