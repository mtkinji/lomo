# Evaluate Learning: To-do Schedule Sessions

## Learning Questions

1. Does the user understand the difference between moving an existing session and adding another session?
2. Does one Activity with multiple sessions feel calmer than creating duplicate or linked Activities?
3. Does exact-duplicate prevention make retries feel trustworthy rather than restrictive?
4. Can Plan render multiple sessions for one Activity without making the calendar or to-do model feel cluttered?
5. Do sessions stay distinct from recurrence, due dates, reminders, and Focus?

## Assumptions To Validate

- The Activity Session Ledger is the right object model for "same to-do, multiple work blocks."
- Existing surfaces can absorb this without a new session dashboard.
- A derived next session is enough for compatibility with current scheduled-state surfaces.
- Users rarely need separate checklist/completion state per session in V1.
- Provider recovery plus pre-create matching is enough to prevent duplicate calendar writes in realistic retry cases.

## Supporting Evidence

Evidence that supports the bet:
- Andrew schedules one Activity into two non-overlapping sessions and describes it as one to-do with two planned times.
- Retrying a schedule action after a shaky response does not create a duplicate event.
- Moving one session does not move or delete the other sessions.
- Unscheduling one session leaves the Activity and other sessions intact.
- The Activity Detail copy feels obvious enough that no explanatory modal is needed.

Evidence that disconfirms the bet:
- The user expects each session to have its own checklist/status.
- Multiple sessions in Plan feel like duplicate tasks.
- The user tries to use sessions as recurring rules.
- Exact-duplicate prevention feels like Kwilt is blocking a legitimate action.
- Session state and `scheduledAt` compatibility produce stale or inconsistent surfaces.

Evidence that brand goodwill is protected:
- Calendar events are not duplicated.
- "Could not schedule" style errors are replaced by accurate confirmation or check-calendar states.
- The user does not need to manually clean up calendar artifacts during normal use.

## Instrumentation

Useful events or logs:
- `activity_schedule_session_created`
- `activity_schedule_session_duplicate_prevented`
- `activity_schedule_session_moved`
- `activity_schedule_session_unscheduled`
- `activity_schedule_session_recovered_existing_event`
- `activity_schedule_session_link_failed`

Recommended properties:
- `activity_id`
- `session_id`
- `surface` (`activity_detail`, `plan`)
- `source` (`manual`, `recommendation`, `retry_recovery`)
- `same_day_session_count`
- `calendar_provider`
- `has_existing_session`

Do not track:
- Calendar event titles beyond existing Activity ids/titles already in app state.
- Raw external calendar contents.
- Minute totals as a productivity score.
- Any "missed session" shaming metric.

## Decision Rule

Proceed to permanent implementation if, after a TestFlight dogfood pass:
- At least three real Activities are scheduled with multiple sessions.
- Exact duplicate attempts are prevented or linked without calendar cleanup.
- Move/unschedule works per session.
- The user can explain the behavior without using internal terms like ledger or binding.

Revise if:
- The user thinks sessions should be separate actionable to-dos.
- Plan feels visually crowded.
- Existing `scheduledAt` compatibility causes confusion in To-dos, recommendations, notifications, or widgets.

Retire or defer if:
- Multi-session scheduling is rare and the single-session plus duplicate-prevention model is enough.
- The implementation requires a risky migration before the value is proven.

## Expected Next Action

Write a feature brief that specifies a V1 Activity schedule-session model, then refine implementation questions before coding. The first engineering slice should prioritize data/model tests and duplicate-prevention tests before UI polish.
