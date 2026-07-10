# Evaluate Learning: To-do Completion Undo Toast

## Learning questions
- Is the toast visible long enough to recover from an accidental completion?
- Does it feel like a quiet receipt rather than another celebration?
- Does Undo behave consistently when the completed item moves between sections?

## Evidence plan
- Exercise Activities, Activity Detail, Goal Detail, and Plan completion paths in the native app.
- Confirm the completed item returns to its prior state after Undo.
- Confirm an old Undo action cannot revert a later re-completion.

## Instrumentation
Reuse `activity_completion_toggled`; a successful Undo emits the existing transition back to the prior status. Add no new tracking for this slice.

## Disconfirming signals
- Toast competition with celebrations or drawers makes Undo hard to find.
- Undo restores the wrong state or overwrites a newer completion.
- Repeated receipts feel noisy during ordinary use.

## Decision rule
Keep the capability when all primary paths pass runtime verification and self-use does not reveal attention collisions. Otherwise refine timing or surface-specific delivery without adding a settings layer.

## Expected next action
Verify in the iOS simulator and observe during normal self-use before changing the pattern further.
