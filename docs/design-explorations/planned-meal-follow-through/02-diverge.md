# Diverge: Planned Meal Follow-Through

## Fixed lifecycle

All alternatives honor the user-owned sequence:

```text
Idea
  -> explicitly selected
Sent to Groceries
  -> Flexible, or optionally placed on a day
Ready to cook
  -> Start / resume Cook Mode
Made or removed
```

An Idea cannot be placed on a day. Grocery inclusion is necessary but not
sufficient for calendar placement: sending does not silently schedule.

## Axis of variation

Where should optional day placement become available after Grocery commitment?

- inside the Plan drawer, attached to each sent meal;
- in the immediate post-send receipt, while the consequence is fresh; or
- from the Plan calendar, where time is manipulated directly.

## Alternative A: Sent-Meal Rows Become Progressive

After Maya sends selected meals, they move into **Sent to groceries**. Each sent
row gains a quiet timing line: **Flexible** or an existing placement such as
**Tuesday · Dinner**. Tapping that line opens a compact day/meal-period picker.
Confirming placement creates or updates the Meal Planning occasion, then derives
one cooking Activity and calendar session. The row continues to show Grocery
readiness; its Activity card later exposes the one useful action.

- Audience/persona fit: high. Maya can make the next decision from the meal she
  just committed without learning a separate scheduling workflow.
- Design-challenge answer: preserves one continuous Meal Plan surface while
  making execution timing available only after Grocery commitment.
- System fit: high. Meal Planning already owns timing intent, lifecycle groups,
  and recipe snapshots; Activities and Plan receive projections.
- Smallest system extension: candidate-scoped placement persistence for `sent`
  and `ready`, plus idempotent cooking-Activity projection/reconciliation.
- Best when: only a few meals need exact placement and most can stay Flexible.
- Fails when: the user needs to compare several meals against a dense calendar
  before choosing days.
- Four-object/capture-first check: pass. Activity remains the day-level unit;
  Ideas stay durable without forced placement.
- Anti-pattern check: pass. No grid, required cadence, AI automation, dashboard,
  or default notification.

## Alternative B: Send Receipt Offers “Place Any Meals”

Sending produces an inline receipt: **3 meals sent to Groceries** with a
secondary **Place meals** action. Opening it shows only those newly sent meals
in a compact progressive drawer. Each begins Flexible; Maya may assign days and
meal periods, then finish. Existing sent meals can be edited later from their
Plan rows. The receipt is the activation moment, not a permanent second home.

- Audience/persona fit: high at first use. The transition from shopping
  commitment to timing is explicit and teachable.
- Design-challenge answer: turns successful Grocery scope into a clear optional
  next decision without showing timing controls on Ideas.
- System fit: medium-high. The receipt launches a Meal Planning-owned operation;
  Groceries does not own placement even though its successful handoff activates
  the offer.
- Smallest system extension: a send receipt carrying exact candidate ids and a
  transient placement drawer backed by the same timing operation as later row
  edits.
- Best when: placement commonly happens immediately after the meal subset is
  chosen.
- Fails when: Maya usually wants to review or correct the Grocery list before
  deciding days; the receipt becomes an extra step she repeatedly dismisses.
- Four-object/capture-first check: pass if **Done for now** is immediate and
  Flexible remains first-class.
- Anti-pattern check: pass with a guardrail. Do not turn the receipt into a
  wizard, checklist, or permanent progress stepper.

## Alternative C: Pull Sent Meals Onto the Plan Calendar

After at least one meal is sent, Plan exposes sent-but-unplaced meals as a small
eligible inventory. Maya taps or drags a meal into open calendar space, adjusts
the block, and commits it using the existing Plan slot interaction. The commit
updates Meal Planning timing intent and creates the Activity/calendar binding as
one coordinated operation. The Plan drawer still shows **Flexible** or the
placed day, but it does not provide the primary placement editor.

- Audience/persona fit: medium. It is excellent when Maya thinks spatially in a
  calendar, but requires leaving the Food context and understanding Plan.
- Design-challenge answer: gives dense-calendar comparison and direct time
  manipulation the strongest treatment.
- System fit: medium. It reuses Plan slot capture and Activity calendar writes,
  but needs Plan to consume a capability-owned eligible-meal projection and
  coordinate a cross-capability commit.
- Smallest system extension: a Meal Planning execution-target adapter for Plan,
  plus an idempotent transaction/recovery contract spanning occasion timing,
  Activity creation, and external calendar binding.
- Best when: exact start times and calendar conflicts matter more than quick day
  assignment.
- Fails when: the household only wants **Tuesday dinner**, not another scheduled
  time block, or when calendar connection is unavailable.
- Four-object/capture-first check: pass only if the created Activity is the
  calendar unit and the meal remains valid without a calendar connection.
- Anti-pattern check: pass with a guardrail. Never require calendar setup to send
  meals or cook them; never treat unplaced meals as overdue.

## Alternative D: Prepared Placement Proposals

After Grocery commitment, Kwilt may prepare one or more day suggestions from
the Meal Plan horizon, recipe duration, existing calendar availability, and
Grocery readiness. The Plan drawer shows a bounded proposal such as **Tacos may
fit Thursday · Review**. Nothing moves until Maya reviews and accepts. Accepted
placement uses the same Meal Planning and Activity operations as manual
placement.

- Audience/persona fit: potentially high once trust is earned; low for a first
  release because the explanation and evidence burden is substantial.
- Design-challenge answer: reduces manual calendar comparison while preserving
  organizer authority.
- System fit: medium-low initially. It requires current availability, duration,
  Grocery readiness, proposal persistence, explanations, expiry, and recovery.
- Smallest system extension: typed placement proposal with evidence/version
  pins; no direct mutation permission.
- Best when: several committed meals compete with a genuinely constrained week.
- Fails when: recipe time, Grocery readiness, or calendar availability is stale
  or incomplete; suggestions would feel arbitrary.
- Four-object/capture-first check: pass if proposals remain optional and only
  accepted proposals create/update Activities.
- Anti-pattern check: pass only with explicit review. Silent rescheduling,
  anthropomorphic narration, urgency, or opaque “best time” claims fail.

## Cross-alternative conclusions

- The authoritative timing operation should be shared even if it has several
  entry points. Plan drawer, receipt, and calendar must not implement different
  placement semantics.
- A date/meal-period placement and an exact calendar session are distinct. The
  former can exist without calendar permission; the latter is an optional
  Activity projection.
- The cooking card should resolve live state rather than snapshotting Grocery
  readiness or Cook Session progress onto the Activity.
- Removing a sent meal from the Plan must state what happens to already-reviewed
  Grocery contributions, placement, Activity, reminder, and calendar binding;
  no alternative may silently orphan them.
- Prepared proposals are a later layer over a trustworthy manual operation, not
  the foundation.
