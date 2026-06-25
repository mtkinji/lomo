# Frame: Areas + Vectors Reconciliation

## What the user said

> I'm just remembering that goals have "Vectors" but these are oft forgotten and never really addressed directly in app workflows.
>
> We should run a design loop on the potential reconciliation of Areas + Vectors.

## Restated in user voice

When Kwilt asks me to trust its model of my life, I want the concepts that shape planning and meaning to feel coherent, so that I do not have to remember which hidden field matters or wonder whether the app is carrying duplicate taxonomies.

## Target audience

`audience-ai-native-life-operators` - AI-native life operators.

This reconciliation is primarily for users like Nina because the risk is not only UI clutter. It is whether Kwilt's life model stays inspectable enough for AI, scheduling, and reflection to operate near intimate data without becoming confusing or silently overreaching.

## Representative persona

Nina: Nina already uses AI tools to think, plan, draft, reflect, and operate. She wants Kwilt to be structured enough for AI help, but permissioned and clear enough that AI is not silently rewriting her life.

- Current situation: Nina sees more Kwilt concepts appearing across Goals, Activities, AI enrichment, scheduling, and Settings.
- What she's trying to do: let Kwilt organize action while preserving a meaningful identity model.
- Emotional state or tension: willing to use structure, allergic to hidden or overlapping taxonomies.
- What would make this feel wrong to her: Areas behaving like Vectors, Vectors behaving like tags, or AI assigning either without preview and correction.

## Hero anchor

`jtbd-trust-this-app-with-my-life` - Nina will only keep intimate life structure in Kwilt if the model is transparent, reversible, and calm.

## Job flow step

Job flow: `job-flow-nina-trust-ai-with-my-life-system`.

Underserved step: "Inspect exactly what would change" and "Approve, reject, or edit the changes."

Current product offering:
- Goals expose "Vectors for this goal" as Force Intent.
- Activities can carry Force Actual, but most activity workflows do not address it directly.
- Areas are newly introduced as Settings-managed Activity context for scheduling and AI Fill details.
- AI and scheduling can act on these signals, but the relationship between the signals is not yet inspectable.

Delivery score: 1 for inspect changes, 1 for approve/edit, and 1 for undo/audit in the current job flow.

Gap: Kwilt has meaningful internal structure, but not enough explanation or reconciliation at the moments where users and AI make or correct planning decisions.

## Active anchors

- `jtbd-trust-this-app-with-my-life` - the reconciliation is about conceptual trust, not only metadata management.
- `jtbd-carry-intentions-into-action` - Areas and Vectors both influence whether intentions become fitting actions.
- `jtbd-see-who-im-becoming` - Vectors carry the growth/identity meaning that Areas should not flatten.
- `jtbd-capture-and-find-meaning` - neither concept should block capture; both should support later meaning-making.

## Friction We're Addressing

Vectors exist as a powerful meaning model, but they are easy to forget because they appear mainly on Goal creation/detail and only indirectly shape later workflows. Areas solve a different problem - scheduling and life context - but their labels can look like a competing life taxonomy. If both concepts remain visible without a clear relationship, users may reasonably ask why Kwilt needs both.

## System Alignment

Constraint posture: `Question the system`.

Current system facts:
- Existing object model: Arc, Goal, Activity, Chapter.
- Existing meaning model: Vectors/Forces are canonical growth dimensions. Goals declare Force Intent; Activities record Force Actual. Intent-vs-Actual mismatch is meaningful signal and must not be reduced to a score.
- Existing context model: Areas are optional, Settings-managed life domains on Activities. They support scheduling availability and AI Fill details. Defaults are Work, Personal, Family, Home, Health.
- Existing surfaces: Goal creation and Goal Detail expose "Vectors for this goal." Activity detail and draft surfaces expose Area. Settings owns Area management. Chapters can mention vectors retrospectively.
- Existing AI affordances: Goal creation can propose forceIntent; Activity enrichment can propose Area. AI mutation should remain previewable and correctable.
- Existing UX convention: capture-first, optional alignment, calm copy, no productivity-app voice.

Constraints to preserve:
- Capture must never require Area or Vector selection.
- Vectors must remain growth dimensions, not categories, tags, or scheduling domains.
- Areas must remain user-managed, inspectable, and reversible.
- AI may suggest but should not silently create durable Areas or rewrite meaning signals.
- The app should not add a new top-level taxonomy dashboard unless a clear job demands it.

Constraints we may challenge:
- Whether "Vectors" is the right user-facing name.
- Whether Vectors should appear only on Goals, or also appear as lightweight inherited context on Activities.
- Whether Areas should be able to carry default Vector tendencies as hints, without becoming equivalent to Vectors.
- Whether the Goal Detail "Vectors for this goal" section should be reframed or relocated so it is not forgotten.

Design implication:

The likely reconciliation is not a merge. Areas answer "where/when does this action belong in my life?" Vectors answer "what kind of becoming does this move?" The design challenge is to make these two layers cooperate at workflow moments - creating Goals, filling Activity details, scheduling, and reflecting - without forcing users to maintain two visible taxonomies.

## Aspirational Design Challenge

How might we help Nina understand and correct the relationship between life context and growth direction, while preserving Kwilt's capture-first, identity-first model?

## Out Of Scope

- Replacing Arcs, Goals, Activities, or Chapters.
- Turning Areas into a primary navigation model.
- Turning Vectors into progress scores.
- Adding public/social comparison around Areas or Vectors.
- Making AI auto-create Areas or auto-rewrite Vectors without confirmation.

## Open Question

Should "Vectors" remain the user-facing label, or should the reconciliation include a naming pass that makes the concept feel less technical and more naturally connected to Goals and reflection?
