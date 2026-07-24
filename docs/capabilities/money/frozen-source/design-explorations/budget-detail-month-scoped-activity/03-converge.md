# Converge: budget-detail-month-scoped-activity

## Qualitative Score

| Alternative | Persona fit | JTBD fit | System fit | Blast radius | Notes |
| --- | --- | --- | --- | --- | --- |
| Activity-Only Date Scope | Medium | Medium | High | Low | Easy but creates mismatch risk between page meter and row period. |
| Page-Level Month Selector | High | High | Medium | Medium | Best balance: Budget Detail becomes coherent without becoming a report. |
| Month Strip With Receipt States | Medium-high | High | Medium-low | High | Strong model, too much for the current slice. |
| Transactions-First Drilldown | Medium | Medium | High | Low | Useful fallback but leaves Budget Detail underspecified. |
| Rollover Ledger Card | Medium | Medium | Medium | Medium | Valuable later, but too rollover-centric for all budgets. |

## Chosen Alternative

Choose `Page-Level Month Selector`.

Budget Detail should become a selected-month budget receipt. The selected month drives the meter, chart, stats, and activity rows. The common inventory bar sits above activity for row-level configuration inside the selected month.

## Capability Delta

Today, Maya cannot:
- Tell at a glance which month Budget Detail is explaining.
- Distinguish "no current-month activity yet" from "no transaction history exists."
- Ask "what happened last month?" without leaving the budget context.
- Ask "what happens next month if rollover or recurring spend matters?" in the place where the budget is already being inspected.

After this concept ships, Maya can:
- See `July 2026` or another selected month as the Budget Detail context.
- Switch to previous and next months from the detail page.
- See activity rows that match the selected budget month.
- Use common inventory controls to filter/sort/review the selected month's activity evidence.
- Open the full Transactions inventory with the same budget and month context.
- Understand future month rows as expected/scheduled evidence rather than posted transactions.

Still intentionally unsupported:
- Arbitrary date picker.
- Full year calendar.
- Rollover editing.
- Saved views.
- Cross-budget reports.
- Transaction export.

## Accepted Trade-Offs

- Add month navigation at the page level instead of only in the activity inventory.
- Let future-month support be a forecast preview in the first slice, not a fully editable planning model.
- Keep Budget Detail as the place to inspect one budget, not compare many budgets.
- Reuse the inventory control bar for activity rows, but remove date scope from that bar in Budget Detail.

## Rejected Trade-Offs

- Do not show all-history rows under a current-month meter.
- Do not add a big calendar or charting module.
- Do not teach rollovers through long explanatory copy.
- Do not rename the Transactions tab into a budget-specific history surface.

## System Implications

- Budget Detail needs a selected month state, initialized to the current month.
- Live snapshot/detail data should be able to expose all budget-matched rows, not only current-period rows, so non-current selected months can render real evidence.
- Budget meter computation should accept a selected period or an equivalent period input before historical/future months can be fully truthful.
- For the first build slice, past months can be computed from posted transaction rows and current budget settings; future months can show planned/scheduled/expected state with clear labels.
- `View all` should pass `budgetId` and the selected month/date context to Transactions.
- The shared inventory controls should remain row-level controls: review filter, sort, perhaps status. Month selection belongs above the section.

## Reductive Design Decisions

- Rename `Recent activity` to a period-specific label such as `July activity`.
- Put one compact month selector near the budget meter, not inside the activity section.
- Use only adjacent month navigation first: previous, selected month label, next.
- Keep the existing compact `TransactionMatchRow` budget-evidence context.
- Show at most the same preview count on Budget Detail; `View all` remains the path to the full inventory.
- Empty state should be one calm receipt line, for example `No July Housing transactions yet.`
- For future months, do not render empty transaction rows as if data is missing; render `Expected` evidence when scheduled spend exists.

## Activation Path

No onboarding. The active month label is the teaching moment.

On July 1, if current-month activity is empty but historical budget rows exist, the empty state can expose a compact action to `View June`. If the user taps `View all`, Transactions opens with the same budget and relevant date scope.

## Bet

We're betting that making month the parent context of Budget Detail will make sparse current-month activity feel truthful instead of broken, while the common inventory bar keeps transaction evidence inspectable without turning the page into a ledger. If this does not hold, revisit by reducing month navigation to a single `This month / Last month` toggle before adding broader planning features.

## Success Signal

On July 1, a user can answer:
- Which month am I viewing?
- Why are there few or no transactions here?
- How do I see last month's activity?
- What would next month include if scheduled spend or rollover applies?
- How do I open the full transaction inventory for this same budget context?
