---
name: salla-embedded-app
description: >
  Use when building an iframe page inside the Salla Merchant Dashboard (an embedded app).
  Register it via salla_embedded_pages, install @salla.sa/embedded-sdk, await
  embedded.init() (postMessage bridge → layout: theme/locale/dir), then authenticate
  Trust-but-Verify: FE embedded.auth.getToken() sends a short-lived token to YOUR backend,
  which verifies it via POST /exchange-authority/v1/introspect (header S-Source = your App
  ID) and mints its own session; call embedded.ready() only after that. Use native
  Page/Nav/UI modules (No-Chrome rule), sync theme/RTL. Selling addons in-app →
  salla-addon-purchase-embedded; publish flow → salla-app-builder.
---

# Salla Embedded App Flow

Integrate a custom page inside the Salla Merchant Dashboard. Step 1 **performs** the
page registration with the Salla Partners MCP; the SDK steps are code you write into the
app. Follow the steps in order — complete each gate before moving to the next.

The official Salla model is **Trust-but-Verify**: Salla passes a short-lived token in the
iframe URL; your frontend captures it with `embedded.auth.getToken()` and hands it to **your
backend**, which **verifies it with Salla's Introspection API** and then mints its own session.
The frontend is a courier — it never makes authorization decisions. Step 3 is the recipe;
[`references/auth-and-session.md`](references/auth-and-session.md) is the authoritative source.

## Security rules (binding)

- **Authenticate every page on the backend.** The backend verifies the Salla token (introspect),
  mints its own session, and authorizes each request against that session — the frontend only
  ferries the token.
- **Verify via the backend introspect**
  (`POST https://api.salla.dev/exchange-authority/v1/introspect`, header `S-Source: <YOUR_APP_ID>`).
  `embedded.auth.introspect()` (Client Introspect) is dev/debug only — the docs say it "should not
  be used as a primary authentication method." Full request/response → Step 3 + `auth-and-session.md`.
- **Identity comes only from introspection.** Scope every route and query to the `merchant_id`
  introspection returned; reach the dashboard exclusively through Salla's native embedded-app
  support (no standalone `/dashboard?store_id=…` URL that trusts a query param or referer).

## Tools

| Tool                   | Action                                  | What it does                                       |
| ---------------------- | --------------------------------------- | -------------------------------------------------- |
| `salla_embedded_pages` | `list` / `create` / `update` / `delete` | Manage the app's embedded (iframe) dashboard pages |

> **Prerequisite:** the Salla Partners MCP server must be connected, and you need the
> app's `app_id`. If a tool returns "Salla session expired", re-run the login flow.

---

## Step 0 — Discover

Ask before starting:

1. **What does this page do?** (settings UI, analytics dashboard, addon purchase, etc.)
2. **Which SDK modules will you need?**
   - `auth` — `getToken`, `refresh`, `introspect` (dev-only), plus core `init`/`ready`/`destroy`
   - `page` — `setTitle`, `navigate`, `redirect`, `navTo`
   - `nav` — action buttons (`setAction`/`onActionClick`/`clearAction`) and sub-nav items
   - `ui` — toasts, confirm dialogs, loading, breadcrumbs
   - `checkout` — addon purchase
3. **Does the page need to sell addons?** (activates the Checkout module)

---

## Step 1 — Register the Page

Register the iframe page by calling `salla_embedded_pages` with `action: "create"`,
the `app_id`, and:

- `route` — kebab path segment for the page (≥ 3 chars). Appears as
  `https://s.salla.sa/embedded/app/{appId}/{route}`.
- `iframe_url` — the full URL Salla loads in the iframe (e.g.
  `https://dashboard.myapp.net/salla/embedded`). Salla appends `token`, `theme`, `lang`.
- `default` — optional; mark this as the app's default landing page.

`create` returns the new page; `update` returns no body from the Portal, so the tool echoes
the fields you changed (`{ page: { id, route, iframe_url, default, updated: true } }`) as
confirmation. Call `salla_embedded_pages action=list` for the authoritative current state. Use
`update` / `delete` to change or remove a page.

**Manual fallback:** Portal → **App Details → Embedded Pages → Add page**.

**Gate:** "`salla_embedded_pages action=list` returns the page — can you see it in the
merchant dashboard sidebar?"

### Embedded app images (set at publish)

An embeddable app carries two App-Store images, both written through the publication, not the
SDK. Set them while publishing (Step 6 → **salla-publication-consistency**):

| Image                                      | Where set                                             | Dimensions / limit                                                              | Shows                                          |
| ------------------------------------------ | ----------------------------------------------------- | ------------------------------------------------------------------------------- | ---------------------------------------------- |
| **Embedded App Banner** (`embedded_image`) | `app_publish` features section                        | min 710×260 px (recommended 1420×520), max 512 KB                               | the app's embedded/iframe presentation         |
| **Salla promotional image**                | `app_publish` features section (promotional/featured) | confirm dimensions via `app_publish` readiness / `salla-docs` before generating | Salla's promotional / featured (build) section |

