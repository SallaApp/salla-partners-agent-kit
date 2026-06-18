# Publication Standards — App Store Listing Requirements

Distilled from the Salla Developers article `standards-salla-apps-publications` (the blog is
a JS-rendered SPA; content captured here). Meet these to avoid review rejection. For the
config↔draft sync gate, see the `salla-publication-consistency` skill.

## Before you submit

- **ID verification** is required — an unverified partner is prompted to complete it.
- **Shipping apps** have an extra pre-step: complete the Google form / email the shipping
  team for review **before** the publish request (form link + email are on the App details
  page). Approval there unlocks the publish request.
- Submit from the App page → scroll to the publish button → the publish wizard.

## Basic information

| Field        | Constraint                                                     |
| ------------ | -------------------------------------------------------------- |
| App name     | Arabic **and** English, **≤ 30 chars**                         |
| Categories   | Select the appropriate labelling categories                    |
| Description  | Arabic **and** English, **≤ 200 chars**, clear/straightforward |
| Icon         | High quality, reflects your brand                              |
| Search terms | SEO keywords so merchants find the app                         |
| Promo video  | Optional YouTube link, recommended **< 2 minutes**             |

## App configuration

- **App Scope** — scopes define what the app accesses on the merchant store and must
  reflect the app's actual service. Scopes beyond the type's conventional set need
  justification in the pre-launch meeting or risk delay/rejection. Each type (Public,
  Private, Shipping) has generic conventional scopes.
- **Webhooks/Notifications** — two schemas:
  - **App Events** — received automatically (install, uninstall, trial start, subscription,
    rating — i.e. events on the app's own side).
  - **Store Events** — opt-in. Subscribe **only** to events directly related to your
    service; irrelevant subscriptions need justification or cause delay/rejection.

## App features

- **App Gallery** — **3** images at **1366 × 768** (shown on landing).
- **Key Benefits** — **3** entries at **1600 × 1600**, each with a title (AR+EN, **≤ 30
  chars**) and description (AR+EN, **≤ 255 chars**). Key-benefit images must relate to their
  titles and differ from the gallery images.

## Pricing, contact, trial, preview

- **Pricing** — 3 plan models: **One-Time Charge**, **Recurring Charge**, **Pay-as-you-go**;
  describe each package clearly. (Plans/entitlements → `salla-app-billing`.)
- **Contact** — pick a primary support method (phone, email, or technical-support link);
  optionally add Privacy Policy + FAQ links.
- **Service Trial** — provide a test account so Salla's team can review efficiently.
- **App Preview** — preview the App Store listing from the dashboard before submitting.

## Updates after going live

Use **Updated Publish Request** on the dashboard — a 6-section wizard (scope, featured
images, pricing, etc.) lets you edit and resubmit for review. Add a description that
notifies merchants who already installed the app about what changed.
