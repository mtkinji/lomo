# Converge: The Guided Meal Loop

## Decision

Choose one lightweight promise followed by a native, action-led Food journey:

```text
Make meals easier
  -> pick a real meal
  -> keep it in Plan
  -> optionally ask for feedback
  -> send it to Groceries
  -> see the real list come together
```

The Food experience does not ask a second **What do you need right now?** question. Planning,
ingredients, household participation, and cooking are not competing entry modes; they are connected
parts of the promise the person just selected.

The current implementation gaps are committed delivery scope for this onboarding initiative. They
are not reasons to remove **Make meals easier** from the intended first-install chooser.

## Native playthrough

Do not put a second slideshow between intent and value. The global **Make meals easier** value door
already makes the promise. Its primary action opens Recipes immediately and a resumable coachmark
relay teaches the loop on the surfaces that own each action.

### 1. Find a meal that fits

- Spotlight one real Recipe card: **Pick one that sounds good.**
- Opening the highlighted card advances the guide; ordinary Recipe browsing remains fully usable.

This teaches that a clean account is useful immediately and that personal Recipe capture remains
available. It does not require importing anything before the person can begin.

### 2. Keep the decision

- Spotlight **Add to Plan** on Recipe Home: **Keep it in Plan.**
- A real person-owned Plan is created or updated. Household setup is never a prerequisite.

### 3. Decide together, when useful

- Open the native Plan and spotlight **Share**: **Want a quick gut check?**
- The person can share a bounded guest-feedback link or choose **Not now**. No fake feedback or
  Household membership is created.

### 4. Make the list

- Spotlight **Send to Groceries**, then the selected meal and final send action.
- On a successful compile, navigate to the resulting list and spotlight its first real item:
  **One list, ready to finish.**

If no Household exists, the guide remains truthful because participation is conditional. The person
can plan alone and invite or add people later. Onboarding never creates an empty Household or blocks
the meal Plan on Household setup.

The illustration must not imply pantry knowledge, purchase, retailer checkout, voice control,
background listening, or automatic safety judgment. The owning Grocery and Cook surfaces retain
those detailed truths and contextual education.

## First native action

The playthrough starts in the existing Recipe library:

- coachmarks highlight real targets and never block unrelated navigation;
- **Add your own** remains available through the library's ordinary capture action;
- onboarding adds no second picker, catalog, or temporary selection mechanism; and
- later Plan, Household, Grocery, and Cook education occurs on the owning native surfaces.

### First value

Food onboarding reaches first value when the person deliberately keeps at least one real meal in a
durable Plan. The full playthrough completes when at least one real ingredient reaches Groceries.
Merely viewing coachmarks or opening Recipes is never completion.

The remaining walkthrough claims become progressive capability milestones:

- **Participation value:** an eligible household member or bounded guest can add an idea or respond,
  and the organizer sees the result.
- **Ingredient value:** chosen Recipes produce a reviewed Grocery list with provenance, and eligible
  participants can add ordinary items.
- **Cooking value:** a real Recipe starts or resumes Cook Mode at the correct cue.

These milestones do not keep global first install open, but they are release-readiness requirements
for the broad Food promise and must feel coherent when reached.

## Ownership and required domain correction

Household Food coordinates the walkthrough, Recipe-library handoff, and progressive education. It
does not own Food data.

- Meal Planning owns the durable Plan and meal participation.
- Recipes owns Recipe identity, personal capture, and Cook Mode.
- Groceries owns compiled ingredients, household additions, and list truth.

The current Plan implementation requires a Household. That is incompatible with the accepted
experience. Delivery must establish individual-first Plan ownership that can later gain bounded
Household participation without silently creating a Household, duplicating the Plan, or surprising
the person with a migration ceremony.

This is not a reason to narrow the onboarding promise. It is a domain gap the branch must solve.

## Household behavior

- If a Household already exists, the Plan can offer sharing after the person has selected meals.
- If no Household exists, the Plan remains complete for one person.
- The guide may explain participation before a Household exists because it uses explicit
  conditional language.
- Adding or inviting the first other person creates or attaches the appropriate Household context
  through the existing Household authority model.
- Household membership alone does not expose a Plan; Plan sharing remains explicit and bounded.
- Children and adults receive only the contribution and voting authority their Plan role permits.

## Ingredient-list behavior

- Recipe ingredients compile only from meals deliberately sent to Groceries.
- A person may send any useful subset; the entire Plan is not silently committed.
- Recipe-derived items retain source identity and scaled quantities.
- Household additions are visually and structurally distinct from Recipe contributions.
- Everyone with explicit list access can add or complete allowed items.
- `Already have`, purchased, ordered, and checked remain different states.
- Retailer setup is optional and occurs after the usable shared list exists.

## Cooking behavior

- Any planned Recipe can open Recipe Home and the touch-first readiness flow.
- Cook Mode starts a real session and restores exact Recipe/cue state after interruption.
- Cooking does not require the meal to have been shared or sent to Groceries.
- The onboarding walkthrough is not replayed when Cook Mode is reached later; one contextual
  first-use guide may reinforce controls if necessary.

## Exact-context bypasses

- A shared or imported Recipe opens its bounded Recipe path.
- A Plan invitation opens the Plan acceptance or participation path.
- A shared Grocery list opens the exact list with role and source boundaries intact.
- An interrupted Cook session resumes the correct cue.

Exact context skips the generic Food walkthrough unless one missing concept is necessary to safely
continue.

## Interaction posture

- One coachmark and one highlighted target appear at a time.
- Required steps advance only from a successful domain action; optional sharing has **Not now**.
- The guide persists its checkpoint, resumes on the owning surface, and can be dismissed without
  hiding Recipes, Plan, or Groceries.
- No autoplay, timer, quiz, preference survey, fake data, or setup form.
- Reduce Motion preserves the same sequence and meaning without attention pulses.

## Release consequence

**Make meals easier is committed scope for the new first-install experience.** The development
rehearsal and implementation plan must include it; it is not deferred merely because the current
Plan model is Household-gated.

Production release still waits until:

- every coachmark is anchored to a visible, actionable native control and visually accepted;
- a clean account can create a personal Plan without Household setup;
- existing-Household sharing, adding ideas, and voting work through bounded authority;
- chosen Recipes produce a shared, editable Grocery list;
- Cook Mode fulfills the touch-first resumption promise;
- interruption and exact-context bypasses are coherent; and
- required source, Simulator, backend, signed-device, TestFlight, and production gates are stated
  and satisfied at the appropriate lifecycle.

The readiness gate governs when the completed path ships. It does not remove the path from the
branch's delivery scope.

## Stated bet

We believe reaching a real Recipe within one tap of choosing the Food path, then learning through
the actions themselves, will help Maya understand and complete the loop faster than a narrated
walkthrough. We will know this is true when she can choose, keep, optionally share, and compile one
real meal without Household setup or facilitator help.
