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

This update adds Screen Time Controls to help you put meaningful action before distracting apps.

- Choose apps or categories that tend to pull you away.
- Block selected apps until you take a real step in Kwilt, or while a Focus session is running.
- Set up controls from Settings or from Focus when you are ready to reduce distractions.
- Also includes improvements to to-do organization, tags, Activity Areas, planning, onboarding, and sync reliability.

## Shorter What's New

Adds Screen Time Controls for real-step-first and Focus-session app blocking, plus improvements to to-do organization, tags, Activity Areas, and reliability.

## Reviewer notes

Paste this into App Review Information > Notes.

Hello,

This submission is Kwilt version 1.0.76 build 76.

Reviewers can create a fresh account using the normal sign-in flow. No pre-seeded demo account is required; onboarding creates the initial Arc/Goal experience needed to review the core app.

This update focuses on Screen Time Controls. Users can choose apps or categories to block, then enable rules that keep those selected apps blocked until they take a real step in Kwilt or while a Focus session is running. The release also includes improvements to the to-do workspace: prioritization and list polish, tag groups and tag vocabulary, Activity Areas, smoother tag editing, and reliability improvements.

Useful review paths:

1. Fresh install onboarding: Open Kwilt, proceed through setup, and reach the app without enabling Location Services.
2. Screen Time Controls: Open Settings > Screen Time Controls. Allow Screen Time, choose apps or categories to block, then choose whether selected apps should wait until the user takes a real step, while Focus is running, or both. Screen Time access is requested only from this explicit setup flow.
3. Focus setup path: Open a to-do, start or open Focus, and use the Screen Time Controls setup offer if shown. This path configures the same optional controls for distraction blocking during Focus.
4. To-do organization: Create several to-dos, open the to-do list, use sorting/filtering, and inspect the priority and grouping behavior.
5. Tags: Edit a to-do, add tags, and use tag filtering/grouping from the to-do list.
6. Activity Areas: Open Settings > Activity Areas to review or manage life-area organization.
7. Optional location trigger: Create a to-do with a place-style prompt. If Kwilt recommends a location trigger, choose `Keep regular to-do` to confirm the to-do remains usable without Location Services. Choose `Use location triggers` only if you want to test the optional permission path.
8. Subscriptions: Settings > Subscriptions > Upgrade to Kwilt Pro. The plan picker includes price, billing period, Terms of Use (EULA), and Privacy Policy links before purchase. Restore purchases is also available from Settings > Subscriptions.
9. Legal and privacy: Settings > Legal & privacy includes Privacy Policy, Terms/EULA, support contact, Apple subscription management, and Account deletion guidance.
10. Account deletion: Sign in, then open Settings > Account settings > Delete account. Deletion happens in-app and does not require contacting support. The app explains that deleting a Kwilt account does not cancel Apple-managed subscriptions.
11. Apple Health: Settings > Weekly Chapters > Use Apple Health summaries. Kwilt requests read-only Apple Health summaries for movement, workouts, sleep, and mindfulness.
12. Calendar: Settings > Calendars connects Google or Outlook calendars for planning context and to-dos the user chooses to schedule.

Screen Time Controls are optional and user-configured. Kwilt only blocks apps or categories selected by the user, and the setup copy explains that selections stay on the device.

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
- Screen Time Controls recording showing Settings > Screen Time Controls, Screen Time permission, app/category selection, and blocking rules.
- Focus recording showing the optional Screen Time Controls setup offer from the Focus path, if available.
- To-do list recording showing priority, sorting/filtering, and tag grouping.
- Activity Areas recording showing Settings > Activity Areas.
- Subscription recording showing Settings > Subscriptions > plan picker > Terms/EULA link > Privacy Policy link, plus Restore purchases availability.
- Account deletion recording showing Settings > Account settings > Delete account, subscription warning, and final confirmation.
