# Diverge: activity-to-identity-arc-creation

## Axis

Activity-first vs. identity-first, and deterministic survey copy vs. AI-assisted interpretation.

## Alternative 1: Better Chips, Same Flow

Keep the current seven-step survey order, but improve the option taxonomy: add `Sports / movement`, make `I enjoy this` first in why-now, add "I want to get better at this" and "It feels like me," and tune generation meanings. The flow remains fully deterministic and low-risk.

- Audience/persona fit: Helps Charlie's exact case and preserves Sarah's current path.
- Design-challenge answer: Partially answers by making enjoyment and sport visible.
- System-fit note: Fits existing arrays and presenters with almost no UI change.
- Best when: The current flow is basically right and only missing language coverage.
- Fails when: The user still starts from "Tennis" and has to choose an abstract identity direction before the app understands the real source.
- Primer check: Passes the four-object model and avoids dashboards/streaks, but risks pre-baked category language.

## Alternative 2: Activity-First Branch

Add a first step only when the user chooses `Something else` or enters custom text for identity direction: "What's the thing you're thinking of?" The user can type or tap a concrete thing. Then the survey asks a simpler follow-up: "What draws you to it?" with options like enjoyment, getting better, being with people, competition, energy, and meaning. Kwilt then maps the activity to identity language in generation context.

- Audience/persona fit: Strong for concrete-first users; Sarah can still use the normal abstract path.
- Design-challenge answer: Lets "Tennis" be true input before asking what it means.
- System-fit note: Extends the shared survey with conditional branching and richer generation context, but no new domain object.
- Best when: Users often have the activity before they have the identity wording.
- Fails when: Branching makes FTUE feel less simple or conditional state becomes hard to maintain across both presenters.
- Primer check: Passes if the activity remains source material for an Arc, not a hobby/project object.

## Alternative 2b: Activity-To-Identity Bridge

Start the same as the activity-first branch, but add one required identity bridge before generation: "What kind of person is this helping you become?" Options are concrete and teen-legible: someone who practices even when progress is slow, stays calm under pressure, competes with confidence, recovers after mistakes, moves with energy, becomes a better teammate, or trusts reps over instant results. A second optional tap names the hard scene: losing, missing shots, boredom, nerves, comparison, or inconsistent practice.

- Audience/persona fit: Strongest for Charlie because it accepts tennis without letting tennis become the Arc.
- Design-challenge answer: Turns doing into becoming through possible self, practice, and difficulty interpretation.
- System-fit note: Extends the survey and generation context, but still outputs one Arc with name and narrative.
- Best when: The user has the activity but needs help discovering the identity trajectory inside it.
- Fails when: The bridge is too abstract or feels like a quiz about character.
- Primer check: Passes if the bridge creates an Arc and avoids practice stats, streaks, or sports tracking.

## Alternative 3: Recognition Preview

After the first two answers, show a small generated preview: "This might be about becoming someone who..." with 2-3 tap choices. For Charlie, Kwilt might offer "keeps practicing something he enjoys," "builds confidence through competition," or "finds energy through movement." The selected preview becomes the identity signal for the rest of the survey.

- Audience/persona fit: Excellent for users who need help recognizing the identity under an activity.
- Design-challenge answer: The app translates before asking for commitment.
- System-fit note: Requires an early AI or local heuristic pass inside onboarding, plus loading/error states.
- Best when: Recognition is the main blocker and users need to see themselves reflected early.
- Fails when: AI latency or bad suggestions break trust before the Arc reveal.
- Primer check: Passes if suggestions are humble and selectable; fails if AI sounds diagnostic.

## Alternative 4: Tweak-First Reveal Repair

Leave the survey mostly intact, but strengthen the reveal with a tap-first "Not quite" repair path tuned for motivation. If the generated Arc feels too serious, the user can tap "make it more fun," "more competitive," "more practical," "less intense," or "more like me." This helps when the survey choices were close but not right.

- Audience/persona fit: Good fallback for Sarah and Charlie, especially when they cannot explain the mismatch upfront.
- Design-challenge answer: Fixes recognition after generation rather than before.
- System-fit note: Reuses the existing reveal/tweak concept described in the FTUE reference.
- Best when: Most users can get through the survey but need ownership at the end.
- Fails when: The original survey already made them feel unseen and they abandon before reveal.
- Primer check: Passes if corrections are optional and plain; avoid "AI knows you" language.

## Alternative 5: Adaptive First Question

Change the first question from "What direction do you want to grow in first?" to a dual-path prompt: "Start with a direction or a thing you care about." The first screen has two tabs or segmented choices: "A direction" and "A thing I do." Each path feeds the same Arc generation model, but with different prompts and option sets.

- Audience/persona fit: Strongest philosophical fit for concrete-first users without making them an exception.
- Design-challenge answer: Makes the app welcoming to both reflective and activity-led entry.
- System-fit note: Bends the first screen and survey state more substantially, but keeps the Arc model.
- Best when: We believe concrete-first entry is common enough to deserve first-class treatment.
- Fails when: The two-path choice itself becomes extra cognitive load.
- Primer check: Passes if the path choice is plain and the output remains an Arc.

## Divergence Read

Alternative 1 is a patch. Alternative 4 is a repair loop. Alternative 3 is powerful but depends on early AI quality. Alternative 5 is conceptually promising but may overcomplicate first contact. Alternative 2b is the most research-aligned learning release: it preserves concrete entry while requiring the identity trajectory that makes something an Arc.
