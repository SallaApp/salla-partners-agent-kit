# Private Apps — Publish and Store Requests

A private app is built for specific merchants and never appears in the App Store. It has no
listing, no onboarding and no `app_publish` sections. After it is configured (scopes,
webhooks, settings, functions — the same tools as any app), it goes through two steps, both
on the `salla_private_apps` MCP tool:

1. **Publish** the private app (`action: "publish"`).
2. **Send it to stores** as access requests (`action: "create_request"`); each store's merchant
   accepts the request to install it.

Always start with `salla_private_apps action=status` — it tells you which rules apply. Call
it **without `app_id` before creating the app**: it returns just the account kind, which
decides `is_paid` on `salla_apps action=create`.

## The two account kinds

`status` returns `is_merchant`. The Portal applies different rules to each kind, and the
tool picks the matching endpoint itself — you never choose it.

|                   | Merchant partner (`is_merchant: true`)                             | Regular partner (`is_merchant: false`)                                                      |
| ----------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| Who               | A merchant who signed in to the Partners Portal with their store   | A developer/agency partner account                                                          |
| Create the app    | Free private apps allowed (`is_paid: "0"`)                         | Must be paid (`is_paid: "1"`) unless Salla granted free private apps (`private_apps_limit`) |
| Publish           | Usually auto-approved — goes **live immediately**, no admin review | Submitted to Salla review                                                                   |
| Store requests    | **Free**, to the merchant's **own** store only, **one** per app    | **Paid**, any number of stores, each with its own price and billing cycle                   |
| Request fields    | `store_url` only                                                   | `store_url`, `store_name`, `price`, `recurring`                                             |
| Restricted scopes | `shippings`, `settlements`, `subscriptions`, `customer_wallets`    | None beyond the per-app `disabled` flags                                                    |

## Step 1 — Check status

Before create: `salla_private_apps action=status` with no `app_id` returns `is_merchant` and
`id_verified` only. After create, `salla_private_apps action=status`, `app_id` returns:

- `status`, `is_published` (has an approved publication), `is_already_submitted`;
- `is_merchant`, `id_verified` (the account must be ID-verified to publish);
- for regular partners, `durations`: the allowed billing cycles with `min`/`max` price —
  monthly and yearly for private apps. Use these values; don't hardcode prices.

**Gate:** "Is the app `type: private`, `id_verified` true, and do I know the account kind?"

## Step 2 — Publish

1. Confirm with the partner first. For a merchant partner the app usually goes **live right
   away** — there is no review step to catch mistakes.
2. Call `salla_private_apps action=publish`, `app_id`, `confirm: true`. If the app is already
   published (`is_published: true`), also pass `update_note: { en, ar }` describing the change.
3. Read the result: `approved` = live; otherwise it's waiting for Salla review, and store
   requests can be sent once it's approved.

There is no pricing step before publishing: a private app's price lives on each store request
(Step 3), and the Portal rejects requests until the app has a publication.

| Error                        | Meaning → fix                                                                                            |
| ---------------------------- | -------------------------------------------------------------------------------------------------------- |
| `free_private_apps_disabled` | A regular partner's free private app. Make it paid (`salla_apps action=update is_paid="1"`).             |
| `id_verification`            | The account isn't ID-verified. The partner completes it in the Partners Portal.                          |
| `already_submitted`          | A publication is already pending. Wait, or withdraw it (`salla_private_apps action=withdraw`) and retry. |

**Gate:** "Partner confirmed, publish returned a publication, and I told them whether it is
live or pending review?"

## Step 3 — Send it to stores

The app must be published, and the store must be on a **Pro or Special** plan.

- **Merchant partner:** `create_request` with `store_url` of their own store. Only one request
  per app; a different store is rejected.
- **Regular partner:** `create_request` with `store_url`, `store_name`, `price` (SAR) and
  `recurring` (`monthly` or `yearly`, from `status.durations`). Private apps can't be free and
  must meet the cycle's minimum price; one-time payments aren't allowed.

To pull back a publication still pending review, use `salla_private_apps action=withdraw`.

Manage requests with `list_requests` (paginated: pass `page`, read `pagination`) /
`get_request`, `update_request` (resend after a new publication or a rejection) and
`delete_request`. Regular partners address a request by its `request_id`; merchant partners
have only one, so no id is needed. On `update_request`, pass only what changes — the rest
keeps its current value. Once a request is accepted or an update is pending, its price and
cycle are locked.

**Gate:** "Request created with a cycle and price inside `status.durations` (regular partner),
or the merchant's own store URL (merchant partner)?"

## Scopes on merchant partners' private apps

The Portal hides `shippings`, `settlements`, `subscriptions` and `customer_wallets` from
`salla_scopes action=get` on a merchant partner's private app and silently skips them on save.
`salla_scopes action=set` reports anything that wasn't saved under `dropped`; `verified: false`
means it couldn't re-read the app, so confirm with `action=get`. Scopes the app already held
before the restriction stay. Design the app without these scopes.

## Red Flags

| Tempting thought                                                          | Why it's wrong                                                                                                     |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| "I'll publish the private app with `app_publish`."                        | `app_publish` is the public App Store listing flow. Private apps publish with `salla_private_apps action=publish`. |
| "Publish is harmless — I'll call it without asking."                      | A merchant partner's private app usually goes live at once. Always get the partner's explicit confirmation first.  |
| "I'll offer the private app to this store for free / one-time / 500 SAR." | Regular partners' private apps are paid, monthly or yearly, at or above the `status.durations` minimum.            |
| "The merchant partner can send it to a client's store too."               | Merchant partners can request only their own store, once per app.                                                  |
| "`salla_scopes set` succeeded, so `shippings` is granted."                | Check `dropped`: restricted scopes on a merchant partner's private app are not saved even when the call succeeds.  |
