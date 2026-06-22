---
name: salla-live-testing
description: >
  Validate a Salla app on a real demo store before calling it done. Use when verifying an
  app end to end before publish. Install via salla_apps
  action=demo_stores, then verify the settings form actually SAVES, the embedded dashboard
  authenticates, the storefront snippet renders, and webhooks / App Functions fire from
  real Salla events. MCP/config success and passing endpoint tests are NOT proof the
  integration works — this is the live gate. Build flow → salla-app-builder; storefront UI →
  salla-storefront-ui; embedded UI → salla-embedded-ui.
---

# Salla Live Testing

The **live gate**: exercise the app as a merchant on a real demo store before calling it
done. Green endpoint/MCP tests are not proof — the merchant-facing integration can still be
broken.

> **Demo data only.** Test on demo stores using non-sensitive data. Keep production
> secrets, OAuth/access/refresh tokens, webhook signing secrets, and real customer PII out
> of third-party capture/inspection tools (request-bin endpoints, screen-share, chat). If a
> test points config at a temporary receiver, restore the real `webhook_url`, redirect URLs,
> and secrets afterward.

## Step 0 — Point configured URLs at the deployed domain

Before installing, fetch the configured URLs (`salla_apps action=get`) — `webhook_url`,
OAuth redirect/callback, embedded-page URL — and confirm each points at the domain where
the app actually runs. They must match: a mismatched URL fails silently (OAuth redirects
nowhere, webhooks 404 at the old host, the iframe won't load, no error shown). Align the
URLs (or the deployment) _before_ generating install links.

## Step 1 — Install on a demo store

Call `salla_apps action=demo_stores` with your `app_id`, then pick a store from the
result. **The install link is time-limited (~1 hour)**, so generate it immediately before
testing and use it right away. If install seems to do nothing (an expired link fails
silently or redirects to login), re-run `salla_apps action=demo_stores` for a fresh link.

**Three distinct URLs, three purposes:**

| Field           | Points at          | Use it to                                                          |
| --------------- | ------------------ | ------------------------------------------------------------------ |
| `install_url`   | OAuth + install    | Trigger the install flow (consent → `app.store.authorize`)         |
| `url`           | the **storefront** | Test the **snippet** on a product/cart page (Storefront check)     |
| `dashboard_url` | the merchant admin | Test the **embedded app** + settings in the dashboard (auto-login) |

`connected: true` means it's already installed; otherwise open a **fresh** `install_url`
in the browser to install. Field names are from the tool's contract — confirm the live
shape from the actual response.

## Step 2 — Run the checks

| Surface        | Check                                                                                                                                                                                                                                                                                     | Source of truth                                                                                                             |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| **Settings**   | Open the app's settings page, **change a value and SAVE**, reopen — value persists.                                                                                                                                                                                                       | `salla-app-settings` (save smoke test); also the `app.settings.updated` webhook payload if the app subscribes to that event |
| **Embedded**   | Open the embedded page in the dashboard — it authenticates (the SDK token is verified server-side, the session is established, then it renders), loads data, and doesn't hang. Test an expired token → the SDK refresh path recovers. Verify the exact auth flow in `salla-embedded-app`. | `salla-embedded-app`                                                                                                        |
| **Storefront** | Visit a product page — the snippet renders **natively** (theme, icons, RTL); screenshot it. No duplicate widgets. Verify the snippet actually **runs** in the browser DevTools Console (load marker, no red errors, event payloads) — see `salla-snippets`' browser-test step.            | `salla-snippets` + `salla-storefront-ui`                                                                                    |
| **Events**     | Trigger real events (place a test order, change stock, save settings) — confirm the webhook receives them (and that signature/idempotency handling passes, per `salla-webhooks`) / the App Function fires.                                                                                | `salla-webhooks` / `salla-app-functions`                                                                                    |
| **Logs**       | Check Partner/Portal logs and the browser console for errors during the above. Confirm no tokens or secrets are printed to the console/logs.                                                                                                                                              | —                                                                                                                           |

## Step 3 — What counts as proof

Config-level success is not integration success — verify the merchant-facing behavior:

- Portal accepting a settings schema → confirm the **installed form saves** (Step 2).
- A snippet executing → confirm **it looks right** natively (see `salla-storefront-ui`).
- An endpoint returning 200 in isolation → confirm **Salla calls it with the real
  payload** (Step 2 Events).

**Gate:** "On an installed demo store: settings save+persist, embedded page auth+loads,
storefront snippet renders natively, and a real event reaches the webhook/App Function —
all verified, with screenshots/logs?"
