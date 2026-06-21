# Twilight Storefront JS SDK (`window.salla`) — method catalogue for app snippets

The **Twilight JS SDK** is the storefront runtime API exposed on `window.salla`. The
**Twilight theme engine auto-injects** it on **every storefront page** via the
`body:end` hook (`{% hook 'body:end' %}`) — so `window.salla` is already **loaded and
defined** before your snippet executes (no need to gate on `typeof salla`). Loaded is not
the same as fully initialized, though: some init-time `product::*`/`cart::*` events fire
**during** Twilight's init, so register those listeners at module top level — don't wait for
`onReady` (see device-mode.md). Source of truth: Twilight JS SDK Overview —
https://docs.salla.dev/422610m0.md; per-event listing — https://docs.salla.dev/422611m0.md.

This file catalogues the **methods/endpoints** (`salla.cart.addItem`, `salla.auth.login`,
…). The **events** (`cart::item.added`, the `product::fetch.succeeded` slider trap, the
three price encodings, the deploy guard, console noise) live in
[`device-mode.md`](device-mode.md) — methods here, events there.

---

## Scope: app snippets vs themes (read this first)

**Our scope is APPS, not themes.** An **App Snippet** is JS injected into the storefront
page; it runs in the same page as the theme, so it CAN call the same `salla.*` runtime.
But snippets are NOT themes — some SDK affordances are theme-development constructs and are
**out of scope**.

**App-snippet rules (these differ from themes):**

- **The SDK is already initialized for you — do not call `salla.init()`.** The theme inits it
  via `body:end`. `salla.init()` is only for standalone / non-theme HTML that loads
  `twilight.js` itself (Overview shows it under the "HTML" tab, not "Twilight Themes");
  calling it from a snippet re-inits an already-running SDK.
- **Reach the SDK at runtime, not via theme constructs.** Twig `{% hook %}`s, `<salla-*>`
  web components, theme settings / `twilight.json`, and the Twilight CLI are
  theme-development constructs that snippets cannot use. Get dynamic values from
  `salla.config.get(...)`, event payloads, and `salla.lang.get(...)` instead.
- **Bootstrap and event-timing, the pure-JS CDN file format, and the no-Twig rule** are in
  [device-mode.md](device-mode.md) — gate store-state reads on `salla.onReady`, register
  init-time `salla.event.*` listeners at module top level, and write plain JS (no `<script>`
  wrapper, no HTML). Snippets render before `</body>` (`place: "before"`, `tag: "body"`).

**Availability key per method below:**

- **App snippet ✅** — runtime `salla.*` JS. The default for almost every method here.
- **Theme-bound ⚠️** — only meaningful when wired to theme-rendered DOM or web components
  (`salla.form.onSubmit` binds a theme `<form>`; `salla-button` / `salla-verify-modal` are
  `<salla-*>` web components a theme ships). A snippet can still call the underlying method
  directly (e.g. `salla.comment.add({...})`) — it just shouldn't rely on theme markup.

### Glue with the rest of the kit

- **Storefront JS SDK (this skill)** = the **shopper's browser**, via app snippets —
  customer-side actions/events.
- **App Functions** ([salla-app-functions](../../salla-app-functions/SKILL.md)) =
  **server-side** (V8 isolate), merchant/server events.
- **The hookable rule** (from salla-app-expert): shopper's browser → snippet (here); a
  server event with an App Function trigger exists → App Function (preferred); else →
  webhook ([salla-webhooks](../../salla-webhooks/SKILL.md)).
- Do a customer-side action/listen here; for a **server reaction** (persist, sync, call the
  Admin API, react reliably) route to salla-app-functions / salla-webhooks. Native visible
  UI → [salla-storefront-ui](../../salla-storefront-ui/SKILL.md).

