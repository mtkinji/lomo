# Design Loop: budget-line-items-reductive

## Frame

User request:

> Simplify the budget line items. They feels not too much right now. Robinhood really nails the calm approach to this through topography spacing and color. Copilot does it pretty well (better than us currently). Consider the JTBD and how a few UI/UX tweaks can improve our ability to do it.

Target persona: `Maya`, from `audience-aspirational-family-organizers`.

Relevant JTBD:

- `jtbd-put-intention-before-impulse`
- `jtbd-review-budget-reality-before-spending`
- `jtbd-trust-this-app-with-my-life`

Job step addressed: understand spend reality without making the budget screen feel like a finance dashboard.

Design challenge:

How might we help Maya scan which spending lane needs attention, while preserving Kwilt's calm, non-shaming, non-dashboard voice?

## Current Failure

The row is doing too many visual jobs:

- Percent pill is visually dominant even when the more useful question is "how much is left?"
- Colored fills make the row feel more like scorekeeping than calm review.
- Extra unmatched/review text adds another competing state.
- The progress line, pill, amount text, and warning copy all compete for attention.

## References

Robinhood holdings rows:

- Calm because each row has one left identity, one middle trend, one right state.
- Generous vertical spacing and thin dividers do more work than boxes.
- Color is reserved for state, not decoration.
- Not to copy: trading intensity and P/L psychology.

Copilot category rows:

- Strong scan pattern: category, spent amount, thin progress bar, comparison column.
- Low-copy and dense.
- Not to copy: icon/category taxonomy overload.

## Divergence

### Option A: Percent-Led Meter

Keep the current percent pill and make it lighter. This preserves an easy status cue, but it still makes the row feel like a grade.

### Option B: Remaining-Led Row

Left: budget name and spent context. Middle: thin meter. Right: remaining amount. Percent becomes implicit. This better answers whether the lane has room left.

### Option C: Pace-Led Row

Left: budget name. Middle: small sparkline. Right: pace state such as "steady" or "hot." This is calm, but less concrete and harder to trust without real trend data.

## Convergence

Choose Option B.

Bet:

We are betting that "money left" is the strongest scan target for the budget list. Percent can remain visible in detail screens, but the list should make the next spending decision legible.

Reductive decisions:

- Remove row-level percent pills.
- Remove row-level review copy.
- Keep only name, spent context, thin meter, and remaining amount.
- Use color only on the thin meter and remaining amount.
- Keep typography at regular/semi-bold weights.

Success signal:

The eye should move from page total to chart to budget names to right-side remaining amounts without stopping on warning badges unless a lane is genuinely over/near limit.

