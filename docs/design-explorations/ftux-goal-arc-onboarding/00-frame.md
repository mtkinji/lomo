# Frame: ftux-goal-arc-onboarding

## What the user said

The current direction feels right, but it needs to be baked into FTUX onboarding. The concern is that creating a Goal first and offering Arc creation afterward creates a drop-off risk; the app would feel incomplete if the first Goal is not anchored in an Arc. The better hypothesis is one first-run flow that starts concrete, derives identity, creates both the Goal and Arc, then lands on the Arc.

## Restated in user voice

When I first open Kwilt, I may only know the concrete thing I want to move. Help me turn that into both a real first Goal and the bigger Arc it belongs to, so the app feels meaningful immediately instead of asking me to understand the object model first.

## Target audience

`audience-faith-and-values-driven-builders` - Faith- and values-driven builders.

This still uses Sarah as the canonical persona because the job is `jtbd-see-who-im-becoming`, but the flow must work for concrete-first users like Charlie who do not naturally speak in Arc language.

## Representative persona

Sarah, in first-run mode.

- Current situation: She wants Kwilt to help her make progress, but she starts from a concrete thing rather than an identity formulation.
- What she's trying to become/do: Create first meaningful context in the app without learning Arc/Goal theory first.
- Emotional state or tension: Interested but not yet conceptually bought in.
- What would make this feel wrong: Being asked to name an Arc before she has concrete material, or creating a Goal that feels disconnected from the identity layer.

## Hero anchor

`jtbd-see-who-im-becoming` - Help me see who I'm becoming so I act like that person today.

## Job flow step

`job-flow-sarah-see-who-im-becoming`, steps 2-4:

- Find words for that direction.
- Turn the direction into an Arc.
- Choose a goal that expresses the Arc.

Current scores are strong but incomplete: Arc generation/naming exists, Goal linkage exists, and first-run Arc creation exists. The gap is sequence: the current FTUX asks for Arc-shaped inputs before many users can produce them.

## Active anchors

- `jtbd-see-who-im-becoming` - The flow must reveal identity context.
- `jtbd-name-my-arcs` - The flow must produce language that feels like the user.
- `jtbd-move-the-few-things-that-matter` - The flow must also create a concrete first Goal that can move.
- `jtbd-trust-this-app-with-my-life` - The flow must be understandable and not feel like AI overreach.

## Friction we're addressing

If FTUX only creates a Goal, Kwilt lacks its identity context. If FTUX only creates an Arc, concrete-first users may fail before the app gets enough real material. If FTUX creates the Goal first and makes Arc creation optional, many users will drop before the context is built. The right first-run object creation needs to be one guided flow with two outputs.

## System alignment

Constraint posture: `Bend the system`

Current system facts:
- Existing surface: `src/features/onboarding/IdentityAspirationFlow.tsx`.
- Existing shell: `src/features/onboarding/FirstTimeUxFlow.tsx` launches the first-time onboarding workspace and already knows `lastOnboardingArcId` and `lastOnboardingGoalId`.
- Existing data model: `Arc` and `Goal` already exist; `Goal.arcId` can link the first Goal to the generated Arc.
- Existing state affordance: `lastOnboardingArcId` and `lastOnboardingGoalId` already exist in `useAppStore`.
- Existing product docs: current docs describe Arc-led onboarding, but the current product hypothesis is now concrete-first Goal+Arc onboarding.

Constraints to preserve:
- Arcs remain identity trajectories, not categories or hobbies.
- Goals remain concrete progress, not identity slogans.
- The flow remains deterministic until final synthesis.
- AI must synthesize from structured inputs, not invent the survey path.

Constraints we may challenge:
- FTUX does not need to ask for an Arc first.
- FTUX does not need to create only one object.
- The first landing surface does not need to be the most recently created concrete Goal; it can be the Arc that gives the Goal context.

Design implication:
The first-run flow should collect one concrete progress input, derive both a Goal shape and an identity bridge, then create both objects atomically enough that the user never enters Kwilt with a context-free first Goal.

## Aspirational design challenge

How might we help Sarah and concrete-first users like Charlie create a first Goal and its identity Arc in one deterministic FTUX flow, while preserving Kwilt's Arc-first meaning model and avoiding extra conceptual setup?

## Out of scope

- Redesigning all later Goal creation.
- Replacing direct Arc creation for advanced users.
- Adding AI-generated survey choices.
- Adding sports, habit, or project-tracking surfaces.

## Open question

Should FTUX show the generated Goal and Arc together before save, or save both and let the Arc detail screen serve as the confirmation surface?
