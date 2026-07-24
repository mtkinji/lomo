---
id: brief-transaction-inventory-date-scope
title: Transaction Inventory Date Scope
status: draft
audiences: [audience-aspirational-family-organizers]
personas: [Maya]
hero_jtbd: jtbd-move-the-few-things-that-matter
job_flow: job-flow-maya-review-budget-reality-before-spending
job_step: match-transactions-to-lane
serves: [jtbd-trust-this-app-with-my-life, jtbd-review-budget-reality-before-spending, jtbd-carry-intentions-into-action]
related_briefs: [brief-accounts-inventory-shell, brief-plaid-transaction-backed-meter]
owner: andrew
last_updated: 2026-07-01
source_repo: mtkinji/kwilt-budget
source_sha: df383c3ac1538dff0a83b43a21ff3e45c024298b
---

> **Money source note:** Promoted from frozen standalone Money product documentation. Preserve its product reasoning, but verify route, implementation, delivery, and release claims against `src/capabilities/money/` and current runtime evidence.

# Transaction Inventory Date Scope

## Product Decision

Transactions is the complete transaction inventory for loaded Plaid and AI spend rows. Current month is the default lens, not the data boundary.

## JTBD

When Maya is checking whether the budget meter is trustworthy, she needs to inspect the transaction evidence without losing the current-month budget context.

## User Experience

- Transactions opens in the standard object inventory pattern.
- The control row includes date scope, filter, and sort.
- Default date scope is `This month`.
- Available scopes are `This month`, `Last 30 days`, `Last 12 months`, and `All history`.
- The supporting line names the source and active scope.
- Counts show visible rows over loaded inventory rows.
- Empty states distinguish no loaded transactions from no transactions in the selected scope/filter.

## Data Behavior

- Plaid Link requests 730 days of transaction history by default.
- Supabase sync continues to store normalized transaction rows.
- The app loads all transaction rows in the configured lookback window, paginated enough for ordinary personal-finance history.
- `ConnectedSpendBudgetSnapshot.transactions` remains current-period rows for budget math compatibility.
- `ConnectedSpendBudgetSnapshot.allTransactions` exposes the complete loaded inventory for Transactions.
- Budget detail continues to show current-period evidence.

## Buildable Slice

- Update `create-plaid-link-token` default `PLAID_TRANSACTIONS_DAYS_REQUESTED` to 730 and clamp to Plaid's 1-730 day range.
- Update live snapshot typing/building to expose `allTransactions`.
- Update Transactions tab to derive its inventory from `allTransactions`, apply budget context if present, then apply date scope/filter/sort locally.
- Add date-scope menu using the existing inventory control/menu components.
- Keep the existing transaction detail sheet and review assignment behavior.

## Acceptance Criteria

- New Plaid Items request up to 730 days of transaction history unless env overrides with a valid lower number.
- The Transactions tab can show historical rows when current month has none.
- The active date scope is visible in copy and control state.
- `0 / 0` is not shown when the app has loaded historical transactions.
- Budget meters and budget detail transaction evidence remain current-period scoped.
- `npm run lint` passes.

## Spec Refinement

Clear enough to build with one product assumption: default scope remains `This month` even if it is empty on the first day of a month. That preserves the budget-reality job and makes the empty state teach the scope rather than silently jumping to a different month.
