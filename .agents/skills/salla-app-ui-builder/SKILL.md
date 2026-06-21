---
name: salla-app-ui-builder
description: >
  The Salla app's App Store presentation page — the home/landing page merchants see before
  installing. It auto-fills from your publication data (images, screenshots, description) into
  a default template; to customize beyond that, the partner edits it manually in the Partners
  Portal's App Presentation Builder, after completing the publish details. There is no MCP
  tool or public API for the block/element operations today (only salla_upload for publication
  media). Create/configure/publish → salla-app-builder; settings → salla-app-settings; schemas
  → salla-docs.
license: Copyright (c) 2026 Salla
metadata:
  authors: Abdelrahman Abdelhamid
  version: 3.0
---

# Salla App Presentation Page

The **presentation page** is the app's **home/landing page** shown to merchants when they install it and on the App Store. It is an **ordered list of blocks** (App Information, Features, Plans, Reviews, Brands, FAQ, Stats).

## How it gets built — auto-fill first, manual customization second

**The presentation page auto-renders from your publication data.** The images, screenshots, and description you provide in the **publish / publication details** automatically populate the **default template** — so a published app already has a presentation page even if the partner never opens the builder.

**To customize beyond the default template, the partner edits the page manually in the Partners Portal's App Presentation Builder, _after_ completing the publish details.** In the builder the partner can add, remove, reorder, and edit the blocks listed above, overriding the default template with their own layout and content.

> **Current state (for now).** There is **no MCP tool and no public/Partners API** for the block/element operations (listing, adding, editing, reordering, deleting, initializing blocks). These are done **by hand in the Portal builder**. The only MCP tool that applies here is **`salla_upload`**, and only for uploading **media used in the publish/publication details** (which then flows into the presentation page). This document will be revisited when a `salla_app_builder` MCP tool ships.

> **No token handling, no direct Partner API calls.** Don't hand-write Partner HTTP calls or fetch a token for presentation-page work — there is no endpoint to call. The publication flow itself is covered by a dedicated publication skill; here we treat publication data conceptually.

## What an agent can do today

- **Prepare publication media.** Upload images/screenshots used in the publish details via **`salla_upload`** (pass a `source_url`; it returns an integer image `id`). These populate the default presentation template automatically.
- **Advise on publication content.** Help the partner write the description and choose screenshots that read well in the default template.
- **Guide manual customization.** Walk the partner through the Portal builder using the block catalog and field reference below — describing _what_ each block contains and _what shape_ its fields take — so they can fill the builder by hand.

What an agent **cannot** do today: programmatically list/add/edit/reorder/delete presentation blocks. There is no tool or API for it; direct the partner to the Portal builder.

## The model (what the Portal builder exposes)

- An **app's presentation** = an ordered array of blocks the partner has arranged in the builder.
- The **catalog** is the full set of available block definitions.
- A block that has a form exposes a list of **fields** (the "element schema").
- If the partner never customizes, the publication-provided images, screenshots, and description fill the **default template** — so partial customization can mix with publication data.

See [Blocks and Fields](references/blocks-and-fields.md) for the block and field shapes the builder presents, and [Payloads](references/payloads.md) for how a populated block's values are shaped. Both are **reference shapes** describing what the manual builder offers — **not** API calls — and shapes drift over time, so treat them as illustrative.

## Things to keep in mind in the builder

> - **Default template fallback.** If the page is never customized, publication-provided images, screenshots, and description fill the default template — so partial customization can mix with publication data.
> - **App Information & App Plans are required** and always present; they can't be removed.
> - **App Information is pinned to the top** of the page.
> - **App Plans has no editable form** — it renders the app's pricing automatically.
> - **`app-contact-info` was removed** — its contact channels now live on **App Information** as flat `support_*` fields (`support_email`, `support_telegram`, `support_whatsapp`, `support_title`, `support_description`); the old `links` collection is gone.
> - **Lingual fields** carry both Arabic and English (`{ "ar": "…", "en": "…" }`).
> - **Collection** field children are keyed with the collection id as a prefix (`features.title`, `features.image`). See [payloads.md](references/payloads.md).
> - **`image` and `richtext` values render as public App-Store content** — use only trusted, sanitized assets/HTML.

## When to read the reference files

- [Blocks and Fields](references/blocks-and-fields.md) — the `BlockSchema` fields; the catalog of 7 blocks (App Information, Features, Plans, Reviews, Brands, FAQ, Stats — `app-contact-info` removed, merged into App Information); the field/element schema with every `type`/`format` combination (lingual string, color, image, richtext, email/url, dropdown-list, collection, telinput, conditions) shown as illustrative shapes the builder presents.
- [Payloads](references/payloads.md) — how a populated block's values are shaped: lingual objects, collection key-prefixing, image objects, telinput flattening, color and dropdown values, plus a worked example. These are content shapes you fill in the builder, not request bodies.

## Resources

| Topic                          | Link                          |
| ------------------------------ | ----------------------------- |
| Partners Portal                | https://portal.salla.partners |
| Developer blog                 | https://salla.dev/blog/       |
| Developer community (Telegram) | https://t.me/salladev         |
