# Converge: To-do Schedule Sessions

## Qualitative Scoring

| Alternative | Persona fit | System fit | Trust | Multi-session fit | Risk |
| --- | --- | --- | --- | --- | --- |
| Activity Session Ledger | Strong | Medium | Strong | Strong | Medium data/model work |
| Linked Activity Occurrences | Medium | Medium | Medium | Medium | Task clutter and recurrence confusion |
| Single Scheduled Session Plus Explicit Move | Medium | Strong | Strong | Weak | Leaves real job unsolved |
| Calendar-Only Additional Sessions | Weak | Medium | Weak | Medium | Provider truth and expired-access fragility |
| Focus Sessions As The Repeated Unit | Medium | Strong | Medium | Weak | Solves history, not future planning |

## Chosen Alternative

Choose **Activity Session Ledger**.

The product should treat scheduled work blocks as sessions owned by an Activity. One Activity may have zero, one, or multiple scheduled sessions. Each session owns its own calendar binding. Existing surfaces can continue to use a derived "next session" so the release does not require a full redesign.

## Capability Delta

Today, the user cannot:
- Safely schedule the same Activity more than once without creating duplicate-looking to-dos or risking overlapping calendar events.
- Tell whether Schedule means "move the current block" or "add another block."
- Retry a shaky calendar commit without fear of duplicate provider events.

After this concept ships, the user can:
- See that a to-do already has a scheduled session.
- Move or unschedule that existing session.
- Add another session at a different time when the work needs more than one sitting.
- Trust Kwilt to link existing matching events instead of creating duplicate same-time blocks.

Still intentionally not possible:
- A one-tap exact duplicate of the same Activity at the same time.
- Turning a second session into a repeat rule by accident.
- Treating scheduled sessions as due dates, reminders, Focus automation, or Screen Time protection triggers.
- Scheduling unbounded session plans that become a hidden backlog.

## Reductive Design Pass

Smallest elegant version:
- Add a session-aware scheduling contract, not a new planning screen.
- Keep Activity Detail and Plan as the only user-facing surfaces.
- Let one derived next session feed existing `scheduledAt` rendering during V1.
- Add an explicit "Add another session" path only when the Activity already has a scheduled session.

Enhance existing features:
- Activity Detail Schedule drawer becomes context-aware.
- Plan blocks continue to open Activity detail / event peek behavior.
- Existing move and unschedule behavior is reused per session.

Refuse to add:
- A "Sessions" dashboard.
- A generic Plan object.
- A recurring-rule shortcut in the session flow.
- Session analytics, time totals, streaks, or progress scores.
- AI auto-scheduling additional sessions in V1.

What would feel like clutter:
- Showing every historical session in the to-do list.
- Making the user choose between "task" and "session" during normal capture.
- Asking for Goal/Arc alignment before scheduling a session.

## Activation Path

The feature activates only in scheduling moments:
- Activity Detail when the Activity already has a scheduled session.
- Plan when the user attempts to schedule an Activity that already has a session.
- Retry/recovery paths after a calendar write may have succeeded.

Education should be contextual, not promotional:
- The primary action can read "Move session" when the selected time matches or edits the existing next session.
- The additive action can read "Add another session" when the selected time differs.
- Exact duplicates should quietly resolve to the existing session or show "Already scheduled there."

Natural adoption signal:
- Andrew schedules the same real to-do into two non-overlapping future blocks and later moves/unschedules one block without duplicating the Activity or cleaning up the calendar.

## Accepted Trade-offs

- Accept a modest data-model extension because the current single binding cannot honestly represent the desired behavior.
- Keep V1 deterministic and explicit rather than introducing AI or automatic multi-session planning.
- Keep one derived next-session compatibility field for existing surfaces, even if the durable model becomes session-based.

## Rejected Trade-offs

- Do not force every additional session into a new Activity occurrence in V1.
- Do not solve this as recurrence.
- Do not rely on provider-only events as the durable source of truth.
- Do not expose a session-management table unless dogfooding proves it is needed.

## System Implications

Likely model direction:
- Add `ActivityScheduleSession` or `activity.scheduleSessions` as the durable list.
- Each session includes id, activityId, start, end, calendar binding, createdBy/source, status, createdAt, updatedAt.
- Derive `scheduledAt` and `calendarBinding` from the next active session for backward compatibility until surfaces are migrated.
- Update Plan to render session blocks rather than one block per Activity when sessions exist.
- Update duplicate prevention to match by activity/session/time window before creating a provider event.

## Stated Bet

We're betting that Marcus experiences multi-session scheduling as one to-do with several intentional work blocks, not as several duplicate tasks. If that turns out not to be true, we'd revisit by using linked Activity occurrences for cases where each block needs its own checklist or completion state.

## Success Signal

The user can schedule an Activity for more than one non-overlapping session, cannot accidentally create the same session twice, and can explain the model in plain language: "This to-do has two planned times."
