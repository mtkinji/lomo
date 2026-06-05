# App Store Approval Hardening - 1.0.69 (71)

Use this packet before resubmitting submission `a6ab4d24-38d3-48f4-b5f2-8d53f8bffcbf`.

## Reviewer notes

Paste this into App Review Information > Notes, then attach the screen recordings listed below.

Hello,

This build addresses the latest Location Services review feedback and includes additional App Review readiness checks.

Reviewers can create a fresh account using the normal sign-in flow. No pre-seeded demo account is required; onboarding creates the initial Arc/Goal experience needed to review the core app.

Location Services are no longer requested during first-time setup or returning-user setup. Users can complete onboarding and use Kwilt without enabling Location Services. Location-based nudges remain optional and are requested only after the user explicitly chooses a location-based feature, such as accepting a location-trigger recommendation for an already-created to-do or enabling location offers from a to-do/place flow.

This build also improves subscription entitlement recovery for signed-in users. Kwilt now identifies the signed-in Kwilt account with RevenueCat and refreshes customer info automatically after sign-in/reinstall/device change, so Pro access follows the user account. Manual Restore Purchases remains available from Settings > Subscriptions for rare legacy receipt cases, but the app does not automatically call Restore Purchases on launch or sign-in.

Useful review paths:

1. Fresh install onboarding: Open Kwilt, proceed through setup, and reach the app without enabling Location Services.
2. Optional location trigger: Create a to-do with a place-style prompt. If Kwilt recommends a location trigger, choose `Keep regular to-do` to confirm the to-do remains usable without Location Services. Choose `Use location triggers` only if you want to test the optional permission path.
3. Subscriptions: Settings > Subscriptions > Upgrade to Kwilt Pro. The plan picker includes price, billing period, Terms of Use (EULA), and Privacy Policy links before purchase. Restore purchases is also available from Settings > Subscriptions.
4. Legal and privacy: Settings > Legal & privacy includes Privacy Policy, Terms/EULA, support contact, Apple subscription management, and Account deletion guidance.
5. Account deletion: Sign in, then open Settings > Account settings > Delete account. Deletion happens in-app and does not require contacting support. The app explains that deleting a Kwilt account does not cancel Apple-managed subscriptions.
6. Apple Health: Settings > Weekly Chapters > Use Apple Health summaries. Kwilt requests read-only Apple Health summaries for movement, workouts, sleep, and mindfulness.
7. Calendar: Settings > Calendars connects Google or Outlook calendars for planning context and to-dos the user chooses to schedule.

Canonical legal URLs:

- Terms/EULA: https://go.kwilt.app/terms
- Privacy Policy: https://go.kwilt.app/privacy

## Required attachments

- Fresh-install onboarding recording showing no Location Services request and successful entry into the app.
- Optional location-trigger recording showing `Keep regular to-do` leaves the to-do usable without Location Services.
- Subscription recording showing Settings > Subscriptions > plan picker > Terms/EULA link > Privacy Policy link, plus Restore purchases availability.
- Account deletion recording showing Settings > Account settings > Delete account, subscription warning, and final confirmation.
- Optional: Legal & privacy recording showing Settings > Legal & privacy and the live policy links opening.

## App Store Connect privacy answers

Align App Privacy labels with the current app and live Privacy Policy. Do not mark data as tracking unless a future build uses data to track users across apps/websites owned by other companies.

Declare collection/use where applicable:

- Contact Info: email, name, and avatar when the user signs in.
- User Content: Arcs, Goals, to-dos, notes, check-ins, reactions, attachments, audio notes, shared-goal content, AI prompts, and AI context sent through the proxy.
- Health & Fitness: Apple Health summaries for movement, workouts, sleep, and mindfulness when enabled.
- Location: location/place data only for user-enabled place search, maps, and optional arrive/leave nudges.
- Purchases: Apple/RevenueCat subscription and entitlement status.
- Identifiers: Supabase user ID, install ID, RevenueCat app user ID, analytics distinct ID, and device/app identifiers used for auth, quotas, entitlement sync, abuse prevention, analytics, and diagnostics.
- Usage Data: app interaction events such as onboarding, paywall, restore, notifications, invites, widgets, AI usage, and feature adoption.
- Diagnostics: crash/error/performance style events if collected by SDKs or backend logs.

Third parties to disclose in policy/metadata as applicable:

- Supabase: auth, database, storage, edge functions, AI proxy, account deletion, shared goals, attachments, and calendar gateway.
- OpenAI or current LLM provider through the AI proxy: AI generation and summaries.
- RevenueCat and Apple: subscription entitlement and purchase handling.
- PostHog: product analytics, with free-form text redaction in the client.
- Unsplash and GIPHY: optional image/GIF search requests.
- Google and Microsoft: optional calendar connection.
- Resend: app emails such as invites or chapter delivery, if enabled.

## Binary/config checks

- Build/version is `1.0.69 (71)`.
- `npx expo config --type introspect` shows no `UIBackgroundModes` value of `location`.
- Generated iOS config has specific purpose strings for Location, Calendar, Reminders, Apple Health, Camera, Photo Library, and Microphone.
- `https://go.kwilt.app/terms` and `https://go.kwilt.app/privacy` return HTTP 200.
- Production EAS env includes RevenueCat, Supabase, AI proxy, PostHog host/key, and any feature-specific keys required for enabled review paths.

## Device smoke checklist

- Onboarding completes with Location Services denied/not granted.
- Settings > Legal & privacy opens Privacy Policy, Terms/EULA, support email, Manage subscription, and Account deletion.
- Settings > Subscriptions fetches packages, shows prices, starts sandbox purchase, and restores purchases.
- Settings > Account settings deletes a signed-in test account and synced cloud data.
- Settings > Weekly Chapters can request Apple Health read permission and can be turned off again.
- Settings > Calendars can start Google/Outlook auth and disconnect an account.
- Photo/video and audio attachment permission prompts use specific purpose strings.
