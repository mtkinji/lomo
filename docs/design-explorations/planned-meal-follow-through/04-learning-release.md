# Learning Release: Planned Meal Follow-Through

## Concept To Build

Let Maya send a chosen subset of Plan Ideas into the current Grocery cycle,
optionally place only those committed meals on household days, and enter Cook
Mode from a meal-linked cooking Activity when she chooses an exact cooking time.

## Capability Delta

### Today, the user cannot

- Understand before tapping that Grocery sending applies to a chosen subset.
- Leave some meals as Ideas while sending others without entering a hidden
  selection mode.
- Place only Grocery-committed meals and preserve that placement independently
  of calendar connection.
- Create one managed cooking Activity from a placed meal and reach the current
  Cook Mode action from its card.

### After this release, the user can

- Select one or many Ideas directly and send exactly those meals to Groceries.
- See selected meals move to **Sent to groceries** while unselected Ideas remain.
- Accept or dismiss a small **Place meals** invitation.
- Keep sent/ready meals Flexible or choose a day and meal period.
- Reopen and edit placement from the sent/ready meal row.
- Choose **Add cooking time**, review an exact time in Plan, and create one
  managed `Cook <meal>` Activity.
- Open that Activity and start or resume the recipe's Cook Mode.

### Still intentionally not supported

- Placement for Ideas.
- Automatic placement, calendar writing, shopping reminders, cooking reminders,
  or rescheduling proposals.
- Recipe-readiness claims when equipment/prep evidence is incomplete.
- Per-ingredient alerts, background agent behavior, or retailer fulfillment
  claims.
- Automatic Meal Plan completion from Activity completion.

## User Experience

### Select and send

The organizer opens the existing Plan drawer. Idea rows display leading
checkboxes immediately. The bottom action remains stable:

- zero selected: disabled **Send to Groceries**;
- one selected: **Send 1 to Groceries**;
- many selected: **Send N to Groceries**.

No meal is preselected. The footer never enters another mode.

On successful server receipt, selected rows move into **Sent to groceries** and
the selection clears. Unselected Ideas remain. A failure preserves the selected
rows and offers a retry without claiming that Groceries changed.

### Place after sending

The lifecycle movement is followed by a small dismissible invitation:

> **N meals sent** · Place meals

Tapping **Place meals** keeps the user inside the progressive Plan drawer and
shows only the newly sent meals. Every meal starts Flexible. The organizer may
choose a day and an explicit meal period, then tap **Done**. Dismissing the
invitation leaves every meal Flexible and loses no work.

Sent and Ready rows retain a quiet **Flexible** or **Tue · Dinner** value so the
same timing operation is discoverable later.

### Add exact cooking time

A placed row may expose **Add cooking time**. This is deliberately separate from
day placement. It opens the existing Plan slot flow on the chosen day. If the
recipe has trustworthy prep/cook duration, that duration may seed an editable
block; otherwise the user chooses the duration. The user selects the exact time
and commits.

Successful commit creates one Activity and one managed calendar session. If the
external calendar write fails, the household placement and Activity remain and
show **Not added to calendar · Retry**.

### Cook from the Activity

The Activity detail hosts one Meal Planning-owned execution card. For the
learning release it supports only:

- **Start cooking** when no Cook Session exists;
- **Resume cooking** when a Cook Session is active;
- completed/unavailable presentation when the meal is made, removed, or no
  longer accessible.

The card routes into the existing Recipe Cook Mode for the immutable recipe
snapshot. It does not duplicate directions, ingredients, Grocery state, or Cook
Session progress into Activity storage.

## Existing Product Relationship

### Enhances

- the existing Plan drawer and its `idea` / `sent` / `ready` lifecycle groups;
- candidate-scoped Grocery compilation and reconciliation;
- Meal Planning timing contracts and immutable recipe snapshots;
- Plan's existing exact-slot and managed calendar-session behavior;
- the existing Activity action-card registry; and
- Recipe Cook Mode and Cook Session contracts.

### Replaces

