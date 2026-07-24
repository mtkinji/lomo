# Job Delivery Review - 2026-07-20

## Decision

The next highest-leverage move is `verify` on `match-transactions-to-lane`:
prove that a signed-in Sandbox transaction correction persists and changes the
relevant budget meter after reload or refetch.

## Why

`job-delivery:next` still ranks `choose-intentional-access` reflection highest
because the signed-device Amazon unblock path is already verified and has a
high leverage score. That reflection remains valid, but the current unresolved
trust risk is now narrower: whether a reviewed transaction changes the durable
source of truth and all open budget surfaces see the reconciled snapshot.

## Current Evidence

- `npm run job-delivery:check` passed with 1 job, 7 steps, and 27 feature briefs.
- `npm run job-delivery:next` selected app-gate reflection.
- `npm run job-delivery:review` selected live transaction correction proof.
- Current source changes add connected-spend snapshot subscribers in Summary,
  Transactions, Budget Detail, and Transaction Detail.
- `src/platform/plaid.ts` now publishes the exact rebuilt connected-spend
  snapshot after `getConnectedSpendBudgetSnapshot`.
- `npm run test:forecast` passed, including assertions that connected snapshot
  subscribers receive the reconciled snapshot and unsubscribe cleanly.

## Proof Boundary

Local code and smoke coverage now reduce the risk that one screen keeps stale
transaction-category state after another screen refreshes the snapshot. They do
not prove the live user job yet. The score-moving proof still requires an
authenticated Sandbox run:

1. Correct or exclude a live Sandbox transaction.
2. Reload or refetch the connected-spend snapshot.
3. Confirm the transaction row still shows the corrected or excluded match.
4. Confirm the affected budget meter changes on Summary and Budget Detail.
5. Confirm Transactions and the single-transaction route show the same truth.

## Map Decision

Do not change delivery scores today. A map update is warranted only after the
authenticated Sandbox proof above passes or fails. If it passes, update
`match-transactions-to-lane` evidence from broad `needs_runtime_check` to
observed runtime proof and revise the current friction around local mirroring.
