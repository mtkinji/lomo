# Learning Release: Progressive Meal Commitment

## Bet

Optional placement will answer the household's important timing questions
without turning meal planning into weekly calendar upkeep.

## First release

- Keep contribution and reactions unchanged.
- Add a selection step followed by optional placement in the same full drawer.
- Support Flexible, one dated meal period, and bounded multi-date coverage.
- Move selected candidates into committed Next meals and carry unselected ideas
  into the next shared cart.
- Render committed decisions as a sparse list and compile Groceries only from
  that immutable version.

## Explicitly excluded

Full-week grids, empty slots, recurrence rules, external calendars, automatic
scheduling, cooking assignments, completion streaks, and the recipe-stack
widget.

## Proof gates

1. Domain tests prove timing normalization, validation, and sparse ordering.
2. SQL tests prove organizer authority, immutable timing, and unselected
   carry-forward without reaction loss.
3. Simulator proof covers zero placement, one exact occasion, coverage, drawer
   reopen, Next meals, and Grocery handoff.
4. Two-account device proof confirms one person can contribute while Maya alone
   settles.

## Kill or revise signals

- Maya cannot settle without touching placement.
- Flexible reads as unfinished or invalid.
- Coverage is mistaken for a permanent routine.
- The cart count still includes committed meals.
- A Grocery list can consume an open cart or silently change after revision.
