# Evaluate Learning: live-better-goal-crossover

## Learning Questions

1. Does Blaire want Budget advice to become a Kwilt goal, or does she expect Budget to keep the advice inside budgeting tools?
2. Does an evidence-backed insight feel trustworthy enough to invite a goal?
3. Does the "live better" framing feel inspiring, or too broad and preachy?
4. Which activation moment works best: Plan, Budget Detail, post-review receipt, or Ask?
5. Is a deterministic/template goal draft good enough, or does the draft need AI shaping?
6. Does the handoff feel like a helpful crossover or like cross-promotion?
7. What is the minimum evidence summary needed without exposing too much financial detail?

## Evidence Plan

Supporting evidence:

- Blaire opens the goal draft from the insight card.
- She edits or accepts the draft rather than dismissing it immediately.
- She can explain the pattern behind the goal.
- The resulting goal produces at least one concrete Activity.
- She later references the goal during a spending decision.
- Qualitative feedback says the prompt felt calm and useful.

Disconfirming evidence:

- She reads the insight but does not want a goal.
- The prompt feels judgmental, generic, or like an ad for Kwilt.
- The handoff is confusing or technically brittle.
- The goal draft is too vague to act on.
- She wants budget-rule controls instead of a life goal.

Brand-goodwill evidence:

- Dismissals are clean and do not create pressure.
- The feature does not make Budget feel noisier.
- The evidence summary feels transparent and not invasive.

## Instrumentation

Track:

- `budget_pattern_insight_seen`
- `budget_pattern_insight_dismissed`
- `budget_goal_bridge_opened`
- `budget_goal_bridge_accepted`
- `budget_goal_bridge_edited`
- `budget_goal_bridge_handoff_failed`
- `budget_goal_bridge_fallback_used`

Do not track:

- Raw transaction names in analytics.
- Full goal text if it may contain sensitive financial context.
- Cross-app behavior that was not explicitly part of the handoff.

## Decision Rule

Proceed to permanent implementation if two or more real/self-use sessions produce an accepted or meaningfully edited goal draft, and the handoff is understood without explanation.

Revise if the insight is valued but the goal handoff is not; in that case, keep Budget advice as budget-rule suggestions first.

Retire or defer if the prompt creates shame, confusion, promotional feeling, or no behavior change.

## Expected Next Action

Create a small implementation plan for a Plan-tab or Budget Detail insight card, a local goal draft preview, and a confirmed handoff/fallback path. Do not build a broad financial advice agent yet.
