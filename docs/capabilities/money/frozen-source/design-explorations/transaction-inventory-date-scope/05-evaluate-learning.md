# Evaluate Learning: transaction-inventory-date-scope

## Learning Questions

1. Does the visible date scope prevent the "my transactions disappeared" interpretation?
2. Is `This month` the right default, or should the app open to latest completed month when the current month has no rows?
3. Does the complete inventory make budget meters feel more trustworthy?
4. Does requesting 730 days create acceptable sync latency and row volume?

## Evidence Plan

Supporting evidence:
- In simulator/self-use, Accounts counts and Transactions inventory counts are consistent.
- A user can switch from empty current month to `Last 12 months` and see rows.
- Budget meters still reflect current-period spend.
- Sync succeeds with Sandbox and returns historical rows.

Disconfirming evidence:
- Users think the date scope is a budget filter.
- Users need custom ranges immediately.
- The full inventory makes the tab feel like a generic ledger instead of budget evidence.
- Sync becomes noticeably slow or flaky.

## Instrumentation

For now, use local QA notes and manual screen observation. If this moves beyond local/TestFlight, add events for date-scope changes using non-sensitive properties only: scope id, visible count bucket, loaded count bucket, and source kind. Do not log merchant names, amounts, account labels, or transaction ids.

## Decision Rule

Proceed if the next simulator pass shows historical rows are available, current scope is explicit, and no meter behavior regresses. Revisit with a month summary only if the ledger still feels under-contextualized.
