# Frame: Recipe Catalog Imagery Pipeline

## What the user said

> We need an image gen pipeline, and a prioritization for which images to generate, since 500 is a lot. We need to make sure the images are recipe book nice.

## Restated in user voice

When Maya is deciding what could fit tonight, she wants each meal to look like the meal it actually is and feel worth cooking, so she can recognize appetite and plausibility without opening a string of misleading or repetitive cards.

## Target audience

`audience-aspirational-family-organizers` — Aspirational family organizers who want help feeding the household without turning meal planning into a hobby or administrative system.

## Representative persona

Maya is approaching the next few meals with limited attention and wants to recognize a realistic option quickly.

- Current situation: Kwilt offers 500 authored meals, but most cards reuse a small generic atlas and visually misrepresent the named recipe.
- What she is trying to do: Notice a meal that looks good, understand whether it is realistic, and continue into planning or cooking.
- Emotional state or tension: Hungry for useful inspiration, but unwilling to inspect a database of titles or distrust cards that show the wrong food.
- What would make this feel wrong: Synthetic advertising gloss, culturally careless food, repeated generic imagery, impossible ingredients, or a visible image-management workflow.

## Hero anchor

`jtbd-move-the-few-things-that-matter` — Feeding the household is an ordinary commitment that needs to move from uncertainty into a small realistic decision.

## Job flow step

Step 3 in `job-flow-maya-feed-household-with-less-work`: **Recognize whether it fits tonight.**

- Desired outcome: a visually compelling Recipe Home answers appetite, time, yield, source, and readiness before dense detail.
- Current offering: image-led discovery shelves and Recipe Home exist, but the 500-meal catalog is compiled into the JavaScript bundle and points to a 24-cell generic atlas.
- Delivery score: 1/5.
- Gap: recipe-specific hero media and visual hierarchy are not truthfully delivered.

## Active anchors

- `jtbd-move-the-few-things-that-matter` — Accurate appetite-led recognition helps Maya choose a plausible next meal.
- `jtbd-trust-this-app-with-my-life` — A card that names one recipe while picturing another is a direct trust failure; generated media must be inspectable, rights-clear, and replaceable.

## Friction we're addressing

The catalog has breadth without visual identity. Repeated atlas tiles make different meals look identical and sometimes picture the wrong dish entirely. Generating all 500 at once would spend time and money before the photographic direction, data contract, and QA gates are proven.

## System alignment

Constraint posture: `Extend the system`

Current system facts:

- Existing surface: Meals discovery shelves, editorial Collections, Recipe Home, Meal Plan candidates, and Search already render a Recipe's active media.
- Existing user flow: browse or search -> recognize a meal -> open Recipe Home -> add to Meal Plan or start cooking.
- Existing domain/data model: private Recipes support `kwilt_recipe_media_assets`, but the authored 500-meal starter catalog is not in the database; it is compiled locally with non-UUID ids and `bundle://household-recipe-atlas/<index>` media references.
- Existing technical affordances: `RecipeArtwork` can render full `https:`, `file:`, and `data:` references; the repository joins database media rows for private Recipes; the installed build 102 includes Expo Dev Launcher. Production currently contains one Recipe and zero active Recipe media rows, and no permanent catalog-media bucket exists.
- Existing UX/copy conventions: imagery should carry recognition quietly; cards should not gain controls, ratings, social proof, generation badges, or an image-management surface.

Constraints to preserve:

- Recipe-specific visual truth: the image must depict the named authored Recipe, not merely the cuisine or category.
- Kwilt-authored rights and provenance for generated catalog imagery.
- Database publication is authoritative; the bundle atlas remains a graceful offline and rollback fallback.
- User-owned/private Recipe media stays separate from public catalog media and its access rules.
- The generated image pipeline remains an internal editorial operation, not a user workflow.
- A native build is not required for each image batch; published imagery must become visible after data refresh once the resolver ships through JavaScript/OTA or a later native bundle.

Constraints we may challenge:

- `artworkIndex` as a required field on every authored catalog record.
- The assumption that catalog Recipes must be persisted as private UUID-backed Recipe rows before their artwork can be remotely published.
- The atlas as the primary source rather than fallback.

Design implication:

Add a small public catalog-artwork publication layer keyed by stable roster id, with versioned image assets and editorial status. Resolve that layer over each compiled Recipe projection at runtime, while preserving the atlas when the network, publication, or QA state is unavailable. Prioritization and QA belong in an internal pipeline, not in Meals UI.

## Aspirational design challenge

How might we help Maya recognize a delicious, realistic meal in seconds, while preserving recipe truth, calm discovery, rights clarity, graceful offline fallback, and the visual coherence of a beautiful modern recipe book?

## Out of scope

- Generating all 500 images before validating quality and delivery.
- User-generated public catalog photography.
- Ratings, popularity feeds, creator identity, comments, or engagement ranking.
- Replacing private Recipe import media or its privacy model.
- Native image-generation inside the mobile app.

## Open question

Should the first quality gate optimize for the visible discovery experience (approximately 40-60 strategically selected meals) or for complete coverage of one coherent editorial collection before breadth?
