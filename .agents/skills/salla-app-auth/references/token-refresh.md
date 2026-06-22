# Token Refresh — full implementation

Load this at **Step 5** of `salla-app-auth`. The SKILL.md keeps the rules and the gate; the
runnable code lives here.

Refresh tokens are single-use: each refresh returns a **new** refresh token and kills the
old one. A parallel double-use of the same refresh token makes Salla's OAuth server (per
RFC 6819 §5.2.2.3) treat it as a compromise — it invalidates the chain and the merchant
must reinstall. So every refresh must run **behind a per-merchant distributed lock** and
**persist BOTH new tokens** before releasing.

## Safe refresh (TypeScript)

Use a proven distributed-lock library (e.g. `redlock` for Redis, or a DB advisory lock) so
owner-token and atomic release are handled for you — don't hand-roll `SET NX / DEL`.

```typescript
async function refreshTokenSafe(merchantId: string): Promise<string> {
  return await withDistributedLock(`token_refresh:${merchantId}`, async () => {
    // Re-read inside the lock — another holder may have already refreshed
    const merchant = await db.merchants.findById(merchantId);
    if (merchant.tokenExpiresAt.getTime() - Date.now() > 60_000) {
      return merchant.accessToken; // already fresh
    }

    const res = await fetch("https://accounts.salla.sa/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: merchant.refreshToken,
        client_id: process.env.SALLA_CLIENT_ID!,
        client_secret: process.env.SALLA_CLIENT_SECRET!,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw Object.assign(
        new Error(err?.error_description ?? err?.error ?? res.statusText),
        { status: res.status, body: err },
      );
    }
    const data = await res.json();

    // ALWAYS save BOTH new tokens — the old refresh token is now dead
    await db.merchants.update(merchantId, {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      tokenExpiresAt: new Date(data.expires * 1000),
    });
    return data.access_token;
  });
}
```

## Proactive refresh — don't wait for a 401

```typescript
async function getValidToken(merchantId: string): Promise<string> {
  const merchant = await db.merchants.findById(merchantId);
  const bufferMs = 24 * 60 * 60 * 1000; // refresh 1 day before expiry
  if (merchant.tokenExpiresAt.getTime() - Date.now() < bufferMs) {
    return await refreshTokenSafe(merchantId);
  }
  return merchant.accessToken;
}
```

## PHP

```php
// salla/oauth2-merchant — refresh, then save BOTH tokens
$token = $provider->getAccessToken('refresh_token', ['refresh_token' => $stored]);
$newAccess  = $token->getToken();
$newRefresh = $token->getRefreshToken(); // persist this — the old one is now dead
$expiresAt  = $token->getExpires();      // Unix timestamp
```
