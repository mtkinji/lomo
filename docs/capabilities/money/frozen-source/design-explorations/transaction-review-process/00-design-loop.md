# Design Loop: transaction-review-process

## Frame

Andrew wants the transaction review process to learn from Copilot without copying jobs Kwilt Money does not need.

Target user: `Maya`, an aspirational family organizer who wants spending reality before impulse, not a finance dashboard.

Active jobs:
- `jtbd-put-intention-before-impulse`
- `jtbd-carry-intentions-into-action`
- `jtbd-trust-this-app-with-my-life`
- `jtbd-review-budget-reality-before-spending`

System posture: `Fit the system`.

Current system facts:
- Transactions are normalized into `TransactionReviewRow`.
- Plaid data remains the source transaction truth.
- `BudgetMatch` stores Kwilt Money's interpretation separately from Plaid.
- The transaction drawer now uses a reusable bottom drawer.
- Budget rows and meters already depend on whether transactions are matched to budgets.

Design challenge:
How might we help Maya correct which budget a transaction counts toward, while preserving live Plaid truth and keeping the app focused on budget reality rather than category bookkeeping?

## Copilot Translation

Copilot reviews financial categories. Kwilt Money reviews budget interpretation.

Keep:
- Transaction detail drawer.
- Clear merchant, date, account, and amount.
- One explicit review action.
- Follow-up prompt for similar transactions.

Change:
- `Category` becomes `Budget match`.
- `Review` means "this budget interpretation is good enough for the meter."
- Similar-change prompt should be merchant-scoped first, not broad category-scoped.

Cut:
- Split.
- Tag.
- Goal.
- Note-first editing.
- Broad auto-rules from one category tap.

## Divergence

### A. Ledger Editor
Every transaction opens a full editing sheet with budget, split, tags, notes, and account metadata.

Fit: Low. It copies a finance app and makes Kwilt feel like a ledger.

### B. Review Queue
A dedicated inbox walks through unmatched and low-confidence transactions one by one.

Fit: Medium. Useful later, but heavy before the app proves the value of a budget-backed meter.

### C. Budget-Match Drawer
The existing transaction drawer lets the user confirm or change the budget match. If similar merchant transactions exist, a second compact drawer asks whether to apply the same budget match to them.

Fit: High. It improves the current surface, preserves the Plaid transaction, and keeps review tied to meter trust.

## Convergence

Chosen slice: `Budget-Match Drawer`.

Capability delta:
- Today, a transaction can be opened, but the review action is not first-class and live Sandbox rows cannot be corrected in the visible flow.
- After this slice, a user can confirm or change a transaction's budget match and optionally apply the same merchant-based change to similar visible transactions.

Accepted trade-offs:
- Local app-state review is enough for the first live Sandbox learning pass.
- Similar detection is merchant-based.
- Rules/future automation are represented by the follow-up pattern, not durable rule persistence yet.

Rejected trade-offs:
- No split/tag/goal controls.
- No broad provider-category bulk action.
- No silent bulk updates.
- No mutation of Plaid category or source transaction fields.

## Learning Release

Concept:
Transaction review is a budget-match confirmation flow that keeps meters trustworthy.

Must be real:
- Budget choices in the drawer.
- Confirm/change current transaction.
- Merchant-similar follow-up sheet.
- Update visible rows after review.

Can be thin:
- Review persistence can be local state for the Sandbox proof.
- Rule creation can wait until the app has a durable budget-assignment table.

Permanent threshold:
Make budget assignments durable in Supabase when the review interaction feels correct against real Plaid Sandbox data.
