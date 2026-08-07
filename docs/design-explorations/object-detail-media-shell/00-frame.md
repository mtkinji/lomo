# Frame: Object Detail Media Shell

## What the user said

> The hero-to-sheet transition is something we've already built into Arcs,
> Goals, and To-Dos. We already have a header style that I want to stick with.
> I imagine the hero-to-sheet transition as one component that we use across
> any object details that benefit from a big cover image.

> Meals without cover images cannot feel deficient, but people should be made
> aware that they can add photos. A Meal may have many photos. Use the
> full-width icon list, add Reviews, and end with recommendations for other
> Meals the person may prefer.

## Restated in user voice

When Maya opens a Meal while deciding what could work, she wants it to feel
complete and inviting whether or not anyone has photographed it yet. She wants
to understand what it asks of her, learn from relevant cooking experience, and
have a graceful way to keep browsing if it is not the right choice, so deciding
dinner does not become more work.

## Target audience

`audience-aspirational-family-organizers` — people who want ordinary household
decisions to move forward without becoming productivity or meal-planning power
users.

## Representative persona

Maya is looking at a Meal near a real planning or cooking decision.

- Current situation: she may be evaluating a Kwilt catalog Meal, a family
  Recipe, or a personal Recipe with no photo yet.
- What she is trying to do: recognize whether it looks appealing and realistic,
  understand time and yield, benefit from relevant experience, and either act
  or continue browsing.
- Emotional state or tension: open to inspiration, but short on attention and
  unwilling to maintain imagery or social metadata as administrative work.
- What would make this feel wrong: a blank or apologetic missing-image state,
  an unfamiliar header, fake social proof, an engagement feed, unexplained
  recommendations, or a photo prompt that blocks the Recipe.

## Hero anchor

`jtbd-move-the-few-things-that-matter` — the page matters when it helps Maya
move from "what could we eat?" toward one plausible household decision.

## Job flow step

Primary: step 3 in `job-flow-maya-feed-household-with-less-work`, **Recognize
whether it fits tonight**, currently documented at 1/5.

- Desired outcome: Recipe Home answers appetite, time, yield, source, and
  readiness before dense detail.
- Current offering: Recipe Home renders a static hero, title, compact fact bar,
  ingredients, directions, private prior-cook learning, and actions.
- Gap: its visual hierarchy and hero behavior diverge from Kwilt's established
  object-detail grammar; absent media receives a special fallback treatment;
  public review evidence and contextual alternatives are not yet delivered.

Supporting: step 18, **Keep what was learned**, currently documented at 1/5.
The existing latest Cook record proves a private note and would-make-again
signal can be shown, while the global catalog design separately defines
version-bound ratings and moderated Cooking notes.

## Active anchors

- `jtbd-move-the-few-things-that-matter` — appealing, practical detail and a
  graceful alternative path help Maya choose a meal rather than merely browse.
- `jtbd-trust-this-app-with-my-life` — missing media, ratings, notes, private
  household learning, and recommendation reasons must all remain truthful and
  ownership-clear.

## Friction we're addressing

Kwilt has a recognizable hero-to-content transition, but it is reimplemented
per object and has drifted. Recipe Home then introduces another version without
parallax or scroll-linked fade. At the same time, the Meal page needs to grow
into multi-photo media, full-width practical facts, Reviews, and related Meal
recommendations without making photo-less Meals, private household learning, or
catalog participation feel second-class or mixed together.

## System alignment

Constraint posture: `Extend the system`

Current system facts:

- Existing header: `ObjectPageHeader` and `HeaderActionPill` are already the
  shared object-detail header grammar. The header is explicitly outside this
  work and remains unchanged.
- Arc detail: 320px hero, -28px sheet overlap, 24px top radii, 0.5 parallax
  compensation, and a measured/fallback fade threshold aligned to the sheet
  reaching the fixed header.
- Goal detail: 240px hero, -20px overlap, square sheet top, 0.5 parallax
  compensation, different hold/lead values, and similar measured threshold
  logic.
