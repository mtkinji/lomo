# Evaluate Learning: transaction-display-names

## Learning Questions

- Does a user-owned display name make ugly transaction rows easier to recognize later?
- Does preserving the raw bank description keep the experience trustworthy?
- Is one-off naming enough, or do recurring ACH/payroll/rent rows need similar-name reuse immediately?
- Does the edit affordance feel like a natural part of transaction review or like extra clutter?
- Does any user confuse display names with source truth?

## Evidence Plan

Supporting evidence:

- Andrew can rename a real ugly transaction in TestFlight and recognize it later in Transactions and budget activity.
- The original bank descriptor remains easy to find on detail.
- Clearing the display name cleanly restores the source-derived label.
- Category assignment and budget totals do not change after rename.
- Similar-name reuse, if included, previews affected rows clearly.

Disconfirming evidence:

- The user cannot tell what came from the bank.
- The rename affordance distracts from category review.
- Display-name rules overmatch unrelated transactions.
- The feature creates pressure to manually curate every transaction.

Brand-goodwill evidence:

- Copy stays factual and quiet.
- No source descriptors, merchant names, account masks, or amounts are emitted in analytics.
- The feature feels reversible and user-owned.

## Instrumentation

Useful:

- Count rename saves, clears, and similar-name rule saves without merchant/amount/account payloads.
- Manual self-use notes for the first ugly source-name examples.
- Verification screenshots for detail, inventory, and budget activity before/after rename.

Avoid:

- Raw transaction names.
- Exact amounts.
- Account masks.
- Provider payloads.
- Event names that imply source truth was modified.

## Decision Rule

Proceed to permanent implementation if the TestFlight path proves the rename is recognizable across surfaces, raw evidence remains understandable, and no category/totals behavior changes.

Revise if users need a stronger source/evidence label, if similar-name reuse is too risky, or if the first UI adds clutter to transaction review.

Retire if the feature becomes manual ledger grooming instead of relieving occasional provider-name failures.

## Expected Next Action

Build the one-off persisted display-name slice first, then add similar-name reuse only if the first real ugly transactions are recurring enough to justify it.
