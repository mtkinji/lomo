# Living Target Recommendation System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the onboarding living-percent choice, such as "I want to live on 70% of my income," into a formal recommendation system for category budget amounts.

**Architecture:** Persist the user's living target as account-backed plan intent, build deterministic recommendation receipts from income, fixed costs, variable costs, and transaction history, then feed those receipts into category plans and Summary/Settings explanations. Recommendations must be explainable, reversible, and conservative when history is sparse.

**Tech Stack:** Expo Router, React Native, TypeScript, Supabase Postgres/RLS, `@supabase/supabase-js`, Vitest for pure TypeScript tests, existing forecast/backtest scripts.

---

## PM Decision Summary

| Decision | Recommended choice | Why it matters |
| --- | --- | --- |
| Living target source | Persist the onboarding living percent as account-backed data. | A local-only onboarding answer cannot safely drive future budget recommendations. |
| Recommendation posture | Deterministic receipts first; no opaque AI allocator in V1. | Users need to understand why Kwilt recommended a number. |
| Income basis | Use detected recurring income when confident; otherwise show a missing-resource state. | 70% of missing or stale income would create false precision. |
| Cost split | Classify fixed commitments separately from variable categories. | Fixed bills should reserve target capacity before variable recommendations are made. |
| History window | Use 12 completed months when available; gracefully fall back to shorter windows with lower confidence. | The app should use richer history when possible without blocking newer users. |
| User override behavior | Never silently overwrite user-edited category amounts. | A recommendation system must preserve trust and control. |
| UI explanation | Every recommended amount needs a visible receipt. | "Based on your 70% target, fixed bills, and 12-month average" is part of the product value. |

## User Promise

When Maya chooses "live on 70% of income," Kwilt uses that signal. Category
amount recommendations should be able to say:

> Based on 70% of your usual $4,800 monthly income, Kwilt set a $3,360 living
> target. Fixed costs reserve $2,050. Groceries is recommended at $650 from your
> 12-month grocery average, leaving $210 unassigned.

If Kwilt cannot support a recommendation, it should say why:

> Kwilt saved your 70% target, but needs current income or more transaction
> history before recommending category amounts.

## Current Code Evidence

- `src/features/onboarding/BudgetOnboardingFlow.tsx` asks for a monthly living target and defaults to 70%.
- `src/platform/onboarding.ts` stores `IncomePlanTarget` in AsyncStorage, which is not durable account-backed product data.
- `src/platform/plaid.ts` stores and reads Plaid transactions with Personal Finance Categories, merchant names, dates, and income/spend direction.
- `src/domain/income-patterns.ts` and `scripts/budget-forecast-smoke.mjs` already cover income-present, missing-income, and irregular-income style scenarios.
- `scripts/forecast-backtest.mjs` already has challenger logic for average-based forecast decisions.
- `app/app-control/[budgetId].tsx` and `docs/feature-briefs/budget-amount-adjustment.md` already frame category amount edits as plan-aware, not isolated field edits.

## System Design

### Data Objects

Add account-backed living target intent:

```ts
type BudgetLivingTarget = {
  id: string;
  userId: string;
  householdId: string | null;
  livingPercent: number;
  setAsidePercent: number;
  source: 'onboarding' | 'settings' | 'migration';
  status: 'active' | 'archived';
  createdAt: string;
  updatedAt: string;
};
```

Add recommendation run output:

```ts
type BudgetRecommendationRun = {
  id: string;
  userId: string;
  householdId: string | null;
  periodId: string;
  livingTargetId: string;
  resourceBasis: 'recurring_income' | 'confirmed_income' | 'manual_income' | 'missing_resource' | 'savings_runway';
  incomeCents: number | null;
  livingTargetCents: number | null;
  fixedCostCents: number;
  variableCapacityCents: number | null;
  plannedCategoryCents: number;
  unallocatedCents: number | null;
  overTargetCents: number;
  confidence: 'high' | 'medium' | 'low' | 'needs_confirmation';
  createdAt: string;
};
```

