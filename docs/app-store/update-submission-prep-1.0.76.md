# App Store Update Submission Prep - 1.0.76 (76)

Use this packet to prepare the next iOS App Store update submission after the TestFlight/App Store Connect upload.

## Build evidence

- Version: `1.0.76`
- Build: `76`
- EAS build ID: `ff5d95a3-31a0-4ca9-aed9-568c1a32bff5`
- EAS build profile: `production-widgets`
- Git commit: `8524c857b8dbe2952745eb8718297e6d53516aff`
- Commit message: `Prepare build 76 release config`
- EAS build URL: https://expo.dev/accounts/kwilt/projects/kwilt/builds/ff5d95a3-31a0-4ca9-aed9-568c1a32bff5
- App Store Connect TestFlight page: https://appstoreconnect.apple.com/apps/6755990439/testflight/ios

Local config checks before upload confirmed:

- `CFBundleShortVersionString`: `1.0.76`
- `CFBundleVersion`: `76`
- `ios.buildNumber`: `76`
- `android.versionCode`: `76`

## Paste-ready What's New

This update makes Kwilt's to-do workspace calmer and easier to organize.

- Improved to-do prioritization, sorting, and list polish so the next useful action is easier to spot.
- Added richer tag organization, including tag groups and smoother tag picking while editing a to-do.
- Added Activity Areas so work can be grouped by the parts of life it belongs to.
- Polished Kwilt's character artwork and fixed several reliability issues across planning, onboarding, and sync.

## Shorter What's New

Improves to-do organization with better prioritization, tag groups, Activity Areas, smoother editing, refreshed artwork, and reliability fixes.

## Reviewer notes

Paste this into App Review Information > Notes.

Hello,

This submission is Kwilt version 1.0.76 build 76.

Reviewers can create a fresh account using the normal sign-in flow. No pre-seeded demo account is required; onboarding creates the initial Arc/Goal experience needed to review the core app.

This update focuses on the to-do workspace and organization flows: improved prioritization and list polish, tag groups and tag vocabulary, Activity Areas, smoother tag editing, refreshed Kwilt artwork, and reliability improvements.

Useful review paths:

1. Fresh install onboarding: Open Kwilt, proceed through setup, and reach the app without enabling Location Services.
2. To-do organization: Create several to-dos, open the to-do list, use sorting/filtering, and inspect the priority and grouping behavior.
3. Tags: Edit a to-do, add tags, and use tag filtering/grouping from the to-do list.
4. Activity Areas: Open Settings > Activity Areas to review or manage life-area organization.
5. Optional location trigger: Create a to-do with a place-style prompt. If Kwilt recommends a location trigger, choose `Keep regular to-do` to confirm the to-do remains usable without Location Services. Choose `Use location triggers` only if you want to test the optional permission path.
6. Subscriptions: Settings > Subscriptions > Upgrade to Kwilt Pro. The plan picker includes price, billing period, Terms of Use (EULA), and Privacy Policy links before purchase. Restore purchases is also available from Settings > Subscriptions.
7. Legal and privacy: Settings > Legal & privacy includes Privacy Policy, Terms/EULA, support contact, Apple subscription management, and Account deletion guidance.
8. Account deletion: Sign in, then open Settings > Account settings > Delete account. Deletion happens in-app and does not require contacting support. The app explains that deleting a Kwilt account does not cancel Apple-managed subscriptions.
9. Apple Health: Settings > Weekly Chapters > Use Apple Health summaries. Kwilt requests read-only Apple Health summaries for movement, workouts, sleep, and mindfulness.
10. Calendar: Settings > Calendars connects Google or Outlook calendars for planning context and to-dos the user chooses to schedule.

Location Services are not required during first-time setup or returning-user setup. Users can complete onboarding and use Kwilt without enabling Location Services. Location-based nudges remain optional and are requested only after the user explicitly chooses a location-based feature for an existing to-do/place flow.

Canonical legal URLs:

- Terms/EULA: https://go.kwilt.app/terms
- Privacy Policy: https://go.kwilt.app/privacy

Thank you.

## Submission checklist

- [ ] Wait for Apple processing to finish for build `1.0.76 (76)`.
- [ ] In App Store Connect, create or open the next app version for `1.0.76`.
- [ ] Select build `1.0.76 (76)` for the iOS submission.
- [ ] Paste the What's New text.
- [ ] Paste the Reviewer notes.
- [ ] Confirm Privacy Policy URL is `https://go.kwilt.app/privacy`.
- [ ] Confirm Terms/EULA URL is `https://go.kwilt.app/terms`.
- [ ] Confirm screenshots are still representative of the current UI.
- [ ] Confirm App Privacy answers still match this build.
- [ ] Include any subscription products that still need App Review with the app submission.
- [ ] Submit for review.

## App Privacy reminder

Keep the existing privacy declarations aligned with the current build and live Privacy Policy. Do not mark data as tracking unless a future build uses data to track users across apps or websites owned by other companies.

Declare collection/use where applicable:

- Contact Info: email, name, and avatar when the user signs in.
- User Content: Arcs, Goals, to-dos, notes, check-ins, reactions, attachments, audio notes, shared-goal content, AI prompts, and AI context sent through the proxy.
- Health & Fitness: Apple Health summaries for movement, workouts, sleep, and mindfulness when enabled.
- Location: location/place data only for user-enabled place search, maps, and optional arrive/leave nudges.
- Purchases: Apple/RevenueCat subscription and entitlement status.
- Identifiers: Supabase user ID, install ID, RevenueCat app user ID, analytics distinct ID, and device/app identifiers used for auth, quotas, entitlement sync, abuse prevention, analytics, and diagnostics.
- Usage Data: app interaction events such as onboarding, paywall, restore, notifications, invites, widgets, AI usage, and feature adoption.
- Diagnostics: crash/error/performance style events if collected by SDKs or backend logs.

Do not include Phone/SMS data unless Phone Agent/SMS surfaces are restored before submission.

## Optional attachment checklist

- Fresh-install onboarding recording showing no Location Services request and successful entry into the app.
- To-do list recording showing priority, sorting/filtering, and tag grouping.
- Activity Areas recording showing Settings > Activity Areas.
- Subscription recording showing Settings > Subscriptions > plan picker > Terms/EULA link > Privacy Policy link, plus Restore purchases availability.
- Account deletion recording showing Settings > Account settings > Delete account, subscription warning, and final confirmation.
