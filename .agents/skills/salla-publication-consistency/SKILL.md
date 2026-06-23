---
name: salla-publication-consistency
description: >
  Use when a PUBLIC Salla app is going to review (App Store listing): the master skill for
  stepwise publication via app_publish. It reads the current draft, routes each step to its
  owner, and HARD-GATES sending to admin review behind a clean validate plus the partner's
  explicit confirmation. Private apps publish from the Portal — see salla-app-builder.
  Hand-offs: listing/images → salla-app-ui-builder; pricing + billing cycle → salla-app-billing;
  scopes → salla-app-auth; webhooks → salla-webhooks; settings → salla-app-settings.
---

# Salla Publication Consistency

**Scope: PUBLIC apps (App Store listing).** Private apps don't use this stepwise flow and
have no MCP publish action — the partner sends their publish request from the app-details
page `https://portal.salla.partners/apps/{app_id}` (see **salla-app-builder**).

Prepare a Salla app for review via `app_publish` (base `/app/{id}/publication`): a
readiness-driven loop, not one bulk call. Fill sections one at a time; the **server** decides
when the draft is ready.

**open → get (read the current draft) → (set `<section>` → readiness)\* → validate → partner reviews the /publish link → send_publish_request**

`app_publish action=validate` validates every section for completeness/correctness and
**saves a DRAFT**, returning a valid publication — it does **not** submit. **Sending the app
to Salla review is HARD-GATED:** after a clean `validate`, surface the partner's real
`/publish` link (id substituted) and ask them to **REVIEW** the draft. Only then does it go to
review — either the partner **submits one-click** in the Portal, **or**, after they
**explicitly confirm**, the agent calls `app_publish action=send_publish_request` with
`confirm: true`. Never send the request before a clean validate **and** the partner reviewing
the link **and** confirming.

Drive off the readiness checklist returned by `open` and every `set`: it marks each section
`complete` or, for incomplete ones, lists the exact `missing` fields. Fix the one section it
points at, re-check, repeat. `validate` runs the same server-side gate and returns **422 +
missing sections** if anything is incomplete, and **saves the draft** when every section is
complete.

## The loop (`app_publish`, base `/app/{id}/publication`)

| action                 | verb | body                   | does                                                                                                                                                                                           |
| ---------------------- | ---- | ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `open`                 | POST | —                      | Create the draft + return the per-section readiness checklist; opening also makes `app_page_builder` available for listing content.                                                            |
| `get`                  | GET  | —                      | Read-only: the FULL current draft (`publication_last_save` — every saved value) + scopes + webhooks. RESUME/REVIEW entry — readiness shows what's MISSING, `get` shows what's THERE.           |
| `readiness`            | GET  | —                      | Re-fetch the checklist: which sections are `complete` + the exact `missing` fields. Pure read.                                                                                                 |
| `set`                  | PUT  | `{ section, ...data }` | Write ONE section; only the fields you pass are touched; returns updated readiness.                                                                                                            |
| `validate`             | PUT  | —                      | Validate all sections + **save the DRAFT**; returns a valid publication. Incomplete → **422 + missing sections**. Does **not** submit.                                                         |
| `send_publish_request` | PUT  | `confirm:true`         | Send the app to Salla review — **HARD-GATED**: only after `validate` + the partner reviewed the `/publish` link + **confirmed**. Without `confirm:true` it does NOT submit (returns the link). |

Listing content (name, description, logo, screenshots, benefits) is authored with
`app_page_builder` → **salla-app-ui-builder**.

## Read the current draft first (resume / review)

Before filling or fixing anything — **especially when resuming a draft or asked to review one** —
read it with `app_publish action=get`. It returns `publication_last_save` (every saved section
value) plus the app's `scopes` and `webhooks`. `readiness` tells you what's **missing**; `get`
tells you what's **already there** — never re-ask the partner for a value the draft already holds,
and never blind-overwrite a section you haven't read.

## Validation is step-by-step

