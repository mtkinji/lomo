# Frame: budget-credits-and-income-classification

## What the user said

> I realize that I don't have a way of flagging certain transactions as income, and I our top metric doesn't account for refunds or negatives. So in this case I have a rental properyt and was paid $2200 rent. If this were categorized as a regular housing transaction, and it currently is, then my total position for the month should be in the negative right now (in a good way, like negative spend). This makes me realize a few things: 1. I need a better way of categorizing income 2. I need a better way of handling credits to my account for cases like refunds so that features like the $2,082 pent / $2,400 reflect that. Consider any other adjacent use cases you might find and run a design-thinking-loop.

Follow-up:

> I could go either way on the question of how to handle income from rent. In my mind though, it's consistent, repeating, and dependable, like a paycheck. So I'd lean towards treating it as income, rather than a basic credit against the category position. That being said, a solution that gives users choice may be best so they can create the meaning from it they want.

## Restated in user voice

When money moves back into my account, I want Kwilt to know whether it is household income, a category credit, a refund, reimbursement, transfer, reward, or mistaken match, so the budget meter tells the truth without making me babysit every transaction or treating all positive money as spend relief.

## Target audience

`audience-aspirational-family-organizers` - households trying to keep ordinary financial choices aligned without adopting a finance dashboard or manual bookkeeping habit.

## Representative persona

Maya: a parent or household lead who wants calm support for ordinary family decisions.

- Current situation: Maya uses category meters to understand the month before spending, but account credits can make the meter lie if they are not interpreted.
- What they're trying to become/do: keep a trustworthy picture of household spending and resources with as little manual categorization as possible.
- Emotional state or tension: she is willing to review weird transactions, but only if the review clearly protects truth instead of creating accounting chores.
- What would make this feel wrong to them: forcing an accounting taxonomy, hiding money coming back in, letting a refund inflate income, or letting income assigned to a category erase real spending without explanation.

## Hero anchor

`jtbd-trust-this-app-with-my-life` - money state and app-control decisions are high-trust surfaces; the app must explain what counted, what did not, and why.

## Job flow step

Flow: `job-flow-maya-review-budget-reality-before-spending`

Step: Understand the spend reality in plain language: what this category is for, spend against budget limit, percent used, spend pace versus the month, and projected month-end usage.

Current product offering: the budget detail page shows a category header, spend/budget metric, forecast card, chart, stats, and transaction activity. The activity list already distinguishes inflow rows visually with a positive green amount, but the header still speaks in gross-spend language.

Delivery score: current local flow scores this step as `4`. This issue exposes a trust gap inside that score: the app can show category reality, but not yet category credits or income semantics with enough honesty for a real household account.

Gap: the category meter needs to represent net category position and credit/income classification without becoming a general ledger or finance dashboard.

## Active anchors

- `jtbd-trust-this-app-with-my-life` - the app must not overstate spend, hide refunds, or misclassify income in a way that changes financial confidence.
- `jtbd-review-budget-reality-before-spending` - the category meter is supposed to answer "what is true right now?" before the next spending decision.
- `jtbd-carry-intentions-into-action` - learned classification rules should reduce repeated review work and keep future meters current.

## serves snippet

```yaml
serves: [jtbd-trust-this-app-with-my-life, jtbd-review-budget-reality-before-spending, jtbd-carry-intentions-into-action]
```

## Friction we're addressing

The current category surface has a sign problem and a meaning problem. A positive transaction can be visible in activity while the headline still says `$2,082 spent / $2,400`, which implies the credit either did not count or was only allowed to reduce spend to zero. The user also cannot say whether a positive transaction is true income, a category-specific credit, a refund, a reimbursement, an internal transfer, a reward, or something to exclude.

## Provisional Product Decision

Repeating dependable rent should default toward `income`, not category relief, because the user experiences it as a paycheck-like resource. The first time Kwilt sees a rent-like inflow, it should offer a choice that sets meaning for future similar transactions: `Treat as income` or `Treat as a Housing credit`. Refund-like and reimbursement-like inflows should default toward category credits when they can be tied to a category, while transfers, rewards, and unclear deposits should stay conservative until reviewed.

## Adjacent Use Cases

