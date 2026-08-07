# Frame: Editorial Meal Collections

## What the user said

Kwilt should rotate editorial offer cards through the Meals inventory. Those
cards can open curated pages organized around a cuisine, season, constraint, or
point of view. Some collections should also contain a fully prepared plan that
the household can turn into its own Meal Plan.

## Restated in user voice

When the number of possible meals makes planning feel like another search job,
give me a thoughtful, appealing way into a smaller set and, when it is useful,
a complete starting plan I can review and make ours, so I can move from “what
should we eat?” to a workable family choice without rebuilding the week from
scratch.

## Target audience

`audience-aspirational-family-organizers`: people who want family life to feel
more organized without adopting a planning methodology.

## Representative persona

**Maya** wants help crossing the gap between a large meal inventory and a plan
her household will actually use.

- Current situation: many meals are available, but abundance has not removed
  the work of choosing a coherent set.
- What she is trying to do: find an inviting point of view or begin from a
  prepared plan, then adapt it to household reality.
- Emotional tension: she wants inspiration and relief, not an advertisement or
  an imposed optimization.
- What would make this feel wrong: random promotions, false price promises,
  silent plan replacement, opaque personalization, or a rigid Monday-to-Sunday
  assumption.

## Hero anchor

`jtbd-move-the-few-things-that-matter` — ordinary household intentions become
useful when Kwilt helps carry them into trustworthy action.

## Job flow step

This extends `job-flow-maya-move-family-life-forward`:

- **Know the next doable action — 2/5:** a large Meals inventory still leaves
  Maya to assemble a coherent starting point.
- **Schedule or hand off — 2/5:** an editorial idea does not yet become a
  reviewable plan or family choice round.
- **Family participation — 3/5:** Meal Planning has a bounded participation
  contract, but no prepared proposal from which a household can react.
- **Keep using the system — 3/5:** useful defaults can reduce configuration,
  while promotional clutter would make Kwilt feel fussier.

## Active anchors

- `jtbd-carry-intentions-into-action` — inspiration should graduate into a
  reviewable plan and, after finalization, groceries.
- `jtbd-invite-the-right-people-in` — a prepared plan can become the bounded
  candidate set for family input without exposing the whole recipe library.
- `jtbd-trust-this-app-with-my-life` — editorial claims, plan copying, rotation,
  and pricing evidence must be explicit and predictable.

## serves snippet

```yaml
serves: [jtbd-carry-intentions-into-action, jtbd-invite-the-right-people-in, jtbd-trust-this-app-with-my-life]
```

## Friction we're addressing

Search and filter help when Maya knows what she wants. They do not create a
point of view, reduce a large inventory to a coherent set, or prepare a set of
meals that shares ingredients and fits one planning horizon.

## System alignment

Constraint posture: `Extend the system`

Current system facts:

- Meals already presents a featured meal, a Meal Planning offer, and horizontal
  discovery shelves.
- Recipes owns reusable food knowledge; Meal Planning owns candidate,
  participation, and finalization state; Groceries owns execution.
- Meal Plans support variable horizons and optional day placement rather than a
  fixed weekly calendar.
- Recipe candidates already use immutable recipe-version snapshots.
- The editorial recipe corpus has research, attribution, testing, and
  validation fields that can support higher-level editorial quality gates.

Constraints to preserve:

- A Collection never becomes another canonical recipe inventory.
- A ready-made plan never mutates or finalizes a household Meal Plan.
- Applying a plan is an explicit, reviewable copy operation.
- Collection or template revisions never rewrite a household copy.
- Groceries derives only from a finalized household plan.
- Budget claims distinguish stable editorial reasoning from fresh price
  evidence.

Constraints we may challenge:

- The current discovery shelves are filter projections only. Editorial pages
  need authored structure and narrative, not just another filter result.

Design implication:

Add a thin, typed editorial layer above Recipes and Meal Planning, plus a
deterministic distribution manifest for the Meals inventory. Do not create a
generic campaign platform or make offer cards their own product domain.

## Aspirational design challenge

How might we help Maya move from an abundant Meals inventory to an inviting,
coherent set or prepared plan she can make her household's own, while
preserving editorial integrity, family authority, pricing truth, and a calm
non-promotional Meals experience?

## Out of scope

- User-authored public collections.
- A general-purpose content management system.
- AI-generated editorial copy or cultural authority.
- Automatic plan finalization or replacement.
- Exact budget promises without fresh, local evidence.

## Open question

What is the smallest authored plan that feels meaningfully prepared rather than
like five recipes placed next to one another?
