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

Server rules (`PublicationSectionRequest`, section `basic_information`):

| Field                 | Type / rule                                                                                                                  |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `short_description`   | `{ar,en}`, string, **50–200** chars                                                                                          |
| `main_category_id`    | integer — a MAIN category id (`salla_reference action=categories`, `type:"app"`)                                             |
| `categories`          | integer[] — SUB-categories of that main category                                                                             |
| `video_url`           | URL, max 255 — **required for completeness**                                                                                 |
| `demo_url`            | URL, max 255 — optional                                                                                                      |
| `search_terms`        | string[]                                                                                                                     |
| `supported_countries` | integer[] — country ids (`salla_reference action=countries`); pass `[]` to support ALL countries (don't enumerate every one) |

Builder-owned (NOT set here): `name`, `description`, `logo` → `app_page_builder` (**salla-app-ui-builder**).

## How to submit

```jsonc
// app_publish action=set
{
  "section": "basic_information",
  "short_description": {
    "ar": "إدارة الشحنات تلقائياً",
    "en": "Automate your shipments",
  },
  "main_category_id": 1,
  "categories": [4],
  "video_url": "https://youtu.be/9bZkp7q19f0",
  "supported_countries": [1617628556],
}
```

A 422 here lists the offending field(s) — fix and `set` again. Then `app_publish action=readiness`.
