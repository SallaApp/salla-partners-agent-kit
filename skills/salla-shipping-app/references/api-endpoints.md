# Shipping API — Endpoint Reference

Base URL: `https://api.salla.dev/admin/v2`
Auth: `Authorization: Bearer {access_token}`

Full API reference: https://docs.salla.dev/api-5578809

---

## Shipments

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/shipping/shipments` | List all shipments |
| `GET` | `/shipping/shipments/{id}` | Get shipment detail |
| `POST` | `/shipping/shipments` | Create a shipment manually |
| `PUT` | `/shipping/shipments/{id}` | Update shipment |
| `DELETE` | `/shipping/shipments/{id}` | Cancel/delete shipment |
| `POST` | `/shipping/shipments/{id}/label` | Attach label URL |
| `PUT` | `/shipping/shipments/{id}/tracking` | Set tracking number + URL |
| `POST` | `/shipping/shipments/{id}/return` | Create return shipment |

### Create Shipment

```http
POST /shipping/shipments
Content-Type: application/json

{
  "order_id": 12345,
  "carrier_id": "smsa",
  "service_type": "standard",
  "sender": {
    "name": "My Store",
    "phone": "+966500000000",
    "address": {
      "street": "King Fahd Road",
      "city": "Riyadh",
      "country": "SA",
      "zip": "12271"
    }
  },
  "receiver": {
    "name": "Ahmed Al-Rashidi",
    "phone": "+966501234567",
    "address": {
      "street": "Al-Corniche",
      "city": "Jeddah",
      "country": "SA",
      "zip": "21577"
    }
  },
  "package": {
    "weight": 1.5,
    "weight_unit": "kg",
    "dimensions": { "length": 30, "width": 20, "height": 10, "unit": "cm" }
  },
  "cod": { "amount": 0, "currency": "SAR" }
}
```

### Attach Label

```http
POST /shipping/shipments/{id}/label

{
  "label_url": "https://carrier.com/labels/SHP-001.pdf",
  "label_format": "pdf",
  "carrier_shipment_id": "CARRIER-REF-123"
}
```

### Set Tracking

```http
PUT /shipping/shipments/{id}/tracking

{
  "tracking_number": "1Z999AA10123456784",
  "tracking_url": "https://carrier.com/track/1Z999AA10123456784"
}
```

---

## Orders

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/orders` | List orders |
| `GET` | `/orders/{id}` | Order detail |
| `PUT` | `/orders/{id}/status` | Update fulfillment status |
| `PUT` | `/orders/{id}/branch` | Assign to branch |

### Update Order Status

```http
PUT /orders/{id}/status

{
  "status": "shipping",
  "tracking_number": "1Z999AA10123456784",
  "tracking_company": "SMSA Express",
  "note": "Dispatched from Riyadh warehouse"
}
```

| Status | Meaning |
| --- | --- |
| `pending` | Received, not processed |
| `in_progress` | Being prepared |
| `shipping` | Handed to carrier |
| `delivered` | Confirmed delivered |
| `cancelled` | Cancelled |
| `returned` | Return received |

---

## Branches

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/store/branches` | List all branches |
| `GET` | `/store/branches/{id}` | Branch detail |
| `POST` | `/store/branches` | Create branch |
| `PUT` | `/store/branches/{id}` | Update branch |
| `DELETE` | `/store/branches/{id}` | Delete branch |
| `PUT` | `/orders/{id}/branch` | Assign order to branch |

---

## App Settings (Shipping Config)

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/apps/{app_id}/settings` | Get merchant's carrier credentials |
| `POST` | `/apps/{app_id}/settings` | Save merchant's carrier credentials |

---

## Response Envelope

All responses follow this shape:

```json
{
  "status": 200,
  "success": true,
  "data": { },
  "pagination": {
    "count": 25,
    "total": 142,
    "per_page": 25,
    "current_page": 1,
    "next_cursor": "eyJpZCI6MjV9"
  }
}
```

Error responses:

```json
{
  "status": 422,
  "success": false,
  "error": {
    "code": 422,
    "message": "Validation failed",
    "errors": {
      "tracking_number": ["The tracking number field is required."]
    }
  }
}
```

---

## Postman Collection

Test all endpoints interactively:

[![Run in Postman](https://run.pstmn.io/button.svg)](https://www.postman.com/salla-app/workspace/salla-e-commerce-platform/collection/17687195-d700cd60-adf3-4b20-82ee-94851e88bd44)

---

## Resources

| Topic | Link |
| --- | --- |
| Full Shipping API reference | https://docs.salla.dev/api-5578809 |
| Salla Admin API reference | https://docs.salla.dev/doc-421117 |
