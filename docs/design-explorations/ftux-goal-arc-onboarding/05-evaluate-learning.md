# Evaluate Learning: ftux-goal-arc-onboarding

## Learning Questions

- Do users understand the task without needing Arc/Goal explanation first?
- Do deterministic questions cover common concrete starting points?
- Does paired output feel coherent, or do Arc and Goal feel redundant?
- Does landing on Arc detail make sense after starting with a concrete input?
- Does creating both objects reduce incompleteness compared with Goal-first plus optional Arc?

## Supporting Evidence

- User completes FTUX without choosing `Something else` repeatedly.
- User accepts or lightly tweaks generated Arc+Goal.
- User can describe the Arc as "who I am becoming" and Goal as "what I am working on."
- User understands why the Goal appears inside the Arc.
- Manual QA examples produce identity-shaped Arc names and concrete Goal titles.

## Disconfirming Evidence

- Users ask why Kwilt created an Arc when they only entered a concrete thing.
- Users think the Arc and Goal are duplicates.
- Generated Arc names are activity-shaped.
- Users want to land on Goal detail instead of Arc detail.
- The flow feels too long before entering the app.

## Instrumentation

Suggested events, without raw free text:

- `ftux_goal_arc_started`
- `ftux_goal_shape_selected`
- `ftux_identity_bridge_selected`
- `ftux_resistance_selected`
- `ftux_goal_arc_generated`
- `ftux_goal_arc_confirmed`
- `ftux_goal_arc_tweak_requested`
- `ftux_goal_arc_created`
- `ftux_landed_on_arc_detail`

Do not log:

- concrete free-text input,
- optional personal detail,
- raw generated narrative.

## Decision Rule

Proceed if manual QA and small TestFlight usage show the paired output is understood and accepted. Revise if the flow succeeds mechanically but users cannot explain the object relationship. Retire the paired FTUX model if users consistently experience the Arc as unwanted extra abstraction.
