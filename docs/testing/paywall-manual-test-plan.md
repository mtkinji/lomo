# Kwilt paywall manual test plan

Use this plan with a confirmed email/password account that has never held a
RevenueCat purchase and has no internal Kwilt Pro grant. Complete the Free
checks before making a successful purchase, because a purchase changes the
account under test.

## Record the proof context

- Date and tester:
- App version and build number:
- Source branch and commit, if this is a development build:
- Install source: Simulator development build, physical development build, or
  TestFlight:
- Device and iOS version:
- Apple sandbox/TestFlight account:
- Supabase account alias or user ID (never record the password):
- RevenueCat environment: StoreKit local, Sandbox, or Production:

Simulator presentation, signed-device StoreKit behavior, TestFlight behavior,
and production subscription state are separate proof layers. Record only the
layer actually tested.

## Clean Free baseline

1. Delete and reinstall Kwilt, or otherwise clear the app's local data. This
   prevents a cached entitlement, development override, or install-scoped grant
   from making the new account appear Pro.
2. Open Kwilt and choose **Sign in with email**.
3. Sign in with the dedicated Free paywall account.
4. Open **Settings > Subscriptions**.
5. Confirm the page says **Free**, shows 50 monthly AI credits, and does not
   briefly flash Pro after loading.
6. Force-quit, reopen, and return to **Settings > Subscriptions**. Confirm the
   account is still Free.

Fail the baseline if the account appears Pro, the tier is stale/ambiguous, the
email form is missing, sign-in fails, or a prior user's data is visible.

## Paywall quality checklist

Apply these checks every time a contextual paywall opens:

- It opens only after an intentional Pro action, not on page entry or while the
  person is still learning what the capability does.
- The title and explanation name the value requested on the previous screen.
- **View Pro plans**, **Not now**, close, swipe-to-dismiss, Privacy, and Terms are
  visible and tappable without clipping.
- **Not now** and close return to the exact originating context without losing
  a valid draft or changing data.
- **View Pro plans** closes the contextual paywall, opens **Subscriptions**, and opens
  the plan chooser without a dead backdrop, double drawer, or navigation jump.
- Back from **Subscriptions** before purchase lands in Settings rather than an
  unrelated tab.
- No purchase, provider connection, native picker, or policy delivery starts
  before explicit confirmation.
- VoiceOver focus and labels make the close, upgrade, plan, cadence, legal, and
  restore controls understandable.

## Contextual paywalls

### 1. Money and Budgets

1. Open the global capability menu and choose **Money**.
2. Read the introductory explanation. Confirm no paywall opens merely from
   entering Money.
3. Continue until the first action that would connect a financial account.
4. Tap that action.

Expected:

- The paywall title is **Check your plan before you spend**.
- The proof says real transactions keep the plan current, selected apps wait
  for a budget check, and the person decides whether to continue.
- It appears before Plaid Link is prepared or presented.
- Dismissing it returns to Money setup with the intended next step intact.
- No account, connection, budget, or transaction is created.

### 2. Advanced personal Screen Time

1. Open **Screen Time** and start a personal rule.
2. Create and save an unscheduled, single-condition local rule using Focus or
   daily usage allowance.
3. Separately try to add a time-of-day or recurring schedule.
4. Separately add a second condition or explicit AND/OR composition.
5. Separately add a Kwilt-native condition such as a real step, Money review,
   earned access, prerequisite-app state, or family-day state.

Expected:

- The unscheduled, single-condition rule never opens a paywall.
- Scheduling, composition, and Kwilt-native actions each open an
  outcome-specific Pro invitation before the paid behavior is committed.
- Dismissal preserves the valid simple rule and does not change native
  enforcement.

Simulator can prove the screen and draft behavior. Only an entitlement-enabled
physical iPhone can prove Family Controls authorization and enforcement.

### 3. Family Screen Time

Preparation: have a child device in the Apple Family Sharing group. Create a
Kwilt household and dependent only for the later managed-Household portion.

1. On the configured child device, complete Apple guardian authorization,
   private app/category selection, and one useful unscheduled,
   single-condition local rule.
2. Confirm authorization, selection, local enforcement, explanation, editing,
   recovery, release, and cleanup do not require Pro.
3. From the caregiver experience, choose to bind the authorized device to the
   named dependent or manage the agreement remotely through Kwilt Household.
4. Separately try a remote change, caregiver grant, child request, or
   cross-device delivery action.

Expected:

- The in-person simple family starter produces a useful enforced outcome
  without a paywall.
- The managed-Household action opens an outcome-specific Pro invitation before
  named-dependent binding, remote mutation, request routing, or policy delivery.
- Dismissal leaves the local rule intact and does not create a managed device or
  Household agreement.

### 4. External AI tools

1. Open **Settings > Apps & connections**.
2. Choose an external destination with no existing connection, such as
   ChatGPT, Claude, Cursor, or Codex.

Expected:

- The paywall title is **Bring Kwilt into the AI tools you use**.
- No authorization code, token, or connection is created before purchase.
- Dismissal returns to the destination list.

### 5. AI file analysis

1. Create a To-do and add a small supported attachment. Adding the attachment
   itself must remain Free.
2. Invoke the action that asks Kwilt to analyze or work from that file.

Expected:

- The paywall title is **Turn this file into a useful next step**.
- The attachment remains attached and readable after dismissal.
- No cloud analysis starts and no AI credit is consumed before purchase.

### 6. AI credit exhaustion and advanced AI

Do not burn through 50 production credits solely to reach this state. Use a
development-only controlled quota state or a purpose-built exhausted account.

Expected for exhausted Free credits:

- The paywall says the person is out of AI credits and reports the real monthly
  limit and usage.
