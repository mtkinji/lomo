# Diverge: transaction-inventory-date-scope

## Axis

Date scope can be implicit, explicit but lightweight, or promoted into a richer monthly review module.

## Alternative 1: Current Month Ledger Lens

Transactions loads all available rows, but defaults to a visible `This month` scope. The user can switch to `Last 30 days`, `Last 12 months`, or `All history` from the same compact control group used by filter and sort. Counts read as visible over total loaded inventory.

Fit: high. It reuses the inventory shell and keeps budget reality centered on the current period.

Best when: the user mainly wants today's meter to make sense, with historical evidence nearby.

Fails when: users expect a reporting product with custom period comparison.

Anti-pattern check: avoids a dashboard; no streaks, no coaching voice, no new maintained concept.

## Alternative 2: Month Summary Header

Transactions opens with a Copilot-like month card showing income, spending, and a month-review action above the day-grouped rows. The card controls which month the ledger shows.

Fit: medium. It matches a familiar budgeting-app pattern, but it introduces a summary component that competes with Kwilt's budget meters.

Best when: monthly review is the main habit.

Fails when: the user is trying to answer "why does this meter say that?" quickly.

Anti-pattern check: risks drifting into a finance dashboard.

## Alternative 3: Evidence-First Budget Filter

Transactions remains all-time by default, but filters by budget context first. Date scope becomes secondary and is mostly used when the user arrives from a budget detail page.

Fit: medium. It supports budget trust, but under-serves the user's explicit expectation that the Transactions tab contains all transactions.

Best when: transaction review is mostly budget correction.

Fails when: users want ordinary ledger search across all accounts and dates.

Anti-pattern check: could hide history behind too much product-specific logic.

## Alternative 4: Reports-Style Date Range

Transactions gets report-like date presets and custom range controls. The default is `Last 12 months`, with current month as a quick chip.

Fit: low to medium. It matches Monarch Reports, but is heavier than Kwilt's current inventory controls.

Best when: the product is ready for analysis/reporting.

Fails when: simplicity matters more than completeness of reporting controls.

Anti-pattern check: too close to a general finance app for this slice.
