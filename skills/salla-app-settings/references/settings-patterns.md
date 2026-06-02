# App Settings — Usage Patterns

Common patterns for reading, writing, and validating App Settings across different integration points.

---

## Reading Settings in an App Function

```ts
export default async function (context: AppContext) {
  // All settings are available as a flat object
  const apiKey     = context.settings.api_key as string;
  const sandbox    = context.settings.sandbox_mode as boolean;
  const webhookUrl = context.settings.webhook_url as string | null;

  if (!apiKey) {
    return Resp.error('App not configured — merchant must enter API key in settings', 400);
  }

  // use apiKey to call your carrier/service
}
```

---

## Fetching Settings Server-Side (GET)

Useful when your backend needs to read a merchant's settings outside of an App Function (e.g. from your own webhook handler):

```ts
async function getMerchantSettings(appId: number, accessToken: string) {
  const res = await fetch(
    `https://api.salla.dev/admin/v2/apps/${appId}/settings`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const { data } = await res.json();
  return data.settings; // { api_key, sandbox_mode, ... }
}
```

---

## Writing Settings on Install (POST)

After the merchant authorizes your app, set default settings immediately so your App Functions always have values to read:

```ts
// In your app.installed webhook handler
async function onAppInstalled(payload: AppInstalledPayload) {
  const { app_id, merchant } = payload;
  const token = merchant.token;

  await fetch(`https://api.salla.dev/admin/v2/apps/${app_id}/settings`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      api_key: '',            // empty — merchant must fill via settings form
      sandbox_mode: true,     // default to sandbox for safety
      environment: 'staging',
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
  // Step 1: read current values
  const current = await getMerchantSettings(appId, token);

  // Step 2: merge and write all keys back
  await fetch(`https://api.salla.dev/admin/v2/apps/${appId}/settings`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...current, sandbox_mode: enabled }),
  });
}
```

---

## Validating Settings Signature

Verify the `X-Salla-Signature` on incoming validation requests:

```ts
import crypto from 'crypto';

function verifySettingsSignature(body: string, signature: string, secret: string): boolean {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}

// Express handler
app.post('/settings/validate', (req, res) => {
  const raw = JSON.stringify(req.body);
  const sig = req.headers['x-salla-signature'] as string;

  if (!verifySettingsSignature(raw, sig, process.env.WEBHOOK_SECRET!)) {
    return res.status(401).json({ success: false });
  }

  const { settings } = req.body;
  if (!settings.api_key) {
    return res.json({
      success: false,
      error: { field: 'api_key', message: { en: 'API key is required', ar: 'مفتاح API مطلوب' } },
    });
  }

  res.json({ success: true });
});
```

---

## Settings in the App Lifecycle

| Lifecycle event | Settings action |
| --- | --- |
| `app.installed` | POST defaults for all keys |
| `app.updated` | Re-POST if your schema changed (add new keys with defaults) |
| `app.uninstalled` | No action needed — Salla clears settings automatically |
| Merchant edits form | Salla calls your Validation URL → on success, Salla calls POST |
