---
name: salla-embedded-ui
description: >
  Owns native look-and-feel for a Salla app's EMBEDDED (dashboard) UI — the Partner-dashboard
  iframe on the Embedded SDK design system. Use WHENEVER an embedded/dashboard page draws visible
  UI (settings, analytics, addon flows). Its design rules are BINDING: drive theme/locale/dir from
  `embedded.init()`'s layout, use native `page`/`nav`/`ui` SDK modules (No-Chrome), Salla dashboard
  tokens (light/dark), Hugeicons, correct RTL — then prove it with a LIVE screenshot on an installed
  demo store. Not done until verified. Storefront UI → salla-storefront-ui; SDK/auth wiring →
  salla-embedded-app.
---

# Salla Embedded UI

Native look-and-feel for the **embedded app** — the merchant-dashboard iframe rendered on the
Embedded SDK design system. This skill owns native styling only, and its guidance is **binding
instruction, not reference**: each rule below is a requirement whose omission ships a foreign-looking
iframe into a merchant's dashboard. **"It renders" is not the bar — "it looks native, in both themes
and RTL, proven by a live screenshot" is.**

> Storefront UI is a different design system → [salla-storefront-ui](../salla-storefront-ui/SKILL.md).
> SDK boot, page registration, and auth live in → [salla-embedded-app](../salla-embedded-app/SKILL.md).

## When this skill is the owner

Any visible UI inside the dashboard iframe. If you are wiring `embedded.init()`, registering the
page, or verifying the auth token, that is `salla-embedded-app` — come back here the moment you draw
UI. Do not restyle from generic knowledge and retrofit: shape the UI around these rules from the
first line of markup.

> **Auth is non-negotiable and lives elsewhere.** Every merchant-facing interface (the iframe and any
> backend it calls) must run an authenticated, server-verified session — never trust the iframe
> context alone. Session/token verification → `salla-embedded-app`; OAuth/merchant tokens →
> `salla-app-auth`. This skill owns look-and-feel only.

---

## Step 0 — Load the canonical design guidelines (do this first)

Before writing any markup, load the single authoritative token/pattern source and keep it open:
[`../salla-embedded-app/references/design-guidelines.md`](../salla-embedded-app/references/design-guidelines.md)
— brand color tokens (light/dark hex + HSL), PingARLT typography scale, 4px spacing grid, Hugeicons,
the No-Chrome rule, component patterns (cards/buttons/page), and the Do/Don't table. **Do not invent
token values, guess the brand teal, or carry a color across a context compaction — read it from that
file.** Live docs: https://docs.salla.dev/embedded-sdk/design-guidelines.md ·
playground https://docs.salla.dev/embedded-sdk/playground.md

**Gate:** loaded `design-guidelines.md` and using ITS exact tokens/patterns — not values recalled or
improvised?

---

## Step 1 — Drive theme, locale & direction from `embedded.init()`

Read theme/locale/`dir` from `embedded.init()`'s `layout` (see `salla-embedded-app` Step 4) — never
from query params you parse yourself. Set `dir`/`lang`/`data-theme` on `<html>` on init, and re-apply
on `embedded.onThemeChange` and on every re-init/refresh.

**Gate:** `dir`, `lang`, and `data-theme` all come from `layout` and re-apply on live theme switch?

---

## Step 2 — Native chrome via SDK modules (the No-Chrome rule)

The iframe lives inside the dashboard's own chrome. Do **not** rebuild it. Use the SDK modules for
every host-level interaction instead of custom in-iframe UI:

- Title → `embedded.page.setTitle()` (no in-iframe page header).
- Primary actions → `embedded.nav.setAction()` (no duplicate Save button inside the page).
- Feedback → `embedded.ui.toast` / `embedded.ui.confirm()` / loading (never `window.confirm()` or a
  custom toast overlay).
- No sidebar, no in-iframe top navbar or breadcrumbs — content is full-width, filling the container.

Call the SDK methods, never raw `postMessage`. Module reference →
[`../salla-embedded-app/references/sdk-modules-guide.md`](../salla-embedded-app/references/sdk-modules-guide.md).

