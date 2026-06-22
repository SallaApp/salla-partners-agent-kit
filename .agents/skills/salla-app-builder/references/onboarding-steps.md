# Post-Install Onboarding Steps

Load this at **Step 5a** of `salla-app-builder` when the app needs guided setup shown to the
merchant right after install. The flow is **optional** and runs **once per merchant on their
first install**. Common uses: collecting credentials (e.g. email + password) before the app
activates, gathering store profile info, or configuring settings that can't change later.

Use `salla_onboarding_steps` (one tool, `action`-driven):

1. **Create each step** — `action=create`, `app_id`, with:
   - `icon`, `title`, `slug` — **all required**. `title` is the step label shown to the
     merchant; `slug` is the unique system key you reference later (e.g. `api_auth_step`).
   - `fields` (optional) — the step's form inputs. Each field's **unique id** is what the
     completion payload keys the merchant's input under, so set it deliberately.
   - `sort`, `required` (optional) — `required: true` blocks the merchant from activating
     the app until the step is saved.
2. **Order them** — call `action=sort` with an ordered `steps` id array.
3. **Manage** — `action=list` reads the app's steps; `action=delete` (`step_id`) removes one.
   > `action=update` (`app_id`, `step_id`) is a **full revalidation** — resend `icon`,
   > `title`, and `slug` together; a partial payload 422s. `fields`/`required` optional.

## Step Function (validation handler)

A step backed by `fields` runs a function when the merchant submits it. On completion Salla
invokes your handler with an `Onboarding` context and expects a `Resp`:

```js
export default async (context: Onboarding): Promise<Resp> => {
  const { fields } = context.payload.data; // merchant input, keyed by field unique id
  if (!fields.email || !fields.password) {
    return Resp.error()
      .setMessage("Authentication not complete")
      .setStatus(422)
      .setFields("Email or password incorrect", {
        email: ["البريد الإلكتروني مطلوب"],
      });
  }
  return Resp.success().setMessage("Authentication complete");
};
```

- `Resp.success()` lets onboarding **continue**; `Resp.error()` **stops** progression and
  shows validation feedback. `.setFields(message, { field_id: [msg, …] })` renders the error
  directly under that field; validation runs in real time, so keep it fast.
- **Handling credentials.** When a step collects secrets (email + password, API keys),
  validate them provider-side in the handler, then store only an encrypted/hashed form —
  never plaintext — and keep the sensitive field values out of logs and error messages.
- **Completion payload (`context`)** — `payload` carries `event`, `merchant`, `created_at`,
  and `data`, where `data` is
  `{ id, app_name, app_description, app_type, step: { slug, sort }, fields: { … } }`
  (`fields` = merchant input keyed by each field's unique id). The top level also has
  `merchant` and an optional `settings` (existing app settings, or `null`). There is **no**
  `iframe_url`, and the inputs live under `data.fields` (not a top-level `fields`).
