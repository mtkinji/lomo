# Evaluate Learning: budget-detail-month-scoped-activity

## Learning Questions

1. Does the selected month label make Budget Detail feel clearly period-scoped?
2. Does sparse current-month activity on the first day of the month feel truthful rather than broken?
3. Does last-month navigation answer the user's historical question without turning the page into a reporting surface?
4. Does next-month preview clarify scheduled/expected spend without implying posted transaction activity?
5. Does the common inventory bar feel like reusable row chrome, or does it compete with the page month selector?
6. Does the interaction preserve the compact Kwilt Money feel?

## Evidence Plan

Supporting evidence:
- In simulator review, Andrew can identify the selected month within one glance.
- On July 1 data, empty or sparse activity reads as scoped state, not missing sync.
- Tapping previous month shows historical rows without leaving Budget Detail.
- Tapping `View all` opens Transactions in a matching budget/month context.
- No duplicated month controls appear in the activity inventory bar.
- The page still feels like one budget detail, not a ledger dashboard.

Disconfirming evidence:
- User reads the selected-month activity as all-time or "latest" transactions.
- User expects future preview rows to be posted transactions.
- User must leave Budget Detail to answer last month's budget question.
- The inventory controls make the activity area feel heavier than the meter.
- Copy requires explanatory paragraphs to be understood.

## Instrumentation

For local learning:
- Screenshot comparisons for current, previous, and next month states.
- Manual notes on whether the page answers the five success-signal questions from `03-converge.md`.
- Optional lightweight console logs for selected month changes and `View all` navigation params during dev verification.

Later product instrumentation:
- `budget_detail_month_changed` with budget id and relative offset, not amounts or merchant names.
- `budget_detail_activity_view_all_opened` with budget id and selected month offset.
- `transaction_detail_opened_from_budget_month_activity` with budget id and month offset.

Do not track:
- Merchant names.
- Raw amounts.
- Account masks.
- Transaction descriptions.
- Detailed rollover calculations before the model is durable.

## Decision Rule

Proceed to permanent implementation if the local build shows clear comprehension across current, previous, and next month states, and if the shared inventory bar remains visually quiet.

Revise if the month selector competes with the detail header or if next-month preview feels too speculative. In that case, reduce the first release to current and previous month only.

Retire the direction if the page is still easier to understand as current-month-only with a direct link into Transactions; that would mean Budget Detail should stay a live meter and Transactions should own historical inspection.

## Expected Next Action

If the loop is accepted, implement the local build slice in Budget Detail first, then run simulator screenshots for:
- current month with sparse activity,
- previous month with posted rows,
- next month preview,
- full Transactions handoff with budget/month context.
