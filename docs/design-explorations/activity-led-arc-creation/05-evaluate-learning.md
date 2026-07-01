# Evaluate Learning: activity-to-identity-arc-creation

## Learning Questions

- Do concrete-first users understand that they can start from the activity itself?
- Does intrinsic motivation copy make "because I enjoy it" feel accepted rather than trivialized?
- Does the generated Arc still feel like an identity direction, not a hobby tracker?
- Does the becoming bridge guide the user toward a plausible future self without feeling heavy or fake?
- Does the hard-scene prompt help difficulty feel formative rather than discouraging?
- Does conditional branching improve completion without making the survey feel heavier?
- Does this help adults too, or only teen/young users?

## Evidence That Supports The Bet

- A user can create an Arc from "Tennis" without needing translation help.
- The reveal language earns a reaction like "that's who I want to become" or "that sounds like me."
- Users choose intrinsic motivations instead of falling back to `unsure`.
- No observed confusion about whether Kwilt will track sports stats or practices.
- The branch does not increase visible abandonment in first-Arc creation.

## Evidence That Disconfirms The Bet

- Users still stall at the first direction question.
- Users enter activities but reject the generated Arc as too activity-like, too deep, too vague, or too serious.
- Users think Kwilt is becoming a sports/practice tracker.
- The branch makes the survey feel longer for users who already knew their identity direction.

## Brand-Goodwill Signal

The experience should feel like permission to be plain: "I like tennis" is treated as a good enough beginning. The user should not feel analyzed, corrected, or upgraded into self-help language.

## Decision Rule

Proceed to permanent implementation if at least three concrete-first observations complete the flow and recognize the generated Arc without external interpretation. Revise if completion improves but generated language feels too abstract. Retire the branch if users find it confusing or think it changes Kwilt into activity tracking.

## Instrumentation

For the learning release:
- Manual observation notes for local/TestFlight sessions.
- Optional analytics later: branch entered, activity text present, motivation selected, survey completed, reveal accepted/tweaked.
- Qualitative feedback prompt after reveal: "Did this sound like what you meant?"

Do not track:
- Specific teen activity text in analytics.
- Performance, practice count, ranking, or sports outcomes.
- Any sensitive free-text content beyond normal persisted survey/Arc generation context.

## Expected Next Action

If the local branch works, write the implementation plan against the existing Arc survey package and presenters, then build behind normal app release gates.
