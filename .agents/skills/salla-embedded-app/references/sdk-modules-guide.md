# Embedded SDK — Module Guide

Method reference for the SDK modules, taken from the official docs
(https://docs.salla.dev/embedded-sdk/overview.md and the per-module pages under
`/embedded-sdk/modules/...`). Confirm the exact surface against the installed
`@salla.sa/embedded-sdk` package types — the SDK is open-source and evolves.

> **Authenticate first (Trust-but-Verify).** `embedded.init()` opens the bridge and returns
> `layout`; `embedded.auth.getToken()` retrieves the short-lived token; you send it to **your
> backend**, which verifies it via `POST /exchange-authority/v1/introspect` (header `S-Source =
your App ID`) and mints its own session. Call `embedded.ready()` only after that. The frontend
> never authorizes. `embedded.auth.introspect()` is **dev/debug only**. Full flow → SKILL.md
> Step 3 / [`auth-and-session.md`](auth-and-session.md). Admin-API merchant tokens → `salla-app-auth`.

Import the SDK using the named export:

```ts
import { embedded } from "@salla.sa/embedded-sdk";
```

Or via CDN (UNPKG; exposes `Salla.embedded`):

```html
<script src="https://unpkg.com/@salla.sa/embedded-sdk/dist/umd/index.js"></script>
<script>
  const embedded = Salla.embedded; // or SallaEmbeddedSDK.embedded
</script>
```

---

## Core lifecycle

| Method                   | Signature                              | Description                                                                                             |
| ------------------------ | -------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `embedded.init`          | `init(options?) → Promise<{ layout }>` | Opens the postMessage bridge; resolves with dashboard `layout` (theme/locale/dir). Accepts `{ debug }`. |
| `embedded.onInit`        | `onInit((state) => void)`              | Listener that fires once the SDK is ready; `state.layout` holds the context.                            |
| `embedded.ready`         | `ready() → void`                       | Hides the dashboard loading overlay. Call **only** after backend auth + data load.                      |
| `embedded.destroy`       | `destroy() → void`                     | Tears down the embedded view; use to exit gracefully on auth failure.                                   |
| `embedded.onThemeChange` | `onThemeChange((theme) => void)`       | Listener for dynamic dashboard theme switches (see design-guidelines).                                  |

```ts
const { layout } = await embedded.init({ debug: true });

document.documentElement.classList.toggle("dark", layout.theme === "dark");
document.documentElement.lang = layout.locale;
document.documentElement.dir = layout.dir;

// … verify the token with your backend …

embedded.ready();
```

If `init()` rejects, or there is no token, render an "open inside the dashboard" state and do not
call `ready()`.

---

## Auth Module

Manages the session token between your iframe and the dashboard, and exposes the (dev-only)
client introspect helper.

| Method                     | Signature                                            | Description                                                               |
| -------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------- |
| `embedded.auth.getToken`   | `getToken() → string \| null`                        | Returns the short-lived token from the iframe URL (`null` if absent).     |
| `embedded.auth.refresh`    | `refresh() → void`                                   | Asks the host to reload the iframe with a fresh token. Use on 401/expiry. |
| `embedded.auth.introspect` | `introspect(options?) → Promise<IntrospectResponse>` | **DEV/DEBUG ONLY** — client-side token inspection; never primary auth.    |

```ts
// Production: get token → send to backend (backend introspects + mints session).
const token = embedded.auth.getToken();
if (token) {
  // POST it to /api/auth/session — see auth-and-session.md
} else {
  console.error("No authentication token found in URL");
}

// On 401 from your backend:
embedded.auth.refresh(); // host reloads the iframe with a fresh token; bootstrap re-runs
```

**`introspect(options?)` — dev/debug only.** The docs state it "should not be used as a primary
authentication method."

- **options** `IntrospectOptions` (optional):
  - `appId: string` — your App ID (auto-extracted from URL if omitted)
  - `token: string` — token to verify (auto-extracted if omitted)
  - `refreshOnError: boolean` — auto-refresh iframe if invalid (default `true`)
- **returns** `Promise<IntrospectResponse>`: `{ isVerified: boolean, isError: boolean, data: { merchant_id, user_id, exp } }`

```ts
// DEV ONLY
const result = await embedded.auth.introspect();
if (result.isVerified) console.log("user:", result.data.user_id);
```

> Production authorization is always the **backend** introspect via
> `POST /exchange-authority/v1/introspect` with the `S-Source` header — see
> [`auth-and-session.md`](auth-and-session.md).

---

## Page Module

Controls the document title and dashboard-level navigation.

