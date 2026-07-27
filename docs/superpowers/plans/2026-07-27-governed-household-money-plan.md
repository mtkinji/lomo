# Governed Household Money Plan Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. This work must remain uncommitted in the existing isolated worktree.

**Goal:** Complete the local governed Money vertical so connected evidence can create a stable starter plan, protected and flexible contributions reconcile deterministically, reserve categories accumulate honestly, and every user mutation uses the authoritative snapshot and write adapters.

**Architecture:** Add pure, versioned policy modules for starter categories, assignment precedence, allocation, reserve funding, promotion, and consequences. Extend the existing Supabase-shaped repository additively, preserving compatibility when new fields are absent, and keep reconciliation as the only plan promotion path. Project new funding facts into the existing Money snapshot, then expose the smallest settings controls in the existing category drawer and Money plan screen.

**Tech Stack:** React Native, TypeScript, Jest, Supabase SQL/RPC contracts, existing Money repository/snapshot/settings primitives.

---

## UI contract

Job: When a category represents lumpy household spending, Maya needs to choose a stable reserve contribution and optional expected need, so she can see whether accumulated availability will cover it without distorting the monthly living target.

Primary action: Save category plan changes once, with the whole-plan consequence visible when the monthly contribution changes.

Must show: funding rhythm, monthly contribution, accumulated availability for reserves, optional amount/due month, and coverage or catch-up consequence.

Reveal later: deterministic evidence behind a reserve suggestion, receipt history, and affected-category rows.

Must not add: a planner dashboard, recommendation inbox, peak-month pacing, fabricated opening balance, automatic-promotion toggle, separate automated mutation path, or a second category taxonomy.

Reuse map: category configuration -> existing `BottomDrawer`; plan settings/history -> existing `SettingsPage`/`SettingsGroup`/`SettingsRow`; amount consequence -> existing `previewLivingPlanOverride`; persistence -> `MoneyRepository` and living-plan repositories; active truth -> `MoneySnapshot`.

Behavior sources: funding rhythm and reserve equation -> lumpy-spending amendment; whole-plan allocation and Save -> governed-plan brief; prediction refusal -> prediction trust/model strategy; precedence -> transaction-rule and credits/income briefs.

Unresolved decisions: numeric inference thresholds are fixed for this learning release as a versioned conservative policy: 12 completed months, at least two concentrated same-month events, and no automatic rhythm mutation. Replay/dogfood may revise the policy version later.

Required states: monthly, reserve without history, reserve accumulating, expected need covered, expected need shortfall with catch-up, low-confidence suggestion only, stale snapshot, save failure, and compatibility read of legacy rows.

Proof path: local Jest/type/product gates; simulator, authenticated persistence, signed device, TestFlight, and repeated-period proof remain separate until actually run.

---

### Task 1: Amend the durable contract

**Files:**
- Modify: `docs/feature-briefs/governed-household-money-plan.md`
- Modify: `docs/design-explorations/governed-household-money-plan/04-iteration-3-converged-system.md`
- Modify: `docs/design-explorations/governed-household-money-plan/05-simplification-audit.md`
- Modify: `docs/feature-briefs/category-rollovers.md`

- [x] Add `monthly | reserve`, contribution reconciliation, reserve availability, expected need, catch-up, inference/refusal, and forecast contracts.
- [x] Clarify that ordinary rollover remains an optional monthly-category policy and is not the reserve model.
- [x] Run `npm run product:lint` and retain any pre-existing warnings verbatim.

### Task 2: Build funding-rhythm and reserve math test-first

**Files:**
- Create: `src/capabilities/money/domain/categoryFunding.ts`
- Create: `src/capabilities/money/domain/categoryFunding.test.ts`

- [x] Write failing tests proving `available = prior reserve + contribution - counted spend`, monthly reset, expected-need coverage, exact catch-up contribution, no fabricated balance, and deterministic 12-month concentration evidence.
- [x] Run `npm test -- --runInBand src/capabilities/money/domain/categoryFunding.test.ts` and confirm failures are caused by missing behavior.
- [x] Implement the minimal versioned pure policy and rerun the focused suite to green.

