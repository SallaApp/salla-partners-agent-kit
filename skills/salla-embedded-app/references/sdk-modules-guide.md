# Embedded SDK — Module Guide

Complete method reference for all SDK modules with examples.

Import the SDK using the named export:

```ts
import { embedded } from "@salla.sa/embedded-sdk";
```

Or via CDN (places `SallaEmbedded` on `window`):

```html
<script src="https://cdn.salla.network/embedded-sdk/latest/index.js"></script>
```

---

## Initialization

Always call `embedded.init()` first. It performs the handshake with the dashboard shell and returns layout settings:

```ts
const { layout } = await embedded.init({
  debug: process.env.NODE_ENV !== "production",
});

// Apply theme and locale from the dashboard
if (layout) {
  document.documentElement.setAttribute("data-theme", layout.theme);
  document.documentElement.setAttribute("lang", layout.locale);
  document.documentElement.setAttribute(
    "dir",
    layout.locale === "ar" ? "rtl" : "ltr",
  );
}
```

After your app is ready to display, call:

```ts
embedded.ready(); // signals the dashboard to hide the loading screen
```

If `init()` rejects (app opened outside Salla, or no token), render an error / "open inside the
dashboard" state and do not call `ready()`.

---

## Auth Module

Manages the session token between your iframe and the dashboard shell.

```ts
// Get the current session token (read from URL params by the SDK)
const token = embedded.auth.getToken();

// Trigger a token refresh — Salla re-renders the iframe with a new token
// Call this when your API returns 401
embedded.auth.refresh();

// Inspect token details from the frontend (debugging/UX only — never trust for authorization;
// always verify server-side via introspect — see auth-and-session.md)
const info = await embedded.auth.introspect();
```

**Token refresh flow:**
`embedded.auth.refresh()` posts a message to the dashboard shell. The iframe reloads with a fresh token, and your bootstrap function runs again automatically.

**Lifecycle listener:** `embedded.onInit((state) => { /* state.layout */ })` fires once the SDK handshake completes.

---

## Page Module

Controls the page title shown in the dashboard breadcrumb, plus dashboard-level navigation and
iframe sizing.

```ts
// Set the page title
embedded.page.setTitle("My App — Settings");

// Localized title
embedded.page.setTitle(
  layout?.locale === "ar" ? "إعدادات تطبيقي" : "My App — Settings",
);

// Navigate the dashboard to an internal route (SPA-style):
embedded.page.navigate("/orders");

// Full redirect to an external URL:
embedded.page.redirect("https://docs.my-app.com/help");

// Resize the iframe to fit content (auto by default; call to force a recompute):
embedded.page.resize();
```

Call `setTitle` on every route change so the dashboard breadcrumb stays in sync.

---

## Nav Module

Places an action button in the dashboard's top navigation bar, and can inject navbar tabs.

```ts
// Set a primary action button (e.g. Save). `icon` is optional.
embedded.nav.setAction({
  title: layout?.locale === "ar" ? "حفظ" : "Save",
  value: "save",
  icon: "sicon-check",
});

// Listen for action clicks — the callback receives the action's `value`; returns an unsubscribe fn.
const unsubscribe = embedded.nav.onActionClick((value) => {
  if (value === "save") saveForm();
});

// Remove the action when leaving the view:
embedded.nav.clearAction();
```

For injected navbar tabs (not just the action button), the module also exposes
`embedded.nav.addNavItem(item)` / `updateNavItem(item)` / `removeNavItem(value)` and
`embedded.nav.onNavItemClick(cb)` — `addNavItem` returns the created item's `value`; use it to
correlate later updates, removals, and clicks.

Use `setAction` for the main CTA. Do not render your own header buttons inside the iframe — keep nav chrome inside the dashboard shell per the "No-Chrome" rule.

---

## UI Module

Triggers native Salla dashboard UI components — toasts, loading overlay, confirm dialogs, and breadcrumb visibility.

### Toasts

```ts
embedded.ui.toast.success("Settings saved");
embedded.ui.toast.error("Failed to connect — check your API key");
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
  embedded.ui.toast.success("Sync complete");
} finally {
  embedded.ui.loading.hide();
}
```

### Confirm dialog

```ts
const ok = await embedded.ui.confirm({
  title: "Delete category?",
  message: "This cannot be undone.",
});
if (ok) await deleteCategory();
```

### Breadcrumbs

```ts
embedded.ui.breadcrumbs.hide(); // hide the dashboard breadcrumb for a full-bleed view
embedded.ui.breadcrumbs.show();
```

---

## Theme & locale

Theme, locale, and direction come from the `layout` returned by `embedded.init()` (see
[design-guidelines.md](design-guidelines.md)) — there is no separate theme-change event. Apply
`layout` on init, and re-apply it whenever the SDK re-initializes (e.g. after `auth.refresh()`
reloads the iframe).

---

## Full Module Reference

Per-module pages don't have public URLs yet — the methods above are the working reference. For the
SDK overview and the published guides, see https://docs.salla.dev/embedded-sdk/overview.md.

| Module   | Methods covered here                                                                                                |
| -------- | ------------------------------------------------------------------------------------------------------------------- |
| Auth     | `getToken` · `refresh` · `introspect` · `onInit`                                                                    |
| Page     | `setTitle` · `navigate` · `redirect` · `resize`                                                                     |
| Nav      | `setAction` · `onActionClick` · `clearAction` · `addNavItem` · `updateNavItem` · `removeNavItem` · `onNavItemClick` |
| UI       | `toast` · `loading` · `confirm` · `breadcrumbs`                                                                     |
| Checkout | in-app addon purchase flow → [salla-addon-purchase](../../salla-addon-purchase/SKILL.md)                            |
