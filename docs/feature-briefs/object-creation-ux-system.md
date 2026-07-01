---
id: brief-object-creation-ux-system
title: Object Creation UX System
status: draft
audiences: [audience-faith-and-values-driven-builders, audience-burned-out-productivity-power-users]
personas: [Sarah, Marcus]
hero_jtbd: jtbd-see-who-im-becoming
job_flow: job-flow-sarah-see-who-im-becoming
serves: [jtbd-see-who-im-becoming, jtbd-name-my-arcs, jtbd-move-the-few-things-that-matter, jtbd-carry-intentions-into-action, jtbd-trust-this-app-with-my-life]
related_briefs: [brief-ftux-goal-arc-onboarding, brief-activity-led-arc-creation]
owner: andrew
last_updated: 2026-06-29
---

# Object Creation UX System

## Context

The FTUX Goal+Arc work revealed a larger system problem: Kwilt needs a dependable way to help users create Arcs and Goals from whatever language they naturally have available. FTUX should create a Goal first, then use that concrete material to discover the identity Arc underneath it. But that cannot become an isolated onboarding trick. Direct Goal creation and direct Arc creation need to feel like later exposures to the same creation grammar.

## Target audience

Primary: `audience-faith-and-values-driven-builders`, because object creation must establish Kwilt as a place for becoming, not just a place for tasks.

Secondary: `audience-burned-out-productivity-power-users`, because direct Goal creation must help users move the few things that matter without adding planning overhead.

## Representative persona

Sarah starts with something concrete she wants to move and needs Kwilt to show the identity direction underneath it.

Marcus knows he wants a Goal and needs fast, safe creation that still attaches to the right Arc and does not become another system to maintain.

## Aspirational design challenge

How might we make every Kwilt object-creation flow feel like one dependable creation system, while letting each entry point ask only the minimum questions needed for that user's moment?

## Hero JTBD

`jtbd-see-who-im-becoming` - Creation must help the user see who they are becoming before the object hierarchy feels worth maintaining.

## Job flow step

Primary: `job-flow-sarah-see-who-im-becoming`, steps 2-4: find words for a direction, turn it into an Arc, and choose a Goal that expresses the Arc.

Secondary: `job-flow-marcus-move-the-few-things-that-matter`, steps 2-4: name the few commitments that matter, turn one commitment into a concrete Goal, and break the Goal into action.

## JTBD framing

When a user begins with fuzzy intent, concrete activity, or identity aspiration, they need Kwilt to shape that input into the right object without making them learn the taxonomy first. A Goal should feel like concrete progress; an Arc should feel like identity direction; FTUX should teach that relationship by creating both together.

## Design

### Creation grammar

Kwilt object creation should share one underlying grammar:

1. **Focus** - what the user can name right now.
2. **Goal shape** - what near-term progress should look like.
3. **Meaning** - what matters most about the focus.
4. **Identity bridge** - who this helps the user become.
5. **Resistance** - where it usually gets hard.
6. **Support style** - what kind of help should fit the user.

The questions do not have to be identical across entry points. The grammar should be.

### FTUX creation

FTUX is the full guided exposure:

- starts with concrete focus,
- asks deterministic questions,
- creates one concrete first Goal,
- creates one identity-shaped Arc discovered from the Goal context,
- links the Goal to the Arc,
- lands on Arc detail so the user sees the Goal inside its becoming context.

### Direct Goal creation

Direct Goal creation should be faster than FTUX, but not unguided by default.

Candidate direction:

- Ask for focus / desired progress.
- Ask timeframe only when useful.
- Require or infer Arc attachment safely.
- Ask one lightweight meaning or identity question when the Goal lacks enough context to attach well.
- Do not force the full FTUX questionnaire.

Reason this can differ from FTUX: the user is usually later, more oriented, and trying to move quickly. The system should guide only enough to create a valid, useful Goal.

### Direct Arc creation

