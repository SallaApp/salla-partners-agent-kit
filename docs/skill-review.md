# Skill Review — the gate before a skill change is committed

Run this review on every change under `.agents/skills/` (a `SKILL.md` or its `references/`)
before committing or opening a PR, and again when reviewing someone else's PR. It turns the
authoring rules in [`AGENTS.md`](../AGENTS.md) and [`skill-anatomy.md`](skill-anatomy.md) into
checks with a PASS/FAIL answer.

**Core principle:** a skill is a binding workflow, not a document. An agent's mistake means the
skill was unclear — fix the clarity, not the symptom.

## How to review

Run every check. Report each as PASS or FAIL with the exact fix.

1. **Description = trigger.** The `description` is ≤ 80 words, third person, leads with the
   topic, has an explicit `Use when…` trigger and ends with hand-offs to other skills. It holds
   no keyword dump and no workflow summary (a summary becomes a shortcut agents take instead of
   reading the skill).
   - Gate: "Does it say when to load, in ≤ 80 words, with hand-offs?"
2. **One owner.** The skill owns exactly one topic; an overlapping topic routes to its owner.
   - Gate: "Every fact owned here, overlaps routed out?"
3. **Steps and gates.** Actionable steps are numbered; each critical step ends in a
   `Gate: "<condition>?"`.
   - Gate: "Does each critical step end in a gate?"
4. **Red Flags defend the gates.** A skill with `Gate:` steps carries a Red Flags table with
   at least 3 "tempting thought → why it's wrong (Step N)" rows. A skill with no gates has
   none.
   - Gate: "Skill has gates → Red Flags tied to its steps?"
5. **MCP-first actions.** Every step that maps to an MCP call names the tool, the action and
   the key params (`salla_apps action=connect`, `app_id`, `scopes`).
   - Gate: "MCP actions named with tool, action and params?"
6. **Progressive disclosure that keeps the substance.** Heavy material (full code, payload
   shapes, long tables) lives in `references/*.md` and is loaded on demand. Steps, gates and Red
   Flags stay inline; a line target never outranks a load-bearing step or gate.
   - Gate: "Heavy detail in `references/`, steps, gates and Red Flags still inline?"
7. **Grounded in the source of truth.** Every concrete claim (event name, field, selector,
   endpoint, exact value) is verified against its source: the frontend for a UI-first feature,
   the MCP or API schema for an MCP-first feature. Values are stated positively — the concrete
   value to use.
   - Gate: "Every identifier and value verified against its source?"
8. **Changelog and version.** A changed skill has a `CHANGELOG.md` entry and a version bump.
   - Gate: "CHANGELOG entry and version bump included?"
9. **Five manifests move together.** The version is identical in `package.json`,
   `.claude-plugin/plugin.json`, `.plugin/plugin.json`, `.hermes-plugin/plugin.yaml` and
   `gemini-extension.json`. A new skill is listed in `.hermes-plugin/plugin.yaml`
   `provides_skills`, and the skill counts in the manifest descriptions match the tree.
   - Gate: "Same version in all five files, skill lists and counts match `.agents/skills/`?"
10. **Routing surfaces in sync.** A new or renamed skill has its folder name, its `name:`
    frontmatter and its `AGENTS.md` routing row matching, and the same route in the
    `salla-app-expert` skill and the `agents/salla-app-expert.md` agent. A new MCP tool is mapped
    to its owning skill in the PreToolUse hook; tool names match exactly.
    - Gate: "Name = folder = route on all three routing surfaces, every new MCP tool mapped?"
11. **One canonical tree.** Skills live only under `.agents/skills/` as real directories, with
    no per-host mirror and no symlink.
    - Gate: "Change confined to `.agents/skills/`, no symlink or mirror added?"
12. **Validators green.** `pnpm run validate` and `sh scripts/check-no-symlinks.sh` pass.
    - Gate: "Structural validator and symlink check green?"
13. **Formatted.** Changed Markdown passes `pnpx prettier --check <files>`.
    - Gate: "Prettier clean on every changed file?"
14. **Exercised in a host.** A new skill or a changed workflow step was run once in Claude Code
    or Codex. A text-only reference fix says "not exercised — reference text only" in the PR.
    - Gate: "Host run recorded, or the reason it does not apply stated in the PR?"

## Output

For each check: PASS, or FAIL with the exact fix as a diff. End with an overall verdict and the
smallest set of edits that reaches all-PASS.

## Form of the fix

- **Missing or unclear information** → a positive recipe: state what to put.
- **Discipline skipped under pressure** → a Red Flags row and a gate.
- **A real exception** → its own conditional on an observable predicate.

## MCP tool descriptions

A change to an MCP tool's `description` in `SallaApp/partners-mcp` follows the same idea with
its own checks: the first sentence says what the tool is for, every action lists its required
params, every sentence changes a pick-or-call decision, and every call-changing gate stays
inline, written as the correct value to use.
