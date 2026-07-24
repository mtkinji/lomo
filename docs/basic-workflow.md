# Basic Workflow Scaffold

## Product loop

The first app flow is deliberately small:

1. The user sees a spend category such as `Shopping`.
2. The app shows percent consumed, dollars remaining, and whether current spend is ahead or under pace.
3. When the user wants to open Amazon, Kwilt Money presents the review screen.
4. The user taps `I reviewed this`.
5. The app records a `BudgetReviewEvent`.
6. A future Screen Time adapter will translate that event into a short access window.

## Domain objects

- `SpendCategory`: the user-facing object, such as `Shopping` or `Groceries`.
- `BudgetLane`: compatibility name for `SpendCategory` in existing code.
- `BudgetMeter`: computed display state for the category.
- Budget plan fields: the limit, period, cadence, and forecast settings attached to a category.
- `AppGateTarget`: an app or site that should wait behind review.
- `BudgetReviewEvent`: the proof that the user reviewed reality before opening the app.

See `docs/concepts/spend-category-ontology.md` for the canonical product language.

## Not in this slice

- Bank integrations.
- Plaid categorization.
- Real Screen Time entitlements.
- Shared household accounts.
- Email summaries.
- Supabase migrations.

Those belong after the review loop feels useful in hand.
