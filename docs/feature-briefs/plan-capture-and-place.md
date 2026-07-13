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
last_updated: 2026-07-13
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

When the user taps empty time in the Plan calendar, Kwilt immediately shows a one-hour provisional block at the nearest 15-minute boundary. The block has two visible handles: dragging either handle changes the start or end, while dragging the body moves the whole block without changing its duration.

A non-blocking bottom drawer opens with the selected time and the lightweight Activity composer. The calendar scrolls the provisional block near the top of its timeline, then gives most of the remaining viewport to a scrollable inventory of eligible unscheduled Activities. The calendar remains interactive above the drawer, and the drawer can expand further. This follows the direct-manipulation contract proven by Outlook mobile and Google Calendar without copying their event-specific metadata into Kwilt.

The drawer uses one combined surface rather than separate new/existing modes:
- A filtered, scrollable inventory of eligible unscheduled Activities reuses the proven To-dos list rows without its view switcher or inventory-management chrome.
- The familiar Quick Add dock stays anchored to the bottom of the drawer and creates a lightweight Activity for the selected calendar time.
- Existing and new Activities are therefore simultaneously discoverable without a mode switcher or preliminary choice screen.
- One primary commit action schedules whichever Activity is selected or was just created.

Calendar writes stay explicit. Nothing is created on the external calendar until the user taps the commit action.

### Slot handling

- Single tap on empty time starts a one-hour provisional block at the nearest 15-minute boundary. It does not create an Activity or external calendar event by itself.
- Dragging the block moves its start and end together in 15-minute increments.
- Dragging the start or end handle resizes that edge in 15-minute increments, with minimum and maximum guardrails.
- Opening the drawer scrolls the selected block near the top of the visible timeline so the block stays oriented while the to-do inventory receives more space.
- The drawer does not block calendar taps or block manipulation above it; expanding it reveals more of the existing Activity list.
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

V1 uses a short filtered list in the same drawer as Quick Add:
- show open, unscheduled Activities first
- exclude done/cancelled Activities
- show estimate/Goal when available

Do not add a segmented new/existing switcher. Creating and choosing are two inputs to the same placement decision, so both should remain available without changing modes.

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
- The calendar canvas should use tap-to-select plus visible move/resize affordances, not a persistent Quick Add dock. This replaces the earlier long-press bet after it failed dogfooding discovery.
- A recommendation-sheet Quick Add affordance is useful, but it serves a different moment than slot creation.

Implementation questions to settle before code:
- Should a later release remember the user's most recent default duration instead of always starting at one hour?
- Should the current 15-minute minimum and four-hour maximum guardrails change after dogfooding?
- Should a later release add search when the eligible to-do inventory is long?
- Which Quick Add AI actions should be exposed in the slot drawer for the first dogfood build?

Acceptance criteria:
- Single tapping empty time in Plan shows a one-hour provisional block and compact slot-aware drawer without creating a todo.
- The provisional block displays visible start and end handles.
- Dragging the block moves it without changing its duration.
- Dragging either handle adjusts that edge in 15-minute increments.
- The calendar remains interactive above the slot drawer.
- Opening slot capture shifts the selected block near the top of the visible timeline and opens a drawer tall enough to show multiple eligible to-dos.
- The drawer can expand to reveal the existing Activity list.
- The drawer shows Quick Add and eligible existing to-dos together without a new/existing segmented control.
- One commit action schedules the selected or newly created Activity.
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

- Should the Recommendations sheet also expose an "Add to this day" CTA after direct calendar tapping is dogfooded?
- Should the existing Activity picker bias by duration fit, Goal priority, or recent recommendations after the basic flow proves useful?
