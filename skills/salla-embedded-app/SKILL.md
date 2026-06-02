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

Initialize the SDK using the named export:

```ts
import { embedded } from '@salla.sa/embedded-sdk';

const { layout } = await embedded.init({ debug: false });
```

---

### Step 3 — Authenticate the Session

On every page load, verify the merchant's identity **server-side** before rendering any content.

1. Get token via `embedded.auth.getToken()`
2. Send it to YOUR backend endpoint
3. Backend calls `POST https://api.salla.dev/exchange-authority/v1/introspect` with `S-Source: YOUR_APP_ID`
4. Introspect returns `merchant_id` — use it to load merchant data
5. If invalid, call `embedded.destroy()`

```ts
const token = embedded.auth.getToken();
if (!token) { embedded.destroy(); return; }

const authOk = await fetch('/api/verify-token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ token }),
}).then(res => res.ok);

if (!authOk) { embedded.destroy(); return; }

embedded.ready(); // signal dashboard to show the iframe
```

See [Auth & Session](references/auth-and-session.md) for the full backend introspect implementation.

---

### Step 4 — Sync Theme and Locale

Use the `layout` returned by `embedded.init()` — do not read query params manually:

```ts
if (layout) {
  document.documentElement.setAttribute('data-theme', layout.theme);
  document.documentElement.setAttribute('lang', layout.locale);
  document.documentElement.setAttribute('dir', layout.locale === 'ar' ? 'rtl' : 'ltr');
}

embedded.onThemeChange?.((newTheme) => {
  document.documentElement.setAttribute('data-theme', newTheme);
});
```

---

### Step 5 — Use SDK Modules

#### Auth Module — token refresh on 401

```ts
// Call when your API returns 401 — Salla re-renders iframe with a fresh token
embedded.auth.refresh();
```

#### Page Module — title

```ts
embedded.page.setTitle('My App');
```

#### Nav Module — action button

```ts
embedded.nav.setAction({ title: 'Save', value: 'save' });
embedded.nav.onAction((action) => {
  if (action.value === 'save') saveChanges();
});
```

#### UI Module — toasts and loading

```ts
embedded.ui.toast.success('Saved!');
embedded.ui.toast.error('Something went wrong');
embedded.ui.loading.show();
embedded.ui.loading.hide();
```

Full module reference: see [SDK Modules Guide](references/sdk-modules-guide.md)

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
