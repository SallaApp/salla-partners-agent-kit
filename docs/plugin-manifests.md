# Plugin manifests & host configuration

Every host loads the **one** canonical skill tree at `.agents/skills/` through its own
manifest — no symlinks, no duplicated skill files. This file records the authoritative
documentation behind each config file and the exact fields used.

## `.claude-plugin/plugin.json` — Claude Code (and Cursor)

**Source:** Claude Code _Plugins reference_ — https://code.claude.com/docs/en/plugins-reference

> Cursor's CLI install reuses the Claude plugin cache (`~/.claude/plugins`), so this manifest
> serves **both Claude Code and Cursor**. There is no separate `.cursor-plugin/` file.

- `name`, `version`, `description`, `author`, `homepage`, `repository`, `license`,
  `keywords` — documented top-level metadata fields.
- `"skills": "./.agents/skills/"` — the reference defines `skills` (`string | array`) as
  _"Custom skill directories containing `<name>/SKILL.md`. **Adds to the default `skills/`
  scan.**"_ Claude therefore scans `.agents/skills/` even though the default `skills/`
  directory is absent.
- `"agents"`, `"commands"` — documented component-path fields.
- `"$schema"` — `https://json.schemastore.org/claude-code-plugin-manifest.json` (listed in
  the reference; ignored at load time, used for editor validation).

## `.claude-plugin/marketplace.json` — Claude Code marketplace

**Source:** Claude Code _Create and distribute a plugin marketplace_ —
https://code.claude.com/docs/en/plugin-marketplaces

- Required: `name` (kebab-case marketplace id), `owner` (object), `plugins` (array).
- Each plugin entry: `name`, `source` (`"./"` — the repo root **is** the plugin),
  `description`, plus optional `author` / `license` / `keywords` / `repository`.

## `.plugin/plugin.json` — vendor-neutral (Codex + future CLI targets), write-once

**Source:** the **open-plugin format** installed by the `plugins` CLI
(`vercel-labs/plugins`, run as `npx plugins add …`) — https://github.com/vercel-labs/plugins
(npm: https://www.npmjs.com/package/plugins). The CLI _"translates the vendor-neutral
`.plugin/` format into target-specific formats, then installs via the target's native
plugin system."_

- **Write-once:** at install the CLI's `preparePluginDirForVendor` copies `.plugin/` →
  `.codex-plugin/` (when absent), then `enrichForCodex` adds the Codex `interface` block.
  So Codex is served from this one file — no committed `.codex-plugin/` needed.
- `"skills": "./.agents/skills/"`, `"mcpServers": "./.mcp.json"` — root-relative path
  strings the CLI consumes; `name`, `version`, `description`, `author` — plugin metadata.
- **Cursor is _not_ translated from `.plugin/`** — the CLI's `preparePluginDirForVendor`
  runs only for `.codex-plugin` and `.claude-plugin` (verified in the CLI source). Cursor's
  installer reuses the Claude plugin cache (`~/.claude/plugins`), so Cursor is served by
  `.claude-plugin/` above. That's why there is no `.cursor-plugin/` file.

## `gemini-extension.json` — Gemini CLI

**Source:** Gemini CLI _Extensions_ and _MCP servers_ docs —
https://github.com/google-gemini/gemini-cli/blob/main/docs/extensions/index.md and
https://github.com/google-gemini/gemini-cli/blob/main/docs/tools/mcp-server.md

- `name`, `version` — the two documented core fields of a Gemini extension.
  `version` matches `package.json`.
- `"contextFileName": "AGENTS.md"` — the docs define `contextFileName` as _"the name
  of the file that contains the context for the extension."_ Pointing it at the
  repo's `AGENTS.md` loads the ambient master router (the "invoke
  `salla-app-expert` first" routing) at session start, replacing the per-host
  SessionStart hook used by Claude/Codex/Cursor.
- `"mcpServers"` — the docs state _"all MCP server configuration options are
  supported except for `trust`."_ For a remote streamable-HTTP server Gemini uses
  the `httpUrl` field (`url` is reserved for SSE), so `.mcp.json`'s
  `{ "type": "http", "url": "https://partners.mcp.salla.dev" }` maps to
  `{ "httpUrl": "https://partners.mcp.salla.dev" }`. Gemini extensions inline the
  server config rather than referencing a file.
- **Skills:** Gemini auto-discovers the canonical `.agents/skills/` tree, so no
  skills field is needed in the extension.

## `.hermes-plugin/` — Hermes

**Source:** the Hermes plugin format (`plugin.yaml` + `install.sh` +
`__init__.py`).

- **`plugin.yaml`** — `name`, `version` (matches `package.json`), `description`,
  `author`, `license`, `homepage`, and `provides_skills:` listing all 25 skill
  names. Hermes loads them on demand via
  `skill_view("salla-partners:<skill-name>")`. No CLI passthrough — partners act
  through the remote Salla Partners MCP, not a local CLI. `mcp_servers:` mirrors
  `.mcp.json` (`transport: http`, `url: https://partners.mcp.salla.dev`).
- **`install.sh`** — POSIX bash installer: clones/pulls the repo into
  `~/.hermes/repos/salla-partners-agent-kit` and symlinks `.hermes-plugin/` into
  `~/.hermes/plugins/salla-partners/`, so the manifest sits next to the shared
  `.agents/skills/` tree. The symlink is created at install time **in the user's
  home**, never tracked in the repo (CI `scripts/check-no-symlinks.sh` forbids
  tracked symlinks).
- **`__init__.py`** — Hermes `register(ctx)` entry point: discovers every
  `<skill>/SKILL.md` under `../.agents/skills/` (resolves the symlink before
  walking up) and registers it. No CLI passthrough.

## `hooks/` — flow hooks (routing + skill-rules)

**Source:** Claude Code _Hooks reference_ — https://code.claude.com/docs/en/hooks;
Codex hooks — https://developers.openai.com/codex/hooks; Cursor hooks —
https://cursor.com/docs/hooks.

All three hooks run through the polyglot `run-hook.cmd` wrapper, swallow errors, always
exit 0, and emit the host's continue/no-op shape (Claude/Codex `hookSpecificOutput`
with `additionalContext`; Cursor `additional_context`).

