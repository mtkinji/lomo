# Frame: budget-detail-month-scoped-activity

## What the user said
> The intent of this branch is to improve and commonize the inventory patterns for Transactions in the app. And indeed we should be able to reuse a common inventory configuration bar on top of any view we end up needing in the app.
>
> So now I want to figure out how to implement our common inventory pattern for the "Recent activity" section in the Budget detail page.
>
> One of the challenges in this page is that the budget is not clearly expressed to the user as being scoped to a given time period. The app clearly runs on a monthly basis, so here on July 1 there will be relatively few transactions... So not only do I think the budget page overall should be more clearly scoped to a given month, I think the user should be able to answer the question, "What about last month?" "What happens next month if I am using rollovers?"

## Restated in user voice
When Maya opens a budget detail, she wants to know which month she is looking at and why the activity list has the rows it has, so that she can trust the budget meter without falling into a generic transaction ledger.

## Target audience
`audience-aspirational-family-organizers`: households trying to become more organized without adopting a finance methodology.

## Representative persona
Maya: a parent or household lead who wants calm support for ordinary family decisions.

- Current situation: she is checking a budget such as Housing, Shopping, or Groceries on the first day of a month, when current-month transactions may be sparse.
- What she is trying to do: understand whether this budget is okay, what happened last month, and what next month may look like if rollover or recurring spend matters.
- Emotional state or tension: sparse current-month rows can look like missing data; all-time rows can look like bookkeeping.
- What would make this feel wrong to her: a "Recent activity" section that quietly mixes periods, hides period scope, or uses ledger controls to answer a budget-month question.

## Hero anchor
`jtbd-trust-this-app-with-my-life` - financial detail needs to be transparent, reversible, and scoped clearly enough to trust.

## Job flow step
`job-flow-maya-review-budget-reality-before-spending`, step 4: understand the spend reality in plain language. Current delivery is partial: budget meters are period-scoped, but Budget Detail does not make the selected month a first-class context and the activity section reads as a free-floating recent feed.

## Active anchors
- `jtbd-trust-this-app-with-my-life` - month scope, rollover math, and transaction evidence must be inspectable.
- `jtbd-review-budget-reality-before-spending` - the default view still needs to answer current budget reality before spending.
- `jtbd-carry-intentions-into-action` - the detail page should support correction/review without turning Maya into a bookkeeper.

## Friction we're addressing
Budget Detail has current-period math, but the visible page does not fully teach that the budget is a monthly object. On July 1, a category can show very few or zero rows even though the account has meaningful June history. The user needs to move between this month, last month, and next month without losing the simple budget-meter read.

## System alignment
Constraint posture: `Extend the system`

Current system facts:
- Existing surface: `app/budgets/[budgetId].tsx` already has a Budget Detail screen with a page-native meter, compact `Recent activity` rows, stats, and a transaction detail drawer.
- Existing user flow: Budget Detail is reached from the Budget tab and links to the Transactions tab with `budgetId` as context.
- Existing domain/data model: budget definitions already carry `periodLabel`, `startsOn`, `endsOn`, current-period meter fields, transaction rows, scheduled-spend settings, and a live snapshot. The Transactions tab already has an explicit date-scope control and complete inventory behavior through `allTransactions`.
- Existing technical affordances: transaction rows have dates; live snapshot separates current-period rows from all loaded rows; budget meter code computes period-based forecast values; the transaction detail sheet can operate against scoped row sets.
- Existing UX/copy conventions: object-inventory controls are compact icon menus with counts; Budget Detail rows should stay quieter than the full Transactions inventory row; repeated metadata belongs in the drawer.
- Outside-app research: Monarch, Copilot, and YNAB all treat budget detail as month-scoped first, with transaction activity as evidence inside that period. Rollovers are shown as prior-month carry-in affecting current/next remaining amounts, not as ordinary posted transactions.

Constraints to preserve:
- Budget Detail should not become a finance dashboard.
- Budget Detail rows should remain evidence rows: merchant, date grouping, amount, and small exception/review marker.
- Transactions tab remains the full inventory for all loaded rows.
- The common inventory bar should be reusable, but it should not own the page's selected budget month.

Constraints we may challenge:
- The detail page should stop treating current month as implicit state.
- The live budget detail model may need both selected-period rows and all budget-matched rows.
- `View all` should carry the selected budget and selected period context into Transactions.

Design implication:
Month is the parent context for Budget Detail. Inventory controls sit inside that context and answer "which rows within this selected budget month?" rather than "which month is this budget?"

## Aspirational design challenge
How might we help Maya inspect a budget as a monthly object, while preserving Kwilt's compact inventory grammar and avoiding a ledger-first finance dashboard?

## Out of scope
- Arbitrary custom date ranges.
- Full calendar or year grid.
- Deep rollover editing.
- Category-group budgeting.
- Saved transaction views.
- New onboarding or educational panels.

## Open question
Should the first implementation allow `Next month` before the app has durable rollover settings, or should it show next month only as a forecast preview with explicit temporary assumptions?