Direct Arc creation should support two starts:

- **Identity-first**: for users who can already name who they want to become.
- **Activity-to-identity**: for users who only know the concrete thing, like "tennis" or "money" or "school."

Direct Arc creation may create only an Arc, or optionally seed a first Goal when the user's input contains concrete progress material. It should not force a Goal when the user is intentionally naming a long-term identity direction.

### Shared source of truth

Deterministic options, hidden generation meanings, validation rules, and task-success tests should live in canonical config, currently `packages/arc-survey`.

## Initiative backlog

### Parent goal: dependable creation UX for Arcs and Goals

- [ ] Document the cross-object creation grammar. Owner doc: this brief.
- [ ] Finish FTUX Goal+Arc implementation as the first learning slice. Owner doc: `docs/feature-briefs/ftux-goal-arc-onboarding.md`.
- [ ] Update FTUX questionnaire copy and option sets until it works for concrete inputs, aspiration-heavy inputs, teen inputs, and adult inputs.
- [x] Add pressure-test personas and sample first answers for the deterministic FTUX question set. Owner doc: `docs/design-explorations/object-creation-ux-system/06-deterministic-question-pressure-test.md`.
- [ ] Decide whether direct Goal creation needs a minimal guided flow by default.
- [ ] Align direct Goal creation with the shared grammar while preserving speed.
- [ ] Decide whether direct Arc creation should expose identity-first vs activity-to-identity starts.
- [ ] Align direct Arc creation with the shared grammar without collapsing Arcs into Goals.
- [ ] Add tests around structured survey output, Goal quality, Arc identity quality, and linkage behavior.
- [ ] Update feature manifests for onboarding, goals, and arcs as slices ship.

### Current nested todo: FTUX Goal+Arc

- [x] Branch isolated for activity-to-identity onboarding implementation.
- [x] Replace FTUX Arc-only questionnaire with deterministic Goal+Arc questionnaire.
- [x] Skip redundant FTUX intro confirmation and land directly on the first input.
- [x] Improve first input spacing and keyboard behavior.
- [ ] Finalize the FTUX question sequence after simulator pressure testing.
- [ ] Verify generated Arc and Goal language against real sample inputs.
- [ ] Decide whether reveal happens before persistence or Arc detail is the first review surface.

### Later nested todo: direct Goal creation

- [ ] Inventory current direct Goal creation questions and Agent Workspace behavior.
- [ ] Define the minimal guided direct Goal flow.
- [ ] Decide how Arc attachment works when the user starts from Goals tab with 0, 1, or multiple Arcs.
- [ ] Make manual and AI Goal creation share the same validity rules.
- [ ] Decide whether direct Goal creation can ever create a new Arc suggestion.

### Later nested todo: direct Arc creation

- [ ] Inventory current direct Arc creation questions.
- [ ] Decide path choice: identity-first, activity-to-identity, or inferred.
- [ ] Define when direct Arc creation may suggest a first Goal.
- [ ] Ensure direct Arc creation still produces identity-shaped Arcs.

## Success signal

A user can create their first Goal+Arc in FTUX, later create a direct Goal, and later create a direct Arc without feeling like Kwilt changed theories about what Goals and Arcs are.

## Spec refinement

This brief is the parent initiative. FTUX Goal+Arc remains the current implementation slice. Do not redesign direct Goal creation or direct Arc creation in the FTUX slice unless a specific simulator finding blocks FTUX task success.

Build order:

1. Finish and observe FTUX Goal+Arc.
2. Use FTUX learnings to define minimal guided direct Goal creation.
3. Then revisit direct Arc creation path choice.

## Open questions

- Should direct Goal creation always ask one meaning/identity question, or only when Arc attachment/context is ambiguous?
- Should direct Arc creation default to identity-first or ask the user which kind of start they have?
- Should the shared creation grammar stay in `packages/arc-survey`, or should it become a broader `object-creation` package once Goal creation adopts it?
