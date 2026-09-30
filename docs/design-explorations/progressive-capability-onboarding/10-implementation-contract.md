# Approved capability paths: implementation contract

Owner approved implementation after the invitation study and commercial audit.

Job: choose a starting need, then take a real useful action without unrelated
setup or purchase gates.
Authority chain: owner approval → native/accessibility requirements → Kwilt
constitution, tokens and owned controls → accepted white invitation composition.
Target: Kwilt Expo/React Native package at `/Users/andrewwatanabe/Kwilt`, iOS and
Android. RNR remains the upstream component reference; no new dependency needed.
Three-second read: selected benefit, one immediate next action.
Primary actions: Shape a goal / Choose a recipe / choose a daily limit or Focus.
Primary information: benefit and the selected setup intent.
Secondary information: optional advanced Screen Time controls.
Reveal later: advanced controls and their existing contextual Pro boundary.
Scan order: anchored title → short explanation → choices or bottom action.
Must not add: testimonials, sample personal results, automatic Money detours,
universal paywalls, guest persistence claims, or fake completion receipts.
Reuse map: Button, ChoicePill, Typography, Logo, FullWidthActionDock; existing
FirstTimeUx, RecipeLibrary and Screen Time rule builder own downstream behavior.
Nearest precedent: approved white Money invitation; same anchored copy/dock,
different content and handoff. ChoicePill use extends only within this approved
first-launch capability selection flow, not general settings.
External exemplar: captured Origin first-run, September 2026. Preserve paced
invitations; translate to Kwilt components; reject identical payment positions.
Required states: back/skip, missing unavailable path, reduced motion/screen reader,
large text, repeated taps; native permission and purchase states stay with owners.
Proof path: developer rehearsal → each invitation → native setup destination;
then inspect actual first-launch integration independently.

Gates: grounded source review; UI contract; implementation; reduction pass;
native route operation; rendered critique and fixes. Unit tests are not native proof.

Checkout: `codex/onboarding-shoreline`, base `59e8acff`, dirty shared checkout.
No worktree, commit, publication, pricing change or backend change authorized.
Initial inspection: CapabilityOnboardingHost is mounted by DevToolsScreen only.
Implementing this host is not evidence that normal first launch uses the new path.

## Implementation checkpoint

- Goals/Meals now use anchored white invitations instead of preview quotes and
  hand off to the existing free creation owners.
- Screen Time presents daily limit and Focus choices, preserving the chosen kind
  into the actual permission-owning rule builder. No Money route is involved.
- Advanced progress control is an explicit branch. Budget/family exploration
  currently hands off to existing Screen Time settings; the dedicated
  missing-budget/resume and family onboarding composition are still pending.
- Focused host/navigation tests: 26 passed; routing tests first failed for all
  three suggested kinds, then passed after preserving the handoff intent.
- Scoped local verification ran for five affected source/test files: app/test
  typechecks, architecture and 208 related suites passed (1,445 tests; 2 skipped).
  Final receipt is **stale** because checkout inputs changed during the run;
  this is not a clean local completion gate. An older `--report` receipt is not
  evidence for this run.
- Runtime ownership resolved with Andy's approval to continue after Journal work
  was confirmed idle. The Simulator's capture indicator alone was not evidence
  that another task was still recording.

## First-launch integration and native checkpoint — September 29

- App now mounts FirstRunCapabilityHost for a hydrated, new signed-in account.
  It preserves the current sign-in, returning-user, managed-child and household
  boundaries. Guest onboarding and post-Plaid account creation are not newly
  implemented by this change.
- The four explicit first-run paths do not promote other catalog entries.
  Goals starts only when selected; non-Goals handoffs complete the introduction,
  not the capability's activation receipt. Skip does not create user content.
- First-run eligibility and host handoffs have regression tests. Goals retains
  ownership of completion; Meals opens the actual recipe picker; Focus preserves
  its suggested rule kind without routing through Money or Goals.
- Live iPhone 17 Pro / iOS 26.5 rehearsal verified: Goals invitation to the
  existing goal-creation questionnaire; Meals invitation to Recipes and its
  Add to your meal plan guidance; Screen Time invitation to the actual rule
  builder's app-selection step. Back exited setup without saving a rule.
- No goal, meal or app rule was created for this check; no permissions, purchases,
  account connections or invitations were submitted. Fresh-install activation,
  physical-device enforcement and large-text acceptance are not proved here.
- Source runtime: `/Users/andrewwatanabe/Kwilt`, `codex/onboarding-shoreline`,
  base `59e8acff`, dirty shared checkout. Existing native development build
  1.0.128; current JavaScript from Metro on 127.0.0.1:8081. No native rebuild.
- Final scoped local gate passed: 11 selected files, 147 other changed files
  excluded; app/test types, code-health and architecture passed; 210 related
  suites passed (1,459 tests passed, 2 skipped). This is local evidence, not
  integration or release approval.
- Still pending: dedicated missing-budget/resume and family introduction, plus
  permission/activation proof on an authorized test device. Existing settings
  continue to own those advanced paths in this slice.

No commit/push, production flag changes, purchases, or native permissions made.

## Budget-condition recovery contract

Job: when a user explicitly chooses budget-based app controls but no eligible
budget is available, explain that dependency without making Money mandatory for
basic Screen Time. Preserve selected apps and unsaved rule state.
Three-second read: budget availability, then a usable alternative.
Reuse: existing condition drawer, BottomDrawerHeader, SettingsGroup and Button;
no new component family or empty decorative card. Current condition editor is
the nearest canonical settings composition; Origin is not a drawer reference.
Required states: loading, eligible budgets, empty, lookup error, retry, dismiss,
daily-limit alternative. Errors must not be presented as an empty account.
Do not activate rules, open Plaid or discard draft conditions automatically.
The explicit Money setup/return route remains a separate integration step.