**Gate:** no custom sidebar/navbar/breadcrumbs/confirm/toast — every one routed through a `page`/`nav`/`ui`
SDK method?

---

## Step 3 — Match the dashboard: tokens, type, spacing, icons

Style from the design-guidelines tokens so the app is indistinguishable from a native dashboard
section:

- **Color** — dashboard brand tokens (`--color-primary` teal, `--color-danger`, etc.); both light AND
  dark defined. No hardcoded off-brand colors.
- **Typography** — PingARLT stack, 14px base, the `text-xs…text-xl` scale.
- **Spacing** — the 4px grid (`space-1…space-8`).
- **Icons** — Hugeicons only (`hgi hgi-stroke hgi-*`); consistent stroke weight; matches the classes
  the SDK's `nav.setAction` expects.

**Gate:** every color/font/space/icon traces to a design-guidelines token, and both light + dark are
legible?

---

## Step 4 — RTL correctness (Arabic-first)

Most merchants are Arabic — RTL is the default case, not an edge case. Use CSS **logical properties**
(`margin-inline-start`, `padding-inline`, `border-inline-start`) everywhere; never `left`/`right` or a
global `text-align: left`. Verify with `dir="rtl"`, not just LTR.

**Gate:** layout mirrors correctly under `dir="rtl"` with no `left`/`right` physical properties or hard
`text-align`?

---

## Step 5 — Verify LIVE on an installed demo store (required)

Code that executes is not proof it looks right. Before claiming done:

1. `salla_apps action=demo_stores`, open a store's `install_url`, then its `dashboard_url`.
2. **Screenshot** the embedded page you built, inside the real dashboard.
3. Confirm against the checklist below in that screenshot.

**Gate (the final one):** "Captured a LIVE screenshot of this embedded page in an installed demo
store, and confirmed native SDK chrome + Hugeicons + dashboard tokens + correct RTL in **both light
and dark** — not merely that the code ran?"

### Compliance checklist (all must be true in the live screenshot)

- [ ] Theme, locale, `dir` driven by `embedded.init()` layout; re-applies on theme switch.
- [ ] No custom chrome — title/actions/feedback all via `page`/`nav`/`ui` SDK modules.
- [ ] Colors, type, spacing, icons all from design-guidelines tokens; no off-brand hardcodes.
- [ ] RTL correct via logical properties; content full-width, no horizontal overflow/clipping.
- [ ] Light **and** dark both legible; WCAG 2.1 AA contrast held.
- [ ] Bilingual `ar`/`en` copy — never English-only to an Arabic merchant.

---

## Red Flags

| Tempting thought                                     | Why it's wrong                                                                                                               |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| "It renders and the code runs — that's done."        | Rendering ≠ native. Unverified UI ships a foreign iframe; only the live screenshot in Step 5 is proof.                       |
| "I know the Salla teal well enough to type it."      | Guessed/recalled hex drifts off-brand and breaks in dark mode. Read every token from `design-guidelines.md`.                 |
| "I'll add a small header/Save button in the iframe." | That's the nested-dashboard anti-pattern. Title → `page.setTitle`, actions → `nav.setAction` — No-Chrome is binding.         |
| "`window.confirm()` / my own toast is fine for now." | Fragmented UX the merchant feels instantly. Use `ui.confirm()` / `ui.toast` — always the SDK method, never `postMessage`.    |
| "I'll do RTL after it works in English."             | RTL is the default merchant case. `left`/`right` written first must all be rewritten; use logical properties from the start. |
| "Looks right in light mode, ship it."                | Dark mode is a live switch, not optional. Both themes must be defined and legible before done.                               |

---

## Resources

| Topic                                  | Link                                                                                                             |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Canonical tokens/patterns (load first) | [`../salla-embedded-app/references/design-guidelines.md`](../salla-embedded-app/references/design-guidelines.md) |
| SDK modules (page/nav/ui)              | [`../salla-embedded-app/references/sdk-modules-guide.md`](../salla-embedded-app/references/sdk-modules-guide.md) |
| Design guidelines (live)               | https://docs.salla.dev/embedded-sdk/design-guidelines.md                                                         |
| Playground / testing                   | https://docs.salla.dev/embedded-sdk/playground.md                                                                |
