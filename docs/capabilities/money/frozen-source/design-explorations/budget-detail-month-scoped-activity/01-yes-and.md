# Yes-And: budget-detail-month-scoped-activity

Original idea: reuse the common Transactions inventory pattern above Budget Detail activity rows while making the budget's month scope explicit.

**Yes, and what if it could make the budget month the primary object?**

- Serves: `jtbd-trust-this-app-with-my-life`
- Job elevation: the user understands what numbers and rows are supposed to explain before inspecting the ledger evidence.
- New value: Budget Detail can answer "what month am I looking at?" without relying on tiny stats labels.
- Cost delta vs. original: low
- Anti-pattern check: pass, as long as month navigation stays page-level and not a reporting dashboard.

**Yes, and what if it could make July 1 feel correct instead of empty?**

- Serves: `jtbd-review-budget-reality-before-spending`
- Job elevation: sparse current-month activity becomes expected budget reality, not a data failure.
- New value: empty current-month activity can point to `View June` or `All history` without silently changing the selected month.
- Cost delta vs. original: low
- Anti-pattern check: pass, if the empty state is one short receipt-like line rather than tutorial copy.

**Yes, and what if it could turn last month into a receipt?**

- Serves: `jtbd-trust-this-app-with-my-life`
- Job elevation: the user can inspect actual spend and transactions after the period closes.
- New value: Budget Detail can answer "What happened last month?" with actuals, over/under, and transaction evidence.
- Cost delta vs. original: medium
- Anti-pattern check: pass, if it reuses the same detail page instead of creating a separate reports surface.

**Yes, and what if it could turn next month into a plan preview?**

- Serves: `jtbd-carry-intentions-into-action`
- Job elevation: the user sees expected recurring spend and rollover impact before the month starts.
- New value: the app can answer "What happens next month if rollovers are on?" without pretending future rows are posted transactions.
- Cost delta vs. original: medium
- Anti-pattern check: conditional pass; future months need clear `Expected` or `Scheduled` labeling.

**Yes, and what if the common inventory bar became scoped evidence chrome?**

- Serves: `jtbd-carry-intentions-into-action`
- Job elevation: search/filter/sort controls become reusable for any evidence list without changing each page's main object.
- New value: Budget Detail can use filter/sort/review-state controls while Transactions keeps date scope as a ledger-level control.
- Cost delta vs. original: low
- Anti-pattern check: pass, if the bar does not duplicate the month selector.

**Yes, and what if rollovers became visible as a budget adjustment, not a transaction?**

- Serves: `jtbd-trust-this-app-with-my-life`
- Job elevation: carry-in and carry-out become explainable math instead of hidden changes to "left."
- New value: historical and future months can show `Rollover in`, `Planned`, `Actual`, and `Rollover out` as compact facts.
- Cost delta vs. original: medium to high
- Anti-pattern check: pass, if this remains a small fact row and not a full rollover editor.

## Frame Recommendation

Run the loop with an expanded frame: `Budget Detail as selected-month budget receipt`.

The original inventory-bar idea is still part of the slice, but it should be subordinate to the larger month-scope problem. The common inventory pattern is strongest when it controls the rows inside a clearly named parent context.