Three layers, in order — don't defer everything to one bulk check at the end:

1. **`set` validates FORMAT per section** (server `PublicationSectionRequest`: e.g.
   `short_description` 50–200, `video_url`/URLs well-formed, plan numeric rules). A `set` that
   returns **422** is THIS section's validation error — the tool surfaces the field messages; fix
   them and `set` again before moving on.
2. **`readiness` reports COMPLETENESS** — which sections are `complete` and the exact `missing`
   (blank) fields. Completeness ≠ correctness: a field can be present-but-invalid (caught by
   `set`) or present-but-blank (caught by `readiness`).
3. **`validate` is the final CROSS-FIELD + requiredness gate** over the whole draft — it saves
   the DRAFT when clean, or returns 422 + the still-missing sections.

The loop: `set <section>` → if 422, fix this section → `readiness` → next. Catch each section's
errors as you write it, not in one end-of-flow `validate`.

## Step map — this skill is the master router

Each publication step routes to the skill that owns its modelling, and each has a **reference**
(data retrieval → submission schema → how to submit):

| Step (publication section)                               | Owner skill                     | Reference                                                         |
| -------------------------------------------------------- | ------------------------------- | ----------------------------------------------------------------- |
| Basic Information                                        | this skill                      | [step-basic-information.md](references/step-basic-information.md) |
| App Config (scopes / webhooks)                           | salla-app-auth + salla-webhooks | [step-app-config.md](references/step-app-config.md)               |
| Features (banner / embedded image; screenshots/benefits) | salla-app-ui-builder            | [step-features.md](references/step-features.md)                   |
| Pricing                                                  | salla-app-billing               | [step-pricing.md](references/step-pricing.md)                     |
| Contact Information                                      | this skill                      | [step-contact.md](references/step-contact.md)                     |
| Service Trial / Review                                   | this skill + salla-app-billing  | [step-service-trial.md](references/step-service-trial.md)         |

> **`app_page_builder` is the App Store LISTING/PROFILE page builder** — the public app profile
> (rating, plans, install button). It is publication-coupled: it pulls images/text/plans from the
> draft, can be edited against a **draft** publication, and its **images and content override the
> publication's**. It is NOT the post-install embedded dashboard UI (→ **salla-embedded-app** /
> **salla-embedded-ui**).

## The 5 sections at a glance

Pass `section` + only the fields you're writing (localized fields take `{ ar, en }`; image fields
an integer id from `salla_upload`; multi-value fields an array). Per-field **schema, server rules,
and a worked `set` example** are in each step's reference (Step map above) — read it before writing.

| Section               | Sets (summary)                                                                                                         | Reference                                                             |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `basic_information`   | short_description, main_category_id, categories, **video_url (required)**, demo_url, search_terms, supported_countries | [step-basic-information.md](references/step-basic-information.md)     |
| `features`            | banner, embedded_image (screenshots/benefits → `app_page_builder`)                                                     | [step-features.md](references/step-features.md)                       |
| `pricing`             | plan_type + that type's plan/addon/once fields                                                                         | [step-pricing.md](references/step-pricing.md) → **salla-app-billing** |
| `contact_information` | contact_method, notification/submission/support contacts, website_url, policy_url, faq_url                             | [step-contact.md](references/step-contact.md)                         |
| `service_trial`       | service_link, trial_username, trial_password, trial_description, update_note (updates only)                            | [step-service-trial.md](references/step-service-trial.md)             |

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

**Suggest the publication-window monetization features.** First publish is the moment to set
these — surface them as grounded **opt-in** options (never auto-add), each routing to
**salla-app-billing** / **salla-addon-purchase**:

- **Addons** — extra in-app purchases on top of any plan.
- **Trial** — a free `plan_trial` (days) and/or the reviewer service trial.
- **Promotions** — time-boxed plan discounts (`promotions[]`).
- **Comparison matrix** — `plan_features[]` to compare plans side by side.
- **Recommended / highlighted plan** — `recommended`, `is_compare_included`.
- **Strikethrough pricing** — `one_time_old_price` (once) or a plan's `old_price`.
- **Adjustable quantities** — `plan_additional_features` (once) / per-plan `additional_features`.
- **Churn-prevention** — `unsubscribe_reward`, `unsubscribe_email_reward`.

