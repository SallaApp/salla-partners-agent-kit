---
name: salla-publication-consistency
description: >
  Final pre-submit gate for a Salla app: confirm the live app config and the saved
  publication draft are in sync before review. Re-save the publication after EVERY config
  change — review reads publication_last_save, so a stale snapshot ships old settings/
  scopes/snippets. Checks settings schema, snippets, webhooks/App Functions, embedded
  pages, scopes, pricing/trial, and listing. Build/publish flow → salla-app-builder.
---

# Salla Publication Consistency

Salla's review uses the **saved publication snapshot** (`publication_last_save`), not your
live app config. Any config change made after the last `publish action=save` is invisible
to review unless you re-save. This skill is the final readback before `submit`.

## The drift rule

After **any** of these, re-run `salla_apps action=publish` with `action: "save"`
and the full publication payload:

- changed the settings schema (`salla_settings define_form`)
- created/updated/deleted a snippet
- changed scopes, redirect, or webhook (`connect`)
- changed plans / trial / logo / categories

## Pre-submit checklist

Read back and confirm each matches intent:

1. **App config** — `salla_apps action=get`: scopes, status, redirect/webhook URLs.
2. **Publication draft** — `publication_last_save.app_settings` equals the current
   settings schema; logo, `categories`/`main_category_id`, plans, `trial_description`,
   `contact_method`/`support_email`, screenshots (min 3) all present and current.
3. **Snippets** — `salla_snippets action=list`: exactly one per purpose, no stale duplicates.
4. **Embedded pages** — `salla_embedded_pages action=list`: route + iframe URL correct and reachable.
5. **Events split** — lifecycle/auth on webhooks; store events on App Functions where a
   trigger exists (`salla-app-functions`).
6. **Pricing/trial** — `plan_type` + plans/addons + trial match the intended offer
   (`salla-app-billing`).
7. **Live-verified** — settings save, embedded auth, snippet render, and a real event were
   tested on a demo store (`salla-live-testing`).

**Gate:** "App config and `publication_last_save` are in sync (re-saved after the last
change), no duplicate snippets, events split correctly, and the build was live-verified —
ready to `submit`?"
