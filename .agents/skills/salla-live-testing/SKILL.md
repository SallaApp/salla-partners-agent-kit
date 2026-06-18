---
name: salla-live-testing
description: >
  Validate a Salla app on a real demo store before calling it done. Install via salla_apps
  action=demo_stores, then verify the settings form actually SAVES, the embedded dashboard
  authenticates, the storefront snippet renders, and webhooks / App Functions fire from
  real Salla events. MCP/config success and passing endpoint tests are NOT proof the
  integration works — this is the live gate. Build flow → salla-app-builder; UI →
  salla-ui-compliance.
---

# Salla Live Testing

The most common failure is declaring "done" from green endpoint/MCP tests while the
merchant-facing integration is broken. This skill is the **live gate**: exercise the app
as a merchant on a real demo store.

## Step 1 — Install on a demo store

`salla_apps action=demo_stores`, `app_id` → pick a store. `connected: true` means it's
already installed; otherwise open `install_url` (browser) to install. Use `dashboard_url`
to auto-login to the store admin and `url` for the storefront.

## Step 2 — Run the checks

| Surface        | Check                                                                                                                                                                                            | Source of truth                                                                    |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| **Settings**   | Open the app's settings page, **change a value and SAVE**, reopen — value persists.                                                                                                              | `salla-app-settings` (save smoke test); the `app.settings.updated` webhook payload |
| **Embedded**   | Open the embedded page in the dashboard — it authenticates (init → token → server introspect → session → `ready()`), loads data, and doesn't hang. Test an expired token → `refresh()` recovers. | `salla-embedded-app`                                                               |
| **Storefront** | Visit a product page — the snippet renders **natively** (theme, icons, RTL); screenshot it. No duplicate widgets.                                                                                | `salla-snippets` + `salla-ui-compliance`                                           |
| **Events**     | Trigger real events (place an order, change stock, save settings) — confirm the webhook receives them / the App Function fires.                                                                  | `salla-webhooks` / `salla-app-functions`                                           |
| **Logs**       | Check Partner/Portal logs and the browser console for errors during the above.                                                                                                                   | —                                                                                  |

## Step 3 — Don't trust config-only success

- Portal accepting a settings schema ≠ the installed form saving.
- A snippet executing ≠ it looking right (see `salla-ui-compliance`).
- An endpoint 200 in isolation ≠ Salla calling it with the real payload.

**Gate:** "On an installed demo store: settings save+persist, embedded page auth+loads,
storefront snippet renders natively, and a real event reaches the webhook/App Function —
all verified, with screenshots/logs?"
