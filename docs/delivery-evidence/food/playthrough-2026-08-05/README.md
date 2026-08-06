# Household Food hero playthrough — 2026-08-05

## Outcome

The intended durable hero scenario is not yet completable in the running app,
but Recipe discovery now has a strong offline learning surface: a bundled
100-recipe household catalog, visual browsing, cuisine/category filters,
ingredient search, and full Recipe Home continuation all work without the
remote Food schema.

The client exposes a coherent first-pass route from Recipes to Next meals to
Groceries and an honest Instacart review handoff. The configured Kwilt backend,
however, does not contain the Food schema or RPCs. The first Recipe and Meal
Plan writes both fail, which prevents family choice, finalization, grocery
compilation, list review, plain export, and retailer handoff from being tested
with real records.

This review does not authorize or perform a migration against the configured
Kwilt backend. A separate safe integration target is required before applying
the uncommitted Food migrations and functions.

## Recipe Library learning catalog — 2026-08-05 21:47–21:49 MDT

The current source build was exercised with Computer Use on the same iPhone 17
Pro Simulator. These settled captures prove the bundled catalog independently
of the unavailable Food backend:

- [`31-recipe-library-100.jpg`](31-recipe-library-100.jpg): an appetite-led
  Recipe Library with a large featured recipe, 100-recipe count, search,
  category/cuisine filters, and a two-column household-favorites inventory.
- [`32-recipe-library-mexican.jpg`](32-recipe-library-mexican.jpg): the Mexican
  filter selected with 10 matching recipes and cuisine-appropriate imagery.
- [`33-recipe-search-tikka.jpg`](33-recipe-search-tikka.jpg): live search for
  “tikka” narrowed the library to one relevant recipe.
- [`34-kwilt-recipe-home.jpg`](34-kwilt-recipe-home.jpg): the bundled Tikka
  Masala opened into Recipe Home with scaling, ingredients, Next meals, and
  Start cooking actions. Accessibility also reported the catalog provenance as
  “Included with Kwilt.”

The catalog is bundled learning content, not remote account data. It is
available offline and intentionally cannot be edited or deleted; user-created
Recipes remain first-class private objects and sort ahead of the catalog.

## Fresh source pass — 2026-08-05 21:04–21:07 MDT

After the Mac was unlocked, Computer Use inspected the current source build on
the same iPhone 17 Pro Simulator and Metro port. The following settled captures
now prove the revised empty/offline shell and local interaction surfaces:

- [`20-food-home-empty.png`](20-food-home-empty.png): Food Home continuation,
  explicit offline state, Recipe and recent-Cook shelves, and Next meals /
  Groceries continuations.
- [`21-next-meals-reality-empty.png`](21-next-meals-reality-empty.png): trip
  target, on-hand, and price reality strip with the flexible-horizon empty state.
- [`22-meal-plan-editor-empty.png`](22-meal-plan-editor-empty.png): next shop,
  meal count, date range, and open horizons plus thrift-oriented candidate modes.
  A plain “Leftovers night” candidate was added successfully in local UI state.
- [`23-recipe-library-empty.png`](23-recipe-library-empty.png): clean Recipe
  Library empty state with search, import, add, and planning continuation.
- [`24-recipe-editor-empty.png`](24-recipe-editor-empty.png): manual Recipe
  capture with title, story, servings, ingredients, instructions, attribution,
  and notes.
- [`25-recipe-import-link.png`](25-recipe-import-link.png) and
  [`26-recipe-import-paste.png`](26-recipe-import-paste.png): link, pasted or
  dictated text, photo capture, and photo picker entry modes, all framed as a
  review draft rather than an automatic save.

The initial post-navigation frame briefly omitted the planner Back glyph while
the prior screen remained in the accessibility tree. A settled recapture showed
the Back and Save controls correctly; this was a transition-frame artifact, not
a reproducible header defect. The Simulator then received simultaneous user
input and returned to To-dos, so automation stopped instead of competing for
control.

## Runtime provenance

- Source checkout:
  `/Users/andrewwatanabe/Kwilt/.worktrees/household-food-ai-exploration`
- Branch: `codex/household-food-ai-exploration`
- Base HEAD: `f7e852897144aac58e666dc1bb1c81681d92b419`
- Source state: dirty; all Food implementation and this evidence are
  uncommitted.
- Metro: port `8081`, started from the Food worktree.
- Runtime configuration: loaded from the ignored main-checkout `.env.local` so
  the existing authenticated Simulator session could use the configured Kwilt
  backend. Secrets were not copied into this worktree or evidence.
