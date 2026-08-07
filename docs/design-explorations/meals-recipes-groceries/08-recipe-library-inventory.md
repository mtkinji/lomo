# Recipe Library Inventory: Appetite Before Administration

Recorded: 2026-08-05

## Frame

Maya should open Recipes and immediately want to cook something. The inventory
must still feel like Kwilt: a calm, private object collection with direct search,
clear ownership, and a path into the next household job. The constraint posture
is `Extend the system`: reuse the Page Header, inventory search, direct object
navigation, and bottom continuation grammar, while adding the food photography
and lightweight collections that this domain uniquely needs.

Design challenge: How might we help Maya recognize a delicious, realistic meal
in seconds, while preserving the calm object ownership of Arcs, Goals, and
To-dos rather than turning Recipes into a noisy content feed?

## Existing Kwilt inventory lessons

- Arcs establishes the direct collection grammar: one capability header, rich
  object cards, local options, and a single object-opening action.
- Goals proves that strong imagery can carry recognition and emotion in a dense
  two-column inventory without needing dashboard statistics.
- To-dos supplies the canonical bottom Search affordance and full-height global
  search drawer. Recipes should use both directly, pre-scoped to Recipes,
  rather than duplicating Search above the inventory.
- Transactions supplies the canonical compact inventory-control group. Recipes
  should use that exact 34-point control surface and 40-point minimum width for
  Filter and Sort rather than maintaining Recipe-local geometry.
- Recipes should therefore use the same header and direct-object behavior, but
  let food photography do more of the recognition work than metadata or copy.

## External pattern audit

Tasty's current App Store description names the most relevant product patterns:
a large browsable recipe library, step-by-step cooking, personalized
recommendations, ingredient search, adjustable servings, cookbook collections,
and a shopping handoff. Apple's Editors' Choice note emphasizes the emotional
strength of short visual cooking instruction. Source:
[Tasty on the App Store](https://apps.apple.com/us/app/tasty-recipes-cooking-videos/id1217456898).

Paprika's official product model reinforces the durable utility layer: save and
organize recipes, scale ingredients, build meal plans and grocery lists, and
keep the collection usable offline. Source:
[Paprika features](https://www.paprikaapp.com/).

Kwilt should borrow appetite, visual scanning, ingredient discovery, scaling,
and job continuation. It should not borrow an infinite feed, popularity
ranking, creator pressure, comments, or default-public behavior.

## Alternatives considered

1. **Utility list.** A denser version of the existing Recipe Library. Strong
   system fit, but it does not create appetite and makes 100 items feel like a
   database.
2. **Editorial feed.** Large seasonal stories and full-width content modules.
   Visually dramatic, but too much hierarchy and content maintenance for a
   household-owned library.
3. **Image-led object inventory.** One featured suggestion, the standard
   stretch-revealed canonical Filter/Sort group, bottom Search, removable active filters, and
   horizontal discovery shelves with exact “See all” continuations into a
   two-column result grid. Search uses Kwilt's shared drawer; food thumbnails
   and cooking metadata make its results domain-native. It fits Kwilt's
   inventory grammar while letting the food domain be sensorial.

Chosen: **Image-led object inventory**.

## Reductive UI contract

Job: When Maya needs meal inspiration, she needs to recognize and narrow food
her household might actually eat, so she can open one recipe and continue into
planning or cooking.

Primary action: Open a recipe.

Must show: a plain capability title, the Recipe's active food imagery, title,
cuisine/category, total time, yield, result count, and personal-versus-Kwilt
provenance. One image remains a quiet still; multiple active images become a
paged gallery inside the same object card. The standard stretch drawer reveals
the canonical Filter/Sort group; Search lives in the bottom dock and opens the
shared search drawer. Bundled atlas tiles preserve their source proportions and
use a centered cover crop at every card aspect ratio.

Reveal later: ingredients, method, scaling, planning, cooking, provenance, and
export actions.

Must not add: header icons, To-do saved views, a Recipe-only search treatment,
ratings, social proof, engagement counts, creator feeds, a category-management
screen, or a second cookbook hierarchy.

Primary Recipe actions use Kwilt's shared `primary` Button treatment—the Sumi
near-black semantic token. Pine can communicate brand, state, or supporting
accent, but it is not the Recipe capability's dominant action fill.

## Learning release

Bundle 100 Kwilt-authored household recipes across Breakfast, Lunch, Dinner,
Soup, Vegetarian, and Dessert, including American, Mexican, French, Japanese,
Italian, Indian, Mediterranean, Chinese, Thai, and global recipes. User and
family recipes appear ahead of the bundled catalog and override a matching id.
The bundled recipes remain separately attributable and cannot be edited or
deleted as if they were private user content.

One original twelve-panel food atlas supplies bundled artwork without runtime
network dependence or third-party copying. It is cropped in the native view for
featured and grid cards and reused on Recipe Home. This is intentionally a
learning asset system; permanent product quality should eventually use
recipe-specific, rights-cleared media.

## Bet and acceptance

We're betting that a visually abundant but structurally calm library makes the
food loop feel valuable before the household has imported anything. If people
still browse without opening, planning, or cooking, revisit the collection
logic and constraint-aware recommendations rather than adding more content.

Acceptance requires exactly 100 unique contract-valid recipes, at least six
ingredients and four instructions per recipe, broad category/cuisine coverage,
image-led rendering on the real iPhone route, working search/filter/open
interactions, shared-search result navigation, and truthful
Kwilt-versus-personal ownership.

## Inline planning offer

Recipe shelves create a natural place for one quiet, full-width offer that moves
from browsing into the next household outcome. The useful translation of
Mealime's recommended-plan card is not a generic promotion and not an AI-owned
Food module. It is a Meal Planning entry point that can ask Kwilt to prepare a
reviewable set from the current horizon and only the evidence the organizer has
authorized: saved Recipes, household preferences, trip target, stock
observations, recent meals, and current price evidence.

The offer should say what it will help with, then open a Meal Planning-owned
review surface. It must not claim that a customized plan already exists, silently
create or finalize a plan, expose private household responses, or route into an
unscoped empty Chat. The first honest slice is **Plan with Kwilt** -> choose the
horizon and constraints -> prepare explained candidates -> add, remove, or edit
them -> explicitly save the draft. Selection and review stay in Meal Planning;
Recipes remains the source library.

This inline offer is intentionally recorded as a separate capability slice from
the Goals-derived Recipe card treatment. It should ship only when the native
launch can carry exact Meal Planning context and return to the reviewed draft.
