#!/usr/bin/env node
/**
 * Validates the salla-partners-ai-plugin structure for installability.
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

// ── 5. Skills ────────────────────────────────────────────────────────────────
const skillsDir = join(ROOT, 'skills');
check(existsSync(skillsDir), 'skills/ directory exists');
let skillNames = [];
if (existsSync(skillsDir)) {
  skillNames = readdirSync(skillsDir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);
  check(skillNames.length > 0, 'skills/ contains at least one skill directory');
  for (const name of skillNames) {
    check(existsSync(join(skillsDir, name, 'SKILL.md')),
      `skills/${name}/SKILL.md exists`);
  }
}

// ── 6. Symlink consistency (.cursor/skills/ and .github/skills/) ─────────────
for (const target of ['.cursor/skills', '.github/skills']) {
  const dir = join(ROOT, target);
  if (!existsSync(dir)) { warn(false, `${target}/ does not exist`); continue; }
  const links = readdirSync(dir).filter(f => !f.startsWith("."));
  for (const name of skillNames) {
    const linkPath = join(dir, name);
    const exists = existsSync(linkPath);
    check(exists, `${target}/${name} symlink exists`);
    if (exists) {
      const stat = lstatSync(linkPath);
      warn(stat.isSymbolicLink(), `${target}/${name} should be a symlink (not a copy)`);
    }
  }
  // No extra entries
  for (const name of links) {
    warn(skillNames.includes(name), `${target}/${name} has no corresponding skills/${name}`);
  }
}

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
