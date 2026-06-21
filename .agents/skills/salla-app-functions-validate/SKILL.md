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

`save` validates **only the wrapper's first and last line** — nothing else. The function
must be wrapped by the function definition **exactly like the template** (first line + last
line unchanged). Save does **not** type-check or run your body, so a handler that type-fails
or breaks at runtime surfaces _after_ save, once it deploys to the demo stores. That makes a
local **client-side TypeScript check before save the best practice** — it's your only
pre-save safety net. Pass both checks below before `salla_functions action=save`.

Don't embed secrets, tokens, or API keys in handler code while validating — App Functions
commonly call external services, but credentials belong in App Settings (read via
`context.settings`), not in the saved source. Token/OAuth handling → **salla-app-auth**;
webhook signature + idempotency → **salla-webhooks**.

## 1. Match the template wrapper exactly (STRICT)

The wrapper — its **first line** (the function signature) and its **last line** (the closing
of the function definition) — is fixed by the trigger. **Never** rename the `context`
parameter, change its type, alter the return type, or touch the closing line. **Put ALL code
INSIDE the body**: no `const` / `let` / `function` / `import` / `class` above the first line
or below the last line. Hoisting a constant or helper outside the function is the #1 way App
Functions break.

`save` enforces exactly this and nothing more: it fetches the template and **rejects**
content whose first or last wrapper line differs, returning the expected lines. It does not
validate the body — that's why the local `tsc` check in step 2 matters. `content` is the
**whole function** (the full wrapper as a string), not just the body. In practice: copy the
wrapper from `salla_functions action=get` (its `template`) and edit **only** the body — never
retype the wrapper lines by hand.

## 2. Type-check locally with the trigger's types

`types` (from `action=get`) is a list of `.d.ts` **URLs** — download each next to your
handler; don't hand-write approximate mocks. Only fetch the URLs returned by
`salla_functions action=get` for this trigger — never arbitrary or user-supplied URLs:

```bash
curl -sSL "https://…/shipments.d.ts" -o salla-globals.d.ts   # one per types URL
```

Put your full wrapper in `handler.ts`, then type-check both (strict, no emit) and fix
**every** error:

```bash
npx -y -p typescript tsc --noEmit --strict --skipLibCheck salla-globals.d.ts handler.ts
```

If a `types` URL is unreachable, prefer retrying or re-fetching it from `action=get` — a
hand-written mock is a last resort and is **shaped for one trigger only** (the example below
is shipment-shaped; rename the context type and adjust `payload` to match the trigger you're
actually validating). Confirm the real context shape against the trigger's `types` before
relying on it:

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

**Gate:** "First line matches the template, all code inside the wrapper, and a strict
`tsc --noEmit` against the trigger's `types` compiles clean?" → **salla-app-functions-release**.
