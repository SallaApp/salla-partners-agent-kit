# Post-Install Onboarding Steps

Load this at **Step 5a** of `salla-app-builder` when the app needs guided setup shown to the
merchant right after install. The flow is **optional** and runs **once per merchant on their
first install**. Common uses: collecting credentials (e.g. email + password) before the app
activates, gathering store profile info, or configuring settings that can't change later.

A step is a **settings form, not an iframe** — there is **no `url`**. Every step is exactly two
parts, built **in this order**: (1) the step with **non-empty `fields`** (the form), THEN (2) an
App Function handler keyed to that step. Both are **mandatory**, and the order is load-bearing —
the handler's trigger is resolved from the saved step, so it does not exist until the form does
(Step 2). Build the form first, confirm it, then write the handler.

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
`action=sort` is the **reorder** action — it changes the steps' display order; pass the full
ordered `steps` id array. `action=list` / `action=delete` (`step_id`) manage them.

**Gate:** "Every onboarding step has non-empty `fields` AND a saved App Function with trigger
`app.onboarding.step.creating.{slug}` (Step 2)? A step without both is incomplete."

### 2. Add the step's handler — `salla_functions` (mandatory, only after the form exists)

**First confirm the form exists.** Re-fetch with `salla_onboarding_steps action=list` and verify
the step with this `slug` is present and its `fields` is non-empty. The handler's trigger
`app.onboarding.step.creating.{slug}` is **resolved from the saved step**, so it only becomes
valid once that step exists — saving the handler before the step does returns
`Unknown trigger "app.onboarding.step.creating.{slug}"`. This trigger is **dynamic and per-step**,
so it correctly does **not** appear in `salla_functions action=list_triggers` (that lists only the
static catalog) — use the step's own slug directly; don't wait for it to show up in the list.

Once the form is confirmed, create the handler with `salla_functions action=save`,
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

**Gate:** "Confirmed via `salla_onboarding_steps action=list` that the step exists with non-empty
`fields` BEFORE saving the handler (the trigger resolves from the step, so saving first returns
'Unknown trigger'); the handler trigger is exactly `app.onboarding.step.creating.{slug}` for the
step's own `slug`; and the body reads merchant input from `context.payload.data.fields` (not a
top-level `fields`)?"

## Red Flags

| Tempting thought                                                                  | Why it's wrong                                                                                                                                                                        |
| --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "Write the handler first, then create the step."                                  | The trigger `app.onboarding.step.creating.{slug}` is resolved from the saved step — saving the handler before the step exists returns "Unknown trigger" (Step 2). Form first, always. |
| "The trigger isn't in `list_triggers`, so onboarding functions aren't supported." | Onboarding triggers are **dynamic and per-step** — they never appear in the static `list_triggers` catalog. Pass the step's `slug` directly (Step 2).                                 |
| "Create the step now with empty `fields`; I'll add the inputs later."             | A step with no `fields` collects nothing, and the handler's `context.payload.data.fields` is empty — the step is non-functional. `fields` is required at create (Step 1).             |
| "`title` is bilingual like names/plans, so pass `{ar,en}`."                       | `title` is a **single-language plain string**; a JSON object is stored verbatim and renders as raw `{"ar":…}` in the merchant UI. Pass one localized string (Step 1).                 |
