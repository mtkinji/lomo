---
id: brief-budget-app-unlock-review
title: Budget App Unlock Review
status: draft
audiences: [audience-aspirational-family-organizers]
personas: [Maya]
hero_jtbd: jtbd-move-the-few-things-that-matter
job_flow: job-flow-maya-review-budget-reality-before-spending
job_step: choose-intentional-access
serves: [jtbd-put-intention-before-impulse, jtbd-carry-intentions-into-action, jtbd-trust-this-app-with-my-life, jtbd-review-budget-reality-before-spending]
related_briefs: [brief-screen-time-controls, brief-budget-reality-gate]
owner: andrew
last_updated: 2026-07-09
source_repo: mtkinji/kwilt-budget
source_sha: df383c3ac1538dff0a83b43a21ff3e45c024298b
---

> **Money source note:** Promoted from frozen standalone Money product documentation. Preserve its product reasoning, but verify route, implementation, delivery, and release claims against `src/capabilities/money/` and current runtime evidence.

# Budget App Unlock Review

## Context
Kwilt Money's clearest value unit is not "manage Screen Time controls." It is:

**This app opens after you review this budget.**

The current app-gate rehearsal already supports explicit open and blocked outcomes. This brief turns that rehearsal into a polished, reductive unlock workflow: app blocking can be triggered by several budget conditions, but every review-clearable condition resolves through the same budget-native task.

Signed-device use has now proved the native Screen Time behavior. It also exposed a cadence flaw: Budget Detail can offer the unlock review whenever a restriction exists, even when the user did not just come from a shield. The next refinement is activation-aware prompting, not more permission or shield work.

## Job Delivery
- Job: `review-budget-reality-before-spending`
- Step: `choose-intentional-access`
- Current score: 3.5
- Expected delivery change: 3.5 -> 4 if signed-device verification proves one-shot shield activation, quiet ordinary visits, and foreground reapply.
- Evidence required: native shield deep link opens Budget Detail with unlock dock, `Open for now` clears access for the window, `Keep blocked` leaves access blocked, and review receipts record the chosen outcome.
- Map update trigger: after the one-shot shield handoff is verified on device and ordinary Budget Detail visits stay quiet.

## Cadence Refinement

Restated in user voice: when a spending app has just sent me to Kwilt Money, show me one timely budget decision; otherwise, do not keep asking me to skip or approve the same review just because the restriction still exists.

The review offer should appear only when:

- the native shield primary action records a fresh handoff and opens Kwilt Money, or
- the user explicitly starts a test review from Screen Time Controls.

The offer should not appear merely because:

- a restriction currently exists,
- Kwilt Money foregrounds normally,
- the user browses Budget Detail,
- the user already dismissed or answered the current handoff.

First-release timing contract:

- A native shield handoff is fresh for two minutes.
- Reading a fresh handoff consumes it once.
- Stale handoffs are discarded.
- `Open for now` continues to use the policy's access window.
- `Keep blocked` keeps the shield active without scheduling another in-app offer.
- Exact re-shielding while Kwilt Money remains in the background is a separate DeviceActivity scheduling problem.

## User-Facing Model
The user should never have to understand policy internals.

They only need four answers:

1. Why am I paused?
2. What budget do I review?
3. What button do I tap?
4. What happens after?

Canonical blocked-app copy:

- Shield: `Review Shopping to open Amazon.`
- Budget dock reason: `Amazon is paused because Shopping is at 95%.`
- Primary action: `Open Amazon for now`
- Secondary action: `Keep blocked`
- Open receipt: `Amazon is open for 20 min.`
- Blocked receipt: `Amazon stays blocked.`

## Product Behavior
Budget App Unlock Review introduces two connected layers.

Setup layer:
- The user chooses a budget/app pairing.
- Normal setup uses presets, not rule chips.
- Presets include:
  - `Always review first`
  - `When this budget is hot`
  - `At 95% used`
  - `When over`
  - `When transactions need review`
- Advanced details such as exact threshold, unlock window, and condition list are secondary.

Unlock layer:
- A blocked app routes to the relevant Budget Detail page.
- Budget Detail renders an unlock dock near the meter when route state includes an active unlock target.
- The dock shows one clear reason and two actions.
- `Open for now` records `opened_for_now` and reconciles Screen Time.
- `Keep blocked` records `left_blocked` and reconciles Screen Time without clearing access.

