# Frame: To-do Schedule Sessions

## What the user said
> So if the todo is already scheduled, I don't think I want the option to have it scheduled again over the same moment. However I may want to schedule multiple sessions for the same todo within the same day, or over multiple days...

## Restated in user voice
When I am planning a real to-do into my calendar, I want Kwilt to understand the difference between accidentally scheduling the same block again and intentionally making more than one work session for the same to-do, so that I can trust my calendar without turning one Activity into a brittle mini-project system.

## Target audience
`audience-burned-out-productivity-power-users` - Burned-out productivity power users need less system upkeep, not another calendar/task model to maintain.

## Representative persona
Marcus: Marcus has tried calendars, task apps, AI chats, and custom systems. He wants help deciding what deserves time and making it real without rebuilding another productivity workflow.

- Current situation: Marcus is using Activity Detail and Plan to put to-dos onto a real provider calendar. A failed confirmation in TestFlight produced duplicate overlapping calendar events, exposing that Kwilt's scheduled-state model is too singular and retry behavior is too permissive.
- What they're trying to become/do: Make honest progress on the few commitments worth carrying by placing work into time, sometimes as one block and sometimes as several sessions.
- Emotional state or tension: He wants confidence that Kwilt will not dirty his calendar, but he also does not want Kwilt to block a legitimate "work on this again later" move.
- What would make this feel wrong to them: A generic productivity-calendar model with recurring busywork, duplicate event cleanup, confusing due-date language, or a new object the user has to maintain.

## Hero anchor
`jtbd-move-the-few-things-that-matter` - Help me make real progress in the few areas I most want to grow.

## Job flow step
`job-flow-marcus-move-the-few-things-that-matter`, step 5: Decide what to do next.

Current product flow: Activities hold concrete work, Activity Detail exposes Schedule as an action, and Plan can commit Activities into provider calendar blocks. The job-flow delivery score for this step is 3 because Plan and recommendations help, but the "what now?" moment is not yet the spine.

Gap this work addresses: Kwilt can place an Activity on the calendar, but it does not yet have a clear product rule for whether an Activity may own multiple scheduled work sessions. That makes duplicate prevention and intentional session planning look like the same behavior.

## Active anchors
- `jtbd-move-the-few-things-that-matter` - Scheduling matters only because it helps important work become real time, not because Kwilt should become a calendar optimizer.
- `jtbd-carry-intentions-into-action` - A scheduled session is a bridge from intention to doing.
- `jtbd-capture-and-find-meaning` - Multiple sessions should still belong to the Activity as meaningful work, without forcing Goal/Arc setup or extra classification.
- `jtbd-trust-this-app-with-my-life` - Calendar writes need to be explicit, reversible, idempotent, and easy to understand.

## Friction we're addressing
The current model stores one `Activity.scheduledAt` and one `calendarBinding`, which works for "this to-do has one scheduled block" but strains when the user wants several sessions. The recent TestFlight behavior also showed that a failed link/confirm path can create external calendar duplicates even though the app says scheduling failed. The design needs a rule that blocks accidental duplicate scheduling of the same session while allowing intentional additional sessions.

## System alignment
Constraint posture: `Extend the system`

Current system facts:
- Existing surface: Activity Detail has a Schedule drawer with duration selection, suggested slots, manual day-view selection, and a provider-calendar write path. Plan renders scheduled Kwilt blocks alongside external calendar events and supports move/unschedule.
- Existing user flow: The user chooses a slot, Kwilt creates a provider event, then sets `scheduledAt` plus a managed `calendarBinding`. Plan recommendations follow the same managed-event promise.
- Existing domain/data model: `Activity` has `scheduledAt?: string | null`, `estimateMinutes?: number | null`, one `calendarBinding?: ActivityCalendarBinding | null`, and legacy provider event fields. `scheduledDate` remains due-date / anytime-today semantics. Recurrence exists separately through `repeatRule`, `repeatCustom`, `repeatSeriesId`, and `repeatBasis`.
- Existing technical affordances: Provider calendar APIs can list events, list busy intervals, create/update/delete events, and recover event refs by time-window match. Plan already reconciles external events against Kwilt blocks by provider ids or time/title similarity.
- Existing UX/copy conventions: Scheduling is user-controlled and calendar-native. Calendar events bridge back to Kwilt but do not automatically start Focus or Screen Time protection. Due dates, reminders, scheduled times, and repeat rules are separate promises.

Constraints to preserve:
- Activity remains the forward-planning unit at the day level; do not introduce a generic standalone Plan object.
- Capture stays first-class and unblocked; Goal/Arc selection must not be required.
- `scheduledDate` must not become a scheduled-session field.
- A retry should not create a duplicate event for the same Activity at the same time.
- "Scheduled" should mean Kwilt has a durable managed calendar binding, not just a hoped-for external side effect.

Constraints we may challenge:
- The one-Activity-one-`scheduledAt` assumption may need to become one Activity with one primary/next scheduled session plus zero or more additional managed sessions.
- Plan's "unscheduled candidate" filter may need to distinguish "has no sessions" from "has at least one session but can be scheduled again intentionally."
- The Activity Detail Schedule action may need a different state when an Activity already has a session: edit/move existing session vs add another session.

Design implication:
This should not be solved as recurrence by default. A repeated cadence and a second work session are different promises. The smallest system extension is likely a session-aware scheduling contract around Activities, where duplicate-session idempotency is automatic and additional sessions require an explicit user action.

## Aspirational design challenge
How might we help Marcus place one to-do into time more than once when the work honestly needs multiple sessions, while preserving Activity-first planning, explicit calendar control, and trust that Kwilt will never create accidental duplicate blocks?

## Out of scope
- Full recurring schedule redesign.
- Background auto-rescheduling.
- Bi-directional calendar edits beyond the existing managed-event move/unschedule promise.
- Treating scheduled sessions as due dates, reminders, Focus sessions, or Screen Time protection triggers.
- Cleaning up duplicate events already created in external calendars.

## Open question
Should V1 model additional scheduled sessions as child records on one Activity, or as duplicated/linked Activity occurrences that each own their own calendar binding?
