# Frame: Planned Meal Follow-Through

Status: design exploration; no implementation commitment.

## What the user said

> A user should be able to add a planned meal item to their calendar and pick a
> day, then get reminders if/when they need to get the groceries, and possibly
> even intelligently reschedule, or notify them to start cooking, and enter cook
> mode from a card on the planned to-do that accompanies it.

## Restated in user voice

When my household has decided to make a meal, help me carry that decision into
the few shopping and cooking moments that matter, so dinner happens without me
reconstructing the plan, managing duplicate reminders, or turning meals into a
rigid calendar project.

## Target audience

`audience-aspirational-family-organizers` — people who want ordinary family life
to feel more organized without learning or maintaining a productivity system.

## Representative persona

Maya is feeding a household on a variable cadence. She wants a few settled meals
to become a calm, executable plan without having to duplicate the same decision
across Meals, Groceries, a calendar, reminders, and recipe instructions.

- Current situation: A meal may be committed and optionally placed on a day,
  but shopping readiness, cooking time, and the execution surface are not yet
  carried through as one visible thread.
- What she is trying to do: Get the household fed with less repeated work and
  less last-minute uncertainty.
- Emotional tension: She wants dependable help, but would resent a meal system
  that creates overdue tasks, noisy alerts, or silently rearranges family time.
- What would make this feel wrong: A weekly grid, required exact times, one
  notification per ingredient or meal, AI moving commitments without consent,
  or a second canonical meal/calendar object.

## Hero anchor

`jtbd-move-the-few-things-that-matter` — the value is reliable household
follow-through, not calendar density or notification engagement.

## Job-flow step

The feature spans three weak transitions in
`job-flow-maya-feed-household-with-less-work`:

- Step 14, retailer handoff (score 2): the list can reach a buying surface, but
  real fulfillment and return-state proof remain incomplete.
- Step 15, prepare before cooking (score 1): there is no brief readiness state
  for equipment, preheating, prep, or missing ingredients.
- Step 16, cook one cue at a time (score 1): Cook Mode contracts exist, but the
  dependable session and physical-device experience remain incomplete.

It also advances step 19, begin again with less work (score 2), by proving that
an Activity can project current Food authority at the useful moment.

## Active anchors

- `jtbd-carry-intentions-into-action` — carry a settled meal across time,
  prompting, preparation, execution, and loop closure without constant upkeep.
- `jtbd-trust-this-app-with-my-life` — any reminder or rescheduling behavior
  must be explainable, bounded, reversible, and quiet.
- `jtbd-invite-the-right-people-in` — household awareness may be shared, but
  calendar, dietary, location, and reminder context must remain permissioned.

## serves snippet

```yaml
serves: [jtbd-carry-intentions-into-action, jtbd-trust-this-app-with-my-life, jtbd-invite-the-right-people-in]
```

## Friction we're addressing

A committed meal currently expresses household intent but does not yet carry a
complete execution thread. Maya must infer when groceries need attention,
remember when preparation should begin, and rediscover the correct recipe or
Cook Mode entry when it is time to act.

## System alignment

Constraint posture: `Extend the system`

### Current system facts

- **Existing surface:** Meal Planning already supports a committed meal as
  Flexible, a specific day/meal period, or bounded coverage; empty meal slots
  are intentionally absent.
- **Existing user flow:** The active Meal Plan is the continuity spine from
  meal choice to Groceries and Cook Mode. Activities may project cooking,
  shopping, or planning work but do not own the Meal Plan.
- **Existing domain model:** `MealPlanOccasion` owns meal timing intent and
  immutable recipe snapshots. `Activity` owns zero or more calendar sessions,
  reminders, and one opaque capability action-card binding.
- **Existing technical affordances:** Activity reminders support notification
  scheduling, snooze, and deep-linking. Meal Planning and Groceries already have
  Activity action-card providers. Recipe Cook Mode already has recipe-owned
  session/cue contracts.
