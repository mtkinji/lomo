# Job Delivery Implementation Plan: repositories-feature-hooks

Date: 2026-07-09
Planner: Codex
Question: How should screens stop owning persistence, realtime, and refresh behavior directly?

## Recommendation

Move data orchestration into typed repositories and feature hooks, then convert the largest screens incrementally without redesigning the UI.

## Job Context

- Job: Maya can repeatedly inspect and adjust money state without encountering stale or contradictory screens.
- Promised outcome: loading, stale, error, preview, and live states behave consistently.
- Persona: Maya, family organizer.
- Job step: move between Summary, Transactions, Category Detail, and Settings.
- User question: is the app architecturally strangely implemented because of vibe-coding?
- Current delivery score: not scored; audit found orchestration spread through large screens.
- Recommended action type: maintainability and production-readiness refactor.

## Why This Is Highest Leverage

- Strategic weight: once source-of-truth is fixed, screen-level orchestration becomes the next source of drift.
- Current friction: screens manually invoke Supabase, local repositories, widget sync, realtime subscriptions, and fallback logic.
- Evidence: `app/(tabs)/index.tsx`, `app/budgets/[budgetId].tsx`, and `app/transactions/[transactionId].tsx` all assemble and refresh live data independently.
- What gets easier for Maya: app state updates feel coherent as she moves through the product.

## Current Workflow Evidence

- Current path:
  - Summary owns realtime subscriptions and widget sync.
  - Detail owns live snapshot fetch, forecast save, banner search, chart state, unlock dock, transaction actions, and settings drawers.
  - Transactions owns live snapshot refresh and category creation/review behavior.
- What works:
  - There are already platform/service modules for Supabase, Plaid, widgets, Screen Time, family sharing, and entitlements.
- What breaks or drags:
  - feature screens are too large to reason about safely.
  - refresh policy is duplicated.
  - preview/live mode branching leaks everywhere.
- Source/runtime refs:
  - `app/(tabs)/index.tsx`
  - `app/budgets/[budgetId].tsx`
  - `app/(tabs)/transactions.tsx`
  - `src/services/connectedSpendWidgets.ts`
  - `src/platform/plaid.ts`

## Chosen Change

Introduce a data layer with explicit responsibilities:

- repositories: persistence and remote calls
- projectors: pure read-model computation
- hooks: screen-ready state, refresh, realtime invalidation, and mutations
- screens: render and user interaction only

Candidate hooks:

- `useBudgetSnapshot()`
- `useCategoryDetail(categoryId)`
- `useTransactionsView()`
- `useBudgetCategoryMutations()`
- `useAppControlRule(categoryId)`

## PM Decision Summary

| Decision | Recommended choice | Why it matters |
| --- | --- | --- |
| State approach | Use typed repositories plus custom hooks first; do not add a global state library in this slice. | Keeps the refactor understandable and avoids replacing one architecture problem with another. |
| First conversion | Convert Summary first, then Category Detail. | Summary is the broad trust surface; Detail proves deep-link/object consistency. |
| UI changes | Preserve current visible UI while moving data ownership. | Lets the team verify architecture without debating product design at the same time. |
| Realtime policy | Centralize invalidation/debounced refresh in `useBudgetSnapshot()`. | Prevents every screen from inventing its own refresh semantics. |
| Widget sync | Trigger from the shared snapshot/data layer after successful refresh or mutation. | Widgets should reflect the same truth as Summary, not whichever screen last mounted. |

## Target State Contract

Screens should not know where money truth comes from. They should receive a
screen-ready state object:

```ts
type BudgetDataState<T> =
  | { status: 'loading'; staleData?: T }
  | { status: 'ready'; data: T; freshness: BudgetFreshness }
  | { status: 'refreshing'; data: T; freshness: BudgetFreshness }
  | { status: 'error'; staleData?: T; message: string };
```

The hooks decide:

- preview vs live,
- when to refresh,
- how to preserve last useful data,
- how realtime events invalidate data,
- when widget sync should run,
- how mutations refresh affected read models.

Screens decide:

- what to render,
- which user action was taken,
- how to phrase visible errors,
- navigation and layout.

## Conversion Sequence

1. Build `useBudgetSnapshot()` while Summary still renders the old path.
2. Compare hook output to existing Summary output in dev tests/logs.
3. Convert Summary once parity is proven.
4. Extract Category Detail data into `useCategoryDetail(categoryId)`.
5. Convert Category Detail while preserving current sections and drawers.
6. Convert Transactions.
7. Remove old local counters, identity merge hacks, and duplicate refresh code.

## Scope

In scope:

- Add hook/service boundaries.
- Convert Summary and Category Detail first.
- Extract non-visual logic from the largest screens.
- Centralize stale-while-refresh and realtime invalidation.

Out of scope:

- Full UI redesign.
- Replacing Expo Router structure.
- Changing provider integrations beyond what hooks need.

## Implementation Tasks

1. Define repository contracts and hook return states.
2. Implement `useBudgetSnapshot()` with live, preview, loading, refreshing, stale, and error states.
3. Move Summary realtime subscription and refresh debounce into the hook/data layer.
4. Move widget sync trigger into the shared data layer after ready snapshot updates.
5. Add parity checks between current Summary output and hook output.
6. Convert Summary to render from hook state.
7. Extract Category Detail data orchestration into `useCategoryDetail()`.
8. Split Category Detail UI into meter, chart, activity, forecast settings, banner, and app-control entry components only where the split reduces file risk.
9. Convert Transactions after the snapshot/category hooks are stable.
10. Remove obsolete local refresh counters and merge hacks.

## Acceptance Criteria

- [ ] Summary screen does not directly call `getConnectedSpendBudgetSnapshot()`.
- [ ] Category Detail does not directly own live snapshot refresh logic.
- [ ] Realtime refresh is handled by a shared data hook or service.
- [ ] Preview mode is selected once by the data layer, not in every screen.
- [ ] Large screens shrink through extraction without visible workflow regression.
- [ ] Existing widget sync still receives updated budget rows.
- [ ] Hook state represents loading, refreshing with stale data, ready, and error with stale data consistently.
- [ ] Converted screens do not import Supabase client, Plaid adapter calls, or preview fixture repositories directly.

## Verification

- [ ] `npm run lint`
- [ ] hook-level tests for loading/stale/error state transitions
- [ ] simulator check: navigate Summary -> Detail -> Transactions -> Detail after a category correction
- [ ] simulator check: live refresh preserves last useful data on transient failure
- [ ] code search verifies converted screens no longer call direct snapshot builders
- [ ] screenshot/runtime check confirms no visible workflow regression on Summary and Category Detail

## Map Update Trigger

Update `docs/job-delivery-map.yaml` only after the refactor improves a user-visible reliability score.

Fields likely to change:

- none immediately; this is mostly architecture support.

Do not update the score until:

- there is runtime evidence of reduced stale/contradictory states.

## Risks And Open Questions

- Adding a global state library too early could create new complexity. Use custom hooks first, revisit only if refresh/cache duplication remains.
- Component extraction should follow data extraction; do not split visual components just to make line counts look better.
- Widget sync should follow successful snapshot updates, but the exact trigger should avoid repeated sync loops during realtime bursts.
