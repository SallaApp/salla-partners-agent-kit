# Embedded App — Design Guidelines

Your app runs inside the Salla Merchant Dashboard. It must look and behave like a native part of the platform — not a foreign iframe.

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
document.documentElement.setAttribute(
  "dir",
  layout.lang === "ar" ? "rtl" : "ltr",
);
document.documentElement.setAttribute("lang", layout.lang);
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

Set a data attribute from the same `layout`:

```ts
document.documentElement.setAttribute("data-theme", layout.theme ?? "light");
```

Use CSS variables that respond to the attribute:

```css
:root {
  --color-primary: #004d5b;
  --color-secondary: #73fcd7;
  --color-success: #00b259;
  --color-danger: #f5434a;
  --color-bg-main: #f8f8f8;
  --font-main: "Outfit", sans-serif;
}
```

---

## Typography

Match the Salla dashboard font stack:

```css
body {
  font-family: "IBM Plex Sans Arabic", "Inter", system-ui, sans-serif;
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
  background: #ef4444;
  color: #fff;
}
.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
```

---

## Do / Don't

| Do                                               | Don't                                      |
| ------------------------------------------------ | ------------------------------------------ |
| Use `embedded.ui.toast` for feedback             | Show your own custom toast overlays        |
| Use `window.confirm()` only as fallback          | Build custom confirm modals                |
| Use `embedded.nav.setAction` for primary actions | Duplicate the Save button inside the page  |
| Match the dashboard theme                        | Use hardcoded colors                       |
| Support RTL text alignment                       | Use `text-align: left` globally            |
| Call `embedded.ready()` after bootstrap          | Let the dashboard show a blank iframe      |
| Use bilingual labels everywhere                  | Show English-only text to Arabic merchants |

---

## Resources

| Topic                 | Link                           |
| --------------------- | ------------------------------ |
| App Design Guidelines | https://docs.salla.dev/1929178 |
| Playground Testing    | https://docs.salla.dev/1929235 |
