# Learning Release: budget-detail-month-scoped-activity

## Concept To Build

Budget Detail becomes a selected-month budget receipt: the month label controls the meter, stats, chart, and activity evidence, while the activity section uses shared inventory controls for rows inside that selected month.

## Capability Delta

Today, the user cannot:
- See Budget Detail as clearly scoped to a month.
- Move from this month to last month without leaving the detail context.
- Understand a sparse first-of-month activity list as expected state.
- Preview next month without confusing expected activity with posted transactions.

After this release, the user can:
- See the selected month on Budget Detail.
- Move one month backward or forward.
- See activity rows scoped to the selected budget month.
- Use shared row-level inventory controls for the selected month's budget evidence.
- Follow `View all` into Transactions with the budget and month context intact.

Still intentionally not supported:
- Rollover editing.
- Year or calendar view.
- Custom date ranges.
- Saved filters.
- Full future-month cash-flow planning.

## User Experience

Maya opens a budget detail from Budget. Near the meter, she sees a compact month selector such as `< Jun   Jul 2026   Aug >`. The page title remains the budget name; the month is the selected period, not another title.

For the current month, the meter remains live. Activity is labeled `July activity`; if there are no rows, the empty state says `No July Housing transactions yet.` If prior-month rows exist, a small action lets her view the prior month.

For a past month, the page reads as an actual receipt: spent, budget, over/under, elapsed complete, and the posted transactions for that budget month.

For a future month, the page reads as a preview: planned budget, scheduled/expected spend, rollover-in if available, and no posted activity unless dated rows already exist. Future evidence is labeled `Expected`, not `Recent`.

The activity section uses the shared inventory bar for row-level controls such as review state and sort. Date scope is not duplicated there because the page month already controls the period.

## Existing Product Relationship

This enhances Budget Detail and the existing transaction inventory connection. It does not replace Transactions. Transactions remains the complete ledger inventory with date-scope controls. Budget Detail uses transactions as period evidence for one budget.

## Buildable Slice

Must be real:
- Selected month state on Budget Detail, defaulting to the current month.
- Month selector UI with previous/current/next affordances.
- Period-specific activity label and empty state.
- Activity rows filtered to the selected budget and selected month.
- Shared inventory control bar above activity with row-level controls only.
- `View all` link that carries budget id and selected month/date scope into Transactions.
- Past month support using loaded transaction rows.

Can be thin or temporary:
- Future month meter can use current budget settings plus scheduled-spend forecast where available.
- Rollover values can be omitted or shown as unavailable until durable rollover settings exist.
- Month selector can be adjacent-month only.
- Preview fixture data can stand in for selected-month historical rows if live rows are not available in local preview.

Intentionally excluded:
- Full rollover model or editing UI.
- Full planning calendar.
- Multi-budget comparison.
- New account-connection prompts.
- In-app educational explainer card.

## Release Channel

Local build.

Rationale: the main learning is interaction clarity in the simulator on real Budget Detail screens, especially July 1 sparse data and loaded historical transaction rows. This should be proven locally before broadening the data model.

## Brand-Goodwill Guardrails

- Use receipt-like labels, not finance-analysis language.
- Keep month scope visible and compact.
- Do not show future expected rows as posted transactions.
- Do not add nested cards or explanatory panels.
- Keep Budget Detail activity rows quieter than Transactions inventory rows.
- Preserve the drawer for transaction metadata and review actions.

## Reversibility

The release can be hidden by removing the month selector and returning Budget Detail to current-month-only activity. Row-level inventory controls can remain shared. No irreversible data migration is required in the learning release if selected-month history is derived from loaded transaction rows.

## Permanent Product Threshold

Promote this to accepted product capability when self-use and simulator review show that a user can understand sparse current-month activity, inspect a prior month, and preview a future month without asking whether the page has changed contexts or whether data is missing.
