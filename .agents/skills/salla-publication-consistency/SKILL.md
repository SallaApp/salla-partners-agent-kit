---
name: salla-publication-consistency
description: >
  Guided pre-submit publication for a Salla app via app_publish: open the draft, then loop
  set one section → re-check readiness until every section is complete, then submit. The
  server runs a readiness gate (422 lists still-missing sections) — drive off the returned
  checklist, never guess. Settings are snapshotted on submit, so finalize them first; config
  changes can stale the draft, so re-open/re-check before submit. Screenshots/benefits +
  listing content → salla-app-ui-builder; pricing detail → salla-app-billing; settings →
  salla-app-settings.
---

# Salla Publication Consistency

Publishing a Salla app is a **deterministic, readiness-driven loop**, not one opaque bulk
call. The `app_publish` tool (base `/app/{id}/publication`) exposes a per-section readiness
checklist; you fill sections one at a time and the **server** decides when the draft is
ready. The loop is:

**open → (set `<section>` → readiness)\* → submit**

> Requires the stepwise publication endpoints to be deployed (partners-mcp #10 +
> DevelopersPortal #2788, DPD-16781). Without them, only the legacy bulk
> `salla_apps action=publish` is available.

## The core rule: drive off readiness, fix one section at a time

Never assume what review wants. After `open` (and after every `set`), the response carries a
per-section readiness checklist: which sections are `complete` and, for incomplete ones, the
exact `missing` fields. **Read the checklist, fix the one section it points at, re-check —
repeat.** Don't batch guesses; don't trust a client-side "looks ready". The submit gate is
server-side and authoritative.

## The loop (`app_publish`, base `/app/{id}/publication`)

| action      | verb | body                    | does                                                                                            |
| ----------- | ---- | ----------------------- | ----------------------------------------------------------------------------------------------- |
| `open`      | POST | —                       | Create the draft + return the per-section readiness checklist. Also enables `app_page_builder`. |
| `readiness` | GET  | —                       | Re-fetch the checklist: which sections are `complete` + the exact `missing` fields. Pure read.  |
| `set`       | PUT  | `{ section, ...data }`  | Write ONE section; only the fields you pass are touched; returns updated readiness.             |
| `submit`    | PUT  | `{ action:"submit" }`   | Submit the completed draft. Server runs pre-checks + readiness gate (see below).                |
| `withdraw`  | PUT  | `{ action:"withdraw" }` | Pull a pending submission back (e.g. to fix something after submit).                            |

`set` is a **partial write per section** — passing one field does not clear the others.
`app_page_builder` (in salla-app-ui-builder) is unlocked by `open`.

## The 5 sections and their `data` fields

Pass `section` plus only the fields you're setting:

1. **`basic_information`** — `short_description{ar,en}` (50–200 chars), `main_category_id`,
   `categories[]` (sub-categories of the main category), `video_url`, `demo_url`,
   `search_terms[]`, `supported_countries[]`.
2. **`features`** — `banner`, `embedded_image`. **NOTE:** `screenshots` and `benefits` for
   this section are authored via `app_page_builder` (**salla-app-ui-builder**), not here —
   the `features` readiness will not complete until that builder content is set.
3. **`pricing`** — `plan_type`, `plan_trial`, `one_time_price`, `plans[]`, `plan_features[]`,
   `addons[]`, `unsubscribe_reward`, `unsubscribe_email_reward`. Plan/addon modelling detail
   → **salla-app-billing**.
4. **`contact_information`** — `notification_email`, `submission_email`, `contact_method`
   (`"email"|"phone"|"website"`), `support_email`, `support_phone`, `policy_url`, `faq_url`,
   `website_url`.
5. **`service_trial`** — `service_link`, `trial_username`, `trial_password`,
   `trial_description` (30–1000 chars), `update_note{ar,en}`.

## The server-side readiness gate

`action=submit` is the only judge. The server runs its pre-checks and a **readiness gate**;
if any section is incomplete it returns **422 with the still-missing sections**. When that
happens: re-run `readiness` (or read the 422 body), `set` the section it names, and submit
again. Do not pre-empt it with a local "ready" check — the gate is server-side for a reason.

## NOT set via `app_publish` — route elsewhere

Several things live outside the publication sections. Finalize them in their own tool, then
re-check readiness:

| What                                                                      | Where                                         |
| ------------------------------------------------------------------------- | --------------------------------------------- |
| Listing content: `name`, `description`, `logo`, `screenshots`, `benefits` | `app_page_builder` → **salla-app-ui-builder** |
| OAuth scopes                                                              | `salla_scopes`                                |
| Webhook url / secret / headers                                            | `salla_apps action=connect`                   |
| Webhook event subscriptions                                               | `salla_events action=subscribe`               |
| Merchant settings FORM                                                    | `salla_settings` → **salla-app-settings**     |

- **Settings are snapshotted into the publication automatically on submit** — so finalize the
  settings form (`salla_settings`) **before** you submit; whatever is live at submit time is
  what ships.
- **Communication apps** must declare their supported features
  (`salla_settings action=set_features`) **before submit**, or the gate will block.

## Consistency: config changes can stale the draft

The draft is a snapshot, not a live mirror. If you change anything after opening — scopes,
webhook, events, the settings form, or builder content — the draft can be stale. Before
`submit`: **re-`open` if needed and re-run `readiness`**, confirm every section reads
`complete`, then submit. Because settings snapshot on submit, do settings (and
`set_features` for communication apps) last among the external pieces.

## Pre-submit gate (do all, in order)

1. **Open** the draft (`action=open`); read the initial readiness checklist.
2. For each incomplete section, `set` that section's `data`, then re-check `readiness`. Fix
   **one section at a time** off the returned `missing` list.
3. Author builder content (screenshots, benefits, listing name/description/logo) via
   `app_page_builder` → **salla-app-ui-builder**; the `features` section won't complete
   without it.
4. Finalize the settings form (`salla_settings`) — it is snapshotted on submit. For
   communication apps, run `salla_settings action=set_features`.
5. Re-run `readiness`: every one of the 5 sections must read `complete`.
6. **Submit** (`action=submit`). If you get **422**, read the still-missing sections, `set`
   them, and submit again. Use `action=withdraw` to pull a pending submission if you need to
   change something post-submit.

The bulk `salla_apps action=publish` still exists, but `app_publish` is the preferred,
guided path. Only declare done when `submit` succeeds (no 422) — the server-side readiness
gate, not a local check, is what confirms the draft is ready.