- Native shell: installed development client `com.andrewwatanabe.kwilt`, build
  `102`; exact native-source commit is not established.
- Simulator: iPhone 17 Pro, iOS 26.5,
  `D437E709-EF87-49B1-A6C1-7AE350C0BF8A`.
- Automation: Maestro 2.7.0 plus direct `simctl` screenshots.
- Account state: an existing authenticated Simulator account and household.
  No second account or second device was used.

## Backend probes

Authenticated UI launch succeeds after loading the existing local runtime
configuration. Read-only REST probes using the configured publishable key
returned `404 PGRST205` for:

- `public.kwilt_recipes`
- `public.kwilt_meal_plans`
- `public.kwilt_grocery_lists`

The app then returned the matching missing-RPC failures for
`save_kwilt_recipe` and `create_kwilt_meal_plan`. No OpenAI or Instacart Food
credentials or remote Food handoff enable flag are present in the local runtime
configuration.

## Hero-flow score

The scores use the job-flow 1–5 scale: 1 is effectively unsupported; 3 is
supported with clear friction; 5 is excellent and trustworthy.

| Hero step | Score | Runtime evidence | Result |
| --- | ---: | --- | --- |
| Browse a recipe library | 4 | [`35-recipe-inventory-controls.jpg`](35-recipe-inventory-controls.jpg), [`36-recipe-shared-search.jpg`](36-recipe-shared-search.jpg), [`37-recipe-search-tikka.jpg`](37-recipe-search-tikka.jpg), [`34-kwilt-recipe-home.jpg`](34-kwilt-recipe-home.jpg) | The offline catalog provides 100 image-led Recipes, visible inventory controls, shared Kwilt search pre-scoped to Recipes, filtering, and direct Recipe Home navigation. Personal Recipe persistence remains blocked by the unapplied backend. |
| Collaboratively build a meal plan | 1 | [`15-meal-plan-one-meal.png`](15-meal-plan-one-meal.png), [`16-meal-plan-save-backend-blocker.png`](16-meal-plan-save-backend-blocker.png) | Cadence selection and a local meal-note candidate work. Save fails before an authoritative plan exists, so invitations, private responses, aggregation, and organizer finalization are unreachable. |
| Produce and review the shopping list | 1 | [`06-groceries-empty.png`](06-groceries-empty.png) | The dependency is explained, but no plan can finalize and the compiler/function cannot run. |
| Purchase groceries | 1 | [`19-grocery-handoff-shell.png`](19-grocery-handoff-shell.png) | The truth copy correctly says Instacart still owns product choice and checkout. No reviewed list or provider configuration exists; the direct shell also exposes an unhandled repository failure. |

Overall durable hero scenario: **1/5**. Recipe discovery is now **4/5**, but no
authenticated user can complete the durable collaborative planning, compiled
grocery, and retailer-handoff loop in this runtime.

## What is promising

- The user-facing sequence is understandable: Recipes → Plan next meals → Make
  grocery list → Shop.
- “Next shop,” meal count, date range, and open cadence avoid forcing a weekly
  calendar model.
- The plan editor permits plain meal ideas such as leftovers or eating out, not
  only saved Recipes.
- Organizer authority is stated clearly: family choices are input, not a vote.
- Retailer truth is appropriately bounded: the Instacart action promises a
  product-review page, not an order.
- Plain copy and share remain designed as permanent fallbacks.

## Findings

### P0 — create a safe integrated Food runtime

Apply and verify the three migrations and three Edge Functions against a
non-production Supabase target, then configure import and Instacart development
secrets. Seed at least six representative Recipes so browsing and plan-building
can be evaluated rather than only empty states. This is the gate for every
remaining hero step.

### P0 — replace backend internals with capability availability

The current Recipe form renders raw PostgREST schema text inline, and Meal Plan
save puts the missing RPC signature in a native alert. Food should detect a
missing/deactivated capability before entry or translate it to a calm retry /
unavailable state. Repository list promises must be caught; the handoff deep
link currently produces an unhandled-promise development error.

### P0 — prove the collaborative loop separately

After backend readiness, use two activated household memberships on separate
signed-in Simulator/device contexts. Prove invite delivery, private pick/pass/
suggest, organizer aggregate, close, finalization, and non-participant denial.
One-account source tests cannot pay off “collaboratively.”

### P0 — prove fulfillment without overstating purchase

Configure Instacart's development endpoint and remote enable flag, deploy the
handoff function, and use a reviewed list to reach the real product-review
page. Until retailer order evidence exists, the hero step should be named
“reach retailer review and checkout,” not “purchase in Kwilt.”

### P1 — repair the visual/error states exposed by playthrough

