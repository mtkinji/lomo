# Learning Release: ftux-goal-arc-onboarding

## Concept To Build

FTUX Goal+Arc onboarding creates the user's first concrete Goal and the identity Arc it belongs to in one deterministic first-run flow.

## Capability Delta

Today, the user may have to understand Arc language before Kwilt has concrete material. After this release, the user starts with concrete progress and receives the Arc context and first Goal together.

## User Experience

1. User enters first-run onboarding.
2. Assistant/setup copy frames the task before the noun: "Start with one thing you want to move. Kwilt will help name the bigger direction underneath it."
3. User answers deterministic concrete-to-identity questions.
4. Kwilt generates a paired Arc and Goal.
5. Lightweight reveal shows both:
   - "Your direction" - Arc name/narrative.
   - "Your first goal" - Goal title/description.
6. User confirms or requests one lightweight tweak.
7. Kwilt saves both objects and lands on Arc detail.

## Existing Product Relationship

Enhances:

- `IdentityAspirationFlow.tsx`
- shared `@kwilt/arc-survey` survey definitions
- Arc generation prompt/builders
- onboarding completion navigation

Uses existing:

- `Arc`
- `Goal`
- `Goal.arcId`
- `lastOnboardingArcId`
- `lastOnboardingGoalId`
- Arc detail screen

Leaves unchanged:

- normal Activity capture
- later direct Arc creation
- later manual Goal creation

## Buildable Slice

Must be real:

- deterministic survey config for FTUX Goal+Arc flow,
- structured response type,
- generation input builder,
- persistence of both objects,
- link Goal to Arc,
- Arc detail landing,
- tests for survey config and builder output.

Can be thin:

- first Activity suggestion can be generated but not persisted,
- tweak path can reuse existing tone tweak options initially,
- analytics can be minimal or deferred until the flow is stable.

Intentionally excluded:

- AI-generated survey choices,
- multiple Goals,
- scheduling first Activity,
- changing non-FTUX creation surfaces.

## Release Channel

`Local build`, then `TestFlight build`.

This changes first-run product semantics. It needs native/real-flow validation before production.

## Brand-Goodwill Guardrails

- Do not over-explain Arc/Goal theory before the user sees the result.
- Do not imply the AI "knows" the user's identity.
- Keep language plain enough for a 14-year-old and still credible for adults.
- Tweak/edit affordances must be visible enough that bad generation does not feel trapped.

## Reversibility

The change should be contained to FTUX survey/generation. Existing persisted Arcs and Goals are unaffected. Rollback returns FTUX to Arc-only generation and ignores the paired Goal generation path.

## Permanent Product Threshold

Make this the permanent FTUX model if concrete-first users complete onboarding, accept/tweak paired output successfully, and understand the Arc as the context for the first Goal.
