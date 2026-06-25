# Changelog

All notable changes to the Salla Partners Agent Kit are recorded here. Partners who
installed an earlier kit can use this to tell whether their skills are stale after a Salla
platform change.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). This kit
versions the **skill content as a whole** — the `version` field in `package.json`,
`.claude-plugin/plugin.json`, `.plugin/plugin.json`, `.hermes-plugin/plugin.yaml`, and
`gemini-extension.json` moves together (the structural validator enforces this).
`.claude-plugin/marketplace.json` carries no version field and is not bumped.

## [1.0.10] — 2026-06-25

### Changed

- **Onboarding: enforce form-before-handler ordering and a confirm-the-form-exists gate.** From
  FlashTimer QA: an agent that saved the App Function before the step existed (or created a step
  with empty `fields`) hit a confusing `Unknown trigger` and produced non-functional steps. The
  onboarding contract now states the order explicitly — build the step (the form, with non-empty
  `fields`) FIRST, confirm it with `salla_onboarding_steps action=list`, THEN save the handler —
  because the trigger `app.onboarding.step.creating.{slug}` is resolved from the saved step and
  only exists once the step does (saving first returns `Unknown trigger`; the trigger is
  dynamic/per-step and correctly absent from `list_triggers`). Added a Red Flags table
  (handler-before-form, the absent `list_triggers` entry, empty `fields`, `{ar,en}` `title`) and
  strengthened the handler-step gate to require the form-exists confirmation. Touches
  `salla-app-builder` (Step 5a + `references/onboarding-steps.md`).
- **App Functions: poll `deploy_status` with `job`, not `job_id`.** `salla_functions action=save`
  returns the deploy id under the key `job`; the polling docs now use `job` to match, so an agent
  passes back the exact key it received. Touches `salla-app-functions-test` and
  `salla-app-functions-release`.

## [1.0.9] — 2026-06-25

### Changed

- **Addons are always one-time at the publication level — renewal is the single `support_renew`
  flag.** Removed `price_model` and `frequency` from the addon publish shape (the platform now
  ignores them and pins the addon to `once`). Partners send `{name, description, price, slug,
support_renew}`: `support_renew:false` (default) ⇒ a one-time purchase, merchant receives addon
  subscription events with type `once`; `support_renew:true` ⇒ an `external_recurring` addon — the
  partner drives each renewal via the addon renewal API and must state the cycle plainly in the
  addon title/description (the merchant can't infer it). Touches `salla-app-billing`
  (`references/pricing-shapes.md` addon table + the Addons bullet) and
  `salla-publication-consistency` (`references/step-pricing.md` Addons row). Renewal runtime
  (webhook `once` vs `external_recurring`, the renew API) stays owned by `salla-addon-purchase`.
- **Onboarding steps: no `url`, single-language `title`, mandatory settings + handler, and a
  re-entrant rule.** Corrected the onboarding-steps contract: a step is a **settings form, not
  an iframe** (there is **no `url`** input), and `title` is a **single-language plain string**,
  not an `{ar,en}` object. Each step is **two mandatory parts**: (1) `salla_onboarding_steps
action=create` with a fixed `slug` and **non-empty `fields`** (the **same schema as public
  app settings** → salla-app-settings); (2) its App Function via `salla_functions` with trigger
  `app.onboarding.step.creating.{slug}` and context `Onboarding`. The merchant's saved input
  arrives as key/value in `context.payload.data.fields` (step identified by `step.slug` +
  `step.sort`) for validation or custom logic. **The handler must be re-entrant** — it fires on
  every submit (the merchant can edit and re-save before activating), so upsert and re-validate
  each run. Touches `salla-app-builder` (Step 5a + `references/onboarding-steps.md`).

## [1.0.8] — 2026-06-24

### Changed

- **App events are auto-delivered — subscribe only to store events (kit-wide).** Corrected the
  event-subscription model across the kit: `app.*` events (`app.installed`, `app.store.authorize`,
  `app.updated`, `app.uninstalled`, `app.trial.*`, `app.subscription.*`, `app.settings.updated`)
  arrive at the app's `webhook_url` automatically — the app is subscribed to its own app events by
  default — so partners **set a `webhook_url` and HANDLE them**, never `salla_events
action=subscribe`; that action is scoped to non-app **store** events (`order.*`, `product.*`,
  `customer.*`, `cart.*`, store-side `shipment.*`). Touches `salla-app-billing` (Step 2 + gate +
  Red Flag + `references/subscription-events.md`), `salla-publication-consistency` (Step 6b billing
  gate + Red Flags + `step-app-config`), `salla-app-lifecycle`, `salla-app-auth`,
  `salla-addon-purchase`, `salla-webhooks` (app-event vs store-event split), and a
  `salla-live-testing` note. Grounded in the App Events ref `421413m0`. This also corrects the
  v1.0.7 billing-cycle gate, which had said to verify `app.subscription.*` is _subscribed_.
- **App Function handlers are gated on the fetched type definitions, and stay minimal.** A build
  post-mortem (a shipping handler guessed `sender_address`/`weight` instead of reading the real
  `Shipments` payload) surfaced a missing gate: `salla-app-functions-handler` now opens with a
  numbered, gated step — fetch every URL in the `types` array from `salla_functions action=get`
  and read the exact `context.payload.data` field names from those `.d.ts` before writing — and
  the rule is **strict for writing OR modifying** any function. Adds a "keep it minimal — delegate
  to your own API" principle (the function is a thin transform layer: read payload → call your
  backend → map to `Resp`). `salla-shipping-app` Step 4 routes the handler body here with a
  matching gate.