- **Existing Grocery selection:** The Plan drawer already supports an
  organizer-only multi-select operation for `idea` meals. Selected candidates
  are sent to Groceries while unselected candidates remain in the Plan. The
  current two-stage interaction hides selection until after the user taps
  **Send to Groceries**, making an apparent consequence button behave like a
  mode switch.
- **Existing UX convention:** Use one progressive surface and one honest next
  action. Day placement is optional. Capability-owned state stays in its
  capability; Activities expose executable projections and navigation.

### Constraints to preserve

- Meal Planning owns the household's meal commitment and timing intent.
- Groceries owns shopping readiness, list state, and retailer handoff.
- Recipes owns readiness and Cook Mode state.
- Activities owns user-visible work, calendar sessions, reminder delivery, and
  Focus/execution affordances; completing an Activity cannot silently mutate a
  Meal Plan, Grocery List, or Cook Session.
- A calendar event is a projection of a commitment, not a second source of meal
  truth.
- Flexible meals remain valid and shop-ready without calendar placement.
- Grocery inclusion is the prerequisite for day placement. An `idea` cannot be
  placed; a `sent` or `ready` meal may remain Flexible or be placed on a day.
  Sending a meal never requires placement, and Grocery inclusion alone never
  creates a calendar event.
- Grocery compilation is candidate-scoped. Selected meals transition from
  `idea` to `sent`; unselected meals remain `idea`; later sends reconcile into
  the same current list without discarding checked items or manual corrections.
- Reminder permission is earned contextually and remains removable.
- External calendar writes and provider rescheduling are not atomic; partial
  success must remain visible and recoverable.

### Constraints we may challenge

- The current Activity action-card contract permits one provider binding. A
  cooking projection may need a richer Meal Planning projection that can
  summarize Grocery readiness while routing each action to its owning
  capability, without becoming a stack of cards.
- The current Activity reminder copy and notification actions are generic. A
  capability-safe `Start cooking` action may require typed notification intent
  rather than reusing `Start Focus` semantics.

### Design implication

Do not create a durable `ScheduledMeal` object. Extend a committed
`MealPlanOccasion` with a small execution policy, then derive one or two
Activities as replaceable projections: a cooking occurrence for the meal and,
only when useful, a shopping occurrence for the current Grocery List. Each card
resolves live capability state and routes to Groceries, readiness, or Cook Mode.

The Plan drawer should make Grocery scope explicit without a hidden selection
mode. Eligible `idea` rows show leading checkbox affordances whenever the
organizer opens the drawer. The stable bottom action is disabled with no
selection and reads **Send to Groceries**; after selection it reads
**Send N to Groceries**. Selected meals stay in the Plan as `sent`; unselected
meals stay as ideas. Existing `sent` and `ready` meals remain visible without
checkboxes. A successful send clears the transient selection and the lifecycle
movement supplies the receipt. Do not preselect every idea, add a separate
**Select all** control in the first release, or require a Cancel action for a
mode that no longer exists.

Day placement appears only on meals in `sent` or `ready`. This keeps the
calendar reserved for meals backed by the current execution cycle and prevents
the Ideas section from becoming a speculative schedule. Placement remains
optional and Meal Planning-owned even when the affordance is entered from a
Grocery receipt or projected into Plan.

## Aspirational design challenge

How might we help Maya carry one settled meal from household decision through
shopping readiness and cooking, while preserving optional timing, capability
ownership, calm reminders, and explicit control over calendar changes?

## Out of scope

- Replacing the household Meal Plan with a weekly calendar.
- Automatically choosing meals, finalizing a plan, or changing Grocery items.
- Silent calendar moves or automatic acceptance of a proposed reschedule.
- Per-ingredient reminders, pantry surveillance, nutrition scheduling, or a
  generalized background agent.
- Claiming that groceries were ordered or available without retailer evidence.

## Open question

Should the first learning release center on the **cooking commitment** (place a
meal, receive a start cue, enter Cook Mode) or prove the broader
**shopping-to-cooking workback** in one slice? The latter is more complete but
depends on truthful Grocery readiness and lead-time evidence.
