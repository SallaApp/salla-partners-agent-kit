---
description: Audit a Salla app implementation for correctness, security, and release readiness. Returns blockers, risks, fixes, and verification steps.
---

# /audit — Salla App Audit

Audit the current Salla app implementation end to end. Run every check below, report all findings, then summarise blockers before returning.

## 1. OAuth & tokens

- Easy Mode vs Custom Mode — is the choice correct for this app type?
- Access token stored securely (not in logs, not in client-side code)?
- Refresh lock / mutex in place to prevent concurrent refresh races?
- `offline_access` scope requested where background jobs need it?
- `app.store.authorize` handler saves the token immediately?

## 2. Webhooks

- Signature verified on every incoming webhook (`X-Salla-Signature`)?
- Handler returns HTTP 200 within 5 s (defers slow work async)?
- Idempotency key checked before processing (events redeliver)?
- Webhook URL registered via `salla_apps action=connect`?

## 3. App Settings

- Settings schema defined with `salla_settings action=define_form`?
- All field types use `type+format` (not loose `toggle`/`text`/`select`)?
- Required fields have a default `value`?
- IDs are `snake_case` (camelCase breaks Portal saves)?
- `app.settings.updated` webhook handler reads and applies changes?

## 4. Embedded dashboard (if applicable)

- `@salla.sa/embedded-sdk` initialised before any SDK call?
- No Chrome (no custom nav bars, no external links that break the iframe)?
- Auth token sourced from SDK (`salla.auth.token`), not stored locally?
- Resizes handled via `salla.layout.onResize`?

## 5. Storefront snippets (if applicable)

- Snippet uses the correct mode (Device for browser JS, Cloud for server logic)?
- An App Function trigger exists for the event before falling back to a webhook?
- No blocking `fetch` calls on the critical render path?

## 6. App Functions (if applicable)

- Handler uses `Resp.success()` / `Resp.error()` (not raw JSON for sync actions)?
- No `npm` imports — only Web Crypto and built-ins available in the V8 sandbox?
- Sync handlers complete within 500 ms; async within 30 s?
- `AbortController` wired for timeout on any internal fetch?

## 7. Lifecycle events

- `app.installed` → provisions resources + stores token?
- `app.uninstalled` → cleans up merchant data?
- `app.updated` → re-reads settings, updates scopes if needed?
- Trial/subscription events update entitlement state?

## 8. Billing & entitlements (if monetised)

- Plans defined in the publish payload (not just in Portal UI)?
- Feature gates check entitlement before serving premium features?
- `app.subscription.expired` / `.canceled` revokes access?

## 9. Publication readiness

- Logo uploaded as image ID (min 250 × 250 px, 1:1)?
- Min 3 screenshots uploaded as image IDs?
- `salla_apps action=publish` saved (`action: "save"`) after every config change?
- Communication apps: `salla_settings action=set_features` called before submit?
- Shipping apps: Salla-assigned Company ID set?

## Output format

```
## Blockers (must fix before submit)
- …

## Risks (should fix)
- …

## Passed checks
- …

## Verification steps
- …
```

Use the MCP tools to read live config where possible (`salla_apps action=get`, `salla_snippets action=list`, `salla_embedded_pages action=list`) rather than relying solely on local code.
