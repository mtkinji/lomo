# Diverge: To-do Schedule Sessions

## Axis Of Variation

Object model choice: should multiple scheduled work blocks live inside one Activity, become linked Activity occurrences, or stay outside the Activity model as calendar-only context?

## Alternative A: Activity Session Ledger

One Activity owns a small list of managed schedule sessions. Each session has its own start, end, calendar binding, source, and status. Existing surfaces keep a primary/next session derived from that list so the app does not need to redesign every scheduled-Activity surface at once. Activity Detail shows "Scheduled" when one session exists, with actions to move the next session, unschedule it, or add another session. Plan renders each session as a block that opens the same Activity.

Audience/persona fit: Strong for Marcus. It keeps one meaningful to-do intact while allowing real multi-sitting work.

Design-challenge answer: Helps Marcus intentionally schedule multiple sessions without creating duplicate to-dos or duplicate calendar events.

System-fit note: Extends the current model from one `scheduledAt` and one `calendarBinding` to a child-session shape. Existing `scheduledAt` can remain a denormalized next-session compatibility field during V1.

Best when: The user thinks "this is one to-do I will work on more than once."

Fails when: The sessions are actually separate sub-tasks with different outcomes or owners.

Primer anti-pattern check: Pass. Activity remains the day-level planning object; session rows are infrastructure, not a new dashboard.

## Alternative B: Linked Activity Occurrences

Each additional scheduled session becomes a linked Activity occurrence, similar in spirit to recurring occurrences or linked steps. The parent Activity remains the conceptual to-do, while each occurrence owns its own `scheduledAt`, `calendarBinding`, status, and completion. Plan and To-dos show occurrences as separate actionable cards, with parent linkage visible in Activity Detail.

Audience/persona fit: Mixed for Marcus. It gives every calendar block a clean Activity shape, but risks task-list clutter and the feeling of one to-do multiplying.

Design-challenge answer: Prevents duplicate events because each scheduled block is a distinct Activity occurrence, but it shifts the user's mental model from "one to-do, several sessions" to "several related to-dos."

System-fit note: Fits existing Activity persistence and scheduled fields better than a new child table, but borrows from recurrence semantics and could blur with repeat rules.

Best when: Each session has different steps, different completion state, or needs independent checklist evidence.

Fails when: The user simply wants two calendar blocks for the same piece of work.

Primer anti-pattern check: Risk. It may create productivity-app volume and maintenance work unless the UI keeps occurrences visually subordinate.

## Alternative C: Single Scheduled Session Plus Explicit Move

Keep the current one-Activity-one-scheduled-block model. If the Activity is already scheduled, the Schedule action becomes Move/Reschedule. Exact-overlap commits are blocked or linked to the existing event. To schedule the same work again, the user must duplicate the Activity or create a new related Activity manually.

Audience/persona fit: Good for immediate trust, weak for multi-session work. Marcus gets fewer duplicate events but still lacks an honest path for "work on this again."

Design-challenge answer: Solves accidental duplicate scheduling but intentionally does not solve multiple sessions.

System-fit note: Minimal code and data change. Mostly copy/state logic around Activity Detail and Plan.

Best when: The urgent release goal is to stop calendar pollution and avoid schema work.

Fails when: Multi-session tasks are common in dogfooding, because the product keeps forcing a workaround.

Primer anti-pattern check: Pass, but incomplete. It avoids clutter while leaving an important job underserved.

## Alternative D: Calendar-Only Additional Sessions

Keep one canonical Activity schedule in Kwilt, but let users add additional external calendar events linked back to the Activity without storing those sessions as first-class Kwilt data. Plan reads them back from the provider calendar and reconciles by event link/title/time. Activity Detail can say "Also on calendar" when provider reads find related blocks.

Audience/persona fit: Weak to medium. It keeps local data small but relies too much on external calendar state for a trust-critical feature.

Design-challenge answer: Allows multiple sessions without adding a local session model, but makes offline/local truth and unschedule/move semantics fragile.

System-fit note: Uses existing provider APIs and reconcile heuristics, but violates the current policy that scheduled state should have a durable managed binding.

Best when: The user only needs calendar visibility and never expects Kwilt to manage those extra sessions.

Fails when: Calendar access expires, events are edited externally, or the user expects Kwilt to move/unschedule all sessions.

Primer anti-pattern check: Risk. It makes the system feel less inspectable and could undermine trust.

## Alternative E: Focus Sessions As The Repeated Unit

Keep scheduling singular, but treat additional work sessions as Focus Sessions started from a scheduled Activity. The calendar may show only the main scheduled block; subsequent work is captured as focus/history rather than planned sessions.

Audience/persona fit: Good for "I worked on this more than once," poor for "I want to plan two future sittings."

Design-challenge answer: Captures actual multi-session effort, but does not help the user intentionally reserve time for multiple future sessions.

System-fit note: Avoids schedule-model change but shifts the feature into Focus and retrospection.

Best when: The product question is effort history, not calendar planning.

Fails when: The user knows ahead of time that the work needs two blocks.

Primer anti-pattern check: Pass if Focus stays user-started and not calendar-triggered. Still not the right primary answer.
