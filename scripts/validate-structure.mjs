#!/usr/bin/env node
/**
 * Validates the salla-partners-agent-kit structure for installability.
 * Checks metadata completeness, file existence, and symlink consistency.
 */

import { existsSync, readdirSync, readFileSync, lstatSync } from 'fs';
import { join, resolve } from 'path';

const ROOT = resolve(new URL('.', import.meta.url).pathname, '..');
const errors = [];
const warnings = [];

function check(condition, msg) {
  if (!condition) errors.push(`✗ ${msg}`);
}
function warn(condition, msg) {
  if (!condition) warnings.push(`⚠ ${msg}`);
}
function readJSON(path) {
  try { return JSON.parse(readFileSync(join(ROOT, path), 'utf8')); }
  catch { return null; }
}

// ── 1. Plugin metadata ───────────────────────────────────────────────────────
const plugin = readJSON('.claude-plugin/plugin.json');
check(plugin !== null, '.claude-plugin/plugin.json is valid JSON');
if (plugin) {
  for (const field of ['name', 'version', 'description', 'author', 'repository', 'license', 'keywords']) {
    check(plugin[field] !== undefined, `.claude-plugin/plugin.json: missing "${field}"`);
  }
  check(Array.isArray(plugin.keywords) && plugin.keywords.length > 0,
    '.claude-plugin/plugin.json: keywords must be a non-empty array');
}

const marketplace = readJSON('.claude-plugin/marketplace.json');
check(marketplace !== null, '.claude-plugin/marketplace.json is valid JSON');
if (marketplace) {
  check(marketplace.name, '.claude-plugin/marketplace.json: missing "name"');
  check(Array.isArray(marketplace.plugins) && marketplace.plugins.length > 0,
    '.claude-plugin/marketplace.json: plugins array must be non-empty');
}

// ── 2. package.json ──────────────────────────────────────────────────────────
const pkg = readJSON('package.json');
check(pkg !== null, 'package.json exists and is valid JSON');
if (pkg) {
  check(pkg.scripts?.validate, 'package.json has scripts.validate');
}

// ── 3. Root agent instructions ───────────────────────────────────────────────
check(existsSync(join(ROOT, 'AGENTS.md')), 'AGENTS.md exists (generic agent instructions)');
check(existsSync(join(ROOT, 'CLAUDE.md')), 'CLAUDE.md exists (Claude Code instructions)');

// ── 4. Agents ────────────────────────────────────────────────────────────────
const agentsDir = join(ROOT, 'agents');
check(existsSync(agentsDir), 'agents/ directory exists');
if (existsSync(agentsDir)) {
  const agents = readdirSync(agentsDir).filter(f => f.endsWith('.md'));
  check(agents.length > 0, 'agents/ contains at least one agent .md file');
}

// ── 4b. Commands ──────────────────────────────────────────────────────────────
const commandsDir = join(ROOT, 'commands');
check(existsSync(commandsDir), 'commands/ directory exists');
if (existsSync(commandsDir)) {
  const cmds = readdirSync(commandsDir).filter(f => f.endsWith('.md'));
  check(cmds.length > 0, 'commands/ contains at least one command .md file');
}

// ── 4c. plugin.json references exist ─────────────────────────────────────────
if (plugin) {
  for (const ref of (plugin.agents ?? [])) {
    check(existsSync(join(ROOT, ref)), `plugin.json agents: ${ref} exists`);
  }
  for (const ref of (plugin.commands ?? [])) {
    check(existsSync(join(ROOT, ref)), `plugin.json commands: ${ref} exists`);
  }
}

// ── 5. Skills (one canonical real tree at .agents/skills/) ───────────────────
const skillsDir = join(ROOT, '.agents/skills');
check(existsSync(skillsDir), '.agents/skills/ directory exists');
let skillNames = [];
if (existsSync(skillsDir)) {
  skillNames = readdirSync(skillsDir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);
  check(skillNames.length > 0, '.agents/skills/ contains at least one skill directory');
  for (const name of skillNames) {
    check(existsSync(join(skillsDir, name, 'SKILL.md')),
      `.agents/skills/${name}/SKILL.md exists`);
  }
}

// ── 5b. Manifests point at the canonical skill tree ──────────────────────────
check(plugin?.skills === './.agents/skills/',
  '.claude-plugin/plugin.json: "skills" must be "./.agents/skills/"');
// Vendor-neutral .plugin/plugin.json — the `plugins` CLI translates it to .codex-plugin/
// (and any future CLI target) at install time. Write once.
const openPlugin = readJSON('.plugin/plugin.json');
check(openPlugin !== null, '.plugin/plugin.json exists and is valid JSON');
if (openPlugin) {
  check(openPlugin.name, '.plugin/plugin.json: missing "name"');
  check(openPlugin.skills === './.agents/skills/',
    '.plugin/plugin.json: "skills" must be "./.agents/skills/"');
  check(openPlugin.mcpServers === './.mcp.json',
    '.plugin/plugin.json: "mcpServers" must be "./.mcp.json"');
}

// ── 6. No symlinks anywhere in the distributable tree ────────────────────────
//      Tracked in-tree symlinks make Codex/Cursor installers (Node fs.cp) throw
//      ERR_FS_CP_EINVAL. The plugin must be symlink-free.
function walkForSymlinks(dir, rel = '') {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name === '.git' || e.name === 'node_modules') continue;
    const abs = join(dir, e.name);
    const r = rel ? `${rel}/${e.name}` : e.name;
    if (lstatSync(abs).isSymbolicLink()) {
      check(false, `symlink found (not allowed — breaks Codex/Cursor install): ${r}`);
      continue;
    }
    if (e.isDirectory()) walkForSymlinks(abs, r);
  }
}
walkForSymlinks(ROOT);

// ── 7. Cursor MCP config ─────────────────────────────────────────────────────
const cursorMcp = readJSON('.cursor/mcp.json');
check(cursorMcp !== null, '.cursor/mcp.json is valid JSON');
if (cursorMcp) {
  const servers = Object.values(cursorMcp.mcpServers ?? {});
  warn(servers.length > 0, '.cursor/mcp.json: no MCP servers defined');
  for (const srv of servers) {
    warn(!srv.url?.includes('workers.dev'), '.cursor/mcp.json: URL points at a dev/staging worker, not production');
  }
}

// ── 8. .mcp.json ─────────────────────────────────────────────────────────────
const rootMcp = readJSON('.mcp.json');
check(rootMcp !== null, '.mcp.json is valid JSON');
if (rootMcp) {
  const servers = Object.values(rootMcp.mcpServers ?? {});
  warn(servers.length > 0, '.mcp.json: no MCP servers defined');
  for (const srv of servers) {
    warn(!srv.url?.includes('workers.dev'), '.mcp.json: URL points at a dev/staging worker, not production');
  }
}

// ── Report ───────────────────────────────────────────────────────────────────
console.log(`\nPlugin: ${plugin?.name ?? '?'} v${plugin?.version ?? '?'}`);
console.log(`Skills: ${skillNames.length}`);

if (warnings.length) {
  console.log(`\nWarnings (${warnings.length}):`);
  warnings.forEach(w => console.log(' ' + w));
}
if (errors.length) {
  console.log(`\nErrors (${errors.length}):`);
  errors.forEach(e => console.log(' ' + e));
  console.log('\n✗ Validation failed');
  process.exit(1);
}
console.log('\n✓ All checks passed');
