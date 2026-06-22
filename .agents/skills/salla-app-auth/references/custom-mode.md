# Custom Mode — authorization-code flow (dev / testing only)

Load this at **Step 3** of `salla-app-auth` when you genuinely need Custom Mode. Published
apps should default to **Easy Mode** (tokens arrive in the `app.store.authorize` webhook,
no callback) — shipping Custom Mode without a justified use case can be rejected at review.

## Step 3a — Authorization request

```http
GET https://accounts.salla.sa/oauth2/auth
  ?client_id=YOUR_CLIENT_ID
  &response_type=code
  &redirect_uri=https://your-app.com/callback
  &scope=offline_access orders.read_write products.read_write
  &state=RANDOM_CSRF_STRING
```

Standard OAuth2 parameters — the Salla deltas: `redirect_uri` must exactly match the
Portal registration, and `scope` must always include `offline_access`.

## Step 3b — Handle the callback

`GET /callback?code=…&state=…` — verify `state`, extract `code`.

> **Custom Mode callback rules — all are required:**
>
> - **Salla-initiated install ≠ app-initiated OAuth.** When the merchant installs from the App
>   Store, Salla redirects **straight to your callback** with **its own `state`** — your app
>   never ran the authorize step and never set a `state` cookie. Do NOT reject the request for
>   a missing/mismatched cookie in that flow. (Easy Mode avoids this entirely — no callback.)
> - **Salla strips hyphens from `state`** when echoing it back. If you use a UUID, compare
>   hyphen-insensitively (or don't put hyphens in `state`).
> - **Next.js cookie-in-redirect trap:** `redirect()` from `next/navigation` drops cookies set
>   via `cookies().set()` in a GET handler. Set the cookie on the response you return:
>   `const res = NextResponse.redirect(url); res.cookies.set(...); return res;`.
> - **`invalid_grant` on retry:** authorization `code`s are **single-use**. Re-visiting a used
>   callback URL (refresh, back button) always fails — start a fresh install, don't retry the
>   same code.

## Step 3c — Exchange code for tokens

```bash
POST https://accounts.salla.sa/oauth2/token
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code
&code=AUTHORIZATION_CODE
&client_id=YOUR_CLIENT_ID
&client_secret=YOUR_CLIENT_SECRET
&redirect_uri=https://your-app.com/callback
```

```json
{
  "token_type": "bearer",
  "access_token": "KGsnBcNN...",
  "expires": 1634819484,
  "refresh_token": "fWcceFWF...",
  "scope": "offline_access orders.read_write"
}
```

PHP — `oauth2-merchant`:

```php
use Salla\OAuth2\Client\Provider\Salla;

$provider = new Salla([
    'clientId'     => env('SALLA_OAUTH_CLIENT_ID'),
    'clientSecret' => env('SALLA_OAUTH_CLIENT_SECRET'),
    'redirectUrl'  => 'https://your-app.com/callback',
]);

if (empty($_GET['code'])) {
    $authUrl = $provider->getAuthorizationUrl(['scope' => 'offline_access']);
    header('Location: ' . $authUrl);
    exit;
}

$token = $provider->getAccessToken('authorization_code', ['code' => $_GET['code']]);
$accessToken  = $token->getToken();
$refreshToken = $token->getRefreshToken();
$expires      = $token->getExpires(); // Unix timestamp
$user = $provider->getResourceOwner($token); // ->getId(), ->getStoreID(), …
```

Laravel facade + full controller:
https://github.com/SallaApp/laravel-starter-kit/blob/master/app/Http/Controllers/OAuthController.php
