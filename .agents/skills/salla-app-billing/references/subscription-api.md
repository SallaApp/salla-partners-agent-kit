# App Subscription Details / Balance — API response shapes

Load this at **Step 5 / 5b** of `salla-app-billing`. The SKILL.md keeps the endpoints and
gates; the full response sample and field reference live here. Source:
https://docs.salla.dev/5401098e0.md (GET) · https://docs.salla.dev/5401099e0.md (POST).

## GET /apps/{app_id}/subscriptions — Response (`200`)

`{ status, success, data: [...] }`, each item a Subscription Detail (where you read plan
state, entitlements, and the usage balance):

```json
{
  "status": 200,
  "success": true,
  "data": [
    {
      "id": "657032372",
      "app_name": "BitoShip",
      "description": "BitoShip Description",
      "app_type": "app",
      "categories": ["Others"],
      "item_type": "plan",
      "item_slug": null,
      "plan_type": "recurring",
      "plan_name": "Yearly",
      "plan_period": "12",
      "start_date": "2022-05-23",
      "end_date": "2023-05-23",
      "initialization_cost": 15,
      "price_before_discount": 6,
      "price": 20,
      "tax": 3,
      "tax_value": 3,
      "total": 23,
      "subscription_balance": 50,
      "coupon": null,
      "features": [{ "key": "Feature1", "quantity": 1 }],
      "quantity": 1
    }
  ]
}
```

| Field                                                  | Notes                                                                                                                 |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| `id`                                                   | Subscription identifier (string)                                                                                      |
| `item_type`                                            | `"plan"` \| `"addon"` — filter to `plan` for plan state (required field)                                              |
| `item_slug`                                            | `null` for plans; addon identifier for addons                                                                         |
| `plan_type`                                            | `free` \| `once` \| `recurring` \| `on_demand` (same values in the publish payload and in events)                     |
| `plan_name`                                            | free string, e.g. `"Yearly"` (`"trail"` in docs samples is a sample artifact — never match on it)                     |
| `plan_period`                                          | plan period in months as a string, e.g. `"12"`; nullable                                                              |
| `start_date` / `end_date`                              | dates; nullable (e.g. null on Free/one-time)                                                                          |
| `initialization_cost`                                  | one-time setup fee; nullable                                                                                          |
| `price_before_discount` / `price`                      | amounts; nullable (null on Trial samples)                                                                             |
| `tax` / `tax_value` / `total`                          | tax %, tax amount, total (tax included); nullable                                                                     |
| `subscription_balance`                                 | **usage balance** the merchant owes for the app's service; number, nullable (null on Free/Trial). Written via Step 5b |
| `coupon`                                               | applied coupon `{ name, amount }`, or `null`                                                                          |
| `features[]`                                           | `{ key, quantity }` — entitlements granted (may be empty `[]`)                                                        |
| `quantity`                                             | seats/units purchased (required field)                                                                                |
| `app_name` / `description` / `app_type` / `categories` | app metadata echoed back (`app_type`: `app` \| `shipping`)                                                            |

A `403` (`{ status: 403, success: false, error: { code, message } }`) means the caller
lacks permission for this app. Use this to reconcile — not as your hot path.

## POST /apps/balance — Update Subscription Balance (Pay As You Go)

```
POST https://api.salla.dev/admin/v2/apps/balance
Authorization: Bearer <access_token>   # OAuth, offline_access
Content-Type: application/json

{ "balance": 2399 }
```

`balance` (integer) is **required**.

- **Response (`201`)** — `{ status, success, data: { message, code } }`.
- **Validation error (`422`)** — `{ status: 422, success: false, error: { code, message, fields: { balance: ["..."] } } }`.
