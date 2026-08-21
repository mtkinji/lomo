# UI Contract: Money Capability First Entry

## Job

When Maya opens Money for the first time, she needs to understand the minimum foundation Kwilt will
create and either begin it or inspect the place she chose, so she can proceed without losing trust
or orientation.

## Authority chain

1. Andrew's accepted Money first-entry decisions on 2026-08-20.
2. `brief-money-capability-first-entry` and its convergence/learning-release artifacts.
3. Kwilt UI Constitution, semantic tokens, and Canonical `Button`, `FullWidthActionDock`,
   `Typography`, `KwiltLoader`, and `FullScreenInterstitial` behavior.
4. The accepted capability-onboarding Parchment canvas and `FirstTimeUxFlow` hierarchy.
5. React Native Reusables as anatomy/accessibility reference; no new dependency or copied styling.

## Three-second read

- Shared entry: Money can build a useful monthly view from real account evidence.
- Budgets empty: connect accounts to build the budget.
- Accounts empty: no accounts are connected; connect one.
- Transactions empty: transactions require a connected and synced account.

## Primary action

One action for the current moment: `Set up Money`, `Connect accounts`, `Calculate with these
accounts`, `Use this plan`, or the empty state's connection action.

## Primary information

- The current setup moment.
- Why account evidence is needed.
- The authoritative plan result when one exists.
- The exact empty-state prerequisite when setup is deferred.

## Secondary information

- Quiet close action that records the same `Not now` outcome.
- Progress position within active setup.
- Recovery or retry copy.
- `Finish Money setup` when partial real data exists.

## Reveal later

Category correction, forecast confidence, app controls, Screen Time, account health, plan history,
and advanced settings remain in their native Money moments.

## Scan order

Shared entry: Kwilt mark/quiet exit -> illustration -> headline -> consequence -> primary action.

Setup: Kwilt mark/quiet close and text counter -> headline in the reserved two-line title region ->
supporting illustration in the fixed optical anchor -> one vertically centered decision or status
region -> primary action in the canonical bottom dock. The Money application shell does not appear
until setup is dismissed or complete.

Empty state: title -> one-sentence truth -> primary action.

## Must not add

- A Money onboarding hub or capability checklist.
- Multiple dominant buttons.
- Sample financial values outside the explicitly development-only rehearsal.
- App-control-specific illustration or language as general Money identity.
- Category-by-category review before first value.
- Success modal after the authoritative result.
- Repeated full-introduction prompts after `Not now`.
- Money application headers, page cards, or destination chrome inside the setup sequence.
- Raw Pressable recreations of canonical Button behavior.
- A progress track, pre-evidence target choice, manual build action, or duplicate Money welcome.
- Floating financial meters, ornamental dashboards, or illustration objects with ambiguous
  physical relationships.

## Reuse map

- Full-screen first-use canvas -> `FullScreenInterstitial` with Parchment.
- Sequential setup frame -> Canonical `CapabilityOnboardingStepScreen`; Money does not own or
  override its chrome, title, illustration, decision, safe-area, or action-dock geometry.
- Actions -> Canonical `Button` and `ButtonLabel`.
- Persistent page action placement -> Canonical `FullWidthActionDock`; feature screens do not own
  numeric side, safe-area, or scroll-clearance padding.
- Orientation -> a quiet text-only `2 of 4`, `3 of 4`, or `4 of 4` counter; no progress track.
- Planning intent -> one accepted continuity/reduction/delegation question; internal calculation
  models and percentages do not become user-facing choices.
- Loading -> Canonical `KwiltLoader`, full resolved mark, and one large phase-driven statement on an
  otherwise empty Parchment surface.
- Empty destination -> `EmptyState` Candidate within Money scope, using no illustration by default.
- Native destination shell -> `MoneyScreenFrame`.
- Account connection and plan work -> existing Money capability operations.

## Step and illustration contract

- Connect -> phone-in-hand account scene. Preparing, Plaid presented, finishing exchange,
  cancellation, and connection error intentionally retain this illustration.
- Coverage -> no illustration. The exact accounts included from one institution replace decoration
  as the visual evidence, followed by the required `Is anything important missing?` decision. Complete, intentionally partial, and add-
  another-institution are distinct outcomes; partial coverage scopes all later claims to the accounts
  shown rather than pretending to represent the household.
- Analyze -> no illustration or chrome; the mark resolves between spin cycles and copy follows real work.
- Assessment and intent decision -> no illustration; evidence coverage and the observed income,
  regular-commitment, and flexible-spending pattern carry the first proof moment. The required question
  is `Should this plan reflect how you spend now—or help you spend less?`, with three rectangular
  choices: `Start from how we spend now`, `Spend less each month`, and `Recommend a starting point`.
  Each choice carries its accepted one-sentence consequence from the feature brief. Do not use pills,
  budgeting-method names, percentages, or a purpose for the remainder as the decision labels.
- Target consequence -> no illustration. Ask `What share of dependable income should the monthly
  plan use?` and present one synchronized percentage-and-dollar control. Show recent-spending delta
  and money outside the plan underneath. Complete-enough evidence may carry a recommendation marker;
  partial evidence carries only a neutral starting point and the phrase `in these accounts`.
  Category allocations remain provisional and do not appear as evidence on this screen.

All used illustrations share one character, one table, one setting, true alpha transparency, and one
232pt optical slot. Device backs never contain screens or UI. No plants or gauges emerge from
meters, and furniture does not multiply or intersect ambiguously.

## Plaid excursion contract

Step 3 prepares the Plaid link token and native Link session before the primary button is pressed.
The tap presents Plaid. App-to-app OAuth may temporarily leave Kwilt, but return does not advance
the counter: Step 3 becomes `Finishing your connection`, removes its action, and exchanges the
public token. Only durable exchange evidence advances automatically to Analyze. Cancellation and
errors remain recoverable on Step 3. Existing durable accounts bypass the connection action and
advance automatically. A later plan-build failure retries plan construction only and never asks
the user to repeat Plaid.

## Nearest precedent

`CapabilityValueDoorScreen` provides the image-led promise. The accepted prior Budget onboarding
provides the illustration-led sequential hierarchy. Every Money
setup moment remains on the Parchment interstitial; it keeps only a quiet text counter, real setup
decisions, and recovery. Native Money pages begin only after `Not now` or successful completion.

## External exemplar ledger

N/A. No task-scoped external product reference is selected.

## Behavior sources

- Four shared entry sources -> accepted feature brief.
- Budgets/Accounts visible and pristine Transactions hidden -> Andrew's 2026-08-20 decision.
- `Not now` destination empty states -> Andrew's 2026-08-20 decision and learning release.
- Financial operations and completion truth -> existing Money setup and living-plan contracts.
- Destination preservation -> accepted convergence.

## Required states

Decision loading, fresh introduction, resume offer, coverage-completeness selection, planning-intent selection, linked target adjustment, connection preparing/ready/
presented/exchanging/cancelled/error/success, plan build loading/blocked/success, `Not now`, Budgets empty, Accounts
empty, direct Transactions empty, partial real data, existing usable foundation, and enlarged text.

## Proof path

Development controls reset Money first-entry state, then open universal onboarding, Budgets,
Accounts, and direct Transactions on iPhone 17 Pro, iOS 26.5 Simulator. Verify default text,
enlarged text, Reduce Motion, interruption/relaunch, Back behavior, and the menu before/after durable
evidence. Signed-device Plaid and tactile output remain separate.
