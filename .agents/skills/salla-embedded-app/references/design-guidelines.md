# Embedded App — Design Guidelines

Your app runs inside the Salla Merchant Dashboard. It must look and behave like a native part of
the platform — not a foreign iframe.

> Source: https://docs.salla.dev/embedded-sdk/design-guidelines.md

> **Auth is not optional here.** This file is design only — it shows the app shell, not how to
> authenticate it. Every embedded page MUST be authenticated before any of this UI renders, via
> the **Trust-but-Verify** model: the frontend captures the token (`embedded.auth.getToken()`)
> and your backend verifies it (`POST /exchange-authority/v1/introspect`, `S-Source = App ID`)
> and mints its own session. Call `embedded.ready()` only after that. SKILL.md Step 3 →
> [`auth-and-session.md`](auth-and-session.md). Admin-API merchant tokens → `salla-app-auth`.

---

## Use SDK components (a requirement, not a suggestion)

Using the Embedded SDK modules for core dashboard interactions is **mandatory** — it keeps the
merchant from facing fragmented UI patterns. Toasts, confirms, loading, navbar actions,
breadcrumbs, page title, and navigation all have native SDK methods; call those rather than
building your own (and call the methods, never raw `postMessage` — see
[`sdk-modules-guide.md`](sdk-modules-guide.md)).

---

## Core Requirements

| Requirement              | Detail                                                          |
| ------------------------ | --------------------------------------------------------------- |
| **Bilingual**            | Support Arabic (`ar`) and English (`en`). Arabic is RTL.        |
| **Responsive**           | Adapt to the iframe container width — no fixed widths           |
| **Theme-aware**          | Match `light` or `dark` dashboard theme                         |
| **Accessible**           | Follow WCAG 2.1 AA — color contrast, keyboard nav, focus states |
| **No horizontal scroll** | Content must never overflow the iframe width                    |

---

## RTL Support

Apply direction from the `layout` returned by `embedded.init()` (do not read query
params manually — see SKILL.md Step 4):

```ts
const { layout } = await embedded.init();
document.documentElement.setAttribute("dir", layout.dir); // "rtl" for ar, "ltr" for en
document.documentElement.setAttribute("lang", layout.locale);
```

CSS logical properties — use these instead of `left`/`right`:

```css
/* ✅ Correct — works in both LTR and RTL */
.card {
  margin-inline-start: 16px;
  padding-inline: 24px;
  border-inline-start: 2px solid var(--color-border);
}

/* ❌ Wrong — breaks in RTL */
.card {
  margin-left: 16px;
  padding-left: 24px;
  border-left: 2px solid var(--color-border);
}
```

Tailwind CSS with RTL plugin (or `rtl:` variants) is recommended.

---

## Theme Synchronization

The dashboard supports dynamic Light/Dark switching, and your app **must** respond. Set a data
attribute from `layout` on init, and re-apply it when the theme changes:

```ts
document.documentElement.setAttribute("data-theme", layout.theme ?? "light");

// Sync on live theme switches:
embedded.onThemeChange((theme) => {
  document.documentElement.setAttribute("data-theme", theme);
});
```

