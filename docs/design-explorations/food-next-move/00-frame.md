# Frame: Food Next Move

## What the user said

> After committing, Kwilt may not know whether I already bought groceries. I
> might want to cook one of the planned meals, pull up the Grocery list for a
> normal store run, add non-meal things, or see other out-and-about to-dos. None
> of those should require navigating through the planning structure.

## Restated in user voice

When the household has committed its next meals, Maya wants to reach the useful
food action for her present context immediately, so the prior decision reduces
work whether she is about to cook, entering the store, or handling errands while
she is out.

## Target audience

`audience-aspirational-family-organizers`: people who want family life to move
with less coordination and do not want to operate a planning methodology.

## Representative persona

Maya has already done the planning work. Kwilt does not have reliable evidence
that she used its Grocery flow or that shopping is complete.

- Current situation: she may be in the kitchen, at the store, or simply out.
- What she is trying to do: resume the food cycle from reality, not from the
  last screen Kwilt knows about.
- Emotional tension: the plan should remove recall and navigation work.
- What would make this feel wrong: a guessed next step, a six-tap path to cook,
  a Grocery list hidden inside Meal Planning, or errands copied into the wrong
  capability.

## Hero anchor

`jtbd-move-the-few-things-that-matter` — the committed meal intention should
become real household follow-through.

## Job flow steps

- **Recognize whether it fits tonight** (`1/5`): planned meals are not exposed
  as immediate, appetite-forward choices with a direct Recipe/readiness path.
- **Compile one correct list** (`2/5`) and **Account for the household** (`2/5`):
  Grocery compilation and manual household items exist, but recovery and quick
  capture are buried.
- **Prepare before cooking** (`1/5`): Recipe readiness exists, but the committed
  meal does not provide a short continuation into it.
- In `job-flow-maya-move-family-life-forward`, **Know next doable action** is
  `2/5`: out-and-about Activities and Groceries are separately representable,
  but no calm composite surface makes both actionable in context.

## Active anchors

- `jtbd-carry-intentions-into-action` — carry a committed food decision into
  shopping or cooking without requiring the user to reconstruct the path.
- `jtbd-trust-this-app-with-my-life` — admit when Kwilt cannot know that an
  off-app shopping trip happened; never claim readiness from absence of data.

## Friction we're addressing

The current Food continuation projection chooses one lead state from app-owned
evidence. After commitment, real life can branch without producing a Kwilt
event, so a single inferred lead hides valid actions and creates unnecessary
navigation. Grocery items and out-and-about Activities also need coordinated
retrieval without losing their separate ownership and behavior.

## System alignment

Constraint posture: `Bend the system`

Current system facts:

- Food Home has one derived continuation card and can route to Cook Mode,
  Groceries, Meal Planning, or Finalization.
- A committed plan owns immutable meal occasions and Recipe snapshots.
- Grocery lists own compiled ingredients and already support manually added
  household requests or staples.
- Activities own errands, pickups, returns, and place/action-context evidence.
- Recipe Home, readiness, Cook Mode, Grocery deep links, Activity action cards,
  and native widget infrastructure already exist.

Constraints to preserve:

- Meal Planning owns commitment, Recipes owns cooking, Groceries owns shopping,
  and Activities owns errands.
- Off-app shopping cannot be inferred as complete without explicit evidence.
- Manual Grocery capture must remain available without requiring a meal source.
- Contextual retrieval must not require tags, places, or location permission.
- The primary app surface must remain calm rather than becoming a dashboard.

Constraints we may challenge:

- Food continuation must not collapse all valid actions into one inferred lead.
- The left navigation cannot be the only recovery path for an active household
  food cycle.
- “Next meals” need not remain visible only inside Food or Meal Planning.

Design implication:

Post-commitment should expose two durable continuations—**Cook a planned meal**
and **Open groceries**—and rank them only when strong evidence exists. A broader
out-and-about surface may compose the Grocery list with relevant Activities,
but it must link to capability-owned items rather than merge their data models.

## Aspirational design challenge

How might we help Maya resume a committed food cycle in one obvious move from
the context she is actually in, while preserving honest uncertainty and clear
Meal, Grocery, Recipe, and Activity ownership?

## Out of scope

Automatic shopping-complete inference, background location surveillance,
retailer-only checkout, pantry perfection, merging Activities into Grocery
rows, and automatic selection of tonight's meal.

## Open question

Which in-app surface can expose both Food continuations at launch without
turning the primary canvas into a dashboard?