- Failed, cancelled, local, or provider-fallback work did not consume credits.
- The upgrade path opens the same plan chooser as other paywalls.

Advanced cloud planning, AI scheduling, and background AI should be tested only
where the current build exposes an intentional customer action for them. Do not
count a developer-only button as a shipped entry point.

## Things that must stay Free

These are regression tests, not optional polish. None should show a paywall or
silently block the action:

- Create more than one Arc.
- Create more than three active Goals in one Arc.
- Create To-dos and reminders.
- Create and use saved views; filter and sort To-dos.
- Add an attachment without asking AI to analyze it.
- Choose or search for banners.
- Start each available Focus duration.
- Export an activity to Calendar.
- Use existing streak protection/recovery behavior.
- Create, read, edit, disable, delete, loosen, release, and clean up unscheduled,
  single-condition local Screen Time rules using Focus or daily usage.
- Complete and manage an in-person simple family starter on the configured
  child device without binding it to Kwilt Household.
- Create and manage a household and participate in sharing/accountability.
- Use Recipes, Meal Plans, Groceries, Chores, Games, and Explore.
- Use Cook Mode and Live Conversation when their exposure flags are on.
- Use eligible on-device AI without consuming a cloud credit.

For every failure, record whether the paywall appeared or the action simply did
nothing. A retired paywall request can be hidden centrally while an older
screen still returns early, so a silent block is a real monetization bug.

## Plan chooser and StoreKit

Open **Settings > Subscriptions > View plans and pricing** directly and also reach
it through at least one contextual paywall.

- A Free account sees **Free plan** and one benefit-led **View Pro plans**
  invitation on Settings; More also exposes **View Kwilt Pro plans**.
- Settings and More both open the plan chooser directly, without pretending a
  feature paywall was shown first.
- The permanent invitation names a current budget, Screen Time conditions
  connected to Kwilt, managed family agreements only when proven, and added AI
  capacity without selling condition count or Apple enforcement.

- The current tier is Free and the credit count is correct.
- Monthly and Annual can both be selected.
- Individual and Family can both be selected.
- All four choices show live localized StoreKit prices; no invented fallback
  price or cadence appears.
- Family says Family Sharing and does not imply that it creates or controls a
  Kwilt household.
- Trial wording appears only when StoreKit reports introductory eligibility and
  uses StoreKit's real duration. Eligibility belongs to the Apple subscription
  group, not the Supabase account.
- The contextual offer uses `Try Pro free` only for verified one-month
  eligibility and `Upgrade to Pro` for ineligible, unknown, unavailable, or
  misconfigured states. It never purchases directly.
- The Money offer retains the canonical Pine drawer, radiused tall photograph,
  focal-point-safe full-width proof notification, concise outcome block, and
  one large white bottom CTA. There is no feature list, `Not now`, legal copy,
  white footer, pricing grid, or second dominant action.
- Verify the canonical drawer on the smallest supported iPhone viewport, at a
  large accessibility text size, and with VoiceOver traversal. The CTA remains
  reachable, the drawer dismissible, and the proof notification is announced
  as one coherent status.
- Annual savings appears only when the matching monthly and annual prices are
  finite, positive, and in the same currency. The selected plan's full amount
  billed remains more prominent than savings or equivalent monthly math.
- Privacy, Terms, and **Restore purchases** work.
- Cancelling Apple's purchase sheet leaves the account Free, preserves the
  originating intent, emits no purchase-failed/succeeded/trial event, and shows
  no failure or success message.
- A network/configuration failure is understandable and leaves the account
  Free.

Run the full Free checklist before a successful purchase. Then, in a StoreKit
local or Apple Sandbox environment:

1. Purchase one plan.
2. Confirm the app changes to Pro only after StoreKit/RevenueCat reports the
   `pro` entitlement.
3. From a contextual Money purchase or successful Restore, confirm Kwilt
   returns to the preserved Money setup step, explains that Pro is ready, and
   does not open Plaid until **Connect account** is tapped again.
4. From a contextual personal Screen Time purchase or successful Restore,
   confirm Kwilt returns to the preserved rule draft. If the interrupted action
   was adding or choosing a condition, the condition chooser reopens; no native
   enforcement starts automatically.
5. From a direct Settings or More purchase, confirm Kwilt does not jump into an
   unrelated Money or Screen Time flow.
6. Reopen every contextual entry point and confirm it performs the requested
   Pro action instead of showing a paywall.
7. Force-quit and relaunch; confirm Pro persists.
8. Sign out and back in; confirm the same Kwilt user recovers the entitlement.
9. Test **Restore purchases** on a clean install.

Do not use the reusable Free account for a successful production or Sandbox
purchase unless you are prepared to reset that RevenueCat/StoreKit customer.

## Downgrade pass

Use a separate subscription test customer or a resettable StoreKit local
configuration.

- Expire or revoke Pro through the authoritative test environment.
- Confirm Money history remains readable while new connection, sync, review,
  and budget mutations are unavailable; disconnect and subscription management
  remain available.
- Confirm scheduled, composed, Kwilt-native, and managed-Household Screen Time
  definitions remain readable, are not silently active, and can be disabled,
  loosened, released, or deleted. Confirm unscheduled single-condition Free
  rules continue normally.
- Confirm external connections can be revoked and cleaned up.
- Confirm ordinary Free data remains present and editable.
- Repurchase and confirm dormant Screen Time rules do not silently reactivate.

## Bug evidence template

For each failure, capture:

- build/version and proof layer;
- account tier shown in **Settings > Subscriptions**;
- exact path and last intentional tap;
- expected versus actual result;
- screenshot or short recording;
- whether a draft/data change survived dismissal;
- whether StoreKit, Plaid, Screen Time, or an external authorization surface
  started too early;
- whether force-quit/relaunch reproduces it.
