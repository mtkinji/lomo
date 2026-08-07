# Final quality audit: 500-recipe starter catalog

Date: 2026-08-06
Proof state: desk-reviewed; no kitchen-test or household-acceptance claim.

## Decision

The complete 500-recipe corpus passes the editorial integration gate. It is
eligible to replace the former 20-template/100-variant starter bundle.

The audit found and corrected three integration-level issues before the swap:

1. eight early recipes had tier labels that did not match the approved roster;
2. unfamiliar naming had been applied consistently only to later batches, so
   149 earlier meals received familiar-first display titles while retaining the
   traditional name where it adds recognition or story;
3. editorial collections still referenced identities from the old catalog and
   were remapped to real meals in the 500-recipe corpus.

## Corpus identity and coverage

- Exactly 500 recipes in continuous roster order: BR001–BR090, LU001–LU085,
  DI001–DI230, SO001–SO015, SA001–SA010, AP001–AP010, SI001–SI010,
  BA001–BA020, and DE001–DE030.
- Exact meal-role allocation: 90 breakfast and brunch, 85 lunch and handheld,
  230 dinner, 15 soup and stew, 10 salad and bowl, 10 appetizer and snack,
  10 side, 20 bread and baking, and 30 dessert recipes.
- Exact approved editorial mix: 228 household anchors, 231 cuisine anchors,
  and 41 discovery meals. Discovery is 8.2% of the catalog.
- 149 named cuisine or culinary-lineage values are represented without using a
  generic `Global` bucket.
- Recipe identities, display titles, ingredient bodies, and instruction bodies
  are each unique across all 500 entries.

## Research and authorship

- The corpus records 1,524 source comparisons, with at least three sources per
  meal.
- Every recipe records non-negotiable techniques, repeated success signals,
  repeated failure risks, and an explicit Kwilt adaptation decision.
- All 500 recipes are marked `desk-reviewed`. None claim to have been cooked,
  taste-tested, timing-tested in Andrew's kitchen, or accepted by a household.
- Every live projection is marked `kwilt_authored`; research URLs and rating
  evidence remain editorial provenance rather than copied recipe bodies.

## Familiar naming and meal story

- Familiar household names remain short: for example, `Buttermilk pancakes`
  and `Chicken pot pie`.
- Less familiar foods lead with the recognizable form and retain the useful
  traditional name: for example, `Japanese chicken and egg rice bowl
(Oyakodon)` and `Black-eyed pea fritters with corn porridge (Akara with
pap)`.
- All compiled display titles are non-empty, unique, and no longer than 80
  characters.
- The appetite-led description remains directly beneath the title. The recipe's
  editorial `notes` continue to appear as `About this meal`; personal recipes
  still use `Notes`.

## Effort, desirability, and honest timing

- 370 recipes require 30 minutes or less of preparation; 279 have no more than
  60 minutes of combined preparation and cooking work.
- 182 recipes finish within 60 minutes of total elapsed time and 35 finish
  within 30 minutes when waits, rests, proofing, chilling, and marinating are
  counted honestly.
- 54 recipes include an eight-hour-or-longer inactive stage. Those waits now
  contribute to live elapsed time, so an overnight or long-rest recipe cannot
  enter `Ready in 30 minutes` or sort ahead of a genuinely quick meal.
- Each accepted authoring batch has a recorded familiarity/effort review: no
  more than one true project, at least three ordinary-equipment recipes, and an
  approachable counterweight to any specialist recipe.
- Only household anchors are eligible for the generic `Kwilt pick` signal.
  Discovery meals remain available through search, cuisine, category, and
  deliberate editorial placement rather than receiving default prominence.

## Live-system checks

- The editorial-to-live compiler uses roster IDs, not mutable title slugs, for
  stable recipe identities.
- Category facets now preserve all nine meal roles. `Vegetarian` is no longer
  misrepresented as a meal-role category.
- Cuisine filters are generated from the complete corpus rather than the old
  ten-cuisine allowlist.
- All four editorial collections and their meal-plan templates resolve against
  recipes that actually exist in the 500-recipe catalog.
- Personal recipes continue to precede bundled recipes and suppress a bundled
  identity collision.

## Verification

- Corpus-wide recipe, domain, detail, library, collection, and meal-planning
  inventory tests: 125 suites / 331 tests passed.
- Full Jest gate: 775 suites passed; 4,153 tests passed and 1 skipped.
- Diff-aware repository verification: passed app and test typechecks,
  code-health ratchets, full Jest, Supabase function typechecks and tests,
  product/JTBD lint, Chat delivery and protocol contracts, code-map generation,
  and architecture lint.
- Simulator proof used the installed Kwilt development build with the sole
  Metro server owned by this worktree. The Meals library rendered `500 MEALS`,
  catalog search returned authored recipes, and recipe detail rendered the
  familiar title plus honest total, prep, cook, wait, and serving values.

## Remaining proof boundary

This gate establishes source comparison, originality checks, internal recipe
coherence, honest presentation, stable compilation, and app-level reference
integrity. It does not establish taste, real-kitchen timing, ingredient
availability for a particular household, signed-device visual quality, or
repeat desirability. Those states can advance only through actual cooking and
dogfooding.
