# Learning Release: plan-capture-and-place

## Concept To Build

Plan lets the user long-press open calendar time, drag to set duration, then create a new Activity or place an existing one into that time as a real calendar block.

## Capability Delta

Today, the user cannot:
- Create a new todo from a calendar slot in Plan.
- Place an existing todo into a tapped calendar slot.
- Keep the planning flow inside Plan when the intent starts from open time.

After this release, the user can:
- Long-press open time in Plan.
- Drag a provisional block to set duration.
- Create a lightweight Activity for that time, or choose an existing Activity.
- Commit it to the configured write calendar.
- See the resulting block on the Plan calendar and manage it through existing scheduled-block actions.

Still intentionally not supported:
- Auto-scheduling without explicit confirmation.
- Batch scheduling multiple Activities from one tap.
- AI deciding which Activity belongs in a slot.
- Goal/Arc-required capture.
- Due-date/reminder changes as part of the schedule block.

## User Experience

The user is on Plan, looking at a day. A single tap on empty calendar space does not create anything. The user long-presses open space. A temporary block appears at the press location. As the user drags, the block grows or shrinks in 15-minute increments. On release, a bottom drawer opens with the selected start/end time.

Happy path:
- The drawer shows the time range, Quick Add, and a short list of eligible existing to-dos together.
- The user creates the to-do through Quick Add, then taps "Commit to calendar."
- Kwilt creates an Activity, writes the calendar event, stores `scheduledAt` and `calendarBinding`, closes the drawer, and shows the new block on the Plan calendar.

Existing-Activity path:
- The user directly selects an unscheduled Activity from the same combined drawer.
- Kwilt writes the calendar event for the selected slot and updates the Activity scheduling state.

## Existing Product Relationship

This enhances Plan. It does not replace recommendations; recommendations remain useful when Kwilt can propose what to do. Slot capture covers the inverse moment: the user already sees time and wants to decide what belongs there.

The existing Quick Add dock should not be mounted persistently over the Plan calendar. The calendar is already vertically constrained, and a permanent dock would steal the exact inspection space this surface needs. Quick Add patterns are still useful inside two narrower moments:
- In the slot drawer, reuse the composer/controller ideas for title capture and optional AI actions, but keep the selected time/duration as Plan-owned state.
- In the Recommendations sheet, show a compact collapsed "+ Add a to-do" offer that expands into the familiar Quick Add composer with AI actions. That moment is about adding a missing candidate, not manipulating an exact calendar block.

Recommendations-sheet happy path:
- The sheet shows "Commit a few for Wed, Jul 8" and recommended cards.
- A small collapsed "+ Add a to-do" row appears as an escape hatch, not as the dominant first item.
- The user taps it, the row expands into the Quick Add composer with AI actions.
- The user submits a title.
- Kwilt creates the Activity immediately.
- Kwilt offers to schedule that real Activity in the same sheet, using a proposed time when possible.
- The user taps Commit before any calendar event is written.

Recommendations-sheet no-slot path:
- Kwilt still creates the Activity.
- The sheet shows that it could not find a safe slot and offers "Pick a time," "Adjust availability," or "Save without scheduling."
- Saving without scheduling should feel like an escape hatch, not the intended end state, because this context implies scheduling intent.

## Buildable Slice

Must be real:
- Empty-time long press and drag wired inside `PlanCalendarLensPage`.
- Provisional block preview during drag.
- Bottom drawer for a selected slot.
- New Activity creation with title and duration inferred from the selected slot.
- Existing Activity selection path, even if initially simple.
- Collapsed-to-expanded "+ Add a to-do" affordance in the Recommendations sheet if included in the first slice.
- New Activities created from Recommendations are real Activities immediately.
- New Activities created from Recommendations receive an immediate schedule offer before the user leaves the sheet.
- Calendar write using the configured write calendar.
- Local Activity update with `scheduledAt`, `calendarBinding`, and `updatedAt`.
- Conflict/window guardrails matching existing Plan move behavior.

Can be thin or temporary:
- Existing Activity picker can start as search/open filtered list.
- Goal/Arc selection can be omitted in V1.
- Slot duration can snap in 15-minute increments with minimum and maximum guardrails.
- AI action toggles can start hidden or conservative in the slot drawer; if reused, they should enrich details/steps without changing the selected schedule.
- Analytics can be simple event logging/manual dogfooding notes.

Intentionally excluded:
- Multi-select scheduling.
- Smart ranking beyond simple unscheduled/open Activities.
- AI choosing which Activity belongs in the slot.
- AI changing the selected scheduled time, due date, reminder, or repeat behavior.
- New settings.
- Recurrence.

## Release Channel

`Local build` first, then `TestFlight build` if Andrew dogfoods it for real work without obvious trust issues. This surface writes real calendar events, so local proof should include actual calendar creation, move, and unschedule.

## Brand-Goodwill Guardrails

- The drawer should say exactly what will be added and when.
- Do not write to the calendar until the user taps the commit action.
- If write calendar is missing or access is expired, show the existing calendar settings/reconnect path.
- If creation succeeds but calendar confirmation is uncertain, use the existing softer "check your calendar" trust copy.

## Reversibility

The release is additive and can be hidden by not wiring `onPressEmptyTime`. Created blocks use existing Activity/calendar binding semantics, so the user can unschedule or move them through current Plan behavior.

## Permanent Product Threshold

Keep it as accepted product capability when dogfooding shows that calendar-slot capture creates real Activities with fewer tab switches, without increasing duplicate Activities, surprise calendar writes, or confusion between due dates and scheduled blocks.
