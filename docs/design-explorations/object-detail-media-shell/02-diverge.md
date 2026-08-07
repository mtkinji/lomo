# Diverge: Object Detail Media Shell

## Fixed decisions

These alternatives do not revisit the product choices already made:

- Keep the existing `ObjectPageHeader` and header controls unchanged.
- Use a full-width icon list for Recipe facts.
- Photo-less Meals remain visually complete and fully usable.
- Meals support multiple photos and one deliberate cover.
- Recipe Home has one Reviews stream ordered by self, eligible people known,
  then other useful reviews.
- Private Cook notes never publish implicitly.
- The page ends with explained alternative Meals.

## Axis of variation

**Where should shared ownership live, and in what order should Kwilt adopt it?**

The alternatives vary between shared composition, shared behavior, and
Meal-first learning. All preserve domain-specific content and treat Meal as a
Food capability object rather than forcing it into the Arc -> Goal -> Activity
hierarchy.

## Alternative A: Shared Media-To-Sheet Shell

Create one `ObjectDetailMediaShell` that receives the existing header as a
sibling, a hero renderer, body content, and controlled variants for hero height,
overlap, radii, attribution, and motion. It owns the animated scroll value,
parallax/fade calculation, sheet measurement, cover clipping, Reduce Motion
behavior, and content bottom clearance. Arc, Goal, To-do, and Recipe migrate to
the shell with their current domain content. Recipe supplies a gallery-aware
hero, an intentional artwork fallback with quiet photo action, and its facts,
Reviews, and recommendation sections.

- Audience/persona fit: strong. Maya receives the most consistent and complete
  Recipe Home while the underlying pattern becomes durable across Kwilt.
- Design-challenge answer: strongest direct answer; behavior is shared without
  changing the header or flattening object meaning.
- System fit: `Extend the system`. It replaces duplicated structural markup and
  constants with one composition primitive plus explicit variants.
- Four-object model: pass. Arc, Goal, and Activity retain their own content and
  semantics; the shell is presentation infrastructure, not a new product
  object. Meal remains owned by Food.
- Capture-first stance: pass. Photo capture is optional and the fallback is a
  complete state.
- Best when: the audit has identified a stable common seam and the team is
  willing to migrate the existing screens carefully.
- Fails when: the component API attempts to own titles, actions, editing,
  breadcrumbs, content sections, or every screen-specific scroll behavior and
  becomes a universal page framework.
- Anti-pattern check: pass if Reviews and recommendations remain bounded slots,
  not a social feed or engagement dashboard.

## Alternative B: Shared Motion Hook And Geometry Tokens

Extract `useObjectDetailMediaTransition` plus named geometry tokens while each
screen keeps its current scroll container, hero markup, and body container. The
hook returns scroll handlers, hero opacity/translation, header transition
thresholds, and Reduce Motion values. Tokens define canonical cover classes
such as `immersive`, `standard`, and `compact`; screens decide whether and how
to overlap or round their body. Recipe adopts the hook, wires its own gallery,
and adds the chosen content sections without migrating other page composition.

- Audience/persona fit: strong for Meals; neutral for cross-object visual
  consistency because screens can continue drifting structurally.
- Design-challenge answer: good. Motion and threshold behavior become shared,
  but the hero-to-sheet transition is only partially one component.
- System fit: `Extend the system` with the lowest near-term migration risk.
- Four-object model: pass. Domain screens remain entirely separate.
- Capture-first stance: pass. Media state remains screen-owned and optional.
- Best when: existing screen scroll containers are too different to compose
  safely or current dirty work makes simultaneous migration risky.
- Fails when: local markup and local style overrides continue to produce
  different overlaps, clipping, radii, attribution placement, or accessibility
  behavior despite using the same animation math.
- Anti-pattern check: pass; it adds no new user-facing concepts.

## Alternative C: Meal-First Golden Path, Then Extract

Build the complete Airbnb-informed Recipe Home first using a local composition:
multi-photo hero, intentional no-photo artwork, parallax/fade, full-width fact
list, Ingredients, Instructions, one Reviews stream, provenance, and explained
alternatives. Validate the populated, no-photo, one-photo, many-photo, long-
title, large-text, and Reduce Motion states in Simulator. Only after the Meal
experience is accepted, extract the proven behavior and migrate Arc, Goal, and
To-do in later steps.

- Audience/persona fit: strongest immediate Meals value and fastest visual
  learning for Maya.
- Design-challenge answer: good for Recipe Home, temporarily weak for the
  cross-object consistency goal.
- System fit: initially `Fit the system`, later `Extend the system`. It accepts
  short-lived duplication to avoid designing the abstraction before the new
  richest consumer exists.
- Four-object model: pass. The work remains inside Food until extraction.
- Capture-first stance: pass. The no-photo state is complete and photo capture
  stays optional.
- Best when: visual uncertainty is higher than architectural uncertainty and a
  quick real-device learning pass is more valuable than immediate reuse.
- Fails when: the follow-up extraction is deferred, leaving a fourth bespoke
  implementation and making the documented shared-component intent untrue.
- Anti-pattern check: pass if Reviews and alternatives stay below the Recipe
  content and do not turn the page into an engagement surface.

## Shared Meals content contract

Whichever architecture wins, Recipe Home keeps this order:

1. Media hero or complete intentional artwork fallback.
2. Rounded content sheet with title, description, source identity, and optional
   quiet photo invitation.
3. **What this recipe takes** full-width icon rows; unavailable facts omitted.
4. Serving control.
5. Ingredients.
6. Instructions.
7. Private prior-cook learning, if present and not submitted as a Review.
8. Notes and provenance.
9. **Reviews**: own review first, then eligible visible reviews from people
   known, then other useful reviews. Show bounded previews plus **Show all**.
10. **More Meals you might like**: contextual cards with one truthful reason
    each; exclude the current and hidden Meal.

The persistent Start cooking / Meal Plan `ActionDock` and the existing header
remain outside the document flow and retain their current meaning.

## Shared media-state contract

- `photo-single`: one selected photo fills the hero; no count badge.
- `photo-multiple`: deliberate cover first, horizontal paging, `n / total`
  indicator, and full-gallery access.
- `catalog-artwork`: reviewed recipe-specific media behaves like photography
  but retains rights/attribution metadata.
- `intentional-fallback`: composed artwork carries the same hero height,
  transition, and sheet treatment as media. It never says "missing" or shows a
  broken-image affordance.
- `photo-invitation`: only for eligible editable personal/family Recipes; quiet,
  optional, and reachable without blocking or replacing the fallback.
- `reduce-motion`: hero remains visually stable and fades/crossfades without
  parallax translation.

## Divergence assessment

- Alternative A best fulfills the explicit one-component intent.
- Alternative B is the safest architectural fallback if scroll-container
  differences make composition brittle.
- Alternative C is the strongest prototyping sequence but should only win if
  we explicitly accept temporary duplication and schedule extraction as part of
  the same initiative.
