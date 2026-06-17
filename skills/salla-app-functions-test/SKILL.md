---
name: salla-app-functions-test
description: >
  Run a saved Salla App Function on a demo store with `salla_functions action=preview`
  (app_id, trigger, store_id, and the trigger's form fields as REAL ids). Use after save to
  verify behavior before publishing; poll `salla_functions action=deploy_status` while it is
  still deploying. Routed from salla-app-functions; uses salla-api-core to fetch real ids.
---

# App Functions — Test on a Demo Store (preview)

After `save`, run the function in preview mode and read its actual response — no Portal
needed.

## 1. Wait for the deploy

`save` returns a deploy `job`. The function isn't runnable until that deploy finishes:

- Poll `salla_functions action=deploy_status`, `job_id` → `status` `COMPLETED` (with a
  `preview` URL) means ready; `FAILED` → read `failure_reason` and fix.
- Or just call `preview` — it returns "still deploying … retry in ~30s" until it's ready.

## 2. Gather the form inputs (real ids)

`preview` needs the trigger's **form fields** (the function's `form`). Two kinds:

- **`store_id`** (always required) — an installed demo store. List them with
  `salla_apps action=demo_stores` and pick a `connected` store.
- **Resource ids** (`order_id`, `shipment_id`, …) — must be **real** records. Fetch or
  create them via the **Salla Admin API with that store's access token** (the token from the
  `app.store.authorize` webhook at install; the app must hold the matching scopes). See
  **salla-api-core**. Don't invent ids — preview runs the real function against real data.

## 3. Invoke

```text
salla_functions action=preview
  app_id   = 2133776579
  trigger  = shipment.created
  store_id = 660806774
  payload  = { shipment_id: 12312 }   # the form fields, minus store_id
```

The tool posts the preview URL with `?preview=true&trigger=…` plus every form field and
returns the function's response **as-is** (`http_status` + `response`). A `success:false` /
`Resp.error()` result is a real function outcome — inspect it, don't assume a tool failure.

## Errors

- _"still deploying or failed to deploy"_ → wait ~30s / check `deploy_status`.
- _"Missing required form field(s)"_ → add them to `payload` as real ids.
- _"store_id is required"_ → pass a `connected` demo store from `salla_apps demo_stores`.

**Gate:** "Preview returned the expected response on a demo store?" → publish with
**salla-app-functions-release**.
