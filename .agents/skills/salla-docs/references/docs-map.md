# Salla Docs Map — categorized reference index

> **Starting point, not a registry.** Each entry is `title → https://docs.salla.dev/<id>.md → method` (method shown only where the index publishes one). Handles are stable but **can be renumbered or moved** — always fetch the live page; if one **404s, relocate** it from a scoped entry point or `docs.salla.dev/llms.txt` (see `SKILL.md` §4). Read the inline OpenAPI (` ```yaml `) block on a page as the source of truth for field names, types, enums, and required fields.

Groups and names mirror the docs index exactly. **Webhooks is a top-level group** (Overview, API Management, Event References). Admin API resources are grouped as **"Merchant APIs / <resource>"**.

## Platform basics

| Title                   | Link                               |
| ----------------------- | ---------------------------------- |
| Welcome 👋              | https://docs.salla.dev/426392m0.md |
| Get Started             | https://docs.salla.dev/421117m0.md |
| Create Your First App   | https://docs.salla.dev/439059m0.md |
| Authorization           | https://docs.salla.dev/421118m0.md |
| Conditional Webhooks    | https://docs.salla.dev/421120m0.md |
| Security Considerations | https://docs.salla.dev/421121m0.md |
| Multi-Language Support  | https://docs.salla.dev/421122m0.md |
| Responses               | https://docs.salla.dev/421123m0.md |
| Pagination              | https://docs.salla.dev/421124m0.md |
| Rate Limiting           | https://docs.salla.dev/421125m0.md |
| Versioning              | https://docs.salla.dev/421126m0.md |
| Change Log              | https://docs.salla.dev/421127m0.md |
| Support                 | https://docs.salla.dev/421128m0.md |

## Webhooks

| Title                | Link                               |
| -------------------- | ---------------------------------- |
| Webhooks Overview    | https://docs.salla.dev/421119m0.md |
| Conditional Webhooks | https://docs.salla.dev/421120m0.md |

### Webhooks / API Management

| Title                | Link                                 | Method |
| -------------------- | ------------------------------------ | ------ |
| Webhooks             | https://docs.salla.dev/841782f0.md   |        |
| Register Webhook     | https://docs.salla.dev/5394134e0.md  |        |
| Update Webhook       | https://docs.salla.dev/10312606e0.md |        |
| List Active Webhooks | https://docs.salla.dev/5394135e0.md  |        |
| List Events          | https://docs.salla.dev/5394136e0.md  |        |
| Deactivate Webhook   | https://docs.salla.dev/5394137e0.md  |        |

### Webhooks / Event References

| Title                  | Link                                |
| ---------------------- | ----------------------------------- |
| Order                  | https://docs.salla.dev/433804m0.md  |
| Product                | https://docs.salla.dev/433805m0.md  |
| Shippings              | https://docs.salla.dev/433806m0.md  |
| Shipments              | https://docs.salla.dev/433807m0.md  |
| Customer               | https://docs.salla.dev/433808m0.md  |
| Category               | https://docs.salla.dev/433809m0.md  |
| Brand                  | https://docs.salla.dev/433810m0.md  |
| Store                  | https://docs.salla.dev/433811m0.md  |
| Cart                   | https://docs.salla.dev/433812m0.md  |
| Invoice                | https://docs.salla.dev/433813m0.md  |
| Special Offer          | https://docs.salla.dev/433814m0.md  |
| Miscellaneous          | https://docs.salla.dev/433815m0.md  |
| Communication Webhooks | https://docs.salla.dev/1380572m0.md |

## Apps

| Title                 | Link                               |
| --------------------- | ---------------------------------- |
| Get Started           | https://docs.salla.dev/421412m0.md |
| Create Your First App | https://docs.salla.dev/421410m0.md |
| App Events            | https://docs.salla.dev/421413m0.md |

## App Details Builder _(deferred — per project decision; listed but not in active use)_

| Title                       | Link                                |
| --------------------------- | ----------------------------------- |
| Get Started (deferred)      | https://docs.salla.dev/1524263m0.md |
| App Information (deferred)  | https://docs.salla.dev/1524264m0.md |
| App Features (deferred)     | https://docs.salla.dev/1524265m0.md |
| App Reviews (deferred)      | https://docs.salla.dev/1524267m0.md |
| App Contact Info (deferred) | https://docs.salla.dev/1524268m0.md |
| App Brands (deferred)       | https://docs.salla.dev/1524269m0.md |
| App FAQ (deferred)          | https://docs.salla.dev/1524270m0.md |
| App Statistics (deferred)   | https://docs.salla.dev/1524271m0.md |

## App Settings

| Title               | Link                                | Method |
| ------------------- | ----------------------------------- | ------ |
| App Setting Details | https://docs.salla.dev/5401096e0.md | GET    |
| Update App Settings | https://docs.salla.dev/5401097e0.md | POST   |

## App Subscriptions

| Title                       | Link                                | Method |
| --------------------------- | ----------------------------------- | ------ |
| App Subscription Details    | https://docs.salla.dev/5401098e0.md | GET    |
| Update Subscription Balance | https://docs.salla.dev/5401099e0.md | POST   |

## App Functions

| Title                   | Link                                |
| ----------------------- | ----------------------------------- |
| Welcome 👋              | https://docs.salla.dev/1726817m0.md |
| What are App Functions? | https://docs.salla.dev/1726814m0.md |
| Get Started             | https://docs.salla.dev/1726815m0.md |
| Supported Events        | https://docs.salla.dev/1726818m0.md |
| Testing                 | https://docs.salla.dev/1726816m0.md |
| Responses               | https://docs.salla.dev/1758222m0.md |
| NodeJs Support          | https://docs.salla.dev/1769435m0.md |

### App Functions / Merchants Events

| Title                   | Link                                |
| ----------------------- | ----------------------------------- |
| Invoice Events          | https://docs.salla.dev/1726824m0.md |
| Shipping Zone Events    | https://docs.salla.dev/1726826m0.md |
| Category Events         | https://docs.salla.dev/1726827m0.md |
| Special Offer Events    | https://docs.salla.dev/1726828m0.md |
| Customer Events         | https://docs.salla.dev/1726829m0.md |
| Store Branch Events     | https://docs.salla.dev/1726831m0.md |
| Shipping Company Events | https://docs.salla.dev/1726832m0.md |
| Review Events           | https://docs.salla.dev/1726833m0.md |
| Shipment Events         | https://docs.salla.dev/1726835m0.md |
| Cart Events             | https://docs.salla.dev/1726838m0.md |
| Brand Events            | https://docs.salla.dev/1726834m0.md |
| Order Events            | https://docs.salla.dev/1894252m0.md |
| Communication Events    | https://docs.salla.dev/1740884m0.md |

### App Functions / Customers Events

| Title                     | Link                                |
| ------------------------- | ----------------------------------- |
| Cart & Checkout Events    | https://docs.salla.dev/1726822m0.md |
| Account Events            | https://docs.salla.dev/1726819m0.md |
| Product Events            | https://docs.salla.dev/1726820m0.md |
| Promotion & Coupon Events | https://docs.salla.dev/1726821m0.md |
| Wishlist Events           | https://docs.salla.dev/1726823m0.md |

## Merchant APIs

### Merchant APIs / Orders

| Title                | Link                                 |
| -------------------- | ------------------------------------ |
| Create Order         | https://docs.salla.dev/5394145e0.md  |
| Relocate Order Stock | https://docs.salla.dev/18575329e0.md |
| External Orders      | https://docs.salla.dev/26871758e0.md |
| List Orders          | https://docs.salla.dev/5394146e0.md  |
| Order Details        | https://docs.salla.dev/5394147e0.md  |
| Create Drafted Order | https://docs.salla.dev/5750257e0.md  |
| Update Order         | https://docs.salla.dev/5751605e0.md  |
| Duplicate Order      | https://docs.salla.dev/7102947e0.md  |
| Order Actions        | https://docs.salla.dev/7549669e0.md  |

### Merchant APIs / Order Status

| Title                       | Link                                |
| --------------------------- | ----------------------------------- |
| Order Status                | https://docs.salla.dev/841786f0.md  |
| Update Order Status         | https://docs.salla.dev/5394148e0.md |
| Create Custom Order Status  | https://docs.salla.dev/5394149e0.md |
| List Order Statuses         | https://docs.salla.dev/5394150e0.md |
| Order Status Details        | https://docs.salla.dev/5394151e0.md |
| Update Custom Order Status  | https://docs.salla.dev/5394152e0.md |
| Update Bulk Orders Statuses | https://docs.salla.dev/5588886e0.md |
| Sort Orders Statuses        | https://docs.salla.dev/5607770e0.md |

### Merchant APIs / Order Histories

| Title                | Link                                |
| -------------------- | ----------------------------------- |
| Order Histories      | https://docs.salla.dev/841790f0.md  |
| List Order Histories | https://docs.salla.dev/5394162e0.md |
| Create Order History | https://docs.salla.dev/5394163e0.md |

### Merchant APIs / Order Options

| Title                | Link                                 |
| -------------------- | ------------------------------------ |
| Order Options        | https://docs.salla.dev/841787f0.md   |
| Create Order Option  | https://docs.salla.dev/5394153e0.md  |
| Update Order Option  | https://docs.salla.dev/12918611e0.md |
| List Order Options   | https://docs.salla.dev/5394154e0.md  |
| Delete Order Options | https://docs.salla.dev/5394155e0.md  |
| Order Option Details | https://docs.salla.dev/13121125e0.md |

### Merchant APIs / Order Assignment

| Title                            | Link                                |
| -------------------------------- | ----------------------------------- |
| Order Assignment                 | https://docs.salla.dev/889079f0.md  |
| List Auto Assignment Rules       | https://docs.salla.dev/5576999e0.md |
| Update Auto Assignment Rule      | https://docs.salla.dev/5581833e0.md |
| Create Auto Assignment Rules     | https://docs.salla.dev/5677301e0.md |
| Order Assigned Employees Details | https://docs.salla.dev/6930855e0.md |

### Merchant APIs / Order Invoice

| Title                | Link                                |
| -------------------- | ----------------------------------- |
| Order Invoice        | https://docs.salla.dev/841788f0.md  |
| Create Invoice       | https://docs.salla.dev/5394156e0.md |
| List Invoices        | https://docs.salla.dev/5394157e0.md |
| Invoice Details      | https://docs.salla.dev/5394158e0.md |
| Send Order Invoice   | https://docs.salla.dev/6336820e0.md |
| Create Order Invoice | https://docs.salla.dev/6339631e0.md |

### Merchant APIs / Order Reservations

| Title                   | Link                                |
| ----------------------- | ----------------------------------- |
| Order Reservations      | https://docs.salla.dev/889863f0.md  |
| List Order Reservations | https://docs.salla.dev/5579097e0.md |

### Merchant APIs / Order Items

| Title               | Link                                 |
| ------------------- | ------------------------------------ |
| Order Items         | https://docs.salla.dev/886364f0.md   |
| List Order Items    | https://docs.salla.dev/5565737e0.md  |
| Create Order Item   | https://docs.salla.dev/5751402e0.md  |
| Update Order Item   | https://docs.salla.dev/5751555e0.md  |
| Delete Order Item   | https://docs.salla.dev/5751557e0.md  |
| Attach Digital Item | https://docs.salla.dev/37566838e0.md |

### Merchant APIs / Products

| Title                       | Link                                |
| --------------------------- | ----------------------------------- |
| Create Product              | https://docs.salla.dev/5394167e0.md |
| List Products               | https://docs.salla.dev/5394168e0.md |
| Product Details             | https://docs.salla.dev/5394169e0.md |
| Update Product              | https://docs.salla.dev/5394170e0.md |
| Delete Product              | https://docs.salla.dev/5394171e0.md |
| Change Product Status       | https://docs.salla.dev/5394172e0.md |
| Product Details By SKU      | https://docs.salla.dev/5394173e0.md |
| Update Product By SKU       | https://docs.salla.dev/5394174e0.md |
| Delete Product By SKU       | https://docs.salla.dev/5394175e0.md |
| Update Product Price By SKU | https://docs.salla.dev/5394176e0.md |
| Update Bulk Product Prices  | https://docs.salla.dev/5394177e0.md |
| Import Products             | https://docs.salla.dev/5394178e0.md |
| Bulk Product Actions        | https://docs.salla.dev/9613153e0.md |

### Merchant APIs / Product Tags

| Title              | Link                                |
| ------------------ | ----------------------------------- |
| Product Tags       | https://docs.salla.dev/841793f0.md  |
| Create Product Tag | https://docs.salla.dev/5394179e0.md |
| List Product Tags  | https://docs.salla.dev/5394180e0.md |

### Merchant APIs / Product Options

| Title                  | Link                                |
| ---------------------- | ----------------------------------- |
| Product Options        | https://docs.salla.dev/841797f0.md  |
| Create Product Option  | https://docs.salla.dev/5394194e0.md |
| Product Option Details | https://docs.salla.dev/5394195e0.md |
| Update Product Option  | https://docs.salla.dev/5394196e0.md |
| Delete Product Option  | https://docs.salla.dev/5394197e0.md |

### Merchant APIs / Product Images

| Title                | Link                                |
| -------------------- | ----------------------------------- |
| Product Images       | https://docs.salla.dev/841795f0.md  |
| Attach Image by SKU  | https://docs.salla.dev/5394184e0.md |
| Attach Video by SKU  | https://docs.salla.dev/5394185e0.md |
| Attach Youtube Video | https://docs.salla.dev/5394186e0.md |
| Attach Image         | https://docs.salla.dev/5394187e0.md |
| Update Image         | https://docs.salla.dev/5394188e0.md |
| Delete Image         | https://docs.salla.dev/5394189e0.md |

### Merchant APIs / Product Option Values

| Title                        | Link                                |
| ---------------------------- | ----------------------------------- |
| Product Option Values        | https://docs.salla.dev/841798f0.md  |
| Create Product Option Value  | https://docs.salla.dev/5394198e0.md |
| Product Option Value Details | https://docs.salla.dev/5394199e0.md |
| Update Product Option Value  | https://docs.salla.dev/5394200e0.md |
| Delete Product Option Value  | https://docs.salla.dev/5394201e0.md |

### Merchant APIs / Digitals Product

| Title               | Link                                |
| ------------------- | ----------------------------------- |
| Digitals Product    | https://docs.salla.dev/841794f0.md  |
| Attach Digital Code | https://docs.salla.dev/5394181e0.md |
| Attach Digital File | https://docs.salla.dev/5394182e0.md |
| Delete Digital File | https://docs.salla.dev/5394183e0.md |

### Merchant APIs / Product Quantity

| Title                        | Link                                 |
| ---------------------------- | ------------------------------------ |
| Update Bulk Quantities       | https://docs.salla.dev/5394192e0.md  |
| List Product Quantities      | https://docs.salla.dev/9612796e0.md  |
| List Quantity Change Reasons | https://docs.salla.dev/10094923e0.md |
| List Quantity Audit          | https://docs.salla.dev/9613070e0.md  |

### Merchant APIs / Product Variants

| Title                           | Link                                |
| ------------------------------- | ----------------------------------- |
| Product Variants                | https://docs.salla.dev/841799f0.md  |
| List Product Variants           | https://docs.salla.dev/5394202e0.md |
| Product Variant Details         | https://docs.salla.dev/5394203e0.md |
| Update Product Variant          | https://docs.salla.dev/5394204e0.md |
| Update Product Variant Quantity | https://docs.salla.dev/5394205e0.md |

### Merchant APIs / Customers

| Title            | Link                                |
| ---------------- | ----------------------------------- |
| Customers        | https://docs.salla.dev/841780f0.md  |
| Create Customer  | https://docs.salla.dev/5394120e0.md |
| List Customers   | https://docs.salla.dev/5394121e0.md |
| Customer Details | https://docs.salla.dev/5394122e0.md |
| Update Customer  | https://docs.salla.dev/5394123e0.md |
| Delete Customer  | https://docs.salla.dev/5394124e0.md |
| Ban Customer     | https://docs.salla.dev/5394125e0.md |
| Un-Ban customer  | https://docs.salla.dev/5394126e0.md |
| Import Customers | https://docs.salla.dev/5394127e0.md |

### Merchant APIs / Customer Groups

| Title                           | Link                                |
| ------------------------------- | ----------------------------------- |
| Customer Groups                 | https://docs.salla.dev/841781f0.md  |
| Create Customer Group           | https://docs.salla.dev/5394128e0.md |
| List Customer Groups            | https://docs.salla.dev/5394129e0.md |
| Add Customers To Group Customer | https://docs.salla.dev/5394130e0.md |
| Update Default Customer Group   | https://docs.salla.dev/5394131e0.md |
| Update Customer Group           | https://docs.salla.dev/5394132e0.md |
| Delete Customer Group           | https://docs.salla.dev/5394133e0.md |

### Merchant APIs / Customer Wallet

| Title                | Link                                 |
| -------------------- | ------------------------------------ |
| Customer Wallet      | https://docs.salla.dev/5737562f0.md  |
| Deposit to Wallet    | https://docs.salla.dev/24839928e0.md |
| Withdraw from Wallet | https://docs.salla.dev/24850516e0.md |

### Merchant APIs / Abandoned Carts

| Title                  | Link                                |
| ---------------------- | ----------------------------------- |
| Abandoned Carts        | https://docs.salla.dev/841783f0.md  |
| List Abandoned Carts   | https://docs.salla.dev/5394138e0.md |
| Abandoned Cart Details | https://docs.salla.dev/5394139e0.md |

### Merchant APIs / Special Offers

| Title                       | Link                                |
| --------------------------- | ----------------------------------- |
| Special Offers              | https://docs.salla.dev/841802f0.md  |
| Create Special Offer        | https://docs.salla.dev/5394217e0.md |
| List Special Offers         | https://docs.salla.dev/5394218e0.md |
| Special Offer Details       | https://docs.salla.dev/5394219e0.md |
| Update Special Offer        | https://docs.salla.dev/5394220e0.md |
| Delete Special Offer        | https://docs.salla.dev/5394221e0.md |
| Change Special Offer Status | https://docs.salla.dev/5394222e0.md |

### Merchant APIs / Affiliates

| Title                | Link                                 |
| -------------------- | ------------------------------------ |
| Affiliates           | https://docs.salla.dev/841817f0.md   |
| Create Affiliate     | https://docs.salla.dev/5394269e0.md  |
| List Affiliates      | https://docs.salla.dev/5394270e0.md  |
| Affiliate Details    | https://docs.salla.dev/5394271e0.md  |
| List Affiliate Links | https://docs.salla.dev/13902666e0.md |
| Update Affiliate     | https://docs.salla.dev/5394272e0.md  |
| Delete Affiliate     | https://docs.salla.dev/5394273e0.md  |

### Merchant APIs / Coupons

| Title                     | Link                                 |
| ------------------------- | ------------------------------------ |
| Coupons                   | https://docs.salla.dev/841818f0.md   |
| Coupon Statistics Details | https://docs.salla.dev/35525609e0.md |
| Create Coupon             | https://docs.salla.dev/5394274e0.md  |
| List Coupons              | https://docs.salla.dev/5394275e0.md  |
| Coupon Details            | https://docs.salla.dev/5394276e0.md  |
| Update Coupon             | https://docs.salla.dev/5394277e0.md  |
| Delete Coupon             | https://docs.salla.dev/5394278e0.md  |
| List Coupon Codes         | https://docs.salla.dev/9185252e0.md  |

### Merchant APIs / Reviews

| Title          | Link                                 |
| -------------- | ------------------------------------ |
| Reviews        | https://docs.salla.dev/3672516f0.md  |
| List Reviews   | https://docs.salla.dev/16603963e0.md |
| Review Details | https://docs.salla.dev/16603964e0.md |
| Update Review  | https://docs.salla.dev/16603966e0.md |

### Merchant APIs / Feedbacks

| Title                 | Link                                 |
| --------------------- | ------------------------------------ |
| Feedbacks             | https://docs.salla.dev/841819f0.md   |
| List Feedbacks        | https://docs.salla.dev/5394279e0.md  |
| Feedback Details      | https://docs.salla.dev/5394280e0.md  |
| Update Feedback       | https://docs.salla.dev/5394281e0.md  |
| Store Feedback        | https://docs.salla.dev/12250711e0.md |
| Feedback Reply        | https://docs.salla.dev/11160591e0.md |
| Update Feedback Reply | https://docs.salla.dev/11160744e0.md |

### Merchant APIs / Branches

| Title          | Link                                |
| -------------- | ----------------------------------- |
| Branches       | https://docs.salla.dev/841803f0.md  |
| Create Branch  | https://docs.salla.dev/5394223e0.md |
| List Branches  | https://docs.salla.dev/5394224e0.md |
| Branch Details | https://docs.salla.dev/5394225e0.md |
| Update Branch  | https://docs.salla.dev/5394226e0.md |
| Delete Branch  | https://docs.salla.dev/5394227e0.md |

### Merchant APIs / Branches Allocations

| Title                       | Link                                 |
| --------------------------- | ------------------------------------ |
| Branches Allocations        | https://docs.salla.dev/4145150f0.md  |
| List Branches Allocations   | https://docs.salla.dev/18495252e0.md |
| Create Branches Allocations | https://docs.salla.dev/18495510e0.md |
| Update Branches Allocations | https://docs.salla.dev/18495548e0.md |
| Delete Branches Allocations | https://docs.salla.dev/18495551e0.md |
| Branch Allocation Details   | https://docs.salla.dev/18877324e0.md |
| Allocation Branch Settings  | https://docs.salla.dev/22349439e0.md |

### Merchant APIs / Shipments

| Title                   | Link                                |
| ----------------------- | ----------------------------------- |
| Shipments               | https://docs.salla.dev/841806f0.md  |
| Create Shipment         | https://docs.salla.dev/5394231e0.md |
| List Shipments          | https://docs.salla.dev/5394232e0.md |
| Update Shipment Details | https://docs.salla.dev/5394233e0.md |
| Shipment Details        | https://docs.salla.dev/5394234e0.md |
| Cancel Shipment         | https://docs.salla.dev/5394235e0.md |
| Return Shipment         | https://docs.salla.dev/5394236e0.md |
| Shipment Tracking       | https://docs.salla.dev/5394237e0.md |

### Merchant APIs / Shipping Companies

| Title                    | Link                                |
| ------------------------ | ----------------------------------- |
| Shipping Companies       | https://docs.salla.dev/841807f0.md  |
| Create Shipping Company  | https://docs.salla.dev/5394238e0.md |
| Shipping Company Options | https://docs.salla.dev/8817101e0.md |
| List Shipping Companies  | https://docs.salla.dev/5394239e0.md |
| Shipping Company Details | https://docs.salla.dev/5394240e0.md |
| Update Shipping Company  | https://docs.salla.dev/5394241e0.md |
| Delete Shipping Company  | https://docs.salla.dev/5394242e0.md |
| List Estimate Rates      | https://docs.salla.dev/6899590e0.md |

### Merchant APIs / Shipping Zones

| Title                 | Link                                |
| --------------------- | ----------------------------------- |
| Shipping Zones        | https://docs.salla.dev/841809f0.md  |
| Create Shipping Zone  | https://docs.salla.dev/5394246e0.md |
| List Shipping Zones   | https://docs.salla.dev/5394247e0.md |
| Shipping Zone Details | https://docs.salla.dev/5394248e0.md |
| Update Shipping Zone  | https://docs.salla.dev/5394249e0.md |
| Delete Shipping Zone  | https://docs.salla.dev/5394250e0.md |

### Merchant APIs / Shipping Routes

| Title           | Link                                 |
| --------------- | ------------------------------------ |
| Shipping Routes | https://docs.salla.dev/4399607f0.md  |
| Routes List     | https://docs.salla.dev/19357016e0.md |
| Route Details   | https://docs.salla.dev/19357556e0.md |
| Create Route    | https://docs.salla.dev/19358856e0.md |
| Update Route    | https://docs.salla.dev/19370925e0.md |
| Default Route   | https://docs.salla.dev/19370978e0.md |
| Delete Route    | https://docs.salla.dev/19371255e0.md |

### Merchant APIs / Countries, Cities, Districts

| Title           | Link                                 |
| --------------- | ------------------------------------ |
| Countries       | https://docs.salla.dev/841804f0.md   |
| List Countries  | https://docs.salla.dev/5394228e0.md  |
| Country Details | https://docs.salla.dev/5394229e0.md  |
| Cities          | https://docs.salla.dev/841805f0.md   |
| List Cities     | https://docs.salla.dev/5394230e0.md  |
| List Districts  | https://docs.salla.dev/21655021e0.md |

### Merchant APIs / Categories

| Title                  | Link                                 |
| ---------------------- | ------------------------------------ |
| Categories             | https://docs.salla.dev/841800f0.md   |
| Create Category        | https://docs.salla.dev/5394206e0.md  |
| List Categories        | https://docs.salla.dev/5394207e0.md  |
| Category Details       | https://docs.salla.dev/5394208e0.md  |
| Update Category        | https://docs.salla.dev/5394209e0.md  |
| Delete Category        | https://docs.salla.dev/5394210e0.md  |
| Category Children      | https://docs.salla.dev/5394211e0.md  |
| Categories Search      | https://docs.salla.dev/10309545e0.md |
| List Category Products | https://docs.salla.dev/11055135e0.md |

### Merchant APIs / Brands

| Title         | Link                                |
| ------------- | ----------------------------------- |
| Brands        | https://docs.salla.dev/841801f0.md  |
| Create Brand  | https://docs.salla.dev/5394212e0.md |
| List Brands   | https://docs.salla.dev/5394213e0.md |
| Brand Details | https://docs.salla.dev/5394214e0.md |
| Update Brand  | https://docs.salla.dev/5394215e0.md |
| Delete Brand  | https://docs.salla.dev/5394216e0.md |

### Merchant APIs / Settings

| Title               | Link                                |
| ------------------- | ----------------------------------- |
| Settings            | https://docs.salla.dev/1243992f0.md |
| Settings List       | https://docs.salla.dev/6965777e0.md |
| Update Setting Slug | https://docs.salla.dev/6965780e0.md |
| Setting Details     | https://docs.salla.dev/6965781e0.md |

### Merchant APIs / Store Scopes

| Title               | Link                                 |
| ------------------- | ------------------------------------ |
| List Store Scopes   | https://docs.salla.dev/15104922e0.md |
| Store Scope Details | https://docs.salla.dev/15107150e0.md |

### Merchant APIs / Exports

| Title                  | Link                                 |
| ---------------------- | ------------------------------------ |
| Export Orders          | https://docs.salla.dev/5590305e0.md  |
| Exports Logs           | https://docs.salla.dev/10753343e0.md |
| List Export Templates  | https://docs.salla.dev/5593165e0.md  |
| Create Export Template | https://docs.salla.dev/5593686e0.md  |
| Update Export Template | https://docs.salla.dev/5593689e0.md  |
| Delete Export Template | https://docs.salla.dev/5593835e0.md  |
| List Export Columns    | https://docs.salla.dev/5607986e0.md  |
| Export Customers       | https://docs.salla.dev/10774701e0.md |
| Export Custom URLs     | https://docs.salla.dev/10393831e0.md |
| Export Products        | https://docs.salla.dev/9796006e0.md  |

### Merchant APIs / Transactions

| Title                     | Link                                 |
| ------------------------- | ------------------------------------ |
| Transactions              | https://docs.salla.dev/1826632f0.md  |
| List Transactions         | https://docs.salla.dev/8382471e0.md  |
| Transaction Details       | https://docs.salla.dev/8385183e0.md  |
| Print Transaction Invoice | https://docs.salla.dev/11716492e0.md |
| Update Transaction        | https://docs.salla.dev/8385232e0.md  |

### Merchant APIs / Payments

| Title                     | Link                                |
| ------------------------- | ----------------------------------- |
| Payments                  | https://docs.salla.dev/841791f0.md  |
| Available Payment Methods | https://docs.salla.dev/5394164e0.md |
| List Banks                | https://docs.salla.dev/5394165e0.md |
| Payment Bank Details      | https://docs.salla.dev/5394166e0.md |

### Merchant APIs / Currencies

| Title                     | Link                                |
| ------------------------- | ----------------------------------- |
| Currencies                | https://docs.salla.dev/841812f0.md  |
| Activate Currencies       | https://docs.salla.dev/5394256e0.md |
| List Currencies           | https://docs.salla.dev/5394257e0.md |
| List Available Currencies | https://docs.salla.dev/5394258e0.md |

### Merchant APIs / Merchant

| Title                    | Link                                |
| ------------------------ | ----------------------------------- |
| Merchant                 | https://docs.salla.dev/841814f0.md  |
| User Information Details | https://docs.salla.dev/9466620e0.md |
| Store Information        | https://docs.salla.dev/5394261e0.md |

### Merchant APIs / Taxes

| Title       | Link                                |
| ----------- | ----------------------------------- |
| Taxes       | https://docs.salla.dev/841784f0.md  |
| Create Tax  | https://docs.salla.dev/5394140e0.md |
| List Taxes  | https://docs.salla.dev/5394141e0.md |
| Tax Details | https://docs.salla.dev/5394142e0.md |
| Update Tax  | https://docs.salla.dev/5394143e0.md |
| Delete Tax  | https://docs.salla.dev/5394144e0.md |

### Merchant APIs / SEO

| Title               | Link                                |
| ------------------- | ----------------------------------- |
| SEO                 | https://docs.salla.dev/841815f0.md  |
| List SEO Settings   | https://docs.salla.dev/5394262e0.md |
| Update SEO Settings | https://docs.salla.dev/5394263e0.md |

### Merchant APIs / DNS Records

| Title             | Link                                |
| ----------------- | ----------------------------------- |
| DNS Records       | https://docs.salla.dev/841810f0.md  |
| List DNS Records  | https://docs.salla.dev/5394251e0.md |
| Create DNS Record | https://docs.salla.dev/5394252e0.md |
| Delete DNS Record | https://docs.salla.dev/5394253e0.md |

### Merchant APIs / Languages

| Title           | Link                                |
| --------------- | ----------------------------------- |
| Languages       | https://docs.salla.dev/841811f0.md  |
| Add Language    | https://docs.salla.dev/5394254e0.md |
| List Languages  | https://docs.salla.dev/5738815e0.md |
| Update Language | https://docs.salla.dev/5738833e0.md |

### Merchant APIs / Employees

| Title          | Link                                |
| -------------- | ----------------------------------- |
| Employees      | https://docs.salla.dev/841813f0.md  |
| List Employees | https://docs.salla.dev/5394259e0.md |

### Merchant APIs / Advertisements

| Title                 | Link                                |
| --------------------- | ----------------------------------- |
| Advertisements        | https://docs.salla.dev/841816f0.md  |
| Create Advertisement  | https://docs.salla.dev/5394264e0.md |
| List Advertisements   | https://docs.salla.dev/5394265e0.md |
| Advertisement Details | https://docs.salla.dev/5394266e0.md |
| Update Advertisement  | https://docs.salla.dev/5394267e0.md |
| Delete Advertisement  | https://docs.salla.dev/5394268e0.md |

### Merchant APIs / Custom URLs

| Title              | Link                                 |
| ------------------ | ------------------------------------ |
| Custom URLs        | https://docs.salla.dev/2108762f0.md  |
| Import Custom URLs | https://docs.salla.dev/10393771e0.md |

### Merchant APIs / Loyalty Points

| Title                          | Link                                 |
| ------------------------------ | ------------------------------------ |
| Loyalty Points                 | https://docs.salla.dev/2604936f0.md  |
| Customer Loyalty Points        | https://docs.salla.dev/12250577e0.md |
| Update Customer Loyalty Points | https://docs.salla.dev/12250579e0.md |

### Merchant APIs / Branch Delivery Zones

| Title                        | Link                                 |
| ---------------------------- | ------------------------------------ |
| Branch Delivery Zones        | https://docs.salla.dev/5101844f0.md  |
| List Branch Delivery Zones   | https://docs.salla.dev/22300545e0.md |
| Branch Delivery Zone Details | https://docs.salla.dev/22300546e0.md |
| Create Branch Delivery Zone  | https://docs.salla.dev/22300547e0.md |
| Update Branch Delivery Zone  | https://docs.salla.dev/22300548e0.md |
| Delete Branch Delivery Zone  | https://docs.salla.dev/22300549e0.md |

### Merchant APIs / Product Option Templates

| Title                    | Link                                |
| ------------------------ | ----------------------------------- |
| Product Option Templates | https://docs.salla.dev/1939470f0.md |
| List Option Templates    | https://docs.salla.dev/9633869e0.md |
| Option Template Details  | https://docs.salla.dev/9634609e0.md |
| Delete Option Template   | https://docs.salla.dev/9634526e0.md |
| Update Option Template   | https://docs.salla.dev/9634567e0.md |
| Create Option Template   | https://docs.salla.dev/9634676e0.md |

### Merchant APIs / Shipping Delivery Promises

| Title                      | Link                                 |
| -------------------------- | ------------------------------------ |
| Shipping Delivery Promises | https://docs.salla.dev/7639454f0.md  |
| List Delivery Promises     | https://docs.salla.dev/32231363e0.md |
| Delivery Promise Details   | https://docs.salla.dev/32232767e0.md |
| Update Delivery Promise    | https://docs.salla.dev/32233767e0.md |

## Storefront JS SDK

| Title         | Link                               |
| ------------- | ---------------------------------- |
| Overview      | https://docs.salla.dev/422610m0.md |
| Languages     | https://docs.salla.dev/422614m0.md |
| Notify        | https://docs.salla.dev/422615m0.md |
| Event         | https://docs.salla.dev/422611m0.md |
| Storage       | https://docs.salla.dev/422613m0.md |
| Configuration | https://docs.salla.dev/422612m0.md |
| Forms         | https://docs.salla.dev/422616m0.md |
| Helpers       | https://docs.salla.dev/422617m0.md |

### Storefront JS SDK / Auth

| Title    | Link                               |
| -------- | ---------------------------------- |
| Login    | https://docs.salla.dev/422618m0.md |
| Logout   | https://docs.salla.dev/422619m0.md |
| Verify   | https://docs.salla.dev/422620m0.md |
| Resend   | https://docs.salla.dev/422621m0.md |
| Register | https://docs.salla.dev/422623m0.md |
| Refresh  | https://docs.salla.dev/422624m0.md |

### Storefront JS SDK / Cart

| Title                    | Link                               |
| ------------------------ | ---------------------------------- |
| Latest                   | https://docs.salla.dev/422625m0.md |
| Delete Item              | https://docs.salla.dev/422630m0.md |
| Delete Image             | https://docs.salla.dev/422632m0.md |
| Add Coupon               | https://docs.salla.dev/422633m0.md |
| Remove Coupon            | https://docs.salla.dev/422634m0.md |
| Get Upload Image         | https://docs.salla.dev/422635m0.md |
| Get Quick Order Settings | https://docs.salla.dev/422636m0.md |
| Create Quick Order       | https://docs.salla.dev/422637m0.md |
| Order Status             | https://docs.salla.dev/422638m0.md |
| Get Current Cart Id      | https://docs.salla.dev/422639m0.md |
| Price Quote              | https://docs.salla.dev/422640m0.md |
| Quick Add                | https://docs.salla.dev/422628m0.md |
| Add Item                 | https://docs.salla.dev/422629m0.md |
| Details                  | https://docs.salla.dev/422626m0.md |

### Storefront JS SDK / Wishlist

| Title  | Link                               |
| ------ | ---------------------------------- |
| Add    | https://docs.salla.dev/422654m0.md |
| Remove | https://docs.salla.dev/422655m0.md |
| Toggle | https://docs.salla.dev/422656m0.md |

### Storefront JS SDK / Loyalty

| Title       | Link                               |
| ----------- | ---------------------------------- |
| Get Program | https://docs.salla.dev/422667m0.md |
| Exchange    | https://docs.salla.dev/422668m0.md |
| Reset       | https://docs.salla.dev/422669m0.md |

### Storefront JS SDK / Comment

| Title                | Link                               |
| -------------------- | ---------------------------------- |
| Add Comment          | https://docs.salla.dev/422681m0.md |
| Fetch                | https://docs.salla.dev/422682m0.md |
| Get Page Comments    | https://docs.salla.dev/422683m0.md |
| Get Product Comments | https://docs.salla.dev/422684m0.md |

### Storefront JS SDK / Profile

| Title          | Link                               |
| -------------- | ---------------------------------- |
| Update profile | https://docs.salla.dev/422685m0.md |
| Update contact | https://docs.salla.dev/422686m0.md |

### Storefront JS SDK / Product

| Title                | Link                               |
| -------------------- | ---------------------------------- |
| Get price            | https://docs.salla.dev/422641m0.md |
| Fetch Options        | https://docs.salla.dev/569578m0.md |
| Product availability | https://docs.salla.dev/422642m0.md |
| Categories           | https://docs.salla.dev/422645m0.md |
| Offer details        | https://docs.salla.dev/422643m0.md |
| Search products      | https://docs.salla.dev/422644m0.md |
| Get Gift Details     | https://docs.salla.dev/422646m0.md |
| Add Gift To Cart     | https://docs.salla.dev/422647m0.md |
| Upload Gift Image    | https://docs.salla.dev/422648m0.md |
| Get Product Details  | https://docs.salla.dev/422649m0.md |
| Fetch                | https://docs.salla.dev/422650m0.md |
| Size Guides          | https://docs.salla.dev/422651m0.md |

### Storefront JS SDK / Order

| Title                  | Link                               |
| ---------------------- | ---------------------------------- |
| Create cart from order | https://docs.salla.dev/422671m0.md |
| Cancel                 | https://docs.salla.dev/422672m0.md |
| Send invoice           | https://docs.salla.dev/422673m0.md |
| Show order             | https://docs.salla.dev/422674m0.md |

### Storefront JS SDK / Booking

| Title | Link                               |
| ----- | ---------------------------------- |
| Add   | https://docs.salla.dev/422687m0.md |

### Storefront JS SDK / Rating

| Title    | Link                               |
| -------- | ---------------------------------- |
| Order    | https://docs.salla.dev/422675m0.md |
| Store    | https://docs.salla.dev/422676m0.md |
| Products | https://docs.salla.dev/422677m0.md |
| Shipping | https://docs.salla.dev/422678m0.md |

### Storefront JS SDK / Currency

| Title  | Link                               |
| ------ | ---------------------------------- |
| Change | https://docs.salla.dev/422679m0.md |
| List   | https://docs.salla.dev/422680m0.md |

### Storefront JS SDK / Component

| Title   | Link                               |
| ------- | ---------------------------------- |
| Reviews | https://docs.salla.dev/705836m0.md |
| Menus   | https://docs.salla.dev/705835m0.md |

### Storefront JS SDK / Metadata

| Title            | Link                                |
| ---------------- | ----------------------------------- |
| Metadata Details | https://docs.salla.dev/2140337m0.md |

## UI Components

| Title                           | Link                                |
| ------------------------------- | ----------------------------------- |
| Overview                        | https://docs.salla.dev/422688m0.md  |
| Usage                           | https://docs.salla.dev/422689m0.md  |
| Components Customization        | https://docs.salla.dev/422690m0.md  |
| Predefined vs Bundle Components | https://docs.salla.dev/2140298m0.md |

### UI Components / Elements

| Title              | Link                                |
| ------------------ | ----------------------------------- |
| Conditional Fields | https://docs.salla.dev/422699m0.md  |
| Count Down         | https://docs.salla.dev/422701m0.md  |
| Filters            | https://docs.salla.dev/422704m0.md  |
| Infinite Scroll    | https://docs.salla.dev/422706m0.md  |
| List Tile          | https://docs.salla.dev/422708m0.md  |
| Loading            | https://docs.salla.dev/422709m0.md  |
| Map                | https://docs.salla.dev/422713m0.md  |
| Placeholder        | https://docs.salla.dev/422716m0.md  |
| Progress Bar       | https://docs.salla.dev/422723m0.md  |
| Rating Stars       | https://docs.salla.dev/422727m0.md  |
| Skeleton           | https://docs.salla.dev/422734m0.md  |
| Slider             | https://docs.salla.dev/422735m0.md  |
| Social Share       | https://docs.salla.dev/422736m0.md  |
| Tabs               | https://docs.salla.dev/422738m0.md  |
| Apps Icons         | https://docs.salla.dev/478518m0.md  |
| Breadcrumb         | https://docs.salla.dev/482370m0.md  |
| Social             | https://docs.salla.dev/499802m0.md  |
| Reviews            | https://docs.salla.dev/508226m0.md  |
| Reviews Summary    | https://docs.salla.dev/602149m0.md  |
| Color Picker       | https://docs.salla.dev/422696m0.md  |
| Modal              | https://docs.salla.dev/422714m0.md  |
| Sheet              | https://docs.salla.dev/422733m0.md  |
| Notifications      | https://docs.salla.dev/2125602m0.md |

### UI Components / Form

| Title             | Link                                |
| ----------------- | ----------------------------------- |
| Button            | https://docs.salla.dev/422694m0.md  |
| Date Time Picker  | https://docs.salla.dev/422702m0.md  |
| Tel Input         | https://docs.salla.dev/422739m0.md  |
| Select            | https://docs.salla.dev/422746m0.md  |
| File Upload       | https://docs.salla.dev/422703m0.md  |
| Menu              | https://docs.salla.dev/478492m0.md  |
| Bottom Alert      | https://docs.salla.dev/422693m0.md  |
| Contacts          | https://docs.salla.dev/478494m0.md  |
| Quantity Input    | https://docs.salla.dev/422724m0.md  |
| Edit Order Button | https://docs.salla.dev/2125600m0.md |

### UI Components / Product

| Title                   | Link                                |
| ----------------------- | ----------------------------------- |
| Product Card            | https://docs.salla.dev/422718m0.md  |
| Quick Buy               | https://docs.salla.dev/422725m0.md  |
| Meta Data               | https://docs.salla.dev/464599m0.md  |
| Payments                | https://docs.salla.dev/478374m0.md  |
| Comments                | https://docs.salla.dev/482455m0.md  |
| Orders                  | https://docs.salla.dev/508225m0.md  |
| Conditional Offer       | https://docs.salla.dev/537931m0.md  |
| Installment             | https://docs.salla.dev/422707m0.md  |
| Add Product             | https://docs.salla.dev/422692m0.md  |
| Gifting                 | https://docs.salla.dev/422705m0.md  |
| Offer                   | https://docs.salla.dev/440408m0.md  |
| Offer Modal             | https://docs.salla.dev/422715m0.md  |
| Product Availability    | https://docs.salla.dev/422717m0.md  |
| Products List           | https://docs.salla.dev/422719m0.md  |
| Product Options         | https://docs.salla.dev/422720m0.md  |
| Product Size Guide      | https://docs.salla.dev/422721m0.md  |
| Products Slider         | https://docs.salla.dev/422722m0.md  |
| Quick Order             | https://docs.salla.dev/422726m0.md  |
| Scopes                  | https://docs.salla.dev/422729m0.md  |
| Search                  | https://docs.salla.dev/422730m0.md  |
| Advertisement           | https://docs.salla.dev/478502m0.md  |
| Multiple Bundle Product | https://docs.salla.dev/2125601m0.md |
| Order Details           | https://docs.salla.dev/2125603m0.md |

### UI Components / User

| Title         | Link                               |
| ------------- | ---------------------------------- |
| Cart Summary  | https://docs.salla.dev/422695m0.md |
| User Menu     | https://docs.salla.dev/422740m0.md |
| User Profile  | https://docs.salla.dev/482367m0.md |
| Localization  | https://docs.salla.dev/422710m0.md |
| Login         | https://docs.salla.dev/422711m0.md |
| Loyalty       | https://docs.salla.dev/422712m0.md |
| Rating        | https://docs.salla.dev/422728m0.md |
| User Settings | https://docs.salla.dev/422741m0.md |
| Verify        | https://docs.salla.dev/422742m0.md |

## Component Bundle

| Title                       | Link                                |
| --------------------------- | ----------------------------------- |
| Getting Started             | https://docs.salla.dev/2140781m0.md |
| Directory Structure         | https://docs.salla.dev/2140782m0.md |
| Create Bundle               | https://docs.salla.dev/2140783m0.md |
| Setup Bundle                | https://docs.salla.dev/2140784m0.md |
| Publish Bundle              | https://docs.salla.dev/2140786m0.md |
| Publish Bundle Requirements | https://docs.salla.dev/2140789m0.md |

## Shipping Apps

| Title                    | Link                               |
| ------------------------ | ---------------------------------- |
| Getting Started          | https://docs.salla.dev/422988m0.md |
| Migration to the New API | https://docs.salla.dev/422989m0.md |
| Publish App              | https://docs.salla.dev/422990m0.md |
| Change Log               | https://docs.salla.dev/422992m0.md |

### Shipping Apps / Shipping Management

| Title      | Link                               |
| ---------- | ---------------------------------- |
| App Cycle  | https://docs.salla.dev/422994m0.md |
| Test App   | https://docs.salla.dev/422998m0.md |
| Create App | https://docs.salla.dev/422995m0.md |
| Setup App  | https://docs.salla.dev/422996m0.md |

### Shipping Apps / Order Fulfilment

| Title      | Link                               |
| ---------- | ---------------------------------- |
| App Cycle  | https://docs.salla.dev/423000m0.md |
| Setup App  | https://docs.salla.dev/423002m0.md |
| Test App   | https://docs.salla.dev/423003m0.md |
| Create App | https://docs.salla.dev/423001m0.md |

## Salla AWB

| Title               | Link                                |
| ------------------- | ----------------------------------- |
| Getting Started     | https://docs.salla.dev/1792089m0.md |
| Create Shipping App | https://docs.salla.dev/1792111m0.md |
| Setup Shipping App  | https://docs.salla.dev/1792112m0.md |

### Salla AWB / App Functions

| Title              | Link                                |
| ------------------ | ----------------------------------- |
| Shipment Creating  | https://docs.salla.dev/1792119m0.md |
| Shipment Cancelled | https://docs.salla.dev/1797616m0.md |

### Salla AWB / Generating AWB

| Title                  | Link                                |
| ---------------------- | ----------------------------------- |
| Shipment AWB           | https://docs.salla.dev/1797625m0.md |
| Shipment Return AWB    | https://docs.salla.dev/1797627m0.md |
| Shipment Cancelled AWB | https://docs.salla.dev/1797626m0.md |

## Shipping APIs

### Shipping APIs / Shipments

| Title                   | Link                                |
| ----------------------- | ----------------------------------- |
| Create Shipment         | https://docs.salla.dev/5578808e0.md |
| List Shipments          | https://docs.salla.dev/5578809e0.md |
| Update Shipment Details | https://docs.salla.dev/5578810e0.md |
| Shipment Details        | https://docs.salla.dev/5578811e0.md |
| Cancel Shipments        | https://docs.salla.dev/5578812e0.md |
| Return Shipments        | https://docs.salla.dev/5578813e0.md |
| Shipment Tracking       | https://docs.salla.dev/5578814e0.md |

### Shipping APIs / Shipping Companies

| Title                    | Link                                |
| ------------------------ | ----------------------------------- |
| List Shipping Companies  | https://docs.salla.dev/5578815e0.md |
| Shipping Company Details | https://docs.salla.dev/5578816e0.md |

### Shipping APIs / Shipping Routes

| Title         | Link                                 |
| ------------- | ------------------------------------ |
| Routes List   | https://docs.salla.dev/19665286e0.md |
| Route Details | https://docs.salla.dev/19665287e0.md |
| Create Route  | https://docs.salla.dev/19665288e0.md |
| Update Route  | https://docs.salla.dev/19665289e0.md |
| Default Route | https://docs.salla.dev/19665290e0.md |
| Delete Route  | https://docs.salla.dev/19665291e0.md |

## Communication App

| Title                         | Link                                |
| ----------------------------- | ----------------------------------- |
| Overview                      | https://docs.salla.dev/2006115m0.md |
| Get Started                   | https://docs.salla.dev/2006118m0.md |
| App Channels Configuration    | https://docs.salla.dev/2081234m0.md |
| Set Up Your Provider (Twillo) | https://docs.salla.dev/2081235m0.md |
| Build Your App Function       | https://docs.salla.dev/2081248m0.md |
| Test & Go Live                | https://docs.salla.dev/2081250m0.md |
| Event & Payload Reference     | https://docs.salla.dev/2006119m0.md |
| Examples                      | https://docs.salla.dev/2006120m0.md |

## Pixels

| Title           | Link                                |
| --------------- | ----------------------------------- |
| Overview        | https://docs.salla.dev/1724365m0.md |
| Getting Started | https://docs.salla.dev/1804446m0.md |
| Device Mode     | https://docs.salla.dev/1724504m0.md |
| Cloud Mode      | https://docs.salla.dev/1724667m0.md |
| Custom Events   | https://docs.salla.dev/2007114m0.md |

### Pixels / Device Mode Events

| Title                     | Link                                |
| ------------------------- | ----------------------------------- |
| Cart & Checkout Events    | https://docs.salla.dev/1804461m0.md |
| Product Events            | https://docs.salla.dev/1804467m0.md |
| Promotion & Coupon Events | https://docs.salla.dev/1804470m0.md |
| Wishlist Events           | https://docs.salla.dev/1804471m0.md |
| Account Events            | https://docs.salla.dev/1804481m0.md |

### Pixels / Cloud Mode Events

| Title                     | Link                                |
| ------------------------- | ----------------------------------- |
| Product Events            | https://docs.salla.dev/2140308m0.md |
| Cart & Checkout Events    | https://docs.salla.dev/2140309m0.md |
| Wishlist Events           | https://docs.salla.dev/2140310m0.md |
| Account Events            | https://docs.salla.dev/2144989m0.md |
| Promotion & Coupon Events | https://docs.salla.dev/2144990m0.md |

## Embedded SDK

| Title                  | Link                                                     |
| ---------------------- | -------------------------------------------------------- |
| Overview               | https://docs.salla.dev/embedded-sdk/overview.md          |
| Getting Started        | https://docs.salla.dev/1950922m0.md                      |
| Create an Embedded App | https://docs.salla.dev/embedded-sdk/create-app.md        |
| Authentication         | https://docs.salla.dev/embedded-sdk/authentication.md    |
| App Design Guidelines  | https://docs.salla.dev/embedded-sdk/design-guidelines.md |
| Installation           | https://docs.salla.dev/embedded-sdk/installation.md      |
| Playground             | https://docs.salla.dev/embedded-sdk/playground.md        |

### Embedded SDK / Auth Module

| Title             | Link                                                           |
| ----------------- | -------------------------------------------------------------- |
| Get Token         | https://docs.salla.dev/embedded-sdk/modules/auth/get-token.md  |
| Client Introspect | https://docs.salla.dev/embedded-sdk/modules/auth/introspect.md |
| Refresh Token     | https://docs.salla.dev/embedded-sdk/modules/auth/refresh.md    |

### Embedded SDK / Page Module

| Title              | Link                                                           |
| ------------------ | -------------------------------------------------------------- |
| External Redirects | https://docs.salla.dev/embedded-sdk/modules/page/redirects.md  |
| Navigation         | https://docs.salla.dev/embedded-sdk/modules/page/navigation.md |
| Set Page Title     | https://docs.salla.dev/embedded-sdk/modules/page/set-title.md  |

### Embedded SDK / Nav Module

| Title                        | Link                                                             |
| ---------------------------- | ---------------------------------------------------------------- |
| Create Navbar Action         | https://docs.salla.dev/embedded-sdk/modules/nav/create-action.md |
| Listen for Navbar Actions    | https://docs.salla.dev/embedded-sdk/modules/nav/listen.md        |
| Clearing Navbar Actions      | https://docs.salla.dev/embedded-sdk/modules/nav/clear.md         |
| Add Navbar Item              | https://docs.salla.dev/2134089m0.md                              |
| Update Navbar Item           | https://docs.salla.dev/2134090m0.md                              |
| Listen for Navbar Item Click | https://docs.salla.dev/2134093m0.md                              |
| Remove Navbar Item           | https://docs.salla.dev/2134091m0.md                              |

### Embedded SDK / UI Module

| Title               | Link                                                      |
| ------------------- | --------------------------------------------------------- |
| Confirm Dialogs     | https://docs.salla.dev/embedded-sdk/modules/ui/confirm.md |
| Toast Notifications | https://docs.salla.dev/embedded-sdk/modules/ui/toast.md   |
| Loading States      | https://docs.salla.dev/embedded-sdk/modules/ui/loading.md |
| Breadcrumbs         | https://docs.salla.dev/2134101m0.md                       |

### Embedded SDK / Checkout Module

| Title                        | Link                                                            |
| ---------------------------- | --------------------------------------------------------------- |
| Create Checkout              | https://docs.salla.dev/embedded-sdk/modules/checkout/create.md  |
| Get App Add-ons              | https://docs.salla.dev/embedded-sdk/modules/checkout/add-ons.md |
| Subscribe for Payment Result | https://docs.salla.dev/embedded-sdk/modules/checkout/result.md  |

### Embedded SDK / Endpoints

| Title            | Link                                 | Method |
| ---------------- | ------------------------------------ | ------ |
| Token Introspect | https://docs.salla.dev/27474794e0.md | POST   |

### Embedded SDK / Resources

| Title           | Link                                                     |
| --------------- | -------------------------------------------------------- |
| Support         | https://docs.salla.dev/embedded-sdk/resources/support.md |
| Common Examples | https://docs.salla.dev/2134103m0.md                      |

## Report Builder

| Title                                 | Link                                |
| ------------------------------------- | ----------------------------------- |
| Overview                              | https://docs.salla.dev/2140725m0.md |
| Getting Started                       | https://docs.salla.dev/2140726m0.md |
| JMESPath Tutorial                     | https://docs.salla.dev/2140727m0.md |
| Understanding the Report Lifecycle    | https://docs.salla.dev/2140728m0.md |
| Salla Reports Examples                | https://docs.salla.dev/2140729m0.md |
| Set up Store data using merchant APIs | https://docs.salla.dev/2140730m0.md |

### Report Builder / Report Types

| Title        | Link                                |
| ------------ | ----------------------------------- |
| Unit         | https://docs.salla.dev/2140743m0.md |
| Bar          | https://docs.salla.dev/2140744m0.md |
| Breakdown    | https://docs.salla.dev/2140745m0.md |
| Calendar     | https://docs.salla.dev/2140746m0.md |
| Distribution | https://docs.salla.dev/2140747m0.md |
| Pipe         | https://docs.salla.dev/2140748m0.md |
| Plot         | https://docs.salla.dev/2140753m0.md |
| Ranking      | https://docs.salla.dev/2140754m0.md |
| Summary      | https://docs.salla.dev/2140755m0.md |
| Agrid        | https://docs.salla.dev/2140756m0.md |

## App Onboarding

| Title                    | Link                                |
| ------------------------ | ----------------------------------- |
| Overview                 | https://docs.salla.dev/2137354m0.md |
| Get Started              | https://docs.salla.dev/2137359m0.md |
| Interfaces and Responses | https://docs.salla.dev/2137353m0.md |
| Example                  | https://docs.salla.dev/2137358m0.md |

## Headless Checkout

### Headless Checkout / Cart API

| Title          | Link                                |
| -------------- | ----------------------------------- |
| Overview       | https://docs.salla.dev/2129395m0.md |
| Authentication | https://docs.salla.dev/2129423m0.md |
| Key Concepts   | https://docs.salla.dev/2129424m0.md |
| Usage Flows    | https://docs.salla.dev/2129454m0.md |

### Headless Checkout / Cart

| Title                   | Link                                 | Method |
| ----------------------- | ------------------------------------ | ------ |
| Save guest cart data    | https://docs.salla.dev/35115149e0.md | POST   |
| Generate cart           | https://docs.salla.dev/34415064e0.md | POST   |
| Get cart                | https://docs.salla.dev/34415065e0.md | GET    |
| Assign cart to Customer | https://docs.salla.dev/34415066e0.md | POST   |
| Apply cart coupon       | https://docs.salla.dev/34415067e0.md | POST   |
| Remove cart coupon      | https://docs.salla.dev/34415068e0.md | DELETE |

### Headless Checkout / Cart Items

| Title            | Link                                 | Method |
| ---------------- | ------------------------------------ | ------ |
| Add cart item    | https://docs.salla.dev/34415069e0.md | POST   |
| Update cart item | https://docs.salla.dev/34415070e0.md | PATCH  |
| Delete cart item | https://docs.salla.dev/34415071e0.md | DELETE |

### Headless Checkout / Schemas

| Title                 | Link                                 |
| --------------------- | ------------------------------------ |
| SuccessEnvelope       | https://docs.salla.dev/14615084d0.md |
| ErrorEnvelope         | https://docs.salla.dev/14615085d0.md |
| Error                 | https://docs.salla.dev/14615086d0.md |
| Money                 | https://docs.salla.dev/14615087d0.md |
| Cart                  | https://docs.salla.dev/14615088d0.md |
| CartTotals            | https://docs.salla.dev/14615089d0.md |
| TotalLineItem         | https://docs.salla.dev/14615090d0.md |
| CartItem              | https://docs.salla.dev/14615091d0.md |
| ApplyCouponRequest    | https://docs.salla.dev/14615092d0.md |
| AssignShippingRequest | https://docs.salla.dev/14615093d0.md |
| CartItemsRequest      | https://docs.salla.dev/14615094d0.md |
| ProductIdentifier     | https://docs.salla.dev/14615095d0.md |
| CartItemEntry         | https://docs.salla.dev/14615096d0.md |
| RemoveItemsRequest    | https://docs.salla.dev/14615097d0.md |
| BadRequest            | https://docs.salla.dev/14615098d0.md |
| Unauthorized          | https://docs.salla.dev/14615099d0.md |
| Forbidden             | https://docs.salla.dev/14615100d0.md |
| NotFound              | https://docs.salla.dev/14615101d0.md |
| ValidationError       | https://docs.salla.dev/14615102d0.md |
| ErrorObject           | https://docs.salla.dev/14615103d0.md |
| Currency              | https://docs.salla.dev/14615104d0.md |
| AmountLine            | https://docs.salla.dev/14615105d0.md |
| CartScope             | https://docs.salla.dev/14615106d0.md |
| CartFeatures          | https://docs.salla.dev/14615107d0.md |
| CartShipping          | https://docs.salla.dev/14615108d0.md |
| CartAmounts           | https://docs.salla.dev/14615109d0.md |
| CartDiscountEntry     | https://docs.salla.dev/14615110d0.md |
| CartOptionEntry       | https://docs.salla.dev/14615111d0.md |
| GenerateCartRequest   | https://docs.salla.dev/14615112d0.md |
| CartItemOptionInput   | https://docs.salla.dev/14615113d0.md |
| CartItemCreateRequest | https://docs.salla.dev/14615114d0.md |
| CartItemUpdateRequest | https://docs.salla.dev/14615115d0.md |
| GuestDataRequest      | https://docs.salla.dev/14812468d0.md |
| GuestData             | https://docs.salla.dev/14812469d0.md |
