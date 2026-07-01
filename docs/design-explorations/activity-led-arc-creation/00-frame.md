# Frame: activity-to-identity-arc-creation

## What the user said

> My son Charlie is creating an Arc and feels like none of the Arc response options feel right on "Why does this matter right now"
>
> His answer, as a 14yo to "What direction do you want to grow in first?" -- "Tennis"
>
> Where should this show up first? "Health I guess..."
>
> Why doest this matter right now? "Because I enjoy tennis" -- none of the app provided responses seem to align to where he's at with this

## Restated in user voice

When I start from a concrete thing I like doing, I want Kwilt to help me recognize the kind of person I am becoming through it, so the thing I enjoy becomes an identity trajectory instead of merely another activity to do.

## Target audience

`audience-faith-and-values-driven-builders` - Faith- and values-driven builders.

This is still the best existing audience because the product problem sits inside `jtbd-see-who-im-becoming`: Arcs need to turn an ordinary lived direction into resonant identity language. Charlie is not Sarah, but his path is a sharper test of whether the Arc survey can serve slower-to-warm, concrete-first users without over-intellectualizing them.

## Representative persona

Sarah, adapted into a concrete-first first-Arc situation.

- Current situation: She has a plain activity or arena that matters, but she does not yet have reflective language for it.
- What she's trying to become/do: Find a name for the direction without making it feel like a corporate category or performance plan.
- Emotional state or tension: Curious, tentative, and allergic to overblown meaning.
- What would make this feel wrong to her: Being forced to choose options that imply crisis, obligation, misalignment, or heavy purpose when the honest answer is joy, interest, and wanting to keep going.

## Hero anchor

`jtbd-see-who-im-becoming` - Help me see who I'm becoming so I act like that person today.

## Job flow step

`job-flow-sarah-see-who-im-becoming`, step 2: "Find words for that direction."

- Current product offering: Arc generation and naming.
- Current score: 4.
- Gap exposed here: the generation layer may be strong after the survey, but the input layer can still force the user through abstract adult categories before the model receives the true signal.

## Active anchors

- `jtbd-see-who-im-becoming` - The surface should connect an ordinary interest to becoming without manufacturing pressure.
- `jtbd-name-my-arcs` - The user needs language that feels like them, not pre-baked "Health / Career / Relationships" templates.

## Friction we're addressing

The current survey assumes the user can answer in identity language first, then place that identity into an arena, then explain urgency. Charlie's actual path is activity-first: "Tennis" -> "Health I guess" -> "Because I enjoy tennis." The app currently treats enjoyment as insufficiently meaningful, even though intrinsic motivation may be the cleanest signal.

The deeper risk is not only missing option coverage. It is allowing the concrete activity to become the Arc target. The research foundation defines an Arc as an identity trajectory: "a character worth becoming, translated into practices worth repeating." Tennis can be a doorway into that trajectory, but the Arc itself must resolve into a hoped-for self, a practice shape, a difficulty interpretation, and evidence of becoming.

## System alignment

Constraint posture: `Bend the system`

Current system facts:
- Existing surface: shared Arc survey used by FTUE and regular Arc creation.
- Existing user flow: `identityDirection` -> `primaryArena` -> `whyNow` -> ordinary-day progress -> drift -> support style -> optional personal texture.
- Existing domain/data model: no schema change required; `Arc.name`, `Arc.narrative`, and `ArcSurveyV2Response` can carry the better signal.
- Existing technical affordances: `packages/arc-survey/src/arcCreationSurvey.ts` controls options and generation meanings; `IdentityAspirationFlow.tsx` and `ArcCreationFlow.tsx` render the same option arrays.
- Existing UX/copy conventions: tap-first, low-pressure, identity-first, no productivity-app voice.

Constraints to preserve:
- Arcs remain identity directions, not sports categories, projects, or hobbies.
- Capture-first and low-friction creation remain intact.
- The AI reflects user-selected language with humility and no overconfident psychoanalysis.

Constraints we may challenge:
- The first question does not always have to be abstract identity direction.
- "Why now" should not imply that an Arc needs urgency, crisis, obligation, or dissatisfaction to be legitimate.
- Primary arena should not force activity-led users to choose generic adult life domains.

Design implication:
The solution should let a user begin with a concrete activity or delight, then require a lightweight identity-resolution step before generation. This is a bend in interaction order and option semantics, not a new object model.

## Aspirational design challenge

How might we help Sarah, and concrete-first users like Charlie, turn a plain thing they enjoy into a character worth becoming and practices worth repeating, while preserving Kwilt's identity-first model and tap-first onboarding?

## Out of scope

- Adding a teen-specific product mode.
- Creating sport-specific templates, leaderboards, stats, or practice tracking.
- Renaming Arcs.
- Changing the Arc domain model.

## Open question

Should first-Arc creation detect and privilege "activity-first" input when the user chooses `Something else`, or should the default survey itself become activity-first for everyone?
