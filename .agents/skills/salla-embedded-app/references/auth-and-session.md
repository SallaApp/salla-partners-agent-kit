# Embedded App — Authentication & Session Management

Salla embedded apps authenticate with a **Trust-but-Verify** model. When a merchant opens your
app, Salla passes a **short-lived session token** through the iframe URL. Your frontend captures
it and hands it to **your backend**, which **verifies it with Salla's Introspection API** and
then mints its own session. The frontend never makes authorization decisions — it is a courier.

> Source: https://docs.salla.dev/embedded-sdk/authentication.md

---

## The authentication flow

```text
Merchant opens your embedded page in the dashboard
    ↓
1. App  → Dashboard:  await embedded.init()          (postMessage bridge)
   Dashboard → App:   layout (theme, locale, dir, …)
    ↓
2. App:  const token = embedded.auth.getToken()      (short-lived token from the URL)
    ↓
3. App  → Your Backend:  POST /api/auth/session { token }
    ↓
4. Backend → Salla:  POST /exchange-authority/v1/introspect
                     header  S-Source: <YOUR_APP_ID>
                     body    { "token": "..." }
   Salla → Backend:  { merchant_id, user_id, exp }
   Backend mints its own session (JWT / secure cookie)
    ↓
5. App:  embedded.ready()   (only after backend confirms AND data is loaded)
       └─ on failure: embedded.destroy()
```

The frontend gathers context and hands it to the server. **Do not** perform business logic based
on an unverified frontend token.

---

## Frontend (the courier)

```ts
import { embedded } from "@salla.sa/embedded-sdk";

async function bootstrapApp() {
  // 1. Establish the bridge and read layout.
  const { layout } = await embedded.init({
    debug: process.env.NODE_ENV !== "production",
  });

  if (layout) {
    document.documentElement.setAttribute("data-theme", layout.theme);
    document.documentElement.setAttribute("lang", layout.locale);
    document.documentElement.setAttribute("dir", layout.dir);
  }

  try {
    // 2. Capture the short-lived token from the URL.
    const token = embedded.auth.getToken();
    if (!token) throw new Error("Opened outside Salla — no token in URL");

    // 3. Send it to YOUR backend; do NOT make authz decisions on the frontend.
    const res = await fetch("/api/auth/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ token }),
    });
    if (!res.ok) throw new Error("Backend verification failed");

    // 5. Backend confirmed + data loaded → reveal.
    await loadDashboardData();
    embedded.ready();
    embedded.page.setTitle(layout?.locale === "ar" ? "تطبيقي" : "My App");
  } catch (err) {
    console.error("Auth failed", err);
    // On an expired token, prefer refresh (see below); otherwise exit gracefully.
    embedded.destroy();
  }
}

bootstrapApp();
```

`embedded.auth.getToken()` returns `string | null` — always handle the `null` case (app opened
outside the Salla dashboard).

---

## Backend verification (the source of truth)

Your backend verifies the token via Salla's Introspection API. This proves the request is
genuine and identifies the merchant and user. Then it mints **its own** session — the Salla
token is used **only** to bootstrap that session, never stored as a long-lived credential.

**Method:** `POST`
**URL:** `https://api.salla.dev/exchange-authority/v1/introspect`
**Header:** `S-Source: <YOUR_APP_ID>` (your own App ID)
**Body:** `{ "token": "em_tok_..." }`

**Successful response:**

```json
{
  "status": 200,
  "success": true,
  "data": {
    "merchant_id": 123456,
    "user_id": 987654,
    "exp": "2026-01-19T12:00:00Z"
  }
}
```

**Failure (`401`):**

```json
{
  "status": 401,
  "success": false,
  "error": { "message": "Decryption failed", "code": 0 }
}
```

> Full OpenAPI for the endpoint: https://docs.salla.dev/27474794e0.md

