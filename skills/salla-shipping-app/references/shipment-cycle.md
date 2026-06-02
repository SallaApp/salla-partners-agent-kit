# Shipping App Cycle — Detailed Reference

The complete lifecycle of a shipment from order creation through delivery, with the webhook events and API calls at each step.

---

## Full Lifecycle Diagram

```
Merchant receives order
        ↓
Merchant clicks "Ship" in dashboard
        ↓
Salla fires: shipping.shipment.creating  ← YOUR APP RESPONDS WITH RATES
        ↓
Merchant selects a rate
        ↓
Salla fires: shipping.shipment.created   ← YOUR APP CREATES LABEL
        ↓
Your app sets tracking ID
        ↓
Carrier picks up → in transit → delivered
        ↓
[If cancelled] shipping.shipment.cancelled  ← YOUR APP VOIDS LABEL
[If returned]  shipping.shipment.return.created  ← YOUR APP CREATES RETURN
```

---

## Step 1 — Respond to Rate Request (Sync)

`shipping.shipment.creating` is a **synchronous** event. Salla waits for your response (max ~10s).

**Incoming payload:**

```json
{
  "event": "shipping.shipment.creating",
  "data": {
    "shipment_id": "SHP-001",
    "order_id": 12345,
    "sender": {
      "name": "My Store",
      "phone": "+966500000000",
      "address": { "city": "Riyadh", "country": "SA" }
    },
    "receiver": {
      "name": "Ahmed Al-Rashidi",
      "phone": "+966501234567",
      "address": { "city": "Jeddah", "country": "SA", "zip": "21577" }
    },
    "package": {
      "weight": 1.5,
      "weight_unit": "kg",
      "dimensions": { "length": 30, "width": 20, "height": 10, "unit": "cm" }
    },
    "cod": { "amount": 0, "currency": "SAR" }
  }
}
```

**Your response — available rates:**

```json
{
  "success": true,
  "data": {
    "rates": [
      {
        "id": "standard",
        "name": { "en": "Standard Delivery", "ar": "التوصيل العادي" },
        "description": { "en": "3-5 business days", "ar": "3-5 أيام عمل" },
        "price": 15.00,
        "currency": "SAR",
        "estimated_days": 4,
        "logo": "https://your-carrier.com/logo.png"
      },
      {
        "id": "express",
        "name": { "en": "Express Delivery", "ar": "التوصيل السريع" },
        "description": { "en": "Next business day", "ar": "يوم العمل التالي" },
        "price": 35.00,
        "currency": "SAR",
        "estimated_days": 1,
        "logo": "https://your-carrier.com/logo.png"
      }
    ]
  }
}
```

**If carrier unavailable:**

```json
{ "success": false, "error": { "message": "Service unavailable for this destination" } }
```

---

## Step 2 — Create Label (shipping.shipment.created)

When merchant confirms a rate, Salla fires `shipping.shipment.created` (async). Create the shipment label with your carrier and call Salla back:

**Incoming payload:**

```json
{
  "event": "shipping.shipment.created",
  "data": {
    "shipment_id": "SHP-001",
    "order_id": 12345,
    "selected_rate": "express",
    "sender": { ... },
    "receiver": { ... },
    "package": { ... }
  }
}
```

**Create label with your carrier, then POST to Salla:**

```http
POST https://api.salla.dev/admin/v2/shipping/shipments/{shipment_id}/label
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "label_url": "https://carrier.com/labels/SHP-001.pdf",
  "label_format": "pdf",
  "carrier_shipment_id": "CARRIER-REF-123"
}
```

---

## Step 3 — Set Tracking ID

```http
PUT https://api.salla.dev/admin/v2/shipping/shipments/{shipment_id}/tracking
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "tracking_number": "1Z999AA10123456784",
  "tracking_url": "https://carrier.com/track/1Z999AA10123456784"
}
```

---

## Step 4 — Handle Cancellation

**Incoming event:** `shipping.shipment.cancelled`

```json
{
  "event": "shipping.shipment.cancelled",
  "data": {
    "shipment_id": "SHP-001",
    "order_id": 12345,
    "reason": "customer_request"
  }
}
```

**Your actions:**
1. Call your carrier's void/cancel endpoint
2. Notify carrier to stop pickup if scheduled
3. Acknowledge with `200`

---

## Step 5 — Handle Return

**Incoming event:** `shipping.shipment.return.created`

```json
{
  "event": "shipping.shipment.return.created",
  "data": {
    "original_shipment_id": "SHP-001",
    "return_shipment_id": "RTN-001",
    "order_id": 12345,
    "sender": { /* was receiver */ },
    "receiver": { /* was sender */ },
    "return_reason": "wrong_item"
  }
}
```

**Your actions:**
1. Create reverse shipment with carrier (sender ↔ receiver swapped)
2. Set label URL and tracking on the return shipment
3. Update order status if needed

---

## Webhook Handler Template

```ts
app.post('/webhook', verifySignature, async (req, res) => {
  const { event, data } = req.body;

  // Acknowledge immediately for async events
  if (event !== 'shipping.shipment.creating') {
    res.status(200).send('OK');
  }

  switch (event) {
    case 'shipping.shipment.creating':
      const rates = await getCarrierRates(data);
      return res.json({ success: true, data: { rates } });

    case 'shipping.shipment.created':
      await createLabelAndNotifySalla(data);
      break;

    case 'shipping.shipment.cancelled':
      await voidLabelWithCarrier(data.shipment_id);
      break;

    case 'shipping.shipment.return.created':
      await createReturnShipment(data);
      break;
  }
});
```

---

## Resources

| Topic | Link |
| --- | --- |
| Shipping App Cycle guide | https://docs.salla.dev/doc-422994 |
| Shipping API endpoint list | https://docs.salla.dev/api-5578809 |
