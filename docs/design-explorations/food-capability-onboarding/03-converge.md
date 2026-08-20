# Converge: The Guided Meal Loop

## Decision

Choose one lightweight, illustration-led Food onboarding journey:

```text
Make meals easier
  -> see how the meal loop works
  -> pick a meal or add one of your own
  -> optionally share and decide together
  -> turn chosen meals into a shared ingredient list
  -> cook with less juggling
  -> Browse recipes
```

The Food experience does not ask a second **What do you need right now?** question. Planning,
ingredients, household participation, and cooking are not competing entry modes; they are connected
parts of the promise the person just selected.

The current implementation gaps are committed delivery scope for this onboarding initiative. They
are not reasons to remove **Make meals easier** from the intended first-install chooser.

## Illustrated walkthrough

Use a two-moment, manually paced full-screen sequence with Back, Next, **Browse recipes**, and a
quiet way to choose another global path. Candidate copy is directional rather than final.

### 1. Find meals everyone can get behind

- Title: **Find meals everyone can get behind.**
- Body: **Pick from Kwilt or add your own. If you share a Household, everyone can add ideas and vote.**
- Illustration job: recognizable meal ideas with warm, bounded family contribution signals.

This teaches that a clean account is useful immediately and that personal Recipe capture remains
available. It does not require importing anything before the person can begin.

### 2. Plan it. Shop it. Cook it.

- Title: **Plan it. Shop it. Cook it.**
- Body: **Turn the meals you choose into one shared ingredient list, then keep your place while you cook.**
- Illustration job: one connected motion from Recipe to ingredient list to a calm cooking cue.

If no Household exists, the guide remains truthful because participation is conditional. The person
can plan alone and invite or add people later. Onboarding never creates an empty Household or blocks
the meal Plan on Household setup.

The illustration must not imply pantry knowledge, purchase, retailer checkout, voice control,
background listening, or automatic safety judgment. The owning Grocery and Cook surfaces retain
those detailed truths and contextual education.

## First native action

The walkthrough ends with **Browse recipes** and opens the existing Recipe library:

- a coachmark highlights one real Recipe card and invites the person to open it;
- **Add your own** remains available through the library's ordinary capture action;
- onboarding adds no second picker, catalog, or temporary selection mechanism; and
- later Plan, Household, Grocery, and Cook education occurs on the owning native surfaces.

### First value

Food onboarding reaches first value when the person deliberately keeps at least one real meal in a
durable Plan and lands on the native Plan surface. Completing the illustrated walkthrough or merely
opening Recipes is not first value.

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

## Illustration and interaction posture

- The sequence is fun, warm, and domestic rather than instructional or administrative.
- Each screen makes one useful claim with one coherent illustration.
- No autoplay, timer, gesture requirement, quiz, preference survey, or setup form.
- Reduce Motion preserves the same sequence and meaning.
- Progress appears only as a quiet two-step indicator if rendered testing shows it helps.
- Audit existing Food illustrations before deciding which new assets are necessary.

## Release consequence

**Make meals easier is committed scope for the new first-install experience.** The development
rehearsal and implementation plan must include it; it is not deferred merely because the current
Plan model is Household-gated.

Production release still waits until:

- the two illustrated moments are truthful and visually accepted;
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

We believe a short illustrated meal-loop walkthrough followed by contextual guidance in Recipes will help Maya
understand the entire Food promise without a questionnaire or another chooser. We will know this is
true when she can explain that Kwilt helps choose, decide together, build the list, and cook—and can
then begin by opening one real meal without Household setup or facilitator help.
