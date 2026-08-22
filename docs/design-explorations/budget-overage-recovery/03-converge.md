# Converge: Review What’s Driving the Overage

## Qualitative scoring

| Alternative | Maya fit | Causal clarity | Corrective power | System fit | Calm/reductive fit | Verdict |
| --- | --- | --- | --- | --- | --- | --- |
| A. What’s Contributing Drawer | High | High | High | High | Medium-high | Choose the model, refine the container |
| B. Focus Existing Budget List | Medium-high | Medium | Medium | Very high | High | Too little added help |
| C. Material Transactions Review | Medium-high | Medium | Very high | Medium-high | Medium | Reuse as the transaction layer |
| D. Guided Resolution | Medium | High | High | Medium-low | Low | Reject for first release |

## Chosen direction

Choose **category-first overage review with transaction-level correction**.

The Flexible spending answer shows one contextual action only when it is over budget:

> **$2,480 over budget**
>
> `Review overages`

`Review overages` opens the existing transaction inventory in an overage-review presentation rather than putting a long nested ledger inside the explanation drawer. The view is grouped by budgets currently over their amounts, ordered by contribution to the whole-plan overage. Each group shows the category overage and the material transactions inside it. Maya can open any transaction to:

- change or split its category;
- change how it is covered by the plan;
- correct its money meaning when it is not household spending; or
- leave it unchanged.

The existing information affordance remains the explanation path. Its statement explains the arithmetic. `Review overages` is the action path. These are two distinct jobs and should not be collapsed into one ambiguous control.

## Why this wins

Alternative B mostly scrolls Maya to red rows she can already see. Alternative C reaches the observed savings-funded purchase quickly but hides whether the problem is one transaction, one unrealistic budget, or accumulation across several categories. Alternative D teaches the concepts but risks a forced cleanup flow.

The chosen hybrid preserves A’s causal hierarchy—whole plan to budget to transaction—and uses C’s correction mechanics only after Maya selects a relevant transaction. A full-screen inventory is more appropriate than a nested drawer because transaction review needs stable navigation, category grouping, keyboard-safe split editing, and a clear return after saving. It still reuses the existing Money transaction surface rather than adding a new top-level destination.

## Capability delta

Today, Maya cannot:

- move directly from the whole-plan overage to the budgets and transactions producing it;
- say that a real categorized expense was paid from savings rather than the month’s flexible allocation;
- preserve the expense while correcting only its plan consequence; or
- preview how that correction changes the whole-plan result.

After this release, Maya can:

- tap `Review overages` from a negative Flexible spending answer;
- see over-budget categories and their material transactions in one grouped review;
- recategorize or split a transaction using existing category truth;
- mark a transaction as covered by saved money without hiding the expense;
- preview the revised category and Flexible spending results; and
- save one authoritative correction and return to the recalculated Budget.

Still intentionally not supported:

- automatic claims that a transaction came from savings;
- automatic plan or category-budget changes;
- a required review queue or “resolve all” completion state;
- savings-balance or runway claims without authoritative balance evidence;
- automatic app blocking or household sharing;
- debt payoff, transfers, or financial advice; or
- routine funding-source fields on every transaction row.

## User experience

### 1. Resting over-budget answer

Only the negative state gains a compact action:

```text
Flexible spending                         ⓘ

$2,480 over budget

Review overages
```

The action uses ordinary secondary-action styling. It is not a red button, warning banner, badge, or required task. The fixed budget amount remains available through the information affordance and statement; it does not compete with the result and next action on the resting card.

### 2. Overage review

```text
Review overages

Budgets over their August amounts

Health & Activities              $2,922 over
  Jeremy B Matthews DMD              $3,116
  Momentum                            $106

Entertainment                       $23 over
  …
```

Only categories over their current fixed amounts appear. The screen may state the offset once when needed:

> Other flexible budgets are $466 under their amounts, bringing Flexible spending to $2,480 over overall.

This prevents the gross category overages from appearing not to reconcile with the whole-plan answer. Transaction rows are ordered by absolute contribution, but Kwilt does not label them mistakes or require review.

### 3. Transaction correction

Transaction detail preserves three separate fields:

```text
Category
Health & Activities                         ›

How this is covered
August plan                                 ›

Money meaning
Household spending                          ›
```

`Category` reuses current reassignment and split-category behavior.

`How this is covered` offers:

- `August plan`
- `Saved money`
- `Split between both`

The supporting sentence is concrete:

> This changes how the purchase affects August. It stays in Health & Activities.

`Money meaning` owns `Internal transfer`, genuine non-household or reimbursable treatment, duplicate correction, and other cases that should not count as household spending. `Outside the plan` must not substitute for `Saved money`.

### 4. Impact preview and receipt

Before saving `Saved money`:

```text
This purchase                          $2,000
Covered by saved money                −$2,000

Flexible spending
$2,480 over  →  $480 over

The purchase stays in Health & Activities.
Kwilt is not estimating your remaining savings.

Use saved money
```

After save, the authoritative snapshot rebuilds. Budget returns to the recalculated answer and shows a compact receipt:

> Updated August. $2,000 stays in Health & Activities and is covered by saved money.

If the correction brings Flexible spending back within plan, the over-budget action disappears. The transaction remains visible in category activity and total household spending.

### 5. Positive-state posture

