# Embedded App — Authentication & Session Management

Embedded apps use **two independent sessions**, and it is critical not to conflate them:

1. **The SDK session token** — short-lived (**5 minutes**), issued by the dashboard to the
   iframe. The SDK verifies it **client-side** and **auto-logs-in** the user (trusted **UX
   only** — you don't build this). It is **not** an authorization signal: never
   introspect/validate it on the frontend, and never send it to your server to "verify" it.
   The frontend is never trusted for authz.
2. **Your app's own user session** — your backend runs its **own OAuth** for its own user
   inside the iframe and maintains that session with cookies / server sessions / localStorage,
   exactly like any web app. This is where validation/authorization lives and what authorizes
   your API calls.

Every embedded page is still authorized — but on the **backend**, via **your app's own OAuth
session**, never via the frontend and never via a verify of the SDK token.

---

## Two-session model

```text
Merchant opens your embedded page in the dashboard
    ↓
Salla loads your iframe URL with a short-lived (5 min) SDK token
    ↓
embedded.init() runs the handshake; the SDK auto-logs-in the user CLIENT-SIDE (UX only)
    ↓
Your backend validates and checks ITS OWN session (cookie / server session / localStorage)
    ↓
   ├─ session present  → render the page
   └─ no session yet   → run YOUR OWN OAuth, establish your session, then render
```

The SDK auto-login gets the user into your iframe; **your own backend OAuth session** is what
validates them and authorizes your backend. The frontend is never trusted for authz.

---

## SDK Initialization (Frontend)

```ts
import { embedded } from "@salla.sa/embedded-sdk";

async function bootstrapApp() {
  try {
    // Initialize SDK and apply layout settings from dashboard.
    // The SDK verifies the short-lived token client-side (trusted) and logs the user in.
    const { layout } = await embedded.init({
      debug: process.env.NODE_ENV !== "production",
    });

    if (layout) {
      document.documentElement.setAttribute("data-theme", layout.theme);
      document.documentElement.setAttribute("lang", layout.locale);
      document.documentElement.setAttribute(
        "dir",
        layout.locale === "ar" ? "rtl" : "ltr",
      );
    }

    // Ensure YOUR OWN app session exists (your own OAuth). The SDK token is NOT
    // sent to the backend to be "verified" — it is trusted client-side.
    const hasSession = await fetch("/api/session", {
      method: "GET",
      credentials: "include",
    }).then((res) => res.ok);

    if (!hasSession) {
      // No app session yet → start YOUR OWN OAuth inside the iframe, then re-run boot.
      await startAppOAuth();
      return;
    }

    // Signal ready to the dashboard shell
    embedded.ready();
    embedded.page.setTitle(layout?.locale === "ar" ? "تطبيقي" : "My App");
  } catch (err) {
    console.error("Handshake failed", err);
    // Render an error/"open inside Salla" state; on an expired SDK token call
    // embedded.auth.refresh().
  }
}

bootstrapApp();
```

---

## Your app's own session (Backend)

Authorization lives here. Your backend does **not** introspect or verify the SDK token (and the
frontend must not either). Instead it maintains its own authenticated user session — established
by **your own OAuth** — using cookies / server sessions / localStorage, the same as any web app
rendered in an iframe, and authorizes every request against that session.

```ts
// Your app's session check — keyed off YOUR cookie/session, not the SDK token.
app.get("/api/session", (req, res) => {
  if (req.session?.merchantId) {
    return res.json({ ok: true, merchant_id: req.session.merchantId });
  }
  return res.status(401).json({ ok: false });
});

// Your own OAuth flow establishes the session (see salla-app-auth for token storage,
// refresh, and the per-merchant refresh lock).
app.get("/api/oauth/callback", async (req, res) => {
  const merchantId = await completeAppOAuth(req.query); // your OAuth implementation
  req.session.merchantId = merchantId; // your own session, your own cookie
  res.redirect("/"); // back into the iframe, now with an app session
});
```

> Where this OAuth comes from: the merchant authorizes your app on install
> (`app.store.authorize`), and you store the access/refresh tokens then. The embedded page
> establishes its own user session on top of that. Token storage, single-use refresh tokens,
> and the per-merchant refresh lock all live in `salla-app-auth`.

---

## SDK Token Refresh

The SDK token is short-lived — **5 minutes**. When the SDK reports the token is stale, refresh
it; this is independent of your app session:

```ts
embedded.auth.refresh();
// Salla re-renders the iframe with a fresh SDK token, triggering bootstrapApp() again.
```

`embedded.auth.refresh()` posts a message to the dashboard shell. The iframe reloads with a new
token in the URL — your `bootstrapApp()` runs again automatically and re-checks your app session.

---

## Calling the Salla API (from your backend)

Once your app session is established, your backend calls the Salla Admin API using the merchant's
OAuth access token (stored during `app.store.authorize`). The SDK session token is **not** an
Admin API credential. Storing/refreshing the OAuth access token (and the single-use refresh
token plus the per-merchant refresh lock) is `salla-app-auth`; Admin API request/error/auth
patterns are `salla-api-core`. Always scope the query to **your authenticated** session
merchant, never a client-supplied id:

```ts
// Take the merchant from YOUR verified app session, never from a request/body param.
async function fetchOrders(req: Request) {
  const merchantId = req.session.merchantId; // set by YOUR OAuth, not the SDK token
  if (!merchantId) throw new Error("Unauthenticated");
  const token = await db.getAccessToken(merchantId); // stored at install
  const res = await fetch("https://api.salla.dev/admin/v2/orders", {
    headers: { Authorization: `Bearer ${token}` },
  });
  const { data } = await res.json();
  return data;
}
```

---

## Security Rules

- **SDK auto-login is client-side and UX only** — the SDK verifies the token in the iframe and
  auto-logs-in the user, but the frontend is **never** trusted for authz. Do **not**
  introspect/validate the SDK token on the frontend, and do **not** send it to your backend to
  "verify" it.
- **Validate/authorize on the backend via your own OAuth** — every embedded page is authorized
  by your app's own backend session (cookie/server session/localStorage), not via the SDK token
  and never on the frontend.
- **The SDK token is short-lived (5 min)** — call `embedded.auth.refresh()` when it expires; it
  is bootstrap-only, not an API credential.
- **Scope every query to your authenticated session merchant** — never derive the merchant from
  client-supplied input.

---

## Resources

| Topic                 | Link                                                          |
| --------------------- | ------------------------------------------------------------- |
| Authentication guide  | https://docs.salla.dev/embedded-sdk/authentication.md         |
| Auth Module reference | https://docs.salla.dev/embedded-sdk/modules/auth/get-token.md |
