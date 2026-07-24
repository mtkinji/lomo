# Pattern: transaction-match-correction

## Prompt

Copilot shows transaction categories with wrapped pills, then asks whether a category change should apply to similar transactions. Kwilt Money should learn from that pattern, but translate it from category management into budget matching.

## Product translation

Copilot says:

> Category changed. Apply to similar transactions?

Kwilt should say:

> Budget match changed. Apply this to similar transactions?

The user is not correcting Plaid's transaction. They are correcting Kwilt's interpretation of which budget the transaction should count toward.

## Display states

Use visible but quiet states for budget matches:

- `suggested`: Kwilt thinks this transaction belongs in a budget, but the user has not confirmed it.
- `confirmed`: the user accepted or created the match.
- `ignored`: the user said this transaction should not count toward this budget.
- `excluded`: the transaction should not count toward any budget meter, at least for now.
- `split`: the transaction contributes to more than one budget.

## Visual treatment

Suggested match:

- budget pill has a soft outline or subtle halo,
- small spark/dot/check-pending icon may appear,
- copy can say `Suggested` in detail view, not necessarily in every row.

Confirmed match:

- solid quiet pill,
- no explanation required in dense lists.

Ignored/excluded:

- muted pill or text,
- should not visually compete with active budgets.

Kwilt should avoid bright category-confetti. Budget pills should be calm and mostly semantic:

- pine for confirmed/on-track,
- turmeric for needs review,
- gray for excluded/ignored,
- madder only when a lane is running hot, not for a transaction label itself.

## Transaction row pattern

Rows can show:

```text
Amazon Marketplace          Shopping        -$24.81
Jun 22                      suggested
```

Or in a denser lane detail:

```text
Amazon Marketplace          [Shopping]      -$24.81
Target                      [Shopping?]     -$37.12
Venmo                       [Unmatched]     -$38.00
```

The `?` or soft outline means suggested, not confirmed.

## Transaction detail pattern

When a transaction is opened:

```text
Amazon Marketplace
-$24.81
Prime Visa

Budget match
[Shopping suggested] [Groceries] [Kids] [Exclude]
```

Actions:

- Move to another budget.
- Remove from this budget.
- Exclude from budgets.
- Split later.

## Correction flow

When the user changes a suggested or confirmed budget match:

1. Update this transaction immediately.
2. Create or update `TransactionMeterAssignment`.
3. Show a follow-up sheet only if there are plausible related transactions.
4. Ask whether to apply the same change to related transactions.

Follow-up copy:

```text
Apply to similar transactions?

Move other Amazon Marketplace transactions to Shopping?

[Update 7 transactions]
[Just this one]
```

If the signal is broad:

```text
Create a rule for this merchant?

Future Amazon Marketplace transactions will be suggested for Shopping.

[Create rule]
[Not now]
```

## Similarity rules

Related transactions can be found by:

- same normalized merchant,
- same original merchant fragment,
- same Plaid merchant entity id when available,
- same account plus merchant,
- same provider category,
- same recurring stream,
- same app/site gate association,
- similar amount range,
- prior user correction pattern.

Kwilt should prefer merchant/account signals before broad provider category signals. "All shops transactions" is too broad for early trust.

## Rules created by corrections

Corrections can produce `MatchingRule` records:

- `merchant_to_budget`: future merchant transactions suggest or confirm a budget.
- `merchant_account_to_budget`: same merchant only from a specific card/account.
- `category_to_budget`: provider category to budget, lower confidence.
- `recurring_to_budget`: same recurring stream to budget.
- `never_for_budget`: do not suggest this merchant/category for this budget.
- `exclude_from_budgets`: exclude matching transactions.

Rules should have a scope:

- just this transaction,
- similar existing transactions,
- future similar transactions,
- both existing and future.

## Product guardrails

- Never mutate the source transaction as if Plaid was wrong; store Kwilt's interpretation separately.
- Do not silently rewrite many transactions without preview.
- Show the number of transactions affected before applying a bulk correction.
- Make bulk changes reversible.
- Avoid asking the user about every correction; ask only when the related set is meaningful.
- Avoid broad category rules in the first slice unless the user explicitly chooses them.

## Recommended first slice

Build:

- suggested versus confirmed budget pill,
- transaction detail budget-match picker,
- "just this one" correction,
- merchant-based "apply to similar" preview,
- create future merchant rule.

Defer:

- splits,
- broad provider-category rules,
- AI rule generation,
- multi-budget bulk editing,
- complex undo history beyond a clear success/toast state.
