# Kwilt Terms and Privacy Requirements

**Current release baseline:** `1.0.104 (104)`
**Last product review:** August 12, 2026

This document is not legal advice. It defines the product and engineering requirements that consumer legal language and store disclosures must satisfy. The detailed data map is [the mega-app disclosure matrix](legal/mega-app-data-disclosure-matrix.md).

## One product contract

Kwilt is one Tools for Life app. Its public documents must cover:

- Planning, Focus, Chapters, durable Chat, attachments, AI, and voice.
- Money with Plaid-connected accounts, transactions, budgets, forecasting, AI classification, privacy lock, widgets, and optional Screen Time rules.
- Explore with precise foreground/background location, recorded paths, Places, history, maps, and signed-in synchronization.
- Recipes, cooking, Meals, dietary needs, Groceries, and optional retailer connections/cart handoffs.
- Guest/local and authenticated private multiplayer Games, including nearby discovery and user-created game content.
- Household rosters, parent-managed dependent profiles, caregiver authority, capability grants, and family Screen Time controls.
- Apple/Google sign-in, Google/Microsoft calendars, Apple Health, notifications, subscriptions, analytics, email, optional Phone Agent SMS, connected AI tools, and account deletion.

`Local-first` must never be used to imply `device-only`. The policy must identify which optional actions send data to Kwilt or another provider.

## Terms of Use requirements

### Eligibility and dependents

- A person under 13 may not create or control a Kwilt account.
- An adult may create a parent-managed dependent profile and enable bounded household capabilities for that dependent.
- A person from 13 to the local age of majority needs parent or guardian consent to use a Kwilt account.
- The adult is responsible for dependent-profile information, capability grants, invitations, and appropriate supervision.

### Accounts and subscriptions

- Core local experiences may work without sign-in; cloud sync, sharing, connected providers, durable Chat, Money, remote Games, and other services may require an account.
- Logging out does not by itself erase local data.
- Account deletion is distinct from cancelling an Apple-managed subscription.
- Apple processes purchases; RevenueCat manages Kwilt entitlement state. Auto-renewal, trial conversion, restore, cancellation, and refund language must match the purchase sheet.

### User content and sharing

- Users retain ownership of their content and grant Kwilt a limited operational license.
- Content includes planning objects, Chat, attachments, recipes/imports, photos/scans/audio, meal choices, grocery items, player names, game submissions, household content, and connected-tool actions.
- The user must have rights to import, upload, publish, or share content and must respect privacy, copyright, trademark, publicity, and other rights.
- Private-by-default data becomes visible only through an explicit share, access grant, household role, game room, connected-provider authorization, or publication action.

### Capability reliance boundaries

- AI may be incomplete or wrong and is not medical, mental-health, legal, financial, tax, investment, or other professional advice.
- Money is a budgeting aid. Plaid/bank data can be delayed, incomplete, duplicated, or corrected; Kwilt does not move money, issue credit, or make lending decisions.
- Explore is not an emergency, navigation, safety, tracking, or missing-person service. Location history may be incomplete or inaccurate.
- Recipes, dietary labels, and meal suggestions are not medical, nutrition, or allergy advice. Users remain responsible for ingredients, allergens, preparation, food safety, and household needs.
- Retailer price, availability, substitutions, fulfillment, payment, checkout, coupons, and orders remain controlled by the retailer.
- Calendar/notification/Screen Time actions are best-effort and depend on OS/provider permissions, connectivity, and platform behavior.
- Games are private connection experiences; room members must not harass, impersonate, doxx, cheat through service abuse, or share others' content without permission.

### Connected services

- Cover Google and Microsoft calendar connections as well as `.ics` export.
- Cover Plaid financial connections, Kroger/Smith's retailer connections, OAuth MCP clients, image/GIF search, AI/voice providers, and app-store services.
- Users are responsible for third-party accounts and may disconnect or revoke them through Kwilt or the provider where supported.

### Standard legal terms

Maintain appropriate provisions for acceptable use, quotas, suspension, reports/moderation, intellectual property/takedowns, Apple third-party beneficiary terms, availability, disclaimers, limitation of liability, indemnity, dispute resolution/arbitration opt-out, governing law, changes, and contact.

