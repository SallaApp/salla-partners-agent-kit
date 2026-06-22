---
name: salla-publication-consistency
description: >
  Use before a Salla app goes to review: guided pre-publication via app_publish. Open the
  draft, loop set one section → re-check readiness until all sections complete, then run
  app_publish action=validate — it validates every section and SAVES a DRAFT (no admin
  submission). After a clean validate, give the partner their real Portal /publish link so
  THEY submit in one click; the agent never submits to Salla review. Listing images →
  salla-app-ui-builder; pricing → salla-app-billing; settings → salla-app-settings.
---

# Salla Publication Consistency

**Scope: PUBLIC apps (App Store listing).** Private apps don't use this stepwise flow —
publish them with `salla_apps action=publish_private` (see **salla-app-builder**).

Prepare a Salla app for review via `app_publish` (base `/app/{id}/publication`): a
readiness-driven loop, not one bulk call. Fill sections one at a time; the **server** decides
when the draft is ready.

**open → (set `<section>` → readiness)\* → validate → guide the partner to the Portal /publish link**

`app_publish action=validate` is the agent's **terminal action**: it validates every section
for completeness/correctness and **saves a DRAFT**, returning a valid publication. It does
**not** submit to admin review. Submitting to Salla review is a deliberate **one-click
partner action** in the Portal — the agent **never** submits. After a clean `validate`,
surface the partner's real `/publish` link (id substituted) so they review the draft and
submit.

Drive off the readiness checklist returned by `open` and every `set`: it marks each section
`complete` or, for incomplete ones, lists the exact `missing` fields. Fix the one section it
points at, re-check, repeat. `validate` runs the same server-side gate and returns **422 +
missing sections** if anything is incomplete. Where `app_publish` is unavailable, the legacy
bulk `salla_apps action=publish` (with `publish_action: "save"`) is the fallback for saving
the draft.

## The loop (`app_publish`, base `/app/{id}/publication`)

| action      | verb | body                   | does                                                                                                                                                                 |
| ----------- | ---- | ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `open`      | POST | —                      | Create the draft + return the per-section readiness checklist; opening also makes `app_page_builder` available for listing content.                                  |
| `readiness` | GET  | —                      | Re-fetch the checklist: which sections are `complete` + the exact `missing` fields. Pure read.                                                                       |
| `set`       | PUT  | `{ section, ...data }` | Write ONE section; only the fields you pass are touched; returns updated readiness.                                                                                  |
| `validate`  | PUT  | —                      | **Terminal.** Validate all sections + **save the DRAFT**; returns a valid publication. Incomplete → **422 + missing sections**. Does **not** submit to admin review. |

Listing content (name, description, logo, screenshots, benefits) is authored with
`app_page_builder` → **salla-app-ui-builder**.

## The 5 sections and their `data` fields

Pass `section` plus only the fields you're setting:

1. **`basic_information`** — `short_description{ar,en}` (50–200 chars), `main_category_id`,
   `categories[]` (sub-categories of the main category), `video_url`, `demo_url`,
   `search_terms[]`, `supported_countries[]`.
2. **`features`** — `banner` (image id) and `embedded_image` (the Embedded App Banner,
   accepted only when the app has an iframe page → **salla-embedded-app**). Treat banner
   dimensions/size as verify-don't-guess: confirm the accepted values from the `salla_upload`
   response and the `features` readiness/`missing` list rather than hard-coding them. Author
   `screenshots` and `benefits` via `app_page_builder` (**salla-app-ui-builder**); readiness
   confirms when `features` reports `complete`. To create a missing `banner`/`embedded_image`,
   generate the image, `salla_upload` it (returns the integer id), then set the id here — full
   image-generation recipe and embedded-image dimensions → **salla-app-ui-builder** /
   **salla-embedded-app**.
3. **`pricing`** — `plan_type`, `plan_trial`, `one_time_price`, `plans[]`, `plan_features[]`,
   `addons[]`, `unsubscribe_reward`, `unsubscribe_email_reward`. Plan/addon modelling detail
   → **salla-app-billing**.
4. **`contact_information`** — `notification_email`, `submission_email`, `contact_method`
   (`"email"|"phone"|"website"`), `support_email`, `support_phone`, `policy_url`, `faq_url`,
   `website_url`.
5. **`service_trial`** — `service_link`, `trial_username`, `trial_password`,
   `trial_description` (30–1000 chars), `update_note{ar,en}`. Make `trial_password` a
   temporary, test-only credential: redact it in logs and never store it in plaintext.

## Example — one `set` call

Pass `section` + only the fields you're writing. Localized fields take `{ ar, en }`; image
fields take an integer id from `salla_upload`; multi-value fields take an array:

```jsonc
// app_publish action=set
{
  "section": "basic_information",
  "short_description": {
    "ar": "إدارة الشحنات تلقائياً",
    "en": "Automate your shipments",
  },
  "main_category_id": 12,
  "categories": [34, 35], // array field: sub-categories of the main category
}
```

```jsonc
// id = salla_upload(source_url) → integer; then set it in the features section
// app_publish action=set
{ "section": "features", "banner": 90817 }
```

## Route elsewhere — not set via `app_publish`

These live outside the publication sections. Finalize each in its own tool, then re-check
readiness:

| What                                                                      | Where                                            |
| ------------------------------------------------------------------------- | ------------------------------------------------ |
| Listing content: `name`, `description`, `logo`, `screenshots`, `benefits` | `app_page_builder` → **salla-app-ui-builder**    |
| OAuth scopes (request the minimum needed)                                 | `salla_scopes` → **salla-app-auth**              |
| Webhook url / signing secret / headers                                    | `salla_apps action=connect` → **salla-webhooks** |
| Webhook event subscriptions                                               | `salla_events action=subscribe`                  |
| Merchant settings FORM                                                    | `salla_settings` → **salla-app-settings**        |