There is **no official published token set to import** — the goal is to **match Salla's look &
feel** (follow the [Salla Brand Guidelines](https://brand.salla.com/)). The brand colors below
come from the official design guidelines; use them (or their HSL equivalents) so your components
match the merchant's current theme. Ensure all elements stay legible in both modes.

**Light mode:**

| Token       | HSL            | Hex       | Use                                   |
| ----------- | -------------- | --------- | ------------------------------------- |
| `primary`   | `189 100% 17%` | `#004d5b` | Main brand color, deep teal headings. |
| `secondary` | `163 100% 82%` | `#73fcd7` | Mint/teal accents, active states.     |
| `success`   | `157 100% 34%` | `#00b259` | Positive feedback, active status.     |
| `danger`    | `358 89% 64%`  | `#f5434a` | Errors and destructive actions.       |
| `bg-main`   | `0 0% 97%`     | `#f8f8f8` | Main dashboard workspace background.  |

**Dark mode:**

| Token       | HSL            | Hex       | Use                                 |
| ----------- | -------------- | --------- | ----------------------------------- |
| `primary`   | `166 70% 84%`  | `#baefe3` | Light teal text / primary elements. |
| `secondary` | `166 70% 84%`  | `#baefe3` | Accent highlights in dark mode.     |
| `success`   | `157 100% 34%` | `#00b259` | Standard success green.             |
| `danger`    | `358 89% 64%`  | `#f5434a` | Standard error red.                 |
| `bg-main`   | `220 5% 12%`   | `#1d1e20` | Dark surface background.            |

```css
:root {
  --color-primary: #004d5b;
  --color-secondary: #73fcd7;
  --color-success: #00b259;
  --color-danger: #f5434a;
  --color-bg-main: #f8f8f8;
}
[data-theme="dark"] {
  --color-primary: #baefe3;
  --color-secondary: #baefe3;
  --color-success: #00b259;
  --color-danger: #f5434a;
  --color-bg-main: #1d1e20;
}
```

---

## Typography

Salla uses the **PingARLT** font family for a professional, readable experience across Arabic and
English. There is no public token set to import — match the dashboard's weight and spacing with a
clean sans-serif stack:

```css
body {
  font-family: "PingARLT", "IBM Plex Sans Arabic", system-ui, sans-serif;
  font-size: 14px;
  line-height: 1.5;
  color: var(--color-text);
}
```

| Size token  | px   | Use                          |
| ----------- | ---- | ---------------------------- |
| `text-xs`   | 11px | Labels, badges               |
| `text-sm`   | 13px | Secondary text, captions     |
| `text-base` | 14px | Body text (default)          |
| `text-lg`   | 16px | Card titles, section headers |
| `text-xl`   | 20px | Page titles                  |

---

## Iconography

Salla uses the **[Hugeicons](https://hugeicons.com/)** library for a clean, geometric, modern
visual language. Match it to feel native.

- Keep consistent stroke weights. If using SVG versions, convert strokes to shapes before scaling.
- SDK methods use the same icons — e.g. `nav.setAction` accepts an icon class. Use the standard
  Hugeicons class naming (e.g. `hgi hgi-stroke hgi-star`).

---

## Spacing

Use 4px base grid:

| Token     | px   | Use               |
| --------- | ---- | ----------------- |
| `space-1` | 4px  | Tight inline gaps |
| `space-2` | 8px  | Within components |
| `space-4` | 16px | Component padding |
| `space-6` | 24px | Between sections  |
| `space-8` | 32px | Page margins      |

---

## Layout & spacing — the "No-Chrome" rule

Your app runs **inside** the Salla Dashboard. Do **not** replicate the dashboard's navigation or
layout — that creates a confusing "nested dashboard" effect that wastes space.

- **No sidebar.** Use the dashboard's native app navigation.
- **No top navbar / in-iframe breadcrumbs.** Use `embedded.page.setTitle()` and
  `embedded.nav.setAction()` instead; toggle host breadcrumbs with `embedded.ui.breadcrumbs`.
- **Full width.** Let your content expand to fill the iframe container.
- **Good integration** uses native dashboard components and adheres to the dashboard theme/colors;
  **bad integration** adds its own chrome and off-brand colors.

> Before publishing, add the `1420×520 px` **Embedded App Banner** to your App Card (SKILL.md Step 1).

---

## Component Patterns

### Page Layout

```html
<div class="app-page">
  <!-- No page header needed — dashboard provides title via embedded.page.setTitle() -->
  <main class="app-content">
    <!-- content -->
  </main>
</div>
```

```css
.app-page {
  min-height: 100vh;
  background: var(--color-bg);
  padding: 24px;
}
.app-content {
  max-width: 960px;
  margin: 0 auto;
}
```

### Cards

```html
<div class="card">
  <div class="card-header">
    <h2 class="card-title">Section Title</h2>
  </div>
  <div class="card-body">
    <!-- content -->
  </div>
</div>
```

```css
.card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  overflow: hidden;
}
.card-header {
  padding: 16px 24px;
  border-bottom: 1px solid var(--color-border);
}
.card-body {
  padding: 24px;
}
```

### Buttons

Use native Salla UI toasts and confirms where possible. For inline buttons:

```css
.btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: opacity 0.15s;
}
.btn-primary {
  background: var(--color-primary);
  color: #fff;
}
.btn-secondary {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
}
.btn-danger {
  background: var(--color-danger);
  color: #fff;
}
.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
```

---

## Do / Don't

| Do                                               | Don't                                             |
| ------------------------------------------------ | ------------------------------------------------- |
| Use `embedded.ui.toast` for feedback             | Show your own custom toast overlays               |
| Use `embedded.ui.confirm()` for confirmations    | Build custom confirm modals or `window.confirm()` |
| Use `embedded.nav.setAction` for primary actions | Duplicate the Save button inside the page         |
| Match the dashboard theme                        | Use hardcoded colors                              |
| Support RTL text alignment                       | Use `text-align: left` globally                   |
| Call `embedded.ready()` after bootstrap          | Let the dashboard show a blank iframe             |
| Use bilingual labels everywhere                  | Show English-only text to Arabic merchants        |

---

## Resources

| Topic                 | Link                                                     |
| --------------------- | -------------------------------------------------------- |
| App Design Guidelines | https://docs.salla.dev/embedded-sdk/design-guidelines.md |
| Playground / testing  | https://docs.salla.dev/embedded-sdk/playground.md        |
