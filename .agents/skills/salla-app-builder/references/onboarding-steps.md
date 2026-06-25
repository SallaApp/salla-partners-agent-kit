# Post-Install Onboarding Steps

Load this at **Step 5a** of `salla-app-builder` when the app needs guided setup shown to the
merchant right after install. The flow is **optional** and runs **once per merchant on their
first install**. Common uses: collecting credentials (e.g. email + password) before the app
activates, gathering store profile info, or configuring settings that can't change later.

A step is a **settings form, not an iframe** — there is **no `url`**. Every step is exactly two
parts that you create together: (1) the step with **non-empty `fields`**, and (2) an App
Function handler keyed to the step. Both are **mandatory** for each step.

### 1. Create each step — `salla_onboarding_steps action=create`, `app_id`, with:

- `icon`, `title`, `slug` — **all required**. `title` is the step label, a **single-language
  plain string** (e.g. `"Configure Your Timer"`) — **not** an `{ar,en}` object. `slug` is the
  fixed system key you reference later (lowercase letters/digits only, e.g. `configuretimer`);
  it becomes the handler trigger `app.onboarding.step.creating.{slug}`.
- `fields` — **required and non-empty**: the step's form inputs, using the **SAME field schema
  as public app settings** (see **salla-app-settings**). Each field's **id** is the key the
  merchant's saved value arrives under in the handler. A step with no fields has nothing to
  collect or validate, so it isn't valid.
- `sort`, `required` (optional) — `required: true` blocks the merchant from activating the app
  until the step is saved. `sort` + `slug` together identify the step in the handler payload.

`action=update` (`app_id`, `step_id`) is a **full revalidation** — resend `icon`, `title`, and
`slug` together; a partial payload 422s. `fields` stays required; `required` optional.
`action=sort` reorders (ordered `steps` id array); `action=list` / `action=delete` (`step_id`)
manage them.

**Gate:** "Every onboarding step has non-empty `fields` AND a saved App Function with trigger
`app.onboarding.step.creating.{slug}` (Step 2)? A step without both is incomplete."

### 2. Add the step's handler — `salla_functions` (mandatory)

Every step **must** have an App Function. Create it with `salla_functions action=save`,
`trigger: "app.onboarding.step.creating.{slug}"` (the step's own slug), `content` the full
wrapper with `Onboarding` context. The settings the merchant entered arrive on the function as
`context.payload.data.fields` (key/value); use them to **validate or run any custom logic** for
that step. The handler runs when the merchant submits the step and expects a `Resp`:

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
- **Make the handler re-entrant — it fires on EVERY submit, not once.** The merchant can save
  the same step repeatedly (and edit their data) before they activate the app, so each run must
  produce the same end state for the same `fields`: upsert (don't duplicate) any resource you
  provision, and re-validate fresh each time rather than assuming a first-run.
- **Handling credentials.** When a step collects secrets (email + password, API keys),
  validate them provider-side in the handler, then store only an encrypted/hashed form —
  never plaintext — and keep the sensitive field values out of logs and error messages.
- **Completion payload (`context: Onboarding`)** — `payload` carries `event`, `merchant`,
  `created_at`, and `data`, where `data` is
  `{ id, app_name, app_description, app_type, step: { slug, sort }, fields: { … } }`
  (`fields` = the merchant's saved settings as key/value, keyed by each field's id; identify
  the step by `step.slug` + `step.sort`). The top level also has `merchant` and an optional
  `settings` (existing app settings, or `null`). A step has **no `url`** — its inputs live
  under `data.fields`.

**Gate:** "The handler trigger is exactly `app.onboarding.step.creating.{slug}` for the step's
own `slug`, and the body reads the merchant input from `context.payload.data.fields` (not a
top-level `fields`)?"
