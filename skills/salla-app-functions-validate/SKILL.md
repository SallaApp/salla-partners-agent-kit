---
name: salla-app-functions-validate
description: >
  REQUIRED before saving a Salla App Function: keep the template's first line exactly (all
  code inside the wrapper — no hoisted const/helper) and type-check the handler locally with
  strict `tsc` against the trigger's `types` (.d.ts URLs). `salla_functions action=save`
  rejects a changed first line. Routed from salla-app-functions; release with
  salla-app-functions-release.
---

# App Functions — Validate Before Save

A handler that breaks the wrapper or fails to compile fails at runtime in the sandbox —
_after_ you've saved it. Pass both checks below before `salla_functions action=save`.

## 1. Match the template exactly (STRICT)

The first line — the wrapper signature — is fixed by the trigger. **Never** rename the
`context` parameter, change its type, or alter the return type. **Put ALL code INSIDE the
body**: no `const` / `let` / `function` / `import` / `class` above or below the wrapper.
Hoisting a constant or helper outside the function is the #1 way App Functions break.

`save` enforces this: it fetches the template and **rejects** content whose first line
differs, returning the exact first line you must use. `content` is the **whole function**
(the full wrapper as a string), not just the body.

## 2. Type-check locally with the trigger's types

`types` (from `action=get`) is a list of `.d.ts` **URLs** — download each next to your
handler; don't hand-write approximate mocks:

```bash
curl -sSL "https://…/shipments.d.ts" -o salla-globals.d.ts   # one per types URL
```

Put your full wrapper in `handler.ts`, then type-check both (strict, no emit) and fix
**every** error:

```bash
npx -y -p typescript tsc --noEmit --strict --skipLibCheck salla-globals.d.ts handler.ts
```

If a `types` URL is unreachable, fall back to a minimal declaration:

```typescript
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
