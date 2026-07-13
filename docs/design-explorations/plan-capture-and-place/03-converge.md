# Converge: plan-capture-and-place

## Qualitative Score

| Alternative | Persona fit | System fit | Blast radius | Trust/data risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| Tap-Selected Slot Composer | High | High | Medium | Medium | Choose for calendar canvas |
| Recommendations Sheet "Add One More" | Medium | High | Low | Low | Secondary option |
| Existing-Activity Slot Picker First | Medium | Medium | Medium | Medium | Later refinement |
| Persistent Calendar Quick Add Dock | Low | Medium | Low | Low | Reject for canvas |
| Long-Press Existing Activity To Schedule | Low | Medium | Medium | Low | Reject |

## Capability Delta

Today, the user cannot:
- Tap open time in Plan, directly adjust the selected block, and create a new Kwilt Activity for that exact block.
- Tap open time in Plan, directly adjust the selected block, and choose an existing Activity to commit there.
- Stay in the Plan moment when the planning thought starts from the calendar.

After this concept ships, the user can:
- Tap open calendar time, move or resize a provisional block, create a lightweight Activity, and add it to the calendar.
- Tap open calendar time, move or resize a provisional block, choose an existing unscheduled Activity, and add it to the calendar.
- Review, move, or unschedule the resulting Kwilt block through the existing Plan block peek.

Still intentionally not possible:
- Background auto-scheduling.
- Creating a separate non-Activity plan item.
- Auto-anchoring the Activity to an Arc or Goal.
- Treating the scheduled calendar time as a due date.

## Reductive Design Pass

Smallest elegant version:
- Wire an open-time tap to a one-hour provisional block preview.
- Visible handles resize either edge, dragging the body moves the block, and opening the drawer scrolls the selected block near the top of the timeline so a taller to-do inventory can stay open without losing calendar context.
- The drawer has one selected slot, the familiar Quick Add dock, a visible short list of existing Activities, and one commit action.
- New Activity defaults estimate duration from the slot and keeps Arc/Goal optional.

Enhance existing feature:
- This enhances Plan and reuses Activity capture, calendar write, and scheduled block peek.

Refuse to add:
- No new Plan object.
- No daily dashboard.
- No scheduling settings.
- No AI choice engine.
- No multi-select or batch placement in V1.
- No educational copy beyond labels that clarify the chosen time.
- No persistent Quick Add dock over the Plan calendar.

What would feel like clutter:
- A dense Activity inbox inside the calendar.
- A bottom composer that permanently steals vertical space from the calendar canvas.
- Requiring Goal, Arc, priority, due date, repeat, reminder, tags, and notes before the Activity can be scheduled.
- Showing every possible existing Activity instead of a focused search/short list.

## Chosen Alternative

Choose **Tap-Selected Slot Composer** for the calendar canvas, with **Recommendations Sheet "Add One More"** as a separate secondary path if the sheet needs capture.

Rationale: Plan has at least two distinct jobs. In the calendar canvas, the user is manipulating time; Outlook and Google Calendar are the right references because a tap reveals a temporary block with visible resize handles, the block itself can move, and a compact editor stays secondary to the calendar. In the recommendations sheet, the user is reviewing candidates; a compact Quick Add-style "add one more" can belong there without shrinking the calendar.

## Activation Path

Most ready moment: the user taps open space in the Plan calendar, then directly moves or resizes the visible provisional block. A second moment is inside Recommendations when the user sees the day is almost right but missing one real item.

Education stance: single tap is the creation-selection gesture. The visible block, handles, and compact editor teach the rest through direct manipulation; no separate plus affordance or gesture tutorial is needed.

Natural adoption signal: Andrew creates or places real todos from the Plan calendar during dogfooding, without detouring through Activities.

Dogfooding refinement: new and existing are not separate modes. The drawer keeps Quick Add and eligible existing Activities in one combined surface, removing the segmented switcher and preserving one dominant commit action.

## Recommendations Sheet Interaction

The Recommendations sheet should not mount a full composer by default. The first state should be a small inline offer: "+ Add a to-do." It can sit near the recommendation list as an escape hatch when the suggested set is missing something, not as the dominant first action.

On tap, it expands in place into the familiar Quick Add composer:
- title input
- AI actions menu
- submit affordance
- keyboard-aware layout

Submitting from this composer should create a real Activity immediately. Because the user created it from Recommendations, Kwilt should then keep them in the scheduling job:
- If a safe slot is available, show the newly created Activity as a schedule offer with a proposed time, time picker, and Commit.
- If no safe slot is available, show the real Activity with "Pick a time," "Adjust availability," and "Save without scheduling" exits.
- If AI enrichment changes the estimate after creation, update the proposed duration before Commit rather than changing a committed calendar block.

The user still chooses/adjusts the time and taps Commit before Kwilt writes the calendar. This preserves the Recommendations sheet job: review and schedule a few, without silently writing calendar events.

AI actions are acceptable here because the user is creating a candidate Activity, not manipulating an exact calendar block. Still, AI should not auto-commit the new Activity to the calendar.

## Accepted Trade-Offs

- The first release is manual and explicit rather than agentic.
- Existing-Activity placement may start as search/open list rather than a perfect fit-ranked picker.
- Calendar conflict checks stay deterministic and conservative.
- Quick Add UI reuse is allowed in the sheet or composer internals, but not as a persistent overlay on the calendar canvas.

## Rejected Trade-Offs

- Do not ship only a recommendation-sheet CTA when direct calendar tap creation is buildable.
- Do not make the user connect or change calendar settings as part of capture unless write calendar is missing.
- Do not add rich Activity editing before commit; detailed shaping can happen after the block exists.
- Do not make the exact-slot workflow identical to ordinary Quick Add; its job is time selection first, capture second.

## System Implications

- `PlanCalendarLensPage` should use its tap-shaped `onPressEmptyTime` affordance to create a default slot, then provide distinct move, start-resize, and end-resize gestures on the selected block.
- `PlanPager` needs a drawer state for a selected empty slot.
- New Activity creation can reuse Quick Add controller primitives and AI action preferences where they fit, but the selected start/end time is owned by the Plan slot gesture.
- Committing should use the same calendar creation/linking semantics as recommendations so scheduled blocks remain moveable and unscheduleable.

## Bet

The original long-press bet was disconfirmed in dogfooding: the implementation existed but was not discoverable enough to use. The revised bet is that immediate tap feedback plus visible move/resize affordances will make slot-first planning feel obvious without adding permanent chrome. If this still does not land, the next move is to simplify the compact editor further before adding a separate plus affordance.

## Success Signal

In dogfooding, Plan captures real work without a tab switch, and the resulting blocks are trusted enough to move or unschedule from the calendar view.
