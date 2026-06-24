---
name: salla-storefront-ui
description: >
  Make a Salla app's STOREFRONT (the store) UI native — shopper-facing pages on the Twilight
  theme. Build from native `<salla-*>` web components driven by the Storefront JS SDK, inherit
  Twilight CSS tokens, use Salla Icons (`sicon-*`), match the page's spacing, write
  Arabic-first/RTL, and verify with a LIVE screenshot on an installed demo store (`url`). Use
  when a snippet draws visible UI. Injection recipe → salla-snippets. Embedded/dashboard
  UI → salla-embedded-ui.
---

# Salla Storefront UI

Native look-and-feel for the **storefront** (the store — shopper-facing pages, Twilight
theme). This skill owns native styling only; it injects nothing itself — the
storefront-snippet injection recipe lives in
[salla-snippets](../salla-snippets/SKILL.md). "It renders" is not the bar.

> Embedded/dashboard UI is a different design system → [salla-embedded-ui](../salla-embedded-ui/SKILL.md).

## Build it native

- **Prefer native UI Components** — build visible UI from Twilight `<salla-*>` web
  components (e.g. `salla-button`, `salla-modal`, `salla-rating-stars`,
  `salla-products-slider`) driven by the Storefront JS SDK, rather than hand-rolled HTML;
  they inherit theme tokens, RTL, and locale automatically. Component families + the
  storefront-snippet injection recipe → [salla-snippets](../salla-snippets/SKILL.md). UI
  Components docs: https://docs.salla.dev/422688m0.md.
- **Inherit theme tokens** — style from Twilight CSS variables: `--color-primary`,
  `--color-text`, `--font-main`, and the spacing/radius vars. Use literal fonts, colors,
  borders, and shadows only as fallbacks.
- **Salla Icons** — use `sicon-*` classes. Twilight themes inject the Twilight SDK into
  every storefront page and load the Salla Icons font, so it is available without bundling
  it yourself.
- **Match the product page** — adopt the surrounding spacing/density and insert next to the
  relevant element, inline in the layout.
- **RTL + locale** — most stores are Arabic/RTL. Honor `dir`/`lang`, mirror the layout, and
  write copy Arabic-first.

Docs: theme https://docs.salla.dev/421877m0.md · Twilight JS SDK (theme engine injects the
SDK; themes load Salla Icons) https://docs.salla.dev/422610m0.md ·
CSS variables https://docs.salla.dev/421945m0.md · Salla Icons https://docs.salla.dev/422550m0.md ·
single product page https://docs.salla.dev/422561m0.md

**Gate:** "UI built from Twilight `<salla-*>` components + `sicon-*` icons inheriting theme tokens (literals only as fallback), Arabic-first/RTL — not hand-rolled HTML with hardcoded colors?"

## Verify LIVE (required)

Code that runs is not proof it looks right. Before "done":

1. Install the app on a demo store — `salla_apps action=demo_stores`, open a store's
   `install_url`, then the storefront `url`.
2. **Screenshot** the storefront page (snippet) you built.
3. Check: Twilight `<salla-*>` components + `sicon-*` icons, theme tokens inherited, spacing
   matches the page, **RTL correct**, light + dark both OK, no overflow/clipping.

**Gate:** "Captured a live screenshot of the storefront UI I built in an installed demo
store, used Twilight components + Salla Icons + theme tokens, and confirmed native styling +
RTL — not just that the code executed?"
