# Learning Release: category-rollovers

## Concept To Build

A category can roll its prior-month over/under amount into the next month, and the meter shows that adjustment as part of current available room.

## Capability Delta

Today, the user cannot:
- Carry unused category budget into the next month.
- Let overspend reduce next month's visible room.
- See rollover math in Summary or category detail.

After this release, the user can:
- Enable rollover for a monthly category.
- See rollover-adjusted remaining room.
- Inspect carry-in and carry-out on category detail.

Still intentionally not supported:
- Manual rollover entries.
- Transfers between categories.
- Rollover prompts.
- Custom expiration or caps.
- Non-monthly cadence rollover.

## User Experience

Maya opens a category detail and edits the monthly budget plan. Under the amount, she sees a simple toggle: `Roll over month to month`.

When rollover is enabled and the selected month has a non-zero carry-in, the meter keeps the same shape but shows a compact fact such as `+$42 from June` or `-$18 from June`. The main meter still answers spend reality: spent, available, pace, and forecast.

In category detail, a small month facts row can show:
- `Monthly budget`
- `Rolled in`
- `Spent`
- `Rolls out`

Summary category cards should use the rollover-adjusted available room. They do not need to show the full math unless the carry-in materially changes the number.

## Existing Product Relationship

This enhances the existing Summary and category detail surfaces. It does not create a new planning screen. It builds on the selected-month category detail direction where rollover was previously deferred until durable math existed.

## Buildable Slice

Must be real:
- Durable per-category rollover policy.
- Pure helper for monthly rollover computation.
- Current-month meter uses effective budget/available room when rollover is enabled.
- Category detail shows carry-in/carry-out facts.
- Summary and detail agree.
- Forecast smoke tests cover positive and negative rollover.

Can be thin or temporary:
- UI can expose a single toggle only in category detail settings.
- Preview data can include one rollover-enabled category.
- Future-month display can be limited to one adjacent next month if the selected-month model supports it.

Intentionally excluded:
- Month-close prompt.
- Manual adjustment editor.
- Transfers.
- Rollover caps.
- Widget/app-control rollover copy, except consuming shared meter math if already wired.

## Release Channel

TestFlight build.

Rollover changes financial interpretation across core surfaces, so the learning release should be bundled and exercised in the native app with realistic connected or preview data before any production-default rollout.

## Brand-Goodwill Guardrails

- Keep rollover off by default for existing categories unless a user explicitly enables it.
- Label preview/demo rollover data clearly if used.
- Show carry-in only when non-zero.
- Use non-shaming copy for negative rollover.
- Keep transaction activity free of synthetic rollover rows.

## Reversibility

The feature can be hidden by ignoring the rollover policy in UI and returning meters to base monthly budget math. Store policy separately from transactions so rollback does not require mutating transaction evidence.

## Permanent Product Threshold

Promote this to accepted product capability when simulator/TestFlight use proves that Summary and detail agree, negative and positive carryover are understandable without explanation panels, and `test:forecast` protects the math against future budget-period changes.
