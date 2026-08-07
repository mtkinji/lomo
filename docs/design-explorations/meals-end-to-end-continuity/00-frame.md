# Frame: Meals End-to-End Continuity

## What the user said

The Meals inventory, Meal Plan concept, and meal detail shell are individually
becoming polished, but the continuous experience still does not come together.
Run repeated reference-backed design loops and build until the whole journey is
elegant, reductive, and top quality.

## Restated in user voice

When I am trying to feed my family, let each choice naturally become the next
useful thing without making me reconstruct where I was, learn the boundaries
between Kwilt capabilities, or manage a workflow.

## Target audience and persona

`audience-aspirational-family-organizers`, represented by **Maya**.

- Current situation: she knows roughly what the family likes but repeatedly
  rebuilds the decision, list, and shopping handoff.
- Desired change: one calm thread from “that sounds good” to “we have what we
  need.”
- Wrong feeling: a pipeline, calendar project, settings exercise, or dashboard.

## Hero anchor and job-flow gap

- Hero: `jtbd-move-the-few-things-that-matter`.
- Active: `jtbd-carry-intentions-into-action`,
  `jtbd-invite-the-right-people-in`, and
  `jtbd-trust-this-app-with-my-life`.
- Job flow: `job-flow-maya-feed-household-with-less-work`.
- Weak steps: choose meals the household will accept, turn choices into one
  reviewed list, and resume the cycle without rebuilding context.

```yaml
serves: [jtbd-carry-intentions-into-action, jtbd-invite-the-right-people-in, jtbd-trust-this-app-with-my-life]
```

## System alignment

Constraint posture: `Fit the system`.

- Meals remains the cookbook and discovery surface.
- Meal Planning remains authoritative for the active cycle, family response,
  and organizer decision.
- Groceries remains authoritative for compiled items, corrections, savings,
  and retailer handoff.
- One-tap selection already creates an open, durable plan.
- The inventory already owns a compact persistent Plan drawer.
- Grocery provenance, Already have state, and retailer truth already exist.

Preserve private-by-default participation, optional family input, an open
planning horizon, direct capture, and honest retailer boundaries. Do not add a
fourth “Food workflow” object, progress dashboard, or permanent stepper.

## UI contract

Job: When Maya sees a meal that sounds right, she needs to carry it through a
family decision and into a shop-ready list, so she can feed the household with
less repeated coordination.

Primary action: the single next move for the active meal cycle.

Must show: selected meals, current plan state, any decision that genuinely
needs attention, grocery items, and the truthful next handoff.

Reveal later: planning context, savings, provenance detail, household extras,
and retailer mechanics.

Must not add: setup before choosing food, a rigid weekly calendar, a progress
dashboard, a coupon inbox, or parallel food state.

Reuse map: Meals Plan drawer for collection; Meal Plan for choice and decision;
Already have and Grocery list for review; Grocery handoff for shopping.

Behavior sources: `brief-household-food-loop`, existing capability ownership,
one-tap Meal Plan selection, and the user’s current continuity direction.

Required states: no plan, draft with zero meals, draft with meals, family choice
open, ready to decide, finalized, compiling, review needed, ready, stale, cached,
and offline.

Proof path: Meals → add from inventory → inspect Plan → open Meal Plan → decide
or ask family → finalize → make groceries → review → shop; repeat from meal
detail and after relaunch.

## Aspirational design challenge

How might we let one food choice carry its own context all the way to shopping,
while preserving capability ownership and making the machinery nearly
invisible?
