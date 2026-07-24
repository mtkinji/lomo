# Diverge: budget-detail-month-scoped-activity

## Axis Of Variation

Where should period navigation live: inside the activity inventory, at the page level, or in a broader planning/reporting surface?

## Alternative 1: Activity-Only Date Scope

Add the common inventory control bar above Budget Detail activity rows and include a date-scope menu there. The page meter remains current-month by default, while the activity section can switch between `This month`, `Last month`, `Last 30 days`, and `All history`.

Audience/persona fit: Medium. Maya can find historical rows quickly, but the page still does not clearly explain that the top meter is monthly.

Design-challenge answer: Partial. It helps inspect transaction evidence but does not make the budget itself a selected-month object.

System-fit note: High implementation fit because it reuses the Transactions tab control grammar directly.

Best when: the only problem is "Recent activity is empty."

Fails when: the user asks "what happened last month?" and expects the entire budget detail to answer, not just the row list.

Anti-pattern check: risk of hidden mismatch between current-month meter and all-history transaction rows.

## Alternative 2: Page-Level Month Selector

Add a compact month selector to Budget Detail near the top-level meter. The selected month drives the meter, stats, chart, and activity rows. The activity section gets the common inventory bar for review/filter/sort within the selected month, but date scope lives at the page level.

Audience/persona fit: High. Maya can answer "this month," "last month," and "next month" as budget questions first.

Design-challenge answer: Strong. Budget Detail becomes a monthly budget receipt with scoped transaction evidence.

System-fit note: Medium. It extends the detail model to carry selected-period rows and possibly recompute meter state for non-current months.

Best when: budget trust depends on seeing the same period across numbers, chart, stats, and rows.

Fails when: implementation treats future months as if they have posted transaction activity.

Anti-pattern check: pass if month controls stay compact and the activity inventory bar excludes its own competing date scope.

## Alternative 3: Month Strip With Receipt States

Add a horizontal month strip below the header: previous months are `Actual`, current month is `Live`, future months are `Plan`. Each month has a different receipt state. Past months show actual activity and rollover out. Current month shows observed activity plus forecast. Future months show planned budget, scheduled/expected activity, and rollover in.

Audience/persona fit: Medium-high. It makes period semantics very clear, especially for rollovers.

Design-challenge answer: Strong but heavier. It teaches the model well, but risks a finance-app feel.

System-fit note: Medium-low. Requires more explicit period state, future projections, and rollover semantics than the current code likely has.

Best when: rollovers and month-to-month planning become core product behavior.

Fails when: the UI looks like a reports/planning module instead of a calm budget detail page.

Anti-pattern check: conditional pass; must avoid a big chart/calendar module.

## Alternative 4: Transactions-First Drilldown

Leave Budget Detail current-period focused. Rename `Recent activity` to `Current month activity`, show up to five rows, and make `View all` open Transactions with `budgetId` plus date scope. All historical/future questions are answered in Transactions, not Budget Detail.

Audience/persona fit: Medium. It is simple and respects the inventory surface, but forces a context switch for a budget-specific question.

Design-challenge answer: Weak to medium. It preserves compactness but under-serves "What about last month?" on the detail page.

System-fit note: High. Minimal code change and consistent with the existing transaction-inventory-date-scope brief.

Best when: we need a narrow implementation now and can defer month navigation.

Fails when: Budget Detail remains visually ambiguous about the selected period.

Anti-pattern check: pass for simplicity, but likely too timid for the user request.

## Alternative 5: Rollover Ledger Card

Keep the page current-month by default, but insert a compact rollover/accounting card above activity: `Rollover in`, `Budget`, `Spent`, `Rollover out`. Tapping rows opens last/next month detail. Activity still uses a current-month inventory bar.

Audience/persona fit: Medium. Helpful for rollover-heavy budgets but too accounting-shaped for ordinary monthly lanes.

Design-challenge answer: Partial. It answers rollover math but does not solve activity scope or month navigation broadly.

System-fit note: Medium. Needs rollover data that may not exist yet.

Best when: rollover is the primary confusion.

Fails when: non-rollover budgets get extra financial chrome with little benefit.

Anti-pattern check: risk of dashboard/accounting language; keep as later enhancement.
