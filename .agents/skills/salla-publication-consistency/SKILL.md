---
name: salla-publication-consistency
description: >
  Use before submitting a Salla app for review: guided pre-submit publication via app_publish.
  Open the draft, then loop set one section → re-check readiness until all sections complete,
  then submit (the server's readiness gate returns 422 with missing sections). Settings
  snapshot at submit — finalize them first; re-check after any config change. Listing
  content/screenshots → salla-app-ui-builder; pricing → salla-app-billing; settings →
  salla-app-settings; OAuth/secrets → salla-app-auth.
---

# Salla Publication Consistency

Publish a Salla app via `app_publish` (base `/app/{id}/publication`): a readiness-driven
loop, not one bulk call. Fill sections one at a time; the **server** decides when the draft
is ready.

**open → (set `<section>` → readiness)\* → submit**

Drive off the readiness checklist returned by `open` and every `set`: it marks each section
`complete` or, for incomplete ones, lists the exact `missing` fields. Fix the one section it
points at, re-check, repeat. The submit gate is server-side and authoritative — let it tell
you what review wants. Where `app_publish` is unavailable, the legacy bulk
`salla_apps action=publish` is the fallback.

## The loop (`app_publish`, base `/app/{id}/publication`)

| action      | verb | body                    | does                                                                                                                                |
| ----------- | ---- | ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `open`      | POST | —                       | Create the draft + return the per-section readiness checklist; opening also makes `app_page_builder` available for listing content. |
| `readiness` | GET  | —                       | Re-fetch the checklist: which sections are `complete` + the exact `missing` fields. Pure read.                                      |
| `set`       | PUT  | `{ section, ...data }`  | Write ONE section; only the fields you pass are touched; returns updated readiness.                                                 |
| `submit`    | PUT  | `{ action:"submit" }`   | Submit the draft. Server runs the readiness gate; incomplete → **422 + missing sections**.                                          |
| `withdraw`  | PUT  | `{ action:"withdraw" }` | Pull a pending submission back (e.g. to fix something after submit).                                                                |

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
