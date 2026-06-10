---
name: salla-embedded-app
description: >
  Use when building or debugging a Salla embedded app — an iframe-based custom UI
  inside the Salla Merchant Dashboard. Covers SDK setup, server-side token
  authentication, module usage (Auth, Page, Nav, UI, Checkout), RTL/theme sync,
  and playground testing.
---

# Salla Embedded App Flow

Integrate a custom page inside the Salla Merchant Dashboard. Step 1 **performs** the
page registration with the Salla Partners MCP; the SDK steps are code you write into the
app. Follow the steps in order — complete each gate before moving to the next.

## Tools

| Tool | Action | What it does |
| --- | --- | --- |
| `salla_embedded_pages` | `list` / `create` / `update` / `delete` | Manage the app's embedded (iframe) dashboard pages |
| `salla_onboarding_steps` | `list` / `create` / `update` / `delete` / `sort` | Manage post-install onboarding steps (optional) |

> **Prerequisite:** the Salla Partners MCP server must be connected, and you need the
> app's `app_id`. If a tool returns "Salla session expired", re-run the login flow.

---

## Step 0 — Discover

Ask before starting:

1. **What does this page do?** (settings UI, analytics dashboard, addon purchase, etc.)
2. **Which SDK modules will you need?**
   - `auth` — token + refresh
   - `page` — title, resize
   - `nav` — action buttons, breadcrumbs
   - `ui` — toasts, modals, loading
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

SDK overview → [`references/embedded-sdk-overview.md`](references/embedded-sdk-overview.md)

---

## Step 3 — Authenticate the Session (Server-Side)

Verify the merchant's identity **before** rendering any content. Never trust the token
client-side only.

```ts
const token = embedded.auth.getToken();
if (!token) { embedded.destroy(); return; }

const authOk = await fetch("/api/verify-token", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ token }),
}).then((res) => res.ok);

if (!authOk) { embedded.destroy(); return; }

embedded.ready(); // signals the dashboard to show the iframe
```

Your backend must call:
```
POST https://api.salla.dev/exchange-authority/v1/introspect
S-Source: YOUR_APP_ID
```

Full introspect implementation → [`references/auth-and-session.md`](references/auth-and-session.md)

**Gate:** "Does your backend successfully return `merchant_id` from introspect? Test with
a demo store token."

---

## Step 4 — Sync Theme & Locale

Use the `layout` from `embedded.init()` — do not read query params manually:

```ts
if (layout) {
  document.documentElement.setAttribute("data-theme", layout.theme);
  document.documentElement.setAttribute("lang", layout.locale);
  document.documentElement.setAttribute("dir", layout.locale === "ar" ? "rtl" : "ltr");
}

embedded.onThemeChange?.((newTheme) => {
  document.documentElement.setAttribute("data-theme", newTheme);
});
```

Design tokens, RTL patterns → [`references/design-guidelines.md`](references/design-guidelines.md)

---

## Step 5 — Wire SDK Modules

Based on your needs from Step 0, implement the relevant modules:

**Auth — refresh on 401:**

```ts
embedded.auth.refresh(); // Salla re-renders iframe with a fresh token
```

**Page — set title:**

```ts
embedded.page.setTitle("My App");
```

**Nav — action button:**

```ts
embedded.nav.setAction({ title: "Save", value: "save" });
embedded.nav.onAction((action) => {
  if (action.value === "save") saveChanges();
});
```

**UI — toasts and loading:**

```ts
embedded.ui.toast.success("Saved!");
embedded.ui.toast.error("Something went wrong");
embedded.ui.loading.show();
embedded.ui.loading.hide();
```

**Checkout — addon purchase (if applicable):**
→ follow the **`salla-addon-purchase-embedded`** skill

Full method signatures → [`references/sdk-modules-guide.md`](references/sdk-modules-guide.md)

**Gate:** "Test each module you're using in the SDK Playground before going to
production."

---

## Step 6 — Publish

Embedded pages go live when the parent app is published. Follow the publishing checklist
in **`salla-general-app`** Step 8.

---

## Resources

| Topic | Link |
| --- | --- |
| Getting Started | https://docs.salla.dev/1950922 |
| Authentication | https://docs.salla.dev/1919160 |
| Auth Module | https://docs.salla.dev/embedded-sdk/modules/auth.md |
| Page Module | https://docs.salla.dev/embedded-sdk/modules/page.md |
| Nav Module | https://docs.salla.dev/embedded-sdk/modules/nav.md |
| UI Module | https://docs.salla.dev/embedded-sdk/modules/ui.md |
| Checkout Module | https://docs.salla.dev/embedded-sdk/modules/checkout.md |
| Token Introspect | https://docs.salla.dev/6394918f0.md |
| App Design Guidelines | https://docs.salla.dev/1929178 |
| Playground Testing | https://docs.salla.dev/1929235 |
