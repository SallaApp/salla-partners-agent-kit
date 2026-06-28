# Step — Service Trial / Review

Owner: **salla-publication-consistency** (this skill) + **salla-app-billing** (trial relationship).
Set via `app_publish action=set section=service_trial`. This is the reviewer-facing test access so
Salla can verify the app.

## Data retrieval

Read current values from `app_publish action=get` → `publication.*`:

| Field                 | Path                            | Notes                                                              |
| --------------------- | ------------------------------- | ------------------------------------------------------------------ |
| Service link          | `publication.service_link`      | URL where the reviewer tests the app.                              |
| Trial username        | `publication.trial_username`    | test-only credential.                                              |
| Trial password        | `publication.trial_password`    | test-only — redact in logs, never store plaintext.                 |
| Trial description     | `publication.trial_description` | 30–1000 chars; how the reviewer exercises the app.                 |
| Update note `{ar,en}` | `publication.update_note`       | **required only when the app is already published** (`is_update`). |

## Submission schema

Set via `app_publish action=set section=service_trial` (`PublicationSectionRequest`):

| Field               | Type / rule                                                                   |
| ------------------- | ----------------------------------------------------------------------------- |
| `service_link`      | URL — where the reviewer tests the app                                        |
| `trial_username`    | string, 3–255 — test-only credential                                          |
| `trial_password`    | string, 4–255 — test-only; redact in logs, never store plaintext              |
| `trial_description` | string, **30–1000** — how the reviewer exercises the app                      |
| `update_note`       | `{ar,en}` — **required only when the app is already published** (`is_update`) |

## How to submit

```jsonc
// app_publish action=set
{
  "section": "service_trial",
  "service_link": "https://example.com/app",
  "trial_username": "reviewer@example.com",
  "trial_password": "Demo-Review-2026",
  "trial_description": "Install via the demo link, open the dashboard, create a campaign, then view it on a product page.",
}
```

For an UPDATE to a published app, also pass `update_note: {ar,en}`. Then `app_publish action=readiness`.
