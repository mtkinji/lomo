---
id: brief-budget-amount-adjustment
title: Budget Amount Adjustment
status: draft
audiences: [audience-aspirational-family-organizers]
personas: [Maya]
hero_jtbd: jtbd-move-the-few-things-that-matter
job_flow: job-flow-maya-review-budget-reality-before-spending
job_step: see-budget-reality
serves: [jtbd-carry-intentions-into-action, jtbd-trust-this-app-with-my-life, jtbd-review-budget-reality-before-spending]
related_briefs: [brief-category-budget-planning, brief-auto-budget-from-living-target, brief-settings-surface-grammar, brief-prediction-trust-contract]
owner: andrew
last_updated: 2026-07-21
source_repo: mtkinji/kwilt-budget
source_sha: df383c3ac1538dff0a83b43a21ff3e45c024298b
---

> **Money source note:** Promoted from frozen standalone Money product documentation. Preserve its product reasoning, but verify route, implementation, delivery, and release claims against `src/capabilities/money/` and current runtime evidence.

# Budget Amount Adjustment

## Context
Category settings currently shows `Monthly amount` as plan context, but the user cannot change it. The missing capability is core: a wrong amount makes the meter, app-pause triggers, and plan trust feel wrong.

The edit should not be global-settings-only. The user notices the wrong number locally, inside a category. But saving a new amount is a plan-level decision because it can change buffer, over-target state, and trust in the rest of the monthly plan.

## Job Delivery
- Job: `review-budget-reality-before-spending`
- Step: `see-budget-reality`
- Current score: 4
- Expected delivery change: 4 -> 4.5 if a user can correct a category amount while understanding the whole-plan consequence.
- Evidence required: Category settings -> Monthly amount -> Adjust amount -> impact sentence -> save/cancel -> settings reflects new amount.
- Map update trigger: after simulator/TestFlight review proves the impact text is truthful and understood.

## Product Decision
Build a category-started, target-backed amount adjustment flow.

The `Monthly amount` row in Category settings opens a focused adjustment flow. Before the user proposes a number, show up to two distinct guideposts when evidence supports them:

- what recent completed-month spending suggests
- how much room remains inside the current living target before another budget must move

After entry, lead the review with the resulting living percentage and explain how the change is funded:

- unassigned room used
- flexible category amounts changed
- over-target amount when fixed costs and user overrides cannot fit
- missing or stale resource state

Keep actual spend separate: changing the monthly plan never changes or excuses what has already been spent. Do not route every edit to a global planning screen, present history as financial advice, or silently rebalance other categories.

## Persona Empathy
- "I am not trying to optimize every dollar. I just need this category to stop lying to me."
- "If I raise Housing, I need to know whether that uses buffer, pushes us over target, or means something else needs to come down."
- "A category setting should let me maintain the category. A plan change should explain the plan."
- "I trust the app more when it shows the consequence before it saves the change."
- "I need to know whether $400 fits my 70% target, not just whether the app accepts $400."
- "Being over Shopping and setting the whole plan too high are different problems."

## Build Plan
1. Make the `Monthly amount` row in Category settings actionable.
2. Show the current amount and its true source.
3. Show a supported recent-spending guidepost and room-inside-target guidepost when available.
4. Extend the preview result with before/after plan facts, not only changed category rows.
5. Lead review with the resulting living percentage and the funding explanation.
6. List every changed category and no unchanged categories.
7. State that actual month-to-date spend does not change.
8. Persist the new category amount as a deliberate user override through the existing plan-promotion path.
9. Return to Category settings with the updated amount visible.

## Copy Direction
- `Current` / `$200 · Set by you`
- `Recent average` / `$360/mo · 3 months`
- `Plan room` / `Up to $315`
- `72%` / `of income planned`
- `70% target` / `$140 over · 2 pts`
- `Other budgets`
- `Spent this month` / `$327`
- `Kwilt needs current income before it can check this against your living target.`

## Acceptance Criteria
- `Monthly amount` is discoverably actionable from Category settings.
- The adjustment flow does not look like a generic settings text field.
- Saving updates the category amount used by Summary/detail meters.
- Spending evidence, planned capacity, and actual spend are visibly distinct.
- The user sees the resulting living percentage and dollar variance before saving.
- Every automatic flexible-budget change is named before saving.
- Missing-resource states do not calculate against zero income.
- Fixed costs and user overrides are not silently reduced.
- No exact amounts, merchant names, or transaction details are tracked in analytics.
- Simulator or TestFlight review proves the row, flow, impact copy, save, cancel, and return path.

## Spec Refinement
Resolved by the current system:

- `getActiveLivingPlan` is the authoritative source for resource basis, target, planned, unassigned, over-target, living percentage, and allocation provenance.
- `budget_living_plan_overrides` already records durable user overrides.
- `previewLivingPlanOverride` is the correct hypothetical path, but its response must add before/after plan facts.

Remaining implementation question:

- Which existing evidence helper should produce a privacy-safe, completed-period recent-spending guidepost without creating a second forecasting definition?

## UI Contract

- Job: When a category amount looks unrealistic, the user needs to choose a more believable amount and understand its whole-plan consequence, so the category meter and living target remain trustworthy together.
- Primary action: `See impact`, followed by a consequence-specific apply action such as `Apply changes` or `Save anyway`.
- Must show: current amount and source, supported recent-spending guidepost, largest amount that fits without moving another budget, resulting planned-income percentage, target variance, every changed category, and unchanged month-to-date spend.
- Reveal later: affected-category rows and funding explanation after the user proposes an amount.
- Must not add: a global planner, a magic recommendation, a chart, a target editor, financial advice, or hidden rebalancing.
- Reuse map: amount flow -> `BottomDrawer`; entry point -> `SettingsRow`; input -> existing amount `TextInput`; category changes -> existing preview rows; state and persistence -> active living plan, override preview, and atomic promotion.
- Behavior sources: completed-period spending -> canonical transaction evidence; plan room and target outcome -> active/candidate living-plan facts; changed budgets -> candidate comparison; actual spend -> current category snapshot.
- Unresolved decisions: none that block the learning slice; omit recent-spending guidance when fewer than two completed periods exist.
- Required states: context loading, ready guidance, no spending guidepost, blocked/stale plan, unchanged proposal, reallocating proposal, over-target proposal, saving, saved, and refresh failure.
- Proof path: Summary -> Shopping -> Category settings -> Monthly amount on the iPhone 17 simulator; exercise keyboard, impact review, back, apply, and persisted return.

Deferred decisions:

- this-month-only adjustments
- full global allocation page
