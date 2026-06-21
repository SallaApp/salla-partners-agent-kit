# Hooks

Cross-host hooks for the Salla Partners Agent Kit. Each is invoked through the
polyglot `run-hook.cmd` wrapper (cmd.exe on Windows → bash; bash directly on
Unix), so one extensionless script serves every host. Per-host registration
lives in `hooks.json` (Claude Code), `hooks-codex.json` (Codex), and
`hooks-cursor.json` (Cursor).

## `session-start` / `session-start-codex` — SessionStart

Inject the Salla routing rule (`session-start-context.md`) so any Salla app task
starts with `salla-app-expert` before generic brainstorming/planning. See
`AGENTS.md`.

## `track-telemetry` — PostToolUse usage telemetry (optional, off by default)

Records a minimal `skill_invocation` event so the team can see **which skills
actually fire**. It fires on every `PostToolUse` but emits only when the agent
invoked the host's `Skill`/`skill` tool with a `salla-*` skill name — every
other tool call is a silent no-op.

### Disabled by default

The hook **sends nothing** unless `SALLA_TELEMETRY_URL` is set to a collection
endpoint. Unset → silent no-op. To enable, set `SALLA_TELEMETRY_URL`; to disable
again, unset it. The kit does **not** phone home out of the box; a team must
explicitly point it at an endpoint to start collecting.

> An endpoint must exist for events to be recorded — e.g. a partners-mcp
> `/usage` route. Until one is deployed and `SALLA_TELEMETRY_URL` is set, the
> hook is dormant.

### Privacy: metadata only, NO content

The hook transmits **metadata only** — it transmits only these fields, and
never the user prompt, tool arguments, tool results, payloads, file paths,
tokens, or any PII:

```jsonc
POST $SALLA_TELEMETRY_URL
Content-Type: application/json
X-Salla-Telemetry-Surface: skills-hook
X-Salla-Telemetry-Client: claude-code | cursor | codex | copilot-cli | unknown

{
  "event": "skill_invocation",
  "skill": "salla-app-auth",            // namespace prefix stripped
  "plugin_version": "1.0.2",            // from plugin.json, or null
  "client": "claude-code",             // detected host
  "session_id": "abc-123",             // host session/conversation/turn id, or null
  "tool_use_id": "toolu_abc123",       // host tool-call id, or null
  "timestamp": "2026-06-21T19:27:14Z"  // UTC
}
```

### Never breaks the tool call

All errors are swallowed, the POST is backgrounded with a 5-second `curl`
timeout (and detached so the agent's tool loop is never delayed), and the script
**always** prints `{"continue":true}` and exits `0` — even on JSON parse
errors, missing `curl`, or an unreachable endpoint.

### Dedup

Events are deduped on `(session_id, tool_use_id)`: a per-uid stash dir under
`${TMPDIR:-/tmp}/salla-partners-telemetry-<uid>/` holds a zero-byte marker
(filename = SHA-1 of the key, so it leaks nothing), written `0600`. A repeat of
the same tool call is a no-op. Hosts that omit `tool_use_id` (Codex sends
`turn_id` only) simply skip the stash and POST once per invocation.

### Host coverage

| Host        | PostToolUse | Config key (file)                   | Notes                                                  |
| ----------- | ----------- | ----------------------------------- | ------------------------------------------------------ |
| Claude Code | yes         | `PostToolUse` (`hooks.json`)        | `matcher: "Skill"`; full `session_id` + `tool_use_id`. |
| Codex       | yes         | `PostToolUse` (`hooks-codex.json`)  | `matcher: "skill"`; uses `turn_id`, no `tool_use_id`.  |
| Cursor      | yes         | `postToolUse` (`hooks-cursor.json`) | v1 format, no matcher; reads `conversation_id` for id. |

No host was skipped — all three support a post-tool hook. Gemini and Hermes
expose no PostToolUse hook API, so they carry no telemetry hook (consistent with
how they also have no SessionStart hook — Gemini loads routing via
`contextFileName`).

> No `.ps1` mirror: this kit's hooks run exclusively through the polyglot
> `run-hook.cmd` (cmd.exe → bash) like `session-start`, so there is one bash
> script per hook and no separate PowerShell variant to keep in sync.

### Local testing

```bash
# Disabled by default (URL unset) → no-op, exit 0:
echo '{"tool_name":"Skill","tool_input":{"skill":"salla-app-auth"},"session_id":"s","tool_use_id":"t"}' \
  | bash hooks/track-telemetry

# Enabled, unreachable endpoint → tries once, still exits 0:
echo '{"tool_name":"Skill","tool_input":{"skill":"salla-webhooks"},"session_id":"s","tool_use_id":"t"}' \
  | SALLA_TELEMETRY_URL=http://127.0.0.1:1/usage bash hooks/track-telemetry
```
