# Money transaction-truth evidence contract

This contract measures whether mixed-purchase review stays easy and trustworthy
over realistic use. It does not turn financial activity into an analytics feed.

## Event contract

| Event | When | Allowed properties |
| --- | --- | --- |
| `money_transaction_split_started` | The split editor opens | `mode`, `existing_allocation_count` |
| `money_transaction_split_saved` | An atomic split save succeeds | `mode`, `allocation_count`, `duration_bucket` |
| `money_transaction_split_save_failed` | The authoritative save rejects or fails | `mode`, `allocation_count`, `duration_bucket` |
| `money_transaction_split_abandoned` | The user closes without a successful save | `mode`, `allocation_count`, `duration_bucket` |

`mode` is `create` or `replace`. Counts are integers from 0 through 8. Duration
is one of `under_15_seconds`, `15_to_59_seconds`, `1_to_2_minutes`, or
`3_minutes_or_more`; raw timestamps and durations are not properties.

The typed adapter at
`src/capabilities/money/runtime/transactionTruthAnalytics.ts` is the only client
entry point for these events. Its input and output contracts are unit tested.

## Prohibited data

Never attach transaction IDs, user-authored descriptions, merchant names,
account or institution data, category IDs or labels, amounts, currencies,
dates, raw timestamps, Plaid identifiers, household IDs, or error messages.

PostHog's normal authenticated person identity may support aggregate recurrence
counts. Do not add a financial or household identifier as an event property.

## Score-five evidence window

The job step can move from 4 to 5 only when all of the following are true for
the exact installed unified-Kwilt build under review:

1. The build is installed from TestFlight on a signed physical device and the
   save, relaunch/refetch, correction, reversal, one-row inventory, and exact
   Summary/category reconciliation checks pass.
2. Observation spans at least one complete statement cycle (minimum 28 days).
3. At least three consented representative households use the workflow for
   genuine mixed purchases. Do not manufacture splits to satisfy volume.
4. Aggregate evidence contains at least eight genuine started sessions, at
   least one successful `replace` session, at least 80% saved outcomes under
   one minute, no more than 20% abandonment, and no more than 5% save failures.
   If genuine volume is lower, extend the evidence window instead of lowering
   the threshold.
5. Database and rendered-surface reconciliation finds zero discrepancies.
6. Each household can explain what the split changed, reports the workflow as
   easy and trustworthy (at least 4 of 5 for both), and does not describe it as
   routine bookkeeping. Store only consented, de-identified evidence notes.

These thresholds are a learning-release gate, not a claim of statistical
significance. Any integrity discrepancy blocks 5 regardless of favorable
aggregate rates.

The rate denominators are fixed so the result cannot be reinterpreted later:

- fast-save rate = saves under one minute / all successful saves;
- abandonment rate = abandoned sessions / genuine starts;
- save-failure rate = failed attempts / successful plus failed save attempts.

Run `npm run money:transaction-truth:evidence` to validate the committed
privacy-safe scorecard at
`docs/delivery-evidence/money-transaction-truth.json`. The checker rejects
impossible counts, fields outside its allowlist, and any score-5 claim whose
six evidence gates do not all pass. Its household rows contain only ratings
and booleans—no household, person, merchant, account, category, or transaction
identifiers.

## PostHog review

For the evidence window, review:

- starts, saves, save failures, and abandonment by day;
- saves divided by starts;
- failures divided by save attempts (`saved + save_failed`);
- saved duration buckets;
- create versus replace saves;
- distinct returning people with starts on more than one day.

Exclude internal automation and simulator runs. Pair the aggregate review with
the installed-build receipt, database reconciliation record, and de-identified
household evidence log. PostHog alone cannot establish representative-household
trust or cross-surface financial correctness.

## Current boundary — 2026-07-25

The event code, allowlisted adapter, privacy tests, and production environment
key/host are present locally. No TestFlight build carrying these events has been
started, so live event flow and the score-five evidence window have not begun.
The committed scorecard therefore remains at 4 with all external proof gates
explicitly pending.
