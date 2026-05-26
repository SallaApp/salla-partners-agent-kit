# Embedded App

Embedded apps render in an iframe inside the Salla merchant dashboard.
SDK package: https://www.npmjs.com/package/@salla.sa/embedded-sdk
Testing with demo stores: https://salla.dev/blog/how-to-test-your-app-using-salla-demo-stores/

## SDK setup

```typescript
import("@salla.sa/embedded-sdk").then((mod) => {
  const embedded = mod.default ?? mod;
  embedded.init?.();
  embedded.ready?.(() => {
    embedded.page?.setTitle?.("My App Title");
  });
  embedded.onThemeChange?.((theme: string) => {
    document.documentElement.setAttribute("data-theme", theme);
  });
  embedded.onLangChange?.((lang: string) => {
    const l = lang === "ar" ? "ar" : "en";
    document.documentElement.setAttribute("lang", l);
    document.documentElement.setAttribute("dir", l === "ar" ? "rtl" : "ltr");
    embedded.page?.setTitle?.(LABELS[l].title);
  });
});
```

## Reading token and hints from query params

Salla passes initial values as URL query parameters on the iframe URL:

```typescript
const params = new URLSearchParams(window.location.search);
const token = params.get("token"); // use as Bearer token for your API calls
const lang = params.get("lang") ?? "en"; // "en" | "ar"
const theme = params.get("theme") ?? "light"; // "light" | "dark"
```

Apply the initial lang and theme immediately at page load (before the SDK fires change events).

## RTL

Set `dir="rtl"` on `<html>` when lang is `"ar"`. Salla merchants may switch lang at any
time — handle `onLangChange` to update direction dynamically.
