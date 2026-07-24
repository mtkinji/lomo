# Evaluate Learning: Budget Amount Adjustment

## Learning Questions
- Does the `Monthly amount` row feel like the right place to start an edit?
- Does the impact sentence make a category amount change feel safer and more trustworthy?
- Do users still expect a global planning page before they are willing to save?
- Does missing-resource copy preserve trust when Kwilt cannot calculate target impact?
- Does saving an over-target amount feel appropriately user-owned rather than blocked or judged?

## Evidence That Supports The Bet
- In simulator/TestFlight review, the user finds the amount-edit affordance from Category settings without hunting.
- The user can explain whether the change used buffer, exceeded target, or could not be checked.
- The user accepts that no other category changed automatically.
- The flow feels like plan maintenance, not a generic settings form or finance dashboard.

## Evidence That Disconfirms The Bet
- Users ask "where is the full budget plan?" before trusting the local edit.
- Users think saving will rebalance other categories automatically.
- The impact sentence is ignored, misunderstood, or feels like fake precision.
- Users avoid saving because missing-resource states feel broken rather than honest.

## Instrumentation
Track only interaction shape, not sensitive amounts:

- `budget_amount_adjust_opened`
- `budget_amount_adjust_saved`
- `budget_amount_adjust_cancelled`
- `budget_amount_adjust_review_full_plan_tapped`
- impact state bucket: `buffer_remaining`, `over_target`, `missing_resource`, `unknown`

Do not track exact category amounts, transaction amounts, merchant names, account names, or raw income values.

## Decision Rule
Proceed to permanent implementation if the TestFlight review proves:

- the entry point is discoverable
- the impact text is understood
- saving feels deliberate and reversible
- no one expects silent rebalancing

Revise toward a global plan review surface if users repeatedly refuse to save from the local flow because they need to compare categories first.

Simplify toward a plain local edit only if the target-impact states cannot be made truthful with available data.

## Expected Next Action
Write or update the feature brief for `budget-amount-adjustment`, then build the category-started adjustment flow behind the existing Category settings row.
