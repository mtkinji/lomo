---
id: brief-todo-schedule-sessions
title: To-do Schedule Sessions
status: draft
audiences: [audience-burned-out-productivity-power-users]
personas: [Marcus]
hero_jtbd: jtbd-move-the-few-things-that-matter
job_flow: job-flow-marcus-move-the-few-things-that-matter
serves: [jtbd-move-the-few-things-that-matter, jtbd-carry-intentions-into-action, jtbd-capture-and-find-meaning, jtbd-trust-this-app-with-my-life]
related_briefs: [auto-schedule, calendar-export-ics, dynamic-next-best-action, plan-capture-and-place]
owner: andrew
last_updated: 2026-07-08
---

# To-do Schedule Sessions

## Context

Activity scheduling currently assumes one Activity has one scheduled calendar block through `scheduledAt` and one managed `calendarBinding`. Dogfooding exposed two connected problems: a shaky provider-confirmation path can create duplicate overlapping calendar events, and real work sometimes needs more than one intentional session for the same to-do. The product needs to prevent accidental duplicate same-time blocks while allowing deliberate additional work sessions.

## Target audience

Burned-out productivity power users need time placement to reduce decision load, not create another system to maintain. This feature matters because Marcus needs calendar commitments he can trust while keeping one meaningful to-do intact across multiple sittings.

## Representative persona

Marcus is scheduling a real Activity into the calendar he lives by. Sometimes one block is enough. Sometimes he knows the same Activity needs two blocks today or another block tomorrow. He wants Kwilt to understand that difference without multiplying tasks or dirtying his calendar.

## Aspirational design challenge

How might we help Marcus place one to-do into time more than once when the work honestly needs multiple sessions, while preserving Activity-first planning, explicit calendar control, and trust that Kwilt will never create accidental duplicate blocks?

## Hero JTBD

`jtbd-move-the-few-things-that-matter` - Scheduling matters because it helps important work become real time, not because Kwilt should become a calendar optimizer.

## Job flow step

`job-flow-marcus-move-the-few-things-that-matter`, step 5: Decide what to do next. Current delivery score is 3 because Plan and recommendations help, but the "what now?" moment is not yet the spine. This feature improves the gap by making repeated planned work on one Activity explicit and manageable.

## JTBD framing

When Marcus is planning a real to-do into his calendar, he wants Kwilt to understand the difference between accidentally scheduling the same block again and intentionally making more than one work session for the same to-do, so that he can trust his calendar without turning one Activity into a brittle mini-project system.

## Design

### Product model

Introduce schedule sessions as managed calendar commitments owned by an Activity.

Conceptual shape:

```ts
type ActivityScheduleSession = {
  id: string;
  activityId: string;
  start: string;
  end: string;
  calendarBinding: ActivityCalendarBinding;
  source: 'activity_detail' | 'plan' | 'recommendation';
  status: 'scheduled' | 'cancelled';
  createdAt: string;
  updatedAt: string;
};
```

Implementation may start as `Activity.scheduleSessions?: ActivityScheduleSession[]` or a normalized store shape. The important contract is that each session owns its own provider event binding.

`Activity.scheduledAt` and legacy provider fields can remain during V1 as compatibility fields derived from the next active session. They should not be treated as the durable multi-session source of truth.

### Duplicate prevention contract

Before creating a provider calendar event, Kwilt checks whether the Activity already has a session or provider event matching the requested time window and write calendar.

Rules:
- Same Activity + same time window + same provider calendar means "already scheduled there."
- Exact duplicate attempts link/reuse the existing session and do not create another provider event.
- Different time windows can create another session only through an explicit "Add another session" action.
- A provider create response with missing/non-JSON event ref should recover the event ref before reporting failure.
- If a provider event may have been created but cannot be linked, Kwilt shows a check-calendar state and does not set scheduled state without a durable binding.

### Activity Detail UX

No sessions:
- Schedule opens the existing scheduling sheet.
- Committing a slot creates the first session and sets the derived next-session fields.

One or more sessions:
- The scheduling surface shows the next upcoming session.
- Primary edit path is move/reschedule that session.
- A secondary action offers `Add another session`.
- Selecting the same slot says or implies `Already scheduled there` and does not write another calendar event.
- Selecting a different available slot commits another session.

