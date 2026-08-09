# Frame: Meal Plan Occasions

## What the user said

> I wonder about picking days for the coming week? Which meal is for Monday?
> Tuesday? What's for breakfast on Saturday? What about Sunday dinner? What are
> we doing for lunches this week?

## Restated in user voice

When the coming week contains a few eating moments that need coordination, Maya
wants to place the meals that matter on understandable days and occasions so her
household knows what is actually happening, without requiring her to fill and
maintain a complete meal calendar.

## Target audience

`audience-aspirational-family-organizers`: families who want ordinary household
life to move with less coordination without adopting a productivity methodology.

## Representative persona

Maya is carrying the household's food decisions while trying to invite useful
family participation.

- Current situation: the family can collect meal possibilities, but a committed
  batch does not answer when those meals will happen.
- What she's trying to do: make the coming food rhythm legible enough to shop,
  prepare, and answer ordinary family questions.
- Emotional state or tension: she wants relief from ambiguity, not another grid
  she is responsible for keeping complete.
- What would make this feel wrong: blank-slot pressure, a required 21-cell week,
  calendar administration, or implying certainty the household does not have.

## Hero anchor

`jtbd-move-the-few-things-that-matter` - the household needs a small number of
real food decisions to move forward, not a fuller planning artifact.

## Job flow step

`job-flow-maya-feed-household-with-less-work`:

- **Choose the planning horizon** is `2/5`: contracts support a week, next shop,
  meal count, or open horizon, but the product has not made the choice light or
  legible.
- **Make the final call** is `2/5`: finalization can store dated occasions, but
  the shared-cart path currently creates undated, unnamed occasions.

## Active anchors

- `jtbd-carry-intentions-into-action` - selecting meals should carry the
  household's intention into a usable weekly rhythm and Grocery execution.
- `jtbd-invite-the-right-people-in` - the resulting plan should answer shared
  household questions without exposing unrelated calendars or private context.

## Friction we're addressing

The shared cart answers **what sounds good**, and settlement answers **which
meals are next**, but neither answers **when**. A specific occasion such as
Sunday dinner is not the same planning object as a broad coverage question such
as weekday lunches. A generic week grid would make them look equivalent and ask
Maya to maintain precision she may not need.

## System alignment

Constraint posture: `Extend the system`

Current system facts:

- Existing surface: the top-right Plan affordance opens the shared-cart drawer;
  organizer settlement happens inside that drawer.
- Existing user flow: household members add and support possibilities; Maya
  selects a subset; Groceries consumes only the settled snapshot.
- Existing domain/data model: `MealPlanHorizon` already supports `date_range`,
  `next_shop`, `meal_count`, and `open`; `MealPlanOccasion` already stores a
  title, placement date, dishes, and diner exceptions.
- Existing technical affordances: finalized entries and occasions are immutable
  per plan version, and `NextMealsScreen` can already display an occasion title
  and date.
- Existing gap: shared-cart settlement currently emits one unnamed, undated
  occasion per selected meal. There is no structured breakfast/lunch/dinner
  role or multi-day coverage pattern.
- Existing UX convention: food remains the primary interface; settings,
  configuration, and planning mechanics stay progressively disclosed.

Constraints to preserve:

- Adding to the cart remains immediate and does not ask for a date.
- Household support remains separate from organizer commitment.
- Placement is organizer-owned and happens only when settling chosen meals.
- Groceries consumes the immutable settled batch, not the open cart.
- The product must work for three dinners, the next shop, or an open horizon;
  it must not assume every household plans Monday through Sunday.

Constraints we may challenge:

- Settlement cannot remain entirely placement-free when the household needs to
  coordinate a real occasion.
- A freeform occasion title alone may be too weak to support clear day and meal
  placement, but a rigid calendar grid is not the default answer.

Design implication:

Placement should be sparse, optional, and introduced after meals are selected.
The design should distinguish specific occasions such as **Sunday dinner** from
coverage patterns such as **weekday lunches**, then decide whether both belong
in the first learning release.

## Aspirational design challenge

How might we help Maya turn a selected batch into an understandable food rhythm
for the coming horizon, while preserving the fast shared cart and avoiding a
weekly-calendar maintenance job?

## Out of scope

External-calendar sync, cooking assignments, reminders, nutrition targets,
school/work schedule ingestion, AI auto-scheduling, and requiring every day or
meal period to be filled.

## Open question

Should the first slice handle only specific day-and-meal occasions, or must it
also represent recurring coverage such as **weekday lunches** without five
separate assignments?

## Anchor assessment

`serves: [jtbd-carry-intentions-into-action, jtbd-invite-the-right-people-in]`
