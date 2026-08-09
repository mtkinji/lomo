# Yes-And: Food Next Move as a Home Question

## Original idea

After meal commitment, expose cooking, Groceries, and out-and-about work without
making the user reconstruct the capability navigation path.

## Adjacencies

### Yes, and what if Home were the place where unfinished life becomes easy to resume?

- Serves: `jtbd-carry-intentions-into-action`
- Job elevation: Home stops being a launcher or summary and becomes the shortest
  path back into a small number of live threads.
- New value: Food can prove a general re-entry grammar for cooking, shopping,
  active sessions, and other capability-owned continuations.
- Cost delta vs. original: high
- Anti-pattern check: pass only if Home remains selective and calm rather than
  becoming a capability dashboard.

### Yes, and what if capabilities published honest continuations instead of Home inventing them?

- Serves: `jtbd-trust-this-app-with-my-life`
- Job elevation: the user sees actions grounded in authoritative state and clear
  uncertainty rather than a cross-capability guess.
- New value: Meal Planning can publish committed meals, Groceries can publish a
  list, Recipes can publish an active cook, and Activities can publish actionable
  errands while retaining ownership.
- Cost delta vs. original: medium
- Anti-pattern check: pass; Home composes typed projections and does not become
  a second source of truth.

### Yes, and what if Home showed several valid doors without pretending one is always next?

- Serves: `jtbd-carry-intentions-into-action`
- Job elevation: a person can choose from the context only they know—cook,
  groceries, or something else—without correcting an opaque recommendation.
- New value: hard evidence such as an active Cook session may dominate, while
  ambiguous branches remain simultaneously available.
- Cost delta vs. original: medium
- Anti-pattern check: pass if this is a bounded continuation cluster, not a grid
  of shortcuts or competing primary buttons.

### Yes, and what if the committed Recipe stack became an ambient continuation?

- Serves: `jtbd-move-the-few-things-that-matter`
- Job elevation: the household's prior meal decision remains visible at the
  moment appetite and action return.
- New value: the same bounded projection can support Home, an optional widget,
  and deep links into Recipe readiness without creating another plan authority.
- Cost delta vs. original: medium
- Anti-pattern check: pass if flexible meals stay valid and the surface does not
  manufacture urgency, ranking, or a date.

### Yes, and what if Groceries were recoverable and capturable from the same moment?

- Serves: `jtbd-carry-intentions-into-action`
- Job elevation: a regular store run can use the household list even when no
  retailer integration or Meal Planning route was used.
- New value: direct open plus quick add for staples and household requests makes
  Groceries useful beyond generated ingredients.
- Cost delta vs. original: low
- Anti-pattern check: pass if Grocery items remain grocery purchases and are not
  forced into Activities.

### Yes, and what if “Out & about” composed shopping with errands without merging them?

- Serves: `jtbd-carry-intentions-into-action`
- Job elevation: the user can see what is actionable while away without opening
  and reconciling several lists.
- New value: one contextual lens can link the Grocery list, pickups, returns,
  and place-relevant Activities while each capability retains its semantics.
- Cost delta vs. original: medium
- Anti-pattern check: pass if it works without location permission and avoids a
  surveillance-like trip timeline.

### Yes, and what if Home learned from explicit use rather than silent inference?

- Serves: `jtbd-trust-this-app-with-my-life`
- Job elevation: Home becomes more useful without claiming to know that a shop
  happened off-app or that a meal is ready.
- New value: recent opens, an active Cook session, explicit purchased/list state,
  “not now,” and manual completion can rank continuations transparently.
- Cost delta vs. original: medium
- Anti-pattern check: pass if ranking remains reversible, inspectable, and free
  from pressure or hidden behavioral scoring.

## Cheap-surface test

A new Home screen fails if it merely copies Meals, Groceries, Activities, Shared
Home, and Plan into another collection of cards. That treatment reduces some
taps but adds another place to understand, another ranking system, and another
surface competing to summarize capability state. It would be a dashboard under
a calmer name.

The invariant is **re-entry without reconstruction**, not the existence of a
Home route. A successful solution should retire steps or collapse an existing
surface. If it adds Home while leaving the current Activities default, Food
Home, single-lead continuation, capability menu, and Plan recovery untouched,
it has almost certainly made the system worse.

## Frame recommendation

Run the design-thinking loop with the original job elevated but without choosing
the surface: **a calm contextual re-entry system**, using the committed Food
cycle as the first demanding case.

The Diverge phase should compare genuinely different system changes:

1. no new surface—smarter launch/resume, deep links, widgets, and shortcuts;
2. a shell-owned continuation layer that replaces existing recovery chrome;
3. a true Home that replaces the current default entry rather than joining it.

Only choose Home if it can retire or absorb existing entry behavior and prove a
cross-capability job beyond Food. Otherwise, solve the Food re-entry path without
creating another destination.
