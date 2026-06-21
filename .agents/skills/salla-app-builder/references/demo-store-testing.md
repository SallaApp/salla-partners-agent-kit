# Demo Store Testing — Portal Flow

Distilled from the Salla Developers article `how-to-test-your-app-using-salla-demo-stores`
(the blog is a JS-rendered SPA; content captured here). Portal labels and steps may have
changed — verify the current flow against the Portal/docs before relying on exact wording.
For MCP-driven install + live checks, see the `salla-live-testing` skill — this covers the
manual Portal + webhook.site flow.

## 1. Create a demo store

Partner Portal → **Demo Stores** (left menu) → **Create Demo Store** → enter **Store Name**,
**Password**, **Confirm Password** → **Create Demo Store**. It then appears in the Demo
Stores list.

## 2. Install your app on it

Partner Portal → **My Apps** → your App → scroll to **Test Your App** → **Install App** next
to the target store → **Authorize App** on the consent screen. The app then shows on the
demo store's home page.

## 3. Test events with a throwaway webhook endpoint

> **Demo/non-sensitive data only.** webhook.site is a third-party capture service —
> anyone with the URL can read what lands there. Use it **only** with demo-store data.
> Never send production secrets, OAuth/bearer tokens, the webhook **signing secret**, or
> real customer PII to it. Use a fresh, unguessable URL and discard it after testing.

1. Get a capture URL from **webhook.site** (free, no signup — gives a unique URL).
2. Partner Portal → App → **Webhooks/Notifications** → paste the URL → **Update**.
3. Scroll to **Store Events** → subscribe to the event(s) you want (e.g. `Product Created`).
4. Open the demo store **dashboard** (link in the Demo Stores section) and perform the
   action — e.g. add a product, fill details, **Create Product**, **Save**.
5. Confirm delivery on the **Webhooks Log** page (or on webhook.site) — the payload should
   match the subscribed event.

> **After testing, restore your real webhook URL and security strategy and re-save the
> config** — leaving the throwaway URL in place breaks live delivery. To actually
> **verify** the signature/idempotency of those payloads (not just that they arrived), see
> **`salla-webhooks`**; for MCP-driven install + live smoke tests, see
> **`salla-live-testing`**.

This validates that subscriptions, delivery, and payload shape work end to end before
publishing.
