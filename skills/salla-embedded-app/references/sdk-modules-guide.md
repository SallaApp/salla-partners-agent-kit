# Embedded SDK — Module Guide

Complete method reference for all SDK modules with examples.

Import the SDK using the named export:

```ts
import { embedded } from '@salla.sa/embedded-sdk';
```

Or via CDN (places `SallaEmbedded` on `window`):

```html
<script src="https://unpkg.com/@salla.sa/embedded-sdk/dist/umd/index.js"></script>
```

---

## Initialization

Always call `embedded.init()` first. It performs the handshake with the dashboard shell and returns layout settings:

```ts
const { layout } = await embedded.init({
  debug: process.env.NODE_ENV !== 'production',
});

// Apply theme and locale from the dashboard
if (layout) {
  document.documentElement.setAttribute('data-theme', layout.theme);
  document.documentElement.setAttribute('lang', layout.locale);
  document.documentElement.setAttribute('dir', layout.locale === 'ar' ? 'rtl' : 'ltr');
}
```

After your app is ready to display, call:

```ts
embedded.ready(); // signals the dashboard to hide the loading screen
```

If initialization fails, call `embedded.destroy()` to clean up.

---

## Auth Module

Manages the session token between your iframe and the dashboard shell.

```ts
// Get the current session token (read from URL params by the SDK)
const token = embedded.auth.getToken();

// Trigger a token refresh — Salla re-renders the iframe with a new token
// Call this when your API returns 401
embedded.auth.refresh();
```

**Token refresh flow:**
`embedded.auth.refresh()` posts a message to the dashboard shell. The iframe reloads with a fresh token, and your bootstrap function runs again automatically.

---

## Page Module

Controls the page title shown in the dashboard breadcrumb.

```ts
// Set the page title
embedded.page.setTitle('My App — Settings');

// Localized title
embedded.page.setTitle(layout?.locale === 'ar' ? 'إعدادات تطبيقي' : 'My App — Settings');
```

Call `setTitle` on every route change so the dashboard breadcrumb stays in sync.

---

## Nav Module

Places an action button in the dashboard's top navigation bar.

```ts
// Set a primary action button (e.g. Save)
embedded.nav.setAction({
  title: layout?.locale === 'ar' ? 'حفظ' : 'Save',
  value: 'save',
});

// Listen for the button click
embedded.nav.onAction((action) => {
  if (action.value === 'save') {
    saveForm();
  }
});
```

Use `setAction` for the main CTA. Do not render your own header buttons inside the iframe — keep nav chrome inside the dashboard shell per the "No-Chrome" rule.

---

## UI Module

Triggers native Salla dashboard UI components — toasts and loading overlay.

### Toasts

```ts
embedded.ui.toast.success('Settings saved');
embedded.ui.toast.error('Failed to connect — check your API key');
```

### Loading Overlay

```ts
// Show full-page loader
embedded.ui.loading.show();

// Hide loader
embedded.ui.loading.hide();

// Pattern: wrap async operations
embedded.ui.loading.show();
try {
  await syncOrders();
  embedded.ui.toast.success('Sync complete');
} finally {
  embedded.ui.loading.hide();
}
```

---

## Theme Change Listener

React to the merchant toggling light/dark mode without a page reload:

```ts
embedded.onThemeChange?.((newTheme: string) => {
  document.documentElement.setAttribute('data-theme', newTheme);
});
```

---

## Full Module Reference

| Module | Full Reference |
| --- | --- |
| Auth | https://docs.salla.dev/embedded-sdk/modules/auth.md |
| Page | https://docs.salla.dev/embedded-sdk/modules/page.md |
| Nav | https://docs.salla.dev/embedded-sdk/modules/nav.md |
| UI | https://docs.salla.dev/embedded-sdk/modules/ui.md |
| Checkout | https://docs.salla.dev/embedded-sdk/modules/checkout.md |
