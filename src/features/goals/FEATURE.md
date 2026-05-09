---
feature: goals
audiences: [audience-burned-out-productivity-power-users]
personas: [Marcus]
hero_jtbd: jtbd-move-the-few-things-that-matter
job_flow: job-flow-marcus-move-the-few-things-that-matter
serves:
  - jtbd-move-the-few-things-that-matter
  - jtbd-carry-intentions-into-action
  - jtbd-invite-the-right-people-in
  - jtbd-trust-this-app-with-my-life
briefs:
  - arc-goal-lifecycle-and-limits
  - growth-evangelism-shared-goals
  - social-goals-auth
  - social-dynamics-evolution
status: shipped
last_reviewed: 2026-05-09
---

# goals

Helps Marcus keep the few commitments worth carrying visible and actionable, without turning progress into another productivity system to maintain.

## Surfaces in this folder

- `GoalsScreen.tsx` - primary goals inventory and management surface.
- `GoalCreationFlow.tsx` - turns an Arc-level intention into a concrete Goal.
- `GoalFeedSection.tsx` - renders shared-goal progress signals and accountability context.
- `ShareGoalDrawer.tsx` - starts the invite/share flow from a Goal.
- `JoinSharedGoalDrawerHost.tsx` and `JoinSharedGoalScreen.tsx` - accept shared-goal invitations.
- `CheckinComposer.tsx` - captures accountability/progress signals on a Goal.

## Notes

The core goals surface serves Marcus' focus job; the share and join surfaces extend the folder into private accountability. The shared-goal pieces must preserve the same canvas-first posture: sharing deepens a Goal, it does not turn Kwilt into a social feed.
