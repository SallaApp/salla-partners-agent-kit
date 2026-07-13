---
name: salla-shipping-app
description: >
  Build a Salla shipping app in two models — Shipping Management (one carrier: the modern
  Salla AWB model, App Functions inside Salla Partners, no backend) or Order Fulfilment
  (auto-dispatch across carriers). Create it, configure zones via salla_shipping,
  implement the sync App Functions shipment.creating (returns a Shipment with AWB + PDF
  label) and shipment.cancelling (returns Resp). Use when building for any carrier, AWB, label,
  tracking, COD, or return task. App Functions → salla-app-functions; OAuth → salla-app-auth; webhooks,
  publish → salla-webhooks, salla-app-builder.
---

# Salla Shipping App Flow

Build a shipping app by **performing the actions** with the Salla Partners MCP tools.
Follow the steps in order — complete each gate before moving on.

> **Shipping Apps must be Public** — Private apps are not supported for this category
> (https://docs.salla.dev/422995m0.md).

## Two app models — pick first

Salla has **two distinct shipping app models** (https://docs.salla.dev/422988m0.md). They
share creation and OAuth but diverge on setup, lifecycle, and testing:

| Model                                   | What it is                                                                                                                                                                                                               | Owns the lifecycle in             |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------- |
| **Shipping Management** (carrier / AWB) | Integrates **one shipping company**. The modern **Salla AWB** model — write **App Functions inside Salla Partners (no backend to build or host)** that call your carrier API to generate the AWB and return it to Salla. | `references/shipment-cycle.md`    |
| **Order Fulfilment**                    | Sits **across carriers** — receives the order, auto-assigns the best carrier/branch, then drives the assigned Shipping App.                                                                                              | `references/fulfillment-cycle.md` |

> **Salla AWB is the preferred Shipping Management model** — your shipping service appears
> natively in the merchant's **AWB creation screen** (Orders → Create shipping label) with
> no servers, deployments, or polling to maintain. Logic runs in Salla's App Function
> runtime with direct access to the Salla Shipping API
> (https://docs.salla.dev/1792089m0.md).

> **Appear in AWB couriers / Shipping Company ID:** to list a Shipping Management (AWB) app
> in the merchant's AWB courier options, email **partners@salla.sa**
> (https://docs.salla.dev/1792111m0.md). The **Shipping Company ID** is assigned by Salla
> only — you cannot set it yourself.

## Tools

| Tool              | Action                                     | What it does                                                                                                            |
| ----------------- | ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| `salla_reference` | `categories`                               | `type=shipping` → pick `sub_category_id` from `sub_categories`; `main_category_id`/`categories` for publish come from the same call's `main_categories`/`categories` (App Theme, not shipping-scoped) |
| `salla_upload`    | —                                          | Upload the logo → file `id`                                                                                             |
| `salla_apps`      | `create` / `get` / `connect` / `set_status` | Create + configure OAuth/webhooks; `get` reads app state, including current `search_options` selections; a private app is published by the partner from its app-details page, not via the MCP |
| `app_publish`     | `open` / `set` / `validate`                | Public apps: validate the publication (saves a DRAFT; partner submits in Portal)                                        |
| `salla_events`    | `list` / `subscribe`                       | Subscribe to the async shipment events                                                                                  |
| `salla_functions` | `list_triggers` / `save` / `preview`       | Implement + test the sync shipment App Functions                                                                        |
| `salla_shipping`  | `get_zones` / `set_zones` / `set_policy_options` / `list_zone_countries` / `list_zone_cities` / `list_search_options` | Configure shipping rate zones and the policy-options / shipment-features search-options — the two things the live Shipping Settings page manages today |

> **Prerequisite:** the Salla Partners MCP server must be connected. Carry the `app_id`
> through every step. If a tool returns "Salla session expired", re-run the login flow.

---

## Step 0 — Discover

Ask before starting:

1. **Which model?** (decides which reference owns the lifecycle — see the table above)
   - **Shipping Management / AWB** — integrates one carrier; you write the
     `shipment.creating` / `shipment.cancelling` App Functions that generate the AWB
   - **Order Fulfilment** — auto-assigns the best carrier/branch across multiple
     shipping apps
2. **Which carrier or provider are you integrating?**
3. **Do you support Cash on Delivery (COD)?**
4. **Which regions / shipping zones does your carrier cover?**

---

## Step 1 — Create the App

1. Resolve the category: `salla_reference action=categories type=shipping` → `sub_categories`.
   The `sub_category_id` **must be a shipping sub-category** picked from `sub_categories` — a
   non-shipping sub-category is rejected. (Currently Fulfillment / Other / Drop-shipping = ids
   `45 / 46 / 54`; these ids are illustrative — always read the live values rather than
   hard-coding them.) **Don't** reuse that same call's `main_categories`/`categories` for the
   publish-time `main_category_id`/`categories` — those are a separate, type-independent "App
   Theme"/"App Impact" list, not shipping-specific →
   [step-basic-information.md](../salla-publication-consistency/references/step-basic-information.md).
2. Upload the logo: `salla_upload` (square 1:1, ≥ 250×250 px) → file `id`.
3. Create it: `salla_apps action=create` with `type` = shipping, `sub_category_id`,
   `name`, `short_description` (50–200), `app_url`, `email`, `logo`. Set the app **public**
   (the only mode this category supports).

The result returns the `app_id`. (To appear in AWB courier options, email
**partners@salla.sa** — see the model section above.)

**Manual fallback:** Portal → **My Apps → Create App** (Public, category Shipping App).
Full walkthrough: https://docs.salla.dev/422995m0.md

**Gate:** "App created — confirm the `app_id` (`salla_apps action=get`)."

---

## Step 2 — OAuth, Scopes & Webhook Connection

Configure OAuth + webhooks in one `salla_apps action=connect` call (read the valid scope
slugs from `salla_apps action=get` — there is no scope-catalog reference endpoint):

- `scopes` — shipping + order access (`slug → "read" | "read_write"`). Request the
  **minimum** scopes the app needs; pick `read` over `read_write` unless a write is
  required, and don't request broad scopes you won't use.
- `redirect_urls`, `webhook_url`, `webhook_security_strategy: "signature"`

The webhook signing secret isn't minted by `connect` — create/rotate it in the Partner Portal
(`https://portal.salla.partners/apps/{app_id}`) and read the current value with
`salla_apps action=get` (the `webhook_secret` field) before deploy; store it for HMAC
verification.

OAuth, token storage/refresh, and the per-merchant refresh lock → **`salla-app-auth`**.
Webhook signature verification (verify `X-Salla-Signature` against the raw body, reject
invalid signatures, never log the secret) and idempotency → **`salla-webhooks`**. Route
these concerns there — don't reimplement them here.

**Gate:** "Connect applied with no `_partial`. Is your webhook URL live and returning 200?"

---

## Step 3 — Configure Shipping Zones & Settings

> **A shipping app has no merchant settings form.** Don't call `salla_settings
define_form` — that form is for public/private/communication apps, and the Portal rejects
> `POST /settings` for a shipping app. Shipping configuration is the `salla_shipping` zones
> and search-options below; carrier credentials go through the Shipping Settings URL. The
> settings-form concept itself → [salla-app-settings](../salla-app-settings/SKILL.md).

> **This step covers exactly what the live Shipping Settings page manages today — nothing
> more.** There is a newer, richer shipping-settings model (per-country company type,
> enabled service types, structured duration) sitting behind a backend feature flag that
> is **not released** and has no merchant-facing page yet — don't build against it, and
> don't be surprised `salla_shipping` has no actions for it. If the flag ever releases,
> this step gets a new sub-step; until then, zones + search-options are the whole surface.

`salla_shipping` manages **two independent things**, saved through two different calls —
zones, and a combined set of two option groups. Handle them as two separate sub-flows.

### 3a — Rate Zones (required)

A zone is a rate rule scoped to a country + set of cities. **There is no per-zone
create/update/delete endpoint** — `set_zones` always replaces the *entire* zone list in
one call. To add a zone, resend every existing zone plus the new one. To edit a zone,
resend every zone with that one changed. To delete a zone, resend every zone *except* it.

1. **Fetch current state:** `salla_shipping action=get_zones`, `app_id`. **Note:** a
   newly created shipping app already has a pre-seeded default zone (All Countries → All
   Cities, fixed fee) — a non-empty response does not mean you've already configured it.
2. **Discover real country/city ids before writing a zone.** These are **not**
   `salla_reference` ids — zones use their own id space:
   - `salla_shipping action=list_zone_countries`, `app_id` → real country ids.
   - `salla_shipping action=list_zone_cities`, `app_id`, `country_id` (optional
     `keyword` to search) → real city ids for that country.
   - **The `id: -1` "All Countries"/"All Cities" sentinel is never returned by either
     list** — confirmed live: the API only ever returns real ids. `-1` is a convention
     the live Shipping Settings page prepends client-side for display; use it directly
     in a zone's `country`/`city` when the merchant means "everywhere," don't search
     the list response for it.
   - Using a `salla_reference`/general country id here will not error — the Portal
     silently accepts the write and no-ops it, which reads exactly like a bug. Always
     source `country`/`city` from `list_zone_countries`/`list_zone_cities` (or the `-1`
     sentinel), never guess.
3. **Interview the merchant/partner for every zone field — don't invent business
   decisions.** Rates, coverage, delivery duration, and COD support are facts only they
   know; nothing here is inferable from the app or its category.
   - If `get_zones` (step 1) shows only the pre-seeded default zone, this is first-time
     setup — run the full interview below. If real zones already exist, summarize them
     and ask specifically what's changing (add a country, edit a rate, remove a zone)
     instead of re-asking everything from scratch.
   - First-time interview, **one country at a time**: ask which country/region to add
     first, resolve its id (step 2), then ask for that zone's rate type (fixed or
     variable-by-weight), the amount(s), delivery duration text, and whether COD is
     supported (and its fee if so). Confirm the zone back to them, then ask "any other
     countries?" and repeat until they say they're done — don't assume a single-country
     answer means the interview is over.
   - **After** the merchant says they're done adding countries (not after the first
     one — the decision below only makes sense once their real coverage list is
     complete), **explicitly ask whether to keep or remove the pre-seeded All
     Countries/All Cities catch-all zone** — don't silently decide either way. Keeping
     it means unlisted countries still get a (probably wrong) default rate; removing it
     means unlisted countries get none.
   - Never fill in a plausible-looking rate, duration, or COD default on the merchant's
     behalf. If they haven't told you, ask — don't submit a guess.
4. **Submit:** `salla_shipping action=set_zones`, `app_id`, `shipping` (array of zone
   objects). Per zone:

   | Field | Required? | Notes |
   |---|---|---|
   | `id` | omit/`0` for a new zone | Existing zone id to update it in place. |
   | `country` | ✅ always | From `list_zone_countries` (or `-1` for All). |
   | `city` (array) | ✅ always | From `list_zone_cities` (or `[-1]` for All). |
   | `cities_excluded` (array) | optional | Cities to exclude within an otherwise-included country/city selection. Only meaningful when country/city aren't the "All" sentinel. |
   | `fees.type` | ✅ always | `"fixed"` \| `"rate"` \| `"automatic"`. |
   | `fees.amount` | ✅ if `type: "fixed"` | The flat cost. **Must be 1–9999** — enforced by `set_zones` before it ever reaches the Portal (see below). |
   | `fees.amount_per_unit`, `fees.up_to_weight`, `fees.per_unit` | ✅ if `type: "rate"` | Variable-rate pricing: cost per unit weight past a threshold. All three required together; `amount_per_unit`/`per_unit` > 0, `up_to_weight` 1–9999, all capped at 9999. |
   | `duration` | ✅ always | Free text, e.g. `"2-3 business days"` — not a structured value. |
   | `cash_on_delivery.status` | ✅ always (boolean) | — |
   | `cash_on_delivery.fees` | ✅ if `cash_on_delivery.status: true` | Must be > 0, capped at 9999. |

   This call **replaces the full zone list** — include every zone you want to keep.

> **Business rule, strictly enforced — a zone's `country`/`city` are locked once it
> exists.** You cannot change an existing zone's country or city, only its rates/duration/
> COD. `set_zones` rejects any submitted zone whose `id` matches an existing zone but
> whose `country`/`city` differ — create a new zone instead of trying to "move" one.

> **The Portal does not reject bad fee data — it silently corrupts it.** Live testing
> confirmed: a `"rate"`-type zone missing `amount_per_unit`/`up_to_weight`/`per_unit`
> gets created anyway with all three defaulted to `0` (a permanently-free-shipping zone,
> not an error); a negative `fees.amount` gets silently clamped to `0`; and an
> out-of-range fee (e.g. `999999`) causes the Portal to silently drop the **entire**
> submitted batch — not just the bad zone — while still reporting success. `set_zones`
> now validates every fee field against the bounds in the table above before making any
> network call, **and** re-reads the zone list after every write to confirm it actually
> reflects the submission — if a "successful" write didn't fully persist, the call fails
> with a clear message instead of silently lying. If you ever see `set_zones` fail with
> a "post-write zone count doesn't match" message, do not resubmit the same batch blindly
> — inspect each zone in it individually.

**Gate:** "`salla_shipping action=get_zones` reflects your zones (right countries/cities/
rates/COD), no zone's `country`/`city` was changed on an existing `id`, and `set_zones`
returned success — not a post-write mismatch error."

### 3b — Policy Options & Shipment Features (required)

These are **two semantically different option groups that share one catalog and one save
call** — don't build separate flows for them:

- **Policy Options** — waybill/shipment detail fields (packaging type, product type,
  dimensions, and similar) that "help identify the shipment details for an easy shipping
  experience." These describe the *shipment itself*.
- **Shipment Features** — App-Store discovery/filter metadata ("aid in the process of
  searching for the shipping App by type and coverage"). These help a merchant *find*
  your app in the marketplace — they are not shipment data.

1. **Fetch the catalog:** `salla_shipping action=list_search_options`, `app_id` → every
   available option, each `{id, slug, type, is_filter, is_shipping_policy, categories,
   name: {ar, en}, values: [{id, slug, name: {ar, en}}]}`, plus a `shipping_category` id
   in the response meta. Split it yourself:
   - **Policy Options** = options where `is_shipping_policy === true`.
   - **Shipment Features** = options where `is_filter === true` AND
     `is_shipping_policy === false` AND `categories` includes the response's
     `shipping_category` id.
   (This mirrors exactly how the live Shipping Settings page filters the same catalog —
   don't re-derive different criteria.) **Known gap:** live testing found `meta` can come
   back empty (no `shipping_category` id) in some environments. If that happens, don't
   guess a category id — check whether every option's `categories` array shares a single
   common id (in practice they have; that shared id is the shipping category), and treat
   an ambiguous result as a blocker to raise, not something to silently work around.
   **You will see catalog entries that satisfy neither rule** (confirmed live: geographic-
   coverage-shaped slugs like `included_destination_cities`, `destination_countries`, and
   similar — `is_filter: false` AND `is_shipping_policy: false`). These belong to the
   newer, unreleased shipping-settings flow (gated behind the `shipping_settings_page`
   backend feature flag, out of scope for this skill — see the note at the top of this
   step). The live Shipping Settings page ignores them too, by the same split rule —
   don't ask the merchant about them; this is by design, not a bug in the split logic.

   Confirmed live catalog (illustrative — always read the actual response, Salla can add/
   remove options; don't hard-code these slugs as an exhaustive list):

   | Group | `slug` | Arabic label | What it means |
   |---|---|---|---|
   | Policy Option | `shipment_content_type` | أنواع الشحن | Product/content type inside the shipment (e.g. Electronics). |
   | Policy Option | `packaging_type` | أنواع التغليف | How the shipment is packaged. |
   | Policy Option | `support_dimensions` | أبعاد الشحنة | Whether the merchant must provide package dimensions. |
   | Policy Option | `support_number_of_box` | عدد الصناديق | Whether the merchant must provide a box count. |
   | Shipment Feature | `delivery_service_type` | طرق الاستلام والتسليم | Pickup/delivery method(s) the carrier offers. |
   | Shipment Feature | `shipping_cover_type` | نطاق تغطية الشحن | Geographic coverage range (e.g. domestic/international). |
   | Shipment Feature | `company_type` | نوع الشركة | Carrier company type/classification. |
   | Shipment Feature | `services` | الخدمات | Carrier service offerings. |
   | Shipment Feature | `support_change_name` | الإسم المعروض للشركة | **Not discovery metadata** — a real merchant-facing toggle: whether the merchant can override your carrier's displayed name at the storefront checkout. Treat it with the same care as any other operational setting, even though it lives in the Shipment Features group. |
2. **Understand each option's `type` before building a selection:**
   - `"multi_select"` / `"select"` — choose one or more entries from that option's
     `values[]` by `id`.
   - `"boolean"` — not a raw true/false: select the **single value object** whose `slug`
     is `"true"` or `"false"` (each boolean option has both as real `values[]` entries).
     Selecting neither means "not answered."
   - `is_required` is only meaningful on **Policy Options** — the live Shipping Settings
     page renders a per-option "Required" checkbox for Policy Options only; Shipment
     Features have no such control in the UI. The API technically accepts `is_required`
     on any option, but setting it on a Shipment Feature has no equivalent in the live
     merchant experience — leave it unset there unless you have a specific reason not to.
3. **Interview the merchant/partner using the real catalog — don't guess which values
   apply to their carrier.** Every option's correct value is a business fact only they
   know (their packaging, their coverage, their company type); the catalog only tells
   you what's *possible* to answer, not the answer itself.
   - Check `salla_apps action=get`'s `search_options` field first. Empty or absent means
     first-time setup — run the full interview below. If selections already exist,
     summarize them and ask specifically what's changing, rather than re-asking
     everything.
   - First-time interview, **batched by group**: present all 4 Policy Options together
     in one message, using each option's real `name.ar`/`name.en` label and its real
     `values[]` choices from step 1 (never invented options) — ask for a value on each,
     **and explicitly ask whether it should be Required**. Then present all 5 Shipment
     Features together in a second message, same real-label/real-value treatment, with
     no Required question (per the asymmetry above). Skip a message entirely for
     whichever group is empty if the live catalog ever has zero options in it.
   - `support_change_name` (Shipment Feature) needs a plain-language ask, not a jargon
     one — its real meaning is "can the merchant rename how your carrier appears at their
     store's checkout?"; ask it that way, not by reading the slug aloud.
4. **Submit both groups together, in one call:** `salla_shipping action=set_policy_options`,
   `app_id`, `search_options` (array of `{id, is_required?, values}` — `id` is the
   search-option id, `values` the selected `values[].id`s gathered in step 3, `is_required`
   an optional per-option toggle). Mix Policy Options and Shipment Features entries in the
   same array — the split is informational, not structural. This call **replaces the
   current selection** — include every option (from both groups) you want to keep.
5. **Verify what actually saved.** `salla_shipping` has no read-back action for the
   app's *current* selections — `action=list_search_options` only ever returns the
   static catalog (every possible option/value), unaffected by what you've saved.
   To confirm what's actually selected, call `salla_apps action=get` and read its
   `search_options` field (array of `{id, values}` for the current app) — that's the
   only source of truth for current selections. Don't try to track it yourself across
   turns; re-read it.

**Gate:** "`salla_shipping action=set_policy_options` succeeded, and `salla_apps
action=get`'s `search_options` field shows every option you intended to keep — nothing
dropped by omission."

### Red Flags — zones & policy options

| Tempting thought | Why it's wrong |
| --- | --- |
| "I'll use a reasonable-looking rate/duration so I don't have to ask." | The merchant's rate is their business decision, not something inferable — a plausible-looking number that's wrong ships real pricing errors to real customers (3a). |
| "They named one country — that's probably their full coverage." | Merchants often don't volunteer their whole list unprompted — always ask explicitly whether there are more before ending the zones interview (3a). |
| "I'll skip the Required question and leave it optional." | Required vs. optional is real checkout-blocking behavior for the merchant, not a formality — ask it explicitly for every Policy Option (3b). |
| "The slug name explains itself — no need to translate it for the merchant." | `support_change_name` and similar don't read as their real meaning from the slug alone (e.g. it's about overriding a displayed name at checkout) — ask in plain language, not jargon (3b). |

---

You still set a **Shipping Settings URL** in the Portal — the page Salla loads in the
merchant dashboard to collect carrier credentials (API key, account number). This is a
separate concept from zones/search-options above — the URL page collects the merchant's
per-store carrier credentials, not your app's own configuration. Authenticate the
merchant/session before showing or saving any credentials, store them encrypted, and
never log them. (Embedded-page session auth → **`salla-embedded-app`**.)

Setup guide: https://docs.salla.dev/422996m0.md

---

## Step 4 — Core App Functions (Shipping Management / AWB)

A Shipping Management (AWB) app implements **two sync App Functions**
(`salla_functions action=list_triggers` category `merchant_actions`) and may subscribe
**three async events** (`merchant_events`). The App Functions run inside Salla's runtime,
shape the operation by their **return value**, and are tested via the App Function MCP
preview — **not** a webhook endpoint.

| Trigger               | Category (MCP-confirmed)      | Return type         | When it fires                                                                                                     | What your handler does                                                                          |
| --------------------- | ----------------------------- | ------------------- | ----------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `shipment.creating`   | **`merchant_actions`** (sync) | `Promise<Shipment>` | A shipment **or return** is created (order → `completed`, or **Create shipping label** / **Create return label**) | Call your carrier API → generate the AWB; **return a `Shipment`** (number + PDF label + status) |
| `shipment.cancelling` | **`merchant_actions`** (sync) | `Promise<Resp>`     | Before a shipment/return is cancelled                                                                             | Call your carrier API to void / cancel; **return `Resp.success()`** (or error to decline)       |
| `shipment.created`    | `merchant_events` (async)     | —                   | After a shipment is created                                                                                       | Sync downstream state (background)                                                              |
| `shipment.cancelled`  | `merchant_events` (async)     | —                   | After a shipment is cancelled                                                                                     | Reconcile / notify (background)                                                                 |
| `shipment.updated`    | `merchant_events` (async)     | —                   | After shipment details change                                                                                     | Sync tracking/status (background)                                                               |

> **Name to `save` against:** the sync cancel function is **`shipment.cancelling`**
> (`merchant_actions`, returns `Resp`), even though the AWB docs label its screen "Shipment
> Cancelled" (https://docs.salla.dev/1797616m0.md). `shipment.cancelled` is the separate
> async event. Reconcile names with `salla_functions action=list_triggers` (detail →
> `references/shipment-cycle.md`).

`shipment.creating` handles **both new shipments and returns** — one function, branch on the
payload's `type` field (`"shipment"` vs `"return"`) (https://docs.salla.dev/1792119m0.md).

**These sync triggers are App Functions, not webhooks.** Implement each with
`salla_functions action=save` (one function per trigger) using the locked wrapper from
`salla_functions action=get`. Handler signatures (first line of each is locked):

```ts
// shipment.creating — generate the AWB and return a Shipment
export default async (context: Shipments): Promise<Shipment> => {
  const { payload, settings, merchant } = context;
  const { data: shipment } = payload; // type: "shipment" | "return"

  const result = await callCarrierAwbApi(shipment); // your third-party API

  // setShipmentNumber() is REQUIRED; setPdfLabel/setStatus shape the AWB.
  // Return Shipment.error("…") on carrier failure.
  return Shipment.success()
    .setShipmentNumber(result.awb_number)
    .setPdfLabel(result.label_url)
    .setStatus(ShipmentStatusEnum.IN_TRANSIT);
};
```

```ts
// shipment.cancelling — void with the carrier, return Resp (NOT a Shipment)
export default async (context: Shipments): Promise<Resp> => {
  await voidWithCarrier(context.payload.data.shipping_number);
  return Resp.success().setData({});
};
```

> **App Function mechanics live in the `salla-app-functions` family** — the V8 sandbox
> limits, the locked template/first-line rule, save/validate, the **5-second sync budget**
> (each internal async call < 2s), pre-authenticated Admin API (no `Authorization` header),
> and the `Resp`/`Shipment` builder runtime: design → **`salla-app-functions-design`**,
> handler body → **`salla-app-functions-handler`**, save/validate →
> **`salla-app-functions-validate`**, test/preview → **`salla-app-functions-test`**.
> The shipping specifics — the full `Shipment` builder method list, `ShipmentStatusEnum`,
> the `Shipments` context payload, and the three AWB processing flows — live in
> [`references/shipment-cycle.md`](references/shipment-cycle.md).

**Before you save: confirm the payload field names from the fetched types.** Between getting
the template (`salla_functions action=get`) and `salla_functions action=save`, route the
handler body to **`salla-app-functions-handler`** — it owns writing the body, including the
rule that you fetch **every URL in the `types` array** from `action=get` and read the exact
`shipment.creating` / `shipment.cancelling` payload field names (addresses, parcel, weight,
`type: "shipment" | "return"`) off `context.payload.data` from those `.d.ts` definitions. Don't
guess carrier-API-style names like `sender_address` / `receiver_address` / `weight`.

**Gate:** "Handler body written via salla-app-functions-handler, with every
`context.payload.data` field confirmed against the trigger's fetched `types` `.d.ts` — none
guessed — before `salla_functions action=save`?"

**Test via the App Function MCP preview** (owned by **`salla-app-functions-test`**): save the
function, poll `salla_functions action=deploy_status` until `COMPLETED`, then run
`salla_functions action=preview` with `app_id`, `trigger`, a demo `store_id`, and the
trigger's form fields (e.g. a real `shipment_id`).

The **async events** (`shipment.created` / `shipment.cancelled` / `shipment.updated`) are
ordinary store events — subscribe them with `salla_events action=subscribe` (it **replaces**
the full list, so include every event you want active). Verify with `salla_events
action=list`. Transport (signature, fast-200, idempotency) → **`salla-webhooks`**.

The App Function returns the AWB synchronously. For **out-of-band** updates after the carrier
confirms (real shipping cost, tracking, status changes), push them with the partner-initiated
**Update Shipment Details** REST call (`PUT /shipments/{id}`, stored merchant `access_token` —
token storage/refresh → **`salla-app-auth`**; endpoint shape, required fields, and status enum
→ [`references/api-endpoints.md`](references/api-endpoints.md)). Validate the
`PUT /shipments/{id}` body against its documented OpenAPI schema (in the endpoint's
`docs.salla.dev/<id>.md` page — find it via **salla-docs**) and fix before relying on it,
via the read-schema → build → validate → fix → retry loop in **salla-api-core**.

**Gate:** "`salla_functions action=preview` returns a valid `Shipment` for `shipment.creating`
(both `type: shipment` and `type: return`) and `Resp.success()` for `shipment.cancelling` on
the demo store, and the AWB number / tracking appears on the order."

---

## Step 5 — Order Fulfilment (if that's your model)

If your model from Step 0 is **Order Fulfilment** (https://docs.salla.dev/423000m0.md), the
flow differs: you don't write a `shipment.creating` App Function — you react to
`order.created`, pick the carrier/branch, and **assign** the shipment, which triggers the
assigned Shipping App's `shipment.creating` function. Setup scopes (Basic Info, Orders,
Webhooks, Shipping) and events (`order.created`, `shipment.created`) per
https://docs.salla.dev/423002m0.md.

Full assignment + return/cancel cycle →
[`references/fulfillment-cycle.md`](references/fulfillment-cycle.md).

---

## Step 6 — Test & Publish

**Testing:** Connect a demo store via **App Testing** and simulate: new order → rate
request → label → tracking → cancellation → return. End-to-end demo-store validation is
owned by **`salla-live-testing`**. Use demo/non-sensitive data: keep production carrier
credentials, OAuth/bearer tokens, webhook signing secrets, and real customer PII out of any
third-party capture/inspection tool, and restore real config when done.

**Publishing:** public app → `app_publish` stepwise (`open` → `set` each section →
`validate` saves a DRAFT; the partner then submits one-click in the Portal `/publish` page —
owned by **salla-publication-consistency**). Private app → the partner sends the publish
request from the app-details page `https://portal.salla.partners/apps/{app_id}` (no MCP
action, no onboarding). Two shipping-specific blockers:

- The `sub_category_id` must be a shipping sub-category from `sub_categories`
  (`salla_reference action=categories type=shipping`).
- To appear in the merchant's **AWB courier options**, your app must be enabled by Salla —
  email **partners@salla.sa** (https://docs.salla.dev/1792111m0.md).

Once approved, your app is listed at https://apps.salla.sa/en under Shipping.

Test guide: https://docs.salla.dev/422998m0.md ·
Publishing guide: https://docs.salla.dev/422990m0.md

**Gate:** "Published — `salla_apps action=get` shows the expected status."

---

## Resources

| Topic                             | Link                                                                                                                           |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Shipping overview (both models)   | https://docs.salla.dev/422988m0.md                                                                                             |
| List of Shipping API              | https://docs.salla.dev/api-5578809                                                                                             |
| **Salla AWB** — getting started   | https://docs.salla.dev/1792089m0.md                                                                                            |
| AWB — create app                  | https://docs.salla.dev/1792111m0.md                                                                                            |
| AWB — setup app                   | https://docs.salla.dev/1792112m0.md                                                                                            |
| AWB function — Shipment Creating  | https://docs.salla.dev/1792119m0.md                                                                                            |
| AWB function — Shipment Cancelled | https://docs.salla.dev/1797616m0.md                                                                                            |
| Shipping Management — create      | https://docs.salla.dev/422995m0.md                                                                                             |
| Shipping Management — setup       | https://docs.salla.dev/422996m0.md                                                                                             |
| Shipping Management — app cycle   | https://docs.salla.dev/422994m0.md                                                                                             |
| Shipping Management — test        | https://docs.salla.dev/422998m0.md                                                                                             |
| Order Fulfilment — create         | https://docs.salla.dev/423001m0.md                                                                                             |
| Order Fulfilment — setup          | https://docs.salla.dev/423002m0.md                                                                                             |
| Order Fulfilment — app cycle      | https://docs.salla.dev/423000m0.md                                                                                             |
| Order Fulfilment — test           | https://docs.salla.dev/423003m0.md                                                                                             |
| Postman Collection                | https://www.postman.com/salla-app/workspace/salla-e-commerce-platform/collection/17687195-d700cd60-adf3-4b20-82ee-94851e88bd44 |
| Developer Community               | https://t.me/salladev                                                                                                          |
