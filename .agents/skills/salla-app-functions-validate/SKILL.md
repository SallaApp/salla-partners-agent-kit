---
name: salla-app-functions-validate
description: >
  REQUIRED before saving a Salla App Function: keep the template's wrapper exactly — its
  first AND last line — with all code inside the wrapper (no hoisted const/helper), and
  type-check the handler locally with strict `tsc` against the trigger's `types` (.d.ts
  URLs). `salla_functions action=save` validates ONLY those wrapper lines and rejects a
  mismatch. Routed from salla-app-functions; release with salla-app-functions-release.
---

# App Functions — Validate Before Save

`salla_functions action=save` validates **only the wrapper's first and last line** — it does
not type-check or run your body. A handler that type-fails or breaks at runtime surfaces
_after_ save, once it deploys to the demo stores. So run a local **client-side TypeScript
check before save** — the only pre-save safety net. Pass both checks below before saving.

Keep credentials in App Settings (read via `context.settings`), not in the saved source —
App Functions commonly call external services, but secrets, tokens, and API keys belong in
settings. Token/OAuth handling → **salla-app-auth**; webhook signature + idempotency →
**salla-webhooks**.

## 1. Match the template wrapper exactly (STRICT)

The wrapper — its **first line** (the function signature) and **last line** (the closing of
the function definition) — is fixed by the trigger. Copy the wrapper from `salla_functions
action=get` (its `template`) and edit **only** the body: keep the `context` parameter name,
its type, the return type, and the closing line exactly as given. Put ALL code INSIDE the
body — every `const` / `let` / `function` / `import` / `class` stays between the first and
last line (a hoisted constant or helper is the most common cause of breakage).

`save` fetches the template and **rejects** `content` whose first or last wrapper line
differs, returning the expected lines. `content` is the **whole function** (the full wrapper
as a string), not just the body. The body itself is unchecked at save — that's what the
local `tsc` check in step 2 covers.

## 2. Type-check locally with the trigger's types

`types` (from `action=get`) is a list of `.d.ts` **URLs**. Download each one next to your
handler — fetch only the URLs `action=get` returns for this trigger (not arbitrary or
user-supplied URLs), and use the real `.d.ts` rather than hand-written mocks:

```bash
curl -sSL "https://…/shipments.d.ts" -o salla-globals.d.ts   # one per types URL
```

Put your full wrapper in `handler.ts`, then type-check both (strict, no emit) and fix
**every** error:

```bash
npx -y -p typescript tsc --noEmit --strict --skipLibCheck salla-globals.d.ts handler.ts
```

If a `types` URL is unreachable, retry or re-fetch it from `action=get`. A hand-written mock
is a last resort, **shaped for one trigger only** — the example below is shipment-shaped, so
rename the context type and adjust `payload` to match your trigger, and confirm the real
shape against that trigger's `types` first:

```typescript
// ILLUSTRATIVE fallback — verify the exact shape from the trigger's `types` (action=get).
declare class Resp {
  static success(): Resp;
  static error(): Resp;
  setStatus(status: number): Resp;
  setMessage(message: string): Resp;
  setData(data: Record<string, unknown>): Resp;
}
declare type Shipments = {
  merchant?: { id?: string | number };
  payload?: {
    event?: string;
    created_at?: string;
    data?: Record<string, unknown>;
  };
  settings?: Record<string, unknown>;
};
```

**Gate:** "First and last wrapper lines match the template, all code inside the wrapper, and
a strict `tsc --noEmit` against the trigger's `types` compiles clean?" →
**salla-app-functions-release**.