- To-do detail: 168px hero, 0.35 parallax compensation, a simpler fade based on
  fixed hero height, no overlapping rounded sheet container, and an always-
  available mapped artwork fallback.
- Recipe Home: 260px static hero, -20px overlap, 20px top radii, no parallax or
  fade, and a recipe-specific missing-media gradient/icon treatment.
- Shared implementation gap: no component currently owns hero geometry,
  scroll-linked motion, sheet overlap/radii, media state, or measurement. Each
  screen composes these itself.
- Recipe media model: `Recipe.mediaAssets` already supports ordered active
  media collections of up to 20 assets. `RecipeArtworkGallery` already pages
  multiple active images with a position indicator, but Recipe Home currently
  selects only the first active asset.
- Review evidence: Recipe Home can load the latest private Cook record. The
  accepted global-catalog design specifies version-bound personal ratings,
  thresholded aggregates, and moderated public Cooking notes; the current
  catalog-foundation migration does not yet implement those participation
  stores or their Recipe Home UI.
- Recommendations: `buildRecipeRecommendations` currently produces general
  editorial and quick-to-make shelves. It does not yet produce contextual
  alternatives relative to the open Meal or define the bottom-of-detail
  exclusion and explanation contract.

Constraints to preserve:

- Keep the existing header component, header controls, header layout, and
  action meaning unchanged.
- Extract the body transition beneath the header; do not create a universal
  object page that flattens domain-specific content.
- A cover-capable object without a user photo must still have a complete,
  intentional visual state. "No photo" is not an error or empty page.
- Inviting a Meal photo must be optional, contextual, and non-blocking. A person
  can ignore it indefinitely without degraded functionality or nagging.
- Multiple Meal photos are first-class and retain ownership, rights,
  attribution, ordering, deletion, and accessibility semantics.
- Reviews must keep private household learning distinct from public catalog
  participation and must not become a default-public family feed.
- Recipe Home presents one Reviews stream rather than separate household and
  public lanes. Ordering prioritizes the person's own review, then eligible
  visible reviews from people they know, then other reviews. Relationship may
  affect ordering, but never changes review visibility or publishing consent.
- A private Cook note is not a review. Kwilt may invite the person to turn
  relevant Cook learning into a review, but publication is always explicit.
- Recommendations remain explained alternatives, never engagement-ranked
  pressure and never an implicit Meal Plan decision.
- Editorial inspiration, a private editable Meal Plan, and Grocery execution
  remain distinct.

Constraints we may challenge:

- Per-screen hero heights, overlap depths, corner radii, and fade constants as
  uncoordinated local values.
- The assumption that every cover-capable object needs a photographic source
  to feel visually complete.
- The current Recipe Home choice to display only one active media asset.
- The generic recommendation builder as sufficient context for a detail-page
  alternative rail.

Design implication:

Create a shared media-to-sheet shell that owns scroll motion, transition
measurement, cover frame, sheet overlap, and explicit media states while
accepting the existing header and domain content as composition slots. Standard
behavior should be shared; object-specific hero height and content remain
controlled variants. Meals then adds a gallery-capable media renderer, a quiet
photo invitation in the intentional fallback state, the selected full-width
facts list, a truthful Reviews section, and explained alternative Meals at the
end.

## Aspirational design challenge

How might we help Maya recognize, trust, and act on a Meal through a consistent
Kwilt object-detail transition, while keeping photo-less Meals complete,
multiple photos welcome, review ownership truthful, recommendations useful, and
the established header untouched?

## Out of scope

- Redesigning `ObjectPageHeader`, its actions, or its scroll-state appearance.
- Making every Kwilt detail page use a cover image.
- Standardizing the internal content or actions of Arcs, Goals, To-dos, and
  Meals into one generic object-detail component.
- A public social feed, replies, comment likes, follower graph, review-driven
  ranking, or public family activity.
- Automatically adding a recommended Meal to a Meal Plan.
- Treating generated catalog imagery as user-authored Meal photography.

## Open question

None for the frame. Review ranking details remain a Phase 2 design choice, but
the single-stream structure and consent boundary are locked.