| Method                   | Signature                                 | Description                                                                |
| ------------------------ | ----------------------------------------- | -------------------------------------------------------------------------- |
| `embedded.page.setTitle` | `setTitle(title: string) → void`          | Updates the document title at the host level.                              |
| `embedded.page.navigate` | `navigate(path: string, options?) → void` | Internal SPA route change (React Router). Options: `{ state?, replace? }`. |
| `embedded.page.redirect` | `redirect(url: string) → void`            | Full reload to an external URL (`window.location.assign` at the host).     |
| `embedded.page.navTo`    | `navTo(url: string) → void`               | Smart helper — auto-picks `navigate` (internal) vs `redirect` (external).  |

```ts
embedded.page.setTitle("My App — Settings");

embedded.page.navigate("/orders"); // SPA route
embedded.page.navigate("/settings", { replace: true }); // replace history entry
embedded.page.navigate("/products", { state: { from: "my-app" } });

embedded.page.redirect("https://docs.my-app.com/help"); // external / full reload

embedded.page.navTo("/orders"); // → navigate()
embedded.page.navTo("https://google.com"); // → redirect()
```

Use absolute internal paths (`/orders`). Use `replace: true` for automatic redirects so the Back
button doesn't trap the merchant. Call `setTitle` on every route change.

---

## Nav Module

Injects a primary action button into the dashboard top navbar, and (optionally) sub-nav tabs.
**Per the No-Chrome rule, do not render header buttons inside your iframe — use these instead.**

### Action button

| Method                       | Signature                         | Description                                                       |
| ---------------------------- | --------------------------------- | ----------------------------------------------------------------- |
| `embedded.nav.setAction`     | `setAction(action) → void`        | Sets the primary navbar button (optionally with a dropdown).      |
| `embedded.nav.onActionClick` | `onActionClick(cb) → unsubscribe` | Listens for action clicks; callback receives the clicked `value`. |
| `embedded.nav.clearAction`   | `clearAction() → void`            | Removes all custom navbar buttons.                                |

`setAction(action)` fields:

| Field             | Type      | Required | Description                                                      |
| ----------------- | --------- | -------- | ---------------------------------------------------------------- |
| `title`           | `string`  | Yes      | Button text.                                                     |
| `value`           | `string`  | Yes      | Identifier passed to `onActionClick`.                            |
| `icon`            | `string`  | No       | Salla icon class (e.g. `salla-icon-plus`, `sicon-...`).          |
| `disabled`        | `boolean` | No       | Grey out / disable the button.                                   |
| `extendedActions` | `array`   | No       | Dropdown items: `{ title, value, subTitle?, icon?, disabled? }`. |

```ts
embedded.nav.setAction({
  title: "Create Product",
  value: "create-product",
  icon: "salla-icon-plus",
});

embedded.nav.setAction({
  title: "Actions",
  value: "main",
  extendedActions: [
    { title: "Export to CSV", value: "export_csv" },
    { title: "Print Report", value: "print" },
  ],
});

const unsubscribe = embedded.nav.onActionClick((value) => {
  switch (value) {
    case "create-product":
      openCreateForm();
      break;
    case "export_csv":
      handleExport();
      break;
  }
});

// On view teardown:
unsubscribe();
embedded.nav.clearAction();
```

### Sub-nav items

Inject host-level tabs (e.g. Overview / Settings / Logs), flat or with a one-level dropdown.

| Method                        | Signature                                       | Description                                                                 |
| ----------------------------- | ----------------------------------------------- | --------------------------------------------------------------------------- |
| `embedded.nav.addNavItem`     | `addNavItem(item) → Promise<{ value: string }>` | Adds a sub-nav tab; resolves with the parent row's immutable `value`.       |
| `embedded.nav.updateNavItem`  | `updateNavItem(item) → void`                    | Patches a parent/child row by `value` (title/url/disabled/active/children). |
| `embedded.nav.removeNavItem`  | `removeNavItem(value: string) → void`           | Removes a parent (and its children) or a single child by `value`.           |
| `embedded.nav.onNavItemClick` | `onNavItemClick(cb) → unsubscribe`              | Listens for sub-nav clicks; callback receives `{ value, url }`.             |

`addNavItem(item)` fields: `title` (req), `value` (req, globally unique), `url` (req),
`disabled?`, `active?`, `children?` (one level: `{ title, value, url, disabled?, active? }` — no
nested `children`).

```ts
const { value } = await embedded.nav.addNavItem({
  title: "Overview",
  value: "overview-tab",
  url: "/apps/my-app/overview",
  active: true,
});

await embedded.nav.addNavItem({
  title: "Reports",
  value: "reports",
  url: "/apps/my-app/reports",
  children: [
    {
      title: "Summary",
      value: "reports-summary",
      url: "/apps/my-app/reports/summary",
    },
    {
      title: "Export",
      value: "reports-export",
      url: "/apps/my-app/reports/export",
    },
  ],
});

const off = embedded.nav.onNavItemClick(({ value, url }) => {
  setActiveTab(value);
  embedded.nav.updateNavItem({ value, active: true });
});

embedded.nav.updateNavItem({
  value: "overview-tab",
  title: "Home",
  active: true,
});
embedded.nav.removeNavItem("reports"); // removes parent + dropdown rows
off(); // unsubscribe on cleanup
```

