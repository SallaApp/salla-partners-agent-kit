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

> **Custom Mode callback rules:**
>
> - **Deploy the callback route before registering `redirect_url`.** Implement and serve the
>   callback, hit the exact URL you will register, and confirm it responds (not 404); register
>   it only after that. A 404 (route not deployed, wrong path, typo) breaks the merchant's
>   install — blank page, lost install, no tokens.
> - **Accept Salla-initiated installs.** When the merchant installs from the App Store, Salla
>   redirects straight to your callback with **its own `state`** — your app never ran the
>   authorize step and set no `state` cookie. Treat a request with no matching cookie as a
>   valid Salla-initiated install and proceed with the code exchange. (Easy Mode skips this —
>   no callback.)
> - **Compare `state` hyphen-insensitively.** Salla strips hyphens from `state` when echoing
>   it back, so a UUID `state` must be matched with hyphens removed (or omit hyphens entirely).
> - **Next.js — set cookies on the returned response.** `redirect()` from `next/navigation`
>   drops cookies set via `cookies().set()` in a GET handler; instead use
>   `const res = NextResponse.redirect(url); res.cookies.set(...); return res;`.
> - **Exchange each `code` once.** Authorization `code`s are single-use; a refresh or back
>   button re-hits a spent code and returns `invalid_grant` — start a fresh install rather than
>   replaying the same code.

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
