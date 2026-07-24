# aispendtracker Reference

Source context: `roymerrill/aispendtracker`, a small menu-bar utility for tracking AI spend against monthly limits.

These screens are stored as product-context references because they prompted the hypothesis that a lightweight live meter can work for budgeting: show percent consumed, pace against the period, and projected end-of-period usage close to the moment of spending.

## Screens

1. [Menu bar indicator](./01-menu-bar-indicator.png)
   - Tiny ambient status in the operating system chrome.
   - Multiple accounts can each expose a compact percent used signal.

2. [Menu bar popover](./02-menu-bar-popover.png)
   - Current spend against limit is the dominant read.
   - Today, projected today, month pace, and projected month-end usage sit directly under the account.
   - The useful emotional move is "under pace" versus "over pace," not only raw dollars spent.

3. [Settings accounts](./03-settings-accounts.png)
   - Accounts are explicit, named, reorderable, and can be shown or hidden from the always-visible surface.
   - The app separates account connection/setup from the quick consumption view.

## What Kwilt Money Should Borrow

- Ambient glanceability: a budget lane can be understood from a small status surface.
- Percent consumed plus dollars: `34%` is faster to parse than a ledger row, but dollars keep it grounded.
- Pace comparison: budget health is about spend rate versus period progress, not only whether the limit is already crossed.
- Projection: "projected month-end usage" maps naturally to "projected month-end spend."
- Multi-lane scan: several budgets can live side by side if each row stays compact.
- Account or lane visibility controls: not every connected source or budget deserves the always-visible treatment.

## What Not To Copy Directly

- The desktop menu-bar shell is inspiration, not the target surface for the mobile app.
- The pink-purple visual style should not become Kwilt Money's palette by default.
- AI provider/account terminology should translate into Kwilt's budget lanes and household resources.
- The UI should avoid implying precision when transaction sync is stale or budget matching is uncertain.

## Kwilt Money Translation

The equivalent mobile pattern is a live resource meter:

- `Spent / limit`
- `% used`
- `today` or `recent spend`
- `expected pace for this point in the period`
- `projected end-of-period spend`
- a calm state label such as `under pace`, `on pace`, `running hot`, or `maxed out`

This should inform budget rows, app-gate review surfaces, and any future compact widget-like surface. It should stay closer to a household runway gauge than a retrospective category ledger.
