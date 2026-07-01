# Frame: object-creation-ux-system

## What the user said

> We need to enhance the survey questionnaire so it's more relevant and easy to have task success with. The new concept is to use FTUX to create a Goal first, then use that to discover what identity (Arc) the person wants.

## Restated in user voice

When I create something in Kwilt, help me start from what I can actually say, then guide me into the right object shape without making me learn the model first.

## Target audience

Primary: `audience-faith-and-values-driven-builders` because object creation must preserve Kwilt's identity-first promise.

Secondary: `audience-burned-out-productivity-power-users` because direct Goal creation must stay fast, concrete, and low-maintenance.

## Representative personas

Sarah wants her Goals to express who she is becoming, not just what she wants to accomplish.

Marcus wants to name the few commitments worth carrying without entering another elaborate planning system.

## Hero anchors

- `jtbd-see-who-im-becoming` - creation must reveal the identity direction underneath concrete progress.
- `jtbd-move-the-few-things-that-matter` - creation must turn intention into a concrete, movable Goal.

## Job flow steps

- Sarah, steps 2-4: find words for a direction, turn it into an Arc, and choose a Goal that expresses the Arc.
- Marcus, steps 2-4: name the few commitments that matter, turn one commitment into a concrete Goal, and break it into action.

## Friction we're addressing

FTUX, direct Goal creation, and direct Arc creation can easily become three separate questionnaires with different assumptions about what users know. That would make Kwilt feel less dependable. The deeper problem is not one question label; it is the absence of a shared creation grammar across objects.

## System alignment

Constraint posture: `Extend the system`

Current system facts:

- Existing surface: FTUX Goal+Arc onboarding now starts from concrete progress and creates both a first Goal and a linked Arc.
- Existing user flow: direct Goal creation is a lighter Agent Workspace flow; direct Arc creation still supports identity-led creation outside onboarding.
- Existing domain model: Arc is identity direction, Goal is concrete progress, Activity is action/evidence.
- Existing technical affordance: `packages/arc-survey` can hold deterministic survey configuration shared across flows.
- Existing UX convention: capture should be low-friction; alignment can be guided but should not feel like admin work.

Constraints to preserve:

- FTUX should end with coherent Arc -> Goal context, not a disconnected Goal.
- Direct Goal creation must remain faster than FTUX.
- Direct Arc creation must remain available for users who already know the identity direction.
- The app should not require users to understand object taxonomy before expressing intent.

Constraints we may challenge:

- Whether direct Goal creation should be mostly unguided.
- Whether direct Arc creation should start identity-first in every context.
- Whether shared deterministic question sets should live only in `packages/arc-survey` or expand into a broader object-creation package.

## Aspirational design challenge

How might we make every Kwilt object-creation flow feel like one dependable creation system, while letting each entry point ask only the minimum questions needed for that user's moment?

## Out of scope

- Redesigning Activity capture.
- Changing the Arc, Goal, or Activity data model.
- Adding a new creation hub screen.

## Open question

Should direct Goal creation adopt a minimal guided version of the FTUX question grammar, or stay faster with guidance available only when ambiguity appears?
