# Job Delivery Implementation Plan: canonical-budget-snapshot

Date: 2026-07-09
Planner: Codex
Question: How should Kwilt Money stop mixing preview, local, and live budget state per screen?

## Recommendation

Build one canonical `BudgetSnapshot` read model from explicit inputs, and make preview and live modes feed the same pure projector.

## Job Context

- Job: Maya quickly understands whether spending is safe, risky, or needs review.
- Promised outcome: Summary, Category Detail, Transactions, widgets, and Screen Time checks agree about the same budget state.
- Persona: Maya, family organizer.
- Job step: inspect current month and make a spending/access decision.
- User question: why are different pages reading apparently different sources?
- Current delivery score: not scored; architecture audit found snapshot drift.
- Recommended action type: data/read-model stabilization.

## Why This Is Highest Leverage

- Strategic weight: every user-facing money answer depends on the snapshot.
- Current friction: screens choose between `getBudgetMonthSnapshot()`, `getBudgetDetail()`, `getConnectedSpendBudgetSnapshot()`, and local fallback behavior themselves.
- Evidence: Summary constructs pager snapshots directly; Detail merges local and live detail; widgets sync from whichever snapshot a caller provides.
- What gets easier for Maya: if a transaction is reviewed, a category is renamed, or a forecast setting changes, every surface updates from the same computed truth.

## Design-Loop Basis

- Exploration: architecture audit prompted by category emoji/source mismatch.
- Frame: fix truth ownership before adding more feature furniture.
- Converged concept: one snapshot projector, many data-source adapters.
- Learning-release scope: current-month Summary, Category Detail, Transactions, and widgets use the same read model.
- Evidence plan: compare live and preview snapshot output against known scenarios.

## Current Workflow Evidence

- Current path:
  - Preview rows come from `src/platform/budget-repository.ts`.
  - Live rows come from `src/platform/plaid.ts`.
  - Screens sometimes preserve stale live data and sometimes hide stale data.
- What works:
  - `src/domain/budget-meter.ts` already contains substantial pure calculation logic.
  - `src/features/budgets/budget-detail-month.ts` centralizes some month-specific detail behavior.
  - `forecast:backtest` and forecast smoke cover many calculations.
- What breaks or drags:
  - snapshot assembly is not a clean domain boundary.
  - live adapters apply matching and projection in the same large platform module.
  - preview and live behavior can diverge unintentionally.
- Source/runtime refs:
  - `app/(tabs)/index.tsx`
  - `app/budgets/[budgetId].tsx`
  - `app/(tabs)/transactions.tsx`
  - `src/platform/plaid.ts`
  - `src/platform/budget-repository.ts`
  - `src/domain/budget-meter.ts`

## Chosen Change

Create `src/features/budgets/budget-snapshot.ts` or equivalent as a pure projector:

```ts
type BudgetSnapshotInput = {
  categories: BudgetCategory[];
  plans: BudgetPlan[];
  transactions: NormalizedTransaction[];
  assignments: TransactionAssignment[];
  matchingRules: TransactionMatchRule[];
  forecastSettings: BudgetForecastSettings[];
  appRules: AppControlRule[];
  syncState: BudgetSyncState;
  todayIso: string;
};
```

It returns one read model for Summary, category detail, transaction evidence, widgets, and gate decisions.

## PM Decision Summary

| Decision | Recommended choice | Why it matters |
| --- | --- | --- |
| First surface to convert | Summary first, then Category Detail, then Transactions. | Summary is the top-level trust surface and exposes contradictions fastest. |
| Projector scope | Pure calculation and read-model shaping only. | Keeps Plaid sync, Supabase reads, and UI refresh separate from money math. |
| Existing forecast code | Keep `budget-meter.ts` as the calculation engine at first; wrap it from the projector. | Reduces rewrite risk and preserves current forecast/backtest coverage. |
| Preview mode | Convert preview fixtures into the same snapshot input shape as live data. | Prevents preview from becoming a parallel product implementation. |
| Freshness language | Preserve DB freshness vs bank/Plaid sync freshness. | Avoids promising instant bank truth. |

## Snapshot Contract

The snapshot is the single answer object for the app. It should be boring to
consume from screens.

Input adapters:

- `buildLiveBudgetSnapshotInput(client, todayIso)`
  - reads persisted categories/plans,
  - reads transactions and assignments,
  - reads forecast settings,
  - reads app-control rule intent,
  - includes sync/freshness metadata.
