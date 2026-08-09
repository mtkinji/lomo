# Household Food visual acceptance

Recorded: 2026-08-06

## Proof available

The existing iPhone 17 Pro Simulator pass is preserved in
[`docs/delivery-evidence/food/playthrough-2026-08-05`](../../delivery-evidence/food/playthrough-2026-08-05/README.md).
It now includes current-source proof of the Food Home continuation, a populated
100-recipe image-led library, Mexican filtering, title/ingredient search,
bundled Recipe Home, manual Recipe entry, both link and pasted-text import
entry, Next Meals reality strip, and local meal-plan candidate interaction on a
large phone. It does not prove parsed import evidence review, household
response, savings, scenario review, or Cook Mode surfaces.

The populated Recipe Library has strong food imagery, an obvious featured
choice, scannable two-column cards, visible Filter/Sort controls, and separate
Add Recipe, Search, and AI actions in the bottom dock. Search reuses Kwilt's standard
full-height search drawer, pre-scoped to Recipes, with food thumbnails and
cooking metadata. Mexican filtered to 10 recipes, “tikka” resolved to one
result in shared search, and that result opened into the full Recipe Home.
Evidence:
[`35-recipe-inventory-controls.jpg`](../../delivery-evidence/food/playthrough-2026-08-05/35-recipe-inventory-controls.jpg),
[`32-recipe-library-mexican.jpg`](../../delivery-evidence/food/playthrough-2026-08-05/32-recipe-library-mexican.jpg),
[`36-recipe-shared-search.jpg`](../../delivery-evidence/food/playthrough-2026-08-05/36-recipe-shared-search.jpg),
[`37-recipe-search-tikka.jpg`](../../delivery-evidence/food/playthrough-2026-08-05/37-recipe-search-tikka.jpg), and
[`34-kwilt-recipe-home.jpg`](../../delivery-evidence/food/playthrough-2026-08-05/34-kwilt-recipe-home.jpg).

The bottom Add Recipe, Search, and AI controls now match To-do/Goals placement: shared
48-point floating surfaces, shared side inset, shared compact bottom offset,
and no Recipe-only background strip. The resting and scrolled states are proven
on the iPhone 17 Pro in
[`38-recipe-dock-resting.jpg`](../../delivery-evidence/food/playthrough-2026-08-05/38-recipe-dock-resting.jpg)
and
[`39-recipe-dock-scrolled.jpg`](../../delivery-evidence/food/playthrough-2026-08-05/39-recipe-dock-scrolled.jpg).
Add Recipe opened successfully. The AI affordance routed to Chat, where the
current Simulator environment hit the separate `NSURLErrorDomain -1004`
server-connection error.

The Recipe inventory now also adopts Goals' borderless image-and-copy card
grammar. The featured and ordinary cards keep Recipe-specific metadata and one
primary action—open the Recipe—while the existing stretch drawer and bottom
dock retain their established behavior. Large-phone runtime proof covers the
resting library, revealed controls, and a successful card-to-detail transition:
[`40-recipe-goals-card-style.jpg`](../../delivery-evidence/food/playthrough-2026-08-05/40-recipe-goals-card-style.jpg),
[`41-recipe-controls-revealed.jpg`](../../delivery-evidence/food/playthrough-2026-08-05/41-recipe-controls-revealed.jpg), and
[`42-recipe-card-open.jpg`](../../delivery-evidence/food/playthrough-2026-08-05/42-recipe-card-open.jpg).
The related inline AI planning offer remains a documented Meal Planning slice,
not accepted runtime behavior.

Recipe inventory cards now preserve all active Recipe imagery instead of
discarding everything after the first media asset. Single-image cards retain
the accepted still treatment; multi-image cards use an in-card horizontal pager
with a quiet position count. The multi-image branch is covered by component
interaction tests but still needs device proof with a real multi-photo Recipe.
Recipe-owned dominant actions now explicitly use the shared Sumi near-black
`primary` Button token; pine is no longer the default fill on those actions.
Current-device proof of that correction is
[`43-recipe-primary-sumi.jpg`](../../delivery-evidence/food/playthrough-2026-08-05/43-recipe-primary-sumi.jpg).

The default Recipe discovery inventory now scrolls vertically between named
sections and horizontally within each section. A partially visible next card
makes the shelf direction discoverable, while See all opens the exact section
as the established vertically scrolling two-column result grid. Two-column
Recipe titles and metadata use a more compact type scale. Large-phone evidence
covers the default shelves and a Ready in 30 minutes See all transition:
[`44-recipe-horizontal-shelves.jpg`](../../delivery-evidence/food/playthrough-2026-08-05/44-recipe-horizontal-shelves.jpg)
and
[`45-recipe-shelf-see-all.jpg`](../../delivery-evidence/food/playthrough-2026-08-05/45-recipe-shelf-see-all.jpg).

