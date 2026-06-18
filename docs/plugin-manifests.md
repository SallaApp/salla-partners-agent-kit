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

## `.mcp.json` — shared MCP server

**Source:** Claude Code MCP config (`.mcp.json` in the plugin root) —
https://code.claude.com/docs/en/plugins-reference. Referenced by the Codex and Cursor
manifests via `"mcpServers": "./.mcp.json"`. One server: `salla-partners` →
`https://partners.mcp.salla.dev`.
