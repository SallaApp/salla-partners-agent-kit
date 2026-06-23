# Step — Features (banner / embedded image; screenshots / benefits)

Owner: **salla-app-ui-builder** (listing images + screenshots/benefits). `banner` and
`embedded_image` are set via `app_publish action=set section=features`; `screenshots`/`benefits`
are builder-owned (authored via `app_page_builder`, which writes them into the draft and whose
images override the publication's).

## Data retrieval

Read current values from `app_publish action=get` → `publication.*`:

| Field          | Path                         | Notes                                                                                                                                                                |
| -------------- | ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Banner         | `publication.banner`         | image file id (`{id,url}` on read; keep the `id`). Set via `set`.                                                                                                    |
| Embedded image | `publication.embedded_image` | **required iff the app has an iframe page** (`has_embedded_pages`). Set via `set`.                                                                                   |
| Screenshots    | `publication.screenshots`    | array, **≥3** (server readiness); each `{image:id, caption:{ar,en}}`. **Builder-owned** → `app_page_builder`.                                                        |
| Benefits       | `publication.benefits`       | array, **≥3** (server readiness; the Portal UI may cap at exactly 3); each `{image:id, title:{ar,en}, description:{ar,en}}`. **Builder-owned** → `app_page_builder`. |

Images are numeric file ids — generate then `salla_upload` (returns the id) before setting. Full
image recipe + dimensions → **salla-app-ui-builder**; embedded-image dimensions → **salla-embedded-app**.

## Submission schema

_(Filled in Step 1 — `banner`/`embedded_image` rules; screenshots/benefits shapes route to salla-app-ui-builder.)_

## How to submit

_(Filled in Step 1 — `app_publish action=set section=features data={banner, embedded_image}`; screenshots/benefits via `app_page_builder`.)_
