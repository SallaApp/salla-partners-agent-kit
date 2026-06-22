# Skill Anatomy — authoring guide for this kit

How to write or update a skill in `.agents/skills/` so it routes correctly, stays on its
critical path, and reads like the rest of the kit. Read this before adding a new skill.
The routing table lives in [`AGENTS.md`](../AGENTS.md); the editing rules there are
binding — this doc expands on the _shape_ of a skill.

## The one-paragraph version

A skill is a **workflow, not a document**. It owns exactly one topic, opens with a
description written as an activation trigger, walks the agent through numbered steps with a
gate at the end of each critical one, defends those gates against rationalization with a
Red Flags table, names the exact MCP tool call in every action step, and pushes heavy
reference material into a `references/` sidecar so `SKILL.md` stays under ~200 lines.

## Required file layout

```
.agents/skills/<skill-name>/
├── SKILL.md            # entry point — ≤ ~200 lines
└── references/         # optional sidecar for heavy material
    ├── <topic-a>.md    # full code, payload shapes, error tables, scope lists
    └── <topic-b>.md
```

Real directories only — **no symlinks** (CI enforces this via
`scripts/check-no-symlinks.sh`). The skill folder name, the `name:` frontmatter, and the
routing row in `AGENTS.md` must all match.

## SKILL.md structure

1. **Frontmatter** — `name` and `description` (see below). `license`/`metadata` optional.
2. **Overview** — 1–3 sentences: what this skill owns and the Salla-specific delta that
   makes it non-obvious.
3. **When to use / hand-offs** — when this skill is the owner vs. when to route elsewhere.
4. **Numbered steps with gates** — the workflow. Each critical step ends with a gate.
5. **Red Flags** — a "tempting thought → why it's wrong" table defending the gates.
6. **Pointers into `references/`** — "Load `references/<file>.md` at Step N."

### Description = trigger (the routing interface)

The `description` is what an agent reads to decide whether to load the skill — on Cursor
and Copilot it is read **in isolation**, without `AGENTS.md`. Write it as an activation
condition, not a summary.

- **Format:** `What it covers. Use when <trigger>. Hand-offs → <skill>.`
- **Limit:** ≤ 80 words. No keyword dumps.
- Every skill must carry an explicit trigger clause — `Use when…` (or `Use for/before/
after/whenever…`). If a reader can't tell _from the description alone_ when to load it,
  it's not done.

### Steps + gates

Number every step. End each critical step with a gate — a condition that must be true
before continuing:

> **Gate:** signature verified on every handler before any business logic runs?

If a step has no gate, an agent that feels confident will skip it. Gates are mandatory on
any step whose omission causes a production bug (security, token handling, idempotency,
publication sync).

### Red Flags table (defends the gates)

After the gated steps, add a table that pairs the rationalization an agent might reach for
with the reality that refutes it. This is the highest-leverage pattern for keeping agents
on the critical path. At least 3 rows.

```markdown
## Red Flags

| Tempting thought                      | Why it's wrong                                                                                           |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| "I know OAuth, the mutex is overkill" | Single-use refresh tokens — a parallel refresh invalidates the whole chain; the merchant must reinstall. |
| "I'll skip the lock in dev"           | Dev habits ship to prod. Add the per-merchant lock once.                                                 |
```

### MCP-first action steps

Every step that maps to a Salla Partners MCP action names the tool, the action, and the
key params — not "configure the app" but **"`salla_apps action=connect`, with `app_id`,
`scopes`, `webhook_url`."** Skills are executable, not advisory.

### Progressive disclosure

Keep `SKILL.md` under ~200 lines. Move full code implementations, complete payload shapes,
error-code tables, and long scope lists into `references/*.md`, and have the skill say
_when_ to load each one. The entry point should fit in context without crowding out the
agent's actual task.

## Before you ship a new skill — checklist

- [ ] Frontmatter `name` matches folder; `description` ≤ 80 words with an explicit
      `Use when…` trigger and hand-offs.
- [ ] Owns exactly one topic — overlapping topics route to the owner, never duplicate.
- [ ] Steps numbered; every critical step ends with a `Gate:`.
- [ ] Red Flags table with ≥ 3 rationalization → rebuttal rows.
- [ ] Every action step names the MCP tool + action + key params.
- [ ] Heavy content moved to `references/`; `SKILL.md` ≤ ~200 lines.
- [ ] `AGENTS.md` routing table updated with the new skill's intent row.
- [ ] `CHANGELOG.md` entry added and the kit version bumped.
- [ ] `pnpm validate` (structural) and the symlink check pass.
- [ ] Formatted with Prettier: `pnpx prettier . --write`.
- [ ] Manually exercised in at least one host (Claude Code or Codex).
