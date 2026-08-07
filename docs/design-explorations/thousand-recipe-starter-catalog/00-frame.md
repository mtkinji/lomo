# Frame: Thousand-Recipe Starter Catalog

Recorded: 2026-08-06

## What Andrew said

> Start with a thousand recipes. First pick the meals and put them in their
> categories. Then review the strongest-rated variations, understand why they
> work, and create a very high-quality Kwilt version.

## Restated in user voice

When I open Recipes before my household has saved much of its own food, help me
find something recognizable, appealing, and trustworthy across the kinds of
food we actually cook, so I can plan or cook without first building a personal
catalog or sorting through an ad-driven recipe site.

## Target audience

`audience-aspirational-family-organizers` — people who want to feed a household
with less repeated deciding, transcription, and list-building.

## Representative persona

Maya needs a useful answer to “what could we eat?” before Kwilt has learned her
household's favorites.

- Current situation: the private collection is still sparse and the first
  planning cycle needs credible starting material.
- What she is trying to do: recognize a plausible meal quickly, then continue
  into planning or cooking.
- Emotional tension: abundance is helpful only if it reduces uncertainty; a
  thousand undifferentiated cards would recreate browsing work.
- What would feel wrong: generic template recipes, culturally careless naming,
  implausible times, or instructions that have not earned trust.

## Hero anchor

`jtbd-move-the-few-things-that-matter` — recipe discovery matters here because
it helps the household complete a food cycle, not because catalog size is a
goal by itself.

## Job-flow step

`job-flow-maya-feed-household-with-less-work`, step 3: **Recognize whether it
fits tonight.** The current delivery score is 1/5. The 100 bundled recipes make
the library visually evaluable, but they are generated from only 20 shared
ingredient-and-method templates. The next gap is trustworthy breadth, not more
surface area.

## Active anchors

- `jtbd-carry-intentions-into-action` — move from an appealing meal to a real
  plan and cook.
- `jtbd-trust-this-app-with-my-life` — recipe details must be internally
  coherent, provenance-aware, and honest about their proof level.

## System alignment

Constraint posture: `Extend the system`

Current system facts:

- Existing surface: image-led Recipe inventory with Search, Filter, Sort, and
  direct Recipe Home navigation.
- Existing flow: bundled Kwilt recipes appear after personal recipes and can
  continue into Meal Planning or Cook Mode.
- Existing model: every bundled entry is a full `RecipeProjection` with one
  immutable version, provenance, credits, media, ingredients, and steps.
- Existing implementation shortcut: 20 groups each emit five title variants
  while sharing the group's base ingredients and instructions.
- Existing taxonomy problem: `Vegetarian` is currently a peer of meal roles
  such as Breakfast and Dinner. At 1,000 recipes, meal role, cuisine, dietary
  fit, method, and occasion need independent facets.
- Existing media: 24 atlas crops are reused across 100 recipes. They are not
  recipe-specific evidence and cannot honestly carry a permanent 1,000-recipe
  catalog.

Constraints to preserve:

- Kwilt-authored wording; research informs the recipe but is not copied.
- Source URLs and research notes are retained internally; third-party recipes
  are not republished.
- Personal recipes remain first and private by default.
- No popularity feed, ratings theater, creator pressure, or sponsored ranking.
- Every recipe must be usable offline after bundling.

Constraint intentionally changed:

- The earlier learning-release bet said continuity mattered more than the
  largest catalog and deliberately excluded broad discovery. Andrew is now
  making a different launch decision: a deep starter catalog is part of the
  activation experience. The continuity loop still determines product value;
  the thousand recipes remove empty-catalog friction.

## Research signal already observed

Initial listing research supports weighting the catalog toward dependable
household anchors rather than novelty:

- [Good Food's all-time popular list](https://www.bbcgoodfood.com/howto/guide/most-popular-recipes-on-good-food)
  is dominated by repeatable dinners, bakes, comfort food, and budget-friendly
  staples with hundreds or thousands of ratings.
- [Food Network's fan favorites](https://www.foodnetwork.com/recipes/packages/fan-favorite-recipes)
  similarly reward technique reliability: roast chicken, French onion soup,
  meatloaf, enchiladas, brunch staples, and forgiving desserts.
- [TasteAtlas's current category rankings](https://www.tasteatlas.com/best/foods-by-category)
  widen the lens beyond English-language household favorites and expose strong
  regional dishes across proteins, noodles, dumplings, breads, vegetables,
  salads, snacks, and sweets.
- [SAVEUR's 150 classics](https://www.saveur.com/article/Kitchen/150-Classic-Recipe-Index/)
  is a useful counterweight to traffic rankings because it deliberately spans
  enduring dishes from around the world.

These lists are discovery evidence, not recipe authority. Star averages will
later be considered only with review count, recency, reviewer comments,
editorial testing, cultural source quality, and cross-source agreement.

## Aspirational design challenge

How might we give Maya a thousand genuinely distinct, dependable ways to feed
her household, while preserving cultural care, recipe-level craft, calm
discovery, private ownership, and a direct path into the next food-cycle job?

## Out of scope at the alignment gate

- Writing or shipping the recipe bodies before the meal roster is reviewed.
- Copying third-party ingredient lists, instructions, headnotes, or photos.
- Nutrition or medical claims.
- Personalized or sponsored ranking.
- Claiming kitchen-tested quality before real cooking validation.

## Alignment gate

Andrew reviews the category model, cuisine allocation, and named meal roster.
Only aligned meals enter source comparison and Kwilt recipe authoring.
