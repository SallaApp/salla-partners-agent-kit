---
name: salla-embedded-app
description: >
  Build an iframe page inside the Salla Merchant Dashboard: register it via
  salla_embedded_pages, init @salla.sa/embedded-sdk, verify the short-lived session
  token server-side (never the OAuth introspect endpoint), sync theme/locale/RTL from
  init's layout, and use native Page/Nav/UI modules (No-Chrome rule). Use for embedded
  pages, dashboard UI, SDK modules, or token/401 issues. Selling addons in-app →
  salla-addon-purchase; publish flow → salla-app-builder.
---

# Salla Embedded App Flow

Integrate a custom page inside the Salla Merchant Dashboard. Step 1 **performs** the
page registration with the Salla Partners MCP; the SDK steps are code you write into the
app. Follow the steps in order — complete each gate before moving to the next.

## Tools

| Tool                     | Action                                           | What it does                                       |
| ------------------------ | ------------------------------------------------ | -------------------------------------------------- |
| `salla_embedded_pages`   | `list` / `create` / `update` / `delete`          | Manage the app's embedded (iframe) dashboard pages |
| `salla_onboarding_steps` | `list` / `create` / `update` / `delete` / `sort` | Manage post-install onboarding steps (optional)    |

> **Prerequisite:** the Salla Partners MCP server must be connected, and you need the
> app's `app_id`. If a tool returns "Salla session expired", re-run the login flow.

---

## Step 0 — Discover

Ask before starting:

1. **What does this page do?** (settings UI, analytics dashboard, addon purchase, etc.)
2. **Which SDK modules will you need?**
   - `auth` — token + refresh
   - `page` — title, navigation, redirect, resize
   - `nav` — action buttons, navbar tabs
   - `ui` — toasts, confirm dialogs, loading, breadcrumbs
   - `checkout` — addon purchase
3. **Does the page need to sell addons?** (activates the Checkout module)

---

## Step 1 — Register the Page

Register the iframe page by calling `salla_embedded_pages` with `action: "create"`,
the `app_id`, and:

- `route` — kebab path segment for the page (≥ 3 chars)
- `iframe_url` — the URL Salla loads in the iframe
- `default` — optional; mark this as the app's default page

Verify with `salla_embedded_pages action=list`. Use `update` / `delete` to change or
remove a page. (Optional) add post-install onboarding with `salla_onboarding_steps
action=create`.

**Manual fallback:** Portal → **App Details → Embedded Pages → Add page**.

**Gate:** "`salla_embedded_pages action=list` returns the page — can you see it in the
merchant dashboard sidebar?"

---

## Step 2 — Install & Initialize the SDK

**NPM:**

```bash
npm install @salla.sa/embedded-sdk
```

**CDN:**

```html
<script src="https://cdn.salla.network/embedded-sdk/latest/index.js"></script>
```

Initialize on every page load:

```ts
import { embedded } from "@salla.sa/embedded-sdk";

const { layout } = await embedded.init({ debug: false });
```

Module guide → [`references/sdk-modules-guide.md`](references/sdk-modules-guide.md)

---

## Step 3 — Authenticate the Session (Server-Side)

Verify the merchant's identity **before** rendering any content. Never trust the token
client-side only.

```ts
const token = embedded.auth.getToken();
if (!token) {
  // App was opened outside Salla — render a "please open inside the dashboard" message and stop.
  return;
}

const authOk = await fetch("/api/verify-token", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ token }),
}).then((res) => res.ok);

if (!authOk) {
  // Verification failed — show an error state. Trigger embedded.auth.refresh() to retry with a fresh token.
  return;
}

embedded.ready(); // signals the dashboard to show the iframe
```

Your backend must call:

```http
POST https://api.salla.dev/exchange-authority/v1/introspect
S-Source: YOUR_APP_ID
```

Full introspect implementation → [`references/auth-and-session.md`](references/auth-and-session.md)

**Gate:** "Does your backend successfully return `merchant_id` from introspect? Test with
a demo store token."

---

## Step 4 — Sync Theme & Locale

Theme, locale, and direction come from the `layout` returned by `embedded.init()` — do not read
query params manually:

```ts
if (layout) {
  document.documentElement.setAttribute("data-theme", layout.theme);
  document.documentElement.setAttribute("lang", layout.locale);
  document.documentElement.setAttribute(
    "dir",
    layout.locale === "ar" ? "rtl" : "ltr",
  );
}
```

`layout` is the source of truth for appearance; re-apply it whenever the SDK re-initializes (e.g.
after `embedded.auth.refresh()` reloads the iframe).

Design tokens, RTL patterns → [`references/design-guidelines.md`](references/design-guidelines.md)

---

## Step 5 — Wire SDK Modules

Based on your needs from Step 0, implement the relevant modules:

**Auth — refresh on 401:**

```ts
embedded.auth.refresh(); // Salla re-renders iframe with a fresh token
```

**Page — title and in-dashboard navigation:**

```ts
embedded.page.setTitle("My App");
embedded.page.navigate("/orders"); // route the dashboard (SPA); also redirect() and resize()
```

**Nav — action button:**

```ts
embedded.nav.setAction({ title: "Save", value: "save", icon: "sicon-check" }); // icon optional
const unsubscribe = embedded.nav.onActionClick((value) => {
  if (value === "save") saveChanges();
});
// Clear the action when the merchant navigates away from this view:
embedded.nav.clearAction();
```

**UI — toasts, loading, confirm, breadcrumbs:**

```ts
embedded.ui.toast.success("Saved!");
embedded.ui.toast.error("Something went wrong");
embedded.ui.loading.show();
embedded.ui.loading.hide();
const ok = await embedded.ui.confirm({
  title: "Delete?",
  message: "This cannot be undone.",
});
embedded.ui.breadcrumbs.hide(); // or .show()
```

**Checkout — addon purchase (if applicable):**
→ follow the **`salla-addon-purchase`** skill

Full method signatures → [`references/sdk-modules-guide.md`](references/sdk-modules-guide.md)

**Gate:** "Test each module you're using in the SDK Playground before going to
production."

---

## Step 6 — Publish

Embedded pages go live when the parent app is published. Follow the publishing checklist
in the publish step of **`salla-app-builder`**.

---

## Resources

| Topic                  | Link                                                                 |
| ---------------------- | -------------------------------------------------------------------- |
| Overview (hub)         | https://docs.salla.dev/embedded-sdk/overview                         |
| Installation           | https://docs.salla.dev/embedded-sdk/installation                     |
| Create an embedded app | https://docs.salla.dev/embedded-sdk/create-app                       |
| Authentication         | https://docs.salla.dev/embedded-sdk/authentication                   |
| App Design Guidelines  | https://docs.salla.dev/embedded-sdk/design-guidelines                |
| Playground / testing   | https://docs.salla.dev/embedded-sdk/playground                       |
| SDK module methods     | [`references/sdk-modules-guide.md`](references/sdk-modules-guide.md) |

> Per-module pages (auth/page/nav/ui/checkout) don't have public URLs yet — use the bundled
> [`sdk-modules-guide.md`](references/sdk-modules-guide.md) for method signatures.
