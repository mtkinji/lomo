# Learning Release: To-do Schedule Sessions

## Concept To Build

Let one Activity own multiple intentional scheduled sessions, while making same-time duplicate calendar writes impossible.

## Capability Delta

Today, the user cannot:
- Schedule one to-do into more than one future work block without workarounds.
- Retry or reschedule confidently after a calendar-write uncertainty.
- Distinguish "edit the existing scheduled block" from "add another block."

After this release, the user can:
- Schedule an Activity once and see it as scheduled.
- Add another session for the same Activity at a different time.
- Move or unschedule the next/session-specific block.
- Avoid exact duplicate calendar events for the same Activity and time.

Still intentionally not supported:
- Recurring session rules.
- AI-generated multi-session plans.
- Session totals, time tracking, or dashboards.
- Calendar-only sessions that Kwilt cannot manage.
- Treating sessions as due dates or reminders.

## User Experience

The user encounters the release in Activity Detail and Plan.

Activity Detail:
- If the Activity has no scheduled sessions, Schedule behaves like today's schedule flow.
- If the Activity has a scheduled session, the scheduling surface makes the existing session visible.
- Choosing the same time links/moves the existing session rather than creating a duplicate.
- Choosing a different time offers "Add another session" as an explicit action.

Plan:
- Scheduled sessions render as calendar blocks.
- Multiple sessions for the same Activity can appear on the same day or different days.
- Tapping a block opens the Activity/session context.
- Move and unschedule operate on the selected session, not accidentally on every session for the Activity.

Happy path:
1. User opens a to-do that already has a 9:30 AM session.
2. User chooses another available slot later in the day.
3. Kwilt confirms this as another session, creates one provider event, and stores a managed binding.
4. Plan shows both blocks, each linked to the same Activity.

## Existing Product Relationship

This enhances Activity scheduling and Plan calendar blocks. It does not replace Quick Add, due dates, reminders, recurrence, Focus, or Plan recommendations.

The release should reuse:
- Activity Detail Schedule drawer.
- Plan block rendering, move, and unschedule behavior.
- Provider calendar event creation/recovery helpers.
- Existing `scheduledAt` rendering as a compatibility layer for the next active session.

## Buildable Slice

Must be real:
- Durable representation for more than one managed schedule session per Activity.
- Exact duplicate prevention for same Activity + same time window + same provider calendar.
- Activity Detail schedule state that distinguishes no session, existing session, and add another session.
- Plan rendering for multiple sessions of one Activity.
- Session-specific move and unschedule for managed provider events.
- Regression tests around duplicate prevention and multi-session derivation.

Can be thin or temporary:
- Session list UI can be compact and limited to upcoming sessions.
- `scheduledAt` and legacy provider fields can remain as derived compatibility fields for the next active session.
- Historical completed/cancelled session display can be deferred or hidden.
- Analytics can start with existing schedule events plus a source/session count property if low-cost.

Intentionally excluded:
- Recurrence migration.
- Bulk multi-session planning.
- AI schedule splitting.
- Provider webhook reconciliation.
- External-calendar cleanup for duplicates already created before the release.

## Release Channel

`TestFlight build` - this needs real provider calendar behavior, real device calendar/account state, and Andrew's dogfooding flow. A local build can catch UI and model bugs, but the learning only counts when provider writes, recovery, Plan rendering, and retry behavior work together in a realistic calendar.

## Brand-Goodwill Guardrails

- Make additional sessions explicit; never hide it behind a repeated Schedule tap.
- Use plain copy: "Already scheduled there" and "Add another session."
- Do not introduce productivity-app language like optimize, crush, or plan your whole day.
- Never create a duplicate provider event when Kwilt can find an existing matching event.
- If Kwilt cannot confirm/link a provider event, show a check-calendar message and avoid mutating Activity schedule state without a binding.

## Reversibility

The release is reversible if session data is additive and optional:
- Existing single-session Activities continue to work through derived `scheduledAt`.
- Hiding the feature can suppress "Add another session" while preserving the first/next session behavior.
- Session rows can remain as non-rendered history if the UI is rolled back.
- Avoid destructive migrations from `scheduledAt` into sessions until the model proves itself.

## Permanent Product Threshold

Make this accepted product capability when dogfooding shows that:
- Multi-session scheduling happens naturally for real Activities.
- The user understands why duplicate same-time scheduling is blocked.
- Move/unschedule behavior feels predictable per block.
- No new confusion appears between sessions, recurrence, due dates, and reminders.