```ts
// POST /api/auth/session — verify the Salla token, then mint YOUR session.
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

  const { merchant_id, user_id } = payload.data;

  // Mint YOUR session (short-lived Salla token is now done its job).
  req.session.merchantId = merchant_id;
  req.session.userId = user_id;

  return res.json({ ok: true, merchant_id });
});
```

### Validate the `S-Source` header

Always send your unique **App ID** in `S-Source`. This scopes introspection to your identity and
prevents another app from verifying tokens against you. Keep your App ID server-side
(`process.env.SALLA_APP_ID`) — never accept it from the request.

---

## Client Introspect (`embedded.auth.introspect()`) — DEV / DEBUG ONLY

The SDK exposes a frontend introspect helper for **local development and debugging only**. The
docs are explicit: it "should not be used as a primary authentication method," and **never** make
final authentication decisions on the frontend. Use the backend introspect above for production.

```ts
// DEV/DEBUG ONLY — inspect a token's details from the client during development.
const result = await embedded.auth.introspect();
if (result.isVerified) {
  console.log("Token valid for user:", result.data.user_id);
}
```

`introspect(options?)` accepts optional `{ appId, token, refreshOnError }` (all auto-extracted
from the URL by default) and resolves to `{ isVerified, isError, data }` where `data` holds
`merchant_id`, `user_id`, `exp`. See [`sdk-modules-guide.md`](sdk-modules-guide.md) for the full
signature.

---

## Handling token expiration (401 → refresh)

The Salla token is short-lived by design. When your backend returns `401` (or otherwise reports
the session expired), trigger the refresh flow:

```text
App → Backend:  API request (session expired)
Backend → App:  401 Unauthorized
App → Host:     embedded.auth.refresh()
Host → App:     reload iframe with a fresh token
                → bootstrapApp() runs again, restarting the auth flow
```

```ts
// Backend reported the token expired:
embedded.auth.refresh();
// Salla re-renders the iframe with a fresh token in the URL; bootstrapApp() re-runs.
```

`refresh()` returns `void` and posts a message to the host. **Avoid loops:** don't call
`refresh()` repeatedly if the token stays invalid for a different reason; consider a brief
loading hint before the reload.

---

## Calling the Salla Admin API (from your backend)

Introspection is for **authenticating the embedded session**, not for calling the Admin API. To
call the Salla Admin API on behalf of the merchant, use the merchant's **OAuth access token**
stored at install (`app.store.authorize`). Always scope the query to the `merchant_id` your
introspection returned — never a client-supplied id.

```ts
async function fetchOrders(req: Request) {
  const merchantId = req.session.merchantId; // set by introspection, not by the client
  if (!merchantId) throw new Error("Unauthenticated");
  const accessToken = await db.getAccessToken(merchantId); // stored at install
  const res = await fetch("https://api.salla.dev/admin/v2/orders", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const { data } = await res.json();
  return data;
}
```

OAuth token storage, single-use refresh tokens, and the per-merchant refresh lock →
`salla-app-auth`. Admin API request/error patterns → `salla-api-core`.

---

## Security rules

- **Trust-but-Verify** — the frontend captures the token and forwards it; the **backend**
  verifies it (introspect) and decides authorization. Never authorize on the frontend.
- **Validate `S-Source`** — always send your own App ID; keep it server-side.
- **`embedded.auth.introspect()` is dev-only** — never a primary auth method.
- **Short-lived token** — used only to mint your session; `embedded.auth.refresh()` on
  401/expiry; `embedded.destroy()` on unrecoverable failure (don't hang the loading overlay).
- **Scope every query** to the session `merchant_id` from introspection — never trust
  client-supplied input.

---

## Resources

| Topic                  | Link                                                  |
| ---------------------- | ----------------------------------------------------- |
| Authentication guide   | https://docs.salla.dev/embedded-sdk/authentication.md |
| Token Introspect (API) | https://docs.salla.dev/27474794e0.md                  |
| Get Token (auth)       | https://docs.salla.dev/embedded-sdk/modules/auth.md   |
