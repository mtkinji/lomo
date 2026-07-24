# Yes-And: budget-credits-and-income-classification

## Original Idea

Original idea: classify positive transactions by meaning so category meters account for credits/refunds correctly and dependable recurring inflows like rent can be treated as income instead of generic category relief.

## Adjacencies

**Yes, and what if it could remember the meaning of a recurring inflow after one calm review?**

- Serves: `jtbd-carry-intentions-into-action`
- Job elevation: turns a one-time decision into trusted follow-through, so Maya does not keep reclassifying the same rent, reimbursement, or transfer pattern.
- New value: creates simple meaning rules such as "this source is income" or "this merchant is a Housing credit" without exposing a rules engine.
- Cost delta vs. original: medium
- Anti-pattern check: pass if presented as "remember this next time" inside transaction review, not as a settings-heavy automation builder.

**Yes, and what if category headers could show net position without pretending credits are spend?**

- Serves: `jtbd-review-budget-reality-before-spending`
- Job elevation: the top metric answers the user's actual question: "where does this category stand after money came back in?"
- New value: supports states like `$148 ahead` or `$148 net credit this month` instead of forcing every category into `$X spent / $Y`.
- Cost delta vs. original: medium
- Anti-pattern check: pass if the language stays concrete and inspectable; failure if it becomes accounting jargon like debits, credits, contra-expense, or P&L.

**Yes, and what if refunds could be linked back to their original spend when the app has enough evidence?**

- Serves: `jtbd-trust-this-app-with-my-life`
- Job elevation: strengthens trust by showing why a refund reduced a category instead of asking the user to believe a black-box correction.
- New value: a returned Target purchase can quietly reduce Shopping and leave a receipt trail: original purchase, refund, net effect.
- Cost delta vs. original: high
- Anti-pattern check: pass as a later enhancement; failure if the first release depends on perfect matching before fixing the obvious net-position bug.

**Yes, and what if income/runway could ask for meaning only when the classification changes the user's plan?**

- Serves: `jtbd-trust-this-app-with-my-life`
- Job elevation: protects high-trust income claims by asking at the decision point, not during onboarding or generic setup.
- New value: repeating rent can enter income/runway after confirmation, while refunds and transfers stay out of living-percent or paycheck-style forecasting.
- Cost delta vs. original: medium
- Anti-pattern check: pass if the prompt names observable evidence; failure if Kwilt makes life-event or employment assumptions.

**Yes, and what if reimbursements became a lightweight category credit, not household income?**

- Serves: `jtbd-review-budget-reality-before-spending`
- Job elevation: lets a reimbursed family or work purchase stop making the category look hot without inflating spendable income.
- New value: common real-life cases like Venmo paybacks, school reimbursements, insurance reimbursements, and roommate shares can preserve category truth.
- Cost delta vs. original: low
- Anti-pattern check: pass if ambiguous payment-app inflows ask for review; failure if all Venmo/Zelle/PayPal deposits become income or category relief automatically.

**Yes, and what if transfers and rewards had conservative defaults that keep them out of both spend relief and income until useful?**

- Serves: `jtbd-trust-this-app-with-my-life`
- Job elevation: avoids false confidence from money movement that does not actually change household resources.
- New value: internal transfers, credit-card payments, brokerage movements, cashback, interest, and rewards stop polluting both budget meters and income patterns.
- Cost delta vs. original: medium
- Anti-pattern check: pass if the app says "not counted" plainly; failure if users must understand banking rails or Plaid categories.

**Yes, and what if the transaction detail sheet became the meaning correction surface?**

- Serves: `jtbd-carry-intentions-into-action`
- Job elevation: uses the moment where Maya is already inspecting a transaction, instead of adding a separate income-management page.
- New value: the same sheet can support "Budget match" and "Money meaning" with choices like income, category credit, refund, reimbursement, transfer, reward, or not counted.
- Cost delta vs. original: medium
- Anti-pattern check: pass if the first version shows only the choices relevant to the transaction; failure if it becomes a dense taxonomy picker.

**Yes, and what if the app could explain the top metric from transaction evidence?**

- Serves: `jtbd-trust-this-app-with-my-life`
- Job elevation: makes the meter auditable enough that a surprising negative-spend month feels trustworthy rather than broken.
- New value: a small explanation could say "$2,052 mortgage - $2,200 rent income = $148 ahead" or "$2,052 mortgage - $2,200 Housing credit = $148 net credit."
- Cost delta vs. original: low to medium
- Anti-pattern check: pass if the explanation is optional and local to the metric; failure if it becomes a dashboard narrative or financial advice.

## Job Elevation

The original frame was about fixing credits in a category metric. The elevated job is helping users give money movement the right household meaning once, then letting Budget carry that meaning into meters, income/runway, forecasts, and future similar transactions.

## Candidate Missing Anchor

No new anchor is required yet. `jtbd-trust-this-app-with-my-life` covers the high-trust money semantics, while `jtbd-carry-intentions-into-action` covers remembered user meaning. If this grows into a broader source-of-funds model, a future app-specific sub-job around "understand household resources" may be worth promoting.

## Frame Recommendation

**Run design-thinking-loop with an expanded frame** - the original issue is real, but the stronger frame is not just "credits reduce spend." It is "money meaning drives the right surface": dependable rent can become income, refunds and reimbursements can reduce category position, and transfers/rewards can stay out of both until reviewed.
