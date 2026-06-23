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

_(Filled in Step 1 — fields, lengths, and the update_note-iff-is_update rule.)_

## How to submit

_(Filled in Step 1 — the exact `app_publish action=set section=service_trial data={…}` call.)_
