# Admin API — Resource Index

A navigation map: every Admin API resource group → its docs landing page. Use it to
**find the right doc**, then read the per-resource page (or the live API) for exact paths,
fields, scopes, and CRUD shapes — those are not duplicated here on purpose.

- **Base URL:** `https://api.salla.dev/admin/v2` (all resource paths are relative to it).
- **CRUD shapes:** read the linked landing doc, which lists the resource's create / details
  / update / list endpoints and schemas. They drift, so treat the doc (or a live call) as
  the source of truth.
- **Webhooks management** (register, subscribe, verify, versions) is owned by
  **salla-webhooks** — the row below points only at the Admin API resource reference.
- **Get Started overview** (all groups with descriptions): https://docs.salla.dev/421117m0.md

## Order Management

| Resource           | Landing doc                         |
| ------------------ | ----------------------------------- |
| Orders             | https://docs.salla.dev/5394146e0.md |
| Order Status       | https://docs.salla.dev/841786f0.md  |
| Order Histories    | https://docs.salla.dev/841790f0.md  |
| Order Options      | https://docs.salla.dev/841787f0.md  |
| Order Assignment   | https://docs.salla.dev/889079f0.md  |
| Order Invoice      | https://docs.salla.dev/841788f0.md  |
| Order Reservations | https://docs.salla.dev/889863f0.md  |
| Order Items        | https://docs.salla.dev/886364f0.md  |
| Exports            | https://docs.salla.dev/5590305e0.md |

## Product Management

| Resource                 | Landing doc                         |
| ------------------------ | ----------------------------------- |
| Products                 | https://docs.salla.dev/5394168e0.md |
| Product Tags             | https://docs.salla.dev/841793f0.md  |
| Product Options          | https://docs.salla.dev/841797f0.md  |
| Product Option Values    | https://docs.salla.dev/841798f0.md  |
| Product Option Templates | https://docs.salla.dev/1939470f0.md |
| Product Images           | https://docs.salla.dev/841795f0.md  |
| Product Variants         | https://docs.salla.dev/841799f0.md  |
| Product Quantity         | https://docs.salla.dev/5394192e0.md |
| Digital Products         | https://docs.salla.dev/841794f0.md  |
| Categories               | https://docs.salla.dev/841800f0.md  |
| Brands                   | https://docs.salla.dev/841801f0.md  |

## Customer Management

| Resource        | Landing doc                         |
| --------------- | ----------------------------------- |
| Customers       | https://docs.salla.dev/841780f0.md  |
| Customer Groups | https://docs.salla.dev/841781f0.md  |
| Customer Wallet | https://docs.salla.dev/5737562f0.md |
| Loyalty Points  | https://docs.salla.dev/2604936f0.md |

> Customer endpoints carry a tighter cap (500 requests / 10 min) — see SKILL.md Step 4.

## Marketing & Sales

| Resource       | Landing doc                         |
| -------------- | ----------------------------------- |
| Special Offers | https://docs.salla.dev/841802f0.md  |
| Coupons        | https://docs.salla.dev/841818f0.md  |
| Affiliates     | https://docs.salla.dev/841817f0.md  |
| Advertisements | https://docs.salla.dev/841816f0.md  |
| Reviews        | https://docs.salla.dev/3672516f0.md |
| Feedbacks      | https://docs.salla.dev/841819f0.md  |

## Store Configuration

| Resource                                             | Landing doc                          |
| ---------------------------------------------------- | ------------------------------------ |
| Store                                                | https://docs.salla.dev/5394261e0.md  |
| Settings                                             | https://docs.salla.dev/1243992f0.md  |
| Store Scopes                                         | https://docs.salla.dev/15104922e0.md |
| Branches                                             | https://docs.salla.dev/841803f0.md   |
| Branches Allocations                                 | https://docs.salla.dev/4145150f0.md  |
| Branch Delivery Zones                                | https://docs.salla.dev/5101844f0.md  |
| Employees                                            | https://docs.salla.dev/841813f0.md   |
| SEO                                                  | https://docs.salla.dev/841815f0.md   |
| DNS Records                                          | https://docs.salla.dev/841810f0.md   |
| Custom URLs                                          | https://docs.salla.dev/2108762f0.md  |
| Webhooks (resource ref; management → salla-webhooks) | https://docs.salla.dev/841782f0.md   |

## Shipment Integration

| Resource                   | Landing doc                         |
| -------------------------- | ----------------------------------- |
| Shipments                  | https://docs.salla.dev/841806f0.md  |
| Shipping Companies         | https://docs.salla.dev/841807f0.md  |
| Shipping Zones             | https://docs.salla.dev/841809f0.md  |
| Shipping Routes            | https://docs.salla.dev/4399607f0.md |
| Shipping Delivery Promises | https://docs.salla.dev/7639454f0.md |

## Financial Management

| Resource     | Landing doc                         |
| ------------ | ----------------------------------- |
| Payments     | https://docs.salla.dev/841791f0.md  |
| Taxes        | https://docs.salla.dev/841784f0.md  |
| Transactions | https://docs.salla.dev/1826632f0.md |
| Settlements  | https://docs.salla.dev/1973350f0.md |

## Localization

| Resource   | Landing doc                          |
| ---------- | ------------------------------------ |
| Countries  | https://docs.salla.dev/841804f0.md   |
| Cities     | https://docs.salla.dev/841805f0.md   |
| Districts  | https://docs.salla.dev/21655021e0.md |
| Currencies | https://docs.salla.dev/841812f0.md   |
| Languages  | https://docs.salla.dev/841811f0.md   |

> `Languages` supplies the `iso_code` values used in `Accept-Language` / `Content-Language`
> headers — see SKILL.md Step 2 (multi-language).

## Merchant Identity & Cart

| Resource        | Landing doc                         |
| --------------- | ----------------------------------- |
| Merchant        | https://docs.salla.dev/841814f0.md  |
| User Info       | https://docs.salla.dev/9466620e0.md |
| Store Info      | https://docs.salla.dev/5394261e0.md |
| Abandoned Carts | https://docs.salla.dev/841783f0.md  |
