# Visual Direction: home-runway-and-lanes

## Prompt

Use the Robinhood mobile pattern as visual inspiration: a dominant top chart for the total state, with compact individual rows below. Translate it into Kwilt Money's language for income/spend and budget lanes.

## What to borrow from Robinhood

- Strong hierarchy: one large number and chart define the screen.
- Dense scanability: individual holdings/budgets are rows, not bulky cards.
- Inline trend context: each row has a tiny sparkline or pace indicator.
- Quick comparison: right-side pills make state visible without reading every line.
- Minimal chrome: the data carries the interface.

## What not to borrow

- Trading intensity.
- Red/green profit-loss psychology as the primary emotional signal.
- Black neon visual identity.
- Daily volatility as the main story.
- A portfolio mindset where the user is invited to check constantly.

## Kwilt translation

The top of the home screen should answer:

> How is this month moving?

Not:

> How did my portfolio perform today?

Use a calm "household runway" chart:

- income and spend over the month,
- remaining runway,
- current spend pace versus expected pace,
- optional net cash movement,
- sync freshness.

Then show individual budget lanes below:

- Shopping
- Takeout
- Groceries
- Kids
- Subscriptions

Each lane row shows:

- lane name,
- budget amount and period,
- spent or remaining,
- small pace sparkline,
- right-side status pill,
- optional app-control marker if a lane gates apps/sites.

## Screen sketch

```text
June
Household runway

$1,420 remaining
On pace through Jun 24

[ calm line/area chart of cumulative spend vs expected pace ]
Income +$6,800     Spend -$5,380

Budget lanes

Shopping                 [sparkline]     $42 left
$58 of $100 monthly                     app gate

Takeout                  [sparkline]     ahead
$186 of $220 monthly                    3 days fast

Groceries                [sparkline]     steady
$640 of $800 monthly

Subscriptions            [sparkline]     synced
$92 of $120 monthly
```

## Design language

Use Kwilt's existing warm-light palette:

- canvas: white or `gray50`,
- top chart surface: `pine900` only if it is the single dominant visual block,
- positive/steady state: pine,
- caution: turmeric,
- over pace: madder,
- neutral labels: gray/stona text,
- cards/rows: 8px radius or less.

Avoid a one-note green dashboard. Pine can be the trust color, but the screen needs neutral space and sparse warning color.

## Product structure

This suggests a home information architecture:

1. `MonthRunwayHeader`
   - total remaining,
   - income/spend summary,
   - pace status,
   - sync freshness.

2. `RunwayChart`
   - cumulative spend,
   - expected spend line,
   - income events or net movement as a secondary layer.

3. `BudgetLaneList`
   - rows, not large cards.
   - each row can open lane detail.

4. `LaneRow`
   - lane meter,
   - mini trend/pace,
   - status pill,
   - app-control indicator.

5. `CreateBudgetLaneCTA`
   - quiet action at bottom or top-right.
   - "New budget" rather than "Add category."

## Interaction model

Tap top chart:

- opens monthly cashflow detail,
- still not a transaction ledger by default.

Tap lane row:

- opens lane detail,
- shows matched/suggested spend,
- lets user add app controls.

Tap app-control indicator:

- opens rule summary: "Before Amazon opens, show Shopping."

## Reductive recommendation

Build the first version as:

- one top monthly runway chart,
- three lane rows,
- no tabs inside the chart,
- no transaction list on the home screen,
- no daily P/L language,
- no red/green market styling.

The bet is that Robinhood's hierarchy and row density can make Kwilt Money feel alive and current, while Kwilt's copy and colors keep it from feeling like a trading app.
