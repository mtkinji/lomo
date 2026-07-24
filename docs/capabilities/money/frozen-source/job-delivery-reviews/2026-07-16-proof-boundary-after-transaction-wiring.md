# Job Delivery Review - 2026-07-16

## Decision

The next highest-leverage move is a `reflect_after_ship` pass on
`choose-intentional-access`: preserve the signed-device Amazon unblock learning
and decide whether visible review receipt/history clarity is now the next trust
slice.

## Why

`job-delivery:next` now ranks the app-gate reflection highest because
`choose-intentional-access` has signed-device proof: Amazon was blocked, routed
into Kwilt Money, opened the right budget, and unblocked after choosing access.
That makes the remaining gap less about core traversal and more about repeated
use, receipt/history clarity, and trust in why access is open or still blocked.

## Current Proof Boundary

The fuller `job-delivery:review` still recommends `match-transactions-to-lane`
verification. That is still valid, but it is now a runtime-proof task rather
than an implementation recommendation: the mapped list, detail, and Budget
Detail activity surfaces call `savePlaidTransactionBudgetReview` and refetch the
connected spend snapshot after live review changes.

## Evidence

- `npm run job-delivery:check` passed.
- `npm run job-delivery:next` selected `choose-intentional-access` reflection.
- `npm run job-delivery:review` selected live transaction correction proof.
- `app/(tabs)/transactions.tsx`, `app/budgets/[budgetId].tsx`, and
  `app/transactions/[transactionId].tsx` now use the live persistence helper.
- `src/platform/plaid.ts` writes reviewed budget assignments and optional
  merchant rules to Supabase-backed transaction tables.
- `app/review.tsx` has explicit `Open for now` and `Leave blocked` outcomes,
  but recent review proof is still mostly immediate-screen feedback rather than
  durable user-visible history.

## Map Decision

No delivery score change today. The transaction-review evidence in the map is
stale relative to current code, but the score should wait for authenticated
Sandbox runtime proof that a correction persists across reload/refetch and
changes the affected meter.

Recommended future map update, after proof:

- If live transaction proof passes, update `match-transactions-to-lane` evidence
  from broad `needs_runtime_check` to observed runtime proof.
- If app-gate reflection chooses review receipt/history as the next slice,
  update `record-review-proof` and the `app-gate-rehearsal` workflow to make
  that decision explicit.
