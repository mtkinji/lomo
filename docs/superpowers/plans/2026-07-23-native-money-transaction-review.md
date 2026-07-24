# Native Money transaction-review plan

**Goal:** Let a signed-in user correct one transaction's category or mark it outside the plan, then prove the result by reloading the authoritative Money snapshot.

## Contract

- Translate the standalone `savePlaidTransactionBudgetReview` behavior from frozen source `df383c3ac1538dff0a83b43a21ff3e45c024298b`.
- Use Kwilt's existing Supabase client and RLS session.
- A category assignment writes `budget_id`, corrected match source, confidence, reason, and review time in one row update.
- “Not counted” writes the excluded match state and explicit `not_counted` money meaning in the same row update.
- Never optimistically alter dollar totals. Reload the complete snapshot after every successful write and retain the last known-good snapshot after failure.
- Merchant-wide rules, similar-transaction bulk changes, income/transfer classification, category creation, and category-plan editing remain later slices.

## Implementation

- Add a pure mutation-payload builder with regression tests.
- Extend `MoneyRepository` with `assignTransactionCategory` and `markTransactionNotCounted`.
- Extend the Money provider with mutation state and authoritative reload.
- Add explicit read-only-detail actions to assign a category or mark a transaction not counted.
- Record the native mutation as an operation with an honest Chat boundary; Chat must not claim it applied the review.

## Verification

- Focused mutation, state, screen, operation, and Chat coverage tests.
- `npm run verify:changed -- --run`.
- Authenticated simulator review/reload proof may use only a user-authorized non-production test transaction. Do not mutate real financial classification merely to demonstrate the button.

