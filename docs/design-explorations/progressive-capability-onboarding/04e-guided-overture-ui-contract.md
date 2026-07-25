# Guided Overture Lab: UI Contract

## Job

An internal tester needs to replay Kwilt's proposed suite-level introduction without changing their account, completing onboarding, granting permissions, or creating data. This lets us test whether people quickly understand the range of Kwilt and can choose a useful first task.

## Primary action

Play the portfolio concept, then choose the task you would start with.

## What must be visible

- A Dev Tools entry that clearly labels this as an isolated onboarding experiment.
- A production-shaped portfolio flow immediately after the Dev Tools trigger; the lab menu is secondary.
- Two honest lab modes:
  - **Portfolio concept** previews the broader suite and carries each selection into Agent with its availability boundary.
  - **Live capabilities** contains only tasks with a current first-value contract, but still begins in Agent.
- A user-paced sequence of concrete tasks with `Back`, `Next`, `Start here`, and `Skip to Kwilt`.
- A final chooser with the same tasks still visible.
- `Something else` for an unlisted need.
- Replay and reduced-motion paths.
- A non-blank Agent landing that asks one task-specific question and does not repeat the tour.

## What appears later

- Account-based entry rules and experiment assignment.
- Production analytics, remote offer configuration, and capability ranking.
- Permission requests, which remain owned by the selected capability.
- Returning-user resume and invitation behavior.

## What this slice must not add

- No changes to automatic first-time UX or its completion state.
- No global permission screen.
- No Goal, Arc, To-do, or notification mutations from the concept preview.
- No fake routes for Money, Games, Stories, or other future capabilities.
- No personalization claims based on age, family status, or inferred identity.
- No AI-generated offer copy.

## Reuse map

- Existing Kwilt colors, typography, spacing, buttons, icons, and page shell.
- Existing Agent route plus capability-owned proposal and handoff paths.
- Native `AccessibilityInfo` reduced-motion setting.
- Existing Dev Tools card and section grammar.

## Required states

1. Tour: one task scene at a time; nothing advances without an explicit action.
2. Start here: the selected task opens Agent with a deterministic opening question and bounded hidden context.
3. Skip: Agent opens with an unscoped but useful opening question.
4. Chooser: all selected offers are readable and tappable after the final scene.
5. Lab menu: a secondary surface for portfolio, live-set, and reduced-motion replay.
6. Reduced motion: retain every scene and control while suppressing transition animation.

## Runtime proof path

`Settings -> Developer tools -> Play Guided Overture -> Next/Back -> Start here -> contextual Agent opening`

Then repeat with `Skip to Kwilt`, the final chooser, the live task set, and reduced motion. Verify every exit opens Agent with the expected first question and no automatic mutation.

## Reduction pass questions

- Can the mode explanation lose a sentence without becoming misleading?
- Can a scene be understood from the task label and result alone?
- Does any offer describe a domain instead of an action?
- Does any visual compete with the task choice?
- Does the experience remain coherent when animation is disabled?