Representative contract:

```ts
projectCategoryFunding({
  rhythm: 'reserve',
  monthlyContributionCents: 10_000,
  priorReserveCents: 30_000,
  countedSpendCents: 5_000,
  expectedNeed: { amountCents: 80_000, dueMonth: '2026-12' },
  periodId: '2026-08',
});
// availableCents: 35_000; forecast compares accumulated availability with 80_000.
```

### Task 3: Replace sequential allocation with governed contribution allocation test-first

**Files:**
- Modify: `src/capabilities/money/domain/living-plan.ts`
- Modify: `src/capabilities/money/domain/livingPlan.test.ts`
- Modify: `src/capabilities/money/domain/living-plan-evidence.ts`
- Create: `src/capabilities/money/domain/livingPlanEvidence.test.ts`

- [x] Write failing fixtures for order independence, full target allocation, starter/evidence weight blending, protected fixed/override amounts, reserve contributions counting toward the target, and over-target preservation.
- [x] Run the focused suites and verify the expected red failures.
- [x] Add blended weights and deterministic largest-remainder rounding so normalized contributions exactly reconcile to the target.
- [x] Keep accumulated reserve balances out of `plannedCents` and target reconciliation.
- [x] Rerun focused suites to green.

### Task 4: Add starter-category and assignment policy test-first

**Files:**
- Create: `src/capabilities/money/domain/governedCategoryPolicy.ts`
- Create: `src/capabilities/money/domain/governedCategoryPolicy.test.ts`
- Create: `supabase/migrations/20260727140041_governed_household_money_plan.sql`

- [x] Write failing tests for the versioned broad template, Gifts and occasions reserve default, Phone-to-Utilities mapping, high-confidence provider mapping, conservative Other/needs-review fallback, and user/rule/correction precedence.
- [x] Run the focused suite and verify red.
- [x] Implement the pure mapping policy.
- [x] Add an idempotent owner-scoped RPC that creates only the missing starter foundation and assigns only ungoverned transactions; never rewrite existing categories, rules, splits, exclusions, corrections, plans, or overrides.
- [x] Existing categories must never short-circuit assignment: resolve supported provider evidence into the user's existing governed category aliases/tags where possible and leave unmatched evidence for review.
- [x] Add additive category/plan funding fields and expected-need fields with monthly compatibility defaults.
- [x] Rerun focused tests to green.

### Task 5: Persist and project governed funding through the authoritative adapters

**Files:**
- Modify: `src/capabilities/money/data/moneyRepository.ts`
- Modify: `src/capabilities/money/data/moneyRepository.test.ts`
- Modify: `src/capabilities/money/data/moneySnapshot.ts`
- Modify: `src/capabilities/money/data/moneySnapshot.test.ts`
- Modify: `src/capabilities/money/data/MoneyDataContext.tsx`

- [x] Write failing repository/snapshot tests for compatibility reads, funding writes, expected need, reserve carry, and starter-foundation RPC orchestration.
- [x] Verify red with the two focused data suites.
- [x] Extend `updateCategoryPlan` rather than creating another write adapter.
- [x] Project contribution, accumulated availability, expected need, and coverage into `MoneyCategory`; legacy rows remain monthly with zero prior reserve.
- [x] Invoke governed-foundation reconciliation after explicit account connect/sync/build events, then reload the authoritative snapshot.
- [x] Rerun focused data suites to green.

### Task 6: Govern promotion, planning basis, and consequences test-first

**Files:**
- Create: `src/capabilities/money/domain/living-plan-promotion.ts`
- Create: `src/capabilities/money/domain/livingPlanPromotion.test.ts`
- Modify: `src/capabilities/money/runtime/livingPlanReconciliation.ts`
- Modify: `src/capabilities/money/data/livingPlanRepository.ts`
- Create: `src/capabilities/money/data/livingPlanRepository.test.ts`

