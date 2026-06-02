# Salla Admin API — Usage Patterns

Base URL: `https://api.salla.dev/admin/v2`
Auth: `Authorization: Bearer {access_token}` on every request.

---

## Identifying the Merchant

Always resolve who you're acting on behalf of before calling the API:

```ts
async function getMerchantInfo(token: string) {
  const res = await fetch('https://accounts.salla.sa/oauth2/introspect', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  const { active, merchant_id, store_id, scope } = await res.json();
  if (!active) throw new Error('Token invalid or expired');
  return { merchant_id, store_id, scope };
}
```

---

## Common Endpoints

### Orders

```http
GET    /orders                    # List orders
GET    /orders/{id}               # Get order detail
PUT    /orders/{id}/status        # Update order status
POST   /orders/{id}/refund        # Issue refund
```

### Products

```http
GET    /products                  # List products
GET    /products/{id}             # Get product detail
POST   /products                  # Create product
PUT    /products/{id}             # Update product
DELETE /products/{id}             # Delete product
GET    /products/{id}/variants    # List variants
```

### Customers

```http
GET    /customers                 # List customers
GET    /customers/{id}            # Get customer
PUT    /customers/{id}            # Update customer
```

### Store

```http
GET    /store                     # Store info (name, domain, currency, locale)
GET    /store/branches            # List branches
GET    /store/settings            # Store settings
```

### App Settings

```http
GET    /apps/{app_id}/settings    # Read merchant's settings for your app
POST   /apps/{app_id}/settings    # Write merchant's settings (all keys required)
```

---

## Pagination

List endpoints use cursor-based pagination:

```ts
async function getAllOrders(token: string) {
  const orders = [];
  let cursor: string | null = null;

  do {
    const url = new URL('https://api.salla.dev/admin/v2/orders');
    if (cursor) url.searchParams.set('cursor', cursor);

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
    });
    const { data, pagination } = await res.json();

    orders.push(...data);
    cursor = pagination?.next_cursor ?? null;
  } while (cursor);

  return orders;
}
```

---

## Error Handling

| Status | Meaning | Action |
| --- | --- | --- |
| `401` | Token expired or invalid | Refresh token, retry |
| `403` | Insufficient scope | Check app scopes, re-authorize |
| `404` | Resource not found | Check ID, handle gracefully |
| `422` | Validation error | Read `errors` array in response body |
| `429` | Rate limited | Back off using `Retry-After` header |
| `5xx` | Server error | Retry with exponential backoff |

```ts
async function apiCall(url: string, token: string, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  });

  if (res.status === 401) {
    // refresh token and retry once
  }
  if (res.status === 429) {
    const retryAfter = Number(res.headers.get('Retry-After') ?? 5);
    await sleep(retryAfter * 1000);
    return apiCall(url, token, options); // retry
  }
  if (!res.ok) {
    const err = await res.json();
    throw new Error(`API error ${res.status}: ${JSON.stringify(err)}`);
  }

  return res.json();
}
```

---

## Calling the API from an App Function

```ts
export default async function (context: OrderCreatedContext) {
  const token = context.token; // merchant's access token, always fresh

  const res = await fetch(
    `https://api.salla.dev/admin/v2/orders/${context.event.data.id}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const { data: order } = await res.json();

  // process order...
  return Resp.success();
}
```

---

## Resources

| Topic | Link |
| --- | --- |
| Salla Admin API reference | https://docs.salla.dev/doc-421117 |
| Token Introspect | https://docs.salla.dev/6394918f0.md |
