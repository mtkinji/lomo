# Yes-And: transaction-freshness-trust

## Original idea

Make Kwilt Money reflect the right and latest transactions, and communicate any expected delay clearly enough that the user can keep trusting the budget.

## Adjacencies

**Yes, and what if it could make every budget claim carry a visible freshness boundary?**

- Serves: `jtbd-trust-this-app-with-my-life`
- Job elevation: Maya can tell whether a meter is current enough before acting on it.
- New value: Summary, budget detail, app-control review, and widgets stop making equally strong claims when bank sync is stale.
- Cost delta vs. original: medium
- Anti-pattern check: pass if freshness stays compact; failure if every card becomes a sync dashboard.

**Yes, and what if Transactions could answer "is it missing or just filtered out?"**

- Serves: `jtbd-review-budget-reality-before-spending`
- Job elevation: Maya can distinguish a data problem from a date-scope/filter problem.
- New value: A recent purchase not appearing becomes diagnosable without exposing provider internals.
- Cost delta vs. original: low
- Anti-pattern check: pass if it reuses existing date/filter controls; failure if it adds a search-and-debug workflow before the inventory is trustworthy.

**Yes, and what if Accounts became the quiet source-of-truth for connection health and bank-check recency?**

- Serves: `jtbd-carry-intentions-into-action`
- Job elevation: Maya can trust that sync is being handled without learning Plaid mechanics.
- New value: The app has one place that explains whether the bank connection is healthy, stale, syncing, or needs attention.
- Cost delta vs. original: medium
- Anti-pattern check: pass if Accounts remains an object inventory; failure if it becomes a provider operations console.

**Yes, and what if opening Budget could opportunistically check for new bank data when freshness is old?**

- Serves: `jtbd-review-budget-reality-before-spending`
- Job elevation: Maya gets a better chance of seeing recent spending at the exact moment she checks budget reality.
- New value: The app moves from passive database reading to intentional freshness recovery when it matters.
- Cost delta vs. original: medium to high
- Anti-pattern check: pass if throttled and honest; failure if it promises instant card-swipe visibility or hammers provider APIs.

**Yes, and what if "recent spending may still be arriving" became calm expectation-setting, not an error state?**

- Serves: `jtbd-trust-this-app-with-my-life`
- Job elevation: Maya can understand normal delay without feeling the app is broken.
- New value: Missing recent transactions are handled as a known limitation with next action, not as a silent trust rupture.
- Cost delta vs. original: low
- Anti-pattern check: pass if copy is concrete and rare; failure if it becomes generic disclaimer fog.

**Yes, and what if app-control pauses used sync freshness before blocking or allowing access?**

- Serves: `jtbd-put-intention-before-impulse`
- Job elevation: the spending pause remains fair because it does not overreact to stale or unknown data.
- New value: A stale sync can downgrade conditions like `transactions_need_review`, `near limit`, or `over budget` instead of making the phone restriction feel arbitrary.
- Cost delta vs. original: high
- Anti-pattern check: pass if it protects agency; failure if it makes Screen Time rules harder to understand.

**Yes, and what if the product could learn the honest freshness SLA over time?**

- Serves: `jtbd-trust-this-app-with-my-life`
- Job elevation: Kwilt can earn stronger language only when real sync timing supports it.
- New value: The team can decide whether scheduled sync, webhooks, or on-demand refresh is worth building based on observed delay and user trust moments.
- Cost delta vs. original: medium
- Anti-pattern check: pass if instrumentation avoids merchant names, amounts, and sensitive transaction details; failure if it tracks private spend content.

## Frame recommendation

**Run design-thinking-loop with an expanded frame** - the original Transactions symptom is real, but the trust job is broader. The right frame is a product-wide transaction freshness trust contract that starts with the surfaces where users already check budget reality.

The expansion should stay disciplined:

- Do not build a full Plaid diagnostics center.
- Do not promise instant bank truth.
- Do not make freshness copy louder than the budget reality itself.
- Do build one shared freshness model that Transactions, Summary, Accounts, budget detail, and later app-control/widget surfaces can reuse.

## Job elevation

The job improves from "show me a list of loaded transactions" to "help me know whether the budget reality I am about to act on includes the latest spending Kwilt can honestly know about."
