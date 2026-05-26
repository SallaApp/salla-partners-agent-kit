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
