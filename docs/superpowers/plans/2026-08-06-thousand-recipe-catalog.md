# 500-Recipe Catalog Implementation Plan

## Outcome

Replace the 20-template/100-variant starter bundle with 500 independently
authored, research-traceable Kwilt recipes from the approved roster. Do not
switch the app to the new corpus until all 500 entries pass validation.

The original 1,000-meal roster remains an expansion backlog, not part of the
active completion gate. The exact 500-recipe selection is:

- BR001–BR090 (90 breakfast and brunch recipes)
- LU001–LU085 (85 lunch and handheld recipes)
- DI001–DI230 (230 dinner recipes)
- SO001–SO015 (15 soups and stews)
- SA001–SA010 (10 salads and bowls)
- AP001–AP010 (10 appetizers and snacks)
- SI001–SI010 (10 sides)
- BA001–BA020 (20 breads and baking recipes)
- DE001–DE030 (30 desserts)

## Batch contract

Work in five-recipe editorial batches so familiarity, effort, sourcing, safety,
and originality remain directly reviewable. Each batch must include:

1. three or more credible sources per recipe where available;
2. rating and review-count evidence when the source exposes it;
3. technique, success, failure, and adaptation findings;
4. an original Kwilt ingredient list and method;
5. explicit `desk-reviewed`, `cooked-once`, or `repeat-validated` proof state;
6. schema, uniqueness, ingredient-use, timing, and source validation;
7. no app inclusion until the complete catalog gate passes.

## Familiarity and effort gate

The approved roster intentionally contains three editorial tiers: household
anchors, cuisine anchors, and a small discovery/celebration layer. Before live
integration:

1. audit the final tier counts against the roster and preserve discovery as the
   minority layer;
2. audit preparation, cooking, and inactive times so long or highly involved
   dishes cannot enter quick-meal shelves;
3. make household anchors and genuinely approachable cuisine anchors the
   default discovery emphasis;
4. keep complex regional dishes available as weekend or celebration choices
   without flattening the techniques that define them;
5. verify the live search, shelves, and filters do not give all 500 recipes
   equal prominence.

Every five-recipe authoring batch must also pass these editorial checks before
it is accepted:

1. no more than one true project recipe requiring specialist sourcing,
   fragile technique, or more than 90 minutes of active work;
2. a culturally specific title unfamiliar to a broad audience must include an
   immediate plain-English description, with the familiar description first
   when that improves browsing legibility;
3. cuisine coverage alone is not sufficient reason to keep a recipe: it must
   also show durable popularity, cultural importance, or a compelling and
   realistically cookable household use case;
4. at least three recipes must use ordinary home equipment and reasonably
   obtainable ingredients, and each batch must contain an approachable
   counterweight to any celebration or project dish;
5. recipes with hidden burden from sourcing, shaping, frying, multi-pan
   assembly, or long active supervision must be treated as high effort even
   when their raw cook-time field looks short.

## Technical sequence

1. Add editorial recipe contracts and a pure validator, test-first.
2. Add a compiler from editorial recipes to immutable `RecipeProjection`s,
   test-first.
3. Author and validate batches under `data/starter-recipes/batches/`.
4. Add a manifest that proves exact roster coverage and no duplicate titles or
   identities.
5. Expand meal-role facets without collapsing dietary fit into category.
6. Replace the old group/variant generator only after exactly 500 complete
   entries compile.
7. Run diff-aware verification and native Recipe search/filter/open checks.

## Proof boundary

Desk review proves source comparison and internal recipe coherence. It does not
prove taste, timing in Andrew's kitchen, or household acceptance. Only actual
cooks can advance `kitchenTestState`.
