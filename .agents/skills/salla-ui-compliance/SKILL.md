---
name: salla-ui-compliance
description: >
  Make a Salla app's UI native across its TWO distinct surfaces — the Dashboard (the
  embedded app, Embedded SDK design system) and the Storefront (the store, Twilight theme).
  Each has its own components, icons, and tokens — don't mix them. Enforces native
  components, RTL/Arabic-first, and LIVE screenshot verification in an installed demo store
  (not just "it renders"). Use whenever an app draws visible UI. Injection: storefront →
  salla-snippets; dashboard → salla-embedded-app.
---

# Salla UI Compliance

A Salla app draws UI in one of **two distinct surfaces — each its own design system; don't
mix them**:

- **Dashboard = the embedded app** (the Partner-dashboard iframe) → Embedded SDK design system.
- **Storefront = the store** (shopper-facing pages) → Twilight theme.

The overlap is minimal — only RTL/Arabic-first and the verify-live discipline apply to both.
This skill enforces native look-and-feel; it injects nothing itself (storefront →
`salla-snippets`, dashboard → `salla-embedded-app`). "It renders" is not the bar.

## Pick the surface

|                 | **Dashboard** (embedded app)                    | **Storefront** (store)                               |
| --------------- | ----------------------------------------------- | ---------------------------------------------------- |
| Where it runs   | Partner-dashboard iframe                        | Shopper-facing store pages                           |
| Design system   | Embedded SDK guidelines                         | Twilight theme                                       |
| Components      | native `page` / `nav` / `ui` SDK modules        | `<salla-*>` web components                           |
| Icons           | **Hugeicons** (`hgi hgi-stroke hgi-*`)          | **Salla Icons** (`sicon-*`)                          |
| Tokens          | dashboard tokens (`--color-danger`, light/dark) | Twilight CSS vars (`--color-primary`, `--font-main`) |
| Injection owner | `salla-embedded-app`                            | `salla-snippets`                                     |

---

## Storefront (the store — Twilight theme)

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
  it yourself. (This is the storefront font — the dashboard uses Hugeicons instead.)
- **Match the product page** — adopt the surrounding spacing/density and insert next to the
  relevant element, inline in the layout.
- **RTL + locale** — most stores are Arabic/RTL. Honor `dir`/`lang`, mirror the layout, and
  write copy Arabic-first.

Docs: theme https://docs.salla.dev/421877m0.md · Twilight JS SDK (theme engine injects the
SDK; themes load Salla Icons) https://docs.salla.dev/422610m0.md ·
CSS variables https://docs.salla.dev/421945m0.md · Salla Icons https://docs.salla.dev/422550m0.md ·
single product page https://docs.salla.dev/422561m0.md

## Dashboard (the embedded app — Embedded SDK design system)

- **Drive theme/locale/`dir` from `embedded.init()`'s `layout`** (see `salla-embedded-app`
  Step 4) — re-apply on re-init/refresh.
- **Native chrome via SDK modules** — use `page` (title), `nav` (actions), `ui` (toasts,
  confirm, loading, breadcrumbs) instead of custom in-iframe chrome (No-Chrome rule).
- **Icons: Hugeicons** (`hgi hgi-stroke hgi-*`) — the dashboard design system, **not** the
  storefront's `sicon-*`. Full set + tokens → [salla-embedded-app](../salla-embedded-app/SKILL.md).
- **Match the dashboard** — Salla dashboard spacing, typography, and components; support
  light/dark + RTL.

Docs: design guidelines https://docs.salla.dev/embedded-sdk/design-guidelines.md ·
playground https://docs.salla.dev/embedded-sdk/playground.md

> **Auth is non-negotiable, and lives elsewhere.** Every merchant-facing interface (the
> embedded iframe and any backend it calls) must run an **authenticated, server-verified
> session** — never trust the iframe context alone. This skill owns native look-and-feel
> only; for embedded session/token verification see `salla-embedded-app`, and for OAuth /
> merchant tokens see `salla-app-auth`. Don't duplicate auth logic here.

---

## Verify LIVE (required — both surfaces)

Code that runs is not proof it looks right. Before "done":

1. Install the app on a demo store — `salla_apps action=demo_stores`, open a store's
   `install_url`, then `dashboard_url` (embedded) and `url` (storefront).
2. **Screenshot** each surface you built — the storefront page (snippet) and/or the embedded
   dashboard page.
3. Check: right design system for the surface (Twilight `<salla-*>` + `sicon-*` on the store;
   SDK modules + Hugeicons on the dashboard), theme tokens inherited, spacing matches,
   **RTL correct**, light + dark both OK, no overflow/clipping.

**Gate:** "Captured live screenshots of each surface I built in an installed demo store, used
the correct design system per surface, and confirmed native styling + RTL — not just that the
code executed?"
