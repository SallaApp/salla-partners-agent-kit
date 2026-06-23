# Domain consistency checklist

The app's domain appears in several independent places. A guessed or stale domain fails
**silently** — Salla accepts the string at write time, then install, webhooks, and the
embedded iframe break later with no error pointing back at the domain. Treat the deployed
domain as one fact with several copies, and keep every copy in sync.

## Verify the domain first (before writing any URL)

Read the real deployed domain — never type a plausible `*.vercel.app`:

- `vercel project ls` (or `vercel inspect <deployment>`) for the project's production domain
- the Vercel MCP, if connected
- `.vercel/project.json` in the repo (project/org ids → resolve the domain)
- any custom domain you've attached in Vercel — that, not the generated alias, is the one
  to publish

A generated preview alias changes per deployment; use the **stable production domain** (or a
custom domain) so the value you write into Salla keeps resolving.

## When the domain changes, update ALL of these together

This is a gate — missing any one leaves a stale placeholder somewhere that fails silently:

| Where                 | How to update                                                                |
| --------------------- | ---------------------------------------------------------------------------- |
| Portal `app_url`      | `salla_apps action=update` (the **source** field — easy to forget)           |
| Embedded `iframe_url` | `salla_embedded_pages action=update` (→ salla-embedded-app)                  |
| Snippet BASE          | the BASE/origin variable in the snippet body (→ salla-snippets)              |
| Every env var         | any `*_URL` / `BASE_URL` / `APP_URL` / OAuth redirect host in Vercel + local |
| OAuth redirect URL    | `salla_apps action=connect` `redirect_urls` (if it embeds the host)          |

## Read back each one

After updating, confirm with the matching `get`/`list`:

- `salla_apps action=get` → `app_url` holds the new domain
- `salla_embedded_pages action=list` → the page's `iframe_url` is updated
- re-fetch the snippet and env vars and eyeball the host

A write that returns an empty/minimal body is not proof — only the read-back is.
