# Step — Basic Information

Owner: **salla-publication-consistency** (this skill). Listing copy/logo is builder-owned (→
**salla-app-ui-builder**); everything else is set via `app_publish action=set
section=basic_information`.

## Data retrieval

Read current values from `app_publish action=get` → `publication.*`:

| Field                               | Path                                          | Notes                                                                                  |
| ----------------------------------- | --------------------------------------------- | -------------------------------------------------------------------------------------- |
| Short description `{ar,en}`         | `publication.short_description`               | 50–200 chars. Set here.                                                                |
| Main category id                    | `publication.main_category_id`                | `salla_reference action=categories` for valid ids.                                     |
| Categories (sub-categories)         | `publication.categories`                      | array of sub-category ids of the main category.                                        |
| Video URL                           | `publication.video_url`                       | **REQUIRED** for completeness (readiness flags it when blank).                         |
| Demo URL                            | `publication.demo_url`                        | optional.                                                                              |
| Search terms                        | `publication.search_terms`                    | array of strings.                                                                      |
| Supported countries                 | `publication.supported_countries`             | array of country ids (`salla_reference action=countries`).                             |
| Name `{ar,en}` · Description · Logo | `publication.name` / `.description` / `.logo` | **builder-owned** — author via `app_page_builder` (→ salla-app-ui-builder), not `set`. |

**Educational/demo video:** `video_url` is required. If the partner has no video, route them to
the prep guide: **https://salla.dev/tutorial/educational-video-guidelines-apps-ar/** — ask first;
on skip, use a clearly-marked placeholder and tell them to replace it in the Portal before submit.

## Submission schema

_(Filled in Step 1 — fields, types, and server rules from `PublicationSectionRequest`.)_

## How to submit

_(Filled in Step 1 — the exact `app_publish action=set section=basic_information data={…}` call.)_
