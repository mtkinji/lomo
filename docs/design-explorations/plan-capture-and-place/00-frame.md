# Frame: plan-capture-and-place

## What the user said
> I realized that when I'm here in Plan mode, I actually want to directly add new todos to the calendar. I might want to create new todos entirely, or even tap on the calendar to add existing or new.

## Restated in user voice
When I am looking at my day in Plan, I want to turn an open time into a real Kwilt Activity or place an existing Activity there, so that planning does not require leaving the calendar moment where the commitment became clear.

## Target audience
`audience-burned-out-productivity-power-users`: capable users whose planning systems turn into upkeep.

## Representative persona
Marcus: Marcus has real work in Kwilt and real calendar constraints outside it. He needs the Plan surface to reduce switching and decision load, not become another task-management cockpit.

- Current situation: he is in Plan, looking at a day, recommendations, existing calendar events, and open time.
- What he's trying to become/do: carry a few meaningful commitments into time.
- Emotional state or tension: he has enough intent to act, but leaving Plan to create or find a todo breaks the planning flow.
- What would make this feel wrong to him: a generic task inbox, a second planning object, or a heavy scheduling workflow before capture.

## Hero anchor
`jtbd-move-the-few-things-that-matter` - The moment matters because Marcus is trying to make real progress on the few commitments that deserve time.

## Job flow step
`job-flow-marcus-move-the-few-things-that-matter`, step 5: Decide what to do next. Current score: 3. Plan and recommendations help, but the "what now?" moment is not yet the spine. The gap is that Plan can suggest and commit, but cannot yet let the user create or choose work directly from an open calendar slot.

## Active anchors
- `jtbd-move-the-few-things-that-matter` - Plan is where a commitment becomes selected for the day.
- `jtbd-carry-intentions-into-action` - Capture must become a scheduled action without making the user rebuild context in another tab.
- `jtbd-capture-and-find-meaning` - New Activities should remain lightweight and first-class even when created from Plan.
- `jtbd-trust-this-app-with-my-life` - Calendar writes need explicit confirmation, reversibility, and no surprise automation.

## Friction we're addressing
The recommendation sheet is excellent when Kwilt already knows the candidate Activities. It breaks down when the user's thought starts from time itself: "I have 45 minutes here; put something real there." Today that requires leaving Plan, creating or finding an Activity elsewhere, then returning to scheduling.

## System alignment
Constraint posture: `Extend the system`

Current system facts:
- Existing surface: `PlanScreen`, `PlanPager`, `PlanCalendarLensPage`, `PlanEventPeekDrawerHost`, and `PlanRecsPage`.
- Existing user flow: the user opens recommendations, moves proposed slots, and commits one Activity into a real calendar event.
- Existing domain/data model: Activity is the only day-level forward-planning object; `scheduledAt` plus `calendarBinding` represents a committed calendar block; `scheduledDate` is due-date semantics, not a calendar block.
- Existing technical affordances: `PlanCalendarLensPage` already accepts `onPressEmptyTime`; `PlanPager` already creates calendar events, updates Activity scheduling state, and can open global Activity search.
- Existing UX/copy conventions: Plan reduces decision load; recommendation copy says "Commit a few"; scheduled blocks are inspectable and moveable; calendar writes are explicit.

Constraints to preserve:
- Keep Activity as the object created or placed. Do not add a separate Plan item.
- Never block capture on Arc or Goal selection.
- Do not turn suggested time blocks into real calendar events until the user confirms.
- Do not treat calendar blocks as due dates.

Constraints we may challenge:
- Plan currently treats creation as something that happens elsewhere. This release can let Plan create an Activity when the user starts from an open time.

Design implication:
The smallest good shape is a slot-aware "Add to this time" drawer from Plan. It should offer two paths: create a new Activity for this slot, or pick an existing Activity to place here. The same commit machinery should write the calendar event and schedule the Activity.

## Aspirational design challenge
How might we help Marcus turn open time into one honest next action, while preserving Kwilt's Activity-first model and explicit calendar control?

## Out of scope
Background auto-scheduling, multi-activity bulk planning, recurring creation, due-date reminder behavior, and AI auto-anchoring.

## Open question
Should the first release include both create-new and pick-existing from the tapped slot, or ship create-new first and leave pick-existing to global search?
