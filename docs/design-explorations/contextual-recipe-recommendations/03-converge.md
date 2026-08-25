# Converge: Contextual Recipe Recommendations

## Chosen alternative

Choose **Contextual slots**.

It directly encodes the product judgment Andrew named: at 9:00 breakfast has
passed, lunch is relevant, and dinner deserves twice the representation. Unlike
a composite score, the result is deterministic and easy to test.

## Capability delta

Today, a user can request recommendations but repeatedly receive breakfast
staples regardless of the current meal horizon.

After this change, the same Recommended pool becomes time-aware: breakfast may
appear before 9:00; at and after 9:00 it is excluded, and dinner receives two
slots for every lunch slot when candidates exist.

Still intentionally unsupported: pantry knowledge, meal-history recency,
weather, budget truth, and personalized meal-time settings.

## Reductive decisions

- Enhance the existing selector; add no shelf, filter, setting, or card type.
- Capture one local planning moment per Recipes session so the list does not
  reshuffle while the user is considering it.
- Keep favorites, featured status, and quickness as within-bucket ordering.
- Let personal/uncategorized recipes fill gaps rather than disappear.

## Bet

We are betting that a clear breakfast cutoff plus a 2:1 dinner-to-lunch
composition will make Recommended feel immediately more plausible without a
learned model. If dogfood shows that 9:00 is too rigid or lunch is systematically
underrepresented, revisit the slot schedule before adding more signals.

## Success signal

At 9:12 local time, the first three eligible recommendations contain no
breakfast recipes and, when inventory permits, contain two dinner-context meals
and one lunch-context meal.
