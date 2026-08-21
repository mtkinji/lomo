# Monthly Household Plan System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make one monthly household plan the durable center of Kwilt Money, with signed category carry, explicit start/reset boundaries, and category-bound one-time monthly additions that do not rewrite future months.

**Architecture:** Add deterministic month-ledger projections beneath the existing governed living-plan versions, then persist only user-authorized carry policies and monthly additions in owner-scoped Supabase records. Project that truth into the existing Money snapshot so Summary, category detail, settings, and plan drawers consume one calculation instead of maintaining screen-local arithmetic.

**Tech Stack:** TypeScript domain modules, React Native/Expo, Jest, Supabase Postgres with RLS, existing Kwilt Money repositories and design system.

---

## Checkpoint policy

Stop after every checkpoint. Provide Andrew with:

- native iPhone 17 Pro screenshots of every material UI state introduced in that checkpoint;
- the exact automated and runtime proof completed;
- any evidence limitation or unresolved product decision; and
- a concise statement of what the next checkpoint will change.

Do not move the existing month navigation controls. Do not add transaction-level funding provenance. Do not invent savings balances or runway claims.

## Checkpoint 1: Monthly-plan and signed-carry truth

### Task 1: Define deterministic signed carry

**Files:**
- Create: `src/capabilities/money/domain/monthlyPlanCarry.ts`
- Create: `src/capabilities/money/domain/monthlyPlanCarry.test.ts`

- [x] **Step 1: Write failing tests for the month ledger**

Cover a zero-carry start boundary, positive carry, negative carry, cumulative carry, a deficit larger than the base amount, a category-bound addition, and a reset boundary. Assert both signed ending carry and non-negative spendable availability.

- [x] **Step 2: Run the focused test and confirm red**

Run: `npm test -- --runInBand src/capabilities/money/domain/monthlyPlanCarry.test.ts`

Expected: FAIL because `projectMonthlyCategoryCarry` does not exist.

- [x] **Step 3: Implement the pure projection**

The public result must separate:

```ts
type MonthlyCategoryCarryResult = {
  periodId: string;
  baseAmountCents: number;
  priorCarryCents: number;
  additionCents: number;
  availableBeforeSpendCents: number;
  recoveryDeficitCents: number;
  countedSpendCents: number;
  endingCarryCents: number;
};
```

Use signed safe integers for carry and clamp only `availableBeforeSpendCents` to zero. Start/reset boundaries begin with zero prior carry; they do not delete earlier transactions.

- [x] **Step 4: Run the focused test and confirm green**

Run: `npm test -- --runInBand src/capabilities/money/domain/monthlyPlanCarry.test.ts`

Expected: PASS.

### Task 2: Project one monthly household plan statement

**Files:**
- Modify: `src/capabilities/money/data/moneySnapshot.ts`
- Modify: `src/capabilities/money/data/moneyPlanProjection.ts`
- Modify: `src/capabilities/money/data/moneyPlanProjection.test.ts`
- Modify: `src/capabilities/money/screens/MoneySummaryScreen.tsx`
- Modify: `src/capabilities/money/screens/MoneySummaryScreen.test.tsx`

- [x] **Step 1: Add a failing projection test**

Assert that the snapshot exposes a month-level statement with `regularPlanCents`, `committedPlanCents`, `flexiblePlanCents`, `additionCents`, and `plannedOutflowCents`. The regular amount comes from the active governed plan; additions are zero until Checkpoint 3.

- [x] **Step 2: Implement the snapshot projection**

Keep derivation provenance inspectable. Do not replace the active living-plan version or infer a savings/runway basis.

- [x] **Step 3: Add quiet plan reconciliation at the bottom of Summary**

Keep the top of Budget Inventory focused on the flexible spending answer. Place the committed plan, flexible plan, and monthly plan total in a neutral borderless reconciliation surface after the category inventory. It opens the existing plan explanation path and remains visually subordinate to the spending decisions above it.

- [x] **Step 4: Verify and render**

Run the focused projection and Summary tests, then capture the real Summary on the iPhone 17 Pro Simulator.

### Task 2a: Preserve Meters and make List the decision-first view

