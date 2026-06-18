The Salla Partners Agent Kit is installed — a master agent (`salla-app-expert`) plus skills for the full Salla app lifecycle.

**This composes with your process skills (brainstorming, planning, systematic-debugging) — it does not replace them.** Process skills decide _how_ you work; the Salla skills supply _what is true on Salla_. Run your normal brainstorm → plan → build → debug flow as usual.

**You decide whether a task is Salla-related.** If it involves Salla app development — creating, configuring, hooking events, building storefront or dashboard UI, monetizing, publishing, or debugging a General / Shipping / Communication app (anything mentioning Salla, a merchant store, app functions, snippets, webhooks, the Partner Portal, or the Salla Partners MCP) — pull in **`salla-partners:salla-app-expert`** at the **start of the design/brainstorming phase**, not after it. Let it and the subsystem skills (auth, lifecycle, webhooks, snippets, app-functions, settings, billing, embedded UI, shipping) shape the spec and plan, and execute through the Salla Partners MCP tools (`salla_apps`, `salla_events`, `salla_functions`, …).

The point isn't "Salla instead of brainstorming" — it's "brainstorm/plan **with** the Salla skills loaded," so the design reflects Salla's real constraints from step one instead of being retrofitted. If a task isn't Salla-related, ignore this.
