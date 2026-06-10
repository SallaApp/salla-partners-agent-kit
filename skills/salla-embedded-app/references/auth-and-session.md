# Embedded App — Authentication & Session Management

The Salla Merchant Dashboard passes a short-lived PASETO token to your iframe. Your app must verify this token **server-side** on every page load before rendering any content.

---

## Token Flow

```
Merchant opens your embedded page in the dashboard
    ↓
Salla loads your iframe URL — token is available via embedded.auth.getToken()
    ↓
Frontend sends token to YOUR backend via POST /api/verify-token
    ↓
Backend calls Salla exchange-authority introspect with S-Source header
    ↓
Introspect returns merchant_id + user_id
    ↓
Render content for that merchant
```

---

## SDK Initialization (Frontend)

```ts
import { embedded } from '@salla.sa/embedded-sdk';

async function bootstrapApp() {
  try {
    // Initialize SDK and apply layout settings from dashboard
    const { layout } = await embedded.init({
      debug: process.env.NODE_ENV !== 'production',
    });

    if (layout) {
      document.documentElement.setAttribute('data-theme', layout.theme);
      document.documentElement.setAttribute('lang', layout.locale);
      document.documentElement.setAttribute('dir', layout.locale === 'ar' ? 'rtl' : 'ltr');
    }

    // Get token and verify it server-side
    const token = embedded.auth.getToken();
    if (!token) throw new Error('Session token missing');

    const authOk = await fetch('/api/verify-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    }).then((res) => res.ok);

    if (!authOk) throw new Error('Invalid token');

    // Signal ready to the dashboard shell
    embedded.ready();
    embedded.page.setTitle(layout?.locale === 'ar' ? 'تطبيقي' : 'My App');

    // React to theme changes without reloading
    embedded.onThemeChange?.((newTheme: string) => {
      document.documentElement.setAttribute('data-theme', newTheme);
    });
  } catch (err) {
    console.error('Handshake failed', err);
    embedded.destroy();
  }
}

bootstrapApp();
```

---

## Server-Side Token Verification (Backend)

Your backend must call Salla's **exchange-authority** introspection service — not the standard OAuth introspect endpoint.

| Field | Value |
| --- | --- |
| Method | `POST` |
| URL | `https://api.salla.dev/exchange-authority/v1/introspect` |
| Header `S-Source` | Your Salla App ID |
| Header `Content-Type` | `application/json` |
| Body | `{ "token": "em_tok_..." }` |

```ts
interface IntrospectResponse {
  status: number;
  success: boolean;
  data: {
    merchant_id: number;
    user_id: number;
    exp: string; // ISO datetime
  };
}

async function verifyEmbeddedToken(token: string, appId: string): Promise<IntrospectResponse> {
  const res = await fetch('https://api.salla.dev/exchange-authority/v1/introspect', {
    method: 'POST',
    headers: {
      'S-Source': appId,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ token }),
  });

  if (!res.ok) throw new Error('Introspect request failed');
  return res.json();
}

// Express endpoint called by your frontend
app.post('/api/verify-token', async (req, res) => {
  const { token } = req.body;
  try {
    const result = await verifyEmbeddedToken(token, process.env.SALLA_APP_ID!);
    if (!result.success) return res.status(401).json({ ok: false });

    const { merchant_id, user_id } = result.data;
    // associate merchant_id with the session
    req.session.merchantId = merchant_id;
    res.json({ ok: true, merchant_id, user_id });
  } catch {
    res.status(401).json({ ok: false });
  }
});
```

---

## Token Refresh

Embedded tokens are short-lived (~5 minutes). When your API returns `401`, trigger a refresh:

```ts
// In your API client error handler
if (response.status === 401) {
  embedded.auth.refresh();
  // Salla re-renders the iframe with a fresh token, triggering bootstrapApp() again
}
```

`embedded.auth.refresh()` posts a message to the dashboard shell. The iframe reloads with a new token in the URL — your `bootstrapApp()` function runs again automatically.

---

## Calling the Salla API (from your backend)

After verifying the token, your backend can call the Salla Admin API using the merchant's OAuth access token (stored during `app.store.authorize`):

```ts
async function fetchOrders(merchantId: number) {
  const token = await db.getAccessToken(merchantId); // stored at install
  const res = await fetch('https://api.salla.dev/admin/v2/orders', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const { data } = await res.json();
  return data;
}
```

---

## Security Rules

- **Always verify server-side** — never trust the token on the frontend alone
- **Use exchange-authority** — do not call `/oauth2/introspect`; it is the wrong endpoint for embedded tokens
- **Never store the token in localStorage** — keep it in memory or a secure session
- **Call `embedded.auth.refresh()` on 401** — do not retry with the stale token

---

## Resources

| Topic | Link |
| --- | --- |
| Authentication guide | https://docs.salla.dev/1919160 |
| Exchange-authority introspect | https://api.salla.dev/exchange-authority/v1/introspect |
| Auth Module reference | https://docs.salla.dev/embedded-sdk/modules/auth.md |
