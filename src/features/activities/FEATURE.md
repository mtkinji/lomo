---
feature: activities
audiences: [audience-burned-out-productivity-power-users, audience-aspirational-family-organizers]
personas: [Marcus, Maya]
hero_jtbd: jtbd-move-the-few-things-that-matter
job_flow: job-flow-marcus-move-the-few-things-that-matter
job_flows:
  - job-flow-marcus-move-the-few-things-that-matter
  - job-flow-maya-move-family-life-forward
serves:
  - jtbd-move-the-few-things-that-matter
  - jtbd-carry-intentions-into-action
  - jtbd-put-intention-before-impulse
  - jtbd-capture-and-find-meaning
  - jtbd-trust-this-app-with-my-life
briefs:
  - activity-areas
  - auto-schedule
  - calendar-export-ics
  - due-date-reminders
  - dynamic-next-best-action
  - focus-mode-education
  - focus-protection
  - geolocation-activity-offers
  - keyboard-input-safety
  - kwilt-text-coach
  - meaningful-first-app-access
  - places-system
  - screen-time-controls-contextual-setup
  - tag-groups
  - tag-vocabulary-system
  - todo-action-contexts
  - todo-dependencies
  - todo-list-grouping-config
  - todo-organization-triage
status: shipped
last_reviewed: 2026-06-25
---

# activities

Helps users like Marcus and Maya turn the few commitments that matter into concrete action and capture progress without maintaining another task system.

## Surfaces in this folder

- `ActivitiesScreen.tsx` - primary activity inventory and view surface.
- `ActivityCoachDrawer.tsx`, `QuickAddDock.tsx`, and `QuickAddSheets.tsx` - low-friction capture and creation.
- `ActivityDetailScreen.tsx` and related detail fields - inspect and refine a concrete action.
- `activityScheduleSlots.ts` - pure manual schedule-slot validation for the Activity detail schedule sheet.
- `KanbanBoard.tsx`, `InlineViewCreator.tsx`, and view templates - alternate ways to organize activity without changing the underlying job.
- `activitySearchAlgorithm.ts` - local findability for captured work.

## Notes

Activities are the bridge between intention and evidence. Views, boards, and priority surfaces should help users decide and capture, not create a second productivity system to maintain.

The To-dos list uses auto-hiding chrome while users scroll a populated list: the page header and global bottom nav hide together on confirmed downward scroll intent, then reveal after upward scroll intent or at the top of the list. Drag start is direction-neutral, top pull-down overscroll keeps chrome visible, bottom bounce is clamped so it does not cause reveal jitter, and momentum settle only confirms a top reveal after the scroll stream has already reached the top. The view toolbar and Quick Add dock stay available as local working controls. Matching top and bottom fades protect those controls while still letting softened list content pass underneath them. Keep the behavior aligned with `docs/todos-inventory-scroll-header-spec.md` and the pure contract tests in `inventoryChrome.test.ts`.
