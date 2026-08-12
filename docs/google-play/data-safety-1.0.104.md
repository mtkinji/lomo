# Google Play Data Safety — Kwilt 1.0.104

**Prepared:** August 12, 2026
**Privacy Policy:** `https://go.kwilt.app/privacy`

Kwilt's current Android package declares coarse, precise, and background location. Use this packet before an Android production release. A declaration must describe every optional data path in the submitted build, even if a particular user never enables it.

## Top-level answers

- Does the app collect or share required user data types? **Yes**.
- Is all user data encrypted in transit? **Yes** for Kwilt-controlled network traffic (HTTPS/TLS). Verify every enabled provider endpoint before submission.
- Can users request deletion? **Yes**, in-app through Settings → Account settings → Delete account or at `https://www.kwilt.app/delete-account` without reinstalling the app.
- Does the app support independent account creation? **Yes**, through Apple/Google sign-in where available.
- Is the app primarily directed to children? **No**. People under 13 cannot create/control an account; adults can create parent-managed dependent profiles.
- Does the app sell user data or use it for advertising? **No**.

## Service-provider and user-directed transfers

The recommended **Shared** answer below is **No** where a recipient acts only as Kwilt's contracted service provider, or the transfer is an explicit user-directed action covered by Google Play's exclusions. Confirm current contracts/configuration before publishing. If any provider uses the information for its own independent purpose outside an applicable exclusion, change the affected type to Shared = Yes.

## Data-type answers

| Google Play category/type | Collected | Shared | Required or optional | Processing | Purposes |
|---|---:|---:|---|---|---|
| Location → Approximate location | Yes | No under processor/user-action exclusions | Optional | Stored for selected/synced features; transient for some lookups | App functionality, Personalization |
| Location → Precise location | Yes | No under processor/user-action exclusions | Optional | Stored for Explore/sync; ongoing only while user-enabled background feature runs | App functionality, Personalization |
| Personal info → Name | Yes | No | Optional for account; required for some shared/player profiles | Stored | App functionality, Personalization, Account management |
| Personal info → Email address | Yes | No | Required for account/provider identity where applicable | Stored | App functionality, Developer communications, Account management |
| Personal info → Phone number | Yes when Phone Agent is enabled | No under processor exclusion | Optional | Stored | Phone Agent verification, linking, and SMS delivery; App functionality, Account management |
| Personal info → User IDs | Yes | No | Required for account-backed features | Stored | App functionality, Analytics, Personalization, Fraud prevention/security, Account management |
| Personal info → Other info | Yes | No | Optional | Stored | Household adult/dependent designation, profile/coaching context; App functionality, Personalization |
| Financial info → Purchase history | Yes only if Android billing is enabled | No | Optional | Stored | Google Play/RevenueCat subscription and entitlement; App functionality, Analytics, Account management |
| Financial info → Other financial info | Yes | No under processor exclusion | Optional | Stored | Plaid accounts/balances/transactions and Kwilt budgets/forecasts; App functionality, Personalization |
| Health and fitness → Health info | Yes | No | Optional | Stored when authorized/synced | Apple Health summaries and health-related dietary needs; App functionality, Personalization |
| Health and fitness → Fitness info | Yes | No | Optional | Stored when authorized/synced | Activity/workout/steps summaries; App functionality, Personalization |
| Messages → Other in-app messages | Yes | No | Optional | Stored for durable Chat/shared responses | App functionality, Personalization |
| Messages → SMS or MMS | Yes when Phone Agent is enabled | No under processor exclusion | Optional | Stored for Phone Agent message/action history | App functionality |
| Photos and videos → Photos | Yes | No under processor exclusion | Optional | Stored for attachments/imports; transient for some AI actions | App functionality, Personalization |
| Photos and videos → Videos | Yes | No | Optional | Stored for attachments when enabled | App functionality |
| Audio files → Voice or sound recordings | Yes | No under processor exclusion | Optional | Ephemeral for some transcription/live voice; stored for selected attachments/transcripts | App functionality, Personalization |
| Files and docs → Files and docs | Yes | No | Optional | Stored for selected attachments/imports | App functionality |
| Calendar → Calendar events | Yes | No under provider/user-action exclusions | Optional | Stored connection metadata; event content/availability processed as selected | App functionality, Personalization |
| App activity → App interactions | Yes | No | Required/automatic when analytics is enabled in the submitted build | Stored in privacy-minimized form | Analytics, App functionality, Fraud prevention/security |
| App activity → In-app search history | Yes | No under processor/user-action exclusions | Optional | Selected queries/results may be stored | App functionality, Personalization |
| App activity → Other user-generated content | Yes | No | Optional | Stored when synced/account-backed | Planning, recipes, meals, groceries, household/dependent data, attachments metadata; App functionality, Personalization |
| App activity → Other actions | Yes | No | Optional | Stored | Gameplay, votes, reactions, approvals, connected-tool actions; App functionality, Analytics |
| App info and performance → Diagnostics | Yes | No | Automatic for network/service use | Stored for bounded operational periods | Analytics, App functionality, Fraud prevention/security |
| App info and performance → Other performance data | Yes | No | Automatic for network/service use | Stored for bounded operational periods | Analytics, App functionality |
| Device or other IDs → Device or other IDs | Yes | No | Required for some delivery/security; analytics optional where controlled | Stored | App functionality, Analytics, Fraud prevention/security |

## Prominent disclosure: background location

Before the Android background-location permission request, show an in-app disclosure that:

- names **Automatic Exploring**;
- says Kwilt collects precise location when the app is closed or not in use;
- explains that it adds walks, drives, errands, trips, and optional arrive/leave reminders to the user's private Explore history;
- states that signed-in history can sync to the user's Kwilt account;
- gives a clear `Not now` choice and requires an affirmative action before the OS request;
- explains how to stop Automatic Exploring and revoke access.

The Play Console may require a background-location declaration form, short demonstration video, and reviewer instructions. Source permission strings alone are not sufficient proof.

## Dependent-profile boundary

- Kwilt is not submitted as a child-directed app unless the product and SDK set are separately reviewed for Families requirements.
- A person under 13 cannot create/control an account.
- An adult can add a bounded dependent profile inside an invite-only Household.
- Do not represent household/dependent data as public or use it for advertising/analytics content.

## Deletion evidence

- [ ] Disposable user connects/uses Money, Explore sync, Chat/voice, Household/dependent profile, Recipes/Meals/Groceries, Games, Calendar/Health, attachments, and connected tools.
- [ ] In-app delete succeeds without support intervention.
- [ ] Plaid Items and stored provider credentials are removed/revoked.
- [ ] Supabase Auth identity, direct user rows, and Storage objects are removed.
- [ ] Shared data is either removed or retained only as disclosed and de-identified for remaining participants.
- [ ] Device caches are cleared and the signed-out app does not render the deleted account's Money, location, Chat, Health, or household data.
- [ ] Apple/Google provider-side records and store subscriptions are accurately described as independently controlled where applicable.

## Pre-publication gates

- [ ] Confirm Android production build actually enables each listed capability/provider; remove unavailable review paths rather than promising them.
- [ ] Publish the August 12 Privacy Policy first.
- [ ] Complete Data Safety answers and capture the Play Console summary.
- [ ] Complete background-location review evidence.
- [ ] Verify every integrated SDK/provider against the current Play SDK Index and its disclosure guidance.
- [ ] Counsel reviews financial, Health, dependent-profile, location, and regional-rights language.
