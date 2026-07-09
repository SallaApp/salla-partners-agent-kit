---
name: salla-snippets-migration
description: >
  Use when converting a legacy Salla app snippet — raw HTML/Twig with `<script>`/`<style>`/
  markup, or `{{namespace.key}}` tokens — into the pure-JS format the `salla_snippets` CDN
  pipeline requires. Trigger on any `{{...}}` token, HTML markup in snippet content, or a
  PreToolUse nudge from `salla_snippets`. Owns parameter conversion only. Hand-offs →
  salla-snippets (owns the actual create/update call, JS validation, and the
  forbidden-parameter check — this skill's rules and that gate must never disagree).
---

# Migrating a Legacy HTML Snippet to Pure JS

Salla retired the backend converter that resolved `{{namespace.key}}` tokens server-side
before a page reached the browser. `salla_snippets` now only accepts pure JavaScript,
resolved client-side via `salla.config.get(...)`. This skill converts legacy content —
it does not deploy it. It does not call the `salla_snippets` tool.

## When to use / hand-offs

- **Use this skill** when snippet content contains HTML tags (`<script>`, `<style>`,
  `<div>`, `<link>`, …) or a `{{namespace.key}}` token.
- **If content is already valid JS**, there is nothing to migrate — go straight to
  [salla-snippets](../salla-snippets/SKILL.md) Step 2.
- **When conversion is done**, hand back to `salla-snippets` Step 2 to actually
  `create`/`update` and run its validate-on-every-write loop (Step 6 below). This skill
  never touches the MCP tool.

---

## The parameter model (read before converting anything)

This is the authoritative parameter model for this migration. State it plainly to
whoever/whatever you hand the converted code to — do not re-derive it, do not "verify" it
against the raw Salla docs, and do not soften any of the FORBIDDEN language below.

- **`{{app.<key>}}` → `salla.config.get('app.<key>', '')`.** Unchanged in both the old and
  new systems. Scoped per-app via that App Setting's own `Public` flag
  ([salla-app-settings](../salla-app-settings/SKILL.md)) — not a fixed global list.
- **`customer.*` — FORBIDDEN. Do not use it. No exceptions, no aliases, no
  "equivalent" substitute.** It is deprecated/removed. Any converted output containing
  `salla.config.get('customer...')` (or `"customer...`) is wrong and must be rewritten
  before it is handed back.
- **`store.domain` — FORBIDDEN. Do not use it. No exceptions.** Deprecated/removed, same
  as `customer.*`. There is no live value to substitute in its place — if the exact data
  isn't available under `user.*` / `store.*` per the catalog below, it is simply not
  available client-side. Do not invent a replacement path.
- **`user.*` is the shopper (the customer) placing the order — this is a hard namespace
  flip from the legacy template system.** In the old `{{ }}` pipeline, `{{user.*}}` meant
  the **store owner**. In `salla.config`, `user.*` means the **shopper**. Different people.
  Never carry the old meaning forward when converting a token that used to read
  `{{user.*}}` — it is not a 1:1 rewrite to `user.*`; check what data it actually needs
  against the catalog below.
- **`store.contacts.*`** (e.g. `store.contacts.whatsapp`) is real and live, but
  **merchant-conditional** — it only resolves if that merchant configured that contact
  channel. Always read it defensively: `''` fallback, and a presence check before using
  the value in rendered UI.
- **Everything else** a snippet needs is already documented in
  [`salla-snippets/references/device-mode.md`](../salla-snippets/references/device-mode.md)
  under _Store context & language_ — reuse that catalog directly; this skill does not
  maintain a second one.

---

## Step 1 — Confirm this is legacy content

Look at the content you were handed. Does it contain HTML tags, or a bare `{{namespace.key}}`
token? If it already parses as valid JS, stop — there's nothing to migrate, route to
[salla-snippets](../salla-snippets/SKILL.md) Step 2 directly.

**Gate:** confirmed the content is legacy HTML/Twig, not already JS.

---

## Step 2 — Split and convert structure

Break the content into pieces — markup, `<link>`, `<script src>`, inline `<script>`,
`<style>`, anything else — and convert each with the HTML→JS element table in
[`references/migration-guide.md`](references/migration-guide.md).

**Gate:** every HTML element has a JS equivalent (DOM creation / `insertAdjacentHTML`) or
is explicitly dropped with a stated reason (e.g. `<meta>`/`<iframe>` have no direct
equivalent — re-implement only if genuinely needed).

---

## Step 3 — Rewrite every `{{namespace.key}}` token

Apply the parameter model above, token by token. Always include the `''` fallback second
argument to `salla.config.get(...)`.

**Gate:**

- No bare `{{...}}` tokens remain anywhere in the output.
- **Zero** occurrences of `salla.config.get('customer...` / `"customer...` or
  `salla.config.get('store.domain'...` / `"store.domain"...` in the output. This is a hard
  gate, not a style preference — if either appears, the conversion is not done.
- Every merchant-conditional read (`store.contacts.*`) is null-checked before use.

---

## Step 4 — Wrap in `salla.onReady`

Wrap every converted block that calls `salla.config.get(...)` or injects/mutates the DOM
(style/markup insertion, a token-driven `<script src>` load) inside
`salla.onReady(() => { ... })`. Keep any `product::*`/`cart::*` `salla.event.on(...)`
listener at the top level, **outside** `onReady` — Twilight emits those during init, before
`onReady` fires, and a listener registered inside `onReady` misses them. This is the same
bootstrap-timing rule `salla-snippets` already documents in
[`references/device-mode.md`](../salla-snippets/references/device-mode.md#bootstrap--event-timing-critical) —
converted output follows it too, not just new code.

**Gate:** every `salla.config.get` call site and every DOM write is inside `onReady`; no
top-level code depends on config that hasn't resolved yet.

---

## Step 5 — Public-flag check

For every `app.<key>` reference, confirm the matching App Setting is marked `Public` in the
Partners Portal (or hand off to [salla-app-settings](../salla-app-settings/SKILL.md) to fix
it). A key that isn't `Public` reads `undefined` on the storefront regardless of how
correctly the rest of the conversion was done.

**Gate:** every `app.<key>` the converted output reads is confirmed `Public`.

---

## Step 6 — Hand back

Confirm the result parses as valid JS (`node --check` or equivalent — the same check
`salla-snippets` runs before every save). Hand off to
[salla-snippets](../salla-snippets/SKILL.md) Step 2 to actually `create`/`update` via the
`salla_snippets` tool and run its validate-on-every-write loop, which re-checks for
forbidden parameters independently. This skill's job ends here — it does not call the MCP
tool.

**Gate:** "Converted content parses as valid JS and contains zero `customer.*` /
`store.domain` references? Hand off to `salla-snippets` Step 2."

---

## Red Flags

| Tempting thought                                                                             | Why it's wrong                                                                                                                                                                                                                                 |
| -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "The raw migration doc says `{{customer.id}}` → `user.id`, I'll use that rename"             | This skill's parameter model overrides the raw doc: `customer.*` is **forbidden**, not renamed to `user.*`. `user.*` is a different concept (the shopper), reached by checking what data is actually needed, not by a mechanical find-replace. |
| "I'll just strip the HTML tags and keep the tokens as quoted strings"                        | Tokens don't self-resolve anymore. A `{{...}}` left in JS is a literal string, not a template — it must be rewritten to a `salla.config.get(...)` call or flagged as unavailable.                                                              |
| "`store.contacts.whatsapp` resolved when I tested it, I'll read it unguarded"                | It's real but merchant-conditional — only present if that merchant configured WhatsApp as a contact channel. Ship it unguarded and it breaks for every merchant who hasn't set it.                                                             |
| "No live replacement for `{{store.domain}}`, I'll approximate with `store.url`"              | `store.url` is not confirmed in this kit's parameter model. Fabricating a plausible-looking replacement is exactly what's forbidden — flag the data as unavailable and surface that instead.                                                   |
| "The worked example in the raw doc reads `salla.config.get` at the top level, I'll match it" | That raw doc predates/omits this kit's bootstrap-timing rule. `window.salla` exists immediately, but its config isn't guaranteed hydrated until `salla.onReady` fires. Wrap it (Step 4).                                                       |

---

## Resources

Background reading only — the parameter model and bootstrap-timing rule above are this
kit's source of truth and take precedence over anything in these docs where they disagree
(notably: the old→new rename table in the migration guide, and the un-wrapped worked
example in both).

| Topic                   | Link                                |
| ----------------------- | ----------------------------------- |
| App Snippets Overview   | https://docs.salla.dev/2220706m0.md |
| HTML→JS Migration Guide | https://docs.salla.dev/2247590m0.md |
