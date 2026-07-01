---
id: brief-ftux-goal-arc-onboarding
title: FTUX Goal+Arc Onboarding
status: draft
audiences: [audience-faith-and-values-driven-builders]
personas: [Sarah]
hero_jtbd: jtbd-see-who-im-becoming
job_flow: job-flow-sarah-see-who-im-becoming
serves: [jtbd-see-who-im-becoming, jtbd-name-my-arcs, jtbd-move-the-few-things-that-matter, jtbd-trust-this-app-with-my-life]
related_briefs: [brief-object-creation-ux-system, brief-activity-led-arc-creation]
owner: andrew
last_updated: 2026-06-27
---

# FTUX Goal+Arc Onboarding

## Context

The prior first-run Arc creation model asks users to produce identity-shaped input before many users have concrete material. The goal-first alternative is easier to understand, but if Arc creation is a second optional step the app can enter an incomplete state. FTUX should instead use one deterministic concrete-to-identity flow that creates both the first Goal and the Arc it belongs to.

This brief is now the first implementation slice of the broader [Object Creation UX System](object-creation-ux-system.md). FTUX should teach the shared creation grammar through one guided experience; later direct Goal creation and direct Arc creation should reuse that grammar in shorter, context-appropriate forms.

## Target audience

`audience-faith-and-values-driven-builders` because the first-run experience must establish Kwilt as an identity-driven life architecture tool, not a generic task app.

## Representative persona

Sarah, adapted for first-run. She starts with something concrete she wants to move and needs Kwilt to show the identity direction underneath it.

## Aspirational design challenge

How might we help Sarah and concrete-first users like Charlie create a first Goal and its identity Arc in one deterministic FTUX flow, while preserving Kwilt's Arc-first meaning model and avoiding extra conceptual setup?

## Hero JTBD

`jtbd-see-who-im-becoming` - FTUX must help the user see who they are becoming before the app feels worth returning to.

## Job flow step

`job-flow-sarah-see-who-im-becoming`, steps 2-4: find words for the direction, turn it into an Arc, and choose a Goal that expresses the Arc.

## JTBD framing

When a first-time user starts with a concrete thing they want to move, they need Kwilt to create both the immediate Goal and the identity context underneath it, so they enter the app with a coherent Arc -> Goal structure instead of a disconnected task or abstract aspiration.

## Design

FTUX uses a deterministic Goal+Arc survey:

1. `What kind of thing is it?`
2. `Name it in a few words.`
3. `What do you want to do with it?`
4. `What matters most about it?`
5. `Who is this helping you become?`

The survey produces structured inputs. AI synthesizes only after collection.

Resistance and support-style questions remain part of the broader creation grammar, but they are deferred until after the first activation payoff.

Output:

- one identity-shaped Arc,
- one concrete first Goal linked to the Arc,
- optional first Activity suggestion.

Reveal:

- show Arc as "Your direction",
- show Goal as "Your first goal",
- allow confirm or one lightweight tweak.

Save:

- persist Arc,
- persist Goal with `arcId`,
- set onboarding Arc and Goal ids.

Landing:

- navigate to Arc detail,
- show the linked Goal as the first expression of the Arc,
- offer a next action to plan/add the first Activity.

## Success signal

A first-time user can enter a concrete answer like `Tennis`, `Prayer`, `School assignments`, or `Stop scrolling at night`, complete deterministic questions, and understand the saved result as both a first Goal and the bigger Arc it belongs to.

## Spec refinement

Implementation should treat this as FTUX-only first. Do not redesign later direct Arc creation or normal Goal creation in the same slice.

The reason FTUX can ask more than direct Goal creation is first-session task success: the user needs Kwilt to create first value and teach the Goal -> Arc relationship without separate conceptual setup. Later Goal creation should probably be more guided than it is today, but it should expose a smaller subset of the same grammar so it remains fast.

Acceptance criteria:

- FTUX creates both an Arc and a linked Goal.
- User cannot complete first-run object creation with only a Goal.
- Generated Arc names are identity-shaped, not activity-shaped.
- Generated Goal titles are concrete and actionable.
- Landing goes to Arc detail.
- Arc detail visibly contains the first linked Goal.
- Tests cover structured survey output and paired generation context.

## Open questions

- Should the reveal happen before persistence, or should Arc detail serve as the first confirmation/review surface?
- Should first Activity suggestion be shown on reveal or only after landing?
- Which FTUX questions should graduate into direct Goal creation, and which should remain onboarding-only?
