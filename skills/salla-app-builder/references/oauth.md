# OAuth — Easy Mode

Docs: https://docs.salla.dev/doc-421118

Salla supports two OAuth modes. Easy Mode is the default and requires no callback URL:

- Merchant installs → Salla fires `app.store.authorize` webhook with the token in the event body
- Token is in `event.data.access_token` and `event.data.refresh_token`
- Store these; use the access token for all subsequent Salla API calls for that merchant
- The same event fires on token refresh — your handler serves as both install and refresh receiver

You do NOT implement an `/oauth/callback` endpoint in Easy Mode.

## Token lifetimes

| Token         | Lifetime | Notes                                                               |
| ------------- | -------- | ------------------------------------------------------------------- |
| Access token  | 14 days  | Standard Bearer token for API calls                                 |
| Refresh token | 1 month  | Single-use — reusing it locks out the merchant and forces reinstall |

Never call the token refresh endpoint concurrently. If a refresh token is used more than once,
Salla invalidates all tokens and the merchant must reinstall the app (RFC 6819 §5.2.2.3).

## Key endpoints

| Purpose                | URL                                          |
| ---------------------- | -------------------------------------------- |
| Authorization          | `https://accounts.salla.sa/oauth2/auth`      |
| Token exchange         | `https://accounts.salla.sa/oauth2/token`     |
| User info / introspect | `https://accounts.salla.sa/oauth2/user/info` |

## `app.store.authorize` event

Fired on install and on token refresh. Handle it to store the latest tokens.
App Events reference: https://docs.salla.dev/doc-421413

### Webhook Handling Example

Since Salla delivers credentials directly via the webhook in Easy Mode, you must implement a handler to receive and persist them:

```typescript
// POST /webhooks/oauth handler
async function handleAuthorizeWebhook(req: Request) {
  // 1. Verify signature (see verification logic in webhooks.md)
  const isValid = await verifyWebhook(req, process.env.SALLA_WEBHOOK_SECRET!);
  if (!isValid) return new Response("Unauthorized", { status: 401 });

  const payload = await req.json();

  // 2. Intercept the authorization event
  if (payload.event === "app.store.authorize") {
    const merchantId = payload.merchant;
    const { access_token, refresh_token } = payload.data;

    // 3. Persist the tokens securely
    await saveMerchantTokens(merchantId, {
      accessToken: access_token,
      refreshToken: refresh_token,
      updatedAt: new Date(),
    });
  }

  return new Response("OK", { status: 200 });
}
```