- Resolved in the fresh source pass: `Next meals` and `Plan next meals` render
  Back and top-right actions fully at this phone width once transitions settle.
- Recipe save errors appear above the form but do not return the user to the
  error; the technical message remained out of view until the form was manually
  pulled to the top.
- The handoff primary button looks active even when it is disabled because no
  list exists.
- The fresh manual-entry and import captures show the same broader affordance:
  disabled primary actions remain strongly green and can read as available even
  though accessibility correctly reports them disabled. Revisit the shared
  disabled-primary treatment rather than applying a Food-only color override.
- The direct handoff screen should show a loading/error/not-found state instead
  of the ordinary handoff content before its list resolves.
- No notification entitlement toast appeared in the fresh source pass; the
  Recipe Library planning continuation and all captured bottom actions were
  unobscured.

## Next proof run

1. Create or identify a disposable non-production Supabase target.
2. Apply `20260806010000_private_recipes.sql`,
   `20260806020000_meal_planning.sql`, and
   `20260806030000_groceries.sql`; run the RLS/SQL tests there.
3. Deploy `recipe-import`, `grocery-compile`, and `grocery-handoff` with test
   secrets and provider disable controls.
4. Seed a realistic recipe library and two household accounts.
5. Run the full sequence: browse → select Recipes → invite → respond on account
   two → finalize → compile → Already have → review → plain export → Instacart
   product review.
6. Capture settled screenshots at every transition plus the authoritative RPC
   and provider receipts.

## Automation notes

The YAML files in this folder are the exact Maestro fragments used to exercise
the reachable UI. Some are intentionally split at the observed failure so the
state could be captured without clearing the authenticated Simulator session.

## Capability-menu correction

The current-source iPhone 17 Pro pass now proves that Food is a group, not a
synthetic capability. The global menu exposes three durable destinations:

- [`27-food-capabilities-menu.png`](27-food-capabilities-menu.png) — Recipes,
  Next meals, and Groceries appear as separate rows; Recipes is selected and
  there is no Food/Overview row.
- [`28-next-meals-direct.png`](28-next-meals-direct.png) — Next meals opens the
  planning inventory directly.
- [`29-groceries-direct.png`](29-groceries-direct.png) — Groceries opens the
  current grocery-list surface directly.
- [`30-recipes-direct.png`](30-recipes-direct.png) — Recipes opens the Recipe
  Library directly.

Accessibility state was re-read after each transition. It reported the chosen
Food capability as selected, and detail surfaces retained the correct Recipes,
Meal Planning, or Groceries capability owner. Food Home remains available for
contextual continuation but is no longer represented as a fourth capability.

## Recipe inventory unification

The current-source iPhone 17 Pro pass also proves the inventory pattern proposed
for Recipes without changing Goals:

- [`35-recipe-inventory-controls.jpg`](35-recipe-inventory-controls.jpg) — an
  earlier exploration proved the plain header and visible inventory controls;
  its Recipe-local three-button geometry is superseded by the canonical
  Filter/Sort group and bottom Search in capture 46.
- [`36-recipe-shared-search.jpg`](36-recipe-shared-search.jpg) — Search opens
  Kwilt's existing full-height search drawer pre-scoped to Recipes, rather than
  expanding a Recipe-only field in place. Recipe recommendations use food
  thumbnails plus cuisine, category, and total time.
- [`37-recipe-search-tikka.jpg`](37-recipe-search-tikka.jpg) — ingredient/title
  search resolves `tikka` to one food-native result, which was then opened into
  the real Recipe Home route.

Filter and Sort remain Recipe-specific because their dimensions are
domain-specific. To-do saved-view creation and switching were deliberately not
introduced.

## Recipe bottom-affordance placement

The Recipes Add, Search, and AI affordances now reuse the same resting geometry as
To-dos and Goals: a 48-point floating surface, the shared horizontal inset, and
the shared compact bottom offset above the iPhone home indicator. The prior
Recipe-only background strip was removed so the controls sit within the phone's
lower curve while the inventory scrolls behind them.

- [`38-recipe-dock-resting.jpg`](38-recipe-dock-resting.jpg) — the resting Add
  Recipe and AI controls established the base geometry before Search joined the
  dock.
- [`39-recipe-dock-scrolled.jpg`](39-recipe-dock-scrolled.jpg) — the recipe
  inventory has scrolled while the dock remains stationary at the same inset.

## Recipe discovery shelves

Recipe discovery now separates browsing from exhaustive results. The page
scrolls vertically through named collections, while each collection scrolls
horizontally and exposes a partial next card to make that direction legible.
The same borderless Recipe card is reused throughout; compact titles and
metadata keep two-column density readable without creating another card type.

