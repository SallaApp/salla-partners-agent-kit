---
name: salla-publication-consistency
description: >
  Final pre-submit gate for a Salla app: confirm the live app config and the saved
  publication draft are in sync before review. Re-save the publication after EVERY config
  change — review reads the saved snapshot, so a stale draft ships old settings/scopes/
  snippets. Checks settings schema, snippets, webhooks/App Functions, embedded pages,
  scopes, pricing/trial, and listing. Build/publish flow → salla-app-builder; OAuth/scopes
  → salla-app-auth.
---

# Salla Publication Consistency

Salla's review uses the **saved publication snapshot**, not your live app config. Any
config change made after the last `salla_apps action=publish` with `publish_action=save`
is invisible to review unless you re-save. This skill is the final readback before
`submit`.

> The returned field that holds the saved draft (e.g. `publication_last_save`) is
> illustrative — confirm the exact response shape via `salla_apps action=get` rather than
> assuming the field name.

## The drift rule

After **any** of these, re-run `salla_apps action=publish` with `publish_action=save`
and the full publication payload:

- changed the settings schema (`salla_settings define_form`)
- created/updated/deleted a snippet
- changed scopes, redirect, or webhook (`connect`)
- changed embedded pages, App Functions, or event subscriptions
- changed plans / trial / logo / categories

## Pre-submit checklist

Read back and confirm each matches intent:

1. **App config** — `salla_apps action=get`: scopes, status, redirect/webhook URLs.
   Request only the scopes the app actually uses (minimization); confirm a webhook
   security strategy is set (`signature` recommended) and no secrets/tokens are embedded
   in the publication payload. OAuth/scope mechanics → `salla-app-auth`; webhook security
   → `salla-webhooks`.
2. **Publication draft** — the saved `app_settings` equals the current settings schema;
   logo, `categories`/`main_category_id`, plans, `trial_description`,
   `contact_method`/`support_email`, screenshots (min 3 on submit, per the publish
   payload contract) all present and current. Field names above are illustrative —
   confirm the exact payload via `salla_apps action=get`.
3. **Snippets** — `salla_snippets action=list`: exactly one per purpose, no stale duplicates.
4. **Embedded pages** — `salla_embedded_pages action=list`: route + iframe URL correct and reachable.
5. **Events split** — lifecycle/auth on webhooks; store events on App Functions where a
   trigger exists (`salla-app-functions`).
6. **Pricing/trial** — `plan_type` + plans/addons + trial match the intended offer
   (`salla-app-billing`).
7. **Live-verified** — settings save, embedded auth, snippet render, and a real event were
   tested on a demo store (`salla-live-testing`).

**Gate:** every checklist item above must read back as expected. If any item fails — the
saved draft differs from live config, a duplicate snippet exists, events are mis-split, or
a surface was not live-verified — **stop, fix it, re-save (`publish_action=save`), and
re-run the checklist** before `submit`. Only when all items pass: "App config and the
saved publication are in sync (re-saved after the last change), no duplicate snippets,
events split correctly, and the build was live-verified — ready to `submit`."