Security review checks belong to the owning skills: minimum OAuth scopes →
**salla-app-auth**; webhook signature verification + authenticated interfaces →
**salla-webhooks**; secret handling → keep credentials test-only, redacted, never plaintext.

The draft is a snapshot taken at `validate`, not a live mirror. Settings snapshot when the
draft is saved and are matched against the live state, so finalize the external pieces
**before** you `validate` and do settings last:

- Finalize the settings form (`salla_settings`) before `validate` — whatever is live when
  the draft is saved is what the partner submits.
- **Communication apps** must declare supported features
  (`salla_settings action=set_features`) before `validate`, or the gate blocks.
- After changing any external piece (scopes, webhook, events, settings, builder content),
  re-run `readiness` (re-`open` if needed) and `validate` again before handing off.

## First-time publish — guided onboarding, not a blind fill

The publication sections carry the partner's **business decisions** — listing copy,
categories, pricing/plans/trial, contact, supported countries, screenshots/benefits. For a
**first-time publish**, walk the partner through the sections **one at a time**; fill each
from **their answers**, never invent or auto-fill. At each section:

- **Ask the right questions** for that section, e.g.:
  - `basic_information` → value prop / short description, main category + sub-categories,
    supported countries, a demo/video URL?
  - `pricing` → free or paid? one-time, subscription plans, or addons? a trial?
  - `contact_information` → support email/phone, policy + FAQ URLs?
  - App Information (`app_page_builder`) → name, description, logo, ≥3 screenshots, benefits?
- **Suggest valid options grounded in Salla** so the partner picks from real choices, not
  guesses: real categories from `salla_reference action=categories`; the pricing models
  Salla billing supports (free / one-time / subscription plans + addons + trial →
  **salla-app-billing**); supported-country options from `salla_reference action=countries`.
- **Fill from the answers**, then run `app_publish action=readiness` to see what's still
  missing, and move to the next section.

This composes with the **image-asset rule** below (ask for images; on skip → clearly-marked
placeholders + tell the partner to replace them).

**Gate:** "Each section filled from the partner's answers — listing copy, categories,
pricing, contact — not auto-invented?"

## Listing images — ask first, placeholder only with a heads-up

The listing needs **real** images: `logo` + **≥3 screenshots** (App Information),
`banner` + `embedded_image` (App Features). These are owned by
**salla-app-ui-builder** — read it for the fields, dimensions, and the generate-then-upload
recipe. The discipline here:

- **If you don't have the images, ASK the user to provide all the required ones.** Don't
  invent a real-looking image and don't silently skip them — this is verify-don't-invent.
- **If the user skips or declines, proceed with clearly-marked default placeholders** so the
  draft still validates — then **explicitly tell the partner to replace the placeholders in
  the Portal before they do the one-click submit**. Never present a placeholder as final.

**Gate:** "Every listing image is a real partner asset — or a placeholder the partner has
been explicitly told to replace before submitting?"

## Pre-publication sequence (in order)

1. **Open** the draft (`action=open`); read the initial readiness checklist.
2. `set` each incomplete section's `data`, re-checking `readiness` after each — **one section
   at a time**, driven off the returned `missing` list.
3. Author builder content (screenshots, benefits, listing name/description/logo) via
   `app_page_builder` → **salla-app-ui-builder** so `features` completes — applying the
   image-asset rule above for any missing image.
4. Finalize the settings form (`salla_settings`); for communication apps run
   `salla_settings action=set_features`.
5. Re-run `readiness` — confirm all 5 sections read `complete`.
6. **Validate + save the draft** (`action=validate`). On **422**, `set` the missing sections
   and `validate` again until it returns a valid publication.
7. **Guide the partner to submit.** Give them their real Portal link — substitute the app's
   actual id, never the placeholder:
   `https://portal.salla.partners/apps/{app_id}/publish`
   (e.g. `https://portal.salla.partners/apps/1234567/publish`). Tell them: review the draft
   there and click submit to send it to Salla review. The agent stops at the draft; the
   submit is the partner's deliberate one-click action.

**Gate:** "All sections validated + saved as a draft, and the partner has been given the real
`/publish` link to review and submit?"

The bulk `salla_apps action=publish` (`publish_action: "save"`) still exists as a fallback
for saving the draft, but `app_publish` is the preferred guided path. Done (for the agent)
means `validate` returns a valid publication and the partner has the real `/publish` link —
**not** that the app was submitted to review.

## Red Flags

| Tempting thought                                                                  | Why it's wrong                                                                                                                                                                |
| --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "Validate succeeded, so I'll submit it to Salla review to finish the job."        | `validate` only saves a draft. Submitting to review is the partner's one-click decision after they review it (Step 7) — the agent never submits.                              |
| "I'll just give them the `…/apps/{app_id}/publish` template; they'll fill it in." | Substitute the **real** app id (Step 7). A placeholder link sends the partner nowhere and they can't submit.                                                                  |
| "No images provided — I'll skip them / drop in a placeholder and move on."        | Ask the user first; if they decline, use a clearly-marked placeholder **and** tell them to replace it in the Portal before submitting.                                        |
| "I'll write a description / pick a category / set a price to reach readiness."    | These are the partner's business decisions. Ask them, suggest Salla-grounded options, and fill from their answers — never fabricate or blind-fill a section to pass the gate. |
