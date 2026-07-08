# Evaluate Learning: Activity Session Substrate

## Learning Questions

1. Does a quiet Activity-session substrate improve scheduling trust without adding visible complexity?
2. Does a next-session projection keep existing Activity Detail, Today, and Plan surfaces coherent?
3. Does the domain model make future Focus and Chapters integration easier without pulling those features into this release?
4. Do users understand multiple scheduled blocks as planned attempts for one Activity, not as time tracking?
5. Does real TestFlight calendar behavior prove that retries, provider recovery, moves, and unschedules do not create duplicate events?

## Assumptions To Test

- An Activity can remain the durable intention while sessions represent bounded attempts.
- The first useful session type is scheduled time, not Focus time or retrospective evidence.
- Multiple sessions for the same Activity are valuable when they happen at different moments, but exact same-window duplicates should be prevented.
- Compatibility projection from sessions back to `scheduledAt` and calendar binding fields can preserve existing product behavior during the transition.
- Future Focus and Chapters integration should be enabled by stable identifiers and helper boundaries, not by visible UI in this release.

## Evidence To Collect

Confirming evidence:
- A real Activity can be scheduled into two or more distinct calendar blocks.
- Retrying a failed or ambiguous calendar write recovers the existing provider event instead of creating another duplicate.
- Existing surfaces continue to show the next useful scheduled time consistently.
- Moving or unscheduling one session does not mutate unrelated sessions for the same Activity.
- The implementation gives Focus and Chapters a clearer future attachment point without requiring immediate changes.

Disconfirming evidence:
- Users perceive the feature as a session dashboard, time tracker, or extra maintenance system.
- Multiple scheduled sessions create confusing state in Activity Detail, Today, or Plan.
- Duplicate-prevention rules block legitimate rescheduling.
- Compatibility projection makes the code harder to reason about than a narrow one-off fix.
- Focus or Chapters future fields leak into visible copy before they have real behavior.

## Instrumentation

Track only behavior needed to understand reliability and fit:
- `activity_session_scheduled_created`
- `activity_session_scheduled_duplicate_prevented`
- `activity_session_projection_updated`
- `activity_session_moved`
- `activity_session_unscheduled`
- `calendar_event_recovered_for_activity_session`
- `calendar_event_created_for_activity_session`

Avoid tracking:
- Raw calendar titles or private event contents.
- Time totals framed as productivity scores.
- Missed-session counts that imply shame or compliance scoring.

## Decision Rule

Proceed from learning release to accepted architecture when:
- At least three real dogfood Activities can carry multiple scheduled sessions without cleanup.
- Activity Detail, Today, and Plan agree on the next scheduled time.
- Calendar provider retries do not create overlapping duplicates.
- The user does not experience sessions as another object to maintain.
- The helper boundary makes the next Focus or Chapters integration simpler than it would be without the substrate.

Hold or narrow the approach when:
- The same value can be delivered with less domain surface.
- Existing screens become less trustworthy during the compatibility phase.
- The substrate starts pulling in dashboard, analytics, or history-management behavior before the scheduled-session problem is stable.
