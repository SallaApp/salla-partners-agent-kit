# OAuth Patterns for Salla Apps

Salla uses OAuth 2.0 with two modes. Choose one at app creation — it can be changed later in App Keys.

---

## Mode Comparison

| | Easy Mode | Custom Mode |
| --- | --- | --- |
| **Authorization URL** | Salla-hosted | Your own page |
| **Token delivery** | Via `app.installed` webhook | Via your redirect URI callback |
| **Code exchange** | Handled by Salla | You do it |
| **Best for** | Most apps — simpler setup | Apps needing custom consent UI |

---

## Easy Mode Flow

```
Merchant clicks "Install" on App Store
    ↓
Salla handles OAuth consent
    ↓
Salla fires `app.installed` webhook to your URL
    ↓
Payload contains access_token + refresh_token
    ↓
Store token against merchant_id in your database
```

### app.installed payload

```json
{
  "event": "app.installed",
  "merchant": {
    "id": 12345,
    "name": "My Store",
    "email": "owner@store.sa"
  },
  "data": {
    "access_token": "eyJ...",
    "refresh_token": "eyJ...",
    "token_type": "Bearer",
    "expires_in": 3600,
    "scope": "offline_access orders.read products.read"
  }
}
```

---

## Custom Mode Flow

```
Merchant clicks "Install" → redirected to your Authorization URL
    ↓
Your app redirects to Salla with client_id + redirect_uri + scope
    ↓
Merchant approves → Salla redirects back with ?code=...
    ↓
Your server exchanges code for tokens (POST to token endpoint)
    ↓
Store access_token + refresh_token against merchant_id
```

### Authorization redirect

```
GET https://accounts.salla.sa/oauth2/auth
  ?client_id=YOUR_CLIENT_ID
  &redirect_uri=https://your-app.com/oauth/callback
  &response_type=code
  &scope=offline_access orders.read
  &state=RANDOM_STATE
```

### Code exchange

```http
POST https://accounts.salla.sa/oauth2/token
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code
&code=AUTH_CODE
&client_id=YOUR_CLIENT_ID
&client_secret=YOUR_CLIENT_SECRET
&redirect_uri=https://your-app.com/oauth/callback
```

---

## Token Refresh

Tokens expire. Use `refresh_token` before expiry:

```http
POST https://accounts.salla.sa/oauth2/token
Content-Type: application/x-www-form-urlencoded

grant_type=refresh_token
&refresh_token=REFRESH_TOKEN
&client_id=YOUR_CLIENT_ID
&client_secret=YOUR_CLIENT_SECRET
```

Response returns a new `access_token` (and sometimes a new `refresh_token` — always store the latest).

### Refresh strategy

```ts
async function getValidToken(merchantId: number): Promise<string> {
  const stored = await db.getToken(merchantId);
  const expiresAt = new Date(stored.expires_at);

  // Refresh if expiring within 5 minutes
  if (expiresAt.getTime() - Date.now() < 5 * 60 * 1000) {
    const fresh = await refreshToken(stored.refresh_token);
    await db.saveToken(merchantId, fresh);
    return fresh.access_token;
  }

  return stored.access_token;
}
```

---

## Identifying the Merchant (Token Introspect)

When a request arrives with a token you didn't issue (e.g. from an Embedded App), verify it:

```http
POST https://accounts.salla.sa/oauth2/introspect
Authorization: Bearer ACCESS_TOKEN
```

```json
{
  "active": true,
  "merchant_id": 12345,
  "store_id": 67890,
  "scope": "offline_access orders.read",
  "exp": 1710000000
}
```

If `active` is `false`, reject the request and redirect to re-auth.

---

## Scopes Reference

| Scope | Access granted |
| --- | --- |
| `offline_access` | Refresh tokens (always include) |
| `orders.read` | Read merchant orders |
| `orders.write` | Create/update orders |
| `products.read` | Read product catalog |
| `products.write` | Create/update products |
| `customers.read` | Read customer data |
| `stores.read` | Read store configuration |

Request only the minimum scopes your app needs.

---

## Resources

| Topic | Link |
| --- | --- |
| OAuth2.0 (Easy Mode & Custom Mode) | https://docs.salla.dev/doc-421118 |
| Token Introspect endpoint | https://docs.salla.dev/6394918f0.md |
