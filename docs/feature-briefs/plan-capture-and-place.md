---
id: brief-plan-capture-and-place
title: Plan Capture And Place
status: draft
audiences: [audience-burned-out-productivity-power-users]
personas: [Marcus]
hero_jtbd: jtbd-move-the-few-things-that-matter
job_flow: job-flow-marcus-move-the-few-things-that-matter
serves: [jtbd-move-the-few-things-that-matter, jtbd-carry-intentions-into-action, jtbd-capture-and-find-meaning, jtbd-trust-this-app-with-my-life]
related_briefs: [auto-schedule, calendar-export-ics, due-date-reminders]
owner: andrew
last_updated: 2026-07-08
---

# Plan Capture And Place

## Context

Plan currently helps the user review a day, see calendar context, receive recommendations, move proposed time blocks, and commit existing Activities into real calendar events. The missing daily-planning move is slot-originated capture: when the user is looking at open time and knows what belongs there, they should not have to leave Plan to create or find the Activity. This must not be solved by permanently mounting Quick Add over the calendar; the calendar needs its vertical space.

## Target audience

Burned-out productivity power users need less system upkeep. This feature matters because it lets Plan absorb one common planning loop without becoming another dashboard: see open time, name one meaningful action, and place it.

## Representative persona

Marcus is in Plan looking at a real day. He may already have Activities worth scheduling, or he may realize a new todo belongs in a specific slot. He needs the calendar moment to become action without requiring a separate capture trip.

## Aspirational design challenge

How might we help Marcus turn open time into one honest next action, while preserving Kwilt's Activity-first model and explicit calendar control?

## Hero JTBD

`jtbd-move-the-few-things-that-matter` - Plan exists to help Marcus make real progress in the few areas he most wants to grow.

## Job flow step

`job-flow-marcus-move-the-few-things-that-matter`, step 5: Decide what to do next. The current delivery score is 3: Plan and recommendations help, but the "what now?" moment is not yet the spine. This improves the gap by letting open calendar time become a direct place to create or choose one Activity.

## JTBD framing

When I am looking at my day in Plan, I want to turn an open time into a real Kwilt Activity or place an existing Activity there, so that planning does not require leaving the calendar moment where the commitment became clear. This serves `jtbd-carry-intentions-into-action`, keeps `jtbd-capture-and-find-meaning` capture-first, and must satisfy `jtbd-trust-this-app-with-my-life` because calendar writes need explicit confirmation and reversibility.

## Design

### Product behavior

When the user long-presses empty time in the Plan calendar, Kwilt shows a provisional block. Dragging adjusts the duration. On release, Kwilt opens a bottom drawer for that selected slot.

The drawer supports two paths:
- New to-do here: create a lightweight Activity and commit it to the selected calendar time.
- Choose existing: select an unscheduled Activity and commit it to the selected calendar time.

Calendar writes stay explicit. Nothing is created on the external calendar until the user taps the commit action.

### Slot handling

- Single tap on empty time should not create a todo. Keep it available for inspection or no-op behavior.
- Long press starts a provisional block at the nearest 15-minute boundary.
- Dragging changes the end time in 15-minute increments, with minimum and maximum guardrails.
- If no drag duration is available in an edge case, V1 can fall back to 30 minutes unless the chosen existing Activity has `estimateMinutes`.
- New Activities use the selected slot duration as `estimateMinutes`.
- The committed Activity receives `scheduledAt` and a calendar binding exactly like recommendation commits.

### New Activity path

Required fields:
- title
- selected time range

Optional/deferred fields:
- Goal
- Arc
- notes
- due date
- reminder
- repeat
- tags

Capture must not require Goal or Arc selection. The created Activity can be edited through the existing Activity detail flow after it appears on the calendar.

The creation UI may reuse Quick Add composer/controller primitives, including AI action preferences, but it should be shaped for a selected calendar slot rather than rendered as the persistent Activities-tab dock.

Initial AI stance:
- `Add steps` can be available because it helps turn a block into action.
- `Fill details` can be available if it does not override the selected schedule.
- `Set triggers` should be off or hidden in the slot workflow until proven safe, because reminders, location triggers, and due dates are different promises from a scheduled calendar block.
- `Find cover` can follow existing entitlement behavior, but it is not central to scheduling.
- AI must not change `scheduledAt`, selected duration, due date, reminder, repeat, or calendar binding in V1.

### Existing Activity path

V1 can use a simple filtered picker:
- show open, unscheduled Activities first
- include search
- exclude done/cancelled Activities
- show estimate/Goal when available

After selection, Kwilt checks availability/conflicts and writes the event through the same managed-calendar path as recommendation commits.

