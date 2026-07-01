# Learning Release: object-creation-ux-system

## Concept To Build

Make FTUX the first shipped exposure to a shared Kwilt creation grammar, then align direct Goal and Arc creation around the same grammar in smaller slices.

## Capability Delta

Today, the user cannot:

- Rely on every object-creation flow to ask compatible questions.
- Trust that FTUX, direct Goal creation, and direct Arc creation are one coherent system.
- See why FTUX creates a Goal first while Kwilt remains identity-led.

After this release, the user can:

- Start FTUX with concrete intent and receive both a first Goal and an identity Arc.
- Later create Goals and Arcs through flows that feel related, even when shorter.
- Understand Goals as concrete progress inside an Arc rather than standalone tasks.

Still intentionally not supported:

- A universal "create anything" router.
- Fully AI-generated questionnaire branches.
- Activity creation redesign.

## User Experience

FTUX uses the full flow. Direct Goal creation should later adopt the minimal guided subset. Direct Arc creation should later support identity-first and activity-to-identity starts.

## Existing Product Relationship

This enhances:

- `docs/feature-briefs/ftux-goal-arc-onboarding.md`
- `src/features/onboarding/IdentityAspirationFlow.tsx`
- `src/features/goals/GoalCreationFlow.tsx`
- `src/features/arcs/ArcCreationFlow.tsx`
- `packages/arc-survey/src/arcCreationSurvey.ts`

## Buildable Slice

Must be real:

- FTUX creates one Goal and one linked Arc through deterministic questions.
- Survey copy and hidden generation meanings live in canonical config.
- Docs explain how FTUX relates to later creation flows.

Can be thin or temporary:

- Direct Goal and direct Arc changes can remain documented tasks until FTUX stabilizes.
- The shared grammar can begin in `packages/arc-survey` before extracting a broader package.

Intentionally excluded:

- New object creation hub.
- Fully adaptive questionnaire routing.
- Changes to persistence schema.

## Release Channel

Local/TestFlight evaluation first. This is a high-trust first-run experience and should be observed on real devices before production-default confidence.

## Brand-Goodwill Guardrails

- Do not over-teach Arcs before the user has value.
- Do not make direct Goal creation feel like therapy homework.
- Do not let generated Arc names repeat the concrete activity.
- Do not save partial object hierarchies that make the app feel incomplete.

## Reversibility

Keep direct Goal and direct Arc changes out of the first FTUX slice. If FTUX underperforms, reduce questions or change labels without migrating data.

## Permanent Product Threshold

Promote the grammar into a permanent creation system when FTUX users can complete the flow, understand the resulting Arc+Goal relationship, and later create a direct Goal without conceptual whiplash.
