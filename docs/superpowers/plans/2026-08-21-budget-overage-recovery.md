# Budget Overage Recovery Implementation Plan

> **For agentic workers:** Execute inline in the current checkout. Do not create a worktree or commit unless Andrew separately requests it.

**Goal:** Let a user review what drives a fixed-plan overage and declare that all or part of a real expense was covered by saved money without hiding the expense.

**Architecture:** Add one exact transaction coverage annotation, feed its month-plan portion into the existing reconciliation, and reuse Transactions plus Transaction Detail for review and correction. Keep actual category spending untouched, and keep backend deployment separate from local migration authoring.

**Tech Stack:** React Native, TypeScript, Jest, Supabase Postgres migrations, existing Kwilt Money repositories and UI primitives.

---

### Task 1: Lock product and UI contracts

**Files:**
- Create: `docs/feature-briefs/budget-overage-recovery.md`
- Modify: `src/capabilities/money/FEATURE.md`

- [x] Record category, coverage, and money meaning as separate facts.
- [x] Record the reductive UI contract and proof boundaries.
- [x] Run `npm run product:lint`.

### Task 2: Add exact coverage truth

**Files:**
- Modify: `src/capabilities/money/data/moneySnapshot.ts`
- Modify: `src/capabilities/money/domain/moneyEconomicRole.ts`
- Test: `src/capabilities/money/domain/moneyEconomicRole.test.ts`

- [x] Write a failing test for full and split saved-money coverage.
- [x] Verify the test fails because coverage is not modeled.
- [x] Add exact saved-money cents and subtract only that portion from plan contribution.
- [x] Verify the focused domain suite passes.

### Task 3: Persist and patch coverage

**Files:**
- Create: `supabase/migrations/*_add_budget_transaction_plan_coverage.sql`
- Modify: `src/capabilities/money/data/moneyRepository.ts`
- Modify: `src/capabilities/money/data/MoneyDataContext.tsx`
- Modify: `src/capabilities/money/data/moneyConfirmedPatches.ts`
- Test: focused repository, context, patch, and migration contract suites.

- [x] Add failing validation and repository tests for posted outflows and exact cents.
- [x] Create the migration with the Supabase CLI and author an owner-scoped, column-granted contract.
- [x] Implement confirmed writes and authoritative snapshot reconstruction.
- [x] Verify focused persistence suites pass without deploying the migration.

### Task 4: Project and present overage contributions

**Files:**
- Create: `src/capabilities/money/domain/budgetOverageReview.ts`
- Test: `src/capabilities/money/domain/budgetOverageReview.test.ts`
- Modify: `src/capabilities/money/components/MoneyPlanLimitAnswer.tsx`
- Modify: `src/capabilities/money/screens/MoneySummaryScreen.tsx`
- Modify: `src/capabilities/money/screens/MoneyTransactionsScreen.tsx`
- Modify: `src/capabilities/money/navigation/types.ts`

- [x] Write failing projection and activation tests.
- [x] Implement category-first contribution groups and offset truth.
- [x] Remove resting current-budget copy and add `Review overages` only to supported negative states.
- [x] Reuse Transactions in overage-review mode and preserve detail navigation.

### Task 5: Add transaction coverage correction

**Files:**
- Create: `src/capabilities/money/domain/transactionPlanCoverage.ts`
- Test: `src/capabilities/money/domain/transactionPlanCoverage.test.ts`
- Modify: `src/capabilities/money/screens/MoneyTransactionDetailScreen.tsx`

- [x] Write failing eligibility, split, and impact-preview tests.
- [x] Add `How this is covered` with month plan, saved money, and exact split choices.
- [x] Show before/after Flexible spending, preservation copy, save, and safe reversal.
- [x] Verify screen behavior with focused tests.

### Task 6: Verify the built path

- [x] Run focused Money suites during implementation.
- [x] Run `npm run verify:changed -- --run` after the slice is complete and repeat only after the final visual fix changes the diff.
- [x] Operate Budget -> Review overages -> Transaction coverage in the iPhone 17 Pro Simulator and capture visual evidence.
- [x] Report local/source proof separately from undeployed backend, signed-device, TestFlight, and production proof.
