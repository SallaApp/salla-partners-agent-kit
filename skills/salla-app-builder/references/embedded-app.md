# Embedded App

Embedded apps render in an iframe inside the Salla merchant dashboard.

---

## 1. SDK Installation

You can install the SDK using NPM:

```bash
npm install @salla.sa/embedded-sdk
```

Or reference the UMD build via CDN (places the SDK globally on `window.SallaEmbedded`):

```html
<script src="https://unpkg.com/@salla.sa/embedded-sdk/dist/umd/index.js"></script>
```

---

## 2. Frontend Initialization and Handshake

An embedded page must synchronize themes, languages, and verify the authorization token with the backend before signaling readiness to the Salla dashboard.

```typescript
import { embedded } from "@salla.sa/embedded-sdk";

async function bootstrapApp() {
  try {
    // 1. Initialize the SDK and await the handshake context from the parent frame
    const { layout } = await embedded.init({ debug: process.env.NODE_ENV !== "production" });

    // Apply layout preferences (language, theme, RTL dir) immediately
    if (layout) {
      document.documentElement.setAttribute("data-theme", layout.theme);
      document.documentElement.setAttribute("lang", layout.locale);
      document.documentElement.setAttribute("dir", layout.locale === "ar" ? "rtl" : "ltr");
    }

    // 2. Retrieve the short-lived session token (PASETO)
    const token = embedded.auth.getToken();
    if (!token) throw new Error("Unauthorized: Session token missing");

    // 3. Verify the token with your backend (Server-Side verification)
    const authSuccess = await fetch("/api/verify-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    }).then((res) => res.ok);

    if (!authSuccess) throw new Error("Unauthorized: Invalid token");

    // 4. Signal readiness to Salla Dashboard to remove the initial loading spinner
    embedded.ready();

    // 5. Configure page parameters using native components (No-Chrome rule)
    embedded.page.setTitle(layout?.locale === "ar" ? "واتساب دايركت" : "WhatsApp Direct");

    // Listen to theme or lang changes dynamically
    embedded.onThemeChange?.((newTheme: string) => {
      document.documentElement.setAttribute("data-theme", newTheme);
    });

  } catch (err) {
    console.error("SDK Handshake failed", err);
    embedded.destroy(); // Gracefully exit the embedded view or display fallback UI
  }
}
```

---

## 3. Server-Side Token Verification

Your backend must verify the short-lived PASETO token by calling Salla's official token introspection service. Do not trust the token payload without verification.

### Endpoint Details
*   **Method**: `POST`
*   **URL**: `https://api.salla.dev/exchange-authority/v1/introspect`
*   **Headers**:
    *   `S-Source`: `YOUR_SALLA_APP_ID` (Your unique Salla Application ID)
    *   `Content-Type`: `application/json`
*   **Request Body**:
    ```json
    {
      "token": "em_tok_..."
    }
    ```

### Expected Response
```json
{
  "status": 200,
  "success": true,
  "data": {
    "merchant_id": 123456789,
    "user_id": 987654321,
    "exp": "2026-05-28T00:13:03Z"
  }
}
```
*   Use `data.merchant_id` to look up or associate the merchant context in your database.

---

## 4. Design Guidelines and the "No-Chrome" Rule

Embedded apps must visually blend seamlessly with the Salla dashboard to feel native.

### The "No-Chrome" Rule
Do **not** render your own:
*   Header titles or app bars
*   Navigation tabs, sidebars, or menus
*   Footers or settings save headers

Delegate these to Salla's native UI:
*   **Title**: Set it via `embedded.page.setTitle("My Title")`.
*   **Action Button**: Place main navbar actions (e.g. Save, Connect) via `embedded.nav.setAction({ title: "Save", value: "save" })`.
*   **Toasts**: Trigger native alert banners using `embedded.ui.toast.success("Done!")` or `embedded.ui.toast.error("Error")`.
*   **Loading**: Toggle dashboard loading progress using `embedded.ui.loading.show()` and `embedded.ui.loading.hide()`.

### Salla Brand Design Tokens (CSS Variables)
Use Salla's standard palette to style your iframe components:

```css
:root {
  --color-primary: #004d5b;       /* HSL: 189 100% 17% */
  --color-secondary: #73fcd7;     /* HSL: 163 100% 82% */
  --color-success: #00b259;       /* HSL: 157 100% 34% */
  --color-danger: #f5434a;        /* HSL: 358 89% 64% */
  --color-bg-main: #f8f8f8;       /* HSL: 0 0% 97% */
  --font-main: "Outfit", sans-serif;
}
```

---

## 5. Token Expiration and Session Refreshing

Dashboard session tokens are short-lived (usually expiring in 5 minutes). If your API routes return a `401 Unauthorized` status code due to an expired token, trigger a refresh:

```typescript
// On API 401 response:
embedded.auth.refresh();
```

*   `embedded.auth.refresh()` posts a message to Salla to obtain a new token. Salla will re-render the iframe with a fresh token in the URL params, triggering your page to bootstrap again.
