# Diverge: budget-credits-and-income-classification

## Axis Of Variation

The main axis is `type-first vs category-first`, crossed with `system-inferred vs user-confirmed`.

- Type-first: the user first decides what kind of money movement this is: income, category activity, transfer, or not counted.
- Category-first: the user chooses a category group such as Income, Expenses, or Transfers, and the budget/reporting behavior follows.
- System-inferred: Kwilt proposes meaning from direction, amount, merchant/source, recurrence, and Plaid category.
- User-confirmed: Kwilt shows the impact and lets the user decide once, optionally remembering future similar transactions.

## Competitive Patterns Checked

- Copilot distinguishes transaction types: Income, Internal Transfer, and Regular. Its help docs say Income has its own app section and is not included in spending budgets; Regular covers spend or refunds; Internal Transfers are excluded from spending budgets. It also lets users change an incorrect type and apply the same change to similar transactions. Source: [Copilot Transaction Types](https://help.copilot.money/en/articles/3971267-transaction-types).
- Copilot does not support income categories; it suggests tags for differentiating income streams. It also says Income and Internal Transfer transactions cannot be categorized as normal expense categories, and only net-positive transactions can be typed as Income. Sources: [Copilot Categories FAQ](https://help.copilot.money/en/articles/10216528-categories-faq), [Copilot Transactions FAQ](https://help.copilot.money/en/articles/10761907-transactions-faq).
- Monarch organizes categories across Income, Expenses, and Transfers, supports custom categories/groups, and supports rules that can update category, tags, owner, merchant name, hidden state, or splits. Sources: [Monarch Default Categories](https://help.monarch.com/hc/en-us/articles/360048883851-Default-Categories), [Monarch Custom Categories and Groups](https://help.monarch.com/hc/en-us/articles/360048883771-Creating-Custom-Categories-and-Groups), [Monarch Transaction Rules](https://help.monarch.com/hc/en-us/articles/360048393372-Transaction-Rules).
- Rocket Money's income guidance says outside-source deposits count as income, transfers should be Internal Transfers, refunds should correspond to the original purchase category so they subtract from that category, shared bills should reduce bill expenses, and business reimbursements should not count against spending or income. Source: [Rocket Money Fixing Income Transactions](https://help.rocketmoney.com/en/articles/3584528-fixing-your-income-transactions).
- Quicken Simplifi has an explicit refund-tracking flow: users can record an expected refund, assign account/category, and later link the downloaded transaction to the expected refund. Source: [Quicken Simplifi Tracking Refunds](https://support.simplifi.quicken.com/en/articles/4731806-tracking-refunds-on-the-mobile-app).

## Alternative 1: Type First, Then Impact

Kwilt adds a `Money meaning` control to transaction detail. For inflows, the primary choices are `Income`, `Category credit`, `Transfer`, and `Not counted`. Choosing `Income` removes the transaction from the category meter and feeds income/runway. Choosing `Category credit` asks which category it offsets and updates the category net position. Choosing `Transfer` or `Not counted` keeps it out of spend and income. This borrows Copilot's clean transaction-type split, but avoids Copilot's limitation that income cannot carry a meaningful source label by letting Kwilt remember source names like Rent, Paycheck, or Benefits internally.

- Audience/persona fit: strong. Maya gets a small number of choices that map to how the money affects her month, not a full accounting chart.
- Design-challenge answer: lets positive transactions carry the right household meaning so category meters and income/runway tell different truths.
- System-fit note: requires a new transaction meaning field separate from `BudgetMatchSource`; the existing transaction detail sheet is the likely surface.
- Best when: the transaction is an inflow and the user needs to decide whether it belongs in income, a category, or neither.
- Fails when: a single inflow needs to be split across meanings, or when the user expects income subcategories visible in the same place as budget categories.
- Primer anti-pattern check: passes if the UI is a short impact choice; fails if it becomes a finance-dashboard taxonomy.

## Alternative 2: Category Group First

Kwilt treats every transaction as belonging to a category group: `Income`, `Spending categories`, `Transfers`, or `Ignored`. Users can create or select `Income > Rental income`, `Spending > Housing`, or `Transfers > Internal transfer`. Rules can remember group/category updates. This is closest to Monarch's model, where Income, Expenses, and Transfers are first-class category groups and rules personalize future transactions.

- Audience/persona fit: medium. It is powerful and familiar to finance-app users, but heavier than Maya's "tell me what is true before I spend" job.
- Design-challenge answer: the same category picker can answer "Income or Housing?" by moving the transaction between groups.
- System-fit note: larger model change. Budget categories currently behave like spending lanes, while income pattern detection is separate. This alternative would merge more of the financial ontology.
- Best when: users want broad customization, income source categories, transfer categories, and rules from the start.
- Fails when: the product starts feeling like Monarch-lite instead of a calm Budget meter connected to Kwilt's spend-intention loop.
- Primer anti-pattern check: risks dashboard/system-management voice; would need strong reduction to fit Kwilt.

## Alternative 3: Meaning Choice With Meter Preview

Kwilt keeps the transaction detail sheet as the only correction surface, but shows a clear two-part choice for ambiguous inflows: `What is this money?` and `What changes if I choose this?` For the rent example, the sheet could show:

- `Income` - Adds $2,200 to income this month. Housing stays at $2,052 spent.
- `Housing credit` - Lowers Housing to $148 ahead this month.
- `Transfer / not counted` - Leaves income and Housing unchanged.

The app can suggest the likely option from recurrence and source, then ask whether to remember it for similar transactions. This is more Kwilt-native than copying Copilot or Monarch because it emphasizes outcome preview over taxonomy.

- Audience/persona fit: very strong. Maya does not have to know the right finance-app category; she sees the consequence and chooses the one that matches her household meaning.
- Design-challenge answer: preserves user-owned meaning while keeping income/runway separate from category credits.
- System-fit note: extends the existing transaction detail sheet and match-rule pattern. Requires transaction meaning persistence and a derived meter explanation.
- Best when: the same source could reasonably be income or category relief, such as rent, roommate payments, reimbursements, and bill splits.
- Fails when: users want bulk setup or category administration before any transaction appears.
- Primer anti-pattern check: passes if the copy stays evidence-first and avoids advice; failure mode is adding too much explanatory furniture inside every transaction.

## Alternative 4: Refund And Reimbursement Inbox

Kwilt creates a small expected-money-back flow for refunds and reimbursements. Users can mark an outflow as `Expecting refund` or `Expecting reimbursement`; when the inflow arrives, Kwilt offers to link it. The category meter can then show the original spend, expected credit, received credit, and net position. This borrows from Simplifi's refund-tracking model and Rocket Money's distinction between refunds, shared bills, and reimbursements.

- Audience/persona fit: medium. It is excellent for planned returns and reimbursements, but too much ceremony for a simple rent deposit or obvious settled refund.
- Design-challenge answer: makes money-back cases inspectable and keeps budgets realistic while waiting for the deposit.
- System-fit note: requires a new expected-credit object, linking logic, and pending states. It may be a later extension after basic inflow meaning works.
- Best when: the user knows a refund is coming and wants the category meter to reflect that before the bank transaction arrives.
- Fails when: credits arrive without prior setup, or when the user does not want another mini workflow.
- Primer anti-pattern check: can fit if scoped to "money back expected"; fails if it becomes a task manager for refunds.

## Alternative 5: Income Source Confirmation

Kwilt keeps category credits separate and focuses the first income release on confirming stable inflow sources. When a repeating inflow appears, Kwilt asks: `Treat this as income going forward?` The choice feeds income/runway and income-pattern detection. Category credits are still handled by current budget assignment and netting logic, but the income source flow is separate from category detail.

- Audience/persona fit: strong for rent-as-paycheck, payroll, benefits, and other dependable deposits. Weaker for refunds because it does not solve category net position by itself.
- Design-challenge answer: gives dependable rent the paycheck-like treatment Andrew expects while protecting income/runway from refunds and transfers.
- System-fit note: fits existing `getIncomePatternAssessment` direction, but needs user-confirmed income-source rules and a way to exclude confirmed income from category matching.
- Best when: the most important problem is "this deposit should count as income."
- Fails when: the visible bug is "my Housing header is wrong after a refund/credit."
- Primer anti-pattern check: passes if framed as confirming observed income, not as forecasting life events or giving financial advice.

## Alternative 6: Minimal Net Position Fix

Kwilt does not add an explicit meaning model yet. It fixes the current accounting mismatch by allowing selected-month budget math to include signed inflows and by changing header copy when net spend is zero or negative. A confirmed inflow assigned to Housing simply reduces Housing, and a negative month says something like `$148 ahead` or `$148 net credit`. Income/runway continues to use existing inflow detection and excludes obvious refunds/transfers heuristically.

- Audience/persona fit: medium. It immediately fixes the screenshot, which matters, but it punts on "How do I flag this as income instead of Housing?"
- Design-challenge answer: answers category net position, but not the broader household meaning question.
- System-fit note: smallest implementation blast radius. It touches `getBudgetForMonth`, live lane clamping, header copy, and forecast/meter assumptions around negative net spend.
- Best when: the priority is quickly restoring trust in the category detail header.
- Fails when: recurring rent should be income and not a Housing credit, or when ambiguous deposits need remembered user meaning.
- Primer anti-pattern check: passes as a bug-like repair; failure mode is silently choosing category relief when the user meant income.

## Comparative Read

Copilot's strongest lesson is to separate transaction type from category. A refund is not the same thing as income just because both are green. Monarch's strongest lesson is that users eventually need rules and group-level meaning, but that can easily become heavy. Rocket Money's strongest lesson is the practical classification policy: outside-source deposits are income, transfers are not income, refunds go back to original category, shared bills reduce bill expenses, and reimbursements should not inflate either income or spending. Simplifi's strongest lesson is that expected refunds are a distinct workflow when the user needs to track money back before it arrives.

## Divergence Takeaway

The best Kwilt direction is probably not pure Copilot, pure Monarch, or pure refund tracking. Kwilt should keep the transaction detail sheet as the user's moment of meaning, show a short impact preview, and remember the choice for similar transactions. That preserves the calm meter experience while creating enough domain structure for income/runway, category credits, transfers, and not-counted deposits to behave differently.