Recipe inventory chrome now adheres to the adjacent production components
rather than approximating them. Filter and Sort reuse the shared compact
inventory-control group extracted from Transactions; Search reuses To-do's
floating bottom action and opens the shared Recipe-scoped Search drawer. The
bottom dock retains Add Recipe as its dominant pill and keeps Search and AI as
separate circular actions. The bundled square food-atlas tiles now use a
centered cover crop, so the wide Buttermilk Berry Pancakes hero preserves image
proportions instead of stretching them. Large-phone evidence:
[`46-recipe-canonical-controls-dock-cover.jpg`](../../delivery-evidence/food/playthrough-2026-08-05/46-recipe-canonical-controls-dock-cover.jpg)
and
[`47-recipe-bottom-search.jpg`](../../delivery-evidence/food/playthrough-2026-08-05/47-recipe-bottom-search.jpg).

The planner Back and top-right actions are
fully visible after navigation settles; the previously recorded clipping was a
transition-frame artifact. Off-screen save failure feedback and the visually
active disabled handoff button remain historical findings that still require a
backend-enabled rerun. The fresh import and manual-entry captures also confirm
that the shared disabled-primary treatment is visually too close to enabled;
this should be solved in the shared Button system, not locally in Food.

The earlier capability-menu correction was visually and operationally accepted
on the iPhone 17 Pro Simulator with separate Recipes, Next meals, and Groceries
rows and no synthetic Food destination. That three-row treatment is now
superseded by the Grocery Flywheel decision: Food should contain only Meals and
Groceries, while Plan remains contextual inside Meals. The historical evidence
still proves direct routing, but the new two-row contract requires fresh render
proof. Historical evidence:
[`27-food-capabilities-menu.png`](../../delivery-evidence/food/playthrough-2026-08-05/27-food-capabilities-menu.png),
[`28-next-meals-direct.png`](../../delivery-evidence/food/playthrough-2026-08-05/28-next-meals-direct.png),
[`29-groceries-direct.png`](../../delivery-evidence/food/playthrough-2026-08-05/29-groceries-direct.png), and
[`30-recipes-direct.png`](../../delivery-evidence/food/playthrough-2026-08-05/30-recipes-direct.png).

The Grocery Flywheel two-row contract is now proven on the iPhone 17 Pro
Simulator from `fix/groceries-primary-navigation`. Food contains Meals and
Groceries only; Meal Plan is absent from the global menu. Groceries opens the
populated household list with the global navigation affordance, neutral outline
workflow actions instead of green fills, and the Groceries row remains selected
when the menu is reopened. Evidence:
[`01-food-menu-meals-groceries.jpeg`](../../delivery-evidence/food/groceries-primary-navigation-2026-08-09/01-food-menu-meals-groceries.jpeg),
[`02-grocery-list-primary.jpeg`](../../delivery-evidence/food/groceries-primary-navigation-2026-08-09/02-grocery-list-primary.jpeg), and
[`03-groceries-selected.jpeg`](../../delivery-evidence/food/groceries-primary-navigation-2026-08-09/03-groceries-selected.jpeg).

## Required acceptance matrix

| Surface | Small phone | Large phone | Landscape | Tablet | Dark | Large type |
| --- | --- | --- | --- | --- | --- | --- |
| Food Home continuation | pending | empty/offline passed | n/a | pending | pending | pending |
| Recipe Library and Home | pending | 100-recipe library, filter, search, and bundled Home passed | n/a | pending | pending | pending |
| Import evidence review | pending | entry modes passed; parsed review pending | n/a | pending | pending | pending |
| Plan, family response, finalize | pending | empty editor and local note passed; shared flow pending | n/a | pending | pending | pending |
| Grocery review, provenance, savings, scenario | pending | populated primary list and direct navigation passed; provenance, savings, and scenario pending | n/a | pending | pending | pending |
| Cook Mode | pending | pending | pending | pending | pending | pending |

Fresh offline capture is complete on the iPhone 17 Pro Simulator, including the
bundled populated catalog. Backend-backed personal Recipes still require
applying the six Food migrations to an authorized non-production project.
Andrew’s visual acceptance is not inferred from component tests or these
screenshots.