Keep copy plain:
- `Scheduled`
- `Move session`
- `Add another session`
- `Already scheduled there`

Avoid:
- Session dashboards.
- Recurrence language.
- Productivity framing like optimize, streak, or catch up.

### Plan UX

Plan renders scheduled sessions as calendar blocks. Multiple sessions for one Activity may appear on the same day or across days. Each block opens a context tied to the same Activity and the selected session.

Move behavior:
- Moving a block moves only that session's provider event.
- Other sessions for the Activity remain unchanged.

Unschedule behavior:
- Unscheduling a block cancels/removes only that session.
- If it was the next active session, derived compatibility fields update to the next remaining active session or clear if none remain.

Recommendations:
- Existing proposal/commit flows should avoid recommending Activities that already have a session for the same target window.
- Whether to recommend another session for an already scheduled Activity is deferred until after the manual session model proves itself.

### Relationship to adjacent concepts

Due dates:
- `scheduledDate` remains due-date / anytime-today semantics.
- Sessions do not create or change due dates.

Reminders:
- Sessions do not create reminder notifications by default.
- Reminder behavior remains attached to `reminderAt`.

Repeat:
- Additional sessions are not repeat rules.
- Repeat cadence remains governed by `repeatRule`, `repeatCustom`, and `repeatBasis`.

Focus:
- Calendar events may deep link to Focus as today.
- Sessions do not auto-start Focus or Screen Time protection.

Chapters:
- Future reflection may use session history as evidence of work, but V1 does not expose time totals or productivity scoring.

### Tests and verification

Required tests:
- Pure duplicate matcher treats same Activity + same time window + same write calendar as existing session.
- Different time window for the same Activity is allowed only through add-another-session flow.
- Activity with multiple active sessions derives the next upcoming session.
- Moving one session does not alter other sessions.
- Unscheduling one session updates derived next-session fields correctly.
- Provider response recovery links existing event instead of reporting false failure.
- Plan renders more than one session for the same Activity without duplicating the Activity object.

Manual QA:
- Schedule first session from Activity Detail.
- Attempt exact same slot again; confirm no duplicate provider event.
- Add a second session later the same day.
- Add a second session on another day.
- Move only one session from Plan.
- Unschedule only one session from Plan.
- Confirm due date, reminder, repeat, and Focus behavior are unchanged.

## Success signal

Andrew can schedule one real dogfooding Activity into multiple non-overlapping calendar sessions, cannot accidentally create the same session twice, and can describe the behavior in plain language: "This to-do has two planned times."

## Spec refinement

Assumptions Codex made:
- Marcus is the primary persona because this is planning-system trust and decision-relief work.
- The right V1 model is one Activity with child schedule sessions, not linked Activity occurrences.
- `scheduledAt` should remain as a derived compatibility field until the rest of the app migrates.
- Additional sessions should be manual and explicit in V1.
- Exact duplicate prevention should be automatic and quiet.
- TestFlight is the meaningful release channel because provider calendar behavior is central.

Implementation questions to settle before code:
- Should sessions be stored inline on `Activity` first, or normalized in the store/domain model immediately?
- What tolerance defines "same time window" for duplicate prevention: exact, two minutes like reconcile, or something broader?
- Should session status include only `scheduled` and `cancelled` in V1, or also `completed` for future reflection?
- How should Activity Detail show more than two upcoming sessions without becoming a session dashboard?
- Should Plan event peeks use "Move session" and "Unschedule session" copy immediately, or keep existing labels with contextual behavior?

Acceptance criteria:
- A scheduled Activity cannot be scheduled again over the same moment.
- A scheduled Activity can intentionally receive another non-overlapping session.
- Multiple sessions can exist on the same day or different days.
- Each session has a durable managed calendar binding.
- Moving or unscheduling one session does not change the other sessions.
- Existing single-session surfaces continue to work through a derived next session.
- Due date, reminder, repeat, Focus, and Screen Time semantics remain unchanged.
- Provider uncertainty does not create duplicate same-time events on retry.
- Product lint passes after the brief is referenced from relevant feature manifests.
- `npm run verify:changed -- --run` passes before implementation is handed back.

## Open questions

- Is inline Activity session storage acceptable for the first dogfood release, or should this start normalized to avoid migration churn?
- Should multi-session UI remain hidden until an Activity already has one session, or should Plan also expose "Add another session" from a selected block?