- the current two-tap hidden selection mode behind **Send to Groceries**;
- the implication that **Send to Groceries** applies to every visible Plan item;
  and
- any temptation to store a meal's household day as an Activity due date.

### Leaves unchanged

- Ideas, reactions, contributor authority, and household sharing;
- Grocery list review, Already have, manual items, product matching, and retailer
  handoff;
- Recipe ownership and immutable version provenance;
- Flexible sent meals;
- existing generic Activity creation and calendar operations; and
- Cook Mode behavior beyond the new entry path.

## Buildable Slice

### Must be real

#### Selection and Grocery handoff

- Always-visible organizer-only checkboxes on eligible Idea rows.
- Stable disabled/enabled/count footer states with screen-reader selection
  semantics.
- Candidate-scoped send request using expected version/idempotency.
- Success receipt that identifies exactly which candidates transitioned.
- Selection preserved on error and cleared on confirmed success.
- Later sends reconcile into the same active Grocery list without losing manual
  additions, checked states, or reviewed corrections.
- Concurrent/stale-version recovery with an authoritative reload and no false
  success.

#### Placement

- Server-enforced eligibility: only `sent` or `ready` candidates may be placed.
- Stable timing contract for Flexible or exact local day plus meal period.
- One Meal Planning-owned placement operation used by post-send and permanent
  row entry points.
- Placement, change, and clear receipts with optimistic concurrency and
  idempotent replay.
- Sent/Ready lifecycle projection includes the authoritative timing value.
- Ideas never render placement affordances.

#### Activity and calendar projection

- Explicit **Add cooking time** path from a placed sent/ready meal.
- Exact-time review through existing Plan slot behavior.
- One idempotently created/reused `Cook <meal>` Activity per stable meal
  occurrence.
- Meal Planning `meal_execution` action-card binding with a stable resource
  reference and source version.
- One managed schedule session/calendar binding created only after exact-time
  commit.
- Partial calendar-write receipt and retry without discarding placement or
  duplicating the Activity.
- Move, unschedule, placement-clear, meal-remove, and retry behavior cannot
  orphan or duplicate the projection.

#### Cook handoff

- Viewer-authorized resolver for recipe snapshot and Cook Session state.
- Action card selects exactly one of Start, Resume, completed, unavailable, or
  failed/retry presentation.
- Start/Resume routes to the existing Cook Mode with exact recipe-version
  identity.
- Capability removal or access loss degrades without crashing Activity detail.

#### Verification and proof

- Pure/domain tests are regression-first for selection eligibility, lifecycle
  transitions, placement rules, idempotency, projection reconciliation, and
  removal/move recovery.
- Supabase tests prove organizer authority, lifecycle gating, version conflicts,
  idempotency, and unrelated-household denial.
- Component tests cover zero/one/many selection, error preservation, post-send
  receipt, Flexible/placed rows, and accessibility states.
- Real iPhone Simulator path proves Plan → selected send → rows move → placement
  persists → exact time → Activity card → Cook Mode.
- Calendar-connected proof distinguishes source behavior, managed calendar
  binding, and external provider write success.

### Can be thin or temporary

- Use the existing compact day/meal-period picker grammar rather than designing
  a calendar grid.
- Limit placement to one dish/candidate per occurrence; coverage commitments and
  multi-dish occasions can remain readable but not editable through this slice.
- Support exact cooking time from a sent/ready row rather than implementing drag
  from a dedicated meal inventory onto Plan.
- Use existing recipe duration when present; otherwise require manual duration.
- Card may offer only **Start cooking** and **Resume cooking**; defer a separate
  readiness screen.
- Keep reminders completely off even though Activity infrastructure supports
  them.
- Gate the Activity/calendar/Cook handoff behind a local or internal learning
  flag while the simpler Grocery-selection correction remains independently
  reviewable.

### Intentionally excluded

- Auto-select, Select all, selection mode, or a required Cancel action.
- Placement on Ideas, required placement, weekly grids, empty meal slots, or
  recurring meal rules.
