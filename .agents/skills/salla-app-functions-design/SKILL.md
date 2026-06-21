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
and read the context shape; never assume a payload.

Sources of truth: **`salla_functions action=list_triggers`** (no `app_id` needed) for live
trigger names and categories; **`salla_functions action=get`** for a trigger's authoritative
`.d.ts`. Customer-event docs ship illustrative payloads — confirm those field names via
`action=get` or the schema doc before relying on them.

**Gate:** "Do you have the confirmed `payload.data` field names for this event?"

## Step 2 — Choose the execution type

| Type                   | Timing               | Blocks user? | Timeout       | Return value effect                                                    |
| ---------------------- | -------------------- | ------------ | ------------- | ---------------------------------------------------------------------- |
| **Asynchronous event** | After the operation  | No           | 30 s          | Fire-and-forget: logged, does **not** affect the flow.                 |
| **Synchronous action** | Before the operation | Yes          | **5 s total** | Blocking: can **modify** parameters or **reject/block** the operation. |

- **Sync actions** are exactly the `merchant_actions` category — `shipment.creating` and
  `shipment.cancelling` (confirm the category via `salla_functions action=list_triggers`
  rather than the verb form). They intercept the lifecycle before it completes: erroring
  cancels the operation, succeeding can modify its data. `shipment.creating` is the documented
  sync example and returns a **`Shipment`** (`(context: Shipments): Promise<Shipment>`), not
  a plain `Resp` — it sets the shipment number/label. Builder mechanics →
  **salla-app-functions-handler**.
- **Async events** (e.g. `order.created`, `product.added`) run out-of-band; return a valid
  success/error result so it's recorded in logs.

### Timeout budget

| Type  | Total timeout                           | Per internal async call                 |
| ----- | --------------------------------------- | --------------------------------------- |
| Sync  | **5 s hard limit**, **< 500 ms target** | **< 2 s**, bound with `AbortController` |
| Async | **30 s**                                | bound with `AbortController`            |

The merchant is blocked during a sync action, so treat < 500 ms as the goal and 5 s as the
ceiling. Bounding each `fetch` / awaited I/O keeps one slow upstream from blowing the budget
(`AbortController` mechanics → **salla-app-functions-handler**). An overrun blocks (sync) or
drops (async) the run.

**Gate:** "Sync or async decided, and the timeout budget understood?"

## Security & data hand-offs

When the handler touches tokens, merchant authentication, or outbound calls, route those
out: token storage / OAuth / merchant access tokens → **salla-app-auth**; webhook signature
verification & idempotency → **salla-webhooks**. Full hand-off list →
**[references/event-contexts.md](references/event-contexts.md)**.

Next: write it in **salla-app-functions-handler**.