## Privacy Policy requirements

### Data categories

The policy must plainly disclose:

- Account/contact/profile and household/dependent information.
- Planning, Chat, AI, voice, attachment, calendar, Health, and connected-tool content.
- Financial institutions, accounts, balances, transactions, merchants, categories, budgets, forecasts, and related Money records.
- Precise/background location, routes, visits, Places, map requests, and Explore history.
- Recipes/import URLs/content/provenance, media, cook records, dietary needs, meal plans/choices, grocery lists/products/prices, retailer connections, and cart handoffs.
- Player profiles, private rooms, invitations, gameplay state/actions/scores, submissions, votes, and nearby/local-network discovery.
- Subscription/purchase state, install/user/analytics identifiers, push tokens, usage events, diagnostics, and email delivery/preferences.

### AI and audio paths

- State what content is selected and why it is sent.
- Describe the normal Supabase AI endpoint to OpenAI path.
- Disclose that live conversation may use an ephemeral credential for a direct encrypted device-to-OpenAI Realtime connection.
- Separate durable Kwilt Chat/message/action history from transient provider processing and operational telemetry.
- State that Kwilt does not use user content to train its own general-purpose models and configures business/API providers not to train on submitted content where the provider offers that control.

### Named providers

Name the active roles of Supabase, OpenAI, Plaid, PostHog, RevenueCat, Apple, Google, Microsoft, Kroger/Smith's, Instacart when enabled, Resend, Twilio, Expo push, Unsplash, GIPHY, OpenStreetMap/Nominatim, OpenStreetMap.de, and Wikimedia Maps. Explain that app stores and connected providers may independently control data under their own policies.

### Controls and sharing

- Location: foreground/manual and optional background Automatic Exploring; OS revocation; stopping recording; private by default.
- Money: optional Face ID/device-auth privacy lock; local display-safe widgets; Apple Family Controls tokens stay on device.
- Calendar/Health/photos/camera/microphone/notifications/local network: request only after the user enters the relevant feature and honor OS controls.
- Household: roster visibility and capability-owned authorization; membership never means blanket access to personal Money, Explore, Recipes, Chat, or other private capability data.
- Analytics: no intentional free-form or sensitive capability content, no advertising, no cross-context tracking.

### Retention and deletion

- Explain device deletion, account deletion, connected-provider disconnection, Storage deletion, shared-content de-identification, processor records, logs, security/fraud records, and backups.
- Do not promise immediate deletion from every backup or independent provider.
- Do not promise that account deletion cancels Apple subscriptions or deletes events/orders/data controlled by a connected provider.
- The implementation must satisfy the deletion release contract in the matrix before public copy says account deletion removes the corresponding data.

### Regional rights and security

Maintain rights to access, correct, delete, port, and object/opt out where applicable; no sale/share for cross-context behavioral advertising; legal bases where relevant; international transfers; HTTPS, access controls, least-privilege authorization, and the statement that no system is perfectly secure.

## Release synchronization gates

Before every public build:

1. Compare the compiled capability registry, native permissions, dependencies, Edge Functions, database migrations, analytics catalog, and provider flags with the disclosure matrix.
2. Update the public Privacy Policy and Terms effective/updated date for material changes.
3. Update in-app legal summaries and keep all links canonical at `https://go.kwilt.app/privacy` and `https://go.kwilt.app/terms`.
4. Update App Store Connect App Privacy answers and Google Play Data Safety answers for the submitted build.
5. Verify permission prompts and prominent disclosures on a signed device for background location, microphone, photos/camera, Calendar/Reminders, Apple Health, local network, Face ID, notifications, and Family Controls.
6. Exercise account deletion on a disposable signed-in account that used Money, Explore sync, Chat, Household, Recipes/Meals/Groceries, Games, calendar, Health sync, attachments, and connected tools.
7. Confirm legal pages are live before publishing store answers or submitting the build.
8. Preserve screenshots or exported console summaries as release evidence; do not treat source text alone as App Store/Play proof.
