# Spend Category Ontology

## Why This Exists

Kwilt Money is not a general finance dashboard. It helps a person see spend
reality before a spending decision. To keep that product shape clear, use these
terms consistently in user-facing copy, product docs, and new code.

## Canonical Terms

### Summary

`Summary` is the month-level surface. It answers: how is this month going?

Use `Summary` for the main tab and page shell. Do not call the tab `Budgets`.

### Category

`Category` is the user-facing object. Examples are `Groceries`, `Shopping`,
`Housing`, `Restaurants`, `Car`, and `AI tools`.

A category is the thing a person taps to inspect. In conversation, this should
sound natural: "Open the Groceries category."

### Budget

`Budget` is the plan attached to a category, not the primary object. It includes
the limit, period, cadence, rollover behavior, forecast settings, and threshold
rules that make the category useful as a meter.

Prefer phrases like `monthly budget`, `budget limit`, or `budget plan` when the
amount/constraint is the subject.

### Meter

`Meter` is computed display state for a category in a period: percent used,
spent, remaining, pace, forecast, and risk.

### Transaction

`Transaction` is evidence. Transactions are assigned to a category, and those
assignments make the category meter trustworthy.

### Provider Category

Provider categories, such as Plaid personal finance categories, are hints. They
are not the user's category. Never mutate provider category fields to express a
Kwilt category assignment.

### Rule

Rules attach future behavior to a category. Transaction rules assign similar
evidence to the category. App-control rules decide when a spend-triggering app
should wait behind the category meter.

## Code Mapping

New code should prefer category-first names:

| Product term | Preferred code term | Existing compatibility term |
| --- | --- | --- |
| Category | `SpendCategory` | `BudgetLane` |
| Category definition | `SpendCategoryDefinition` | `BudgetDefinition` |
| Category group | `SpendCategoryGroup` | `BudgetGroup` |
| Meter | `BudgetMeter` | `BudgetMeter` |
| Budget plan fields | `budgetCents`, `cadence`, forecast fields | same |
| Transaction assignment | `BudgetMatch` for now | `BudgetMatch` |

Existing route and storage names such as `/budgets/[budgetId]`, `budget_id`,
and `BudgetMatch` may remain until a dedicated migration is worth the churn.
When touching those areas, add category-facing names at the boundary rather than
renaming persistence in place.

## Naming Rules

- User-facing navigation: `Summary`, not `Budgets`.
- User-facing cards and detail entry points: `category`.
- User-facing amount/limit controls: `budget`, `monthly budget`, or `budget limit`.
- Transaction review: assign or apply to a `category`.
- Provider classification: `provider category` or `Plaid category`.
- App controls: "show this category before the app opens" unless the limit itself
  is the condition, such as "pause when this category is over its budget."

## Anti-Patterns

- Do not use `budget category`; it collapses two concepts.
- Do not describe the Summary tab as a list of budgets.
- Do not treat Plaid categories as the source of truth for Kwilt categories.
- Do not rename persistence or deep-link routes just to make labels cleaner.
- Do not add a separate category taxonomy UI unless it helps the review-before-
  spending job.
