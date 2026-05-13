---
feature: goal-partners
audiences: [audience-private-accountability-seekers]
personas: [David]
hero_jtbd: jtbd-invite-the-right-people-in
job_flow: job-flow-david-invite-the-right-people-in
serves:
  - jtbd-invite-the-right-people-in
  - jtbd-carry-intentions-into-action
  - jtbd-trust-this-app-with-my-life
briefs:
  - goal-partners-post-share-experience
status: shipping
last_reviewed: 2026-05-13
---

# goal-partners

Helps David manage the private support circle attached to a goal without turning the goal page into a social feed.

## Surfaces in this feature slice

- `src/features/goals/ShareGoalDrawer.tsx` - invite-only share drawer with channel options and the privacy line.
- `src/features/goals/CheckinApprovalSheet.tsx` - action-triggered approval moment for user-approved check-ins.
- `src/features/goals/PendingCheckinDraftCard.tsx` - recoverable draft card in the Partners sheet `Check-ins` tab.
- `src/features/goals/GoalFeedSection.tsx` - renders user-authored check-ins as the hero feed item and quiets automatic progress signals.
- `src/services/checkinDrafts.ts` and `src/store/useCheckinDraftStore.ts` - policy layer and persistent store for the per-goal draft queue.

## Notes

This manifest is a documentation feature slice over code that currently lives in `src/features/goals`. The top-level `goals` manifest remains anchored on Marcus' core goal-progress job; this slice is anchored on David's private-accountability job. The shared-goal surfaces should deepen a goal through chosen support, not introduce public feed or leaderboard behavior.
