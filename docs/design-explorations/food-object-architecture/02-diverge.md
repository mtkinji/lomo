# Divergence: Recipes, Plan, and Groceries

## Naming correction

The current primary destination called **Meals** is actually a collection of
Recipes. Desserts, breads, drinks, sauces, and snacks belong there even though
they are not meals. Conversely, takeout, leftovers, and “everyone fend for
themselves” may be valid meal-plan entries without being Recipes.

Recommended object names:

- **Recipes** — the durable collection of things Kwilt can help make;
- **Groceries** — the durable household buying list;
- **Plan** — an optional, current set of Recipes the household is considering
  making, exposed contextually from Recipes rather than as primary navigation.

## What the Reddit scan adds

The evidence does not support one universal linear workflow.

- Some households explicitly want a shared Recipe library, group selection,
  and voting before deciding what belongs in the week. One request describes
  voting as the missing feature needed before Recipes are added to the week's
  meals. [Reddit: shared group meal planning](https://www.reddit.com/r/androidapps/comments/hbl2yf/)
- A family-app request similarly separates the shared Recipe library, the
  master Grocery List, and an app where family members can vote and see matched
  Recipes. [Reddit: family meal-planning app](https://www.reddit.com/r/Cooking/comments/1ho0p4j)
- Flexible planners often maintain a “make this week” shortlist and reorder or
  swap it later instead of committing every Recipe to a fixed date.
  [Reddit: weekly family menu methods](https://www.reddit.com/r/Cooking/comments/18ho3qn)
- Other users describe the simpler flow: select a Recipe and tap an add-to-
  groceries action. Some explicitly say the planning section is not useful to
  them. [Reddit: grocery-list workflows](https://www.reddit.com/r/mealprep/comments/1vj2hqg/)
- The value of Recipe-to-Grocery transfer depends on control: people praise the
  ability to remove ingredients they already have and complain when transfer is
  unreliable. [Reddit: editable generated lists](https://www.reddit.com/r/mealplans/comments/1dfkbc1),
  [Reddit: failed Recipe transfer](https://www.reddit.com/r/skylightcalendar/comments/1hz71j1/)

The synthesis is therefore not “keep Plan” or “remove Plan.” It is:

> Keep Plan only for the job direct Grocery transfer cannot do: helping a
> household consider and converge on several Recipes together.

## Model A — Plan as required funnel

```text
Recipe → Plan → Groceries
```

Every Recipe must enter Plan before its ingredients can reach Groceries.

### Strengths

- One easily explained household flow.
- Every candidate can receive reactions before shopping.
- Batch ingredient compilation has a clear source set.

### Failures

- Adds ceremony when one person already knows what they want to make.
- Mistakes Grocery inclusion for a household commitment.
- Makes Plan infrastructure necessary for single-Recipe and solo workflows.
- Recreates the current mandatory-confirmation problem with softer language.

### Verdict

Reject as the universal workflow.

## Model B — Direct to Groceries only

```text
Recipe → Groceries
```

Remove Plan. Adding a Recipe immediately contributes its selected ingredients
to the active Grocery List.

### Strengths

- Fewest concepts and shortest ingredient-acquisition path.
- Excellent when the chooser has already decided.
- Recipe and Grocery ownership remain clear.

### Failures

- Groceries becomes polluted with undecided suggestions.
- Household reactions arrive too late, after list changes have been made.
- There is no calm place to hold “these look good” as a small current set.
- Removing an unwanted Recipe now requires Grocery reconciliation.

### Verdict

Useful as a route, insufficient as the whole system.

## Model C — Optional Plan, direct bypass

```text
                     ┌→ Plan ───────────────┐
Recipe / Recipe card ┤                       ├→ Groceries
                     └───────────────────────┘
```

Recipes can enter the current Plan for collective consideration. A decisive
user can instead add one Recipe's ingredients directly to Groceries. From Plan,
the household can send any selected subset to Groceries; unanimity, ranking,
and formal finalization are not required.

### Strengths

- Preserves the shared voting and shortlist value.
- Does not tax decisive or solo use.
- Grocery inclusion becomes an independent, visible state rather than a plan
  lifecycle milestone.
- Supports the meal-kit-like “small stack on the counter” feeling without
  requiring dates.

### Risks

- Two actions from a Recipe can feel ambiguous if they are presented with equal
  visual weight.
- Users need to see whether a Recipe is merely in Plan, already contributing to
  Groceries, or both.
- The system must protect Grocery edits when Recipe-derived contributions
  change.

### Interaction posture

- The familiar, prominent action remains **Add to Plan** while browsing and
  considering Recipes.
- **Add ingredients to Groceries** is available as a secondary direct action
  from a Recipe detail or overflow menu when the decision is already made.
- In the Plan drawer, selection is implicit for small sets and adjustable for
  larger ones; the action is **Add ingredients to Groceries**.
- Reactions inform the organizer but do not gate the action.
- A Recipe card can display compact, literal states such as **In Plan** and
  **In Groceries** without inventing “confirmed” terminology.

### Verdict

Recommend.

## Recommended primary navigation

Under Food, show two sibling primary destinations:

1. **Recipes**
2. **Groceries**

Do not show Plan as a third destination. Preserve the existing top-right Plan
affordance with its counter and icon inside Recipes. It opens the current
shared shortlist and is the natural place for reactions and batch transfer to
Groceries.

## Resulting object relationships

- A Recipe may be saved without being in Plan or Groceries.
- A Recipe may be in Plan without contributing to Groceries.
- A Recipe may contribute to Groceries without being in Plan.
- A Recipe may be both in Plan and contributing to Groceries.
- Removing a Recipe from Plan does not silently remove Grocery items.
- Removing Recipe-derived Grocery items does not remove the Recipe from Plan.
- Voting is attached to the Recipe's current Plan membership, not to the Recipe
  globally and not to the Grocery List.

## The smallest testable release

1. Rename the primary **Meals** destination and screen language to **Recipes**.
2. Add **Groceries** beside Recipes in the Food navigation group.
3. Make Groceries independently creatable through immediate manual capture.
4. Keep the top-right **Plan** affordance and editable Recipe list.
5. Replace finalization with **Add ingredients to Groceries** from Plan.
6. Offer the same direct action from Recipe detail as a secondary shortcut.
7. Show literal **In Plan** and **In Groceries** state where needed.

This release tests whether Plan earns its keep through collaboration while the
direct route reveals how often people prefer to bypass it.