The ordinary positive card stays quiet:

```text
$343 left
```

Do not add `Nice work`, `You're doing great`, a streak, celebratory color, or a permanent encouraging sentence. Being under budget is useful plan information, not a moral achievement, and the household may still intend to spend the remaining amount.

Recognition belongs to the specific transition created by a meaningful correction. If Maya’s saved-money or category correction changes the answer from over budget to within plan, the resulting receipt may say:

> Back within August’s plan. $343 left.

This is a small, earned acknowledgment attached to the action and its result. It does not persist as coaching on every positive visit.

## Domain and system implications

The current model conflates funding correction with `not_counted`. Add a separate transaction-level plan-coverage decision while preserving the raw connected transaction:

- category/allocation: what the spending was for;
- money meaning: whether it is household spending, income, credit, transfer, or excluded activity;
- plan coverage: how much is covered by the current monthly plan versus saved resources; and
- payment source/account: where the bank or card transaction occurred.

The minimum durable shape should support:

- `monthlyPlanCents`;
- `savedResourceCents`;
- optional user-declared source label later; and
- correction provenance, timestamp, and authoritative receipt.

For an ordinary transaction, the full amount defaults to `monthlyPlanCents`. A user correction may move all or part of it to `savedResourceCents`. The two portions must always reconcile exactly to the canonical transaction amount.

Projection rules:

- actual category spending retains the full transaction amount;
- flexible-plan usage counts only the monthly-plan-covered portion of flexible household spending;
- saved-resource-covered spending appears as a separate supporting fact and never becomes ordinary income;
- the whole-plan overage recalculates from monthly-plan-covered spending;
- no savings balance, remaining runway, or affordability claim is derived from the declaration alone; and
- sync, provider recategorization, or plan recomputation may not overwrite the explicit correction.

The statement drawer should add a memo line only when material saved-resource spending exists:

```text
Flexible spending from August plan     −$4,225.15
Paid from saved money                   $2,000.00
```

The saved-money line is disclosed but not subtracted from the fixed monthly plan a second time.

## Reductive design decisions

- Add one CTA only to the over-budget answer; do not add a permanent recovery panel.
- Remove the fixed budget amount from the resting answer card. The card states the result; the information affordance explains the calculation; `Review overages` owns action.
- Reuse the explanation drawer for arithmetic and the transaction inventory for action.
- Group by over-budget category instead of creating a new “offending transactions” object or AI-generated queue.
- Reuse transaction detail for category correction; add only the missing coverage field.
- Do not put funding controls directly on every transaction row.
- Do not add a generic `Fix budget` action.
- Do not require a savings account selection in the first slice. `Saved money` is a user-owned declaration, not a balance claim.
- Support full or split coverage through one reconciled amount model rather than adding separate one-off exception types later.
- Do not change the fixed category or monthly plan merely because coverage changes.
- Refuse accusatory language such as `offending`, `problem transaction`, `overspending mistake`, or `resolve all` in the product UI.
- Keep the ordinary positive card informational. Put any warm acknowledgment in the one-time transition receipt, not in the resting state.

## Activation path

Activation is contextual and self-explanatory:

- Show `Review overages` only when the whole-plan Flexible spending state is negative and contributing category/transaction evidence is available.
- Do not show it for stale, incomplete, or unreconciled evidence; those states need their existing trust/recovery action.
- Preserve the current category rows as secondary organic entry points.
- After repeated saved-money corrections in one category, a future release may suggest revisiting that category’s durable plan or reserve strategy. That suggestion is not part of this release.
- No notification, tutorial, badge, or onboarding education is needed.

Natural adoption is Maya using the action when a surprising overage appears, correcting one material transaction, and returning to a result she understands and trusts.

## Accepted trade-offs

- A full-screen grouped review is one navigation step heavier than an inline drawer, but it is clearer and safer for transaction correction.
- The first release can record `Saved money` without identifying a specific account, so it preserves plan truth but does not produce a savings ledger or balance.
- Material-transaction ordering is deterministic and amount-based; it does not claim that the largest transaction is wrong.
- Saved-money treatment may reveal that the durable resource model remains incomplete. The UI states that boundary instead of fabricating precision.

## Rejected trade-offs

- Do not make the amount card itself a hidden tap target.
- Do not auto-select likely savings-funded purchases.
- Do not remove saved-money purchases from category activity or household spending totals.
- Do not route directly to a global plan editor.
- Do not make the user review every transaction before the negative state can clear.
- Do not collapse category, funding, and money meaning into one picker.

## Stated bet

We’re betting that a category-first `Review overages` path will make a negative Budget result feel useful because Maya can quickly find the few transactions shaping it, correct category or funding truth, and see the result change without rewriting history. If users repeatedly enter the review but cannot identify a meaningful correction, we would simplify the action toward explanation and move response/next-month planning into a separate contextual path.

## Success signal

In the iPhone 17 Pro dogfood scenario, Andrew can open August Budget, tap `Review overages`, find the material Health & Activities transaction, mark it `Saved money`, preview the exact before/after Flexible spending result, save, and return to a reconciled Budget where:

- the transaction remains in Health & Activities;
- actual household spending is unchanged;
- only monthly-plan-covered flexible spending decreases;
- the saved-money amount is disclosed;
- no savings balance is invented; and
- reopening or refreshing preserves the correction.
