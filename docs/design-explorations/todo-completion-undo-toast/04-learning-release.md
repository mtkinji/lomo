# Learning Release: To-do Completion Undo Toast

## Concept To Build
Every primary in-app to-do completion shows a calm five-second receipt with Undo.

## Capability Delta
Today, the user cannot reliably recover from completion at the moment an item moves away.

After this release, the user can reverse that completion from the global toast.

Still intentionally not supported: persistent undo history, bulk undo, or retracting external side effects.

## User Experience
The user completes a to-do from Activities, Activity Detail, Goal Detail, or Plan. Kwilt keeps the existing completion response, then shows `To-do complete` with `Undo`. Tapping Undo restores the prior Activity completion state and dismisses the toast.

## Existing Product Relationship
Enhances the existing completion handlers and global toast host; replaces no surface.

## Buildable Slice
Must be real:
- Toast action on all primary completion paths.
- Guarded restoration that only applies to the completion represented by that toast.
- Existing completion behavior remains intact.

Can be thin or temporary:
- Manual self-use observation is sufficient for the first learning pass.

Intentionally excluded:
- New settings, queues, migrations, or server state.

## Release Channel
Production-default. This is a low-risk, reversible extension of an existing state change and toast pattern.

## Brand-Goodwill Guardrails
- Calm copy and light styling.
- No extra celebration or pressure language.
- No confirmation before completion.

## Reversibility
Remove the toast calls and helper; there is no migration or new persisted data.

## Permanent Product Threshold
Keep it if the real completion paths remain understandable and Undo reliably restores the item without stale-state corruption.
