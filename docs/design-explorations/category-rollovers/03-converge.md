# Converge: category-rollovers

## Scoring

| Alternative | Persona fit | System fit | Learning value | Implementation risk | Decision |
| --- | --- | --- | --- | --- | --- |
| Simple Rollover Toggle | High | High | High | Medium | Choose |
| Month Receipt With Carry-In/Carry-Out | Medium-high | Medium | Medium-high | Medium | Support in detail, not primary |
| Month-Close Suggestion | Medium | Medium-low | Medium | High | Defer |
| Manual Adjustment Entry | Low-medium | Medium | Low | Medium | Reject for first release |
| Rollover Modes Per Category | Medium | Medium | Medium | Medium-high | Keep as internal model option only |

## Chosen Alternative

Build a simple per-category rollover toggle that adjusts the category meter's available room from month to month.

The first product surface is the category budget plan, not a new rollover center. Summary and category detail should show the adjusted available room when rollover is on, with a compact explanation of any non-zero carry-in.

## Capability Delta

Today, the user cannot:
- Make a category carry last month's unused room into this month.
- Make prior overspend reduce this month's available room.
- See why this month's remaining amount differs from the base monthly budget.
- Preview next month's room using this month's likely rollover.

After this release, the user can:
- Turn rollover on for a category.
- See this month's available room include last month's carryover.
- Inspect the carry-in/carry-out math on category detail.
- Trust that Summary and detail use the same rollover-adjusted meter.

Still intentionally not supported:
- Moving money between categories.
- Manual monthly adjustment entries.
- Rollover expiration.
- Savings-goal accumulation.
- Month-close prompts or notifications.

## Reductive Design Decisions

- Enhance category budget settings instead of creating a new rollover page.
- Use one user-facing toggle first: `Roll over month to month`.
- Keep rollover display as compact money facts near the meter.
- Do not put rollover rows in transaction activity.
- Do not expose multiple rollover modes in the first UI.
- Do not explain the feature with long education copy; the math line should teach it.

## Accepted Trade-Offs

- The first release may support only automatic computed rollover from transaction-backed actuals.
- Rollover may be available only for monthly categories at first.
- Historical months before connected data may not produce carryover.
- Future-month previews can show rollover only when enough prior/current data exists.

## Rejected Trade-Offs

- Do not silently change remaining room without a visible carry-in explanation.
- Do not make users manually enter rollover amounts as the default path.
- Do not treat rollover as income, credit, or transaction evidence.
- Do not add a full budget calendar before Summary/detail math is trusted.

## System Implications

- Category budget settings need a durable rollover policy.
- Meter computation needs to distinguish base monthly budget, rollover adjustment, effective available amount, spent, remaining, and carry-out.
- Summary, detail, widgets, and app-control gates should eventually consume the same computed meter state.
- `npm run test:forecast` should cover rollover math across prior/current/next month examples.

## Activation Path

No onboarding in the first release.

The activation moment is category budget editing or category detail after a completed month. A compact setting can explain the behavior with literal copy: `Unused or overspent amounts carry into the next month.`

Discovery can be organic at first. If self-use shows the feature is hidden, add a later month-close suggestion.

## Bet

We're betting that a per-category rollover toggle plus compact carry-in/carry-out facts will make monthly category meters feel more truthful without making Kwilt Money feel like a bookkeeping app. If this turns out not to be true, revisit by reducing the feature to positive-only rollover or moving rollover explanation deeper into category detail.

## Success Signal

Andrew can open Summary and category detail for a rollover category and immediately answer:
- What is the base monthly budget?
- What came from last month?
- How much room is available now?
- What will carry into next month if the month ended today?
