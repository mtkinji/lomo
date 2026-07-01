# Learning Release: activity-to-identity-arc-creation

## Concept To Build

Activity-to-identity Arc creation lets a user start with a concrete thing they enjoy, then helps Kwilt turn that activity into a character worth becoming and practices worth repeating without adding a new object type.

## Capability Delta

Today, the user cannot:
- Start with "Tennis" and stay honest all the way through Arc creation.
- Treat enjoyment as a sufficient why-now signal.
- Avoid generic arena translations like "Health I guess."

After this release, the user can:
- Choose `Something else` and enter the activity itself.
- Answer a simpler motivation prompt tailored to activity-led entries.
- Choose the becoming target and hard scene inside the activity.
- Generate an Arc that uses the activity as source material for identity trajectory, practice, difficulty interpretation, and evidence.

Still intentionally not supported:
- Sports training plans.
- Practice-stat capture.
- Public sharing, comparison, or competitive social mechanics.
- Full replacement of the default survey.

## User Experience

The release enhances the existing Arc survey.

Happy path:
1. User reaches "What direction do you want to grow in first?"
2. User picks `Something else` and enters "Tennis."
3. Kwilt shows a lightweight follow-up: "What matters most about this?"
4. User taps one option: "I enjoy this," "I want to get better," "It gives me energy," "It would make life work better," "It helps me serve or care for others," "It feels connected to who I am," "I do not want to lose it," or `Something else`.
5. Kwilt asks the bridge question: "What part of you is tennis helping grow?" User taps "stay calm when it gets hard," "keep practicing," "recover after mistakes," "compete with confidence," "be a better teammate," or similar.
6. Optional hard-scene prompt names where the Arc activates: missing shots, losing, boredom, nerves, comparison, or inconsistent practice.
7. Arena selection includes `Sports / movement`, but the user is not forced to pretend the Arc is only health.
8. Generation context says the concrete activity is source material; the Arc should name who the user is becoming through it.

## Existing Product Relationship

Enhances:
- FTUE first Arc creation in `IdentityAspirationFlow.tsx`.
- Regular Arc creation in `ArcCreationFlow.tsx`.
- Shared survey definitions in `packages/arc-survey`.

Leaves unchanged:
- Arc, Goal, Activity, and Chapter domain objects.
- Arc reveal and confirmation model.
- Goal creation and activity capture.

## Buildable Slice

Must be real:
- Shared survey types for activity-led source and motivation.
- Shared survey types/options for becoming target and hard scene.
- Shared option set for activity-led motivation.
- Conditional presenter branch in both FTUE and regular Arc creation.
- Generation input that preserves the activity and motivation in structured context.
- Tests for survey config, generation context, and presenter validation where practical.

Can be thin or temporary:
- Local deterministic copy; no early AI preview.
- No analytics until the behavior feels right locally.
- No migration for existing Arcs.

Intentionally excluded:
- New screens.
- New settings.
- Sport-specific copy beyond examples.
- Metrics, streaks, practice scheduling, or dashboards.

## Release Channel

`Local build`, then `TestFlight build`.

Rationale: the learning depends on real bundled/native onboarding behavior and a live-feeling first-run path. Start with Andrew/Charlie-level observation locally, then expose to a small TestFlight set if the branch feels calm and intentional.

## Brand-Goodwill Guardrails

- Copy must validate enjoyment without hyping it.
- The branch must feel like the app adapting, not a remedial path.
- AI output must stay humble: "This may be about..." in internal prompt guidance, with user confirmation at reveal.
- Avoid teen-coded slang; plain language should work for teens and adults.

## Reversibility

The branch can be hidden by removing the conditional presenter path and option exports. If structured response fields are added, generation can ignore them without data loss. No persisted Arc schema migration is required.

## Permanent Product Threshold

Make the branch permanent if concrete-first users complete the survey more easily, recognize the generated Arc as an identity target, and do not report that the flow became longer or more confusing.
