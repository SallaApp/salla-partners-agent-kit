# Plugin manifests & host configuration

Every host loads the **one** canonical skill tree at `.agents/skills/` through its own
manifest — no symlinks, no duplicated skill files. This file records the authoritative
documentation behind each config file and the exact fields used.

## `.claude-plugin/plugin.json` — Claude Code

**Source:** Claude Code _Plugins reference_ — https://code.claude.com/docs/en/plugins-reference

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

## `.codex-plugin/plugin.json` — Codex

**Source:** the **open-plugin format** installed by the `plugins` CLI
(`vercel-labs/plugins`, run as `npx plugins add …`) — https://github.com/vercel-labs/plugins
(npm: https://www.npmjs.com/package/plugins). The CLI _"translates the vendor-neutral
`.plugin/` format into target-specific formats, then installs via the target's native
plugin system,"_ and recognizes `.codex-plugin/` as the Codex vendor manifest directory.

- `"skills": "./.agents/skills/"` and `"mcpServers": "./.mcp.json"` — root-relative path
  strings the CLI's Codex installer consumes (it auto-fills `./skills/` / `./.mcp.json`
  when present; we set them explicitly to the canonical tree).
- `name`, `version`, `description`, `author` — plugin metadata.

## `.cursor-plugin/plugin.json` — Cursor

**Source:** the same open-plugin format (`vercel-labs/plugins`); `.cursor-plugin/` is the
Cursor vendor manifest directory. Cursor is a documented install target of the CLI
(detected via the `cursor` + `claude` binaries). Same `skills` / `mcpServers` root-relative
path fields as the Codex manifest.

## `.mcp.json` — shared MCP server

**Source:** Claude Code MCP config (`.mcp.json` in the plugin root) —
https://code.claude.com/docs/en/plugins-reference. Referenced by the Codex and Cursor
manifests via `"mcpServers": "./.mcp.json"`. One server: `salla-partners` →
`https://partners.mcp.salla.dev`.
