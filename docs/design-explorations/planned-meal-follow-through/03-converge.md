# Converge: Planned Meal Follow-Through

## Decision

Choose a hybrid of **Progressive Sent Rows** and a **post-send placement
invitation**:

- The Plan drawer is the permanent authority surface.
- Ideas always expose direct Grocery selection.
- Successful sending moves selected meals into **Sent to groceries**.
- A quiet receipt offers **Place meals** while the consequence is fresh.
- Sent and Ready rows permanently expose **Flexible** or their placed day.
- Day placement records household intent; it does not silently create an exact
  calendar event.
- A placed meal may separately add a cooking time through Plan, which creates
  the Activity and managed calendar session.
- Prepared placement or rescheduling proposals are deferred until the manual
  operation is trustworthy.

## Qualitative score

| Alternative | Maya fit | System fit | Clarity | Blast radius | Trust risk | Verdict |
| --- | --- | --- | --- | --- | --- | --- |
| Progressive Sent rows | High | High | High | Medium | Low | Canonical surface |
| Post-send placement receipt | High at transition | High if transient | High | Low-medium | Low | Activation layer |
| Pull meals onto Plan calendar | Medium | Medium | High for exact time | High | Medium | Secondary exact-time path |
| Prepared proposals | Potentially high later | Medium-low now | Medium | High | High | Defer |

The hybrid is not two competing placement models. The receipt and permanent row
both invoke one Meal Planning-owned timing operation. Plan is used only when the
user chooses an exact cooking time.

## Capability delta

### Today Maya cannot

- See before acting that **Send to Groceries** applies only to selected meals.
- Keep unselected Ideas while committing a subset to the current Grocery cycle.
- Place only Grocery-committed meals on a household day.
- Preserve a clear difference between **Tuesday dinner** and a managed calendar
  block with an exact start/end.
- Open a scheduled cooking Activity and receive the next Food-owned action.

### After this concept ships Maya can

- Select any useful subset of Ideas and send only those meals to Groceries.
- Leave the rest as durable, unscheduled Ideas.
- Keep a sent meal Flexible or place it on a day and meal period.
- Add an exact cooking time only when calendar protection is useful.
- Open the resulting Activity card to review the next unresolved dependency or
  enter Cook Mode.

### Still intentionally unsupported

- Placing an Idea before Grocery commitment.
- Automatically placing every sent meal.
- Inventing an exact start time from **Dinner** without review.
- Silent calendar moves, automatic replanning, or autonomous Grocery changes.
- Treating Flexible or unplaced meals as late, overdue, or incomplete.
- Multiple reminder policies, per-ingredient alerts, or a Food dashboard.

## The user experience

### 1. Select the Grocery subset directly

Organizer-visible Idea rows always show a leading checkbox. No rows are
preselected. The stable footer reads **Send to Groceries** and is disabled at
zero selections; with selections it reads **Send N to Groceries**.

The footer never enters a mode. It always performs the consequence it names.
Sending failure preserves selection for retry.

### 2. Receive a visible lifecycle receipt

On success, the selected rows move from **Ideas** to **Sent to groceries**. That
movement is the durable receipt. A small transient invitation appears:

> **3 meals sent**  ·  Place meals

**Place meals** is secondary and dismissible. The default outcome is that all
newly sent meals remain Flexible. There is no required next step.

### 3. Place only sent or ready meals

The placement page remains inside the same progressive Plan drawer. It shows
only the newly sent meals, each with a timing value:

- **Flexible**
- **Choose a day** → day plus Breakfast / Lunch / Dinner / Snack

The meal period is visible and adjustable; Dinner may be the initial visible
choice for dinner-oriented content, but it must never be written as a hidden
assumption. **Done** returns to the Plan. Existing Sent and Ready rows expose the
same timing value for later edits.

### 4. Distinguish placement from calendar protection

**Tuesday · Dinner** is Meal Planning-owned household intent. It can exist
without calendar access and should appear in the settled household Plan.

An exact calendar event requires a separate **Add cooking time** action. It opens
the existing Plan slot interaction with the selected day and a recipe-derived
duration as an editable suggestion when trustworthy. The user chooses the exact
start/end and commits the block. Only then does Kwilt create:

- one `Cook <meal>` Activity;
- one Meal Planning action-card binding to the stable meal occurrence;
- one managed Activity schedule session and external calendar binding.

If no calendar is connected, day placement still works and Cook Mode remains
reachable from the meal row.

### 5. Let the Activity card show one next action

The cooking Activity resolves live capability state. It does not copy Grocery
or Cook Session truth into Activity fields.

| Live state | Card title/detail | Primary action |
| --- | --- | --- |
| Grocery review remains | Ingredients still need attention | Review groceries |
| Grocery list ready, before cooking | Ready for Tuesday dinner | Get ready |
| Ready and cooking can begin | Chicken tacos | Start cooking |
| Cook Session active | Step 3 of 7 | Resume cooking |
| Meal made | Made | None; Activity resolves completed |
| Meal removed or inaccessible | Meal is no longer available | None; recovery/back link only |

Only one row in this table may be prominent at a time. **Get ready** may remain
thin or be omitted from the first learning release if Recipe readiness is not
yet truthful enough.

## Ownership and state contract

### Meal Planning owns

- candidate lifecycle: `idea`, `sent`, `ready`, `made`, or removed;
- whether the candidate is eligible for placement;
- `Flexible` versus day/meal-period placement;
- the stable relationship to an optional cooking Activity;
- versioned operations and receipts for placement, clearing placement, and
  reconciling lifecycle changes.

