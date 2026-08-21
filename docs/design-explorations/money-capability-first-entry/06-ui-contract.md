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

One action for the current moment: `Set up Money`, `Connect accounts`, a goal row, `Build my
budgets`, or the empty state's connection action.

## Primary information

- The current setup moment.
- Why account evidence is needed.
- The authoritative plan result when one exists.
- The exact empty-state prerequisite when setup is deferred.

## Secondary information

- Quiet close action that records the same `Not now` outcome.
- Connected-account scope and the quiet `Connect more accounts` action.
- Recovery or retry copy.
- `Finish Money setup` when partial real data exists.

## Reveal later

Category correction, forecast confidence, app controls, Screen Time, account health, plan history,
and advanced settings remain in their native Money moments.

## Scan order

Shared entry: Kwilt mark/quiet exit -> illustration -> headline -> consequence -> primary action.

Setup: Kwilt mark/quiet close -> one evidence statement -> one decision or adjustment region -> the
canonical bottom dock only when the screen has a distinct final action. The goal rows themselves are
the actions and therefore do not repeat a Continue dock. The Money application shell does not appear
until setup is dismissed or complete.

Post-acceptance: full Kwilt mark -> one large truthful work statement -> native Budget canvas with a
compact Budget-ready bottom guide. No title, counter, image, close action, or button appears while
work is in progress. The Goal follow-through is revealed only after the person explores a budget or
returns to Money later.

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
- A progress track, pre-evidence target choice, duplicate Plaid account confirmation, or duplicate Money welcome.
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
- Value priority -> one evidence-led invitation with three full-width, icon-led offers: visibility,
  savings, or a suggested budget. The offers describe concrete value rather than internal
  calculation models, and selection advances without a second confirmation action.
- Loading -> Canonical `KwiltLoader`, full resolved mark, and one large phase-driven statement on an
  otherwise empty Parchment surface.
- Follow-through -> only `Spend less` creates durable cross-capability objects: one unassigned Goal
  and two unscheduled To-dos. The target screen discloses that scope before acceptance, processing
  names each write, and a later `BottomGuide` offers the durable Goal after Budget has delivered value.
- Completion -> native `MoneySummaryScreen` plus the canonical non-blocking `BottomGuide`; no
  illustrated completion screen or extra navigation action.
- Empty destination -> `EmptyState` Candidate within Money scope, using no illustration by default.
- Native destination shell -> `MoneyScreenFrame`.
- Account connection and plan work -> existing Money capability operations.

## Step and illustration contract

- Connect -> phone-in-hand account scene. Preparing, Plaid presented, finishing exchange,
  cancellation, and connection error intentionally retain this illustration.
- Post-Plaid scope -> no duplicate confirmation screen. Analysis begins from the durable connected
  accounts. Until broader coverage is proven, later claims say `in these accounts`. The goal screen
  quietly names the scope and exposes `Connect more accounts`; Free sees the Pro offer only after tapping it.
- Analyze -> no illustration or chrome; the mark resolves between spin cycles and copy follows real work.
- Assessment and value priority -> no illustration. A full-width, borderless neutral receipt says
  `Your recent spending`, shows the observed monthly amount, and qualifies it with the covered period
  and connected-account scope. Follow it directly with `Now that we have a picture of your spending,
  which of these would you like to prioritize?`; do not add a redundant `Here's how Kwilt can help`
  heading. Offer three borderless full-width rows: `See where your money is going`, `Find ways to save
  money`, and `Get a suggested budget`, each with one sentence naming the result. Visibility opens the
  native category breakdown without claiming a plan was created. Savings and suggested budget advance
  to their evidence-backed target paths. Do not show income, budgeting-method names, percentages, or a
  purpose for the remainder on this screen.
- Target consequence -> no illustration. Preserve orientation by making the chosen path the header
  beside a bounded `Change` action; do not label it `Your choice`. Then show one path-specific
  recommendation heading, one dominant dollar amount, a compact committed/flexible composition line,
  the 50–100 percent slider with recent-spending marker, and one
  consequence against the recent pace. Reveal percentage, dependable income, and the amount outside
  the plan only through `How we got this`. Category allocations remain provisional and do not appear.
- Spend Less disclosure -> one quiet sentence before the action states that Kwilt will build the
  budgets and turn the choice into a Goal with two first steps. It adds no second confirmation.
- Budget-ready handoff -> navigate directly to Budget and show `Your budgets are ready` in a
  celebratory canonical bottom guide over the working plan. The guide uses `Your budgets are ready 🎉`
  as its title-first hierarchy,
  one reviewed animated welcome tile that fills the guide's inset content width, relaxed `lg`
  section spacing, canonical heading typography, concise plan copy, and one full-width
  `Explore budgets` action in the guide's fixed safe-area-aware bottom action region. The media is
  decorative and has a quiet static illustration fallback when motion is reduced or remote media is
  unavailable. Do not randomize media for this high-salience first-value moment. The action dismisses
  the guide; it does not navigate again.
- Follow-through handoff -> after the first category exploration and return, or on a later Money
  visit, show `Your Spend Less goal is ready`. Summarize the monthly savings and two unscheduled first
  steps without listing both To-dos. `Review goal` opens the Goal; `Later` dismisses the guide.
- Color -> keep choice rows, chevrons, consequence copy, and secondary actions neutral. The Kwilt mark
  is the only green brand moment on these decision screens.

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
