---
id: brief-activity-led-arc-creation
title: Activity-To-Identity Arc Creation
status: draft
audiences: [audience-faith-and-values-driven-builders]
personas: [Sarah]
hero_jtbd: jtbd-see-who-im-becoming
job_flow: job-flow-sarah-see-who-im-becoming
serves: [jtbd-see-who-im-becoming, jtbd-name-my-arcs]
related_briefs: [brief-arc-goal-lifecycle-and-limits]
owner: andrew
last_updated: 2026-06-27
---

# Activity-To-Identity Arc Creation

## Context

Charlie's first-Arc attempt exposed a gap in the Arc survey: a concrete-first user may know the thing they care about before they have identity language for it. "Tennis" and "because I enjoy tennis" are not weak answers. They are strong raw material, but the current survey asks the user to translate them into abstract adult categories too early. The research constraint is that the output still must be an Arc: a named identity trajectory, not a hobby, task category, or practice tracker.

## Target audience

`audience-faith-and-values-driven-builders` remains the primary audience because the work strengthens Kwilt's identity layer: helping a person name who they are becoming without reducing the direction to a productivity category. The teen example is a stress test for concrete-first language, not a separate audience strategy.

## Representative persona

Sarah is in a first-Arc situation where she has a plain lived direction but not the words for it yet. She needs Kwilt to accept the plain beginning and synthesize meaning from it without making the result sound inflated.

## Aspirational design challenge

How might we help Sarah, and concrete-first users like Charlie, turn a plain thing they enjoy into a character worth becoming and practices worth repeating, while preserving Kwilt's identity-first model and tap-first onboarding?

## Hero JTBD

`jtbd-see-who-im-becoming` - Activity-to-identity Arc creation serves the core Arc job by helping the user see identity in an ordinary thing they already care about.

## Job flow step

`job-flow-sarah-see-who-im-becoming`, step 2: "Find words for that direction." Current delivery score is 4, but this observation exposes a gap in the input path: the generation layer can only reflect the user if the survey captures their concrete source language.

## JTBD framing

When the user starts from a concrete activity, they want Kwilt to help them recognize the becoming underneath it, so they do not have to translate enjoyment into crisis, duty, or generic life-area language. This serves `jtbd-see-who-im-becoming` and `jtbd-name-my-arcs`.

## Design

Activity-to-identity Arc creation adds a conditional branch to the existing shared Arc survey.

### Deterministic survey model

This does not replace the deterministic survey with an AI conversation. The model remains:

- fixed question order,
- fixed option sets,
- structured response payload,
- strong generation template,
- AI used only after deterministic inputs have been collected.

The change is a deterministic conditional path for users whose first answer is concrete/activity-shaped instead of already identity-shaped.

### Current deterministic path

Today the shared Arc survey asks:

1. `What direction do you want to grow in first?`
2. `Where should this show up first?`
3. `Why does this matter right now?`
4. `What would progress look like on an ordinary day?`
5. `What usually pulls you away?`
6. `What kind of support would help most?`
7. `Want to add anything personal?`

This path still works when the user can already answer in identity language, for example "stay steady," "finish what matters," or "become more capable."

### Proposed deterministic paths

The survey becomes two deterministic paths that share the same final Arc-generation contract.

#### Path A: Identity-first

Use this when the user picks one of the existing identity-direction options.

1. `What direction do you want to grow in first?`
2. `Where should this show up first?`
3. `Why does this matter right now?`
4. `What would progress look like on an ordinary day?`
5. `What usually pulls you away?`
6. `What kind of support would help most?`
7. `Want to add anything personal?`

Small option repairs still apply: `Sports / movement` is available as an arena, and `I enjoy this` is available as a why-now answer.

#### Path B: Activity-to-identity

Use this when the user chooses `Something else` on the first question and enters a concrete thing, or if a future version offers a direct `Start with a thing I do` affordance.

All questions in this path use deterministic options. The options should be broad enough to fit almost any concrete input: sports, faith practices, school, work, creative projects, relationships, home, money, health, learning, service, and personal discipline. AI may synthesize the final Arc and Goal from the structured selections, but it should not generate the survey choices in V1.

1. `What is the thing you have in mind?`
   - input: short custom text such as `Tennis`
2. `What matters most about this?`
   - fixed options: `I enjoy this`, `I want to get better`, `It gives me energy`, `It would make life work better`, `It helps me serve or care for others`, `It feels connected to who I am`, `I do not want to lose it`, `Something else`
3. `What part of you is this helping grow?`
   - fixed options: `Showing up consistently`, `Staying steady when it is hard`, `Getting better through practice`, `Recovering after setbacks`, `Taking responsibility`, `Being more present with people`, `Living what I value`, `Something else`
4. `Where does this show up first?`
   - existing arena options, including `Sports / movement`
5. `What usually pulls you away?`
   - existing drift options, with activity-appropriate generation meanings when needed
