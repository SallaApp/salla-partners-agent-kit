# Shipping API — Endpoint Reference

Base URL: `https://api.salla.dev/admin/v2`
Auth: `Authorization: Bearer {access_token}`

List of Shipping API (source of truth): https://docs.salla.dev/api-5578809 ·
Getting started: https://docs.salla.dev/422988m0.md

> **Security & ownership (route, don't duplicate):** use the stored merchant token and
> refresh it through **`salla-app-auth`**; request the minimum scopes the app needs
> (`shipping.read` for reads, `shipping.read_write` for writes); never log bearer tokens,
> signing secrets, or customer PII (names, phones, addresses). Generic auth headers,
> pagination, rate limits, and error shapes live in **`salla-api-core`**. Webhook signature
> verification + idempotency → **`salla-webhooks`**.

---

## Shipments

These are the real endpoints from the Shipping API list. Note: there is **no separate
`/label` or `/tracking` sub-resource** — tracking number, tracking link, label, cost, and
status are all set through the single **Update Shipment Details** (`PUT /shipments/{id}`)
endpoint.

| Method | Path                              | Purpose                                                     | Doc                                |
| ------ | --------------------------------- | ----------------------------------------------------------- | ---------------------------------- |
| `GET`  | `/shipments`                      | List shipments (filterable)                                 | https://docs.salla.dev/api-5578809 |
| `PUT`  | `/shipments/{shipment_id}`        | **Update Shipment Details** — tracking, label, cost, status | https://docs.salla.dev/api-5578810 |
| `POST` | `/shipments`                      | Create / assign a shipment (Order Fulfilment)               | https://docs.salla.dev/api-5394231 |
| `POST` | `/shipments/{shipment_id}/return` | Initiate a return on a delivered shipment                   | https://docs.salla.dev/api-5394236 |
| `POST` | `/shipments/{shipment_id}/cancel` | Cancel a shipment                                           | https://docs.salla.dev/api-5394235 |

### List Shipments

`GET /shipments` — scope `shipping.read`. Query filters (all optional):

| Param                                          | Meaning                           |
| ---------------------------------------------- | --------------------------------- |
| `order_id`                                     | Filter by order                   |
| `courier_id` / `courier_slug`                  | Filter by shipping company        |
| `status`                                       | Shipment status (enum, see below) |
| `shipment_type`                                | `shipment` or `return`            |
| `payment_method`                               | `pre_paid` or `cod`               |
| `from_date` / `to_date`                        | Date range (`YYYY-MM-DD`)         |
| `ship_to[country_id\|country_code\|city_id]`   | Destination filters               |
| `ship_from[country_id\|country_code\|city_id]` | Origin filters                    |
| `source`                                       | Shipment source (e.g. `api`)      |
| `per_page`                                     | Records per page                  |

Full `status` filter enum: `created`, `in_progress`, `in_transit`,
`received_at_final_hub`, `to_be_reattempted`, `reattempted`, `unable_to_deliver`,
`delivering`, `delivered`, `partially_delivered`, `shipped`, `cancelled`, `lost`,
`damaged`, `return_to_origin`, `return_in_progress`.

The response `data` is an **array** of shipment objects (`id`, `order_id`, `type`,
`courier_id`/`courier_name`, `shipping_number`, `tracking_number`, `tracking_link`,
`label`, `payment_method` (`cod`/`pre_paid`), `status`, `total`, `cash_on_delivery`,
`packages[]`, `ship_from`, `ship_to`, `billing_account` (`salla`/`merchant`), `meta`)
plus a `pagination` block (`count`, `total`, `perPage`, `currentPage`, `totalPages`,
`links.next`).

### Update Shipment Details

`PUT /shipments/{shipment_id}` — the single endpoint a Shipping App uses to push results
back after creating a shipment with its carrier. `shipment_number` and `status` are
**required** and must match the value used in the first update; everything else is
optional. Include VAT in `cost`.

```http
PUT /shipments/{shipment_id}
Content-Type: application/json

{
  "shipment_number": "846984645",
  "tracking_number": "4324233",
  "tracking_link": "https://carrier.com/track/4324233",
  "label": { "format": "pdf", "url": "https://carrier.com/labels/SHP-001.pdf" },
  "cost": 25.5,
  "status_note": "Picked up from Riyadh hub",
  "status": "shipped"
}
```

> **Available `status` values** (Update Shipment / Order Status,
> https://docs.salla.dev/422994m0.md): `created`, `shipped`, `delivering`, `delivered`,
> `in_progress`, `cancelled`. **Exception:** once a shipment is `shipped`, `delivering`,
> or `delivered`, it cannot be moved back to `created` or `in_progress`.

A successful response returns the full shipment object with `status` as an object
(`{ id, name, slug }`, e.g. slug `under_review`). For the exact field-by-field request and
response schema see https://docs.salla.dev/api-5578810.

### Create / Assign Shipment (Order Fulfilment)

`POST /shipments` — used by an Order Fulfilment App to assign an order to a carrier; the
created shipment comes back with `status: "creating"`, which triggers `shipment.creating`
to the assigned Shipping App. Request schema: https://docs.salla.dev/api-5394231.

### Return & Cancel

`POST /shipments/{shipment_id}/return` initiates a return on a delivered shipment — Salla
then runs the Shipping App's `shipment.creating` App Function with `type: "return"`.
`POST /shipments/{shipment_id}/cancel` cancels a shipment — Salla first runs the Shipping
App's `shipment.cancelling` App Function (sync), then fires the async `shipment.cancelled`
event. Docs: https://docs.salla.dev/api-5394236 (return),
https://docs.salla.dev/api-5394235 (cancel).

---

## Shipping Companies & Lookups

| Method | Path                  | Purpose                                               | Doc                                |
| ------ | --------------------- | ----------------------------------------------------- | ---------------------------------- |
| `GET`  | `/shipping/companies` | List shipping apps/companies the merchant has enabled | https://docs.salla.dev/api-5394239 |

Each entry returns `id`, `name`, `app_id`, `activation_type` (`manual` or `api`), and
`slug`. An Order Fulfilment App calls this to discover which carriers a merchant has active
before assigning an order.

Country / city lookups used by the shipment filters:

| Method | Path                     | Purpose          | Doc                                |
| ------ | ------------------------ | ---------------- | ---------------------------------- |
| `GET`  | `/countries`             | List country ids | https://docs.salla.dev/api-5394228 |
| `GET`  | `/countries/{id}/cities` | List city ids    | https://docs.salla.dev/api-5394230 |

---

## Orders

Order data, addresses, and order status arrive in the `order.created` webhook payload and in
the `shipment.creating` App Function context (see `fulfillment-cycle.md` and
`shipment-cycle.md`). Order status that **triggers** shipment creation is `completed`
(returns: `restoring` / `restored`) — see https://docs.salla.dev/422994m0.md. Generic order
read/list endpoints are owned by **`salla-api-core`**.

---

## App Settings (Shipping Config)

| Method | Path                      | Purpose                             |
| ------ | ------------------------- | ----------------------------------- |
| `GET`  | `/apps/{app_id}/settings` | Get merchant's carrier credentials  |
| `POST` | `/apps/{app_id}/settings` | Save merchant's carrier credentials |

> Settings schema design, registration, validation, and the read-modify-write (full
> replace — POST overwrites the whole record, so merge before saving) pattern are owned
> by **`salla-app-settings`**. Carrier credentials are secrets: store them encrypted,
> authenticate the merchant before reading/writing, and never log them.

---

## Response Envelope

The `data` field shape depends on the endpoint type:

**List endpoints** (`GET /shipments`, `GET /shipping/companies`) — `data` is an **array**,
with a sibling `pagination` block:

```json
{
  "status": 200,
  "success": true,
  "data": [{ "id": 362985660, "type": "shipment", "status": "creating" }],
  "pagination": {
    "count": 3,
    "total": 32,
    "perPage": 3,
    "currentPage": 1,
    "totalPages": 11
  }
}
```

**Single-resource endpoints** (`PUT /shipments/{id}`, `POST /shipments`, return/cancel) —
`data` is an **object**:

```json
{
  "status": 200,
  "success": true,
  "data": {
    "id": 1139865338,
    "type": "shipment",
    "status": { "id": 566146469, "slug": "under_review" }
  }
}
```

Do not assume `data` is always an array. Check the endpoint type before iterating.

`GET /shipments` paginates via `per_page` and the returned `pagination.links.next`; the
generic pagination loop lives in **`salla-api-core`**.

Validation errors (`422`) carry a `fields` map:

```json
{
  "status": 422,
  "success": false,
  "error": {
    "code": "validation_failed",
    "message": "alert.invalid_fields",
    "fields": { "courier_slug": ["The field contains invalid values."] }
  }
}
```

---

## Postman Collection

> **Use demo/non-sensitive data only.** Never paste production bearer tokens, signing
> secrets, carrier credentials, or real customer PII into Postman or any third-party
> capture tool, and clear them from the environment after testing.

Test all endpoints interactively:

[![Run in Postman](https://run.pstmn.io/button.svg)](https://www.postman.com/salla-app/workspace/salla-e-commerce-platform/collection/17687195-d700cd60-adf3-4b20-82ee-94851e88bd44)

---

## Resources

| Topic                        | Link                               |
| ---------------------------- | ---------------------------------- |
| Shipping API getting started | https://docs.salla.dev/422988m0.md |
| List of Shipping API         | https://docs.salla.dev/api-5578809 |
| Update Shipment Details      | https://docs.salla.dev/api-5578810 |
| Salla Admin API reference    | https://docs.salla.dev/421117m0.md |
