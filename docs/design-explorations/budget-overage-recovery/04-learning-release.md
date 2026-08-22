# Learning Release: Budget Overage Review

## Concept To Build

When Flexible spending is over budget, Kwilt offers `Review overages`, groups the budgets and transactions driving the result, and lets the user correct category or saved-money coverage with an exact before/after preview.

## Capability Delta

Today, the user cannot:

- move from the whole-plan overage directly to its contributing budgets and transactions;
- preserve a real expense while saying it was covered by savings rather than the current monthly plan; or
- see the revised Flexible spending result before saving that correction.

After this release, the user can:

- review current-month overages by category;
- open the material transactions contributing to each category;
- recategorize or split a transaction;
- choose `August plan`, `Saved money`, or `Split between both` as coverage;
- preview and save the exact effect on Flexible spending;
- return to a reconciled Budget with the saved-money amount still disclosed; and
- reverse the coverage correction when safe.

Still intentionally not supported:

- automatically inferring saved-money coverage;
- selecting or decrementing a specific savings, HSA, or investment account;
- claiming a savings balance or runway;
- changing the fixed monthly or category plan as part of correction;
- recurring saved-money rules for similar merchants;
- pending-transaction coverage corrections before canonical posting identity is stable;
- household sharing, notifications, or automatic app controls; or
- a positive-state coaching message on every Budget visit.

## User Experience

The user encounters the feature only when the current Flexible spending answer is over budget and the underlying evidence is reconciled.

The card keeps its existing answer and adds one secondary action:

```text
$2,480 over budget

Review overages
```

The card does not repeat the fixed budget amount. That remains available in the calculation statement behind the information affordance.

The action opens the existing transaction inventory in a grouped overage-review mode. Over-budget categories appear in descending contribution order, with the material posted transactions inside each group. A single reconciliation sentence explains how under-budget categories offset gross category overages when needed.

Opening a transaction uses the existing detail surface. Category correction remains where it is today. A new `How this is covered` row opens a focused drawer with `August plan`, `Saved money`, and `Split between both`.

Before save, the drawer shows:

- transaction amount;
- monthly-plan-covered amount;
- saved-money-covered amount;
- current and proposed Flexible spending result;
- confirmation that category and actual spending remain unchanged; and
- the limit that Kwilt is not estimating remaining savings.

Save writes one authoritative coverage correction, rebuilds the snapshot, and returns to Budget or the overage review with a receipt. If the result moved from negative to positive, the receipt may say `Back within August’s plan. $343 left.` The resting positive card remains quiet and informational.

## Existing Product Relationship

This enhances existing surfaces rather than adding a new Money destination:

- Flexible spending answer card: contextual entry action only;
- explanation drawer: arithmetic and saved-money disclosure only;
- Money Transactions: grouped overage-review presentation;
- Transaction Detail: existing category correction plus one new coverage field;
- Budget projection: monthly-plan-covered flexible spending becomes distinct from total actual category spending; and
- transaction receipt/return pattern: authoritative save, visible result, and safe reversal.

It leaves the fixed-plan model, category inventory, month switcher, transaction source evidence, account inventory, living-target editor, and ordinary positive Budget state unchanged.

## Buildable Slice

Must be real:

- A pure transaction-coverage model whose monthly-plan and saved-resource cents reconcile exactly to the canonical posted outflow.
- An additive owner-scoped persistence contract and atomic RPC for reading, saving, splitting, and safely reversing coverage corrections without mutating the provider transaction.
- Provenance and reviewed-at evidence so sync, classification, and plan recomputation cannot silently overwrite the user correction.
- Snapshot projection that retains full actual category spending while counting only monthly-plan-covered flexible spending against the fixed plan.
- A deterministic overage-contribution projection grouping current-month over-budget categories and their posted transactions.
- `Review overages` activation only for supported negative states.
- Grouped overage review using the existing Money transaction inventory and detail navigation.
- `How this is covered` selection, exact split entry, impact preview, save, receipt, undo, and recalculated return.
- Statement disclosure for material saved-money-covered spending.
- Correct accessibility labels, focus return, Dynamic Type behavior, and VoiceOver order.
- Regression-first domain, persistence, projection, and screen contracts.
- iPhone 17 Pro Simulator proof for the accepted orthodontic/savings dogfood path.

Can be thin or temporary:

- `Saved money` is a user declaration without a named source account.
- Material transaction ordering is deterministic by contribution amount, with no AI ranking.
- Only the current month and canonical posted outflows support coverage correction.
- The grouped review can reuse current transaction-row visuals without new charts or summary widgets.
- Internal TestFlight exposure can be gated to Andrew while the schema remains additive and inert for everyone else.
- Analytics can record only privacy-safe interaction and outcome enums, never merchant names, categories, or amounts.

Intentionally excluded:

- savings/resource inventory, balances, runway, net worth, or Financial Seasons;
- automatic identification of HSA, savings, or investment funding;
- merchant-level coverage rules;
- durable plan changes or category recommendations;
- overage reminders or repeated nudges;
- “resolve all” state, review counts, badges, scores, or completion pressure;
- special positive-card colors, praise, confetti, or persistent encouragement; and
- changes to prior months beyond reading preserved coverage truth.

## Release Channel

**TestFlight build**, initially visible only to Andrew/internal dogfood through a capability flag.

A local iPhone 17 Pro build is the implementation acceptance gate, but the learning requires a real connected transaction, sync/relaunch persistence, and repeat use across ordinary Budget visits. Internal TestFlight supplies that environment without presenting an unfinished financial correction model to the broader audience.

The additive backend contract must be deployed and verified separately before the gated TestFlight UI is enabled. A local UI running against undeployed columns is not persistence proof.

## Brand-Goodwill Guardrails

- Use `Review overages`, not `Fix overspending`, `Problem transactions`, or `Resolve all`.
- Keep the CTA neutral; red remains the amount’s semantic state, not the action treatment.
- Never imply that every overage is erroneous or prevent dismissal.
- Never remove a saved-money expense from category activity or total household spending.
- State clearly that Kwilt is not estimating remaining savings.
- Keep category, coverage, and money meaning as separate decisions.
- Show exact before/after consequences before save.
- Keep the positive resting state factual. Use warm copy only in a specific transition receipt.
- Preserve a visible way to return coverage to the month’s plan or undo the latest safe correction.

## Reversibility

The persistence change is additive. Transactions without a coverage record continue to count fully against their effective monthly plan role. The capability flag can hide `Review overages` and the coverage editor without changing existing category or transaction behavior.

Each correction records its previous and next exact coverage, allowing a safe receipt undo while the same canonical transaction and review version remain current. Setting the transaction back to full `August plan` coverage removes the saved-resource effect without altering its category or raw transaction.

If the learning release is withdrawn, retain coverage records as inert user-authored provenance and keep the projection compatibility read until every affected record is migrated or explicitly restored. Do not delete corrections or silently return saved-money spending to the monthly plan.

## Permanent Product Threshold

Promote this into the accepted Money capability only when internal dogfood proves:

- the grouped review reliably leads to the transaction Andrew expects;
- category, coverage, and money meaning are understood as different decisions;
- marking a real expense `Saved money` preserves category and actual spending while recalculating the fixed-plan result exactly;
- save, refresh, relaunch, sync, and undo preserve authoritative truth;
- the positive-state transition feels useful without making the resting card congratulatory;
- no ordinary Budget visit turns into transaction bookkeeping; and
- the action still feels valuable when an overage is valid and no correction is needed.