Add category-level receipts:

```ts
type BudgetCategoryRecommendation = {
  id: string;
  runId: string;
  categoryId: string;
  recommendedAmountCents: number;
  currentPlanAmountCents: number | null;
  source: 'fixed_bill' | 'twelve_month_average' | 'short_history_average' | 'current_exposure' | 'user_override' | 'starter_fallback';
  costClass: 'fixed' | 'variable' | 'mixed' | 'unknown';
  historyMonthsUsed: number;
  confidence: 'high' | 'medium' | 'low';
  receipt: string;
};
```

### Supabase Tables

Add these after Category Truth tables exist:

- `budget_living_targets`
  - `id uuid primary key`
  - `user_id uuid not null`
  - `household_id uuid null`
  - `living_percent integer not null check (living_percent between 1 and 100)`
  - `set_aside_percent integer not null check (set_aside_percent between 0 and 99)`
  - `source text not null`
  - `status text not null default 'active'`
  - `created_at`, `updated_at`
  - one active target per user/household
- `budget_recommendation_runs`
  - snapshot of the recommendation math for a period
- `budget_category_recommendations`
  - one row per category recommendation with receipt text and source classification

RLS should match the category plan direction: owner writes, household reads in
Release 1.

## Recommendation Algorithm

V1 should be deterministic and testable.

1. Load active living target.
2. Load transactions for the last 12 completed months when available.
3. Classify income:
   - recurring payroll or dependable deposits,
   - confirmed current-month income,
   - irregular income,
   - missing/stale income.
4. If income is confident, calculate:
   - `livingTargetCents = incomeCents * livingPercent / 100`
   - `setAsideCents = incomeCents - livingTargetCents`
5. Classify costs:
   - fixed: rent, mortgage, utilities, subscriptions, recurring bills, insurance, debt payments,
   - variable: groceries, restaurants, gas, shopping, household extras,
   - mixed: categories with both scheduled and variable patterns,
   - unknown: sparse or low-confidence categories.
6. Allocate fixed commitments first from the living target.
7. Recommend variable category amounts:
   - prefer 12 completed months average when there are at least 9 usable months,
   - use trailing 3 or 6 months when 12 months are unavailable,
   - use current exposure only when history is too sparse,
   - preserve a visible buffer instead of forcing every dollar into categories.
8. Respect user overrides:
   - if the user set a category amount, label it `user_override`,
   - do not overwrite it during future recommendation runs,
   - show target impact when it creates over-target or under-target states.
9. Emit receipts for every recommendation.

## Fixed Versus Variable Rules

Fixed costs should be detected from:

- stable amount,
- recurring cadence,
- merchant/source cluster,
- scheduled forecast settings,
- Plaid category/merchant evidence,
- user confirmation.

Variable costs should be detected from:

- recurring but amount-variable merchant/category patterns,
- Plaid Personal Finance Categories,
- category assignment history,
- month-to-month volatility,
- user-created category meaning.

Mixed categories should not be forced into one bucket. For example, utilities
may have a scheduled baseline plus variable overage. The receipt should say:

> Utilities: $230 recommended from recurring bill history plus winter overage
> average.

## UX Requirements

### Onboarding

The living-target step should say the choice will drive recommendations after
account connection:

> Kwilt will use this target with your transaction history to recommend category
> amounts.

The recommendation-analysis step must stay after account connection. It should
not claim to analyze spending before Plaid history exists.

### Summary

Show the plan receipt:

> Living target: $3,360 from 70% of usual income.
> Fixed costs: $2,050.
> Variable recommendations: $1,100.
> Buffer: $210.

### Category Settings

When editing monthly amount, show recommendation context:

> Recommended $650 from 12-month grocery average.
> Raising to $750 leaves $110 buffer.

