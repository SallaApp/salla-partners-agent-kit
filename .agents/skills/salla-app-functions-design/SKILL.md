---
name: salla-app-functions-design
description: >
  Step 1–2 of building a Salla App Function: pick the trigger, confirm its exact
  `payload.data` shape, and choose a synchronous action (runs before the operation, can
  block/modify, 5 s total) vs an asynchronous event (runs after, fire-and-forget, 30 s). Use
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

| Type                   | Timing               | Blocks user? | Timeout       | Return value effect                                                    |
| ---------------------- | -------------------- | ------------ | ------------- | ---------------------------------------------------------------------- |
| **Asynchronous event** | After the operation  | No           | 30 s          | Fire-and-forget: logged, does **not** affect the flow.                 |
| **Synchronous action** | Before the operation | Yes          | **5 s total** | Blocking: can **modify** parameters or **reject/block** the operation. |

- **Sync actions** (the `merchant_actions` category — currently `shipment.creating` and
  `shipment.cancelling`) intercept the lifecycle: `Resp.error().setMessage("…")` cancels the
  operation (message shown to the customer/merchant); `Resp.success().setData({ … })` alters
  the operation's data before it completes. Confirm which triggers are sync via
  `salla_functions action=list_triggers` (category `merchant_actions`) — don't infer it from
  the verb form.
- **Async events** (e.g. `order.created`, `product.added`) run out-of-band; return a valid
  `Resp.success()` / `Resp.error()` so the result is recorded in logs.

### Sync budget (5 s total)

A synchronously-run app function has a **5-second total timeout** for the whole function.
Within it, keep every internal async call (each `fetch` / awaited I/O) to **under 2 s** so a
single slow upstream can't blow the budget — bound each one with an `AbortController`
(**salla-app-functions-handler**). Async events get **30 s** total. Stay well inside these
limits; an overrun blocks (sync) or drops (async) the run.

**Gate:** "Sync or async decided, and the timeout budget understood?"

## Security & data hand-offs

This skill only picks the trigger and execution type. When the handler will touch
tokens, merchant authentication, or outbound calls, route those concerns out — don't
duplicate them here: token storage / OAuth / merchant access tokens →
**salla-app-auth**; webhook signature verification & idempotency → **salla-webhooks**.

Next: write it in **salla-app-functions-handler**.
