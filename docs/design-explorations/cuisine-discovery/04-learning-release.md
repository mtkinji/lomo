# Learning Release: Cuisine Discovery

## Concept to build

Meals gains a small `Explore cuisines` rail of square illustrated family cards.
Each card opens matching meals and offers exact regional labels as optional
refinements.

## Buildable slice

- A tested, exhaustive mapping from authored cuisine labels to 20 families.
- Twelve featured family cards and a complete family list.
- Square white-background illustration assets with alt text.
- Family filtering and reversible subcuisine refinement.
- Existing recipe cards, Meal Plan actions, search, sort, and provenance remain
  unchanged.

## Release and reversibility

Evaluate first in the local Simulator. The rail can be removed without data
migration because families are derived presentation metadata.
