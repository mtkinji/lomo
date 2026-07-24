# Converge: plaid-transaction-backed-meter

## Qualitative scoring

| Alternative | Persona fit | JTBD fit | System fit | Blast radius | Notes |
| --- | --- | --- | --- | --- | --- |
| Ledger First | Medium | Medium | Low | High | Transparent, but turns Kwilt Money into finance admin too quickly. |
| Lane First With Suggested Matches | High | High | Medium | Medium | Best product shape: users create lanes, Kwilt suggests matching spend. |
| Meter First With Explicit Rule | High | High | High | Medium | Best first technical proof, but too rigid as the product model. |
| Backend Harness First | Low | Medium | Medium | Low | Good technical de-risking, weak product learning. |
| Sync Status Gate | Medium | High | Medium | Medium | Important trust layer after a real meter exists. |
| Tiny Correction Loop | Medium | Medium | Low | High | Likely needed later, but too much V1 scope. |

## Capability delta

Today, Andrew/Maya cannot:

- Link a financial account to Kwilt Money.
- Pull transactions into a durable provider boundary.
- Create a user-owned budget lane.
- Infer which transactions likely belong to that lane.
- Recompute the existing meter from transaction-backed spend.
- Know whether a review meter is current or fixture-backed.

After this concept ships, Andrew/Maya can:

- Connect one Plaid account in dev mode.
- Sync Transactions data server-side.
- Create one budget lane and seed inference hints.
- Review or accept suggested transaction matches for that lane.
- See the home and review meter update from synced transactions.
- See whether the meter is current through the last sync.

Still intentionally not supported:

- Full transaction browsing.
- AI categorization.
- Multi-institution management.
- Shared household roles.
- Production rollout.
- Other Plaid products beyond Transactions.

## Reductive design pass

Smallest elegant version:

- One signed-in dev user.
- One Plaid environment at a time.
- One linked Item.
- One selected account.
- One user-created budget lane and period.
- One inference hint set, such as merchants/accounts/categories/apps.
- Suggested transaction assignments with confidence.
- A way to confirm or ignore at least the suggestion set.
- One cursor-based sync state.
- One recomputed meter.
- Existing review screen uses that meter.

Enhance existing feature instead of adding new surface:

- Keep the home meter and review screen.
- Add setup/status to a dev-only settings or plan section.
- Avoid a new transaction center until ambiguity proves it is needed.

Refuse to add:

- A generic transaction list as the primary UI.
- Automated spending advice.
- Fully silent assignment for ambiguous transactions.
- Broad category budgets.
- Production-facing bank repair UX.
- Any Plaid scope beyond Transactions.

What would make this feel like clutter:

- Asking the user to classify every transaction.
- Asking for so many lane setup fields that creation feels like a finance worksheet.
- Showing Plaid/provider jargon in the meter.
- Treating every imported category as a user-facing budget category.
- Adding setup screens before the first meter proof is possible.

## Chosen alternative

Choose `Lane First With Suggested Matches`, implemented initially through a narrow explicit-rule test.

This is the better product bet because the user's mental model starts with "I want a lane for this kind of spend," not "I want a transaction rule." The first technical slice can still use one explicit rule, but the app model should treat that rule as a seed for suggested and confirmed assignments.

## Accepted trade-offs

- Accept a narrow one-lane test because it creates better product learning than broad import.
- Accept simple inference before AI because explainability matters more than magic.
- Accept that some early matches are suggestions, not confirmed truth.
- Accept backend/provider work before polishing UI because access tokens and cursors must be handled correctly.
- Accept dev-only setup copy for the first run.

## Rejected trade-offs

- Do not make Plaid integration synonymous with a ledger screen.
- Do not store Plaid access tokens in the Expo app.
- Do not overbuild correction workflows before seeing actual sync/inference quality.
- Do not silently include low-confidence transactions in spend totals without an explanation path.
- Do not hide whether a meter is fixture-backed, sandbox-backed, or real-account-backed.

## System implications

New domain/data objects:

- `BudgetPeriod`
- `FinancialConnection`
- `FinancialAccount`
- `ProviderSyncState`
- `ProviderTransaction`
- `NormalizedTransaction`
- `MeterAssignmentRule`
- `TransactionMeterAssignment`
- `MeterLedgerEntry`
- `LaneInferenceHint`
- `AssignmentSuggestion`

New service boundaries:

- `FinancialDataProvider`
- `PlaidFinancialDataProvider`
- `BudgetMeterLedgerRepository`
- `TransactionAssignmentService`
- `TransactionInferenceService`

Backend endpoints/functions:

- `create-plaid-link-token`
- `exchange-plaid-public-token`
- `sync-plaid-transactions`
- `recompute-budget-meter`

## Activation path

The user is most ready during explicit dev setup:

1. Pick the test lane: `Amazon and household extras`.
2. Set the budget period and amount.
3. Add optional hints, such as Amazon merchant, Amazon app/site, or a specific card account.
4. Connect one account.
5. Run sync.
6. Review the suggested matches or accept the suggestion set.
7. Open the existing review screen and see the transaction-backed meter.

Education should be operational and sparse: "Connect one account to keep this meter current."

## Bet

We're betting that users want to create budget lanes in their own language, then have Kwilt infer matching transactions with enough transparency to trust the meter. If that is not true, revisit by making lane setup more manual and rule-based before expanding automation.

## Success signal

Andrew can create a lane in dev mode, link an account, sync transactions, see suggested matches become meter spend, and use that meter in the Amazon/household review flow without needing to inspect a full ledger.
