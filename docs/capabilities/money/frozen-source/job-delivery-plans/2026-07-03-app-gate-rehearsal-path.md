# Job Delivery Implementation Plan: app-gate-rehearsal-path

Date: 2026-07-03
Planner: Codex
Question: What is the next highest-leverage enhancement or fix to make?
Refreshed: 2026-07-03 after `npm run job-delivery:check`, `npm run job-delivery:next`, `npm run job-delivery:review`, and source inspection.

## Recommendation

Wire the app-control rehearsal path and make `Open for now` and `Leave blocked` explicit review outcomes.

## Job Context

- Job: `review-budget-reality-before-spending`
- Promised outcome: Maya sees relevant live budget reality before opening a spend-triggering app, so the next action is intentional instead of automatic.
- Persona: Maya
- Job step: `choose-intentional-access`
- User question: Am I okay to open this app right now?
- Current delivery score: 2/5
- Recommended action type: `implement`

## Why This Is Highest Leverage

- Strategic weight: `core_value_unit`
- Current friction: the core gate rehearsal exists as pieces, but the user cannot traverse budget detail -> app controls -> test review -> explicit open or stay-blocked choice -> receipt/history.
- Evidence: `npm run job-delivery:next` reports the `app-gate-rehearsal` workflow as broken.
- What gets easier for Maya: the review moment becomes a real choice with two acceptable outcomes instead of a simulated one-way unlock.

## Design-Loop Basis

- Exploration: `docs/design-explorations/budget-reality-gate`
- Frame: help Maya put a calm budget-reality pause before spend-triggering apps while preserving trust, agency, and non-punitive voice.
- Converged concept: `Hard Gate, Soft Voice`.
- Learning-release scope: one mapped meter-to-app rule, a review screen, two outcomes, and persisted review history; simulated Screen Time unlock is acceptable for the first local slice.
- Evidence plan: both `Open for now` and `Leave blocked` should appear naturally in review history, and the user should understand the pause as supportive rather than punitive.
- Current fit: the Screen Time controls learning slice now exists, so the highest-leverage gap is no longer entitlement scaffolding; it is making the user-facing rehearsal path express the actual choice the gate is supposed to create.

## Current Workflow Evidence

- Current path: Budget detail -> App controls -> Test review before Amazon -> Review budget reality.
- What works: the source surfaces and review scaffold exist.
- What breaks or drags: the App controls row does not navigate, the test review button has no handler, the review screen only records `unlocked`, and the receipt copy only explains simulated shield release.
- Source/runtime refs: `app/budgets/[budgetId].tsx`, `app/app-control/[budgetId].tsx`, `app/review.tsx`, `src/domain/app-gate.ts`, `src/platform/budget-repository.ts`, `src/services/budgetScreenTime.ts`, `docs/job-delivery-map.yaml`.

Current inspected evidence:

- `app/budgets/[budgetId].tsx` still renders the `App controls` menu row with `onPress={() => setSettingsOpen(false)}`, so the menu closes instead of navigating to the app-control route.
- `app/app-control/[budgetId].tsx` still renders `Test review before Amazon` without an `onPress` handler.
- `app/review.tsx` still exposes one primary action, `I reviewed this`, and records `outcome: 'unlocked'`.
- `src/domain/app-gate.ts` still models review outcomes as `'unlocked' | 'dismissed'`.
- `src/platform/budget-repository.ts` already labels non-`unlocked` outcomes as `left blocked`, which gives the implementation a small compatibility foothold.
- `src/services/budgetScreenTime.ts` only treats `unlocked` reviews as fresh unlock reviews, so the `Leave blocked` outcome can be recorded without accidentally opening access.

## Chosen Change

Turn the existing scaffold into a traversable rehearsal: from a budget detail page, Maya can open App controls, start a test review, choose `Open for now` or `Leave blocked`, and see the chosen outcome reflected in the receipt/history.

## Scope

In scope:

- Navigate Budget Detail's App controls action to the app-control route for that budget.
- Wire `Test review before Amazon` to the review route with enough context to represent the current budget/app target.
- Replace the single `I reviewed this` action with explicit `Open for now` and `Leave blocked` actions.
- Rename or map review outcomes so new code can speak in product language (`opened_for_now` / `left_blocked`) while legacy `unlocked` history still renders as opened.
- Record both outcomes in the review event model and copy.
- Show a receipt/history row that distinguishes opened from left blocked.

Out of scope:

- Real Screen Time entitlement behavior.
- Multi-rule management.
- Bank-sync changes.
- New iOS widget surfaces.
- Analytics instrumentation beyond any existing event/review history path.

## Implementation Tasks

1. Update the Budget Detail settings/menu action so `App controls` navigates to the matching app-control route instead of only closing the menu.
2. Update the app-control test review button to navigate to the review route with budget/app target context.
3. Extend the review route to accept or infer the budget id, target app id, and target label. Keep the first slice explicit for Amazon/Shopping if broader route params would expand scope.
4. Extend the review outcome model to support both `opened_for_now` and `left_blocked`, or add a normalization helper that maps legacy `unlocked` to `opened_for_now` and legacy `dismissed` to `left_blocked`.
5. Update `isReviewFreshForPolicy` so only the open-for-now outcome counts as a fresh unlock. `left_blocked` must be preserved as proof without clearing the shield.
6. Update the review screen UI so both choices are clear, equally valid, and calm.
7. Update receipt/history copy to display the actual chosen outcome.
8. Add focused tests for review-outcome normalization and freshness logic if the implementation introduces helper logic or branches in `src/services/budgetScreenTime.ts`.

## Acceptance Criteria

- [ ] From Budget Detail, tapping `App controls` opens the relevant app-control screen.
- [ ] From App Controls, tapping `Test review before Amazon` opens the review screen.
- [ ] The review screen offers `Open for now` and `Leave blocked`.
- [ ] Choosing `Open for now` records and displays an opened outcome.
- [ ] Choosing `Leave blocked` records and displays a blocked outcome.
- [ ] `Leave blocked` does not satisfy Screen Time freshness checks or clear an active review-before-access restriction.
- [ ] Legacy `unlocked` review events still render as opened history.
- [ ] Receipt/history copy does not imply an unlock happened when the user chose to leave the app blocked.
- [ ] The flow still works in preview/local data without requiring real Screen Time entitlement behavior.

## Verification

- [ ] `npm run job-delivery:check`
- [ ] `npm run lint`
- [ ] `npm run test:forecast`
- [ ] Manual simulator walkthrough: Budget Detail -> App controls -> Test review -> Open for now -> receipt/history.
- [ ] Manual simulator walkthrough: Budget Detail -> App controls -> Test review -> Leave blocked -> receipt/history.
- [ ] If running against native Screen Time, verify that `Open for now` can clear the review-before-access shield while `Leave blocked` leaves it active; otherwise record this as pending TestFlight/device proof.

## Map Update Trigger

Update `docs/job-delivery-map.yaml` when:

- the rehearsal path is implemented and verified in the simulator or real app.

Fields likely to change:

- `choose-intentional-access.current_friction`
- `choose-intentional-access.evidence`
- `choose-intentional-access.recommended_next_action`
- `workflows.app-gate-rehearsal.current_status`
- `workflows.app-gate-rehearsal.failure_points`

Do not update the score until:

- both review outcomes are verified through the full traversal and review history reflects the selected outcome.

## Risks And Open Questions

- The existing review outcome string may be referenced by persistence or history code; preserve migration compatibility or map legacy `unlocked` to the new opened outcome.
- If navigation depends on Expo Router params that are not currently modeled, keep the first slice narrow and explicit rather than creating a general app-target manager.
- If Screen Time integration is already partially wired in native code, keep this rehearsal path honest about what is simulated versus real.
- The implementation should not broaden into policy management or widget work; the point is to make the core review choice real enough to rehearse and verify.