### Groceries owns

- candidate-scoped ingredient contributions;
- review-needed, ready, purchased, already-have, and stale states;
- whether removing a meal may safely unwind its unpurchased contributions;
- retailer handoff truth.

### Activities / Plan owns

- the executable `Cook <meal>` to-do;
- exact start/end, external calendar binding, move, unschedule, retry, and
  notification delivery;
- the fact that the to-do was completed, skipped, or cancelled.

Activity completion does not itself mark the Meal Planning occurrence Made.
Cook Mode completion may produce a reviewed capability receipt that then
resolves the Activity.

### Recipes owns

- immutable recipe version and duration evidence;
- readiness and Cook Session state;
- Cook Mode navigation and the optional cook record.

## Domain shape

Do not add `ScheduledMeal`. Extend the existing candidate/occasion relationship
and projection contracts.

Conceptually:

```ts
type MealExecutionTiming =
  | { kind: 'flexible' }
  | { kind: 'occasion'; date: LocalDate; mealPeriod: MealPeriod };

type MealExecutionProjection = {
  candidateId: string;
  lifecycle: 'sent' | 'ready' | 'made';
  timing: MealExecutionTiming;
  cookingActivityId: string | null;
  groceryState: 'review_needed' | 'ready' | 'stale' | 'unavailable';
  cookState: 'not_started' | 'active' | 'finished' | 'unavailable';
  sourceVersion: string;
};
```

`groceryState` and `cookState` are read projections, not Meal Planning-owned
copies. The Activity binding should use a stable meal occurrence/candidate
reference and a projection kind such as `meal_execution`.

## Mutation and recovery rules

- **Send:** candidate-scoped, idempotent, version-checked; later sends reconcile
  into the current list and preserve checked items/manual corrections.
- **Place:** allowed only for `sent` or `ready`; version-checked and idempotent.
- **Clear placement:** returns to Flexible; if an exact cooking session exists,
  ask whether to unschedule it rather than silently orphaning the block.
- **Move day:** update Meal Planning timing first; if a managed calendar session
  exists, present the corresponding session move for confirmation.
- **Remove sent meal:** explicitly state that placement and cooking Activity will
  be removed/cancelled; preserve purchased or already-have Grocery evidence and
  offer the existing keep-versus-unwind Grocery choice where applicable.
- **Partial calendar failure:** preserve the Meal Planning day placement and
  Activity; show **Not added to calendar · Retry**.
- **Offline:** preserve local selection/placement draft, but do not claim sent,
  placed, or scheduled until the authoritative receipt is available.

## Reductive UI contract

- Job: When Maya has a living list of meal ideas, she needs to commit only the
  meals this Grocery cycle should support, then optionally place the few whose
  timing matters.
- Three-second read: which meals are Ideas, which are Sent/Ready, and whether any
  Ideas are selected for Groceries.
- Primary action: **Send N to Groceries** when at least one Idea is selected.
- Primary information: meal identity, lifecycle group, selection, and timing for
  Sent/Ready meals.
- Secondary information: reactions, missing-item count, contributor context,
  and the transient **Place meals** invitation.
- Reveal later: day/meal-period picker, exact calendar time, readiness details,
  removal consequences, and rescheduling proposals.
- Scan order: lifecycle group → meal rows/state → enabled consequence action.
- Must not add: selection mode, Select all, weekly grid, empty slots, permanent
  setup, required placement, exact-time defaults, multiple cards, or AI status.

## Activation

The best teaching moment is the successful Grocery send. The lifecycle move
proves what happened; **Place meals** then names the optional next decision.

No onboarding explanation is necessary. The permanent Sent-row timing value
makes the feature rediscoverable after the transient invitation disappears.

Natural adoption means Maya sends a real subset, leaves at least one Idea
behind, places at least one sent meal, and later reaches Cook Mode without
reconstructing the recipe path.

## Accepted trade-offs

- The first path favors day/meal-period placement over dense calendar planning.
- Exact calendar time is one deeper optional action.
- Flexible remains the default even after Grocery commitment.
- The Activity card may initially jump directly to **Start cooking**, deferring
  a richer readiness step.

## Rejected trade-offs

- Do not expose placement on Ideas for convenience.
- Do not preselect all meals to avoid a disabled footer.
- Do not combine Grocery commitment and scheduling into one confirmation.
- Do not turn Groceries into the owner of meal timing.
- Do not use Activity `scheduledDate` as a disguised meal day or due date.
- Do not invent a default external-calendar start time from a meal period.
- Do not start with intelligent placement or rescheduling proposals.

## Bet

We are betting that Grocery commitment is the moment a meal becomes concrete
enough to place, and that a visible post-send invitation plus permanent Sent-row
timing will make optional placement understandable without a calendar-first
workflow. If users routinely dismiss the invitation but later hunt for timing,
we will strengthen the Sent-row affordance; if they need calendar comparison
before choosing days, we will promote the Plan calendar path without changing
the underlying timing operation.

## Success signal

Across real meal cycles, Maya can correctly predict which meals will enter
Groceries, intentionally leave Ideas behind, place only committed meals, and
reach the right cooking action from a managed Activity. No user mistakes
**Dinner** for an exact calendar time, and no placement, Grocery contribution,
Activity, or calendar block becomes orphaned after move/removal/retry flows.