6. `What kind of support would help most?`
   - existing practice-style options
7. `Want to add anything personal?`

Optional later addition:

- `Where does this get hard?`
  - fixed options: `When I miss`, `When I lose`, `When practice is boring`, `When I feel nervous`, `When I compare myself`, `When I stop showing up`, `Something else`

This hard-scene step is valuable for research alignment, but should be excluded from the first learning release unless the six-step activity path fails to produce identity-shaped Arcs.

### Universal deterministic option strategy

The deterministic sets should avoid domain-specific answers like `I like competing` unless they are clearly applicable across many concrete inputs. The goal is not to make tennis feel custom at the option layer. The goal is to collect universal identity ingredients that the generation template can apply to tennis, prayer, school, woodworking, friendships, business, or any other concrete starting point.

Recommended V1 option sets:

`What would progress look like in the next few weeks?`

- `Show up more consistently`
- `Get better at one part of it`
- `Prepare for something coming up`
- `Make more time for it`
- `Finish or complete something`
- `Make it easier to start`
- `Feel more confident doing it`
- `Change a pattern`
- `Something else`

`What matters most about this?`

- `I enjoy this`
- `I want to get better`
- `It gives me energy`
- `It would make life work better`
- `It helps me serve or care for others`
- `It feels connected to who I am`
- `I do not want to lose it`
- `Something else`

`What part of you is this helping grow?`

- `Showing up consistently`
- `Staying steady when it is hard`
- `Getting better through practice`
- `Recovering after setbacks`
- `Taking responsibility`
- `Being more present with people`
- `Living what I value`
- `Something else`

`Where does this usually get hard?`

- `Starting`
- `Sticking with it`
- `Getting distracted`
- `Feeling discouraged`
- `Comparing myself`
- `Not knowing the next step`
- `Being tired or overloaded`
- `Something else`

These options intentionally collect durable growth patterns, not domain nouns. The final AI synthesis makes them specific to the user's concrete input.

### Generation contract

Both paths must still produce the same Arc-shaped output:

- `Arc.name`: identity-oriented, stable, not activity-only.
- `Arc.narrative`: names the hoped-for self, why it matters, how it shows up in ordinary life, and what practice/evidence makes it real.

For Charlie, the deterministic input should not generate:

- `Tennis`
- `Play More Tennis`
- `Tennis Practice`

It should generate candidates closer to:

- `Calm Competitor`
- `Steady Through the Game`
- `The Practice Builder`
- `Resilient After Mistakes`

Trigger:
- User selects `Something else` for identity direction, or enters custom direction text that appears activity-like.

Branch:
- Ask for the thing itself if needed: "What's the thing you're thinking of?"
- Ask what draws them to it: enjoyment, getting better, energy, competing, being with people, feeling like themselves, or something else.
- Ask the identity bridge: "What part of you is this helping grow?" Options should be concrete enough for teens and still Arc-shaped: staying calm under pressure, keeping practice when progress is slow, recovering after mistakes, competing with confidence, moving with energy, becoming a better teammate, or trusting reps over instant results.
- Optionally ask the hard scene: missing shots, losing, boredom, nerves, comparison, inconsistent practice, or something else.
- Keep `Sports / movement` available as an arena, but do not make it the whole meaning.

Generation behavior:
- Treat the activity as source material for identity language.
- Treat intrinsic motivation as legitimate.
- Resolve the Arc into hoped-for self, repeatable practice, difficulty interpretation, and evidence of becoming.
- Avoid turning the activity into a stats tracker, practice plan, or performance identity.
- Preserve humble wording and confirmation at reveal.

Implementation should reuse:
- `packages/arc-survey/src/arcCreationSurvey.ts`
- `src/features/onboarding/IdentityAspirationFlow.tsx`
- `src/features/arcs/ArcCreationFlow.tsx`
- Existing Arc generation context builders.

## Success signal

A concrete-first user can enter "Tennis," select a meaning signal such as "I enjoy this," choose a becoming target such as "staying calm when it gets hard," and accept or lightly tweak a generated Arc because it sounds like who they want to become, not because an adult translated the options for them.

## Spec refinement

Build-ready with two decisions still user-owned:

- Whether the branch triggers only from `Something else` or is visible as a first-class "Start with a thing you do" path.
- Whether activity-led answers become explicit fields on `ArcSurveyV2Response` or are first represented through structured `personalTexture` for a lower-risk learning release.

Acceptance criteria:
- FTUE and regular Arc creation expose the same activity-led behavior.
- "I enjoy this" and `Sports / movement` remain available in the default path.
- Activity-led generation context includes the concrete activity, motivation, becoming target, and hard scene when present.
- The generated Arc remains an Arc: no sports stats, streaks, or practice tracking.
- Focused tests cover survey config and generation context.

## Open questions

- Should the activity-led motivation prompt allow multiple selections, or is a single clean signal enough for V1?