The Salla promotional image is a **second** image (in addition to the Embedded App Banner) used
in Salla's promotional/featured section — supply it whenever the app is featured there.

**Image-generation enrichment** applies to both: when either is missing (or it's the first
publication) and an image-generation tool is available → confirm the dimensions above, generate,
`salla_upload`, then set via `app_publish` features section; otherwise ask the merchant for a real
asset. Don't duplicate the steps — the canonical recipe (and every other listing image field)
lives in
[salla-app-ui-builder](../salla-app-ui-builder/SKILL.md#generating-missing-listing-images-canonical-recipe).
Manual fallback: My Apps → App → App Details → Start publishing → App Features.

---

## Step 2 — Install & Initialize the SDK

**Install the npm package — do NOT rely on a CDN global.** Import `embedded` from the
package so TypeScript validates the method names; the CDN build's global name/shape can
differ and silently break boot.

```bash
npm install @salla.sa/embedded-sdk
```

```ts
import { embedded } from "@salla.sa/embedded-sdk";
```

CDN fallback (vanilla / non-bundled pages only — confirm the global first):

```html
<script src="https://unpkg.com/@salla.sa/embedded-sdk/dist/umd/index.js"></script>
<script>
  const embedded = Salla.embedded; // or SallaEmbeddedSDK.embedded
</script>
```

Initialize on every page load — `init()` establishes the postMessage bridge and resolves
with the dashboard `layout`:

```ts
const { layout } = await embedded.init({ debug: false });
// layout carries theme ("light"|"dark"), locale ("ar"|"en"), dir ("rtl"|"ltr"), …
```

**Two things block a first embedded app even when the SDK calls are correct:**

1. **Embeddability** — your host must let Salla frame the page (set
   `Content-Security-Policy: frame-ancestors https://s.salla.sa`, drop `X-Frame-Options`), or the
   dashboard shows a blank/"refused" pane.
2. **Dev loop** — the page needs the dashboard handshake for a token, so you can't open it in a
   plain tab. Tunnel localhost, point `iframe_url` at the tunnel, install on a demo store, **Run App**.

Headers, dev loop, framework gotchas (React/Next, Vue), a full worked example, and a copy-paste
starter → [`references/implementation-guide.md`](references/implementation-guide.md)

Module guide → [`references/sdk-modules-guide.md`](references/sdk-modules-guide.md)

---

## Step 3 — Authenticate the Session (Trust-but-Verify)

The flow, in order:

1. **`await embedded.init()`** — establish the bridge; read `layout`.
2. **`embedded.auth.getToken()`** — retrieve the short-lived token from the iframe URL
   (returns `string | null`; handle `null` = opened outside Salla).
3. **Send the token to YOUR backend.** The frontend is a courier — do **not** make authz
   decisions here.
4. **Backend verifies** via `POST https://api.salla.dev/exchange-authority/v1/introspect`,
   header `S-Source: <YOUR_APP_ID>`, body `{ "token": "..." }` → success nests the claims
   under `data`: read `data.merchant_id` / `data.user_id` / `data.exp` (`data.exp` is an
   ISO-8601 datetime string, not a Unix timestamp). Backend mints its own session
   (JWT / secure cookie).
5. **`embedded.ready()`** — call **only** after the backend confirms **and** your data is
   loaded. The dashboard shows a loading overlay until you do.
6. **On failure** — call `embedded.destroy()` to exit gracefully rather than leaving the
   merchant on a hung loading screen.

```ts
// 1. Bridge + layout
const { layout } = await embedded.init({ debug: false });

try {
  // 2. Capture the short-lived token from the URL
  const token = embedded.auth.getToken();
  if (!token) throw new Error("Opened outside Salla — no token");

  // 3 + 4. Hand the token to YOUR backend; it introspects and mints a session.
  const res = await fetch("/api/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ token }),
  });
  if (!res.ok) throw new Error("Verification failed");

  // 5. Backend confirmed + data loaded → reveal the iframe.
  await loadDashboardData();
  embedded.ready();
} catch (err) {
  console.error("Auth failed", err);
  embedded.destroy(); // exit gracefully instead of hanging on the loading overlay
}
```

**`embedded.auth.introspect()` is dev/debug ONLY** — a frontend reference helper for the
introspection flow that the docs explicitly say "should not be used as a primary authentication
method." Production authorization is always the backend introspect above.

When the backend returns `401`/expiry → call `embedded.auth.refresh()`; Salla reloads the iframe
with a fresh token, your bootstrap re-runs, and the flow restarts.

Full backend introspect (with `S-Source`), session minting, and the 401→refresh loop →
[`references/auth-and-session.md`](references/auth-and-session.md)

**Gate:** "Does your backend introspect the token (with the `S-Source` header) and mint its own
session before you call `ready()`? Test with a demo store."

---

## Step 4 — Sync Theme & Locale

Theme, locale, and direction come from the `layout` returned by `embedded.init()` — do not read
query params manually:

```ts
if (layout) {
  document.documentElement.setAttribute("data-theme", layout.theme);
  document.documentElement.setAttribute("lang", layout.locale);
  document.documentElement.setAttribute("dir", layout.dir); // "rtl" for ar, "ltr" for en
}
```

`layout` is the source of truth for appearance; re-apply it whenever the SDK re-initializes (e.g.
after `embedded.auth.refresh()` reloads the iframe). The dashboard also supports dynamic theme
switching — listen with `embedded.onThemeChange()` where available.

Design tokens, brand colors, RTL patterns → [`references/design-guidelines.md`](references/design-guidelines.md)

---

## Step 5 — Wire SDK Modules

Based on your needs from Step 0, implement the relevant modules:

**Auth — refresh on recoverable expiry; destroy only when unrecoverable:**

```ts
// Backend reported the token expired (401): refresh — Salla re-renders the iframe with a fresh one.
embedded.auth.refresh();

// Only when auth is unrecoverable (a fresh token still can't verify, app suspended):
embedded.destroy(); // tears down the iframe so the dashboard doesn't hang
```

Order matters: a transient expiry must `refresh()`, not `destroy()`.

**Page — title and dashboard navigation:**

```ts
embedded.page.setTitle("My App");
embedded.page.navigate("/orders"); // internal SPA route (React Router)
embedded.page.redirect("https://docs.my-app.com/help"); // external / full reload
embedded.page.navTo("/orders"); // auto-picks navigate vs redirect
```

**Nav — action button + sub-nav items:**

```ts
embedded.nav.setAction({
  title: "Save",
  value: "save",
  icon: "hgi hgi-stroke hgi-tick-02",
}); // icon optional (Hugeicons class)
const off = embedded.nav.onActionClick((value) => {
  if (value === "save") saveChanges();
});
embedded.nav.clearAction(); // when the merchant leaves this view
```

**UI — toasts, loading, confirm, breadcrumbs:**

```ts
embedded.ui.toast.success("Saved!");
embedded.ui.toast.error("Something went wrong");
embedded.ui.loading.show();
embedded.ui.loading.hide();
const { confirmed } = await embedded.ui.confirm({
  title: "Delete?",
  message: "This cannot be undone.",
  variant: "danger", // confirm() resolves to { confirmed }, not a bare boolean
});
embedded.ui.breadcrumbs.hide(); // or .show()
```

**Checkout — in-app addon purchase (if applicable):**
→ follow the **`salla-addon-purchase-embedded`** skill (the embedded/in-app purchase flow;
for addon pricing/entitlement mechanics see `salla-addon-purchase`)

Full method signatures → [`references/sdk-modules-guide.md`](references/sdk-modules-guide.md)

**Gate:** "Test each module you're using in the SDK Playground before going to
production." → [Playground](https://docs.salla.dev/embedded-sdk/playground.md) /
[Test Kit](https://github.com/SallaApp/embedded-sdk-playground)

---

## Step 6 — Publish

Embedded pages go live when the parent app is published. Follow the publishing checklist
in the publish step of **`salla-app-builder`**.

---

## Resources

| Topic                  | Link                                                                       |
| ---------------------- | -------------------------------------------------------------------------- |
| Overview (hub)         | https://docs.salla.dev/embedded-sdk/overview.md                            |
| Getting Started        | https://docs.salla.dev/embedded-sdk/getting-started.md                     |
| Installation           | https://docs.salla.dev/embedded-sdk/installation.md                        |
| Create an embedded app | https://docs.salla.dev/embedded-sdk/create-app.md                          |
| Authentication         | https://docs.salla.dev/embedded-sdk/authentication.md                      |
| Token Introspect (API) | https://docs.salla.dev/27474794e0.md                                       |
| App Design Guidelines  | https://docs.salla.dev/embedded-sdk/design-guidelines.md                   |
| Playground / testing   | https://docs.salla.dev/embedded-sdk/playground.md                          |
| Support & community    | https://docs.salla.dev/embedded-sdk/resources/support.md                   |
| Implementation guide   | [`references/implementation-guide.md`](references/implementation-guide.md) |
| SDK module methods     | [`references/sdk-modules-guide.md`](references/sdk-modules-guide.md)       |

> Per-module pages live under `https://docs.salla.dev/embedded-sdk/modules/...` (auth, page, nav,
> ui, checkout). The bundled [`sdk-modules-guide.md`](references/sdk-modules-guide.md) mirrors
> their signatures.
