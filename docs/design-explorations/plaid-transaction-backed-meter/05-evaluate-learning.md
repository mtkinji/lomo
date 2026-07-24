# Evaluate Learning: plaid-transaction-backed-meter

## Learning questions

1. Can Andrew complete Plaid Link from the Kwilt Money app without credential or native-SDK friction?
2. Can the backend safely exchange and store the Item access token without exposing secrets to the app?
3. Can `/transactions/sync` produce stable added/modified/removed updates with a persisted cursor?
4. Can a user create a lane quickly enough that setup does not feel like finance admin?
5. Can deterministic inference suggest matching transactions in a way that is easy to explain?
6. Does accepting or correcting suggestions feel lighter than manual classification?
7. Does a Plaid-backed, inference-assisted meter make the review gate feel more trustworthy?
8. Does the product still feel like a budget gate/meter, not a finance dashboard?

## Evidence to collect

- Link success metadata: institution, selected account count, link session id.
- Stored `FinancialConnection` and `FinancialAccount` rows.
- First sync result counts: added, modified, removed, cursor saved.
- Re-sync result with stored cursor.
- Meter before/after values.
- Lane creation fields used.
- Suggested assignment counts by confidence.
- Confirmed and ignored assignment counts.
- Inference explanation.
- Screenshot or screen recording of home/review meter with sync freshness.
- Notes on whether Andrew wanted to inspect raw transactions.

## Pass criteria

- Link token creation and Link open succeed in local/dev app.
- Public token exchange succeeds server-side.
- No Plaid secret or access token is present in mobile logs or app storage.
- First sync returns transactions or a plausible empty sandbox result.
- Cursor is persisted and reused.
- A user-created lane can capture name, amount, period, and optional hints.
- Lane hints create suggested assignments.
- Confirmed assignments create ledger entries.
- Meter updates from `MeterLedgerEntry`, not direct fixture mutation.
- Review screen can display the updated meter.

## Fail signals

- The integration only proves Plaid API calls, not a budget-meter update.
- The user needs a transaction ledger to understand why the meter changed.
- Inference behavior is opaque.
- The app asks the user to review too many transactions.
- Sync freshness is hidden.
- Plaid implementation details leak into user-facing copy.
- The meter becomes scary or punitive when spend is high.

## Decision points after evaluation

- If Link/sync fails: stay in backend harness mode until provider flow is stable.
- If sync works but meter trust is low: add a tiny lane-specific transaction explanation surface.
- If inference creates too many false positives: require stronger lane hints before automatic inclusion.
- If inference creates too many false negatives: add lightweight "include similar next time" correction.
- If meter trust is high: wire the Plaid-backed meter into the normal review gate and prepare a TestFlight slice.
- If assignment quality is poor: add explicit correction-to-rule workflow before adding more lanes.

## Evaluation note

Synthetic or sandbox data can prove the flow and data model, but it cannot prove household usefulness. A real Development-mode account is needed before deciding whether the meter feels trustworthy at the spending moment.
