---
feature: activities
audiences: [audience-burned-out-productivity-power-users]
personas: [Marcus]
hero_jtbd: jtbd-move-the-few-things-that-matter
job_flow: job-flow-marcus-move-the-few-things-that-matter
serves:
  - jtbd-move-the-few-things-that-matter
  - jtbd-carry-intentions-into-action
  - jtbd-capture-and-find-meaning
  - jtbd-trust-this-app-with-my-life
briefs:
  - auto-schedule
  - calendar-export-ics
  - focus-mode-education
  - geolocation-activity-offers
  - keyboard-input-safety
  - kwilt-text-coach
status: shipped
last_reviewed: 2026-05-12
---

# activities

Helps Marcus turn the few commitments that matter into concrete action and capture progress without maintaining another task system.

## Surfaces in this folder

- `ActivitiesScreen.tsx` - primary activity inventory and view surface.
- `ActivityCoachDrawer.tsx`, `QuickAddDock.tsx`, and `QuickAddSheets.tsx` - low-friction capture and creation.
- `ActivityDetailScreen.tsx` and related detail fields - inspect and refine a concrete action.
- `KanbanBoard.tsx`, `InlineViewCreator.tsx`, and view templates - alternate ways to organize activity without changing the underlying job.
- `activitySearchAlgorithm.ts` - local findability for captured work.

## Notes

Activities are the bridge between intention and evidence. Views and boards should help Marcus decide and capture, not create a second productivity system to maintain.
