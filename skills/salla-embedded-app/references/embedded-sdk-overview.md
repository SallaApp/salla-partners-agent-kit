# Salla Embedded SDK Overview

The **Salla Embedded SDK** is a communication bridge that allows your third-party application (running in an iframe) to interact securely with the Salla Merchant Dashboard. It provides helper methods to sync themes, handle navigation, trigger UI components, and manage authentication — making your app feel native to the Salla platform.

## Documentation Structure

| Section | Purpose |
| --- | --- |
| **Overview** | Introduction to the SDK, its purpose, and core architecture |
| **Getting Started** | Quick start — set up your app, configure embedded pages, align UI with the dashboard |
| **Create an Embedded App** | Register your app and add embedded pages in Salla Partners |
| **Installation** | Set up via NPM or CDN |
| **Authentication** | Token management and app security |
| **App Design Guidelines** | Design requirements and brand alignment for a native Salla experience |
| **Playground Testing** | Use the Playground and Test Kit to prototype SDK functions |

## SDK Modules

| Module | Responsibility |
| --- | --- |
| **Auth** | Token management and app security |
| **Page** | Document titles, navigation, iframe resizing |
| **Nav** | Dashboard navbar and action buttons |
| **UI** | Toasts, Modals, Confirm dialogs, Loading states |
| **Checkout** | Create Checkout, Get App Add-Ons, Subscribe for Payment |

## Resources

| Topic | Link |
| --- | --- |
| Auth Module | https://docs.salla.dev/embedded-sdk/modules/auth.md |
| Page Module | https://docs.salla.dev/embedded-sdk/modules/page.md |
| Nav Module | https://docs.salla.dev/embedded-sdk/modules/nav.md |
| UI Module | https://docs.salla.dev/embedded-sdk/modules/ui.md |
| Checkout Module | https://docs.salla.dev/embedded-sdk/modules/checkout.md |
| Token Introspect Endpoint | https://docs.salla.dev/6394918f0.md |
| Support & Contribution | https://docs.salla.dev/embedded-sdk/resources/support.md |
