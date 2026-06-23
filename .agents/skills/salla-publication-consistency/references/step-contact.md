# Step — Contact Information

Owner: **salla-publication-consistency** (this skill). Set via `app_publish action=set
section=contact_information`.

## Data retrieval

Read current values from `app_publish action=get` → `publication.*`:

| Field              | Path                             | Notes                                                                    |
| ------------------ | -------------------------------- | ------------------------------------------------------------------------ |
| Contact method     | `publication.contact_method`     | `email` \| `phone` \| `website`. Drives which support field is required. |
| Notification email | `publication.notification_email` | required.                                                                |
| Submission email   | `publication.submission_email`   | required.                                                                |
| Support email      | `publication.support_email`      | required when `contact_method = email`.                                  |
| Support phone      | `publication.support_phone`      | required when `contact_method = phone`.                                  |
| Website URL        | `publication.website_url`        | required when `contact_method = website`.                                |
| Policy URL         | `publication.policy_url`         | required.                                                                |
| FAQ URL            | `publication.faq_url`            | required.                                                                |

## Submission schema

_(Filled in Step 1 — fields, types, and the conditional-required rule from `PublicationSectionRequest`.)_

## How to submit

_(Filled in Step 1 — the exact `app_publish action=set section=contact_information data={…}` call.)_
