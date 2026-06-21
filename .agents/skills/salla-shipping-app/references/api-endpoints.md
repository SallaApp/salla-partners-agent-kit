# Shipping API — Endpoint Reference

Base URL: `https://api.salla.dev/admin/v2` (confirmed as the Production server in every
endpoint's OpenAPI spec).
Auth: `Authorization: Bearer {access_token}`.

This is the authoritative REST reference for the **Shipping & Fulfilment API**, in three
sections: **Shipments**, **Shipping Companies**, and **Shipping Routes**. Every endpoint
below is taken from its published OpenAPI doc (linked per row); illustrative example
values are marked where the doc doesn't pin an exact shape.

> **Security & ownership (route, don't duplicate):** use the stored merchant token and
> refresh it through **`salla-app-auth`**. Scopes per endpoint: `shipping.read` for reads,
> `shipping.read_write` for writes (each endpoint's required scope is listed below).
> Generic auth headers, pagination, rate limits, and error shapes live in
> **`salla-api-core`**. Webhook signature verification + idempotency →
> **`salla-webhooks`**. Never log bearer tokens, signing secrets, or customer PII (names,
> phones, addresses).

---

## Shipments

| Method | Path                                | Purpose                                                     | Scope                 | Doc                                 |
| ------ | ----------------------------------- | ----------------------------------------------------------- | --------------------- | ----------------------------------- |
| `GET`  | `/shipments`                        | List shipments (filterable)                                 | `shipping.read`       | https://docs.salla.dev/5578809e0.md |
| `POST` | `/shipments`                        | Create / assign a shipment (Order Fulfilment)               | `shipping.read_write` | https://docs.salla.dev/5578808e0.md |
| `GET`  | `/shipments/{shipment_id}`          | Shipment details                                            | `shipping.read`       | https://docs.salla.dev/5578811e0.md |
| `PUT`  | `/shipments/{shipment_id}`          | **Update Shipment Details** — tracking, label, cost, status | `shipping.read_write` | https://docs.salla.dev/5578810e0.md |
| `GET`  | `/shipments/{shipment_id}/tracking` | Shipment tracking (status + history)                        | `shipping.read`       | https://docs.salla.dev/5578814e0.md |
| `POST` | `/shipments/{shipment_id}/cancel`   | Cancel a shipment                                           | `shipping.read_write` | https://docs.salla.dev/5578812e0.md |
| `POST` | `/shipments/{shipment_id}/return`   | Return a delivered shipment                                 | `shipping.read_write` | https://docs.salla.dev/5578813e0.md |

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

`status` filter enum: `created`, `in_progress`, `in_transit`, `received_at_final_hub`,
`to_be_reattempted`, `reattempted`, `unable_to_deliver`, `delivering`, `delivered`,
`partially_delivered`, `shipped`, `cancelled`, `lost`, `damaged`, `return_to_origin`,
`return_in_progress`.

Response `data` is an **array** of shipment objects (`id`, `order_id`,
`order_reference_id`, `created_at`, `type` (`shipment`/`return`), `courier_id`,
`courier_name`, `courier_logo`, `shipping_number`, `tracking_number`, `pickup_id`,
`trackable`, `tracking_link`, `label`, `payment_method` (`cod`/`pre_paid`), `source`,
`status`, `total`, `cash_on_delivery`, `is_international`, `total_weight`, `packages[]`,
`ship_from`, `ship_to`, `meta` (`app_id`, `policy_options`), `billing_account`
(`salla`/`merchant`)) plus a sibling `pagination` block (`count`, `total`, `perPage`,
`currentPage`, `totalPages`, `links.next`). Doc: https://docs.salla.dev/5578809e0.md.

### Create / Assign Shipment (Order Fulfilment)

`POST /shipments` — scope `shipping.read_write`. Used by an Order Fulfilment App to assign
an order to a carrier. **Required** body fields: `courier_id`, `shipment_type`
(`shipment`/`return`), `payment_method` (`cod`/`pre_paid`), `packages[]`. Other key fields:
`order_id`, `overwrite_exists_pending` (bool), `cash_on_delivery` (`amount`, `currency`),
`description`, `remarks`, `external_id`, `external_company_name`, `service_types[]`,
`policy_options`, `ship_to` (recipient + address), `ship_from` (`type` `address`/`branch`,
`branch_id`). Note: `ship_to.country_id`/`city_id` and `ship_from.country_id`/`city_id` are
**deprecated** — use `ship_to.country`/`city` and `ship_from.country`/`city`. Success
returns `data` as a single shipment **object** with `status: "creating"`, which triggers
`shipment.creating` to the assigned Shipping App. Doc: https://docs.salla.dev/5578808e0.md.

### Shipment Details

`GET /shipments/{shipment_id}` — scope `shipping.read`. Returns `data` as a single shipment
**object** (same shape as a List item). `404` if the shipment doesn't exist. Doc:
https://docs.salla.dev/5578811e0.md.

### Update Shipment Details

`PUT /shipments/{shipment_id}` — scope `shipping.read_write`. The single endpoint a Shipping
App uses to push results back after creating a shipment with its carrier. **Required**:
`shipment_number` and `status`. Other fields are optional: `order_id`, `tracking_number`,
`tracking_link` (max 300 chars, effective May 20 2026), `pdf_label` (max 300 chars), `cost`
(include VAT), `status_note`, `external_company_name`, `policy_options`.

```http
PUT /shipments/{shipment_id}
Content-Type: application/json

{
  "shipment_number": "846984645",
  "tracking_number": "54563653",
  "tracking_link": "https://carrier.com/track/54563653",
  "pdf_label": "https://carrier.com/labels/label-63563751.pdf",
  "cost": 40,
  "status_note": "Parcel has been picked up by our logistics partner",
  "status": "delivered"
}
```

`status` enum (request): `created`, `in_progress`, `in_transit`, `received_at_final_hub`,
`to_be_reattempted`, `reattempted`, `unable_to_deliver`, `delivering`, `delivered`,
`partially_delivered`, `shipped`, `cancelled`, `lost`, `damaged`, `return_to_origin`,
`return_in_progress`. (As of Jan 20 2025 `status` is required.)

Success returns `data` as the full shipment **object**; note `status` in the response can
be an **object** (`{ id, name, slug }`, e.g. slug `under_review`). `422` carries a `fields`
map. Doc: https://docs.salla.dev/5578810e0.md.

### Shipment Tracking

`GET /shipments/{shipment_id}/tracking` — scope `shipping.read`. Returns `data` as a single
**object** with shipment header fields (`id`, `order_id`, `type`, `courier_id`,
`courier_name`, `courier_logo`, `shipping_number`, `tracking_number`, `trackable`,
`tracking_link`, `label` (`format`, `url`), `status`) plus a `history[]` array, each entry
`{ status, note, create_at: { date, timezone_type, timezone } }`. Doc:
https://docs.salla.dev/5578814e0.md.

### Cancel & Return

`POST /shipments/{shipment_id}/cancel` — scope `shipping.read_write`. Cancels a shipment;
success returns the shipment **object** with `status: "cancelled"`. `404` if not found.
Salla first runs the Shipping App's `shipment.cancelling` App Function (sync), then fires
the async `shipment.cancelled` event. Doc: https://docs.salla.dev/5578812e0.md.

`POST /shipments/{shipment_id}/return` — scope `shipping.read_write`. Initiates a return on
a **delivered** shipment (a `422` "shipment must be delivered first" is returned otherwise);
success returns the shipment **object** with `type: "return"`, `status: "creating"`. Salla
then runs the Shipping App's `shipment.creating` App Function with `type: "return"`. Doc:
https://docs.salla.dev/5578813e0.md.

---

## Shipping Companies

| Method | Path                               | Purpose                        | Scope           | Doc                                 |
| ------ | ---------------------------------- | ------------------------------ | --------------- | ----------------------------------- |
| `GET`  | `/shipping/companies/`             | List active shipping companies | `shipping.read` | https://docs.salla.dev/5578815e0.md |
| `GET`  | `/shipping/companies/{company_id}` | Shipping company details       | `shipping.read` | https://docs.salla.dev/5578816e0.md |

### List Shipping Companies

`GET /shipping/companies/` — scope `shipping.read`. No params. Returns `data` as an
**array**; each company `{ id, name, app_id, activation_type, slug }`. `activation_type` is
`manual` (merchant-side, not linkable from the Salla dashboard) or `api` (linked through
Salla). When `activation_type` is `manual`, `slug` is `null`. An Order Fulfilment App calls
this to discover which carriers a merchant has active before assigning an order. Doc:
https://docs.salla.dev/5578815e0.md.

### Shipping Company Details

`GET /shipping/companies/{company_id}` — scope `shipping.read`. Returns `data` as a single
**object** `{ id, name, app_id, activation_type, slug }`. `404` if not found. Doc:
https://docs.salla.dev/5578816e0.md.

---

## Shipping Routes

Shipping routes let a merchant decide which company handles a shipment, in what priority,
and under what conditions/strategy. The `default` route is managed separately (no `id` in
the path).

| Method   | Path                       | Purpose                       | Scope                 | Doc                                  |
| -------- | -------------------------- | ----------------------------- | --------------------- | ------------------------------------ |
| `GET`    | `/shipping/routes`         | List shipping routes          | `shipping.read`       | https://docs.salla.dev/19665286e0.md |
| `GET`    | `/shipping/routes/{id}`    | Shipping route details        | `shipping.read`       | https://docs.salla.dev/19665287e0.md |
| `POST`   | `/shipping/routes`         | Create a shipping route       | `shipping.read_write` | https://docs.salla.dev/19665288e0.md |
| `PATCH`  | `/shipping/routes/{id}`    | Update a shipping route       | `shipping.read_write` | https://docs.salla.dev/19665289e0.md |
| `PATCH`  | `/shipping/routes/default` | View/update the default route | `shipping.read_write` | https://docs.salla.dev/19665290e0.md |
| `DELETE` | `/shipping/routes/{id}`    | Delete a shipping route       | `shipping.read_write` | https://docs.salla.dev/19665291e0.md |

Common route object fields: `id`, `name`, `priority` (lower = higher priority), `status`
(bool in responses), `type` (`normal` / `auto` / `branded` / `default`), `branded` (object:
`name`, `description`, `logo_url`, `combinable`, `pricing` { `type` `rate`/`fixed`, `cost`,
`amount_per_unit`, `up_to_weight`, `per_unit` }), `companies[]` (each `{ id, priority,
capacity }`), `condition_match` (`all` / `any`), `conditions[]` (each `{ type, operator,
value }`), `strategy` (object: `type` `default`/`manual`/`quota`/`ratio`/`lowest_price`,
`capacity_level`, `alternative_companies`).

### List Shipping Routes

`GET /shipping/routes` — scope `shipping.read`. Query: `name` (optional). Returns `data` as
an **array** of route objects (`id`, `name`, `type`, `status`, `priority`, `strategy`,
`combinable`) plus a `pagination` block (`count`, `current`, `next`). Errors: `401`, `404`.
Doc: https://docs.salla.dev/19665286e0.md.

### Shipping Route Details

`GET /shipping/routes/{id}` — scope `shipping.read`. Path param `id` (required). Returns
`data` as a single route **object** (full shape above). Errors: `401`, `404`. Doc:
https://docs.salla.dev/19665287e0.md.

### Create Shipping Route

`POST /shipping/routes` — scope `shipping.read_write`. **Required** body fields: `name`,
`type` (`normal` / `auto` / `branded` — no `default` on create), `status` (`1` active / `0`
inactive), `priority`, `companies[]`, `strategy`. Optional: `branded`, `condition_match`,
`conditions[]`. Returns `201` with `data` as the created route **object**. Errors: `401`,
`422` (per-field `fields` map). Doc: https://docs.salla.dev/19665288e0.md.

### Update Shipping Route

`PATCH /shipping/routes/{id}` — scope `shipping.read_write`. Path param `id` (required).
Partial update — all body fields optional (`name`, `type`, `status`, `priority`, `branded`,
`companies[]`, `condition_match`, `conditions[]`, `strategy`). Returns `200` with `data` as
the route **object**. Errors: `401`, `422`. Doc: https://docs.salla.dev/19665289e0.md.

### Set / View Default Shipping Route

`PATCH /shipping/routes/default` — scope `shipping.read_write`. No path/query params. Body
(all optional): `status` (bool), `companies[]`, `strategy`. Returns `200` with `data` as the
default route **object** (`type: "default"`). Errors: `401`. Doc:
https://docs.salla.dev/19665290e0.md.

### Delete Shipping Route

`DELETE /shipping/routes/{id}` — scope `shipping.read_write`. Path param `id` (required), no
body. Returns `200` with `data` an **object** `{ message, code }` (e.g.
`{ "message": "Route deleted successfully" }`). Errors: `401`. Doc:
https://docs.salla.dev/19665291e0.md.

---

## Country / City Lookups (for shipment filters)

The shipment filters and `ship_to`/`ship_from` fields reference country and city IDs:

| Method | Path                     | Purpose          | Doc                                |
| ------ | ------------------------ | ---------------- | ---------------------------------- |
| `GET`  | `/countries`             | List country ids | https://docs.salla.dev/api-5394228 |
| `GET`  | `/countries/{id}/cities` | List city ids    | https://docs.salla.dev/api-5394230 |

---

## Orders

Order data, addresses, and order status arrive in the `order.created` webhook payload and in
the `shipment.creating` App Function context (see `fulfillment-cycle.md` and
`shipment-cycle.md`). Generic order read/list endpoints are owned by **`salla-api-core`**.

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

**List endpoints** (`GET /shipments`, `GET /shipping/companies/`, `GET /shipping/routes`) —
`data` is an **array**, with a sibling `pagination` block:

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
    "totalPages": 11,
    "links": { "next": "https://api.salla.dev/admin/v2/shipments?page=2" }
  }
}
```

**Single-resource endpoints** (`GET`/`PUT` `/shipments/{id}`, create/cancel/return,
route details/create/update/default/delete) — `data` is an **object**:

```json
{
  "status": 200,
  "success": true,
  "data": {
    "id": 362985662,
    "type": "shipment",
    "status": { "id": 566146469, "slug": "under_review" }
  }
}
```

Check the endpoint type (list vs single-resource) before iterating `data`.

Validation errors (`422`) carry a `fields` map; not-found errors return `404`; unauthenticated
calls return `401` (auth handling → **`salla-app-auth`**):

```json
{
  "status": 422,
  "success": false,
  "error": {
    "code": "validation_failed",
    "message": "alert.invalid_fields",
    "fields": { "courier_id": ["The field is required."] }
  }
}
```

---

## Postman Collection

> **Use demo/non-sensitive data only.** Never paste production bearer tokens, signing
> secrets, carrier credentials, or real customer PII into Postman or any third-party
> capture tool, and clear them from the environment after testing.

[![Run in Postman](https://run.pstmn.io/button.svg)](https://www.postman.com/salla-app/workspace/salla-e-commerce-platform/collection/17687195-d700cd60-adf3-4b20-82ee-94851e88bd44)

---

## Resources

| Topic                     | Link                                 |
| ------------------------- | ------------------------------------ |
| List Shipments            | https://docs.salla.dev/5578809e0.md  |
| Create Shipment           | https://docs.salla.dev/5578808e0.md  |
| Update Shipment Details   | https://docs.salla.dev/5578810e0.md  |
| Shipment Details          | https://docs.salla.dev/5578811e0.md  |
| Shipment Tracking         | https://docs.salla.dev/5578814e0.md  |
| Cancel Shipment           | https://docs.salla.dev/5578812e0.md  |
| Return Shipment           | https://docs.salla.dev/5578813e0.md  |
| List Shipping Companies   | https://docs.salla.dev/5578815e0.md  |
| Shipping Company Details  | https://docs.salla.dev/5578816e0.md  |
| List Shipping Routes      | https://docs.salla.dev/19665286e0.md |
| Shipping Route Details    | https://docs.salla.dev/19665287e0.md |
| Create Shipping Route     | https://docs.salla.dev/19665288e0.md |
| Update Shipping Route     | https://docs.salla.dev/19665289e0.md |
| Default Shipping Route    | https://docs.salla.dev/19665290e0.md |
| Delete Shipping Route     | https://docs.salla.dev/19665291e0.md |
| Salla Admin API reference | https://docs.salla.dev/421117m0.md   |
