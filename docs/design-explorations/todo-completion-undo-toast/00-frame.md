# Frame: To-do Completion Undo Toast

## What the user said
> I should get a toast notification on to-do completion with an "Undo" affordance in it.

## Restated in user voice
When I mark a to-do complete, I want a calm, reversible receipt so I know the action landed and can immediately recover from an accidental tap without maintaining or reopening the item.

## Target audience
`audience-burned-out-productivity-power-users` — people who want trusted follow-through without another system to manage.

## Representative persona
Marcus is moving concrete work from intention to done, but does not want task-management ceremony.

- Current situation: He checks off a to-do from whichever Kwilt surface is already in front of him.
- What he's trying to do: Record real progress and keep moving.
- Emotional state or tension: He wants confidence that the action landed without losing control.
- What would make this feel wrong: A confirmation dialog, celebration stack, or irreversible disappearance.

## Hero anchor
`jtbd-move-the-few-things-that-matter` — completion closes the loop on meaningful action.

## Job flow step
Marcus flow, step 6: capture progress without maintaining the system. Delivery is currently 4/5; completion works, but its acknowledgement and recovery are inconsistent across surfaces.

## Active anchors
- `jtbd-carry-intentions-into-action` — completion is the loop-closing moment.
- `jtbd-trust-this-app-with-my-life` — a reversible state change makes the system feel safe and inspectable.

## System alignment
Constraint posture: `Fit the system`

Current system facts:
- Existing surface: To-do list rows, Activity Detail action dock, Goal Detail rows, and Plan activity peek.
- Existing user flow: Tapping completion updates Activity status immediately.
- Existing domain/data model: `Activity.status`, `completedAt`, and `updatedAt` already carry completion state.
- Existing technical affordances: The global toast host already supports `actionLabel` and `actionOnPress`.
- Existing UX/copy conventions: Activity deletion already uses a five-second light toast with Undo.

Constraints to preserve:
- Completion remains immediate; no confirmation step.
- Undo restores state without replacing later user changes.
- Existing celebrations, haptics, sound, Screen Time, and analytics paths continue to run.

Constraints we may challenge:
- None.

Design implication:
Reuse the existing light toast and Undo grammar, and add no new surface, setting, or notification concept.

## Aspirational design challenge
How might we help Marcus trust that completion landed and recover from a mistaken tap, while preserving immediate, low-ceremony follow-through?

## Out of scope
Long-lived undo history, bulk undo, push notifications, and reversing external side effects such as already-created progress signals.

## Open question
None for the bounded release.
