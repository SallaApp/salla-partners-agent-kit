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

Set via `app_publish action=set section=contact_information` (`PublicationSectionRequest`):

| Field                | Type / rule                                          |
| -------------------- | ---------------------------------------------------- |
| `contact_method`     | `"email"` \| `"phone"` \| `"website"` — **required** |
| `notification_email` | email — **required**                                 |
| `submission_email`   | email — **required**                                 |
| `support_email`      | email — required when `contact_method = "email"`     |
| `support_phone`      | string — required when `contact_method = "phone"`    |
| `website_url`        | URL — required when `contact_method = "website"`     |
| `policy_url`         | URL — **required**                                   |
| `faq_url`            | URL — **required**                                   |

## How to submit

```jsonc
// app_publish action=set
{
  "section": "contact_information",
  "contact_method": "email",
  "notification_email": "support@example.com",
  "submission_email": "support@example.com",
  "support_email": "support@example.com",
  "policy_url": "https://example.com/privacy",
  "faq_url": "https://example.com/faq",
}
```

Pass the `contact_method`-specific support field too, then `app_publish action=readiness`.
