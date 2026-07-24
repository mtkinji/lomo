# Job Delivery Implementation Plan: budget-app-unlock-review

Date: 2026-07-04
Planner: Codex
Question: How do we deliver app blocking plus explicit budget review in an elegant, reductive UX/UI?

## Recommendation
Make Budget Detail the unblock surface. Keep Screen Time setup preset-first, and collapse every review-clearable trigger into the same task: review the budget, then choose `Open for now` or `Keep blocked`.

## Job Context
- Job: `review-budget-reality-before-spending`
- Persona: Maya
- Step: `choose-intentional-access`
- User question: Why is this app paused, and what do I do now?
- Current delivery score: 3/5
- Recommended action type: `implement`

## Design-Loop Basis
- Exploration: `docs/design-explorations/budget-app-unlock-review`
- Chosen concept: `Preset-First Setup + Budget-Native Unlock`
- Reductive contract: triggers decide when apps pause; budget review receipts decide when they reopen.
- Learning release: one Shopping/Amazon path with a 95% threshold preset, native deep link into Budget Detail, and two explicit outcomes.

## Current Workflow Evidence
- `src/domain/app-gate.ts` already models app policies and `opened_for_now` / `left_blocked`.
- `src/services/budgetScreenTime.ts` already treats only open outcomes as fresh reviews.
- `app/review.tsx` already offers two outcome buttons, but it is not budget-detail-native.
- `app/app-control/[budgetId].tsx` still explains conditions and unlock windows more than task success.
- `app/budgets/[budgetId].tsx` can navigate to app controls and already has the meter context needed for an unlock dock.

## Chosen Change
Build the first polished path:

1. Amazon is paused by Shopping.
2. The shield says `Review Shopping to open Amazon.`
3. The app opens `Shopping` with an active unlock task.
4. The first viewport shows the meter and a compact dock: `Amazon is paused because Shopping is at 95%.`
5. The user taps `Open Amazon for now` or `Keep blocked`.
6. The receipt is recorded and Screen Time reconciles.

## Scope
In scope:
- Budget Detail unlock dock.
- One threshold preset: `At 95% used`.
- Review-clearable reason summarization.
- Preset-first App Controls setup.
- Simulator UI/routing verification.
- Signed-device Screen Time verification plan.

Out of scope:
- household approvals,
- arbitrary rule builder,
- multiple native selections per policy,
- recovery plans,
- production-default rollout.

## Implementation Tasks
1. Add preset and threshold types/helpers in `src/domain/app-gate.ts`.
2. Update policy evaluation in `src/services/budgetScreenTime.ts` so threshold triggers can produce active restrictions.
3. Make review-clearable vs hard-stop behavior explicit; default over-budget to review-clearable unless a hard-stop preset is selected.
4. Add a single-reason summarizer for unlock UI and shield copy.
5. Add route params to Budget Detail for `unlockTarget` and active reason context.
6. Add the Budget Detail unlock dock and receipt state.
7. Route review/shield entrypoints to the Budget Detail unlock task.
8. Refactor App Controls normal path to presets first; move chips/condition internals behind advanced/debug.
9. Add focused unit tests for threshold and freshness behavior.
10. Verify the flow in simulator, then on a signed device/TestFlight.

## Acceptance Criteria
- [ ] A threshold preset can pause a selected app at 95% budget usage.
- [ ] A blocked app can route to the relevant budget detail page.
- [ ] The unlock dock shows one plain reason and two actions.
- [ ] `Open for now` records `opened_for_now` and can clear review-clearable restrictions for the window.
- [ ] `Keep blocked` records `left_blocked` and does not clear the shield.
- [ ] App Controls exposes plain presets before condition chips.
- [ ] Copy avoids parental-control and shame language.
- [ ] Simulator verifies the UX path.
- [ ] Signed-device verification proves native shield clear/reapply behavior.

## Verification
- [ ] `npm run job-delivery:check`
- [ ] `npm run test:forecast`
- [ ] Targeted policy helper tests
- [ ] Manual simulator walkthrough: Budget Detail unlock task
- [ ] Manual signed-device walkthrough: shield -> budget -> open/keep-blocked -> foreground reapply

## Map Update Trigger
Update `docs/job-delivery-map.yaml` only after signed-device proof. If the signed-device path works, the likely score change is `choose-intentional-access` from 3/5 to 4/5.

## Risks And Open Questions
- Native shield deep links may need a narrower URL payload than the product copy wants.
- Budget Detail may need visual simplification near the meter so the unlock task is first-viewport obvious.
- Hard-stop behavior should remain explicit; accidental non-clearable blocks will feel punitive.
