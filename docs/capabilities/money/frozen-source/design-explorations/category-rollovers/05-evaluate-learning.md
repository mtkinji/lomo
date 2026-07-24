# Evaluate Learning: category-rollovers

## Learning Questions

1. Does rollover-adjusted remaining room make the current meter feel more truthful?
2. Does the user understand `Rolled in` and `Rolls out` without long explanatory copy?
3. Does negative carryover feel useful rather than punitive?
4. Does the feature stay category-shaped, or does it make the app feel like a finance dashboard?
5. Do Summary, category detail, and selected-month math stay consistent?

## Supporting Evidence

- In simulator/TestFlight review, Andrew can explain the current available amount from the meter plus rollover fact row.
- A positive carry-in increases current room and a negative carry-in reduces it in both Summary and detail.
- Category detail can show prior month carry-out and current month carry-in without synthetic transaction rows.
- Forecast smoke tests pass for no rollover, positive rollover, and negative rollover.
- The UI does not need a new navigation surface to make the feature understandable.

## Disconfirming Signals

- The user reads rollover as a transaction or account balance.
- Negative carryover feels like punishment or error state.
- Summary and detail disagree on available room.
- Users need to open a detailed explanation to understand the main meter.
- The setting attracts requests for transfers, caps, and manual editing before the core use case is trusted.

## Instrumentation

Track only coarse feature behavior if analytics exist:
- `category_rollover_enabled`
- `category_rollover_disabled`
- `category_rollover_meter_viewed` with category id and sign bucket only: none, positive, negative

Do not track transaction merchant names, exact rollover amounts, or account identifiers.

## Decision Rule

Proceed to permanent implementation if:
- the helper tests protect the math,
- Summary/detail consistency is proven,
- the setting and carry-in/carry-out facts are understandable in simulator/TestFlight review,
- and negative carryover does not read as an error.

Revise if:
- the setting is hidden or confusing. Try surfacing rollover from category detail after month close.
- negative carryover feels bad. Consider first release as positive-only rollover.
- future-month preview becomes too speculative. Limit visible rollover to current and prior selected months.

Retire or defer if:
- the feature makes the app feel like bookkeeping before it improves spending decisions.

## Expected Next Action

Write and implement the feature brief as a narrow category-meter math change, then verify with `npm run test:forecast`, `npm run lint`, and native simulator review of Summary plus category detail.
