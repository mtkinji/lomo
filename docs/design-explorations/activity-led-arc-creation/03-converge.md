# Converge: activity-to-identity-arc-creation

## Qualitative Score

| Alternative | Persona fit | JTBD fit | System fit | Learning value | Risk |
| --- | --- | --- | --- | --- | --- |
| Better Chips, Same Flow | Medium | Medium | High | Low | Low |
| Activity-First Branch | Medium | Medium | Medium | Medium | Medium |
| Activity-To-Identity Bridge | High | High | Medium | High | Medium |
| Recognition Preview | High | High | Medium | High | Medium-high |
| Tweak-First Reveal Repair | Medium | Medium | High | Medium | Low-medium |
| Adaptive First Question | High | High | Medium-low | High | Medium |

## Capability Delta

Today, the user cannot:
- Start Arc creation from a concrete activity without translating it into adult abstract language.
- Say that enjoyment is enough reason without choosing a more serious-sounding motivation.
- Tell Kwilt "this is a thing I like; help me understand what it says about who I am becoming."

After this concept ships, the user can:
- Enter or select a concrete activity when the default identity options do not fit.
- Choose intrinsic motivations like enjoyment, getting better, energy, competition, or belonging.
- Choose the becoming target inside the activity: calm under pressure, resilient practice, confident competition, teammate presence, energy, or similar.
- Receive an Arc whose generated language treats the activity as a doorway into identity, practice, difficulty, and evidence.

Still intentionally not possible:
- Tracking sports stats, practice streaks, or performance metrics as part of Arc creation.
- Creating hobby/project objects separate from Arcs.
- Auto-deciding a user's identity meaning without confirmation.

## Reductive Design Pass

Smallest elegant version:
- Keep the existing survey.
- Add an activity-first branch only after `Something else` on the direction step, or when custom direction text is entered.
- Add a motivation follow-up and one identity-resolution prompt that replaces the current "why now" wording for activity-led entries.

Enhance existing feature instead of creating a new one:
- This is an enhancement to `ArcCreationFlow`, `IdentityAspirationFlow`, and `@kwilt/arc-survey`.

What we refuse to add:
- A new teen mode.
- Sport-specific templates.
- A new object type.
- Streaks, stats, leaderboards, or performance dashboards.
- A permanent onboarding explainer about intrinsic motivation.

What would make this feel like clutter:
- Asking every user to choose between too many meta-paths before they know what an Arc is.
- Adding elaborate motivational taxonomy labels.
- Making the branch feel like a form.

## Activation Path

Most ready moment:
- When the user picks `Something else` for direction, types a concrete custom direction, or hesitates on why-now.

Education:
- Contextual, not promotional. The UI should simply adapt with copy like "Tell Kwilt the thing itself. We'll help turn it into an Arc."

Natural adoption signal:
- Users who enter concrete activities complete Arc creation without choosing `unsure` or abandoning at why-now.

## Chosen Direction

Ship the Activity-To-Identity Bridge as the main concept, paired with the low-risk taxonomy repair from Alternative 1.

The branch answers the real challenge better than chips alone: Charlie's problem begins before the why-now step. The app asked him for the identity translation too early. Better chips are still useful, but the full response is to let the activity be the starting material and then guide it toward a real Arc target.

## Accepted Trade-Offs

- More conditional state in the shared survey.
- Slightly more copy/design work in the first-Arc flow.
- Some generation prompt complexity to keep "Tennis" from becoming a shallow sports category.

## Rejected Trade-Offs

- Early AI recognition preview for V1; too much trust rides on one fast generation before the user has seen value.
- Two-path first screen for everyone; promising, but likely too much cognitive load as the first move.
- Teen-specific mode; Charlie's response reveals a broader concrete-first pattern.

## System Implications

- Add activity-to-identity source fields to `ArcSurveyV2Response` or represent them as structured `personalTexture` only if the branch is intentionally temporary.
- Update `buildArcGenerationInputFromSurveyV2` mapping guidance so activity, motivation, becoming target, and difficulty scene shape `identity.statement`, `identity.whyItMatters`, `identity.centralInsight`, and `howThisShowsUp`.
- Presenters must render the same branch in FTUE and regular Arc creation.

## Bet

We're betting that the dominant blocker is premature abstraction without an identity bridge: users like Charlie can create resonant Arcs when Kwilt accepts the concrete thing they care about first and then guides them toward the character target, practice, and difficulty interpretation inside it. If this is wrong, users will still stall or reject generated Arcs, and we should revisit the first question itself rather than adding more option chips.

## Success Signal

In self-use or TestFlight observation, a concrete-first user can enter "Tennis," select enjoyment/getting better, choose a becoming target such as "staying calm when it gets hard," and receive an Arc they describe as "yeah, that's who I want to become" without needing an adult to interpret the options for them.
