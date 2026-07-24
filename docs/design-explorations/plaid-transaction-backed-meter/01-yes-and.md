# Yes-And: plaid-transaction-backed-meter

Original idea: let users create a budget lane, link one bank account through Plaid Transactions, and have Kwilt infer which transactions belong to that lane.

**Yes, and what if it could...** make the existing meter trustworthy without adding a transaction dashboard.

- Serves: `jtbd-review-budget-reality-before-spending`
- Job elevation: the user reviews live reality at the app-opening moment, not a manually maintained estimate.
- New value: the budget gate can show "current through last sync" and use real ledger entries.
- Cost delta vs. original: low
- Anti-pattern check: pass if the transaction list remains secondary or hidden in dev tools.

**Yes, and what if it could...** teach Kwilt which transactions count for the lanes users actually create.

- Serves: `jtbd-carry-intentions-into-action`
- Job elevation: the budget intention becomes operational through suggested and confirmed assignment rules.
- New value: Amazon household, Amazon work, takeout, or groceries can become user-meaningful lanes instead of provider categories.
- Cost delta vs. original: medium
- Anti-pattern check: pass if inferred matches are explainable and editable; fail if opaque categorization silently changes the meter.

**Yes, and what if it could...** start lane creation with a small set of inference hints.

- Serves: `jtbd-carry-intentions-into-action`
- Job elevation: the user expresses the spending context once, then Kwilt does the matching work.
- New value: lane setup can ask for a name, amount, period, optional merchants/apps/accounts, and then seed matching suggestions.
- Cost delta vs. original: medium
- Anti-pattern check: pass if setup stays lightweight; fail if it becomes a budgeting questionnaire.

**Yes, and what if it could...** separate suggested spend from confirmed spend.

- Serves: `jtbd-trust-this-app-with-my-life`
- Job elevation: the meter can be useful quickly without pretending uncertain matches are perfectly known.
- New value: the app can track `included`, `suggested`, and `ignored` states internally, with a simple confidence cue when needed.
- Cost delta vs. original: medium
- Anti-pattern check: pass if confidence is mostly invisible until relevant; fail if every transaction becomes homework.

**Yes, and what if it could...** make the bank connection itself feel narrow and reversible.

- Serves: `jtbd-trust-this-app-with-my-life`
- Job elevation: the user can trust the app because it asks only for what the job needs.
- New value: dev and future production flows can say clearly that Kwilt Money uses transaction data to update chosen meters.
- Cost delta vs. original: medium
- Anti-pattern check: pass if access tokens stay server-side and sync status is visible.

**Yes, and what if it could...** produce a reusable provider boundary for MX or another aggregator later.

- Serves: `jtbd-trust-this-app-with-my-life`
- Job elevation: Kwilt owns the product model instead of becoming Plaid-shaped.
- New value: future pricing, coverage, or enrichment changes do not rewrite the app's domain model.
- Cost delta vs. original: medium
- Anti-pattern check: pass if the boundary is practical and does not over-abstract before the first sync.

**Yes, and what if it could...** create a tiny transaction review fallback only when inference confidence is low.

- Serves: `jtbd-carry-intentions-into-action`
- Job elevation: ambiguous transactions can be corrected without making review a daily chore.
- New value: the user can improve the meter's truth over time.
- Cost delta vs. original: high
- Anti-pattern check: defer for V1; it risks becoming ledger maintenance before the meter proves value.

**Yes, and what if it could...** connect the meter update to the app gate activation moment.

- Serves: `jtbd-put-intention-before-impulse`
- Job elevation: the latest spending reality appears exactly before the tempting app opens.
- New value: the gate can say whether the meter is fresh or stale before access.
- Cost delta vs. original: medium
- Anti-pattern check: pass if stale data copy is humble, not alarmist.

## Frame recommendation

Run the loop with the expanded frame: `Inferred transaction-backed budget lanes`.

The Plaid integration test is still the right next technical step, but the product frame should not be "import transactions." It should be "let the user create a lane, then infer enough matching transactions to make that lane's meter useful and trustworthy."
