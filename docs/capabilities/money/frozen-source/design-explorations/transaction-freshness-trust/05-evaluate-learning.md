# Evaluate Learning: transaction-freshness-trust

## Learning questions

1. Does two-layer freshness copy help users distinguish latest Kwilt data from latest bank-check state?
2. Does `Check for new activity` feel like a useful recovery action or a broken promise when no new rows arrive?
3. Does freshness language reduce trust loss when a known recent purchase is missing?
4. Which surfaces need freshness copy for comprehension: Transactions only, Accounts plus Transactions, or all budget-claim surfaces?
5. How often is bank sync stale enough to weaken budget claims in normal use?
6. Is manual refresh enough for the next release, or do scheduled sync/webhooks become necessary?
7. Does the copy protect brand goodwill by being factual without sounding like a bank warning or provider excuse?

## Evidence plan

Supporting evidence:

- Andrew/Blaire can explain what the app knows after checking for new activity.
- A missing recent transaction is interpreted as "not arrived yet" or "sync needs attention," not "Budget is fake."
- Refresh result copy is understandable when rows arrive and when no rows arrive.
- Summary and budget detail still feel useful when freshness is stale.
- Accounts is understood as the place to inspect connection health.

Disconfirming evidence:

- Users expect `Check for new activity` to force instant card-swipe visibility.
- Users ignore freshness copy and still treat missing recent purchases as a product failure.
- Refresh failures feel worse than silent stale data.
- Freshness labels make the app feel like a finance dashboard.
- The manual refresh path often cannot complete because deployed function/session/provider state is unreliable.

Brand-goodwill evidence:

- Users describe the app as honest, not flaky.
- Users can keep using the last useful budget data while understanding its boundary.
- Copy does not produce shame, urgency, or provider-jargon confusion.

## Instrumentation

Track or manually note:

- Refresh action started.
- Refresh result bucket: new rows, modified rows only, no new activity, failed, throttled.
- Previous bank-sync age bucket.
- Surface where refresh was started.
- Whether the visible transaction count changed.
- Whether the user navigated to Accounts after a stale/failure state.

Do not track:

- Merchant names.
- Exact transaction amounts.
- Account masks.
- Raw provider error payloads in analytics.
- Whether a specific household member made the purchase.

## Decision rule

Proceed to permanent implementation if, after at least several real TestFlight check moments, the user can correctly interpret refresh results and stale states without losing confidence in the budget meter.

Revise if the action label overpromises, if copy is too subtle to notice, or if Accounts is not understood as the deeper health surface.

Escalate to scheduled/webhook sync if manual check is frequently needed or if bank-check age is often outside the window users consider trustworthy.

Retire or simplify if freshness copy adds anxiety without improving comprehension.

## Expected next action

Create a buildable feature brief for a TestFlight learning release centered on shared freshness state, Transactions/Accounts `Check for new activity`, and compact budget-claim freshness labels.