- Rent received from a rental property: defaults toward income when it is repeating and dependable, with user choice to treat it as a category/property credit instead.
- Retail refunds and returns: should usually reduce the original category's spend, possibly even below zero for the month if the refund exceeds spend.
- Reimbursements: may reduce spend only if tied to a category purchase; otherwise should not be treated as income available for living-percent forecasting.
- Bill credits and utility adjustments: should reduce that bill/category and may need to explain why a normal bill looks lower this month.
- Insurance, escrow, deposit, or security-deposit returns: large inflows that should not be mistaken for recurring income.
- Cashback, rewards, interest, and statement credits: small credits that may be ignored, classified as credits, or excluded from category spend depending on user preference.
- Transfers between owned accounts: should usually be excluded from income and category relief.
- Chargebacks, reversals, duplicate corrections, and pending-settled pairs: should protect the meter from double-counting while still leaving an inspectable transaction trail.
- Split cases: a single credit may partly reimburse groceries and partly be unrelated cash back.

## System alignment

Constraint posture: `Extend the system`

Current system facts:

- Existing surface: `app/budgets/[budgetId].tsx` rebuilds the selected month detail from `selectedMonthTransactions`, shows the category header, chart, forecast card, stats, and activity rows.
- Existing user flow: users can open a transaction detail sheet from the budget activity list, choose a budget, create a budget, mark a transaction unbudgeted, and apply a choice to similar transactions.
- Existing domain/data model: `NormalizedTransaction` has `direction: 'inflow' | 'outflow'`, `amountCents`, source metadata, and Plaid personal finance category, but `BudgetMatchSource` only models budget assignment state: inferred, confirmed, corrected, excluded, rule, or unmatched.
- Existing technical affordances: `getConnectedSpendBudgetSnapshot` already computes live lanes from Plaid rows, `getBudgetLaneMeter` supports inflow rows as negative spend in forecast math, and forecast evidence already names pending/unconfirmed/low-confidence credits.
- Existing mismatch: `toLiveBudgetLane` subtracts settled inflows from outflows but clamps `spentCents` at zero, while `getBudgetForMonth` currently counts only outflows for the selected month.
- Existing income layer: `getIncomePatternAssessment` intentionally treats likely payroll-style income separately and excludes refunds, transfers, savings, dividends, payment apps, and similar inflows from stable income detection.
- Existing UX/copy conventions: Budget should tell the truth about money pattern, offer one useful next step, keep the user in control, and avoid dashboard/accounting language or shame.

Constraints to preserve:

- Keep transaction rows as the inspectable source of truth.
- Keep category language calm and practical: Housing, Groceries, Shopping, not accounting labels first.
- Keep income/runway detection separate from refunds and category credits.
- Let users create meaning for ambiguous inflows without making every category meter depend on manual bookkeeping.
- Do not require users to classify every transaction before the meter is useful.
- Do not promise real-time bank truth beyond the latest Kwilt DB snapshot and sync freshness.

Constraints we may challenge:

- `spentCents` may need to become net position for category presentation, or be paired with a separate `creditCents` / `netSpendCents` field so negative category position can be represented honestly.
- `BudgetMatchSource` may be too narrow because it combines assignment confidence with transaction meaning; a separate classification dimension may be needed.
- The header copy `$X spent / $Y` may not fit categories that are net-negative for the month.

Design implication:

This should not become an "income categories" screen first. The sharper product work is a transaction meaning layer that can feed two different truths: category net position and household income/runway. The first release should make credits/refunds visible and correct in the existing budget detail and transaction review flow, while allowing dependable recurring inflows like rent to become income patterns through user-confirmed meaning.

## Aspirational design challenge

How might we help Maya give positive transactions the right household meaning, so category meters and income/runway both tell the truth while preserving Kwilt's calm, evidence-first budget experience?

## Out of scope

- Tax, profit-and-loss, rental-property accounting, or business bookkeeping.
- Full split-transaction support in the first learning release.
- Automatic advice about whether rental income should be taxable or budgeted.
- Production notifications about credits or income.
- A new finance dashboard or standalone income-management section.

## Resolved Assumption

Dependable repeating rent should be offered as income by default, with a visible choice to treat it as a category/property credit when that matches the user's mental model better.