Paired with partners-mcp: `app_publish` maps the `already_submitted` 403 to withdraw/check-status
guidance, and the `salla_events` tool description scopes `subscribe` to store events.

## [1.0.7] — 2026-06-23

### Changed

- **`salla-publication-consistency` is now the master publication router.** Added the
  `app_publish action=get` step to read the FULL current draft (`publication_last_save`) before
  filling/validating — resume/review without re-asking; per-step **reference docs**
  (`references/step-*.md`) carrying data retrieval + submission schema + how-to-submit, aligned
  with the front-end's steps; a **step-by-step validation** model (`set` = per-section format,
  `readiness` = completeness, `validate` = cross-field gate); a **billing-cycle submit gate**
  (paid pricing → verify `app.subscription.*` subscribed + handlers confirmed, else save a draft
  and wire the cycle first) with Red Flags; first-publish onboarding now **suggests the
  publication-only monetization features** (addons, trials, promotions, comparison matrix,
  recommended plan, strikethrough pricing, adjustable features, unsubscribe rewards); and routes
  the partner to the **educational-video guide** when `video_url` is missing.
- **`salla-app-billing` — full pricing models.** New `references/pricing-shapes.md` documents
  subscriptions + one-time grounded in the real payloads + server rules: full plan object
  (`recommended`/`balance`/`promotions`/`id`…), `recurring` incl. `one-time`, the `plan_features`
  matrix, `on_demand_type`, the once-model (`one_time_old_price`, `plan_additional_features`), the
  addon object, and the `plan_type` vs `plan.recurring` / `plan_additional_features` vs
  `additional_features` naming traps. Documented the **renew API**
  (`POST /apps/subscriptions/{id}/renew`, external_recurring = partner-driven) and the **app+addon
  subscription retrieval**, citing the live OpenAPI docs as source of truth (renew `37396517e0`,
  subscription events `2213496m0`, subscription schema `5401098e0`, app events `421413m0`).
- **Free plans are eligibility-gated.** `salla-app-billing` now states `plan_type: "free"` (and a
  plan's `recurring: "free"`) is allowed only when `can_have_free_plan` is true (shipping/communication
  app or the `show_app_free_plan` feature) — read it from app details before offering free; the
  Portal rejects it for an ineligible app on both `set` and submit (mirrors the FE). Paired with the
  DevelopersPortal change exposing `can_have_free_plan` + gating the per-section `set`.
- **Publish prerequisites documented.** `salla-publication-consistency` now gates the flow on three
  prerequisites: the app must be publishable (`can_publish` true — read from app details), the
  partner's account must be verified at `portal.salla.partners/account` (else submit fails with
  `id_verification`), and an SMS communication app must upload a **CITC certification** on the
  verification form (`salla-communication-app`) — read concretely from the `requires_citc` flag.
  `app_publish action=get` surfaces `can_publish`, `requires_citc`, and `can_have_free_plan`.
- **`salla-addon-purchase` / `salla-addon-purchase-embedded`** — the external_recurring renewal
  obligation (renew API); external_recurring addons may renew on any custom logic, which must be
  stated in the addon `description`; in-app purchase runs through the **checkout SDK** (cited the
  create/add-ons/result module docs); the addon `slug` is the partner's own pre-known identifier.
- **Pretool hook** — `app_page_builder` now routes through the master publication skill (it is the
  publication-coupled App Store listing builder, distinct from the embedded dashboard UI).

Paired with partners-mcp: `app_publish action=get`, per-section validation-error surfacing on
`set`, the `one_time_old_price`/`plan_additional_features` pricing fields, and a paid-pricing
billing-cycle warning on `validate`.