- [x] Write failing tests proving initial and explicit saves promote now, ordinary automatic changes are held until the next period, user-set planning basis wins, stale evidence holds prior truth, and consequences name every changed category.
- [x] Verify red with focused suites.
- [x] Add additive user planning-basis persistence and held-candidate persistence; keep the promotion kill switch internal.
- [x] Route reserve contribution changes through the same override preview/promotion/receipt path as native amount edits.
- [x] Commit the category-plan input, override, promoted plan version, and receipt in one database transaction so a failed Save leaves no partial preference behind.
- [x] Persist truthful allocation provenance: starter-only, household-evidence, blended, fixed, and user-set allocations must not masquerade as one another.
- [x] Consume held automatic maintenance at the monthly boundary from the ordinary Money lifecycle; repeated same-period entry must be idempotent.
- [x] Rerun focused suites to green.

### Task 7: Make reserve forecasts refusal-safe test-first

**Files:**
- Modify: `src/capabilities/money/domain/moneyForecast.ts`
- Modify: `src/capabilities/money/domain/moneyForecast.test.ts`
- Modify: `src/capabilities/money/domain/moneyPeriodView.ts`
- Modify: `src/capabilities/money/domain/moneyPeriodView.test.ts`

- [x] Write failing tests showing reserve coverage uses accumulated availability, not straight-line pacing; low-history lumpy evidence returns exposure/suggestion only; monthly forecast behavior remains unchanged.
- [x] Verify red.
- [x] Add reserve forecast mode/facts and project them through current and selected-month views.
- [x] Rerun focused suites to green.

### Task 8: Add the smallest governed settings surface

**Files:**
- Modify: `src/capabilities/money/screens/MoneyCategoryDetailScreen.tsx`
- Modify: `src/capabilities/money/screens/MoneyLivingPlanScreen.tsx`
- Modify: `src/capabilities/money/screens/MoneyAccountsScreen.tsx`
- Modify: `src/capabilities/money/screens/MoneyTransactionsScreen.tsx`
- Modify: `src/capabilities/money/screens/MoneySetupScreen.tsx`

- [x] Add one funding-rhythm choice and optional expected-need fields to the existing category settings drawer.
- [x] Show reserve availability/coverage in existing category facts; do not add a new top-level destination.
- [x] Retitle the plan settings surface around Money plan, add governed planning basis, and remove the user-facing automatic-promotion toggle while retaining the internal kill switch.
- [x] Reconcile the governed foundation after successful explicit account sync/connect paths.
- [x] Apply the Kwilt copy hierarchy: truth, next action, warmth; avoid finance jargon and false certainty.
- [x] Run the reduction pass against the UI contract and document any simulator blocker.

### Task 9: Complete local verification without integration

**Files:**
- Modify as required by verification only; do not commit.

- [x] Run every new focused suite.
- [x] Run `npm run verify:changed -- --run` and read the complete output.
- [x] Because shared Money domain/data contracts changed, run `npm test -- --runInBand`.
- [x] Run `git diff --check`, `git status --short`, and confirm the branch/path contract.
- [x] Report automated proof separately from simulator, authenticated persistence, signed-device, TestFlight, and repeated-use proof.

## Verification boundary

Local app/test typechecks, focused Money suites, the full Jest suite, product lint, code-health ratchets, Chat contracts, and architecture lint pass. The governed-plan migration and its two permanent-account policy hardening migrations were applied to the linked Kwilt Supabase project, then verified through migration history, schema/function inspection, RLS policy inspection, function privileges, and post-migration security advisors. Local SQL execution remains environment-blocked because no Docker-compatible runtime or local Postgres server is installed. Authenticated app persistence, simulator, signed-device, TestFlight, and repeated-period behavior remain separate proof levels.