### Trust and error states

- If no write calendar is configured, route to calendar settings.
- If calendar access is expired, use the existing reconnect path.
- If the selected time conflicts with external busy time or Kwilt blocks, explain the conflict before writing.
- If the calendar write may have succeeded but Kwilt cannot recover the event binding, use the existing "Check your calendar" copy rather than falsely claiming failure.

### Relationship to recommendations

Recommendations remain the "Kwilt suggests what could fit" flow. Slot capture is the inverse: the user chooses the time first and then names or chooses the Activity. Both flows should produce the same scheduled block model.

The Recommendations sheet can have its own smaller "Add one more" affordance. That is a different job: adding a missing candidate while reviewing suggestions. It can lean more directly on the existing Quick Add dock pattern because it does not need drag-to-duration time selection.

Recommendations-sheet interaction:
- Show a collapsed inline row: `+ Add a to-do`.
- Keep it visually quieter than the recommendation cards; it is an escape hatch, not the sheet's primary content.
- When tapped, expand in place into the familiar Quick Add composer with title input, AI actions, and submit.
- After submit, create the Activity immediately. It is a real todo, not a temporary recommendation object.
- Because this context strongly implies scheduling intent, keep the user in a scheduling completion state.
- If the planning engine can find a safe slot, show the new Activity as a schedule offer with time picker and Commit.
- If no safe slot is available, show "Pick a time," "Adjust availability," and "Save without scheduling" options.
- Do not write the calendar event until the user taps Commit.

AI in the Recommendations sheet:
- It may use the user's existing Quick Add AI action preferences.
- It can enrich steps/details/triggers according to the normal Quick Add rules.
- It must not auto-commit the created Activity to the calendar.
- If AI changes the estimate, the proposal should update before commit rather than silently changing a committed block.

The ideal emotional shape: "You made the todo; now let's finish placing it." The fallback "Save without scheduling" exists for control and reversibility, but it should not be the default endpoint of this flow.

### Relationship to due dates

This feature does not change due-date semantics. `scheduledAt` is calendar-backed scheduled time. `scheduledDate` remains the due-date / anytime-today marker.

## Success signal

Andrew can create or place real dogfooding todos from Plan across several days, with fewer trips to the Activities tab, trusted calendar blocks, and no recurring confusion between scheduled blocks and due dates.

## Spec refinement

Assumptions Codex made:
- Marcus is the primary lens because this is a planning-system-friction problem.
- The first release should include both new Activity creation and existing Activity placement because the user named both.
- The correct system extension is Plan slot capture, not a new planning object or dashboard.
- V1 should keep Goal/Arc optional and avoid AI ranking or schedule mutation.
- The calendar canvas should use a long-press/drag/release gesture, not a persistent Quick Add dock and not single-tap creation.
- A recommendation-sheet Quick Add affordance is useful, but it serves a different moment than slot creation.

Implementation questions to settle before code:
- Should V1 include a visible plus affordance on the calendar if long-press discovery is weak?
- What minimum and maximum duration guardrails should the long-press drag gesture enforce?
- Should the existing Activity picker reuse global search or be a purpose-built lightweight drawer section?
- Which Quick Add AI actions should be exposed in the slot drawer for the first dogfood build?

Acceptance criteria:
- Single tapping empty time in Plan does not create a todo.
- Long-pressing empty time in Plan shows a provisional block.
- Dragging during long press adjusts the provisional block duration.
- Releasing opens a slot-aware drawer.
- Creating a new Activity from the drawer adds a real calendar event and a scheduled Kwilt block.
- Choosing an existing Activity from the drawer adds a real calendar event and updates that Activity.
- The Recommendations sheet, if it exposes add-one-more, starts with a collapsed `+ Add a to-do` row.
- Expanding that row shows Quick Add-style AI actions without taking over the sheet by default.
- Submitting from Recommendations creates a real Activity immediately.
- After submit, the sheet offers to schedule that Activity before the user leaves the flow.
- Calendar write still requires Commit.
- The resulting block can be opened, moved, and unscheduled through existing Plan behavior.
- Goal/Arc selection is not required for new capture.
- AI enrichment, if exposed, does not change the selected scheduled time or create due-date/reminder/repeat side effects.
- Conflict, missing calendar, and expired-access states are handled before or during commit.
- `npm run verify:changed -- --run` passes.

## Open questions

- Does direct tapping discover well enough, or should the Recommendations sheet also expose an "Add to this day" CTA?
- Should the existing Activity picker bias by duration fit, Goal priority, or recent recommendations after the basic flow proves useful?