- **Skill-quality pass** (kit-wide judge findings): added **Red Flags** tables to
  `salla-communication-app` (declare-features-before-publish/403, App-Functions-over-server,
  CITC-for-SMS, never-store-provider-keys) and `salla-addon-purchase-embedded`
  (activate-only-on-verified-webhook, Salla-owns-billing, match-by-`item_slug`,
  reconcile-server-not-client); added per-step **`Gate:`** lines to `salla-communication-app`
  (create/declare/handler/test) and `salla-storefront-ui` (build-native); and reworded
  descriptions to explicit **"Use when…"** triggers (`salla-communication-app`,
  `salla-shipping-app`, `salla-storefront-ui`, and trimmed the workflow summary out of
  `salla-app-functions-release`).

## [1.0.6] — 2026-06-23

### Changed

- **`salla-webhooks`** — document that `salla_events action=subscribe` REPLACES the whole
  subscription list, and that removing ALL subscriptions is done with `clear_all: true` (an
  empty `events: []` is rejected to avoid an accidental wipe).

## [1.0.5] — 2026-06-23

### Changed

- **The merchant settings form is for public/private/communication apps — not shipping
  apps.** `salla-app-settings` now states up front that the form (`salla_settings
define_form` / `set_validation_url`) applies to public, private, and communication apps,
  and that shipping apps have no merchant settings form — they configure shipping via
  `salla_shipping` (zones/settings); the Portal rejects `POST /settings` for a shipping app.
  Added a Red Flags row to that effect, routing to `salla-shipping-app`. `salla-shipping-app`
  Step 3 gains the matching note (don't call `salla_settings define_form`; shipping config is
  `salla_shipping`), routing the settings-form concept back to `salla-app-settings`.
- **Private apps are published in the Portal, not via the MCP.** `salla_apps action=publish_private`
  was removed from the Salla Partners MCP. A private app has no onboarding and no MCP publish
  action — the partner sends its publish request from the app-details page
  `https://portal.salla.partners/apps/{app_id}`; public apps still use the stepwise
  `app_publish` flow. Swept every `publish_private` / `POST /app/{id}/private-publish`
  reference accordingly (and dropped the obsolete `update_note`) across `salla-app-builder`
  (Tools table, Step 8 decision + Gate, publishing Red Flags), `salla-app-expert` (MCP/routing
  tables), `salla-publication-consistency` (private hand-off), `salla-shipping-app` (Tools
  table + publish note), `salla-app-functions` (Step-6 row + `salla_apps` cell), and
  `salla-app-functions-release` (description, publish step, checklist, gate).
- **Documented the free-private-app limit.** A company gets a limited number of free private
  apps (`private_apps_limit`, effectively one); creating an additional private app requires it
  be paid — set `is_paid: "1"` on `salla_apps action=create`, otherwise `create` returns
  `free_private_apps_disabled` (403). `salla-app-builder` Step 1 now states this as a positive
  recipe (create-app field table + a create-step Red Flags row).

## [1.0.4] — 2026-06-23

### Changed

- **Publish flow now stops at a validated draft.** `app_publish` no longer submits to admin
  review — its terminal action is `validate`, which validates every section and **saves a
  DRAFT**, returning a valid publication. After a clean validate, the agent guides the
  **partner** to review and submit in one click at
  `https://portal.salla.partners/apps/{app_id}/publish` (with the app's **real** id
  substituted). The agent never submits to Salla review itself. Updated
  `salla-publication-consistency` (loop table, sequence, gates, Red Flags),
  `salla-app-builder` (Step 8), and the `salla-app-expert` routing/MCP tables.
- **Swept every remaining `salla_apps action=publish` reference** (that action was removed —
  publishing is now `app_publish` for public apps, `salla_apps action=publish_private` for
  private apps) across `salla-app-builder`, `salla-app-expert`, `salla-app-billing`,
  `salla-addon-purchase`, `salla-app-functions`, `salla-app-functions-release`, and
  `salla-shipping-app`. Pricing/plans/addons are now set via the publication's `pricing`
  section (`app_publish action=set section=pricing`) then `validate`, not a separate publish
  call. `salla-app-functions-release` reframed: the agent **validates** the publication
  (saves a draft) and the **partner** does the one-click submit in the Portal — the agent
  never admin-submits; the pre-publish security scan runs before the partner submits.
- **salla-webhooks** — document the two verification strategies distinctly: `token` is
  plain equality (`Authorization` header `===` `webhook_secret`, **not** HMAC); `signature`
  is HMAC-SHA256 of the raw body. `webhook_security_strategy` must be set **explicitly** —
  unset = `none` = no verification. Added the `@salla.sa/*` server packages
  (`webhooks-actions`, `passport-strategy`, `event`, `embedded-sdk`) with the Next.js
  serverless caveat on `webhooks-actions`' file-dispatch.