## Reductive UX/UI Direction
Build the unlock dock as a compact page-native action surface, not a modal and not a card inside another card.

Recommended hierarchy:
- Existing budget meter remains the visual anchor.
- Unlock dock sits immediately below or beside the meter in the first viewport.
- Reason sentence is the only explanatory text.
- Primary action is full-width or visually dominant.
- Secondary action is quiet but equally legitimate.
- Receipt replaces the dock after action.

Avoid:
- rule chips in the unlock task,
- a list of all triggered conditions,
- celebratory unlock effects,
- parental-control language,
- shame words like `failed`, `bad`, `denied`, `allowance`, or `permission`.

## Domain Model Direction
Extend the existing model rather than replacing it.

Additions:
- A threshold preset/condition that can express `At 95% used`.
- A policy-level distinction between review-clearable triggers and hard-stop triggers.
- A route-state shape for `unlockTarget`, `unlockReason`, and source shield context.
- A reason summarizer that picks one user-facing sentence from active restrictions.

Preserve:
- `BudgetReviewEvent`.
- `opened_for_now` and `left_blocked`.
- `isBudgetReviewOpenOutcome` as the freshness gate.
- Native bridge ownership of opaque Screen Time selections.

Important product decision:
- Default `over_budget` should be review-clearable unless the user explicitly chooses a hard-stop preset. Hard stops should not be accidental.

## Implementation Plan
1. Add policy preset helpers in `src/domain/app-gate.ts`.
2. Extend `AppControlCondition` or policy settings with a threshold trigger that supports the 95% preset.
3. Add tests for threshold restriction evaluation and freshness behavior in `src/services/budgetScreenTime.ts`.
4. Add a reason summarizer that converts active restrictions into one sentence.
5. Add Budget Detail route-state handling for an unlock task.
6. Add the unlock dock to `app/budgets/[budgetId].tsx`.
7. Route `/review` or shield deep links into Budget Detail with budget/app context.
8. Simplify `app/app-control/[budgetId].tsx` so normal setup shows presets first and moves condition chips behind advanced/debug controls.
9. Update shield copy/deep-link payload to target the budget unlock route.
10. Verify in simulator for UI/routing, then in TestFlight/signed device for real shield behavior.

## Acceptance Criteria
- Budget Detail can render an unlock dock for a specific app target.
- The dock answers why paused, what budget to review, what action to take, and what happens after.
- `Open for now` records `opened_for_now`.
- `Keep blocked` records `left_blocked`.
- Only open outcomes satisfy Screen Time freshness.
- A 95% threshold preset can trigger a review-clearable block.
- Over-budget behavior is explicitly review-clearable or hard-stop; it is not implicit.
- App Controls exposes presets before advanced rule details.
- Shield copy points to the relevant budget, not generic settings.
- Simulator proves the UX path.
- Signed-device verification proves the actual Screen Time path before this becomes permanent.
- The native shield action writes a one-shot review-request marker into the shared App Group.
- Foreground sync consumes only a fresh marker and routes to one matching budget review.
- A normal foreground or Budget Detail visit with an active restriction does not show the unlock guide.
- Closing or answering the guide clears its route activation so returning to the page does not repeat it.
- The explicit Screen Time test-review action still opens the guide.

## Spec Refinement
Clear enough to build:
- The chosen surface is Budget Detail.
- The chosen setup model is preset-first.
- The chosen unlock model is a review receipt with two outcomes.
- The first polished slice can remain Shopping/Amazon.

Needs product decision before permanent release:
- Whether hard-stop is present in V1 or deferred.
- Whether the first threshold preset is fixed at 95% or user-editable behind advanced controls.
- Whether `/review` remains as a fallback route or is fully collapsed into Budget Detail.

Assumptions made:
- The first shippable learning slice can use one global native FamilyActivity selection.
- Threshold, pace, and needs-review triggers should all resolve through the same unlock dock.
- Unlock feedback should be quiet, not celebratory.

Verification:
- `npm run job-delivery:check`
- `npm run test:forecast`
- targeted unit tests for policy/reason helpers
- simulator walkthrough of Budget Detail unlock state
- signed-device Screen Time walkthrough before release confidence

Cadence refinement assumptions:
- Two minutes is long enough for an iOS shield-to-app handoff and short enough to reject a stale request.
- The first active restriction is an acceptable destination while native Family Controls tokens remain intentionally opaque.
- Exact access-window expiry belongs in a later native scheduling slice.
