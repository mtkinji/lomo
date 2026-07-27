---
id: brief-category-rollovers
title: Category Rollovers
status: draft
audiences: [audience-aspirational-family-organizers]
personas: [Maya]
hero_jtbd: jtbd-move-the-few-things-that-matter
job_flow: job-flow-maya-review-budget-reality-before-spending
job_step: see-budget-reality
serves: [jtbd-trust-this-app-with-my-life, jtbd-review-budget-reality-before-spending, jtbd-carry-intentions-into-action]
related_briefs: [brief-budget-detail-month-scoped-activity, brief-plaid-transaction-backed-meter]
owner: andrew
last_updated: 2026-07-06
source_repo: mtkinji/kwilt-budget
source_sha: df383c3ac1538dff0a83b43a21ff3e45c024298b
---

> **Money source note:** Promoted from frozen standalone Money product documentation. Preserve its product reasoning, but verify route, implementation, delivery, and release claims against `src/capabilities/money/` and current runtime evidence.

# Category Rollovers

## Product Decision

Add optional per-category rollover so a monthly category can carry prior-month under- or overspend into the next month as budget math.

This contract applies only to categories with a `monthly` funding rhythm. It is not the lumpy-spending reserve model. A `reserve` category carries accumulated availability by definition, receives a stable monthly contribution, and forecasts coverage of an optional expected need. Do not layer the monthly rollover toggle onto a reserve category.

## JTBD

When Maya checks a category, she wants this month's room to reflect last month's real over/under amount, so that the meter answers the current spending decision without manual mental math.

## User Experience

- Category budget settings include a simple toggle: `Roll over month to month`.
- Rollover is off by default for existing categories.
- When enabled, current available room includes prior-month carryover.
- Summary and category detail use the same rollover-adjusted meter state.
- Category detail shows compact facts: `Monthly budget`, `Rolled in`, `Spent`, and `Rolls out`.
- Rollover values do not appear as transaction activity rows.
- Negative carryover uses plain copy such as `-$18 from June`, not warning language.

## Data Behavior

- Store rollover as a category budget-plan policy, separate from transaction evidence.
- Compute carry-in from the previous selected month when rollover is enabled.
- Positive prior-month remainder increases current available room.
- Prior-month overspend reduces current available room.
- Carry-out equals effective budget for the selected month minus counted outflow spend.
- Missing historical data should produce no carry-in rather than fabricated values.

## Buildable Slice

- Add a pure rollover computation helper with unit/smoke coverage.
- Extend category budget settings with a durable rollover policy.
- Update selected-month meter math to include rollover adjustment.
- Update Summary category cards to consume shared rollover-adjusted meter state.
- Add category detail carry-in/carry-out facts.
- Add preview or fixture data for one rollover-enabled category.

## Acceptance Criteria

- A category with rollover off behaves exactly like current monthly budget math.
- A category with positive prior-month remainder shows increased current available room.
- A category with prior-month overspend shows reduced current available room.
- Summary and category detail agree for the same category/month.
- Rollover is not rendered as a transaction row.
- `npm run test:forecast` passes with rollover cases.
- `npm run lint` passes or only reports known unrelated baseline issues.
- iPhone simulator review proves the setting and meter copy fit without crowding Summary or category detail.

## Job Delivery

- Job: `review-budget-reality-before-spending`
- Step: `see-budget-reality`
- Current score: 4
- Expected delivery change: 4 -> 4.25 if simulator/TestFlight review proves rollover categories make current room more truthful without adding dashboard clutter.
- Evidence required: Summary and category detail agree for positive and negative rollover examples; `test:forecast` covers the math.
- Map update trigger: after runtime verification and at least one native build review.

## Spec Refinement

Clear enough to implement with three product assumptions:

1. First release uses one visible policy, `Roll over month to month`, carrying both positive and negative differences.
2. Manual rollover adjustments, transfers, caps, and expiration are deferred.
3. Rollover applies to monthly categories only until cadence behavior is explicitly designed.
