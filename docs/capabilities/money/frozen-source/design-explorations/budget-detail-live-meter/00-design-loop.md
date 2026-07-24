# Design Loop: Budget Detail Live Meter

## Frame

The reference image works because it treats each budget as a live resource meter, not a finance summary. It names what the budget is for, shows spend against limit with percent used, compares usage to period progress, and projects where the user will land by month end.

## Existing Jobs

Kwilt Money already documents the consumer job in `docs/job-flows/maya-review-budget-reality-before-spending.md`: Maya wants to see budget reality before spending, especially when an app or service can quietly pull her household off track.

The existing job step was too broad for the detail page. The page needs to support this sharper step:

- See what this budget is for.
- Understand how much has been used as a fraction of the limit.
- Compare current usage to where the period is.
- See a plain-language pace state.
- See projected period-end usage.
- Optionally notice today's spend without letting it dominate.

## Yes-And

Yes, and this should serve finances and AI spend with the same object model. A budget can be `Groceries`, `Shopping`, `OpenAI API`, `Adobe`, or `AI experiments`; the core question is still whether a consumable resource is being used at a sustainable rate for the period.

## Divergent Options

1. Keep the three metrics and add a projection card. This is low-risk, but leaves the page split between old accounting stats and new pace language.
2. Rebuild the top of detail as an aispendtracker-style resource meter. This best serves the job because usage fraction, month pace, and projection become one read.
3. Add charts and transaction trend analysis. This could be powerful later, but it risks turning the page into a finance dashboard before the core glance is proven.

## Converged Bet

Use option 2, but make it native to the page rather than another contained card. Replace `Spent / Left / Limit` with one unframed meter section:

- `spent / limit (percent)`,
- a thin usage progress rail with a single month-progress marker,
- `Usage X vs month Y` plus pace state,
- spent today, expected by now, projected month-end spend, and projected month-end usage.

We are betting that one coherent meter will help users answer "how is this budget doing?" faster than three standalone metrics. If it feels too dense in real use, the first thing to remove is the lower detail row, not the usage/pace/projection core.

## Reductive Refinement

After reviewing the first UI pass, the stronger opinion is:

- The page title already identifies the budget. Do not repeat the title, description, or app context inside the meter.
- The page itself is the container. Do not wrap the meter in another card unless it becomes a reusable row/card elsewhere.
- Use one rail for actual usage and one visible marker for where the month is. Do not add a second pill-shaped projection marker; projection belongs in the fact rows.
- The supporting rows should read like calm account facts, not dashboard callouts. Use regular or medium-weight row typography and tabular numbers.
- `Projected month-end usage` is important, but not more important than the other fact rows. It should not use a special heavy weight.
- Prefer existing finance typography tokens over one-off font weights. If the current token set cannot express the hierarchy, improve the token system rather than piling bespoke weights into the component.

## Learning Release

Ship this as a local detail-page improvement backed by the existing fixture transaction projection. No new setup, no new settings, no new domain object, and no permanent AI-provider integration yet.

Success signal: the detail page can explain both household and AI spend lanes without needing a ledger-first read.
