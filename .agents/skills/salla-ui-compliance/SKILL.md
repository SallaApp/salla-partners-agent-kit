---
name: salla-ui-compliance
description: >
  Make a Salla app's UI native — the embedded dashboard (Salla design guidelines) and
  storefront snippet UI (Twilight theme). Enforces theme CSS variables, Salla Icons,
  RTL/Arabic-first, matching spacing/density, and LIVE visual verification in an installed
  demo store with screenshots — not just "it renders". Use whenever an app draws visible
  UI. Injection mechanics: storefront → salla-snippets; embedded → salla-embedded-app.
---

# Salla UI Compliance

A Salla app's UI must match the store/dashboard visually and be verified **live** — "it
renders" is not the bar. This skill applies whenever your app draws visible UI; it does not
inject anything itself (that's `salla-snippets` for storefront and `salla-embedded-app` for
the dashboard).

## When this applies

- A storefront **snippet** renders a badge/banner/countdown on product pages → Twilight.
- An **embedded** dashboard page renders merchant UI → Salla dashboard design guidelines.

---

## Storefront (Twilight theme)

- **Inherit theme tokens** — style from Twilight CSS variables: `--color-primary`,
  `--color-text`, `--font-main`, and the spacing/radius vars. Use literal fonts, colors,
  borders, and shadows only as fallbacks.
- **Salla Icons** — use `sicon-*` classes for icons. Twilight themes inject the Twilight
  SDK into every storefront page and load the Salla Icons font, so it is available without
  bundling it yourself.
- **Match the product page** — adopt the surrounding spacing/density and insert next to the
  relevant element, inline in the layout.
- **RTL + locale** — most stores are Arabic/RTL. Honor `dir`/`lang`, mirror the layout, and
  write copy Arabic-first.

Docs: theme https://docs.salla.dev/421877m0.md · Twilight JS SDK (theme engine injects the
SDK; themes load Salla Icons) https://docs.salla.dev/422610m0.md ·
CSS variables https://docs.salla.dev/421945m0.md · Salla Icons https://docs.salla.dev/422550m0.md ·
single product page https://docs.salla.dev/422561m0.md

## Embedded dashboard (Salla design guidelines)

- Drive theme/locale/`dir` from `embedded.init()`'s `layout` (see `salla-embedded-app`
  Step 4) — re-apply on re-init/refresh.
- Use the SDK's native modules for chrome — `page` (title), `nav` (actions), `ui` (toasts,
  confirm, loading, breadcrumbs) — instead of custom in-iframe chrome (No-Chrome rule).
- Match Salla dashboard spacing, typography, and components; support light/dark + RTL.

> **Auth is non-negotiable, and lives elsewhere.** Every merchant-facing interface (the
> embedded iframe and any backend it calls) must run an **authenticated, server-verified
> session** — never trust the iframe context alone. This skill owns native look-and-feel
> only; for embedded session/token verification see `salla-embedded-app`, and for OAuth /
> merchant tokens see `salla-app-auth`. Don't duplicate auth logic here.

Docs: design guidelines https://docs.salla.dev/embedded-sdk/design-guidelines.md ·
playground https://docs.salla.dev/embedded-sdk/playground.md

---

## Verify LIVE (required)

Code that runs is not proof it looks right. Before "done":

1. Install the app on a demo store — `salla_apps action=demo_stores`, open a store's
   `install_url`, then `dashboard_url` (and `url` for the storefront).
2. **Screenshot** the product page (snippet) and the embedded page (dashboard).
3. Check: theme colors/fonts inherited, icons native, spacing matches, **RTL correct**,
   light + dark both OK, no overflow/clipping.

**Gate:** "Captured live screenshots of the storefront and embedded UI in an installed
demo store, and confirmed native styling + RTL — not just that the code executed?"
