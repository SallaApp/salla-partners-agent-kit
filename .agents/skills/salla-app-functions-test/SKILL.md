---
name: salla-app-functions-test
description: >
  Run a saved Salla App Function on a demo store with `salla_functions action=preview`
  (app_id, trigger, store_id, and the trigger's form fields as REAL ids). Use after save to
  verify behavior before publishing; poll `salla_functions action=deploy_status` while it is
  still deploying. Routed from salla-app-functions; uses salla-api-core to fetch real ids.
---

# App Functions — Test on a Demo Store (preview)

**Test through the MCP — `salla_functions action=preview` — not the preview URL.** `save`
(and `deploy_status`) hands back a `preview` URL, but **ignore it**: it is authenticated and
cannot be called client-side, so you can't hit it from your code or a browser to test. The
**only** supported way to run a saved function is `salla_functions action=preview`, which
invokes it server-side against a demo store and returns the response. Use it after `save` to
verify behavior before publishing — no Portal needed.

## 1. Wait for the deploy

`save` returns a deploy `job`. The function isn't runnable until that deploy finishes:

- Poll `salla_functions action=deploy_status`, `job_id` → `status` `COMPLETED` means ready;
  `FAILED` → read `failure_reason` and fix. (`deploy_status` also returns a `preview` URL on
  completion — ignore it; it's authenticated and not client-callable. Test via
  `action=preview`, below.)
- Or just call `salla_functions action=preview` — it returns "still deploying … retry in
  ~30s" until it's ready.

## 2. Gather the form inputs (real ids)

`preview` needs the trigger's **form fields** (the function's `form`). Two kinds:

- **`store_id`** (always required) — an installed demo store. List them with
  `salla_apps action=demo_stores` and pick a `connected` store.
- **Resource ids** (`order_id`, `shipment_id`, …) — must be **real** records. Fetch or
  create them via the **Salla Admin API with that store's access token**. See
  **salla-api-core**. Don't invent ids — preview runs the real function against real data.
  Confirm the trigger's exact form-field names before invoking — verify the function's
  `form` via `salla_functions` (don't assume `order_id`/`shipment_id`).

Token handling is in **salla-app-auth** (the token arrives via the `app.store.authorize`
webhook; the app must hold scopes matching the resources you fetch — request only those).
Webhook signature verification + idempotency are in **salla-webhooks**. Route there; don't
duplicate that logic here.

**Secret/PII hygiene:** the store access token is a live merchant credential. Never log,
hard-code, paste into third-party tools, or reuse it outside the demo store it belongs to.
Prefer a demo store with synthetic records over real merchant PII; restore any real config
you changed for testing afterward.

## 3. Invoke

Illustrative — ids are placeholders; substitute real ones (don't copy these literally):

```text
salla_functions action=preview
  app_id   = 2133776579
  trigger  = shipment.created
  store_id = 660806774
  payload  = { shipment_id: 12312 }   # the form fields, minus store_id
```

The tool runs the function server-side (it holds the auth the preview URL needs — you never
touch that URL yourself) and returns the function's response **as-is** (`http_status` +
`response`). A `success:false` / `Resp.error()` result is a real function outcome — inspect
it, don't assume a tool failure.

This mirrors the Portal's **Save and Preview** panel
([Testing](https://docs.salla.dev/1726816m0.md)), which runs the function against the demo
store and surfaces the same things you should check in the returned `response`: execution
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
