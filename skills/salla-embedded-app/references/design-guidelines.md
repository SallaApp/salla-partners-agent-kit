# Embedded App — Design Guidelines

Your app runs inside the Salla Merchant Dashboard. It must look and behave like a native part of the platform — not a foreign iframe.

---

## Core Requirements

| Requirement | Detail |
| --- | --- |
| **Bilingual** | Support Arabic (`ar`) and English (`en`). Arabic is RTL. |
| **Responsive** | Adapt to the iframe container width — no fixed widths |
| **Theme-aware** | Match `light` or `dark` dashboard theme |
| **Accessible** | Follow WCAG 2.1 AA — color contrast, keyboard nav, focus states |
| **No horizontal scroll** | Content must never overflow the iframe width |

---

## RTL Support

Apply direction from the `lang` query param:

```ts
const lang = new URLSearchParams(window.location.search).get('lang') ?? 'ar';
document.documentElement.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
document.documentElement.setAttribute('lang', lang);
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

Read the `theme` param and set a data attribute:

```ts
const theme = new URLSearchParams(window.location.search).get('theme') ?? 'light';
document.documentElement.setAttribute('data-theme', theme);
```

Use CSS variables that respond to the attribute:

```css
:root,
[data-theme='light'] {
  --color-bg:        #ffffff;
  --color-surface:   #f5f5f5;
  --color-text:      #1a1a1a;
  --color-text-muted:#6b7280;
  --color-border:    #e5e7eb;
  --color-primary:   #6d28d9;   /* Salla purple */
}

[data-theme='dark'] {
  --color-bg:        #0f0f0f;
  --color-surface:   #1a1a1a;
  --color-text:      #f5f5f5;
  --color-text-muted:#9ca3af;
  --color-border:    #2d2d2d;
  --color-primary:   #7c3aed;
}
```

---

## Typography

Match the Salla dashboard font stack:

```css
body {
  font-family: 'IBM Plex Sans Arabic', 'Inter', system-ui, sans-serif;
  font-size: 14px;
  line-height: 1.5;
  color: var(--color-text);
}
```

| Size token | px | Use |
| --- | --- | --- |
| `text-xs` | 11px | Labels, badges |
| `text-sm` | 13px | Secondary text, captions |
| `text-base` | 14px | Body text (default) |
| `text-lg` | 16px | Card titles, section headers |
| `text-xl` | 20px | Page titles |

---

## Spacing

Use 4px base grid:

| Token | px | Use |
| --- | --- | --- |
| `space-1` | 4px | Tight inline gaps |
| `space-2` | 8px | Within components |
| `space-4` | 16px | Component padding |
| `space-6` | 24px | Between sections |
| `space-8` | 32px | Page margins |

---

## Component Patterns

### Page Layout

```html
<div class="app-page">
  <!-- No page header needed — dashboard provides title via Salla.page.setTitle() -->
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
.btn-primary  { background: var(--color-primary); color: #fff; }
.btn-secondary { background: var(--color-surface); border: 1px solid var(--color-border); }
.btn-danger   { background: #ef4444; color: #fff; }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }
```

---

## Do / Don't

| Do | Don't |
| --- | --- |
| Use `Salla.ui.toast` for feedback | Show your own custom toast overlays |
| Use `Salla.ui.confirm` for destructive actions | Use `window.confirm()` |
| Use `Salla.nav.addButton` for primary actions | Duplicate the Save button inside the page |
| Match the dashboard theme | Use hardcoded colors |
| Support RTL text alignment | Use `text-align: left` globally |
| Call `Salla.page.resize()` after layout changes | Rely on `height: 100vh` |
| Use bilingual labels everywhere | Show English-only text to Arabic merchants |

---

## Resources

| Topic | Link |
| --- | --- |
| App Design Guidelines | https://docs.salla.dev/1929178 |
| Playground Testing | https://docs.salla.dev/1929235 |
