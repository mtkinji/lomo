# Converge: transaction-inventory-date-scope

## Chosen Alternative

Choose `Current Month Ledger Lens`.

## Why

It honors the user's expectation that Transactions contains the full transaction inventory while preserving Kwilt's focus on the current budget reality. It also fits the existing object-inventory shell: one more compact control, clear count metadata, and the same grouped rows.

## Capability Delta

Today, the user cannot:
- Trust the Transactions tab when accounts show transaction counts but the tab shows `0 / 0`.
- Switch from current budget evidence to historical transaction evidence.
- Tell whether an empty list means no data, no current-month rows, or an active filter.

After this release, the user can:
- Load all available Plaid transaction rows within the supported history window.
- See current-month transactions by default with the date scope named.
- Switch to `Last 30 days`, `Last 12 months`, or `All history`.
- Understand visible count versus loaded inventory count.

Still intentionally unsupported:
- Arbitrary custom date picker.
- CSV export/import.
- Cross-month reporting charts.
- Persisted saved views.

## Reductive Decisions

- Add one date-scope control to the existing inventory controls.
- Keep existing filter and sort controls.
- Keep budget meters current-period.
- Keep budget-detail transaction evidence current-period.
- Do not add a monthly summary card yet.
- Do not add date range settings or saved reports.

## System Implications

- Plaid Link should request 730 days by default, because Plaid supports up to 24 months and the user expects at least 12.
- `ConnectedSpendBudgetSnapshot` should expose all loaded transaction rows separately from current-period rows.
- The Transactions tab should apply date scope locally as an inventory filter.

## Activation Path

No onboarding. The active scope label is the teaching moment. If the current scope has no rows but the inventory has history, the empty state should say the selected scope has no transactions and prompt the user to change the date scope.

## Bet

We're betting that a complete inventory with an explicit current-month lens will make budget meters feel more trustworthy without pulling Maya into a finance dashboard. If users still feel lost, revisit by adding a small month summary header rather than adding broader reporting.

## Success Signal

A user can answer: how many transactions are loaded, which date window they are viewing, and how to see older rows.