**Files:**
- Modify: `src/capabilities/money/components/MoneyCategoryMeterTile.tsx`
- Modify: `src/capabilities/money/components/MoneyCategoryMeterTile.test.tsx`
- Modify: `src/capabilities/money/screens/MoneySummaryScreen.tsx`
- Modify: `src/capabilities/money/screens/MoneySummaryScreen.test.tsx`

- [x] **Step 1: Make the existing radial presentation explicit**

Name the existing radial category view `Meters` and preserve it without moving the month navigation controls.

- [x] **Step 2: Improve the decision-first List presentation**

Show category name and aligned absolute dollars left or over in stable category order. Keep spent-of-plan arithmetic behind category detail. Use red only on a materially current overage without adding a generic status label; describe forecast risk concretely as `Projected to go over`, and let small overages remain neutral numbers. Remove the abandoned Tiles experiment.

- [x] **Step 3: Verify both presentations in the native runtime**

Run the focused component and Summary tests, typecheck the app, and capture Meters, the improved List, and the lower plan-reconciliation state on the iPhone 17 Pro Simulator.

## Checkpoint 2: Durable carry policy, retroactive start, and resets

### Task 3: Persist owner-scoped carry policy

**Files:**
- Create: `supabase/migrations/<generated>_monthly_plan_carry_policy.sql`
- Create: `src/capabilities/money/data/monthlyPlanPolicyRepository.ts`
- Create: `src/capabilities/money/data/monthlyPlanPolicyRepository.test.ts`
- Modify: `src/capabilities/money/data/moneyRepository.ts`
- Modify: `src/capabilities/money/data/moneySnapshot.ts`

- [ ] **Step 1: Generate the migration with the Supabase CLI**

Run: `supabase migration new monthly_plan_carry_policy`.

- [ ] **Step 2: Add category carry fields and a household policy**

Use the existing `budget_plans.rollover_enabled` as the category toggle. Add a validated category boundary period and an owner-scoped household policy for the default start period plus optional annual reset month. Enable RLS and grant only the required authenticated operations with ownership predicates.

- [ ] **Step 3: Add repository contract tests before implementation**

Assert exact owner-scoped reads and confirmed writes for enable/disable, retroactive start, one-category fresh boundary, all-category fresh boundary, and annual reset month.

- [ ] **Step 4: Apply carry to every selected month**

Use historical categorized transaction coverage and the deterministic ledger. Surface partial-history evidence rather than treating unavailable months as zero spending.

- [ ] **Step 5: Verify schema and projection**

Run focused Jest tests, Supabase function/type gates, migration listing, and database advisors when the linked environment is available.

### Task 4: Make carry understandable and controllable

**Files:**
- Modify: `src/capabilities/money/screens/MoneyCategoryDetailScreen.tsx`
- Modify: `src/capabilities/money/screens/MoneyCategoryDetailScreen.test.tsx`
- Modify: `src/capabilities/money/screens/MoneyLivingPlanScreen.tsx`
- Modify: `src/capabilities/money/screens/MoneyLivingPlanScreen.test.tsx`

- [ ] **Step 1: Show category arithmetic only when material**

Render base monthly amount, signed carry from the previous month, additions, and current availability. A deficit larger than the base shows `$0 available` plus the remaining recovery amount.

- [ ] **Step 2: Replace funding-mode configuration with carry settings**

Keep `Carry balance forward` in Category settings. Provide one start-month control and `Start next month fresh`. Do not put the switch in ordinary category detail.

- [ ] **Step 3: Add household controls in Money Plan**

Provide the default rollover start month, `Start all categories fresh next month`, and one optional annual fresh-start month. Preview affected positive and negative balances before confirmation.

- [ ] **Step 4: Render and capture**

Capture category surplus, category deficit, retroactive start, and reset preview states in the native runtime.

## Checkpoint 3: One-time monthly additions

### Task 5: Persist category-bound monthly additions

