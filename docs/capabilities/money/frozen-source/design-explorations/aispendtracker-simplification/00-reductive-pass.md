# Reductive Pass: aispendtracker-simplification

## User Insight

The useful part of aispendtracker is not a complex budget workflow. It is the small, persistent meter: percent used, spend against limit, pace, projection, and update freshness.

Kwilt Money should pursue that same simplicity for custom budget categories backed by financial transactions and accounts.

## Current App Tension

The Budget tab was trying to do too much at once:

- household runway chart,
- Plaid connection controls,
- sync status,
- recent transactions,
- budget rows,
- row display preferences,
- account navigation,
- create-budget action.

That made the app feel like it was explaining its machinery instead of showing the user the one useful thing.

## Simplification Bet

Make the first screen behave like a spend tracker:

- one month,
- custom budget category meters,
- total spend against total budget,
- freshness,
- quiet access to accounts/settings when needed.

The transaction/account system should feed the meters, not compete with them on the first screen.

## Product Rules

- Custom budget categories are the primary object.
- Transactions and accounts are sources of truth, not the main UI.
- Each category card should show the same information every time.
- Percent used is the dominant behavioral cue, but it should appear once. If the radial meter carries the percent, the text stack should not repeat it.
- Pace should explain whether the percent is okay with one comparison: current usage versus expected usage today.
- Freshness protects trust.
- No row-level display settings in the core scan surface.
- No recent transaction list on the main Budget tab.
- No duplicate state indicators in the same card. If the card says `7 pts ahead`, it does not also need `Running hot` and `Projected month-end usage 108%`.
- No transaction-count copy on the main meter card unless transaction trust is the user's active problem.
- No chevron for a card tap. The whole card can be clickable without borrowing an expand/collapse affordance.
- Remaining budget should live as the radial caption, e.g. `$13 left`, rather than as a second stat block beside spent.

## First UI Pass

The Budget tab should show:

1. `June 2026`
2. Category meter cards:
   - category name,
   - spent / budget,
   - radial percent meter,
   - remaining amount as the radial caption,
   - one current-pace sentence,
   - no duplicate status/projection labels.
3. Total spend against total budget.
4. Updated time and quiet Accounts access.

## Hybrid Card Direction

The inventory card should combine the best parts of the budget detail summary and the widget preview:

- Use the dark green detail-card surface for strength and hierarchy.
- Move the circular tick meter to the right half of the card.
- Keep the left half to name, spend against budget, and the pace sentence.
- Remove the horizontal progress bar once the circular meter is present.
- Remove the inner icon and category label from the circular meter; the card already provides the label.
- Keep the percent inside the meter large enough to scan, but smaller than the widget-preview prototype.

## White Card Refinement

The inventory card should stay lighter than the budget detail summary:

- Use a white card with a soft border and larger continuous corner radius.
- Anchor the budget name in the top-left of the card; do not vertically center it.
- Make the budget name larger and stronger than labels and supporting numbers.
- Replace `spent / budget` copy with two plain stats: `Spent` and `Left`.
- Keep labels and stat values lighter than the title so the card does not feel like a dense table.
- Use the radial meter for compact usage, e.g. `87/100`, instead of a giant `87%`.
- Do not add an `of $100` caption under the radial; that reads as orphaned metadata.
- Put the pace sentence in a full-width footer strip at the bottom of the card.
- Keep the percent visually lighter than the budget name and money values.

## What Moves Elsewhere

- Recent transactions belong on `Transactions`.
- Bank connection and sync controls belong on `Accounts`.
- Budget creation stays as a quiet plus action.
- App controls belong on budget detail or review, not the main scan list.

## Success Signal

The user should be able to glance at the Budget tab and say:

> I can see which categories are okay and which are running hot without opening a ledger.
