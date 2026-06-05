# App Review Reply - Version 1.0.72 Build 73

Submission ID: `a6ab4d24-38d3-48f4-b5f2-8d53f8bffcbf`

## Paste-Ready Reply

Hello,

Thank you for the additional review notes. We have uploaded version 1.0.72 build 73 with the Location Services flow revised.

In this build:

1. First-time setup and returning-user setup no longer request Location Services.
2. Users can complete onboarding and use Kwilt without enabling Location Services.
3. The setup screen only offers optional notification reminders. Tapping Continue shows the iOS notifications prompt; tapping Skip for now continues without enabling notifications.
4. Location-based nudges remain optional and are requested only after the user explicitly chooses a location-based feature for an existing to-do/place flow.
5. If Location Services are unavailable, disabled, or denied, the to-do remains usable as a regular to-do.
6. Settings includes Legal & privacy, with direct links to the Privacy Policy, Terms of Use (EULA), support contact, Apple subscription management, and Account settings for account deletion.
7. Subscription purchase surfaces include functional Terms of Use (EULA) and Privacy Policy links before purchase.
8. Pro subscription access is refreshed automatically after sign-in/reinstall/device change by identifying the signed-in Kwilt account with RevenueCat and refreshing customer info. Manual Restore Purchases remains available from Settings > Subscriptions, but the app does not automatically call Restore Purchases on launch or sign-in.

We have also hidden unfinished Phone Agent/SMS surfaces while that feature remains unavailable. The submitted app does not expose Phone Agent in Settings, and the live Terms/Privacy pages describe only currently available data surfaces.

We will attach screen recordings showing fresh-install onboarding without a Location Services request, the optional notification prompt, the optional location-trigger path where the user can keep a regular to-do, subscription legal links, account deletion, and the Legal & privacy settings surface.

Canonical legal URLs:

- Terms of Use (EULA): https://go.kwilt.app/terms
- Privacy Policy: https://go.kwilt.app/privacy

Thank you.

## Reviewer Notes Field

Reviewers can create a fresh account using the normal sign-in flow. No pre-seeded demo account is required; onboarding creates the initial Arc/Goal experience needed to review the core app.

Useful review paths:

1. Fresh install onboarding: Open Kwilt, proceed through setup, and reach the app without enabling Location Services.
2. Notifications: On the setup screen, tap Continue to see the iOS notifications prompt, or tap Skip for now to continue without enabling notifications.
3. Optional location trigger: Create a to-do with a place-style prompt. If Kwilt recommends a location trigger, choose `Keep regular to-do` to confirm the to-do remains usable without Location Services. Choose `Use location triggers` only if you want to test the optional permission path.
4. Subscriptions: Settings > Subscriptions > Upgrade to Kwilt Pro. The plan picker includes price, billing period, Terms of Use (EULA), and Privacy Policy links before purchase. Restore purchases is also available from Settings > Subscriptions.
5. Legal and privacy: Settings > Legal & privacy includes Privacy Policy, Terms/EULA, support contact, Apple subscription management, and Account deletion guidance.
6. Account deletion: Sign in, then open Settings > Account settings > Delete account. Deletion happens in-app and does not require contacting support. The app explains that deleting a Kwilt account does not cancel Apple-managed subscriptions.
7. Apple Health: Settings > Weekly Chapters > Use Apple Health summaries. Kwilt requests read-only Apple Health summaries for movement, workouts, sleep, and mindfulness.
8. Calendar: Settings > Calendars connects Google or Outlook calendars for planning context and to-dos the user chooses to schedule.

Phone Agent/SMS is intentionally hidden from the submitted build while the feature remains unavailable.
