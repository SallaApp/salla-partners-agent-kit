# App Settings — Usage Patterns

Common patterns for reading, writing, and validating App Settings across different integration points.

---

## Reading Settings in an App Function

```ts
export default async (context: AppContext): Promise<Resp> => {
  const apiKey = context.settings?.api_key;
  const sandbox = context.settings?.sandbox_mode;
  const webhookUrl = context.settings?.webhook_url;

  if (!apiKey) {
    return Resp.error()
      .setMessage(
        "App not configured — merchant must enter API key in settings",
      )
      .setStatus(400);
  }

  // use apiKey to call your carrier/service
  return Resp.success().setData({});
};
```

Always use optional chaining (`settings?.key`) — settings may be undefined until the merchant fills the form.

---

## Fetching Settings Server-Side (GET)

Useful when your backend needs to read a merchant's settings outside of an App Function (e.g. from your own webhook handler):

```ts
async function getMerchantSettings(appId: number, accessToken: string) {
  const res = await fetch(
    `https://api.salla.dev/admin/v2/apps/${appId}/settings`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  const { data } = await res.json();
  return data.settings; // { api_key, sandbox_mode, ... }
}
```

---

## Writing Settings on Install (POST)

After the merchant authorizes your app (`app.store.authorize` webhook), set default settings immediately:

```ts
async function onAppAuthorize(payload: AppAuthorizePayload) {
  const { merchant, data } = payload; // payload has NO app_id field
  const token = data.access_token;
  const appId = process.env.SALLA_APP_ID; // your app id comes from your own config

  await fetch(`https://api.salla.dev/admin/v2/apps/${appId}/settings`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      api_key: "", // empty — merchant must fill via settings form
      sandbox_mode: true, // default to sandbox for safety
      environment: "staging",
      webhook_url: null,
    }),
  });
}
```

> **Always include every key**, even if the value is empty or null.

---

## Updating a Single Setting

There is no partial update. To change one value, read all first, then write all:

```ts
async function setSandboxMode(appId: number, token: string, enabled: boolean) {
  const current = await getMerchantSettings(appId, token);

  await fetch(`https://api.salla.dev/admin/v2/apps/${appId}/settings`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ...current, sandbox_mode: enabled }),
  });
}
```

---

## Validating Settings Signature

Settings validation requests from Salla carry the HMAC signature in `Authorization: Bearer <hex-sig>` — note this DIFFERS from webhook Signature verification, which uses the `X-Salla-Signature` header (see salla-webhooks). Always read the **raw body** before parsing:

```ts
async function verifySignature(
  rawBody: string,
  authHeader: string,
  secret: string,
): Promise<boolean> {
  const sig = authHeader.replace("Bearer ", "");

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );

  function hexToBytes(hex: string): Uint8Array {
    const arr = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2)
      arr[i / 2] = parseInt(hex.slice(i, i + 2), 16);
    return arr;
  }

  return crypto.subtle.verify(
    "HMAC",
    key,
    hexToBytes(sig),
    new TextEncoder().encode(rawBody),
  );
}

// Express handler — must use raw body middleware
app.post(
  "/settings/validate",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const rawBody = req.body.toString();
    const authHeader = (req.headers["authorization"] as string) ?? "";

    const valid = await verifySignature(
      rawBody,
      authHeader,
      process.env.WEBHOOK_SECRET!,
    );
    if (!valid) return res.status(401).json({ success: false });

    const { settings } = JSON.parse(rawBody);
    if (!settings.api_key) {
      return res.json({
        success: false,
        error: {
          field: "api_key",
          message: { en: "API key is required", ar: "مفتاح API مطلوب" },
        },
      });
    }

    res.json({ success: true });
  },
);
```

---

## Settings in the App Lifecycle

| Lifecycle event        | Settings action                                                            |
| ---------------------- | -------------------------------------------------------------------------- |
| `app.store.authorize`  | POST defaults for all keys                                                 |
| `app.updated`          | Re-POST if your schema changed (add new keys with defaults)                |
| `app.settings.updated` | Merchant saved the form — this event **activates the app**; re-read values |
| `app.uninstalled`      | No action needed — Salla clears settings automatically                     |
| Merchant edits form    | Salla calls your Validation URL → on success, Salla calls POST             |
