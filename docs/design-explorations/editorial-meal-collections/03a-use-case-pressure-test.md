# Use-Case Pressure Test: Editorial Meal Collections

## Strongest demand revealed

The meal-kit comparison reveals a sharper job than recipe discovery:

> When my own search habits keep returning the same safe meals, give me a small
> set of delicious possibilities I would not have chosen alone, show me why they
> are achievable, and remove enough planning and shopping risk that trying one
> feels easy.

This is not the same as personalization. The value comes from trusted editorial
judgment, bounded novelty, and execution confidence. “Picked for me” can be
useful without pretending Kwilt knows the user's hidden taste.

## Use-case fit

| Use case | Current concept fit | Gap |
| --- | --- | --- |
| Delicious food I can believe I can make | Partial | Collection pages have narrative, but no explicit appetite-plus-attainability contract. |
| Get out of the rotation safely | Partial | Cuisine and theme tags do not distinguish familiar anchors from adjacent discoveries. |
| Let someone else narrow the universe | Strong | Authored Collections and editions already provide bounded judgment. |
| Choose some, not all | Weak | The converged design offers meal-card actions and full-template adoption, but does not define a temporary choose-some session. |
| Adopt the complete plan | Strong | `MealPlanTemplate` and copy-on-adoption handle this well. |
| Make the plan work as one basket | Strong in model | Basket rationale exists, but template entries do not express their role or useful alternatives. |
| Know what I am committing to | Partial | Recipe facts exist, but Collection entries need a concise “why try / why doable” presentation. |
| Learn whether the editorial pick was actually good | Partial | The learning funnel stops at adoption/finalization and does not connect the eventual cook outcome back to editorial quality. |

## System improvements

### 1. Add two adoption modes

Every Collection may expose:

- **Choose meals** — a temporary, reversible selection from the Collection.
  Selection survives opening a meal and returning, but it does not create or
  mutate a Meal Plan until `Review selected meals`.
- **Review the plan** — an optional complete `MealPlanTemplate` for users who
  want Kwilt to make the first complete proposal.

A Collection can support either or both. Neither requires the other.

The choose-some state is presentation state, not a new durable domain object.
Once reviewed, selected meals cross the existing versioned Recipe-snapshot
boundary into Meal Planning.

### 2. Make Collection membership editorial, not just referential

Each `CollectionMealEntry` wraps one versioned Recipe reference with:

- `discoveryRole`: `familiar_anchor | adjacent_discovery | stretch`;
- `whyTry`: one appetite- or experience-led sentence;
- `whyDoable`: one honest sentence grounded in Recipe facts;
- optional `firstTimeNotes`: unusual ingredient, equipment, or technique callout;
- section position and editorial rationale.

Do not expose a composite difficulty score. Derive time, equipment, ingredient,
and technique facts from the Recipe and let the editor explain the meaningful
reason this version is approachable.

### 3. Let plan templates express coherence and substitution

Replace a flat ordered recipe list with `MealPlanTemplateSlot` records:

- default Recipe reference;
- zero or more reviewed alternatives;
- plan role such as quick anchor, longer cook, ingredient bridge, or leftovers
  use;
- reason this slot belongs in the plan;
- optional prep/leftover relationship to another slot.

The role is editorial metadata, not a household commitment. During review the
user can swap or remove a slot and see which basket benefit may change.

### 4. Publish for a user job, not only a theme

Collections and edition placements declare one primary `jobIntent`:

- `inspire_achievable`;
- `escape_rotation`;
- `explore_cuisine`;
- `plan_budget`;
- `reduce_effort`;
- `use_what_you_have`;
- `learn_a_technique`;
- `prepare_next_cycle`.

An edition should normally pair different intents—for example, achievable
discovery plus a low-cost prepared plan—rather than merely pairing two visual
themes.

### 5. Raise the editorial quality gate

A Collection that promises deliciousness and achievability cannot rely only on
a roster name or desk review. Publication requires:

- accurate, rights-cleared media representing the actual Recipe;
- reviewed time, yield, equipment, and unusual-ingredient facts;
- cultural sourcing for cuisine-led framing;
- at least `cooked-once` evidence for any Recipe receiving a strong Kwilt
  recommendation in a learning release;
- a feedback path from completed Cook Sessions to editorial review.

`Repeat-validated` may later become the bar for durable flagship placement, but
it should not block an intentionally labeled learning release.

### 6. Close the learning loop at the meal

Add privacy-conscious outcome signals:

- selected from Collection;
- removed before plan review;
- swapped from a template slot;
- finalized;
- cooked;
- explicit `make again`, `not for us`, or short private correction.

Do not infer enjoyment from dwell time or completion alone. Aggregate outcomes
can improve editorial review; household-specific reuse may use only explicit,
inspectable signals.

## Revised Collection experience

1. The offer promises one job, such as **Something new you can actually make**.
2. The page establishes a bounded editorial point of view.
3. Each meal answers `Why try it?` and `Why is it doable?` through imagery,
   concise framing, and grounded facts.
4. The user taps meals into a persistent Collection selection tray.
5. The tray offers `Review selected meals`; the page may separately offer a
   complete prepared plan.
6. Review resolves servings, explicit constraints, and any existing-draft
   conflict.
7. Adoption creates a household-owned draft; family input remains optional.
8. Finalization unlocks Groceries; cooking outcome later informs explicit reuse
   and editorial review.

## Reductive check

- Do not create a saved-Collection object to preserve temporary selection.
- Do not add a novelty or difficulty dashboard.
- Do not require a full-template adoption before choosing individual meals.
- Do not personalize the first editions; prove trusted human curation first.
- Do not claim meal-kit equivalence where Kwilt cannot portion or deliver
  ingredients.

## Revised bet

We're betting that the strongest value is not the editorial page alone. It is
the combination of trusted narrowing, appetite, believable execution, and a
short path into the household's plan. If users admire the pages but do not
select meals, the first thing to improve is makeability evidence and selection
flow—not card frequency or personalization.