Note which are publication-window only; per-merchant/tailored plans come **later** via App
details → Custom Plans. Any paid choice triggers the billing-cycle gate (below).

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
   6b. **Billing-cycle gate — paid pricing only, BEFORE submit.** If the draft's pricing has a
   recurring plan or any addon, the app must handle the subscription lifecycle before it can go to
   review. **Auto-check:** `salla_events action=list` shows `app.subscription.*` (+ `app.trial.*`
   when there's a trial) subscribed, **and** `salla_apps action=get` shows a `webhook_url` set.
   **Then user-confirm:** ask the partner to confirm the handlers exist — provision on `started`,
   re-point entitlement on `renewed`, revoke on `expired`/`canceled` (verify `item_type`: plan vs
   addon), and for `external_recurring` addons the renew API is wired (→ **salla-app-billing**).
   **If not coherent, do NOT submit** — keep the saved draft, hand off to **salla-app-billing** /
   **salla-addon-purchase** to implement the billing cycle, then re-check and re-gate. Only a
   coherent billing cycle clears this gate.
7. **Ask the partner to REVIEW, then send the publish request.** Give them their real Portal
   link — substitute the app's actual id, never the placeholder:
   `https://portal.salla.partners/apps/{app_id}/publish`
   (e.g. `https://portal.salla.partners/apps/1234567/publish`). Tell them to review the draft
   there. To go to review, **either** the partner clicks submit one-click in the Portal, **or**
   — only after they **explicitly confirm** — you call
   `app_publish action=send_publish_request` with `confirm: true`. **Hard rule:** never send the
   request before a clean `validate`, the partner being shown the link, and their confirmation.

**Gate:** "All sections validated + saved as a draft; for paid pricing (recurring plan or any
addon) the billing cycle is wired + confirmed (else kept as a draft until it is); the partner was
given the real `/publish` link and asked to review — and `send_publish_request` fires ONLY after
they confirm (or they submit one-click themselves)?"

Done (for the agent) means `validate` returns a valid publication and the partner has reviewed
the real `/publish` link — the app goes to review only on their one-click submit or their
explicit confirmation (then `send_publish_request confirm=true`), never before.

## Red Flags

| Tempting thought                                                                  | Why it's wrong                                                                                                                                                                                       |
| --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "Validate succeeded, so I'll send the publish request to finish the job."         | `send_publish_request` is HARD-GATED — allowed only after the partner reviewed the draft at the `/publish` link and explicitly confirmed (Step 7). Don't send on a clean validate alone.             |
| "I'll just give them the `…/apps/{app_id}/publish` template; they'll fill it in." | Substitute the **real** app id (Step 7). A placeholder link sends the partner nowhere and they can't submit.                                                                                         |
| "No images provided — I'll skip them / drop in a placeholder and move on."        | Ask the user first; if they decline, use a clearly-marked placeholder **and** tell them to replace it in the Portal before submitting.                                                               |
| "I'll write a description / pick a category / set a price to reach readiness."    | These are the partner's business decisions. Ask them, suggest Salla-grounded options, and fill from their answers — never fabricate or blind-fill a section to pass the gate.                        |
| "Validate passed and the app sells a subscription/addon — I'll submit."           | Paid pricing requires the billing cycle wired **and** confirmed first (Step 6b). If it isn't, keep the saved draft and implement the cycle (salla-app-billing / salla-addon-purchase) before submit. |
| "I subscribed to `app.subscription.*`, that's enough to go to review."            | Subscribing ≠ handling. The app must provision on `started`, re-point on `renewed`, revoke on `expired`/`canceled` (check `item_type`), and call the renew API for `external_recurring` (Step 6b).   |
