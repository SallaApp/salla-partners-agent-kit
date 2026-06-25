---
name: salla-app-functions-test
description: >
  Run a saved Salla App Function on a demo store with `salla_functions action=preview`
  (app_id, trigger, store_id, and the trigger's form fields as REAL ids). Use after save to
  verify behavior before publishing; poll `salla_functions action=deploy_status` while it is
  still deploying. Routed from salla-app-functions; uses salla-api-core to fetch real ids.
---

# App Functions — Test on a Demo Store (preview)

Run a saved function with `salla_functions action=preview`: it invokes the function
server-side against a demo store and returns the response. Use it after `save` to verify
behavior before publishing — no Portal needed.

`save` and `deploy_status` also hand back a `preview` URL. Ignore it: it is authenticated and
not client-callable, so `action=preview` is the way to run the function — it holds the auth
that URL needs.

## 1. Wait for the deploy

`save` returns a deploy `job`. The function isn't runnable until that deploy finishes:

- Poll `salla_functions action=deploy_status`, `job` (the value action=save returns) → `status` `COMPLETED` means ready;
  `FAILED` → read `failure_reason` and fix.
- Or just call `salla_functions action=preview` — it returns "still deploying … retry in
  ~30s" until it's ready.

## 2. Gather the form inputs (real ids)

`preview` needs the trigger's **form fields** (the function's `form`). Confirm the exact
field names via `salla_functions` before invoking, rather than assuming `order_id` /
`shipment_id`. Two kinds:

- **`store_id`** (always required) — an installed demo store. List them with
  `salla_apps action=demo_stores` and pick a `connected` store.
- **Resource ids** (`order_id`, `shipment_id`, …) — must be **real** records, since preview
  runs the real function against real data. Fetch or create them via the **Salla Admin API
  with that store's access token** (see **salla-api-core**).

Token handling is in **salla-app-auth** (the token arrives via the `app.store.authorize`
webhook; the app must hold scopes matching the resources you fetch — request only those).
Webhook signature verification + idempotency are in **salla-webhooks**. Route there; don't
duplicate that logic here.

**Secret/PII hygiene:** the store access token is a live merchant credential — keep it in
memory, scoped to the demo store it belongs to. Use a demo store with synthetic records, and
restore any config you changed for testing afterward.

## 3. Invoke

Illustrative — substitute real ids for the placeholders below:

```text
salla_functions action=preview
  app_id   = 2133776579
  trigger  = shipment.created
  store_id = 660806774
  payload  = { shipment_id: 12312 }   # the form fields, minus store_id
```

The tool runs the function server-side and returns its response **as-is** (`http_status` +
`response`). A `success:false` / `Resp.error()` result is a real function outcome to inspect,
not a tool failure.

This mirrors the Portal's **Save and Preview** panel
([Testing](https://docs.salla.dev/1726816m0.md)). Check in the returned `response`: execution
status (success/failure), the response data, execution time, your `console.log()` output, and
any errors. Test multiple scenarios — happy path, edge cases (null/empty fields), and error
cases (API failures, timeouts). Changes stay in the sandbox until you publish.

## Errors

- _"still deploying or failed to deploy"_ → wait ~30s / check `deploy_status`.
- _"Missing required form field(s)"_ → add them to `payload` as real ids.
- _"store_id is required"_ → pass a `connected` demo store from `salla_apps demo_stores`.
- _App not installed / inactive on the store_ → install/activate it on the demo store first
  (a `connected` store from `salla_apps demo_stores`).
- _401 / 403 fetching the resource ids_ → token or scope problem; see **salla-app-auth**
  for tokens and confirm the app holds the scopes for that resource.

**Gate:** "Preview returned the expected response on a demo store?" → publish with
**salla-app-functions-release**.
