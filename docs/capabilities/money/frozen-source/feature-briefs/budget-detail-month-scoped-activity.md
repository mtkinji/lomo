---
id: brief-budget-detail-month-scoped-activity
title: Budget Detail Month-Scoped Activity
status: draft
audiences: [audience-aspirational-family-organizers]
personas: [Maya]
hero_jtbd: jtbd-trust-this-app-with-my-life
job_flow: job-flow-maya-review-budget-reality-before-spending
job_step: see-budget-reality
serves: [jtbd-trust-this-app-with-my-life, jtbd-review-budget-reality-before-spending, jtbd-carry-intentions-into-action]
related_briefs: [brief-transaction-inventory-date-scope, brief-plaid-transaction-backed-meter]
owner: andrew
last_updated: 2026-07-01
---

# Budget Detail Month-Scoped Activity

## Product Decision

Budget Detail is a selected-month budget receipt. Month scope belongs to the page, while the activity inventory bar controls rows inside that selected budget month.

## JTBD

When Maya opens a budget detail, she wants to know which month the budget is explaining and inspect the matching activity evidence, so that sparse first-of-month data or rollover effects feel transparent rather than broken.

## User Experience

- Budget Detail defaults to the current month.
- A compact month selector near the meter lets the user move to the previous or next month.
- The selected month drives the meter, stats, chart, and activity rows.
- Activity is labeled by period, for example `July activity`.
- Empty state distinguishes no selected-month activity from no transaction history.
- The activity section uses shared inventory controls for row-level review/filter/sort behavior.
- Date scope is not duplicated in the activity inventory bar.
- `View all` opens Transactions with the same `budgetId` and selected month context.
- Past months read as actual receipts.
- Future months read as previews with expected or scheduled evidence, not posted transaction history.

## Data Behavior

- Budget Detail needs selected-month state initialized from the current month.
- The detail screen should be able to derive selected-period rows from all budget-matched rows.
- Live data should preserve current-period budget math while exposing enough history for past-month detail.
- Future month preview may use current budget settings, scheduled spend, and rollover values when durable data exists.
- Rollover should be represented as budget math or period adjustment, not as a transaction row.

## Buildable Slice

- Add selected month state and adjacent-month controls to `app/budgets/[budgetId].tsx`.
- Rename `Recent activity` to a period-specific label.
- Filter Budget Detail activity rows by selected month.
- Add shared inventory controls above activity for row-level controls only.
- Keep `TransactionMatchRow` in `context="budgetEvidence"`.
- Add an empty state for selected-month activity.
- Update `View all` params to include selected budget and selected month/date context.
- Ensure the transaction detail sheet receives the scoped row set for the selected month.

## Acceptance Criteria

- On July 1, the page clearly displays `July 2026` or equivalent selected month context.
- If July has no Housing rows, the activity section does not read as a generic empty ledger.
- Switching to June shows June budget activity when rows are loaded.
- Switching to a future month does not show expected items as posted transactions.
- The activity inventory bar does not include a competing date-scope control.
- `View all` lands in Transactions with matching budget/month context.
- Budget Detail rows remain compact evidence rows.
- `npm run lint` passes.

## Spec Refinement

Clear enough to build with two product assumptions:

1. The first implementation can use adjacent-month navigation instead of a full date picker.
2. Durable rollover editing is deferred; next-month support should show scheduled/expected spend and only show rollover values when the current model can compute them truthfully.
