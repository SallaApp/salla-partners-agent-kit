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

The **listing page** is the app's **home/landing page** shown to merchants on the App Store and when they install it. It is an **ordered list of blocks** (App Information, Features, Plans, Reviews, Brands, FAQ, Stats), authored entirely through the **`app_page_builder`** MCP tool — there is no REST endpoint or token to handle. Drive listing-page work through `app_page_builder` and `salla_upload`.

Editing a block's element values **writes the shared listing content directly into the app's draft publication**. The fields this tool owns: **`name`, `description`, `logo`, `screenshots`, `benefits`** (value shapes in [blocks-and-fields.md](references/blocks-and-fields.md#the-shared-listing-fields)).

> **`short_description` belongs elsewhere** — it lives in the publication's `basic_information` section (50–200 chars) and is written via `app_publish` → **salla-publication-consistency**. Author it there, not here.

## Prerequisite: open a draft first

`app_page_builder` is enabled once the app is public and has a draft publication. Create the draft first:

```
app_publish action=open
```

The publish/draft lifecycle (open, fill the publication sections, submit) is owned by **salla-publication-consistency** — read that skill for the full flow. `app_page_builder` writes the shared listing content into the draft once it exists.

## The 9 actions

All calls take `action=` (and the app context the MCP already holds). Discover shapes with the read actions (`catalog`, `list`, `show`) before writing.

**Typical flow:** `app_publish action=open` → `app_page_builder action=init` (seed required blocks) → `action=list` → `action=show` (per block, to learn its element keys) → `action=set` (write values) → `action=add`/`remove`/`sort` as needed.

The full action contract (parameters, returns, errors) is in [api-spec.md](references/api-spec.md).

## Media (logo, screenshots)

Image elements (`logo`, `screenshots`) reference an uploaded media id:

1. `salla_upload` with a `source_url` → returns an integer image **`id`**.
2. Put `[{ id, url }]` in that element's `set` value.

Keep an existing image by leaving its stored `{ id, url }` in place when you `set`.

## Generating missing listing images

When the merchant has no logo, screenshots, or benefit images — or you're assembling the
**first** publication — **and an image-generation tool is available to you**, generate
images that fit the app's purpose and brand, then upload and set them:

1. **Confirm the required dimensions/aspect first** from the builder catalog/field spec
   (`action=catalog` / `action=show`, and [blocks-and-fields.md](references/blocks-and-fields.md))
   — e.g. logo **1:1, ≥ 250×250**; screenshots/banner at the listing's required size — so
   the upload isn't rejected.
2. **Generate** the image at that size to match the app.
3. **Upload** it with `salla_upload` → returns the image `id`.
4. **Set** it via `app_page_builder` (`logo`, `screenshots`, or `benefits`).

If **no image-generation tool is available**, ask the merchant to supply the assets — use
real assets, not throwaway placeholders.

## Auto-fill: the default template

A published app already has a listing page: the default template renders from publication data. `app_page_builder` writes into that **same draft**, so partial customization mixes with the default template.

## The model

- An **app's listing** = the ordered array of blocks returned by `action=list`.
- The **catalog** (`action=catalog`) is the full set of block types you can `add`.
- A block has `id`, `slug`, `order`, and a `required` flag; its editable inputs are **elements** (key → value), discovered via `action=show`.
- Required blocks (App Information, App Plans) are seeded by `init` and **can't be removed**.

See [Blocks and Fields](references/blocks-and-fields.md) for the block/element model and how to discover types and element keys, [API spec](references/api-spec.md) for the action contract, and [Payloads](references/payloads.md) for `set` value shapes. Example block ids and element keys are **illustrative** — confirm them with `action=catalog` / `action=show`.

## Things to keep in mind

> - **Run `init` first** on a fresh draft — it seeds the required blocks and returns the current page.
> - **Confirm ids and keys at call time** with `action=catalog` (block types) and `action=show` (element keys); example ids/keys in this skill are illustrative.
> - **App Information & App Plans are required** — always present, can't be removed. App Information stays first; App Plans has no editable form (pricing renders automatically).
> - **Contact details** live in the publication's **`contact_information`** section → salla-publication-consistency. Some support/contact channels may also surface on App Information as flat `support_*` elements — confirm with `action=show`.
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
