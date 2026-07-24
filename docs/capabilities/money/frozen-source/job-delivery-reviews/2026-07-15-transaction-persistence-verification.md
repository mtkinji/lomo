# Job Delivery Review - 2026-07-15

## Decision

The next highest-leverage build verification is `match-transactions-to-lane`:
prove that a signed-in Sandbox transaction correction persists and changes the
relevant budget meter after reload or refetch.

## Why

The signed-device Amazon unblock learning has already moved
`choose-intentional-access` into reflection. The next trust risk is whether
reviewed transaction truth survives beyond local UI state and actually changes
the meter Maya relies on before spending.

## Source Evidence

- `docs/job-delivery-map.yaml` marks live transaction review assignments as
  possibly locally mirrored before durable backend proof.
- `app/(tabs)/transactions.tsx` updates local review assignments and local
  merchant rules from the transaction drawer.
- `app/budgets/[budgetId].tsx` disables transaction-review callbacks when a
  live connected snapshot is present.
- `src/platform/plaid.ts` has Supabase persistence helpers for transaction
  budget and money-meaning reviews, and persisted matches are read back into
  meter-facing transaction rows.
- `app/transactions/[transactionId].tsx` is the path currently wired to those
  persistence helpers.

## Recommended Verification

Use a signed-in Sandbox account with at least one reviewable outflow:

1. Correct or exclude a transaction from the live transaction detail path.
2. Reload or refetch the connected spend snapshot.
3. Confirm the transaction row still shows the corrected/excluded match.
4. Confirm the affected budget meter changes accordingly.
5. Check whether the Transactions tab, Budget Detail activity sheet, and
   single-transaction route behave consistently.

## Map Decision

Do not change delivery scores yet. If verification fails or confirms that only
`app/transactions/[transactionId].tsx` persists live review changes, update the
map evidence for `match-transactions-to-lane` from a broad
`needs_runtime_check` assumption to a more precise implementation gap.

## 2026-07-15 Follow-Up

The mapped list/detail surfaces have now been wired to the existing live
persistence path:

- `app/(tabs)/transactions.tsx` saves live budget reviews through
  `savePlaidTransactionBudgetReview`, then refetches the connected spend
  snapshot.
- `app/budgets/[budgetId].tsx` keeps Budget Detail activity review actions
  enabled for live snapshots and saves through the same helper.
- Both surfaces avoid falling back to local preview transaction details during a
  live session after refetch.

Local verification passed:

- transaction persistence wiring check
- `npm run lint`
- `npm run test:forecast`
- `npm run job-delivery:check`

The full score-moving proof still requires authenticated Sandbox app/runtime
verification because `npm run plaid:sandbox:e2e -- --check-config` reports
missing E2E auth.
