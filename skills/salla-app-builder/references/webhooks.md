# Webhooks

Docs: https://docs.salla.dev/421119m0 | Conditional webhooks: https://docs.salla.dev/doc-421120

## Signature Verification

All Salla webhooks include `Authorization: Bearer <hex-sig>`. Always verify before trusting
the payload — use HMAC-SHA256 with timing-safe comparison:

```typescript
async function verifyWebhook(req: Request, secret: string): Promise<boolean> {
  const sig = req.headers.get("Authorization")?.replace("Bearer ", "") ?? "";
  const body = await req.text();

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );

  return crypto.subtle.verify(
    "HMAC",
    key,
    hexToBytes(sig),
    new TextEncoder().encode(body),
  );
}

function hexToBytes(hex: string): Uint8Array {
  const arr = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2)
    arr[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  return arr;
}
```

Use `crypto.subtle.verify` (timing-safe). Never compare signatures with `===`.

## Lifecycle Events

App Events reference: https://docs.salla.dev/doc-421413

| Event                      | Trigger                     | Suggested action              |
| -------------------------- | --------------------------- | ----------------------------- |
| `app.store.authorize`      | Install / token refresh     | Store access + refresh tokens |
| `app.trial.started`        | Trial begins                | Provision resources           |
| `app.subscription.started` | Paid subscription begins    | Mark merchant as active       |
| `app.trial.expired`        | Trial ended without upgrade | Restrict access               |
| `app.subscription.expired` | Paid subscription lapsed    | Restrict access               |
| `app.uninstalled`          | Merchant removes the app    | Delete merchant data          |
