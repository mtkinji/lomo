---
feature: plan
audiences: [audience-burned-out-productivity-power-users]
personas: [Marcus]
hero_jtbd: jtbd-move-the-few-things-that-matter
job_flow: job-flow-marcus-move-the-few-things-that-matter
serves:
  - jtbd-move-the-few-things-that-matter
  - jtbd-carry-intentions-into-action
  - jtbd-capture-and-find-meaning
  - jtbd-trust-this-app-with-my-life
  - jtbd-make-sense-of-the-season
  - jtbd-recover-when-i-drift-from-an-arc
briefs:
  - auto-schedule
  - background-agents-weekly-planning
  - calendar-export-ics
  - desktop-app
status: shipped
last_reviewed: 2026-05-09
---

# plan

Helps Marcus decide the next honest action and place it in time without rebuilding another planning system.

## Surfaces in this folder

- `PlanScreen.tsx`, `PlanPager.tsx`, and `PlanRecsPage.tsx` - primary planning canvas and recommendations.
- `PlanCalendarLensPage.tsx`, `PlanDateStrip.tsx`, and event peeks - calendar/time context.
- `PlanScheduleApplyPage.tsx` and `PlanKickoffDrawerHost.tsx` - applying schedule decisions.
- `PlanAvailabilitySettingsScreen.tsx` and `PlanCalendarSettingsScreen.tsx` - planning constraints and integrations.
- `StreakWeeklyRecapCard.tsx` - recap and continuity signal.

## Notes

Plan should reduce decision load. It should help Marcus choose and carry one next action, not reward volume or create maintenance work.