If income is missing:

> Kwilt saved this amount, but cannot check it against your 70% target until
> income is current.

### Category Detail

Show a compact source label:

- `Recommended from 12 mo avg`
- `Fixed bill`
- `Set by you`
- `Current exposure only`
- `Needs more history`

## First Release Slice

Start with a shadow-mode recommendation run. Do not auto-apply amounts yet.

1. Persist the onboarding living target to Supabase.
2. Build the pure recommendation projector.
3. Run it from existing transaction/category/plan data.
4. Store or log recommendation receipts.
5. Show receipts in developer/debug or a non-committal UI surface.
6. Compare recommended amounts to existing category plans.

Only after receipts look sensible should the app offer:

> Apply these recommended amounts

## Implementation Tasks

1. Add `budget_living_targets`, `budget_recommendation_runs`, and `budget_category_recommendations` migrations.
2. Add typed repositories:
   - `getActiveBudgetLivingTarget(client)`
   - `upsertBudgetLivingTarget(client, input)`
   - `createBudgetRecommendationRun(client, input)`
   - `listBudgetCategoryRecommendations(client, periodId)`
3. Update onboarding completion so `IncomePlanTarget` is written to Supabase when signed in, with AsyncStorage only as local draft/cache.
4. Create `src/domain/budget-recommendations.ts`.
5. Add `buildBudgetRecommendationRun(input)` as a pure projector.
6. Add cost classification helpers for fixed, variable, mixed, and unknown.
7. Add receipt generation helpers that produce user-facing explanations from structured facts.
8. Add tests for:
   - 70% living target from stable income,
   - missing income refuses target math,
   - fixed costs reserve capacity first,
   - 12-month variable average,
   - short-history fallback,
   - user override preservation,
   - over-target and under-target states.
9. Add Summary receipt consumption after the projector is proven.
10. Add Category Settings amount-edit receipt consumption after Summary is proven.

## Acceptance Criteria

- [ ] The onboarding living percent is persisted as account-backed data.
- [ ] Recommendation runs can explain which income basis they used.
- [ ] The system refuses to calculate 70% of missing or stale income.
- [ ] Fixed costs are identified and reserve living-target capacity before variable recommendations.
- [ ] Variable category recommendations use 12 completed months when possible.
- [ ] Shorter-history recommendations are labeled lower-confidence.
- [ ] User-set category amounts are preserved and labeled.
- [ ] Every recommended amount has a receipt understandable to a non-technical user.
- [ ] Summary can show target, fixed cost total, variable recommendation total, buffer, and over-target states.
- [ ] Category Settings can explain how a proposed edit changes the living target buffer or overage.

## Verification

- [ ] `npm run test`
- [ ] `npm run lint`
- [ ] `npm run test:forecast`
- [ ] recommendation projector tests pass
- [ ] simulator smoke: complete onboarding with 70%, connect account, see recommendation receipt after sync
- [ ] simulator smoke: edit one category amount and verify target impact copy
- [ ] backtest or fixture review compares 12-month average recommendations against known category history

## Stop Conditions

- Stop if the implementation uses the living percent only as onboarding copy.
- Stop if recommendations are generated before account history exists and are not clearly labeled fallback.
- Stop if category amounts are auto-applied without a user-visible receipt.
- Stop if a user-edited category amount is overwritten by a later recommendation run.
- Stop if fixed and variable costs are blended into one unexplained average.

## Relationship To Existing Plans

- Depends on `2026-07-09-budget-categories-product-data.md` for durable categories and plans.
- Feeds `2026-07-09-canonical-budget-snapshot.md` with recommendation receipts.
- Extends `2026-07-09-production-verification-spine.md` with recommendation projector tests.
- Complements `docs/feature-briefs/auto-budget-from-living-target.md`.
- Complements `docs/feature-briefs/income-runway-detection.md` for missing-income and savings-runway cases.
