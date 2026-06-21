# Embedded SDK — Module Guide

Method reference for the SDK modules with examples. These are **illustrative** — the SDK has
no public per-module URLs yet, so confirm the exact method names/shapes against the installed
`@salla.sa/embedded-sdk` package types before calling (the surface evolves; guessed names fail
at runtime).

> **Auth first, always.** This file documents UI/SDK modules, not authentication. The SDK's
> client-side auto-login is **trusted UX only** — `embedded.init()` verifies the short-lived
> (5 min) token in the iframe and logs the user in — but the **frontend is never trusted for
> authorization**. Every embedded page must run on **your app's own OAuth session**, and all
> validation/authorization happens on the **backend** (never introspect the token on the FE).
> See SKILL.md Step 3 → [`auth-and-session.md`](auth-and-session.md). The `auth` module below is
> the SDK side of the handshake only. OAuth / stored merchant-token handling → `salla-app-auth`.

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
```

> **Do NOT introspect/validate the SDK token on the frontend.** The SDK already verifies the
> token client-side on `init()` and auto-logs-in the user (trusted, UX only) — that is all the
> frontend needs. Even if the package exposes a token-introspection method, do not call it: the
> frontend is **never** trusted for authorization. Authorization lives on the **backend**, on
> your app's **own OAuth session** — see [`auth-and-session.md`](auth-and-session.md).

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
```

Call `setTitle` on every route change so the dashboard breadcrumb stays in sync.

> **No resize call needed.** The host auto-manages iframe height (viewport minus header/navbar) and
> updates it responsively. `page.resize()`, `autoResize()`, and `stopAutoResize()` are **deprecated
> no-ops** kept only for backwards compatibility — don't call them.

---

## Nav Module

Places an action button in the dashboard's top navigation bar, and can inject navbar tabs.

```ts
// Set a primary action button (e.g. Save). `icon` and `disabled` are optional.
embedded.nav.setAction({
  title: layout?.locale === "ar" ? "حفظ" : "Save",
  value: "save",
  icon: "sicon-check",
  disabled: false, // grey out while a form is invalid / saving
});

// A button with a dropdown of extended actions (each fires onActionClick with its own value):
embedded.nav.setAction({
  title: "Actions",
  value: "main",
  extendedActions: [
    { title: "Export CSV", value: "export_csv" }, // optional: subTitle, icon, disabled
    { title: "Print", value: "print" },
  ],
});

// Listen for action clicks — the callback receives the clicked `value` (primary OR extended);
// returns an unsubscribe fn.
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

Resolves to a `{ confirmed: boolean }` object — **not** a bare boolean. Options: `title`,
`message`, `confirmText`, `cancelText`, `variant` (`"info"` | `"warning"` | `"danger"`).

```ts
const { confirmed } = await embedded.ui.confirm({
  title: "Delete category?",
  message: "This cannot be undone.",
  confirmText: "Delete",
  variant: "danger",
});
if (confirmed) await deleteCategory();
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
SDK overview and the published guides, see https://docs.salla.dev/embedded-sdk/overview.md

| Module   | Methods covered here                                                                                                |
| -------- | ------------------------------------------------------------------------------------------------------------------- |
| Auth     | `getToken` · `refresh` · `onInit` (do NOT introspect/validate the token on the FE — authorize on the backend)       |
| Page     | `setTitle` · `navigate` · `redirect` (height is auto-managed — `resize` is a deprecated no-op)                      |
| Nav      | `setAction` · `onActionClick` · `clearAction` · `addNavItem` · `updateNavItem` · `removeNavItem` · `onNavItemClick` |
| UI       | `toast` · `loading` · `confirm` · `breadcrumbs`                                                                     |
| Checkout | in-app addon purchase flow → [salla-addon-purchase-embedded](../../salla-addon-purchase-embedded/SKILL.md)          |
