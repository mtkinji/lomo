# Converge: Target-Backed Category Adjustment

## Chosen direction
Choose **Two-Guidepost Decision**.

There is no universally correct Shopping budget. Kwilt should show the two constraints it can truthfully know and let Maya make the decision:

1. `Recent spending suggests $360/mo` tells her what ordinary behavior has required.
2. `Up to $315 fits without moving another budget` tells her what the current 70% plan can absorb locally.

If evidence is insufficient, omit the corresponding guidepost instead of inventing it.

## Proposed interaction

### Amount step
- Title: `Shopping budget`
- `Current` / `$200 · From recent spending` or the true source
- Guideposts, when supported:
  - `Recent average` / `$360/mo · 3 months`
  - `Plan room` / `Up to $315`
- Editable amount
- Primary action: `Preview`

### Review step
Render the decision as values, not explanatory prose:

- `Shopping budget` / `$200 -> $400`
- `72%` / `of income planned`
- `70% target` / `$140 over · 2 pts`

Show only other budgets that move:

- `Dining  $500 -> $440`
- `Fun  $300 -> $275`

Keep actual spending as one separate value row:

- `Spent this month` / `$327`

Primary CTA: `Set $400`, `Apply changes`, or `Save anyway`.

## Reductive decisions
- Replace the empty first drawer with guidance; do not add a new planner screen.
- Show two guideposts, not a magic recommendation, score, chart, or slider.
- Show target percentage and dollar variance, not only `unassigned` or `over target` system language.
- Let affected rows explain reallocation; do not add a funding paragraph.
- Do not show every unchanged category.
- Do not change the 70% target here.

## Capability delta
Today, the user can propose an amount and later inspect changed categories, but cannot tell what amount is credible or how the result relates to the income target.

After this change, the user can choose an amount using spending evidence and available plan room, then explain what percentage of income the saved plan uses, whether flexible budgets change, and how far the result sits above or below the 70% target.

Still intentionally unsupported: financial advice, automatic target changes, opaque rebalancing, and month-only adjustments.

## Bet
We are betting that two distinct guideposts plus one plan-outcome sentence will answer “What should this be?” without turning category maintenance into a planning dashboard. If users still cannot choose, revisit with an optional full-plan comparison rather than a stronger algorithmic recommendation.

## Success signal
Given a $200 Shopping plan, $327 already spent, and a proposed $400 amount, a user can accurately say what stays factual, what will change, the resulting share of income versus 70%, and which other budgets move.
