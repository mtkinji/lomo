# Evaluate Learning: Household Meal Count

## Learning questions

- Does the count-first hierarchy immediately read as the main control?
- Is `People (optional)` sufficient to explain why names remain without extra
  copy?
- Does seven behave as the expected starting quantity across Recipes and Meal
  Planning?
- Does the existing Recipes overflow quantity control feel like the same
  setting rather than a competing one?
- Can food-need scope remain truthful when five diners are unnamed?

## Evidence plan

Supporting evidence:

- Andrew saves seven with two selected names and sees `7 people` after reload.
- New recipe/plan actions begin at seven while diner IDs remain Andrew and
  Charlie.
- Excluding one known diner from a seven-serving dish does not collapse the
  dish to one serving.
- Andrew can describe count as quantity and names as optional context without
  reading explanatory copy.

Disconfirming evidence:

- Andrew expects five Person records to be created automatically.
- The disabled decrement behavior feels mysterious.
- Settings, Recipes overflow, and planning surfaces show different defaults.
- The interface implies food needs were checked for all seven.

## Instrumentation

Use focused unit/component tests plus a manual Simulator observation note. Do
not add production analytics for this local release and do not track names,
household size, food needs, or person-selection combinations.

## Brand-goodwill check

The drawer must show one clear quantity control, one quieter optional section,
and one Save action. There must be no completion pressure, missing-person copy,
green selection styling, or commerce language.

## Decision rule

- **Proceed:** persistence, downstream defaults, food-need scope, and visual
  hierarchy all hold in the real path.
- **Revise:** count is technically correct but hierarchy, copy, or secondary
  person selection is confusing.
- **Retire:** users consistently understand “usually cooking for” as a complete
  roster rather than a quantity, even after the count-first design.

## Expected next action

If the slice proceeds, design Settings → People as a separate release that
reconciles existing Person systems before adding Contacts, birthdays, or postal
addresses.