- Automatic exact-time inference from Dinner/Lunch/Breakfast/Snack.
- Shopping-reminder lead-time calculation.
- Start-cooking notification scheduling or notification action categories.
- AI placement, conflict optimization, autonomous rescheduling, or automatic
  calendar mutation.
- New Food dashboard, progress stepper, or Activity/Grocery state copies.
- Automatic “Made” from Activity completion or automatic Activity completion
  merely because Cook Mode opened.

## Required States

- zero, one, and many Ideas;
- organizer versus non-organizer drawer;
- zero, one, and many selected Ideas;
- send pending, success, stale version, offline, and server failure;
- partial send prohibited: one authoritative candidate set succeeds or fails;
- selected rows transition while unselected Ideas remain;
- all newly sent meals Flexible;
- post-send invitation shown, dismissed, and reopened through permanent rows;
- sent/ready Flexible and placed states;
- placement pending, success, stale version, offline, and validation failure;
- Idea placement rejected at UI and server boundaries;
- exact-time path with and without trusted recipe duration;
- no calendar connection;
- external calendar write success, partial failure, retry, move, and unschedule;
- Activity projection replay without duplication;
- Start Cook Mode, Resume Cook Mode, made, removed, unauthorized, unavailable,
  and resolver failure;
- app relaunch restores authoritative lifecycle, placement, Activity binding,
  schedule session, and Cook Session state.

## Release Channel

Use a staged **local build → production-hidden authority → TestFlight** path.

1. **Local build:** develop and visually validate selection, placement, exact
   time, Activity card, and Cook Mode routing against a controlled account.
2. **Production-hidden:** deploy additive database/RPC authority and security
   rules that existing released clients cannot reach. Prove exact schema,
   household denial, idempotency, and reconciliation against the intended
   project.
3. **TestFlight:** dogfood real notification permission boundaries, calendar
   provider writes, app relaunch, Cook Mode navigation, and ordinary meal cycles
   only after local/source/backend gates pass.

The first app learning flag should cover placement plus Activity projection. The
direct selection correction may ship with the same release only after the full
drawer remains visually calm; it does not require intelligent features to earn
its place.

## Brand-Goodwill Guardrails

- Nothing is called sent, placed, or scheduled before the authoritative receipt.
- Nothing is called ready, purchased, ordered, or available without the owning
  capability's evidence.
- Flexible is a valid state, not unfinished work.
- No notification permission prompt is added in this release.
- No calendar connection is required to place or cook a meal.
- Exact external-calendar mutation remains explicit and recoverable.
- Removing or moving a meal names downstream consequences before mutation.
- The UI has one prominent action at a time and does not expose internal
  lifecycle vocabulary as setup language.
- Existing dirty work in the Meals branch is preserved; implementation must
  reread affected files and isolate exact changed paths before verification or
  staging.

## Reversibility

- Add placement/projection fields and RPCs without deleting current candidate,
  Grocery, Activity, calendar, or Cook Session records.
- Keep Grocery compilation dependent on candidate identity, not placement.
- Feature-gate new placement and Activity entry points; hidden data remains
  harmless if UI is rolled back.
- Use a stable Activity origin/binding so duplicate projections can be detected
  and reconciled if the flag toggles.
- Rollback can hide placement/action-card UI and disable new mutation RPCs while
  preserving sent meals and Grocery lists.
- Do not schedule reminders that would survive feature rollback.

## Permanent Product Threshold

Promote this from a learning release only after real meal cycles show that:

- organizers correctly predict that only checked Ideas enter Groceries;
- they intentionally leave Ideas behind without fearing data loss;
- placement is used only after Grocery commitment and Flexible remains
  understandable;
- **Tuesday · Dinner** is not mistaken for an exact calendar block;
- exact cooking Activities neither duplicate nor orphan across retry, move,
  removal, unschedule, and relaunch;
- the Activity card reliably reaches the correct recipe version and Cook Session;
- no household, Recipe, Grocery, or calendar authority leaks across viewers;
- the drawer retains a clear three-second read at accessibility text sizes; and
- at least three real cycles feel like less repeated work rather than another
  planning ritual.
