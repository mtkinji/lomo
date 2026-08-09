# Yes-and: Groceries as a Primary Object

## Original idea

Expose **Groceries** as a primary navigation destination beside **Meals** and
continue exploring the system around it.

## Frame recommendation

Use an **expanded frame**:

> Make Groceries the durable household buying surface, not merely a new menu
> row that exposes the existing finalized-plan dependency.

The navigation change activates the object. The product change makes it
independently useful.

## Primary-object test

A Groceries destination is only genuinely primary if Maya can open it with no
meal-planning history and immediately do the job she came to do. A screen whose
empty state says “finalize a meal plan first” is still a secondary projection,
regardless of where it appears in navigation.

The minimum credible primary-object behavior is:

1. open Groceries directly;
2. see the household's current list or a useful empty state;
3. add a manual item immediately;
4. later merge Recipe-derived ingredients without losing manual work;
5. retrieve and use the list at the store without returning through Meals.

## Adjacencies

### 1. Capture before planning

The empty Groceries surface can accept “milk,” “dish soap,” or “coffee” before
any Recipe is chosen. The first item creates or resumes the household's active
list.

- **Serves:** Account for the household.
- **Job elevation:** Groceries becomes useful whenever a need is noticed, not
  only after a planning ritual.
- **New value:** Captures staples, requests, and non-meal purchases in the same
  place used at the store.
- **Cost delta:** Moderate domain change; small interaction change.
- **Guardrail:** Do not make people name or configure a list before capture.

### 2. One durable household list

Begin with one obvious active list shared by the household. Recipe ingredients,
manual items, and household requests join it with visible provenance.

- **Serves:** Compile one correct list.
- **Job elevation:** Replaces coordination across notes, texts, and planning
  state with one resumable buying surface.
- **New value:** Everyone knows where an item should go and where to retrieve it.
- **Cost delta:** Lower than introducing named or retailer-specific lists.
- **Guardrail:** Preserve source and contributor without turning the list into
  an activity feed.

### 3. Compile any useful Recipe subset

From the chosen-meal drawer, Maya selects A, B, D, and E, adjusts servings if
needed, and chooses **Add ingredients to Groceries**. A hidden immutable receipt
records the Recipe versions and quantities that caused the change.

- **Serves:** Move the few things that matter; Compile one correct list.
- **Job elevation:** Converts consideration into action without falsely
  declaring the whole meal set final.
- **New value:** Supports flexible “we might cook these” behavior while keeping
  grocery math exact.
- **Cost delta:** Moderate; much of the projection model already exists.
- **Guardrail:** Do not equate Grocery inclusion with a scheduled or committed
  meal.

### 4. Reconcile changes instead of rebuilding

If servings or selected Recipes later change, Groceries offers a concrete diff:
items added, quantities adjusted, and items no longer needed. Manual, checked,
and purchased work remains intact.

- **Serves:** Carry intentions into action.
- **Job elevation:** Lets planning remain flexible without making the shopping
  list untrustworthy.
- **New value:** Users can accept only the changes that still make sense.
- **Cost delta:** High logic and state-model cost; worth sequencing after the
  basic primary-list model.
- **Guardrail:** Never silently regenerate or erase household list state.

### 5. Store-run execution belongs to Groceries

Groceries owns aisle grouping, offline access, shared completion, and the clear
return point during a shopping trip. Direct navigation, deep links, and later a
widget can all resume the same object.

- **Serves:** Reach a buying surface.
- **Job elevation:** Reduces the path from “I am at the store” to the list from
  several navigation steps to one known destination.
- **New value:** The list becomes operational, not just preparatory.
- **Cost delta:** Incremental because much of the current Grocery screen already
  supports execution.
- **Guardrail:** Keep shopping interaction fast and avoid burying items beneath
  planning summaries.

### 6. Commerce escalates from the list

Price comparison, retailer-cart handoff, substitutions, and delivery begin
from selected Grocery items. Each provider action gets confirmation appropriate
to its actual consequence.

- **Serves:** Reach a buying surface.
- **Job elevation:** Turns a trusted list into time or money saved without
  making commerce the prerequisite for using Groceries.
- **New value:** Supports in-app and out-of-app ingredient acquisition from the
  same source of truth.
- **Cost delta:** High integration cost and dependent on provider evidence.
- **Guardrail:** Do not claim ordering or best-price coverage beyond what the
  connected provider can prove.

### 7. Relate errands without merging objects

An Activity or out-and-about context may link to Groceries, and a Grocery item
may optionally carry a store or place. Groceries remains the buying object;
Activities remains the broader doing object.

- **Serves:** Carry intentions into action.
- **Job elevation:** Makes the list reachable in the real-world moment without
  inventing an everything-list.
- **New value:** Supports mixed errands while preserving clear object ownership.
- **Cost delta:** Low for contextual links; higher for place-aware behavior.
- **Guardrail:** Do not turn Groceries into a generic task manager.

### 8. Multiple lists are earned, not assumed

Named, store-specific, trip-specific, or archived lists may eventually matter,
but primary navigation does not require that management model on day one.

- **Serves:** Keep the household oriented.
- **Job elevation:** Starts with the smallest durable object people can trust.
- **New value:** Avoids asking users to decide list structure before they can add
  an item.
- **Cost delta:** Defers substantial information-architecture and sync cost.
- **Guardrail:** Preserve the data model's ability to add multiple lists later;
  do not expose premature list administration now.

## Recommended learning release

The smallest version that proves Groceries is primary includes:

1. a visible **Groceries** sibling destination under Food;
2. one active household Grocery List that exists independently of a Meal Plan;
3. immediate manual item capture, including from the empty state;
4. selected Recipe ingredients added into that list with provenance;
5. no required “finalize meal plan” ceremony;
6. direct list retrieval for shopping and current shared completion behavior.

Defer multiple named lists, automatic change reconciliation, scheduling, price
comparison, and ordering until this basic ownership model is observed working.

## Decision to carry into divergence

Provisional recommendation: **one active household list** is the base object.
Multiple lists should be introduced only when evidence shows that store,
household member, trip, or time horizon requires separate retrieval and
completion lifecycles.
