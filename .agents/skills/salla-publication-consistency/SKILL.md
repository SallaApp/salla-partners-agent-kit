---
name: salla-publication-consistency
description: >
  Guided pre-submit publication for a Salla app via app_publish: open the draft, then loop
  set one section → re-check readiness until every section is complete, then submit. The
  server runs a readiness gate (422 lists still-missing sections) — drive off the returned
  checklist. Settings are snapshotted on submit, so finalize them first; re-open/re-check
  after any config change before submit. Screenshots/benefits +
  listing content → salla-app-ui-builder; pricing detail → salla-app-billing; settings →
  salla-app-settings.
---

# Salla Publication Consistency

Publish a Salla app via `app_publish` (base `/app/{id}/publication`): a readiness-driven
loop, not one bulk call. Fill sections one at a time; the **server** decides when the draft
is ready.

**open → (set `<section>` → readiness)\* → submit**

Drive off the readiness checklist returned by `open` and every `set`: it marks each section
`complete` or, for incomplete ones, lists the exact `missing` fields. Fix the one section it
points at, re-check, repeat. The submit gate is server-side and authoritative — let it tell
you what review wants.

> Requires the stepwise publication endpoints (partners-mcp #10 + DevelopersPortal #2788,
> DPD-16781). Without them, only the legacy bulk `salla_apps action=publish` is available.

## The loop (`app_publish`, base `/app/{id}/publication`)

| action      | verb | body                    | does                                                                                            |
| ----------- | ---- | ----------------------- | ----------------------------------------------------------------------------------------------- |
| `open`      | POST | —                       | Create the draft + return the per-section readiness checklist. Also enables `app_page_builder`. |
| `readiness` | GET  | —                       | Re-fetch the checklist: which sections are `complete` + the exact `missing` fields. Pure read.  |
| `set`       | PUT  | `{ section, ...data }`  | Write ONE section; only the fields you pass are touched; returns updated readiness.             |
| `submit`    | PUT  | `{ action:"submit" }`   | Submit the draft. Server runs the readiness gate; incomplete → **422 + missing sections**.      |
| `withdraw`  | PUT  | `{ action:"withdraw" }` | Pull a pending submission back (e.g. to fix something after submit).                            |

`open` also unlocks `app_page_builder` (salla-app-ui-builder).

## The 5 sections and their `data` fields

Pass `section` plus only the fields you're setting:

1. **`basic_information`** — `short_description{ar,en}` (50–200 chars), `main_category_id`,
   `categories[]` (sub-categories of the main category), `video_url`, `demo_url`,
   `search_terms[]`, `supported_countries[]`.
2. **`features`** — `banner`, `embedded_image`. Author its `screenshots` and `benefits` via
   `app_page_builder` (**salla-app-ui-builder**); `features` readiness completes once that
   builder content is set. If the merchant lacks a `banner`/`embedded_image` (or it's the
   first publication) and an image-generation tool is available, generate them, `salla_upload`,
   and set them via this section — image-generation recipe → **salla-app-ui-builder**.
3. **`pricing`** — `plan_type`, `plan_trial`, `one_time_price`, `plans[]`, `plan_features[]`,
   `addons[]`, `unsubscribe_reward`, `unsubscribe_email_reward`. Plan/addon modelling detail
   → **salla-app-billing**.
4. **`contact_information`** — `notification_email`, `submission_email`, `contact_method`
   (`"email"|"phone"|"website"`), `support_email`, `support_phone`, `policy_url`, `faq_url`,
   `website_url`.
5. **`service_trial`** — `service_link`, `trial_username`, `trial_password`,
   `trial_description` (30–1000 chars), `update_note{ar,en}`.

## Route elsewhere — not set via `app_publish`

These live outside the publication sections. Finalize each in its own tool, then re-check
readiness:

| What                                                                      | Where                                         |
| ------------------------------------------------------------------------- | --------------------------------------------- |
| Listing content: `name`, `description`, `logo`, `screenshots`, `benefits` | `app_page_builder` → **salla-app-ui-builder** |
| OAuth scopes                                                              | `salla_scopes`                                |
| Webhook url / secret / headers                                            | `salla_apps action=connect`                   |
| Webhook event subscriptions                                               | `salla_events action=subscribe`               |
| Merchant settings FORM                                                    | `salla_settings` → **salla-app-settings**     |

The draft is a snapshot taken at submit, not a live mirror. Settings snapshot on submit and
are matched against the live state, so finalize the external pieces **before** submitting and
do settings last:

- Finalize the settings form (`salla_settings`) before submit — whatever is live at submit
  time is what ships.
- **Communication apps** must declare supported features
  (`salla_settings action=set_features`) before submit, or the gate blocks.
- After changing any external piece (scopes, webhook, events, settings, builder content),
  re-run `readiness` (re-`open` if needed) before submitting.

## Pre-submit sequence (in order)

1. **Open** the draft (`action=open`); read the initial readiness checklist.
2. `set` each incomplete section's `data`, re-checking `readiness` after each — **one section
   at a time**, driven off the returned `missing` list.
3. Author builder content (screenshots, benefits, listing name/description/logo) via
   `app_page_builder` → **salla-app-ui-builder** so `features` completes.
4. Finalize the settings form (`salla_settings`); for communication apps run
   `salla_settings action=set_features`.
5. Re-run `readiness` — confirm all 5 sections read `complete`.
6. **Submit** (`action=submit`). On **422**, `set` the missing sections and submit again.
   Use `action=withdraw` to pull a pending submission to change something post-submit.

The bulk `salla_apps action=publish` still exists, but `app_publish` is the preferred guided
path. Done means `submit` succeeds (no 422) — the server-side gate confirms readiness.
