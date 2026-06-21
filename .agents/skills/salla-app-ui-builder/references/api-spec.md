# `app_page_builder` — action contract

The App Store listing page is authored through the **`app_page_builder`** MCP tool. There is **no direct REST endpoint and no token to handle** — the MCP holds the app context and credentials. Editing a block's elements writes the **shared listing content** (`name`, `description`, `logo`, `screenshots`, `benefits`) into the app's draft publication.

> **Dependency:** `app_page_builder` ships in the Salla Partners MCP (partners-mcp #10) and must be deployed.

> **Prerequisite:** `app_page_builder` is **disabled until the app is public and has a draft** — `app_publish action=open` must have created the draft first. The draft/publish lifecycle is owned by **salla-publication-consistency**.

---

## The 9 actions

Every call takes `action=` plus the action's parameters. The MCP already knows which app you are on.

| Action    | Parameters (illustrative — confirm via the tool) | Returns                                                                                       |
| --------- | ------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| `catalog` | —                                                | Available block **types** you can `add`.                                                      |
| `init`    | —                                                | Adds all **required** blocks; returns the page's blocks. **Required first** on a fresh draft. |
| `list`    | —                                                | Current blocks — each `{ id, slug, order }`.                                                  |
| `show`    | `block_id`                                       | One block **+ its element keys** (read before `set`).                                         |
| `set`     | `block_id`, `values` (element-key → value map)   | Persists the block's element values into the draft.                                           |
| `add`     | `type`/`slug` (from `catalog`)                   | Adds a block; returns it.                                                                     |
| `remove`  | `block_id`                                       | Removes a block. **Rejects required blocks.**                                                 |
| `sort`    | `order` (the **full ordered list of block ids**) | Reordered page.                                                                               |
| `reset`   | —                                                | Removes **all** blocks.                                                                       |

> Parameter names above are illustrative; confirm exact names from the tool's own schema/description. Block ids and element keys are confirmable via `action=list` / `action=show`; block types via `action=catalog`.

---

## Standard sequence

```
1. app_publish action=open                  # create/open the draft (salla-publication-consistency)
2. app_page_builder action=init             # seed required blocks, get the page
3. app_page_builder action=list             # current blocks: id, slug, order
4. app_page_builder action=show  block_id=… # learn the block's element keys
5. app_page_builder action=set   block_id=… values={…}   # write listing content
6. app_page_builder action=add / remove / sort           # adjust the page as needed
```

---

## Media

Image elements (`logo`, `screenshots`, collection `*.image`) reference an uploaded media id:

1. `salla_upload` with a `source_url` → integer image **`id`**.
2. Put `[{ id, url }]` in the `values` map for that element in `action=set`.

Keep an existing image by leaving its stored `{ id, url }` in place.

---

## Block / element shapes

A block returned by `list`/`catalog`/`show` carries `id`, `slug`, `order`, `required` (see [blocks-and-fields.md](blocks-and-fields.md) for the full field meanings). `action=show` adds the block's **element keys** — the keys `action=set` accepts. The element schema (`type`/`format`/`lingual`/…) and the `set` value shapes per format are in [blocks-and-fields.md](blocks-and-fields.md) and [payloads.md](payloads.md).

Example ids/keys in the reference files are **illustrative** — always confirm a real block's element keys with `action=show` and the available types with `action=catalog` before calling `action=set`.

---

## Errors

- **404 / disabled** — no draft yet. Run `app_publish action=open` first (salla-publication-consistency).
- **Required-block rejection** — `action=remove` on App Information / App Plans is refused.
- **Validation** — a missing/malformed element value (e.g. a lingual field missing `en`, or a collection with the wrong item count) is flagged per element key. See [payloads.md](payloads.md#validation-feedback).
- **401 / session expired** — the partner must reconnect (re-run the MCP login).