- [`44-recipe-horizontal-shelves.jpg`](44-recipe-horizontal-shelves.jpg) — the
  default discovery page shows a featured Recipe followed by horizontal
  shelves such as Ready in 30 minutes and Breakfast favorites, each with a
  visible See all continuation.
- [`45-recipe-shelf-see-all.jpg`](45-recipe-shelf-see-all.jpg) — See all on
  Ready in 30 minutes applies the exact filter and opens a vertically scrolling
  two-column result inventory. Accessibility reported 15 of 100 Recipes, one
  active filter, and the Matching recipes heading.

Large-phone runtime proof covers the discovery layout and See all transition.
The horizontal implementation and partial-card cue are present in the running
source; a coordinate-driven automation gesture was not used as acceptance
evidence because it could be mistaken for a card tap.

## Canonical controls, bottom Search, and image crop

Recipes no longer maintains a local inventory-control size. Filter and Sort now
consume the same shared 34-point-high, 40-point-minimum control surfaces used by
Transactions. Search was removed from that group and placed beside AI in the
bottom dock using the same floating action component as To-dos.

- [`46-recipe-canonical-controls-dock-cover.jpg`](46-recipe-canonical-controls-dock-cover.jpg)
  shows the compact two-button group, result count, Add Recipe/Search/AI dock,
  and the Buttermilk Berry Pancakes hero after the bundled square tile was
  changed from stretch distortion to an aspect-preserving centered cover crop.
- [`47-recipe-bottom-search.jpg`](47-recipe-bottom-search.jpg) proves that the
  bottom Search action opens Kwilt's shared full-height Search drawer already
  scoped to Recipes.

Accessibility reported Filter and Sort only above the inventory, followed by
three distinct bottom actions: Add a recipe, Search recipes, and Ask Kwilt about
recipes.

Add Recipe opened the existing recipe-entry drawer in this run. The AI control
routed to Chat, but the Chat web surface then reported its existing
`NSURLErrorDomain -1004` server-connection failure; downstream Chat operation is
therefore not claimed by this placement proof.

## Goals-derived Recipe card treatment

Recipes now use the same borderless image-and-copy grammar that makes Goals
easy to scan, without turning a Recipe into a Goal or changing its behavior.
The image owns the rounded shape; title, cuisine/category, time, yield, and
provenance sit directly on the canvas. Selection controls remain absent from
the base library because adding a Recipe to a plan is a separate Next Meals
context.

- [`40-recipe-goals-card-style.jpg`](40-recipe-goals-card-style.jpg) — the
  featured Recipe and two-column household favorites use the borderless card
  treatment while the Add Recipe and AI dock remains fixed at the phone base.
- [`41-recipe-controls-revealed.jpg`](41-recipe-controls-revealed.jpg) — the
  earlier stretch interaction revealed inventory controls; capture 46 supersedes
  its local sizing with the canonical Filter/Sort group and bottom Search.
- [`42-recipe-card-open.jpg`](42-recipe-card-open.jpg) — tapping the featured
  card opens the real Recipe detail route with scaling, ingredients, planning,
  and cooking continuations.

The Mealime-inspired inline plan offer is recorded as a separate Meal
Planning-owned slice in
[`08-recipe-library-inventory.md`](../../../design-explorations/meals-recipes-groceries/08-recipe-library-inventory.md).
It is intentionally not rendered as a dead promotional card: it should launch
with an exact horizon and authorized constraints, prepare explained candidates,
return to an editable plan draft, and require an explicit save.

## Recipe media galleries and primary actions

Recipe inventory cards now consume every active media asset on the Recipe
object. A single image keeps the accepted still treatment; multiple images page
horizontally inside that same card with a quiet position count. Deleted media is
excluded. The gallery branch is covered by interaction tests, including paging
and opening, but this runtime account currently has no multi-photo Recipe, so
the final multi-image presentation still needs device proof with real data.

The gallery remains one Recipe object to accessibility: photo touch regions are
not announced as duplicate actions, and the card's single object label includes
the photo count when there is more than one image.

- [`43-recipe-primary-sumi.jpg`](43-recipe-primary-sumi.jpg) — Recipe Home's
  dominant “Add to Next meals” action uses Kwilt's shared Sumi near-black
  `primary` Button token; the secondary cooking action remains outlined.

The same explicit `primary` treatment now covers Recipe save, import review,
filter apply, add-to-plan, readiness, Cook Mode progression, and Cook completion
actions. Pine remains available for supporting brand and state accents rather
than primary-button fill.
