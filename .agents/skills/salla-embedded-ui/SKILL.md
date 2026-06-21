---
name: salla-embedded-ui
description: >
  Make a Salla app's EMBEDDED app (dashboard) UI native — the Partner-dashboard iframe on the
  Embedded SDK design system. Drive theme/locale/dir from `embedded.init()`'s layout, use the
  native `page`/`nav`/`ui` SDK modules (No-Chrome), Hugeicons (`hgi hgi-stroke hgi-*`),
  dashboard tokens (light/dark), match the dashboard, RTL, and verify with a LIVE screenshot
  on an installed demo store (`dashboard_url`). Pairs with salla-embedded-app. Storefront UI →
  salla-storefront-ui.
---

# Salla Embedded UI

Native look-and-feel for the **embedded app** (the dashboard — the Partner-dashboard iframe,
Embedded SDK design system). This skill owns native styling only. "It renders" is not the
bar.

> Storefront UI is a different design system → [salla-storefront-ui](../salla-storefront-ui/SKILL.md).

## Build it native

- **Drive theme/locale/`dir` from `embedded.init()`'s `layout`** (see `salla-embedded-app`
  Step 4) — re-apply on re-init/refresh.
- **Native chrome via SDK modules** — use `page` (title), `nav` (actions), `ui` (toasts,
  confirm, loading, breadcrumbs) instead of custom in-iframe chrome (No-Chrome rule).
- **Icons: Hugeicons** (`hgi hgi-stroke hgi-*`) — the dashboard design system. Full set +
  tokens → [salla-embedded-app](../salla-embedded-app/SKILL.md).
- **Match the dashboard** — Salla dashboard spacing, typography, and components; support
  light/dark + RTL. Tokens like `--color-danger` come from the dashboard design system.

Docs: design guidelines https://docs.salla.dev/embedded-sdk/design-guidelines.md ·
playground https://docs.salla.dev/embedded-sdk/playground.md

> **Auth is non-negotiable, and lives elsewhere.** Every merchant-facing interface (the
> embedded iframe and any backend it calls) must run an **authenticated, server-verified
> session** — never trust the iframe context alone. This skill owns native look-and-feel
> only; for embedded session/token verification see `salla-embedded-app`, and for OAuth /
> merchant tokens see `salla-app-auth`.

## Verify LIVE (required)

Code that runs is not proof it looks right. Before "done":

1. Install the app on a demo store — `salla_apps action=demo_stores`, open a store's
   `install_url`, then the `dashboard_url`.
2. **Screenshot** the embedded dashboard page you built.
3. Check: native `page`/`nav`/`ui` SDK modules + Hugeicons, dashboard tokens inherited,
   spacing matches the dashboard, **RTL correct**, light + dark both OK, no
   overflow/clipping.

**Gate:** "Captured a live screenshot of the embedded dashboard UI I built in an installed
demo store, used the SDK modules + Hugeicons + dashboard tokens, and confirmed native styling
and RTL — not just that the code executed?"
