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

> **Demo data only.** Test on demo stores with non-sensitive data. Never paste production
> secrets, OAuth/access/refresh tokens, webhook signing secrets, or real customer PII into
> third-party capture/inspection tools (request-bin style endpoints, screen-share, chat).
> If you point config at a temporary receiver for a test, restore the real `webhook_url`,
> redirect URLs, and secrets afterward.

## Step 0 — Confirm the deployed domain matches the configured URLs

Before installing, check the app's **deployed** domain against what it's configured with —
the `webhook_url`, OAuth redirect/callback, and embedded-page URL (`salla_apps
action=get`). A mismatch (configured URL ≠ where the app actually runs) **fails silently**:
OAuth redirects nowhere, webhooks 404 at the old host, the iframe won't load — with no
obvious error. Fix the URLs (or the deployment) so they point at the same place _before_
generating install links.

## Step 1 — Install on a demo store

Call `salla_apps action=demo_stores` with your `app_id`, then pick a store from the
result. **The install link is time-limited (~1 hour).** Generate it immediately before you
test and use it right away — don't save or reuse an old `install_url`. An expired link
**fails silently or redirects to login** rather than installing, so if install seems to do
nothing, re-run `salla_apps action=demo_stores` for a fresh link first.

**Three distinct URLs, three purposes — don't conflate them:**

| Field           | Points at          | Use it to                                                          |
| --------------- | ------------------ | ------------------------------------------------------------------ |
| `install_url`   | OAuth + install    | Trigger the install flow (consent → `app.store.authorize`)         |
| `url`           | the **storefront** | Test the **snippet** on a product/cart page (Storefront check)     |
| `dashboard_url` | the merchant admin | Test the **embedded app** + settings in the dashboard (auto-login) |

`connected: true` means it's already installed; otherwise open a **fresh** `install_url`
(browser) to install. (Field names are from the tool's own contract — confirm the live
shape from the actual response.)

## Step 2 — Run the checks

| Surface        | Check                                                                                                                                                                                                                                                                                     | Source of truth                                                                                                             |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| **Settings**   | Open the app's settings page, **change a value and SAVE**, reopen — value persists.                                                                                                                                                                                                       | `salla-app-settings` (save smoke test); also the `app.settings.updated` webhook payload if the app subscribes to that event |
| **Embedded**   | Open the embedded page in the dashboard — it authenticates (the SDK token is verified server-side, the session is established, then it renders), loads data, and doesn't hang. Test an expired token → the SDK refresh path recovers. Verify the exact auth flow in `salla-embedded-app`. | `salla-embedded-app`                                                                                                        |
| **Storefront** | Visit a product page — the snippet renders **natively** (theme, icons, RTL); screenshot it. No duplicate widgets.                                                                                                                                                                         | `salla-snippets` + `salla-ui-compliance`                                                                                    |
| **Events**     | Trigger real events (place a test order, change stock, save settings) — confirm the webhook receives them (and that signature/idempotency handling passes, per `salla-webhooks`) / the App Function fires.                                                                                | `salla-webhooks` / `salla-app-functions`                                                                                    |
| **Logs**       | Check Partner/Portal logs and the browser console for errors during the above. Confirm no tokens or secrets are printed to the console/logs.                                                                                                                                              | —                                                                                                                           |

## Step 3 — Don't trust config-only success

- Portal accepting a settings schema ≠ the installed form saving.
- A snippet executing ≠ it looking right (see `salla-ui-compliance`).
- An endpoint 200 in isolation ≠ Salla calling it with the real payload.

**Gate:** "On an installed demo store: settings save+persist, embedded page auth+loads,
storefront snippet renders natively, and a real event reaches the webhook/App Function —
all verified, with screenshots/logs?"
