# Frame: Food Object Architecture

## What the user said

> I question whether confirmation is even a required step at all. I do think
> putting the shopping list together is a true value add. The question is
> whether the shopping list or the confirmed list is primary or secondary.

## Restated in user voice

When I have several meals under consideration, I want to choose which ones
should contribute ingredients to a useful shared shopping list, so that I can
shop, compare prices, or hand work to a retailer without first completing a
planning ceremony that does not match how I feed my household.

## Target audience

`audience-aspirational-family-organizers`: Maya wants the household fed with
less coordination, not to become a meal-planning administrator.

## Hero anchor

`jtbd-move-the-few-things-that-matter`

Active support: `jtbd-carry-intentions-into-action`. The chosen meals should
turn into useful shopping and cooking follow-through without Maya managing a
synthetic lifecycle.

## Job-flow steps

- **Make the final call** is currently `2/5`, but the current product assumes a
  finalization event is required before downstream value.
- **Compile one correct list** is `2/5`; this is the first clear value-producing
  transformation after meal selection.
- **Account for the household** is `2/5`; manual staples and requests mean the
  Grocery List already has value beyond a Meal Plan.
- **Reach a buying surface** is `1/5`; retailer handoff, comparison, and ordering
  all operate on the Grocery List, not directly on the planning state.

## Constraint posture

`Question the system`

The current code requires a `GroceryList` to carry `mealPlanId` and
`mealPlanVersion`, even though the list has its own identity, version, status,
manual items, household requests, review, provider mapping, savings, handoff,
and completion lifecycle. The repository projection already recognizes both
`meal_plan` and `recipe_version` sources. This suggests the mandatory finalized
Meal Plan is a current coupling, not a demonstrated user requirement.

## Object test

Treat an object as primary when people can reasonably create, retrieve, edit,
share, or resume it independently; it has a durable lifecycle; and other
objects can relate to it without defining its entire meaning. Treat it as
secondary when it exists mainly inside a parent, represents a relationship or
temporary selection, or has no independent retrieval job.

| Object | Classification | Why |
| --- | --- | --- |
| **Recipe / Meal** | Primary | Durable, independently found, saved, edited, shared, chosen, and cooked. |
| **Grocery List** | Primary | Durable, directly retrieved at the store, manually extended, collaboratively edited, priced, handed off, and completed. It remains useful without a Meal Plan. |
| **Chosen-meal set** | Secondary relationship object, provisionally | A household-to-Recipe selection used for discussion and later actions. It earns primary status only if people need to name, keep, compare, or revisit multiple sets independently. |
| **Meal candidate / reaction** | Secondary | Meaningful only within the current chosen-meal conversation. |
| **Grocery item** | Secondary | Belongs to a Grocery List, with Recipe, manual, or household-request provenance. |
| **Ingredient compilation** | Secondary operation/receipt | Records which Recipe versions and servings produced which Grocery changes; it need not be a navigable user object. |
| **Meal occasion** | Secondary unless explicitly scheduled | Belongs to a chosen set only when the household assigns a date, meal period, diners, or coverage. |
| **Retailer handoff** | Secondary to Grocery List | A consequential downstream operation and receipt. It does not become a Kwilt-owned Order without provider evidence and an order lifecycle. |
| **Cook Session** | Secondary active object | Belongs to one Recipe but deserves strong contextual resume while active. |

## The overloaded object

The current “finalized Meal Plan” combines three different things:

1. **Household settlement:** which suggestions the organizer chooses.
2. **Grocery scope:** which Recipes and servings should contribute ingredients.
3. **Meal schedule:** which dish belongs to an occasion, day, meal period, or
   diner group.

These do not need one shared confirmation event. A household can keep an
editable chosen-meal set, select A, B, D, and E for Grocery compilation, and
optionally schedule one or more meals later.

## Confirmation principle

Require explicit confirmation at a consequential boundary, not merely because
the domain model wants immutability.

- Adding or removing a meal from an editable shared set is reversible; no
  separate confirmation is inherently required.
- Selecting Recipes and tapping **Add ingredients to Groceries** is itself a
  sufficient intentional action. The system can store an immutable compilation
  receipt internally.
- Updating an existing Grocery List should show the concrete diff when it could
  duplicate, remove, or materially change items.
- Sending items to a retailer cart, accepting a price plan, placing an order,
  or changing a shared schedule requires explicit review appropriate to that
  consequence.
- Immutability and provenance remain system guarantees; they do not require a
  user-visible “finalized plan” state.

## Proposed primary navigation model

Within Food, expose two primary object destinations:

1. **Meals** — the Recipe collection and the current editable chosen-meal set.
2. **Groceries** — the household's durable Grocery List, including meal-derived
   ingredients, manual staples, household requests, price comparison, and
   retailer handoff.

Keep these secondary or contextual:

- the current chosen-meal set can remain the top-right Meals affordance and
  drawer unless evidence shows people manage multiple durable sets;
- Recipe ingredient scope and provenance belong in selection/review drawers;
- Cook Mode resumes contextually from its Recipe or active session;
- retailer and delivery states descend from Groceries rather than becoming a
  third primary destination prematurely.

This is one Food domain with separate primary object collections and authority
boundaries, not necessarily two unrelated top-level product capabilities.

## Accepted direction — 2026-08-08

- **Groceries becomes a primary navigable object** beside Meals within Food.
- **Meal Plan does not become a third primary destination.** The current
  chosen-meal set remains contextual to Meals unless later evidence proves an
  independently retrievable lifecycle.
- **Confirmation is not a universal gateway.** Intentional actions such as
  adding selected Recipe ingredients to Groceries create the necessary system
  receipt without forcing the household to finalize every meal choice.
- Making Groceries visible in navigation is not sufficient by itself. The
  destination must support useful manual capture and retrieval even when no
  Recipes or Meal Plan have contributed ingredients.

## Design implication

Remove “confirm the plan” as a required universal step. Let people:

1. add Recipes to an editable chosen set;
2. select any subset and servings;
3. add that subset's ingredients to a durable Grocery List;
4. continue editing the chosen set independently;
5. explicitly review only later changes with real consequences.

## Aspirational design challenge

How might Kwilt let Maya turn any useful subset of chosen meals into one durable
household Grocery List, while keeping collaboration flexible, provenance exact,
and retailer actions appropriately explicit?

## Open question

Does the chosen-meal set have a user-valued lifecycle of its own—multiple named
sets, history, comparison, or deliberate closure—or is it simply the current
editable relationship between the household and Recipes?
