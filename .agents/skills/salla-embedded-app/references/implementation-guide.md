# Embedded App — Implementation Guide

How to actually build and run the iframe page after it's registered (SKILL.md Step 1). Covers the
two things that block a first embedded app even when the SDK calls are correct — **iframe
embeddability** and the **local dev loop** — then a full worked example and a copy-paste starter.

Examples are vanilla TS so they port anywhere; framework gotchas are called out in
[Framework notes](#framework-notes).

---

## How Salla loads your page

The dashboard shell renders at `https://s.salla.sa/embedded/app/{appId}/{route}` and loads your
registered `iframe_url` **inside an iframe**, appending query params:

| Param   | Value                 | Read it via                     |
| ------- | --------------------- | ------------------------------- |
| `token` | short-lived SDK token | `embedded.auth.getToken()`      |
| `theme` | `light` \| `dark`     | `layout.theme` (from `init()`)  |
| `lang`  | `ar` \| `en`          | `layout.locale` (from `init()`) |

> Source: https://docs.salla.dev/embedded-sdk/create-app.md

**Trust-but-Verify:** the token in the URL is a _bootstrap_ credential. Your frontend reads it
with `embedded.auth.getToken()` and sends it to **your backend**, which verifies it via
`POST /exchange-authority/v1/introspect` (header `S-Source = your App ID`) and mints its own
session. The frontend never authorizes. See [`auth-and-session.md`](auth-and-session.md).

Never parse the query params yourself — call `embedded.init()` and read `layout` (it also carries
`layout.dir` = `rtl`/`ltr`).

---

## 1. Make your page embeddable (the #1 blocker)

Your page is loaded **cross-origin inside Salla's dashboard**. If your host sends framing-deny
headers — which Next.js, Vercel, Netlify, nginx, and most security middleware do by **default** —
the browser refuses to render the iframe and the merchant sees a blank/"refused to connect" pane.
Fix it on **every response that serves the iframe HTML**:

- **Set** `Content-Security-Policy: frame-ancestors https://s.salla.sa` (the dashboard origin).
- **Remove** any `X-Frame-Options: DENY` / `SAMEORIGIN` header — `frame-ancestors` supersedes it,
  but a lingering `X-Frame-Options` still blocks some browsers.
- Confirm the real parent origin in DevTools (the top frame's URL) and add staging origins if you
  run them; production is `https://s.salla.sa`.

**Express / Node:**

```ts
app.use((req, res, next) => {
  res.setHeader(
    "Content-Security-Policy",
    "frame-ancestors https://s.salla.sa",
  );
  res.removeHeader("X-Frame-Options");
  next();
});
```

**Next.js (`next.config.js`):**

```js
module.exports = {
  async headers() {
    return [
      {
        source: "/salla/embedded/:path*", // the route(s) you point iframe_url at
        headers: [
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors https://s.salla.sa",
          },
        ],
      },
    ];
  },
};
```

> If you use Helmet, set `frameguard: false` and configure `contentSecurityPolicy` with the
> `frameAncestors` directive — Helmet's defaults send `X-Frame-Options: SAMEORIGIN`.

**CORS:** the iframe page calls _your_ backend (`/api/auth/session`, data endpoints). If the
frontend and backend are different origins, enable CORS (with credentials) for the frontend
origin on those routes. Same-origin (page and API under one host) needs nothing.

---

## 2. Run it locally (the dev loop)

You can't open the iframe page directly in a browser tab — it needs the dashboard handshake to get
a token. Two supported paths:

**A. Tunnel your localhost (fastest for your own code):**

1. Run your app locally (e.g. `http://localhost:3000`).
2. Expose it with a tunnel: `cloudflared tunnel --url http://localhost:3000` (or `ngrok http 3000`).
3. Point the page at the tunnel URL — update the registered page with the MCP:
   `salla_embedded_pages action=update app_id=<id> page_id=<id> iframe_url=https://<tunnel>/salla/embedded`
4. Install the app on a **Salla demo store** (Partner Portal → your app → demo store), open
   **Apps → My Apps**, and click **Run App**. Salla loads your tunnel inside the dashboard with a
   live token.
5. Re-point `iframe_url` back to production before publishing.

**B. Fork the official Test Kit (best for exploring SDK behavior first):** fork and deploy
[`SallaApp/embedded-sdk-playground`](https://github.com/SallaApp/embedded-sdk-playground), set
your `iframe_url` to the deployment, install on a demo store, and Run App. Its **Event Console**
triggers each SDK event with one click and its **Interactive Playground** runs SDK snippets live
(`window.salla.embedded`) against the dashboard — ideal for confirming toast/confirm/nav behavior
before you wire it into your own code. Point its token-verification hook
(`/server/functions/verify-token.js`) at **your** backend introspect endpoint to exercise the
full Trust-but-Verify handshake end to end.

> Source: https://docs.salla.dev/embedded-sdk/playground.md

---

## 3. Worked example — a settings page (vanilla TS)

End-to-end: init → theme/locale → `getToken()` → backend verifies (introspect) and mints a
session → `ready()` → a Save action in the dashboard navbar → toast → a guarded destructive
action with `ui.confirm`.

```ts
import { embedded } from "@salla.sa/embedded-sdk";

async function bootstrap() {
  // 1. Handshake — read layout (theme/locale/dir) from the dashboard.
  let layout;
  try {
    ({ layout } = await embedded.init({
      debug: process.env.NODE_ENV !== "production",
    }));
  } catch {
    renderOutsideSalla(); // opened outside the dashboard — stop, do not call ready().
    return;
  }

  document.documentElement.setAttribute("data-theme", layout.theme);
  document.documentElement.lang = layout.locale;
  document.documentElement.dir = layout.dir; // "rtl" for ar, "ltr" for en

  try {
    // 2. Capture the short-lived token and hand it to YOUR backend.
    const token = embedded.auth.getToken();
    if (!token) throw new Error("No token — opened outside Salla");

    // 3 + 4. Backend introspects (S-Source = App ID) and mints its own session.
    const res = await fetch("/api/auth/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ token }),
    });
    if (res.status === 401) {
      embedded.auth.refresh(); // expired → reload iframe with a fresh token; boot re-runs
      return;
    }
    if (!res.ok) throw new Error("Verification failed");

    // 5. Load this page's data, then reveal.
    await loadSettings();
    embedded.page.setTitle(layout.locale === "ar" ? "الإعدادات" : "Settings");
    embedded.ready();
  } catch (err) {
    console.error("Auth failed", err);
    embedded.destroy(); // exit gracefully instead of hanging on the loading overlay
    return;
  }

  // 6. Put the primary CTA in the dashboard navbar (not inside the iframe).
  embedded.nav.setAction({
    title: layout.locale === "ar" ? "حفظ" : "Save",
    value: "save",
    icon: "sicon-check",
  });
  const offAction = embedded.nav.onActionClick(async (value) => {
    if (value !== "save") return;
    embedded.ui.loading.show();
    try {
      await saveSettings();
      embedded.ui.toast.success(layout.locale === "ar" ? "تم الحفظ" : "Saved");
    } catch {
      embedded.ui.toast.error(
        layout.locale === "ar" ? "فشل الحفظ" : "Save failed",
      );
    } finally {
      embedded.ui.loading.hide();
    }
  });

  // 7. Guarded destructive action — confirm() resolves to { confirmed }.
  document.querySelector("#reset")?.addEventListener("click", async () => {
    const { confirmed } = await embedded.ui.confirm({
      title: layout.locale === "ar" ? "إعادة تعيين؟" : "Reset settings?",
      message:
        layout.locale === "ar" ? "لا يمكن التراجع." : "This cannot be undone.",
      confirmText: layout.locale === "ar" ? "إعادة تعيين" : "Reset",
      variant: "danger",
    });
    if (confirmed) await resetSettings();
  });

  // 8. Clean up listeners when the view tears down.
  window.addEventListener("beforeunload", () => {
    offAction();
    embedded.nav.clearAction();
  });
}

bootstrap();
```

---

## 4. Copy-paste starter

Minimal file set for a same-origin app (page + backend on one host). Adapt paths to your stack.

**`public/index.html`** — the iframe document:

```html
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>My Salla App</title>
    <link rel="stylesheet" href="/app.css" />
  </head>
  <body>
    <main id="app" class="app-page"></main>
    <button id="reset">Reset</button>
    <script type="module" src="/app.js"></script>
  </body>
</html>
```

**`src/app.ts`** — the frontend bootstrap: use the [worked example](#3-worked-example--a-settings-page-vanilla-ts) above.

**`server.ts`** — backend: serves the page with framing headers + verifies the Salla token via
introspection and mints its own session.

```ts
import express from "express";
const app = express();
app.use(express.json());

// Allow Salla to frame the page; drop deny headers.
app.use((req, res, next) => {
  res.setHeader(
    "Content-Security-Policy",
    "frame-ancestors https://s.salla.sa",
  );
  res.removeHeader("X-Frame-Options");
  next();
});

// Trust-but-Verify: introspect the Salla token, then mint YOUR session.
app.post("/api/auth/session", async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ ok: false });

  const introspect = await fetch(
    "https://api.salla.dev/exchange-authority/v1/introspect",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "S-Source": process.env.SALLA_APP_ID, // your own App ID
      },
      body: JSON.stringify({ token }),
    },
  );

  const payload = await introspect.json();
  if (!introspect.ok || !payload.success) {
    return res.status(401).json({ ok: false });
  }

  req.session.merchantId = payload.data.merchant_id;
  req.session.userId = payload.data.user_id;
  return res.json({ ok: true, merchant_id: payload.data.merchant_id });
});

app.use(express.static("public"));
app.listen(3000);
```

Full Trust-but-Verify model and security rules → [`auth-and-session.md`](auth-and-session.md).

---

## Framework notes

The vanilla flow ports directly; watch these per-framework gotchas:

| Framework        | Gotchas                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **React / Next** | `init()` is **client-only** — guard SSR (`"use client"`, or `if (typeof window === "undefined") return`). Run the handshake **once**: a top-level effect with an empty dep array, plus a ref guard so React 18 StrictMode's double-invoke doesn't init twice. Wire `nav.setAction`/`onActionClick` in an effect and call the returned unsubscribe **and** `nav.clearAction()` in its cleanup. Set CSP via `next.config.js` `headers()` (see §1), not a `<meta>` tag — `frame-ancestors` is ignored in meta. |
| **Vue**          | Init in `onMounted` (never during SSR/setup on the server). Store unsubscribe fns and call them + `nav.clearAction()` in `onUnmounted`. SPA route changes should re-`setTitle()` and reset nav actions.                                                                                                                                                                                                                                                                                                     |
| **Any SPA**      | `auth.refresh()` reloads the whole iframe, so your bootstrap re-runs from scratch — keep it idempotent. Re-apply `layout` (theme/locale/dir) on every boot.                                                                                                                                                                                                                                                                                                                                                 |

---

## Resources

| Topic                  | Link                                              |
| ---------------------- | ------------------------------------------------- |
| SDK module methods     | [`sdk-modules-guide.md`](sdk-modules-guide.md)    |
| Auth & session         | [`auth-and-session.md`](auth-and-session.md)      |
| Design tokens / RTL    | [`design-guidelines.md`](design-guidelines.md)    |
| Create / register page | https://docs.salla.dev/embedded-sdk/create-app.md |
| Playground / Test Kit  | https://docs.salla.dev/embedded-sdk/playground.md |
