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

The doc-grounded event catalog — every trigger grouped Merchant vs Customer, its
sync/async type, and its documented `payload.data` shape — lives in
**[references/event-contexts.md](references/event-contexts.md)**. Use it to pick the trigger
and read the context shape. Never assume a payload. The live source of truth for trigger
names and categories is **`salla_functions action=list_triggers`** (no `app_id` needed);
for the exact, authoritative `.d.ts` of a trigger, use `salla_functions action=get`.
Customer-event docs ship illustrative payloads — confirm those field names against the
schema doc / `action=get` before relying on them.

**Gate:** "Do you have the confirmed `payload.data` field names for this event?"

## Step 2 — Choose the execution type

| Type                   | Timing               | Blocks user? | Timeout       | Return value effect                                                    |
| ---------------------- | -------------------- | ------------ | ------------- | ---------------------------------------------------------------------- |
| **Asynchronous event** | After the operation  | No           | 30 s          | Fire-and-forget: logged, does **not** affect the flow.                 |
| **Synchronous action** | Before the operation | Yes          | **5 s total** | Blocking: can **modify** parameters or **reject/block** the operation. |

- **Sync actions** are exactly the `merchant_actions` category — `shipment.creating` and
  `shipment.cancelling` (confirmed via `salla_functions action=list_triggers`; don't infer
  it from the verb form). They intercept the lifecycle before it completes: erroring cancels
  the operation, succeeding can modify its data. Note `shipment.creating` is the documented
  sync example and returns a **`Shipment`** (`(context: Shipments): Promise<Shipment>`), not
  a plain `Resp` — it sets the shipment number/label. Exact builder mechanics →
  **salla-app-functions-handler**.
- **Async events** (e.g. `order.created`, `product.added`) run out-of-band; return a valid
  success/error result so it's recorded in logs.

### Sync budget (5 s total)

A synchronously-run app function has a **5-second total timeout** (the **hard platform
limit**) for the whole function — but since the merchant is blocked, **< 500 ms is the
recommended target**, not the cutoff. Within it, keep every internal async call (each `fetch`
/ awaited I/O) to **under 2 s** so a single slow upstream can't blow the budget — bound each
one with an `AbortController` (**salla-app-functions-handler**). Async events get **30 s**
total. Stay well inside these limits; an overrun blocks (sync) or drops (async) the run.

**Gate:** "Sync or async decided, and the timeout budget understood?"

## Security & data hand-offs

This skill only picks the trigger and execution type. When the handler will touch
tokens, merchant authentication, or outbound calls, route those concerns out — don't
duplicate them here: token storage / OAuth / merchant access tokens →
**salla-app-auth**; webhook signature verification & idempotency → **salla-webhooks**.

Next: write it in **salla-app-functions-handler**.
