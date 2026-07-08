# Converge: plan-capture-and-place

## Qualitative Score

| Alternative | Persona fit | System fit | Blast radius | Trust/data risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| Long-Press Slot Composer | High | High | Medium | Medium | Choose for calendar canvas |
| Recommendations Sheet "Add One More" | Medium | High | Low | Low | Secondary option |
| Existing-Activity Slot Picker First | Medium | Medium | Medium | Medium | Later refinement |
| Persistent Calendar Quick Add Dock | Low | Medium | Low | Low | Reject for canvas |
| Long-Press Existing Activity To Schedule | Low | Medium | Medium | Low | Reject |

## Capability Delta

Today, the user cannot:
- Long-press open time in Plan, drag to set duration, and create a new Kwilt Activity for that exact block.
- Long-press open time in Plan, drag to set duration, and choose an existing Activity to commit there.
- Stay in the Plan moment when the planning thought starts from the calendar.

After this concept ships, the user can:
- Long-press open calendar time, drag a provisional block to the right duration, create a lightweight Activity, and add it to the calendar.
- Long-press open calendar time, drag a provisional block to the right duration, choose an existing unscheduled Activity, and add it to the calendar.
- Review, move, or unschedule the resulting Kwilt block through the existing Plan block peek.

Still intentionally not possible:
- Background auto-scheduling.
- Creating a separate non-Activity plan item.
- Auto-anchoring the Activity to an Arc or Goal.
- Treating the scheduled calendar time as a due date.

## Reductive Design Pass

Smallest elegant version:
- Wire open-time long press to a provisional block preview.
- Drag adjusts the selected duration in 15-minute increments; release opens one drawer.
- The drawer has one selected slot, one title input for new Activity, one "Choose existing" action, and one commit action.
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

Choose **Long-Press Slot Composer** for the calendar canvas, with **Recommendations Sheet "Add One More"** as a separate secondary path if the sheet needs capture.

Rationale: Plan has at least two distinct jobs. In the calendar canvas, the user is manipulating time; Outlook's pattern is the right reference because long press creates a temporary block, drag controls duration, and release opens creation. In the recommendations sheet, the user is reviewing candidates; a compact Quick Add-style "add one more" can belong there without shrinking the calendar.

## Activation Path

Most ready moment: the user long-presses open space in the Plan calendar, drags to the intended duration, then releases. A second moment is inside Recommendations when the user sees the day is almost right but missing one real item.

Education stance: single tap on empty calendar space should do nothing or stay reserved for inspection. Long press is the creation gesture. Add a small plus affordance only if gesture discovery fails in dogfooding.

Natural adoption signal: Andrew creates or places real todos from the Plan calendar during dogfooding, without detouring through Activities.

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

- Do not ship only a recommendation-sheet CTA if direct calendar long-press creation is buildable.
- Do not make the user connect or change calendar settings as part of capture unless write calendar is missing.
- Do not add rich Activity editing before commit; detailed shaping can happen after the block exists.
- Do not make the exact-slot workflow identical to ordinary Quick Add; its job is time selection first, capture second.

## System Implications

- `PlanCalendarLensPage` should support a long-press-and-drag empty-slot gesture, likely replacing or superseding the current tap-shaped `onPressEmptyTime` affordance for creation.
- `PlanPager` needs a drawer state for a selected empty slot.
- New Activity creation can reuse Quick Add controller primitives and AI action preferences where they fit, but the selected start/end time is owned by the Plan slot gesture.
- Committing should use the same calendar creation/linking semantics as recommendations so scheduled blocks remain moveable and unscheduleable.

## Bet

We're betting that when the calendar itself is the user's planning context, a long-press drag-to-duration gesture will feel more natural and less cluttered than a permanent Quick Add dock or a single-tap drawer. If it turns out not to be true, we'd revisit by adding a Recommendations-sheet "add one more" path or a small explicit plus affordance.

## Success Signal

In dogfooding, Plan captures real work without a tab switch, and the resulting blocks are trusted enough to move or unschedule from the calendar view.
