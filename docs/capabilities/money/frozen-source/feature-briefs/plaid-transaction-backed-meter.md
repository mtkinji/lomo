---
id: brief-plaid-transaction-backed-meter
title: Inferred Transaction-Backed Budget Lanes
status: draft
audiences: [audience-aspirational-family-organizers]
personas: [Maya]
hero_jtbd: jtbd-put-intention-before-impulse
job_flow: job-flow-maya-review-budget-reality-before-spending
job_step: match-transactions-to-lane
serves: [jtbd-put-intention-before-impulse, jtbd-carry-intentions-into-action, jtbd-trust-this-app-with-my-life, jtbd-review-budget-reality-before-spending]
related_briefs: [brief-budget-reality-gate]
owner: andrew
last_updated: 2026-06-24
---

# Inferred Transaction-Backed Budget Lanes

## Context

Kwilt Money's first value unit is a spend-aware review gate. The current app can show a fixture-backed meter, but users need to create their own lanes and have Kwilt infer which transactions belong in them. This brief defines the first Plaid dev-mode integration test as a product slice: one user-created lane is kept current by suggested and confirmed transaction assignments.

## Target audience

`audience-aspirational-family-organizers` - households trying to keep ordinary spending decisions aligned without running a finance dashboard.

## Representative persona

Maya wants a calm review before opening a spend-triggering app. She will only trust that pause if the lane is in her own language, the meter is current, and the app does not make her manually classify every purchase.

## Design challenge

How might we help Maya create a budget lane and have Kwilt infer the right transactions for it, while preserving control, trust, and Kwilt's calm non-dashboard product shape?

## Product decision

Build `Lane First With Suggested Matches`.

Plaid is not introduced as a transaction browser. It is introduced as a data source that lets Kwilt suggest which transactions belong in a user-created lane. Confirmed assignments update the Kwilt-owned meter.

## User experience

1. User creates a lane, initially `Amazon and household extras`.
2. User sets amount, period, and optional hints such as merchant/app/account/category.
3. User connects one account through Plaid Link.
4. User runs a transaction sync.
5. Kwilt suggests matching transactions for the lane.
6. User accepts the suggestion set or corrects obvious misses.
7. Confirmed assignments update spend, remaining runway, pace, and sync freshness.
8. User reviews that meter before opening Amazon.

## App objects

- `BudgetLane`
- `BudgetPeriod`
- `BudgetMeterSnapshot`
- `AppGateRule`
- `BudgetReviewEvent`
- `FinancialConnection`
- `FinancialAccount`
- `ProviderSyncState`
- `ProviderTransaction`
- `NormalizedTransaction`
- `LaneInferenceHint`
- `MeterAssignmentRule`
- `AssignmentSuggestion`
- `TransactionMeterAssignment`
- `MeterLedgerEntry`

## Technical shape

Create a `FinancialDataProvider` boundary and implement Plaid first.

Server-side functions:

- `create-plaid-link-token`
- `exchange-plaid-public-token`
- `sync-plaid-transactions`
- `infer-transaction-assignments`
- `recompute-budget-meter`

Mobile app responsibilities:

- Ask the server for a Link token.
- Open Plaid Link.
- Send the returned public token to the server.
- Create and edit a lane.
- Capture optional inference hints.
- Show connection/sync status.
- Show suggested matches in a lightweight accept/correct flow.
- Render the recomputed meter.

Security requirements:

- Plaid client secret and access tokens never enter the mobile app.
- Request only `transactions`.
- Store provider identifiers separately from Kwilt product objects.
- Keep raw provider payloads out of user-facing UI.
- Treat provider categories as inference inputs, not budget source of truth.

## Acceptance criteria

- A dev user can create one budget lane with amount and period.
- A dev user can create a Plaid Link token from the server.
- The Expo app can complete Link and receive a public token.
- The server can exchange the public token.
- A financial connection and selected account are persisted.
- First transaction sync runs with a null cursor.
- Later sync can reuse the stored cursor.
- Transactions normalize into Kwilt-owned rows.
- Lane hints create suggested assignments.
- Confirmed assignments create meter ledger entries.
- A user can correct a suggested assignment without mutating the source transaction.
- After a correction, the app can offer to apply the same budget match to similar merchant/account transactions.
- The existing meter screen uses ledger-backed spend.
- The review screen shows the ledger-backed meter and sync freshness.
- No Plaid secrets or access tokens are stored in app state, logs, or AsyncStorage.

## Out of scope

- Full transaction ledger.
- AI categorization.
- Multiple connected institutions.
- Multi-lane inference management.
- Split transactions.
- Shared household setup.
- Production-visible release.
- Screen Time changes.
- Plaid products other than Transactions.

## Sources checked

- Plaid React Native Link docs: https://plaid.com/docs/link/react-native/
- Plaid Transactions API docs: https://plaid.com/docs/api/products/transactions/
- Plaid Sandbox docs: https://plaid.com/docs/sandbox/
