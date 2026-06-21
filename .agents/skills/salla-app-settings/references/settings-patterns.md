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
  if (!res.ok) {
    // 401 → refresh the token (see salla-app-auth); 403/404 → app not installed,
    // missing scope, or inactive. Handle, don't return malformed data.
    throw new Error(`settings GET failed: ${res.status}`);
  }
  const { data } = await res.json();
  return data.settings; // { api_key, sandbox_mode, ... }
}
```

> **Never log the returned object** — it can contain API keys or passwords. Store
> secret-typed values encrypted, and never expose them client-side.

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

## Validating Settings (public Validation URL)

The Validation URL is a **public, signature-free** endpoint Salla POSTs to **before
saving**. There is no `Authorization` header or signature to verify — it exists only so you
can accept or reject the proposed values. It is **not** a storage hook: persist settings
from the `app.settings.updated` webhook (the storage source of truth — see
[docs](https://docs.salla.dev/421413m0.md)), not here.

```ts
// Express handler — validate the proposed values, then accept or reject
app.post("/settings/validate", express.json(), (req, res) => {
  const { settings } = req.body;

  if (!settings?.api_key) {
    return res.json({
      success: false,
      error: {
        field: "api_key",
        message: { en: "API key is required", ar: "مفتاح API مطلوب" },
      },
    });
  }

  res.json({ success: true }); // 200 → Salla saves; app.settings.updated fires
});
```

---

## Settings in the App Lifecycle

| Lifecycle event        | Settings action                                                                                                                                                                  |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app.store.authorize`  | POST defaults for all keys                                                                                                                                                       |
| `app.updated`          | Re-POST if your schema changed (add new keys with defaults)                                                                                                                      |
| `app.settings.updated` | Merchant saved the form — this event **activates the app**; persist `data.settings` from the payload (authoritative — you may not hold a token to GET)                           |
| `app.uninstalled`      | A deleted app gets no further access or webhooks; Salla handles its own uninstall. Any partner-side cleanup of your stored copy is your choice — Salla does NOT clear it for you |
| Merchant edits form    | Salla POSTs to your public Validation URL (if set, validate-only, no signature) → on success Salla stores the values and fires `app.settings.updated`                            |