`value` is immutable — to change it, remove and re-add. Setting one parent `active: true` clears
`active` on other injected parents (and child-vs-child within a parent).

---

## UI Module

Triggers native Salla dashboard UI — toasts, loading overlay, confirm dialogs, breadcrumbs.

### Toasts

| Method                      | Signature                                     | Description                  |
| --------------------------- | --------------------------------------------- | ---------------------------- |
| `embedded.ui.toast.success` | `success(message: string, duration?: number)` | Green success toast.         |
| `embedded.ui.toast.error`   | `error(message: string, duration?: number)`   | Red error toast.             |
| `embedded.ui.toast.warning` | `warning(message: string, duration?: number)` | Orange warning toast.        |
| `embedded.ui.toast.info`    | `info(message: string, duration?: number)`    | Blue info toast.             |
| `embedded.ui.toast.show`    | `show(options: ToastOptions)`                 | Generic; full configuration. |

`ToastOptions`: `{ type: "success"|"error"|"warning"|"info", message: string, duration?: number (default 3000) }`.

```ts
embedded.ui.toast.success("Product saved successfully!");
embedded.ui.toast.error("Failed to update inventory.");
embedded.ui.toast.show({
  type: "info",
  message: "Custom toast",
  duration: 5000,
});
```

> Best practice (per docs): skip success toasts when the UI update already conveys success.

### Loading overlay

| Method                     | Signature       | Description                          |
| -------------------------- | --------------- | ------------------------------------ |
| `embedded.ui.loading.show` | `show() → void` | Shows the dashboard loading overlay. |
| `embedded.ui.loading.hide` | `hide() → void` | Hides it — always call in `finally`. |

```ts
embedded.ui.loading.show();
try {
  await syncOrders();
  embedded.ui.toast.success("Sync complete");
} catch {
  embedded.ui.toast.error("Failed to save data.");
} finally {
  embedded.ui.loading.hide();
}
```

### Confirm dialog

`embedded.ui.confirm(options) → Promise<{ confirmed: boolean }>` — resolves to an object, **not**
a bare boolean.

Options: `title`, `message`, `confirmText` (default `"Confirm"`), `cancelText` (default
`"Cancel"`), `variant` (`"info"` | `"warning"` | `"danger"`, default `"info"`).

```ts
const { confirmed } = await embedded.ui.confirm({
  title: "Delete Category?",
  message:
    "This will permanently remove the category. This action cannot be undone.",
  confirmText: "Yes, Delete It",
  cancelText: "Keep Category",
  variant: "danger",
});
if (confirmed) await deleteCategory();
```

### Breadcrumbs

| Method                         | Signature       | Description                    |
| ------------------------------ | --------------- | ------------------------------ |
| `embedded.ui.breadcrumbs.hide` | `hide() → void` | Hides the host breadcrumbs.    |
| `embedded.ui.breadcrumbs.show` | `show() → void` | Restores the host breadcrumbs. |

```ts
embedded.ui.breadcrumbs.hide(); // focused / full-bleed flow
embedded.ui.breadcrumbs.show(); // restore on leaving the flow
```

---

## Theme & locale

Theme, locale, and direction come from the `layout` returned by `embedded.init()` (see
[design-guidelines.md](design-guidelines.md)). Apply `layout` on init and re-apply it whenever
the SDK re-initializes (e.g. after `auth.refresh()` reloads the iframe). Listen for dynamic
switches via `embedded.onThemeChange()`.

---

## Use methods, not raw postMessage

Always use the high-level SDK methods (e.g. `embedded.ui.toast.success`) — never send
`postMessage` events directly. Internal message shapes may change between versions; the SDK
handles validation, error states, and abstraction.

---

## Module reference summary

| Module   | Methods                                                                                                             |
| -------- | ------------------------------------------------------------------------------------------------------------------- |
| Core     | `init` · `onInit` · `ready` · `destroy` · `onThemeChange`                                                           |
| Auth     | `getToken` · `refresh` · `introspect` (dev-only) — production authz is **backend** introspect (`S-Source`)          |
| Page     | `setTitle` · `navigate` · `redirect` · `navTo`                                                                      |
| Nav      | `setAction` · `onActionClick` · `clearAction` · `addNavItem` · `updateNavItem` · `removeNavItem` · `onNavItemClick` |
| UI       | `toast.{success,error,warning,info,show}` · `loading.{show,hide}` · `confirm` · `breadcrumbs.{show,hide}`           |
| Checkout | in-app addon purchase flow → [salla-addon-purchase-embedded](../../salla-addon-purchase-embedded/SKILL.md)          |

> Per-module docs: https://docs.salla.dev/embedded-sdk/modules/auth.md ·
> `.../modules/page.md` · `.../modules/nav.md` · `.../modules/ui.md` · `.../modules/checkout.md`
