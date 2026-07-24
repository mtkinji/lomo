# Frame: category-rollovers

## What the user said
> Remind me to add a feature to allow rollovers from month to month in Quilt Budget.

## Restated in user voice
When Maya finishes a month under or over a category's budget, she wants that reality to follow the next month automatically, so that the category meter reflects the household's actual room without manual mental math.

## Target audience
`audience-aspirational-family-organizers`: households trying to become more organized without adopting a finance methodology.

## Representative persona
Maya: a parent or household lead who wants calm support for ordinary family decisions.

- Current situation: she uses categories such as Groceries, Shopping, Restaurants, Car, or AI tools to keep normal spending intentional.
- What she's trying to do: understand this month's real room after last month's under- or overspend.
- Emotional state or tension: a category can look okay or over-limit for reasons that belong to the prior month, and unexplained carryover math can feel untrustworthy.
- What would make this feel wrong to her: accounting language, a ledger-like rollover editor, or unexplained negative balances that feel punitive.

## Hero anchor
`jtbd-trust-this-app-with-my-life` - money math must be explainable, reversible, and consistent across the app.

## Job flow step
`job-flow-maya-review-budget-reality-before-spending`, step `see-budget-reality`: Maya needs to see the relevant category meter before spending. Current delivery is strong for current-month spend, but incomplete for categories where last month's remainder should change this month's available room.

## Active anchors
- `jtbd-trust-this-app-with-my-life` - carryover math changes financial truth and must be inspectable.
- `jtbd-review-budget-reality-before-spending` - the meter should answer the current spending decision with the right month-to-month context.
- `jtbd-carry-intentions-into-action` - rollover should help a household keep a category pattern without reconfiguring every month.

## Friction we're addressing
The app currently treats the monthly budget limit as a clean reset. That is simple, but it can misstate current reality for categories where underspend should create extra room or overspend should reduce next month's room. The user should not have to remember or manually adjust last month's difference.

## System alignment
Constraint posture: `Extend the system`

Current system facts:
- Existing surface: `Summary` shows month-level category meters; `app/budgets/[budgetId].tsx` shows category detail with selected-month meter, chart, stats, and activity evidence.
- Existing user flow: users create/edit categories, review transaction evidence, and inspect selected-month category detail.
- Existing domain/data model: category definitions carry `budgetCents`, selected period fields, `spentCents`, forecast settings, and transaction-derived period rows. Rollover is named in docs as budget math, but no durable rollover setting or computed carry-in/out exists yet.
- Existing technical affordances: `getBudgetForMonth(...)` already derives selected-month spend from dated transaction rows, and the month-scoped detail brief already treats future support as a preview until durable rollover values exist.
- Existing UX/copy conventions: user-facing language should say `category`, `monthly budget`, `remaining`, and `rollover`; avoid exposing persistence names or Plaid/provider categories.

Constraints to preserve:
- Rollover is budget math, not a transaction row.
- Summary and category detail must agree on available room.
- The first release should not turn Budget into a full planning calendar.
- User-facing copy should be compact and literal.

Constraints we may challenge:
- Category budget settings need a policy field for whether month-to-month difference carries forward.
- Selected-month meter math needs effective budget or available-room inputs beyond raw monthly limit.
- Future-month preview should become truthful enough to show rollover-in when prior-month math is known.

Design implication:
Treat rollover as an optional property of a category's budget plan. The meter can remain the primary surface, but its math should separate base monthly budget, rollover adjustment, spent amount, and remaining room.

## Aspirational design challenge
How might we help Maya trust this month's category room after last month's over- or underspend, while preserving Kwilt Money's calm meter-first experience?

## Out of scope
- Account-level cash-flow rollover.
- Envelope transfers between categories.
- Multi-month savings goals.
- Arbitrary rollover expiration rules.
- Rollover transactions in the activity list.
- Household approval or shared budgeting.

## Open question
Should overspend always carry forward when rollover is enabled, or should users be able to carry positive remainder only?
