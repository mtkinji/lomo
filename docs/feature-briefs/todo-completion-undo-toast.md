---
id: brief-todo-completion-undo-toast
title: To-do completion Undo toast
status: accepted
audiences: [audience-burned-out-productivity-power-users]
personas: [Marcus]
hero_jtbd: jtbd-move-the-few-things-that-matter
job_flow: job-flow-marcus-move-the-few-things-that-matter
serves: [jtbd-carry-intentions-into-action, jtbd-trust-this-app-with-my-life]
related_briefs: [todo-organization-triage]
owner: andrew
last_updated: 2026-07-10
---

# To-do completion Undo toast

## Context
Completion works across Kwilt's main Activity surfaces, but acknowledgement and recovery are inconsistent: Activity Detail has a short receipt without an action, while list-oriented surfaces can move the item away immediately with no local Undo.

## Target audience
Burned-out productivity power users need completion to close the loop without becoming more task-management ceremony.

## Representative persona
Marcus wants to record progress and move on, while retaining confidence that an accidental tap is easy to recover from.

## Aspirational design challenge
How might we help Marcus trust that completion landed and recover from a mistaken tap, while preserving immediate, low-ceremony follow-through?

## Hero JTBD
`jtbd-move-the-few-things-that-matter` — completion is the concrete evidence that a chosen commitment moved.

## Job flow step
`job-flow-marcus-move-the-few-things-that-matter`, step 6: capture progress without maintaining the system. Current delivery is 4/5; this removes a small but consequential recovery gap.

## JTBD framing
When a to-do is completed, the user wants a calm, reversible receipt so they can close the loop (`jtbd-carry-intentions-into-action`) while trusting that a mistaken tap will not cost control (`jtbd-trust-this-app-with-my-life`).

## Design
- Completing a to-do from Activities, Activity Detail, Goal Detail, or Plan shows the existing light toast.
- Copy is `To-do complete` with a single `Undo` action.
- The toast remains available for 5 seconds.
- Compact surfaces show it immediately. Activity Detail shows it after the existing completion animation.
- Undo restores the prior Activity status and `completedAt` only when the Activity still represents that completion, preserving unrelated later edits and refusing to overwrite a later re-completion.
- Existing haptic, sound, celebration, Screen Time, analytics, progress-signal, and check-in behavior remains unchanged. Undo does not retract side effects that already fired.

## UI contract
Job: When a completion moves a to-do out of the current working set, the user needs immediate recovery so they can trust the action without slowing down.

Primary action: Undo the completion.

Must show: A concise completion receipt and `Undo`.

Reveal later: Nothing.

Must not add: Confirmation dialogs, settings, persistent history, extra celebration, or new notification infrastructure.

Reuse map: Completion receipt → `ToastHost`/`Toast`; action → existing toast action button; visual treatment → existing light deletion toast.

Behavior sources: User request; existing Activity deletion Undo pattern; existing Activity Detail post-animation toast.

Unresolved decisions: None.

Required states: Completed, successfully undone, stale Undo after a later state change, and toast suppression/queue behavior.

Proof path: Native Activities list, Activity Detail, Goal Detail, and Plan activity peek on iOS.

## Success signal
Each primary completion path shows the receipt; Undo returns the item to its prior completion state; a stale Undo does not overwrite a newer completion.

## Spec refinement
- The request explicitly selects a toast and Undo, so no broader notification design is needed.
- Five seconds matches the existing destructive Undo receipt and gives the action a practical tap window.
- The restoration guard is keyed to the completion timestamp represented by the toast.
- External side-effect reversal is intentionally deferred because those systems already treat completion as an emitted event, not a transaction.

## Open questions
None for implementation.