- **SessionStart** (`session-start`, `session-start-codex`) injects the routing rule
  (`session-start-context.md`) so any Salla app task starts with `salla-app-expert`.
  Registered on Claude Code (`SessionStart`, `hooks.json`), Codex (`SessionStart`,
  `hooks-codex.json`), and Cursor (`sessionStart`, `hooks-cursor.json`).
- **UserPromptSubmit** (`prompt-router-nudge`) re-arms routing mid-session: matches the
  prompt against the Salla-intent regex (the keywords from `session-start-context.md`)
  and, on a hit, emits one line nudging the agent to invoke `salla-app-expert` first —
  countering SessionStart decay after compaction. No match → no-op. Registered as
  `UserPromptSubmit` (Claude/Codex) and `userPromptSubmit` (Cursor).
- **PreToolUse** (`pretool-skill-inject`) fires only on the Salla MCP tools (matcher
  `mcp__salla-partners__.*`) and injects ≤2 lines of that tool's hard rules + its
  owning skill, deduped once per `(session_id, tool_name)` via a 0600 marker under
  `${TMPDIR:-/tmp}`. Any non-Salla tool → no-op. Registered as `PreToolUse`
  (Claude/Codex) and `preToolUse` (Cursor). Codex's hook schema supports both
  `UserPromptSubmit` and `PreToolUse` (GA 2026-05-14) with the same
  `hookSpecificOutput.additionalContext` shape, so both are wired for Codex too.
- **Gemini / Hermes** get no command hooks — Gemini primes the router via
  `contextFileName: AGENTS.md`; Hermes carries it in each `SKILL.md`.

## `.mcp.json` — shared MCP server

**Source:** Claude Code MCP config (`.mcp.json` in the plugin root) —
https://code.claude.com/docs/en/plugins-reference. Referenced by the Codex and Cursor
manifests via `"mcpServers": "./.mcp.json"`. One server: `salla-partners` →
`https://partners.mcp.salla.dev`.
