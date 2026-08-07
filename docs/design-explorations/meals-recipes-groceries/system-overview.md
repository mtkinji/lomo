# Meals System Overview

## Decision

Build one continuous household food loop:

> **Discover -> Choose -> Plan -> Shop -> Cook -> Remember**

The 37 accepted use cases are different entry points and paths through this
loop. They do not require 37 features, separate recommendation systems, or new
top-level destinations.

## What the household experiences

1. **Meals helps me discover food worth making.** I can search directly, browse
   my recipes, or enter through an editorial Collection organized around a
   cuisine, budget, season, schedule, technique, or other useful intent.
2. **I choose my level of help.** I can pick a few meals from a Collection or
   start with its complete ready-made plan.
3. **Meal Plan turns that proposal into our decision.** It creates a private,
   editable household draft where we can set the real horizon, servings,
   constraints, timing, and optional family input.
4. **Groceries makes the decision executable.** Finalized meals become one
   reviewed list with ingredient provenance, an on-hand check, price evidence
   when available, and retailer handoff.
5. **Meals helps us cook.** Recipe readiness and Cook Mode reduce uncertainty
   before and during cooking.
6. **A tiny explicit finish improves the next cycle.** “Make again,” “not for
   us,” a swap, or a household note preserves useful truth without constructing
   a hidden taste identity.

## Different starting points, one planning path

| Starting situation | What Kwilt proposes | Where it converges |
| --- | --- | --- |
| “Show me something delicious.” | A bounded Collection with honest makeability evidence | Meal Plan draft |
| “Keep dinners under this budget.” | A prepared budget-minded plan with qualified price evidence | Meal Plan draft |
| “Use what we already have.” | Candidate meals based on confirmed relevant stock | Meal Plan draft |
| “This ingredient is on sale.” | The smallest reviewable swap or addition, including “change nothing” | Meal Plan draft |
| “This week is unusually busy.” | A plan shaped around the real horizon, energy, and schedule | Meal Plan draft |
| “We loved what we made last time.” | A household-owned prior recipe or plan copy | Meal Plan draft |

Meal Plan is the convergence point because it owns the household's decision.
Suggestions from Meals, Money, Groceries, Chat, or editorial content remain
proposals until the household accepts them there.

## The small set of system objects

| Object | Purpose | Owner |
| --- | --- | --- |
| `Recipe` | Reusable, attributable food knowledge and cooking guidance | Meals / Recipes |
| `EditorialCollection` | An authored point of view that makes discovery bounded and meaningful | Meals / Recipes |
| `MealPlanTemplate` | An optional complete proposal with sequence, alternatives, basket logic, and rationale | Meal Planning |
| Selection tray | Temporary “choose some” state while browsing; not a durable database object | Meals presentation |
| `MealPlan` | The household's private, editable draft and finalized commitment | Meal Planning |
| `GroceryList` | The reviewed execution list derived from finalized meals | Groceries |
| Cook record | A minimal explicit outcome, correction, or household-owned note | Meals / Recipes |
| `MealEditorialEdition` | A deterministic weekly schedule for which offers appear and where | Meals presentation |

## Editorial publishing behind the experience

Collections are published, not improvised at request time. Each Collection has
an editorial promise, ordered meals, cultural/source context where relevant,
and honest reasons each meal is worth trying and doable. Some Collections also
publish a ready-made `MealPlanTemplate`.

A weekly `MealEditorialEdition` places a small number of offers through the
Meals inventory. Placement can rotate without changing the household's adopted
copy, saved recipes, or existing plan.

## System rules

- Editorial content and AI make **proposals**, never household decisions.
- Adoption always creates a household-owned copy; later template changes do
  not silently rewrite it.
- Groceries compiles from reviewed, finalized meal decisions, not browsing
  state.
- Budget, stock, dietary, and price claims must retain their evidence and
  confidence; uncertainty remains visible.
- Learning comes from explicit actions and cook outcomes, not passive identity
  inference.
- Capability ownership stays intact: Meals knows food, Meal Plan owns the
  commitment, Groceries owns shopping execution, and Money owns financial
  truth.
- “Cook” and “Remember” are stages of the loop, not new navigation tabs.

## Release sequence

1. **Core loop:** Collection -> choose some or ready-made plan -> editable Meal
   Plan -> finalized Groceries.
2. **Confidence:** makeability evidence, Recipe readiness, and reliable Cook
   Mode continuity.
3. **Household coordination:** bounded reactions and organizer finalization.
4. **Learning:** explicit cook outcomes, household variations, and calm
   re-entry into the next cycle.
5. **Broader entry points:** pantry, live price, deeper budget, technique, and
   changing-household scenarios once their evidence is trustworthy.

This sequencing changes when each job is served, not whether it belongs in the
system.
