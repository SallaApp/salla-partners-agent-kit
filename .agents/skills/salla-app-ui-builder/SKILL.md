---
name: salla-app-ui-builder
description: >
  The Salla app's App Store listing page — the home/landing page merchants see before
  installing. Build it via the `app_page_builder` MCP tool as an ordered list of blocks;
  editing a block's elements writes shared listing content (name, description, logo,
  screenshots, benefits) into the app's draft publication. Prerequisite: call
  `app_publish action=open` first to create the draft — the builder is disabled until then.
  Upload media with `salla_upload`. Draft/publish flow and `short_description` →
  salla-publication-consistency. Schemas → salla-docs.
license: Copyright (c) 2026 Salla
metadata:
  authors: Abdelrahman Abdelhamid
  version: 4.0
---

# Salla App Store Listing Page (`app_page_builder`)

The **listing page** is the app's **home/landing page** shown to merchants on the App Store and when they install it. It is an **ordered list of blocks** (App Information, Features, Plans, Reviews, Brands, FAQ, Stats), authored through the **`app_page_builder`** MCP tool.

Editing a block's element values **writes the shared listing content directly into the app's draft publication**. The fields this tool owns are: **`name`, `description`, `logo`, `screenshots`, `benefits`**.

> **Dependency.** `app_page_builder` ships in the Salla Partners MCP (partners-mcp #10) and must be deployed for any of this to work. This supersedes the previous "manual in the Portal, no MCP tool" guidance.

## Prerequisite: open a draft first

The builder is **disabled (returns 404) until the app is public and has a draft publication.** Before calling `app_page_builder`, call:

```
app_publish action=open
```

to create/open the draft. The publish/draft lifecycle (open, fill the publication sections, submit) is owned by **salla-publication-consistency** — read that skill for the full flow. `app_page_builder` only writes the **shared listing content** into the draft once it exists.

## No token, no direct Partner API

Everything here is **MCP-managed.** Don't hand-write Partner HTTP calls or fetch a token for listing-page work — drive it through `app_page_builder` and `salla_upload`. There is no REST endpoint to call directly.

## The 9 actions

All calls take `action=` (and the app context the MCP already holds). Discover shapes with the read actions before writing.

| Action    | What it does                                                                                         |
| --------- | ---------------------------------------------------------------------------------------------------- |
| `catalog` | List the **available block types** you can add.                                                      |
| `init`    | **Required first** after opening the draft — adds all required blocks and returns the page's blocks. |
| `list`    | List the **current blocks** (each: `id`, `slug`, `order`).                                           |
| `show`    | Show **one block + its element keys** — read this to know exactly what `set` accepts for that block. |
| `set`     | Write a block's **element-key → value** map (this is what persists listing content into the draft).  |
| `add`     | Add a block (a type from `catalog`).                                                                 |
| `remove`  | Remove a block. **Required blocks cannot be removed.**                                               |
| `sort`    | Reorder blocks — pass the **full ordered list of block ids**.                                        |
| `reset`   | Remove **all** blocks.                                                                               |

**Typical flow:** `app_publish action=open` → `app_page_builder action=init` → `action=list` → `action=show` (per block, to learn its element keys) → `action=set` (write values) → `action=add`/`remove`/`sort` as needed.

## Shared listing fields this tool owns

Writing element values on the listing blocks persists these **shared listing fields** into the draft publication:

- `name`
- `description`
- `logo`
- `screenshots`
- `benefits`

> **`short_description` is NOT set here.** It belongs to the publication's `basic_information` section and is written via `app_publish` — route it to **salla-publication-consistency**. (The `app_page_builder` tool's own description may also mention `short_description`, but the authoritative owner is `app_publish`; do not author it through this skill.)

## Media (logo, screenshots)

Image elements (`logo`, `screenshots`) reference an uploaded media id. Upload first:

1. `salla_upload` with a `source_url` → returns an integer image **`id`**.
2. Use that `id` in the block's `set` value for the image element.

Keep an existing image by leaving its stored `{ id, url }` in place when you `set`.

## Auto-fill: the default template

If the partner never customizes, the publication's **default template renders from publication data** — so a published app already has a listing page. `app_page_builder` writes into that **same draft**, so partial customization mixes with the default template.

## The model

- An **app's listing** = the ordered array of blocks returned by `action=list`.
- The **catalog** (`action=catalog`) is the full set of block types you can `add`.
- A block has `id`, `slug`, `order`, and a `required` flag; its editable inputs are **elements** (key → value), discovered via `action=show`.
- Required blocks (App Information, App Plans) are seeded by `init` and **can't be removed**.

See [Blocks and Fields](references/blocks-and-fields.md) for the block/element model and how to discover types and element keys, [API spec](references/api-spec.md) for the action contract, and [Payloads](references/payloads.md) for `set` value shapes. Example block ids and element keys are **illustrative** — confirm them with `action=catalog` / `action=show`.

## Things to keep in mind

> - **Open the draft first.** `app_page_builder` is 404 until `app_publish action=open` has created a draft on a public app.
> - **Run `init` before anything else** on a fresh draft — it seeds the required blocks and returns the current page.
> - **Discover, don't guess.** Use `action=catalog` (block types) and `action=show` (element keys) instead of hardcoding ids/keys.
> - **App Information & App Plans are required** — always present, can't be removed.
> - **App Information stays first**; **App Plans has no editable form** (pricing renders automatically).
> - **`app-contact-info` was removed.** Do not re-add it. Contact fields live in the publication's **`contact_information`** section → salla-publication-consistency. (Some support/contact channels may surface on App Information as flat `support_*` elements — confirm with `action=show`.)
> - **Lingual elements** carry both Arabic and English (`{ "ar": "…", "en": "…" }`).
> - **Collection** element children are keyed with the collection id as a prefix (`features.title`). See [payloads.md](references/payloads.md).
> - **`image` and `richtext` values render as public App-Store content** — use only trusted, sanitized assets/HTML.

## Cross-links

- **salla-publication-consistency** — the draft/publish lifecycle (`app_publish action=open`, the publication sections, `short_description`, `contact_information`).
- **salla-app-builder** — create/configure/publish an app end to end.
- **salla-app-settings** — merchant settings.
- **salla-docs** — schemas and doc lookup.

## Resources

| Topic                          | Link                          |
| ------------------------------ | ----------------------------- |
| Partners Portal                | https://portal.salla.partners |
| Developer blog                 | https://salla.dev/blog/       |
| Developer community (Telegram) | https://t.me/salladev         |