- `buildPreviewBudgetSnapshotInput(todayIso)`
  - reads explicit fixtures,
  - uses the same input shape,
  - never mutates production-like state.

Pure projector:

- `projectBudgetSnapshot(input)`
  - computes Summary rows,
  - computes category detail records,
  - computes transaction evidence,
  - computes widget rows,
  - computes app-gate budget signals,
  - does not call Supabase, AsyncStorage, Plaid, widgets, or navigation.

Output shape:

- `summary`
- `categoryDetailsById`
- `transactions`
- `widgetSnapshot`
- `gateSignalsByCategoryId`
- `freshness`
- `diagnostics` for dev/debug only

## Invariants

- Same input produces same snapshot.
- Preview and live use the same projector.
- Provider rows are normalized before projection.
- Category identity comes from persisted product data, not Plaid category labels.
- Transaction assignments are Kwilt interpretation, not provider truth.
- Stale snapshot handling lives outside the projector; the projector only reports freshness metadata.
- Widgets and Screen Time gates consume snapshot output, not their own reconstructed budget math.

## First Slice

Do not convert every surface at once.

1. Create projector and input/output types.
2. Feed it with current live data while still using existing local category compatibility where necessary.
3. Convert Summary to use the snapshot output.
4. Prove Summary numbers match current behavior before converting Detail.
5. Convert Category Detail next and remove local/live identity merge logic.

Transactions and widgets are next, but not required for the first projector merge
unless the initial slice creates inconsistencies.

## Scope

In scope:

- Define snapshot input/output types.
- Extract pure projection from Plaid/live adapter.
- Make fixture/preview mode construct the same input shape.
- Replace screen-level live-vs-preview branching with one hook/service.
- Preserve stale-while-refresh and bank-vs-DB freshness semantics.

Out of scope:

- Changing the visible chart/meter design.
- Replacing Plaid sync edge functions.
- Adding offline writes.

## Implementation Tasks

1. Define snapshot types around product objects, not provider rows.
2. Extract transaction normalization and assignment inference into pure helpers.
3. Build `projectBudgetSnapshot(input)` and tests for current core scenarios.
4. Create live input adapter from Supabase repositories.
5. Create preview input adapter from explicit fixtures.
6. Add parity tests comparing current summary/category outputs to projector outputs for known scenarios.
7. Convert Summary to use `useBudgetSnapshot()`.
8. Convert Category Detail after Summary is stable.
9. Convert Transactions after Category Detail is stable.
10. Convert widget sync and Screen Time gate checks to consume snapshot output.

## Acceptance Criteria

- [ ] Preview and live modes use the same projector.
- [ ] Summary no longer calls both local snapshot and connected snapshot builders directly.
- [ ] Category Detail no longer needs local/live identity merge hacks.
- [ ] Transaction assignment changes update snapshot output through one path.
- [ ] Widget snapshots use the same budget rows as Summary.
- [ ] Existing forecast, rollover, income, and stale-sync behavior remains covered.
- [ ] Projector tests prove parity for at least Shopping over-budget, rollover carry-in, category credit/refund, pending transaction, missing income, and stale sync scenarios.
- [ ] The projector has no imports from React, Expo Router, Supabase client, AsyncStorage, widgets, or native Screen Time modules.

## Verification

- [ ] `npm run lint`
- [ ] projector unit tests
- [ ] `npm run test:forecast`
- [ ] `npm run forecast:backtest`
- [ ] simulator check: Summary, Transactions, Category Detail, widgets agree after a transaction category correction
- [ ] code search confirms projector is pure and screens no longer duplicate snapshot assembly for converted surfaces

## Map Update Trigger

Update `docs/job-delivery-map.yaml` when this materially improves the reliability of budget answers.

Fields likely to change:

- Summary trust.
- Category detail trust.
- Transactions correction confidence.

Do not update the score until:

- the same live action has been verified across at least Summary, Detail, and Transactions.

## Risks And Open Questions

- Moving too much calculation out of `budget-meter.ts` would increase risk. The first slice should wrap existing calculation helpers, not rewrite them.
- Assignment suggestions and confirmed assignments should eventually be separate persisted tables, but the projector can accept the current match shape during Release 1.
- Widgets should ultimately accept snapshot output. A thin widget-specific projection wrapper is acceptable only if it takes `BudgetSnapshot` as input.
- If Summary parity fails, fix the projector or explicitly document the corrected behavior before converting more screens.