**Files:**
- Create: `supabase/migrations/<generated>_monthly_plan_additions.sql`
- Create: `src/capabilities/money/domain/monthlyPlanAddition.ts`
- Create: `src/capabilities/money/domain/monthlyPlanAddition.test.ts`
- Create: `src/capabilities/money/data/monthlyPlanAdditionRepository.ts`
- Create: `src/capabilities/money/data/monthlyPlanAdditionRepository.test.ts`
- Modify: `src/capabilities/money/data/moneyPlanProjection.ts`

- [ ] **Step 1: Define and test the addition contract**

An addition has owner, selected period, category, name, accepted amount, optional linked evidence IDs, status, and timestamps. It increases only that category and month, never general flexible capacity or future base amounts.

- [ ] **Step 2: Add an owner-scoped RLS migration**

Reject invalid period IDs, negative amounts, cross-owner categories, and duplicate idempotency keys.

- [ ] **Step 3: Project additions into household and category arithmetic**

Expose regular plan, additions, and planned outflow separately. Include accepted additions in ending carry only for their selected category and month.

### Task 6: Add the one-month review flow

**Files:**
- Modify: `src/capabilities/money/screens/MoneyCategoryDetailScreen.tsx`
- Modify: `src/capabilities/money/screens/MoneyCategoryDetailScreen.test.tsx`
- Create: `src/capabilities/money/components/MoneyCategoryMonthlyAdditionDrawer.tsx`
- Create: `src/capabilities/money/components/MoneyCategoryMonthlyAdditionDrawer.test.tsx`

- [ ] **Step 1: Implement category-owned monthly-plan disclosure**

In category detail, show the usual category amount, signed carry, named additions, and current-month availability when those values materially explain the category. Summary reflects the resulting amount but does not promote a household-level exception banner.

- [ ] **Step 2: Implement manual before-or-after acceptance**

Allow a named amount to be added to the selected category and month. Confirm `August only` and state that the usual monthly plan is unchanged.

- [ ] **Step 3: Add a bounded material-overage invitation**

From the affected category, offer a focused addition only when one consequential categorized outflow can explain the material overage. The user may instead leave the category and month over plan. Do not auto-accept, attach funding provenance to transactions, or require routine transaction review.

- [ ] **Step 4: Render and capture**

Capture ordinary month, addition review, accepted addition, and leave-over-plan states.

## Checkpoint 4: Evidence-backed plan establishment

### Task 7: Recenter setup and Money Plan

**Files:**
- Modify: `src/capabilities/money/screens/MoneySetupScreen.tsx`
- Modify: `src/capabilities/money/screens/MoneySetupScreen.test.tsx`
- Modify: `src/capabilities/money/screens/MoneyLivingPlanScreen.tsx`
- Modify: `src/capabilities/money/domain/moneyOnboarding.ts`
- Modify: `src/capabilities/money/domain/moneyOnboarding.test.ts`

- [ ] **Step 1: Put evidence before the plan decision when available**

Present one supported monthly amount and its committed/flexible consequence. Keep comparison, derivation, and manual amount secondary.

- [ ] **Step 2: Preserve a minimal insufficient-evidence path**

Ask for one stable monthly amount. Do not ask the user to choose a budgeting methodology or claim a runway result.

- [ ] **Step 3: Make percentage one derivation, not the product center**

Retain the household's income-percentage preference as inspectable provenance. Make the accepted monthly amount the primary Money Plan statement and receipt fact.

- [ ] **Step 4: Render and capture**

Capture connected-evidence recommendation, comparison disclosure, manual fallback, and the updated Money Plan screen.

## Checkpoint 5: Resource pool and runway decision

Stop for product review before implementation. The accepted model intentionally does not yet decide which liquid accounts constitute available savings, how liabilities and restricted accounts such as HSAs participate, or what confidence is required for a runway claim. Produce native concepts grounded in the now-real monthly-plan arithmetic, then obtain Andrew's decision before adding persistence or claims.

## Completion verification

After the final accepted checkpoint:

- [ ] Run each checkpoint's focused tests.
- [ ] Run `npm run verify:changed -- --run` once for task completion.
- [ ] Exercise current, past, and next month navigation without moving its controls.
- [ ] Verify VoiceOver labels, Dynamic Type, scrolling, and reduced-motion behavior for new controls.
- [ ] Record Simulator separately from signed-device, TestFlight, and deployed Supabase proof.
