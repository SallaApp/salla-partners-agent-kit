# Embedded App — Authentication & Session Management

The Salla Merchant Dashboard passes a short-lived token to your iframe via query parameters. Your app must verify this token on every page load before rendering any content.

---

## Token Flow

```
Merchant opens your embedded page in the dashboard
    ↓
Salla loads your iframe URL with query params:
  ?token=ACCESS_TOKEN&lang=ar&theme=light&store_id=67890
    ↓
Your app reads params and calls Token Introspect
    ↓
Introspect returns merchant identity (active, merchant_id, store_id, scope)
    ↓
Render content for that merchant
```

---

## Reading Query Parameters

```ts
const params = new URLSearchParams(window.location.search);

const token    = params.get('token')    ?? '';
const lang     = params.get('lang')     ?? 'ar';   // 'ar' | 'en'
const theme    = params.get('theme')    ?? 'light'; // 'light' | 'dark'
const storeId  = params.get('store_id') ?? '';
```

---

## Token Introspection

Call the introspect endpoint before rendering any merchant-specific content:

```ts
interface IntrospectResponse {
  active: boolean;
  merchant_id: number;
  store_id: number;
  scope: string;
  exp: number; // unix timestamp
}

async function introspectToken(token: string): Promise<IntrospectResponse> {
  const res = await fetch('https://accounts.salla.sa/oauth2/introspect', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) throw new Error('Introspect failed');
  return res.json();
}

// On page load
const session = await introspectToken(token);

if (!session.active) {
  // Token expired or invalid — request a fresh one
  const freshToken = await Salla.auth.refreshToken();
  // retry introspect with freshToken
}
```

---

## Full Page Initialization Pattern

```ts
import Salla from '@salla.sa/embedded-sdk';

async function initApp() {
  // 1. Initialize SDK
  await Salla.init();

  // 2. Read params
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token') ?? '';
  const lang  = params.get('lang') ?? 'ar';
  const theme = params.get('theme') ?? 'light';

  // 3. Apply theme and locale
  document.documentElement.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
  document.documentElement.setAttribute('lang', lang);
  document.documentElement.setAttribute('data-theme', theme);

  // 4. Verify token
  let session;
  try {
    session = await introspectToken(token);
    if (!session.active) throw new Error('inactive');
  } catch {
    // Refresh and retry once
    const fresh = await Salla.auth.refreshToken();
    session = await introspectToken(fresh);
    if (!session.active) {
      showError('Session expired. Please reopen the app.');
      return;
    }
  }

  // 5. Load merchant-specific data
  await loadMerchantData(session.merchant_id, token);

  // 6. Render app
  renderApp(session);

  // 7. Resize iframe to content
  Salla.page.resize();
}

initApp();
```

---

## Token Refresh Strategy

```ts
// Register a refresh handler on SDK init — fires automatically before expiry
Salla.auth.onTokenRefresh(async (newToken) => {
  // Update your API client or store the new token
  currentToken = newToken;
  apiClient.defaults.headers.Authorization = `Bearer ${newToken}`;
});
```

---

## Using the Token for API Calls

After introspect, use the token to call the Salla Admin API on behalf of the merchant:

```ts
async function fetchOrders(token: string, merchantId: number) {
  const res = await fetch('https://api.salla.dev/admin/v2/orders', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const { data } = await res.json();
  return data;
}
```

---

## Security Rules

- **Always introspect on page load** — never trust the token without server-side verification
- **Never expose the token in localStorage** — keep it in memory only
- **Check `exp`** — if token expires within 60 seconds, proactively refresh
- **Verify scope** — check that `session.scope` includes the permissions your page needs before rendering sensitive features

---

## Resources

| Topic | Link |
| --- | --- |
| Authentication guide | https://docs.salla.dev/1919160 |
| Token Introspect endpoint | https://docs.salla.dev/6394918f0.md |
| Auth Module reference | https://docs.salla.dev/embedded-sdk/modules/auth.md |