Family invitation contract: the secondary “Set up for a child” path distinguishes
local setup on the child's iPhone from remote caregiver management. Local setup
passes child authorization to the existing rule builder with a daily-limit
suggestion. Caregiver setup opens Household to select/create the actual household
and child; existing enrollment owns the Pro gate. The invitation discloses Pro
and connected-device requirements for remote management. Neither button grants
authorization or claims successful enforcement. Back returns to personal choices.
Reuse the existing first-run ChoicePill and anchored white composition, not a new
family settings pattern. Required proof: both routes, Back, permission boundary,
household eligibility, purchase cancellation, connected-device delivery.

Current recovery evidence: initial empty/error regression tests failed before
implementation. The scoped builder gate then passed (21 tests plus app/test
types, architecture and code-health). Native recovery rendering remains
unverified: CUA reported the Mac locked and unable to unlock automatically.

Family wiring: host/navigation regression tests passed (29 tests), including both
device routes. The budget fallback regression also caught an incorrect default
Allow outcome: the empty new-rule fallback now explicitly selects Pause access.
Existing composed rules instead offer Choose another condition, preserving their
existing conditions/outcome rather than silently replacing them. All 21 builder
tests pass after that correction. The combined gate ran green checks but became
stale during the correction; a fresh final gate is still required.

Next integration dependency: the global PersonalRuleBuilderDrawer store currently
retains launch parameters only, while unsaved conditions/outcome/targets live in
component state. Money setup replaces its own destination on completion and has
no rule-resume contract. Do not wire a superficial Money navigation that loses
the draft. Add an explicit draft/return contract with cancellation and account
boundaries, then connect the missing-budget action. No automatic Plaid launch.

## Optional Money detour — implementation

- Missing-budget recovery now offers Set up Money and retains the quieter basic
  alternative. This is a user-chosen dependency, not a prerequisite for Screen
  Time or an automatic Plaid connection.
- A memory-only, account-scoped session holds the complete unsaved rule: selected
  native app/category tokens, conditions, outcome, connector, enabled state,
  active condition and original launch parameters. Money navigation carries only
  the session ID. Sign-out/account switches and editor completion/dismissal clear
  the session. App restart does not persist the unfinished rule.
- Money entry opens its existing setup. Closing setup or completing budget
  creation returns to the editor; ordinary Money callers are unchanged. Returning
  recreates the editor from the draft and reloads budgets. Permission is checked
  again at the existing save boundary; return never saves/activates a rule.
- Loading/error canvas uses MoneyScreenFrame's existing back action for the
  optional return, rather than adding a second loading overlay.
- Red/green tests cover ownership, stale IDs, copied state, actual editor
  handoff/restore, and cancellation before Money loads or connects. 42 focused
  tests pass. Native return/visual proof remains blocked by the locked Mac.
- Fresh combined local gate passed for the selected onboarding, rule-builder,
  Money-entry and App integration files (114 seconds): app/test typechecks,
  code-health, architecture and related Jest checks. This supersedes the stale
  gate above for this slice, not unrelated checkout changes or native proof.
- Completion review follow-ups: verify resumed edits retain their original
  optimistic-concurrency baseline if a saved rule changes during Money setup;
  explain qualifying “Real step” actions in the actual rule review; inspect the
  family and optional Money-return surfaces after the Mac is unlocked.

### Saved-rule conflict protection

The rule editor now captures its original version when opened and carries that
version through the optional Money session. Saving a stale draft is rejected by
the existing domain boundary, with an explicit close-and-reopen explanation;
it must not overwrite a newer rule. Regression coverage exercises both an open
editor and an editor resumed from Money. All 24 builder tests pass. The scoped
local gate passed in 37 seconds, including 49 related tests, app/test types,
architecture and code-health checks. Native visual proof remains blocked by the
locked Mac. The Real step explanation remains a separate follow-up.

## Current acceptance audit

- Free Goals and Meals: explicit first-run destinations and no automatic offer;
  earlier native rehearsal reached their actual existing creation owners. End-to-end
  new-user activation remains unverified, not replaced by an introduction receipt.
- Independent Screen Time: daily/Focus suggestions retain their intent; regression
  coverage confirms the daily path avoids Money and the advanced purchase gate.
- Advanced controls: existing contextual Pro boundary is preserved. Budget setup
  is optional, with draft ownership, cancellation, restore and conflict tests.
- Family: child-device and caregiver destinations are separate and disclose remote
  requirements. Actual enrollment, purchase cancellation and delivery remain native
  acceptance work, not proven by navigation tests.
- Real-step review: a quiet explanation below conditions now names only the
  configured qualifying actions and Focus threshold. It uses owned Text and bodySm
  tokens, without a new card or control. No selected-goal or permanent-unlock promise.
  Tests cover enabled-action subsets and a non-default Focus threshold.
- Remaining proof: latest family/budget-return rendering, large text, fresh-install
  entry, and permission/activation on an authorized test device. Simulator access
  again reported the Mac locked and automatic unlock unavailable. No user data,
  permission, purchase, account connection or production configuration was changed.

Latest scoped local verification passed in 41 seconds: 51 related tests across
six suites, app/test types, architecture and code-health. It excludes the 160
other changed files and is not an integration or release gate.

The implementation is not accepted as fully complete until the remaining native
proof is collected. The repeated locked-Mac blocker requires Andy to unlock it.
