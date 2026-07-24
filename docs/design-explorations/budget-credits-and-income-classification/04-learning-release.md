# Learning Release: budget-credits-and-income-classification

## Concept To Build

Let users choose the meaning of positive transactions from transaction detail, preview the impact on income and category position, and remember that meaning for similar future transactions.

## Capability Delta

Today, the user cannot:

- Choose whether a positive transaction is income, a category credit, a transfer, or not counted.
- See how the same rent deposit affects Housing differently depending on that meaning.
- Make a category meter go net-negative in a good way for refunds or credits.
- Keep dependable rent in income/runway while keeping refunds out of income.

After this release, the user can:

- Review an inflow from the transaction detail sheet.
- Choose `Income`, `Category credit`, or `Not counted / transfer`.
- See a short impact preview before saving.
- Apply the saved meaning to similar future transactions.
- See category detail represent net position when category credits exceed spend.

Still intentionally not supported:

- Split inflow meanings.
- Expected refund tracking before the inflow arrives.
- Full income category management.
- Business/rental-property accounting.
- Tax labels, deductible flags, or P&L reports.

## User Experience

The user encounters this in the existing transaction detail sheet after tapping a positive transaction from Budget activity, Transactions, or a Summary income surface.

Happy path for rent:

1. User taps the `REAL TIME PAYMENT CREDIT...` inflow.
2. The sheet shows `Money meaning` with Kwilt's suggestion: `Looks like recurring income`.
3. The user sees options:
   - `Income`: Adds `$2,200` to income this month. Housing stays at `$2,052 spent`.
   - `Housing credit`: Makes Housing `$148 ahead` this month.
   - `Not counted`: Leaves income and Housing unchanged.
4. User chooses `Income`.
5. Kwilt asks whether to remember similar deposits from this source.
6. Housing no longer counts the rent as category relief; income/runway includes it.

Happy path for refund:

1. User taps a retail refund in Shopping.
2. Kwilt suggests `Shopping credit`.
3. The preview says it reduces Shopping and may make the month net-credit.
4. User saves and optionally remembers similar refunds.

## Existing Product Relationship

This enhances:

- Transaction detail sheet: adds money meaning alongside budget match.
- Budget detail header: represents net category position.
- Connected-spend snapshot: separates income from category credits.
- Income pattern layer: receives user-confirmed income sources and avoids refunds/transfers.

This leaves unchanged:

- Category creation/editing.
- Screen Time controls.
- Onboarding.
- Broader income-runway prompt strategy, except for receiving confirmed income semantics.

## Buildable Slice

Must be real:

- A transaction meaning domain type.
- A way to persist or locally model a transaction's meaning and similar-source rule.
- Meaning-aware category math for the selected month.
- Category header copy for positive spend, zero spend, and net-credit states.
- Transaction detail UI for positive transaction meaning selection.
- Impact preview for at least the current transaction and current category.
- Test coverage for signed category math and income-vs-credit classification behavior.

Can be thin or temporary:

- Similar-source matching can start with the existing merchant/source key approach.
- Persistence can follow the current transaction review persistence path; if backend support is missing, local preview can be feature-gated for local evaluation.
- Impact preview can be current-month only.
- Income/runway display can be basic as long as the transaction is correctly included/excluded.

Intentionally excluded:

- Split credits.
- Refund matching to original purchase.
- A separate income-management screen.
- Bulk rule management.
- Category-group admin.
- Notifications.

## Release Channel

`Local build`, then `TestFlight build` after local/simulator verification.

Rationale: this is high-trust money behavior. Andrew should first verify the known rent/Housing case locally with realistic data, then use it in TestFlight against live-ish connected transactions before exposing it more broadly.

## Brand-Goodwill Guardrails

- The app must show what changes before saving meaning.
- The app must avoid tax/business/accounting claims.
- Unknown inflows should stay reviewable instead of being silently counted as income.
- Copy should say "not counted" or "leaves income and Housing unchanged," not "ignored forever."
- Remembered meaning must be reversible from transaction detail.

## Reversibility

Meaning rules should be removable without mutating raw transactions. Removing a rule should return affected transactions to inferred/needs-review meaning and recompute category and income totals. Backend migrations should avoid destructive changes to existing transaction rows.

## Permanent Product Threshold

Promote this from learning release to accepted product capability when:

- The rent/Housing case can be represented as income without distorting Housing.
- Refunds can reduce category position, including net-credit months.
- Transfers and not-counted deposits stay out of income and category spend.
- Remembered meaning handles at least three repeated-source cases without surprising the user.
- Andrew can explain the top metric from visible transaction evidence.