> Almost all methods return a **Promise** resolving to `{ status, success, message?, data }`.
> Each module also exposes alias events (`salla.event.<module>.on…` / `salla.<module>.event.on…`)
> — those are documented in [device-mode.md](device-mode.md) and the Events reference
> (https://docs.salla.dev/422611m0.md). Don't paste full payload schemas; confirm exact
> param/response shapes in the per-module doc linked at each section.

---

## Core

### Event — https://docs.salla.dev/422610m0.md · events https://docs.salla.dev/422611m0.md

App snippet ✅. Event-driven (EventEmitter2 under the hood).

- `salla.event.on(name, cb)` — subscribe (e.g. `'cart::item.added'`).
- `salla.event.once(name, cb)` — one-time listener.
- `salla.event.off(name, cb)` — unsubscribe.
- `salla.event.onlyWhen(name, cb)` / `.onlyWhen(name).then(…)` — fire once; runs
  immediately if already emitted, else waits.
- `salla.event.emit(name, data, …)` — emit; alias form `salla.event.<module>.<action>(data)`.
- Alias listeners: `salla.event.<module>.on<Action>(cb)` (e.g.
  `salla.event.auth.onVerified`).

### Configuration — https://docs.salla.dev/422610m0.md (Configuration)

App snippet ✅ (read). `set` is mainly for standalone init.

- `salla.config.get(path)` — dot-path read, e.g. `salla.config.get('user.id')`,
  `salla.config.get('store.id')`, `salla.config.get('currencies.SAR.code')`,
  `salla.config.get('page.slug')`. App settings are read via `salla.config.get('app.<key>')`
  (`public: true` settings only). Store-context paths, the app-settings bridge, and the
  defensive-read patterns (gate on `salla.onReady`, null-check, fallback chain) → device-mode.md
  (_Store context & language_).
- `salla.config.set(key, value)` / `salla.config.set({...})` — set config (standalone/init
  use; the theme already configured the SDK).
- `salla.config.currencies()` → Promise — full currencies list.
- `salla.config.languages()` → Promise — available languages.

### Storage — https://docs.salla.dev/422610m0.md (Storage)

App snippet ✅. Cross-browser local storage (Store.js). Token/cart/wishlist live here.

- `salla.storage.set(key, value)` · `salla.storage.get(key)` · `salla.storage.remove(key)`
- `salla.storage.clearAll()` · `salla.storage.each((value, key) => …)`
- Known keys: `salla.storage.get('token')`, `salla.storage.get('cart')`.

### Notify — https://docs.salla.dev/422610m0.md (Notify)

App snippet ✅ (prefer a theme-native notifier — see salla-storefront-ui).

- `salla.notify.success(message, data?)` · `salla.notify.info(message, data?)` ·
  `salla.notify.error(message, data?)`
- `salla.notify.setNotifier((message, type, data) => …)` — plug in an external notifier
  library (default falls back to `alert()`).

### Languages — https://docs.salla.dev/422610m0.md (Languages)

App snippet ✅ (translations are loaded by the theme init).

- `salla.lang.get(key)` — e.g. `salla.lang.get('pages.cart.free_shipping')`.
- `salla.lang.set(key, value)` — update an existing key of the current locale.
- `salla.lang.add(key, { ar, en, … })` — add one key across locales.
- `salla.lang.addBulk({ …keyPaths })` — add multiple keys across locales.
- `salla.lang.onLoaded(cb)` — run after translations finish loading.

### Helpers — https://docs.salla.dev/422610m0.md (Helpers)

App snippet ✅.

- `salla.url.get(route)` — absolute URL for a route. · `salla.url.asset(filePath)` —
  public asset path. · `salla.url.cdn(filePath)` — CDN resource path. ·
  `salla.url.is_page(slug)` — is the current page this slug (e.g. `'index'`,
  `'product.index'`).
- `salla.money(value)` or `salla.money({ amount, currency })` — format a number as currency
  (respects Arabic numerals).
- `salla.helpers.number(n)` — localize a number (Arabic numerals when enabled).
- `salla.helpers.hasApplePay()` → boolean — Apple Pay enabled + browser-supported.
- `salla.helpers.isPreview()` → boolean — page is inside the theme-customizer iframe
  (wraps an `isIframe` check). Useful to skip side-effects while previewing.

### Forms — https://docs.salla.dev/422610m0.md (Forms)

**Theme-bound ⚠️.** `salla.form.onSubmit` binds a theme-rendered `<form>` element:

```html
<form onsubmit="return salla.form.onSubmit('comment.add', event);">…</form>
```

It serializes the form inputs and calls the matching SDK method (e.g.
`salla.comment.add`). A **snippet** that doesn't render its own theme markup should call
the underlying method directly (`salla.comment.add({...})`) instead of relying on a theme
`<form>`. The `<salla-button type="submit">` shown in the docs is a `<salla-*>` web
component (theme-only) — don't ship one from a snippet.

### Metadata — https://docs.salla.dev/422610m0.md (Metadata)

App snippet ✅.

- `salla.metadata.fetchValues(entityType, ids[])` → Promise — fetch metadata for entities,
  e.g. `fetchValues('product', [1, 2, 3])`. Events: `valueFetched` / `valueNotFetched`.

---

## Auth — https://docs.salla.dev/422618m0.md

App snippet ✅ (the methods). The matching UI is the **Login web component**
(theme-bound ⚠️). Token storage / OAuth is server-side → salla-app-auth.

- `salla.auth.login({ type, phone?, country_code?, email? })` — `type: 'mobile'|'email'`;
  starts the access-code flow.
- `salla.auth.verify({ type, phone?/email?, country_code?, code })` — submit the OTP.
- `salla.auth.resend({ type, phone?/email?, country_code? })` — resend the access code.
- `salla.auth.register({ first_name, last_name, phone, country_code, country_key, email?, verified_by, code })`
- `salla.auth.logout()` — no args.
- `salla.auth.refresh()` — no args; new access token.

Alias events: `salla.event.auth.onCodeSent/onCodeNotSent/onVerified/onVerificationFailed/onRegistered/onRegistrationFailed/onLoggedOut/onFailedLogout/onRefreshFailed`.

---

## Cart — https://docs.salla.dev/422625m0.md

App snippet ✅.

- `salla.cart.addItem({ id, quantity, options?, notes? })` — `options` is
  `{ optionId: valueId | "string" | "url" }` for variable products.
- `salla.cart.quickAdd({ id })` / `salla.cart.quickAdd(id)` — add from a list without
  opening the product page (wraps `addItem`).
- `salla.cart.deleteItem({ id })` / `salla.cart.deleteItem(id)` — remove a line item.
- `salla.cart.deleteItem({ file_id })` — remove an uploaded image attached to an item.
- `salla.cart.addCoupon({ coupon })` / `salla.cart.addCoupon('CODE')` ·
  `salla.cart.deleteCoupon()` — remove the coupon.
- `salla.cart.details(null, includes?)` — cart details; `includes` e.g.
  `['options','attachments']`.
- `salla.cart.latest()` — last cart created by the customer.
- `salla.cart.getCurrentCartId()` — current cart id.
- `salla.cart.status({ cart_id })` — order/cart status.
- `salla.cart.priceQuote({ cart_id })` — price quote.
- `salla.cart.createQuickOrder({ email, phone, country_code, name, product_ids[], agreement })`
  — checkout shortcut.
- `salla.cart.getQuickOrderSettings()` · `salla.cart.getUploadImageEndpoint({ cart_id })`.

Alias events: `salla.cart.event.onItemAdded/onItemAddedFailed/onItemDeleted/…`,
`salla.event.cart.onCouponAdded/onLatestFetched/…` (and the `::` events in device-mode.md).

---

## Wishlist — https://docs.salla.dev/422654m0.md

App snippet ✅.

- `salla.wishlist.add({ id })` / `salla.wishlist.add(id)`
- `salla.wishlist.remove({ id })` / `salla.wishlist.remove(id)`
- `salla.wishlist.toggle({ id })` / `salla.wishlist.toggle(id)`

---

## Product — https://docs.salla.dev/422641m0.md

App snippet ✅. (For the _current_ product on a product page, see the
`product::fetch.succeeded` trap + web-components note in device-mode.md.)

- `salla.product.getDetails(id, includes?)` — e.g.
  `getDetails(23345, ['images','sold_quantity','category'])`.
- `salla.product.fetch({ source, source_value })` — list products, e.g.
  `{ source: 'categories', source_value: [1,2,3] }`.
- `salla.product.getPrice({ id, quantity, options?, notes? })` — price for simple/variable.
- `salla.product.api.fetchOptions(productIds[])` → Promise — options for products.
- `salla.product.categories({ id })` / `(id)` · `salla.product.offers({ id })` / `(id)`
- `salla.product.search({ query })` / `salla.product.search('text')`
- `salla.product.getSizeGuides(id)` · `salla.product.availabilitySubscribe({ id, country_code?, mobile? })`
- Gifts: `salla.product.addGiftToCart({ product_id, payload, withRedirect })` ·
  `salla.product.getGiftDetails({ product_id })` ·
  `salla.product.uploadGiftImage({ multipartPayload })`.

---

## Order — https://docs.salla.dev/422671m0.md

App snippet ✅.

- `salla.order.show({ id, url? })` — order details.
- `salla.order.cancel({ id })` / `salla.order.cancel(id)`
- `salla.order.sendInvoice({ id })` / `(id)` — email the invoice.
- `salla.order.createCartFromOrder({ id })` / `(id)` — re-order.

> No JS event marks order-success / thank-you — detect by URL (see device-mode.md).

---

## Rating — https://docs.salla.dev/422675m0.md

App snippet ✅.

- `salla.rating.store({ comment, order_id, rating })`
- `salla.rating.order({ order_id })` / `salla.rating.order(id)`
- `salla.rating.products({ products: [{ product_id, comment, rating }], order_id })`
- `salla.rating.shipping({ comment, order_id, rating, shipping_company_id })`

---

## Loyalty — https://docs.salla.dev/422667m0.md

App snippet ✅.

- `salla.loyalty.getProgram()` — program details.
- `salla.loyalty.exchange({ prize_id, cart_id })` — redeem points for a reward.
- `salla.loyalty.reset()` — remove an added reward from the live cart.

---

## Comment — https://docs.salla.dev/422681m0.md

App snippet ✅ (the methods; `salla.form.onSubmit('comment.add', …)` is theme-bound ⚠️).

- `salla.comment.add({ id, comment, type })` — `type: 'product' | 'page'`.
- `salla.comment.fetch({ id, type })` — fetch a comment.
- `salla.comment.getProductComments({ productId, page, per_page })` / `(productId, page, per_page)`
- `salla.comment.getPageComments({ pageId, page, per_page })` / `(pageId, page, per_page)`

---

## Profile — https://docs.salla.dev/422685m0.md

App snippet ✅ (the methods). Phone/email changes trigger an OTP; the docs wire that to the
`<salla-verify-modal>` web component (theme-only ⚠️) — a snippet must handle verification
itself.

- `salla.profile.update({ first_name, last_name, birthday?, gender?, phone, country_code, email })`
- `salla.profile.updateContacts({ phone, country_code, email })`

---

## Currency — https://docs.salla.dev/422679m0.md

App snippet ✅.

- `salla.currency.list()` — available currencies.
- `salla.currency.change({ currency_code })` / `salla.currency.change('SAR')`

---

## Booking — https://docs.salla.dev/422687m0.md

App snippet ✅.

- `salla.booking.add(productId)` — book a product/service.

---

## Component API (`salla.api.component.*`) — https://docs.salla.dev/422610m0.md

App snippet ✅. Read-only storefront component data.

- `salla.api.component.getMenus('header' | 'footer')` → Promise — store menus.
- `salla.api.component.getReviews({ per_page, type, items })` — e.g.
  `{ per_page: 5, type: 'product', items: 'testimonials' }`.

---

## Resources

| Topic                              | Link                               |
| ---------------------------------- | ---------------------------------- |
| Twilight JS SDK Overview (source)  | https://docs.salla.dev/422610m0.md |
| Twilight JS SDK Events (must read) | https://docs.salla.dev/422611m0.md |
| Twilight JS Web Components (theme) | https://docs.salla.dev/422688m0.md |
| Auth APIs                          | https://docs.salla.dev/422618m0.md |
| Cart APIs                          | https://docs.salla.dev/422625m0.md |
| Wishlist APIs                      | https://docs.salla.dev/422654m0.md |
| Product APIs                       | https://docs.salla.dev/422641m0.md |
| Order APIs                         | https://docs.salla.dev/422671m0.md |
| Rating APIs                        | https://docs.salla.dev/422675m0.md |
| Loyalty APIs                       | https://docs.salla.dev/422667m0.md |
| Comments APIs                      | https://docs.salla.dev/422681m0.md |
| Profile APIs                       | https://docs.salla.dev/422685m0.md |
| Currency APIs                      | https://docs.salla.dev/422679m0.md |
| Booking APIs                       | https://docs.salla.dev/422687m0.md |
