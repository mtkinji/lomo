# Monthly Household Plan

Status: converged through the current solution-design boundary, with the
application change articulated and its core four-screen hierarchy rendered;
not ready for a learning-release plan or implementation brief.

This exploration reframes Kwilt Money around one durable center of gravity:

> The household has one monthly amount it intends to plan around.

Kwilt may recommend that amount from income, recent spending, runway, or other
supported evidence. The person does not need to choose or administer a
budgeting methodology. Once accepted, the amount governs committed, protected,
and flexible category contributions.

The exploration also defines how the plan handles ordinary lumpy spending and
exceptional months:

- category balances may carry forward indefinitely as positive or negative
  adjustments;
- a category may begin carrying from a chosen historical month;
- category or household boundaries may start balances fresh without rewriting
  history;
- a one-time addition may be accepted before or after an unusual expense,
  without changing future months or creating general flexible room; and
- routine transaction-by-transaction funding-source bookkeeping is rejected.

## Artifacts

- [`00-frame.md`](00-frame.md) — corrected user problem, audience, job, and
  system assumptions.
- [`01-yes-and.md`](01-yes-and.md) — adjacencies that elevated the work from a
  savings mode to an evidence-backed household-plan model.
- [`02-diverge.md`](02-diverge.md) — alternatives considered for unusual
  spending and rollover behavior.
- [`03-converge.md`](03-converge.md) — comprehensive accepted-to-date solution
  design, invariants, interaction implications, rejected directions, and open
  questions.
- [`06-application-change.md`](06-application-change.md) — current-surface
  diagnosis, three UI directions, recommended application change, UI contract,
  and complete mockup-state matrix.
- [`07-four-screen-mockup.md`](07-four-screen-mockup.md) — rendered first-use,
  ordinary Summary, signed-carry, and one-time-addition states, plus the visual
  review and next decision boundary.
- [`08-current-app-critique.md`](08-current-app-critique.md) — critique against
  the current runtime and source, Andrew's reactions, corrected hierarchy, and
  remaining implementation questions.
- [`monthly-household-plan-mockups.png`](monthly-household-plan-mockups.png) —
  reviewable 1800 × 1160 revision-three mockup sheet. The editable source is
  [`monthly-household-plan-mockups.svg`](monthly-household-plan-mockups.svg).

## Related Existing Material

- [`../../feature-briefs/auto-budget-from-living-target.md`](../../feature-briefs/auto-budget-from-living-target.md)
- [`../../feature-briefs/income-runway-detection.md`](../../feature-briefs/income-runway-detection.md)
- [`../../feature-briefs/governed-household-money-plan.md`](../../feature-briefs/governed-household-money-plan.md)
- [`../../feature-briefs/category-rollovers.md`](../../feature-briefs/category-rollovers.md)
- [`../category-rollovers/`](../category-rollovers/)
- [`../target-backed-category-adjustment/`](../target-backed-category-adjustment/)
- [`../scary-accurate-prediction-system/`](../scary-accurate-prediction-system/)

Those documents remain useful provenance. This exploration supersedes their
shared assumption that a percentage of normalized income is always the
user-facing center of the plan. It also challenges the separate user-facing
`monthly` versus `reserve` funding-rhythm model.

## Explicit Next Design Work

The current design does not yet answer:

- Where should Kwilt make savings and other available financial resources
  visible?
- Where should the household see the pool of money being decremented while
  living above current income or accepting one-time additions?
- How should confirmed, partial, unavailable, and user-entered balances affect
  runway claims?
- How should the monthly plan, current cash position, and long-term wealth stay
  visibly distinct without becoming a financial dashboard?

Do not create a feature brief or implementation plan until those questions and
the rendered user experience have been reviewed.