- **salla-app-auth** — persist merchant tokens in a real datastore keyed by `merchant`
  (`/tmp` / in-memory are wiped on cold start → 403, app looks uninstalled); `generate_secret`
  **rotates** the signing secret, so read the live `webhook_secret` via `salla_apps action=get`
  before deploy and never reuse one carried across sessions.
- **salla-app-expert / salla-app-builder** — read every concrete value (URLs/domains,
  secrets, event names, algorithms, package APIs) from its **live source at point of use**,
  never invented or carried across a context compaction; verify the deployed domain before
  writing any URL into Salla; domain-change consistency checklist; read back after every mutate.

### Added

- **Listing-image asset rule** (owned by `salla-app-ui-builder`, referenced from
  `salla-publication-consistency`): the listing needs real `logo` + ≥3 screenshots (App
  Information) and `banner` + `embedded_image` (App Features). Ask the user to provide the
  required images; if they decline, proceed with clearly-marked placeholders **and**
  explicitly tell the partner to replace them in the Portal before the one-click submit.
  Never invent a real-looking image or silently ship a placeholder as final. Added as a
  positive recipe plus Red Flags rows on both skills.
- **Public app vs Private app publish decision** (owned by `salla-app-builder`, Step 8): a
  type-based rule — `type: private` → direct one-shot `salla_apps action=publish_private`
  (`POST /app/{id}/private-publish`, body just `update_note` on updates; no public listing,
  no stepwise onboarding, no readiness sections; prerequisites: `type: private` +
  DEVELOPMENT, ID-verified company, not already submitted, `private_apps_limit` /
  `free_private_apps_disabled` 403 guard). Public apps → the stepwise `app_publish`
  onboarding (hand off to `salla-publication-consistency`). Scoped
  `salla-publication-consistency` to **public** apps with a one-line hand-off to
  `publish_private`. Added a publishing Red Flags table on `salla-app-builder`.

Closes the skill gaps from the ConversionKit build post-mortem (paired with partners-mcp's
required `webhook_security_strategy` + `generate_secret` rotation warning).

## [1.0.3] — 2026-06-22

### Added

- `CHANGELOG.md` — version history so installed kits can detect when their skills are stale.
- `docs/skill-anatomy.md` — contributor guide and checklist for authoring new skills
  (required sections, description-as-trigger format, red-flags tables, progressive
  disclosure, line limits).
- **Red Flags tables** on the gated skills most exposed to rationalization shortcuts —
  `salla-app-auth`, `salla-webhooks`, `salla-app-billing`, `salla-app-lifecycle` — each
  pairing a tempting "skip" thought with why it breaks in production, tied to the step it
  guards.

### Changed

- **Progressive disclosure:** moved heavy code/payloads out of the largest `SKILL.md`
  files into their `references/` sidecars, keeping steps, gates, and Red Flags inline —
  `salla-app-auth` (`token-refresh.md`, `custom-mode.md`), `salla-webhooks`
  (`server-setup.md`), `salla-app-billing` (`subscription-api.md`), `salla-app-builder`
  (`onboarding-steps.md`).

- Reworded skill `description` frontmatter that lacked an explicit trigger so each
  self-activates with a "Use when…" clause on hosts that read the description in isolation
  (Cursor, Copilot): `salla-app-billing`, `salla-app-settings`, `salla-app-ui-builder`,
  `salla-embedded-app`.
- Documented the authoring standard (description triggers, gates + red-flags, progressive
  disclosure, changelog/version discipline) in `AGENTS.md`.

## [1.0.2] — 2026-06-22

### Changed

- Stepwise publication flow and the App Store presentation **builder** flow
  (`app_page_builder`), plus build-feedback hardening across skills (#23). Added the
  `salla-embedded-ui` skill and a consolidated `salla-docs` docs map.

## [1.0.1] — 2026-06-21

### Changed

- `salla-app-auth`: default to **Easy Mode**; flag Custom Mode's review-rejection risk
  (#21).
- Grounded skills in source-of-truth docs and corrected API facts across the kit (#20).
- Replaced external blog links with captured local references plus a link finder
  (`scripts/find-blog-links.sh`) (#18).

### Added

- SessionStart hook that injects the routing rule so any Salla task starts with
  `salla-app-expert`; tighter `salla-app-expert` routing (#17).

## [1.0.0] — 2026-06

### Added

- Initial release: skills covering the full Salla Partner app lifecycle (create, hook
  events, build UI, monetize, publish), a `salla-app-expert` master agent, an `audit`
  command, and the Salla Partners MCP wiring.
- Native multi-host packaging: Claude Code + Cursor (`.claude-plugin/`), vendor-neutral
  Codex target (`.plugin/`), single canonical `.agents/skills/` tree with no symlinks
  (CI-enforced).
- App Functions skill split into a router plus step skills (design, handler, validate,
  test, release) (#12).
