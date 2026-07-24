---
id: brief-category-budget-planning
title: Category Budget Planning
status: draft
audiences: [audience-aspirational-family-organizers]
personas: [Maya]
hero_jtbd: jtbd-move-the-few-things-that-matter
job_flow: job-flow-maya-review-budget-reality-before-spending
job_step: see-budget-reality
serves: [jtbd-carry-intentions-into-action, jtbd-trust-this-app-with-my-life, jtbd-review-budget-reality-before-spending]
related_briefs: [brief-auto-budget-from-living-target, brief-settings-surface-grammar, brief-prediction-trust-contract]
owner: andrew
last_updated: 2026-07-08
source_repo: mtkinji/kwilt-budget
source_sha: df383c3ac1538dff0a83b43a21ff3e45c024298b
---

> **Money source note:** Promoted from frozen standalone Money product documentation. Preserve its product reasoning, but verify route, implementation, delivery, and release claims against `src/capabilities/money/` and current runtime evidence.

# Category Budget Planning

## Context
Budget Detail briefly had a quick-edit drawer for name and monthly amount. That drawer duplicated the newer Category settings page and made budget amount editing look like a simple setting, even though amount changes should eventually relate to the user's living target.

## Job Delivery
- Job: `review-budget-reality-before-spending`
- Step: `see-budget-reality`
- Current score: 4
- Expected delivery change: 4 -> 4 if this cleanup reduces confusion without adding target-backed planning yet.
- Evidence required: Budget Detail title edit opens Category settings; no quick drawer appears; Forecast source still opens the existing settings drawer.
- Map update trigger: after simulator review confirms the removed drawer improves clarity.

## Product Decision
Category settings owns category maintenance. Budget Detail owns current budget reality and future plan adjustments. Do not keep a generic quick-edit drawer between them.

## Build Plan
1. Remove the Budget Detail quick-edit drawer and its local name/amount state.
2. Route the category title edit affordance to Category settings.
3. Add editable category name inside Category settings.
4. Show Monthly amount in Category settings as current plan context, not as the final amount-editing interaction.
5. Keep the overflow `Category settings` route unchanged.
6. Leave Forecast source on its existing drawer.
7. Document the future `Adjust amount` flow as target-backed planning, not a settings field.

## Future Amount Planning
The durable amount-adjustment flow should show:
- current amount
- suggested amount or receipt source
- living-target impact
- unassigned buffer or over-target amount
- what remains intentionally unchanged

## Spec Refinement
Implementation is clear enough for the cleanup slice because it removes duplicate UI and changes navigation only. Deferred decisions are the future MonthlyLivingPlan data model, allocation receipts, and rebalance behavior. Acceptance criteria: no `editBudgetOpen` drawer path remains in Budget Detail, title edit routes to `/app-control/[budgetId]`, Category settings can rename the category, Monthly amount is visible there as context, typecheck passes, forecast smoke tests pass, and simulator/runtime verification is attempted.
