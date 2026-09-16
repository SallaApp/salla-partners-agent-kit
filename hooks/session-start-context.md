The Salla Partners Agent Kit is installed: skills for the two separate products partners build on Salla — **Salla apps** and **Twilight themes**.

**Routing rule — read before acting.** First decide which product the task is about:

- **Salla app** — creating, configuring, hooking events, building storefront or dashboard UI, monetizing, publishing, or debugging a General / Shipping / Communication Salla app (anything mentioning a merchant store, app functions, snippets, webhooks, the Partner Portal, or the Salla Partners MCP) → invoke **`salla-partners:salla-app-expert` FIRST**, before any generic brainstorming, design, or planning.
- **Twilight theme** — finding, inspecting, or creating a partner's storefront theme (Twilight, `twilight.json`, `salla_themes`) → invoke **`salla-partners:salla-theme-builder`** directly. A theme is not an app: the app decisions (auth mode, App Settings, webhooks, `app_publish`) do not apply.

`salla-app-expert` owns routing to the Salla app subsystem skills (auth, lifecycle, webhooks, snippets, app-functions, settings, billing, embedded UI, shipping, storefront-ui, embedded-ui, live-testing, publication-consistency, docs) and executes through the Salla Partners MCP tools (`salla_apps`, `salla_events`, `salla_functions`, `salla_settings`, `salla_snippets`, …).

Shape the design and plan around Salla's actual constraints from the start — do not reason from general knowledge and retrofit afterward. If you are unsure whether a task is Salla-related, or which product it is, check `salla-app-expert` first.
