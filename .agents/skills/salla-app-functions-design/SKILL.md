---
name: salla-app-functions-design
description: >
  Step 1–2 of building a Salla App Function: pick the trigger, confirm its exact
  `payload.data` shape, and choose a synchronous action (runs before the operation, can
  block/modify, < 500 ms) vs an asynchronous event (runs after, fire-and-forget, 30 s). Use
  before writing the handler. Routed from salla-app-functions; next is
  salla-app-functions-handler.
---

# App Functions — Design the Trigger & Execution Type

Decide _what_ runs and _when_ before you write any code.

## Step 1 — Confirm the event contract

Confirm the event's exact `payload.data` shape in the App Functions events reference
(https://docs.salla.dev/1726818m0.md) **before** writing any handler. Never assume a
payload. The event → typed-context mapping and the supported trigger list live in
**[references/event-contexts.md](references/event-contexts.md)**.

**Gate:** "Do you have the confirmed `payload.data` field names for this event?"

## Step 2 — Choose the execution type

| Type                   | Timing               | Blocks user? | Timeout      | Return value effect                                                    |
| ---------------------- | -------------------- | ------------ | ------------ | ---------------------------------------------------------------------- |
| **Asynchronous event** | After the operation  | No           | 30 s         | Fire-and-forget: logged, does **not** affect the flow.                 |
| **Synchronous action** | Before the operation | Yes          | **< 500 ms** | Blocking: can **modify** parameters or **reject/block** the operation. |

- **Sync actions** (e.g. `shipment.creating`) intercept the lifecycle:
  `Resp.error().setMessage("…")` cancels the operation (message shown to the
  customer/merchant); `Resp.success().setData({ … })` alters the operation's data before it
  completes.
- **Async events** (e.g. `order.created`, `product.added`) run out-of-band; return a valid
  `Resp.success()` / `Resp.error()` so the result is recorded in logs.

**Gate:** "Sync or async decided, and the timeout budget understood?"

Next: write it in **salla-app-functions-handler**.
