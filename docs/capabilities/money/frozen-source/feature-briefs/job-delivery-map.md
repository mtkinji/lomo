---
id: brief-job-delivery-map
title: Job Delivery Map
status: learning-release-built
audiences: [audience-aspirational-family-organizers]
personas: [Maya]
hero_jtbd: jtbd-move-the-few-things-that-matter
job_flow: job-flow-maya-review-budget-reality-before-spending
job_step: sustain-household-pattern
serves: [jtbd-move-the-few-things-that-matter, jtbd-put-intention-before-impulse, jtbd-carry-intentions-into-action, jtbd-trust-this-app-with-my-life, jtbd-review-budget-reality-before-spending]
related_briefs: [brief-budget-reality-gate, feature-ios-budget-widgets]
exploration: docs/design-explorations/job-delivery-map
owner: andrew
last_updated: 2026-07-03
---

# Job Delivery Map

## Summary

Kwilt Money should maintain a docs-first Job Delivery Map that connects promised outcomes to job steps, current UX flows, evidence, delivery scores, surface opportunities, and design-loop status.

The map lets Andrew and Codex repeatedly ask:

- How well does the app deliver the promised outcome?
- Which job step is weakest?
- Which UX workflow needs improvement next?
- Is the right next action implementation, verification, or a design loop?
- Is the missing solution an existing in-app flow or a new surface such as an iOS widget?

## User Problem

Kwilt Money can improve individual screens while still missing Maya's real job. A budget detail page can become more polished even when the higher-leverage improvement is an ambient glance surface or a Screen Time review gate. The build loop needs a durable way to assess outcome delivery by job step, not by screen.

## Target Audience

`audience-aspirational-family-organizers` - households trying to become more organized without adopting a productivity methodology.

The direct user of this internal artifact is Andrew/Codex, but the artifact exists to improve Maya's product experience.

## Representative Persona

Maya wants calm support for ordinary family spending decisions. She is not trying to run a finance dashboard. Product work should be judged by whether it helps her keep intentional spend categories present at the moments where drift happens.

## Aspirational Design Challenge

How might we help Andrew and Codex routinely improve Kwilt Money by asking how well Maya can traverse each job step, while preserving a lightweight, evidence-based design loop that can discover better surfaces beyond the current app screens?

## Chosen Concept

Create a structured `docs/job-delivery-map.yaml` plus `docs/job-delivery-review-template.md`.

The first map covers `job-flow-maya-review-budget-reality-before-spending` and records:

- job id,
- promised outcome,
- persona and audience,
- hero JTBD,
- job steps,
- user question per step,
- desired outcome per step,
- current UX flows,
- evidence,
- delivery score,
- current friction,
- surface opportunities,
- design-loop status,
- recommended next action.
- maintenance rules for keeping the map dependable during development.

## Product Principles

- Jobs before screens.
- Evidence before score changes.
- Current flows plus missing surfaces.
- Design loop before non-trivial new surfaces.
- Small enough for daily use.
- Honest about assumptions.
- Feature briefs improve a named job step.
- Reviews produce a next action, not a giant report.

## Learning Release

Release channel: local build.

Build the docs-first artifact and run one Job Delivery Review manually through Codex.

Must be real:

- `docs/job-delivery-map.yaml`.
- `docs/job-delivery-review-template.md`.
- One complete mapped job.
- Surface opportunity linked to `docs/design-explorations/ios-budget-widgets`.
- Gap linked to the app-gate/review workflow.
- Review output shape that can be reused in daily/ad hoc loops.

Can be thin:

- Manual scores.
- Manual evidence links.
- Prompt/template runner instead of script.
- One persona/job.

Excluded:

- User-facing app UI.
- Analytics automation.
- Multi-job coverage.
- Implementation of widgets or gates.

## Acceptance Criteria

- [x] The map includes the first Budget job and its steps.
- [x] Each step names the user question and desired outcome.
- [x] Each step links current UX flows and evidence.
- [x] Each step includes a delivery score with an evidence/assumption note.
- [x] At least one step includes an iOS widget surface opportunity.
- [x] At least one step includes a Screen Time/app-gate surface opportunity.
- [x] The review template can produce a ranked top-gap report.
- [x] The template asks whether the next action is implementation, verification, design loop, or reflection.
- [x] The maintenance guide defines when and how to update evidence, scores, surface opportunities, and next actions.
- [x] The artifact does not require app code changes.

## Spec Refinement

Clear enough to build:

- The repo already has JTBD, persona, job-flow, feature-brief, and design-exploration docs.
- Existing explorations already use the phase structure this concept should link to.
- The first map can be hand-authored from current docs and code evidence.

Needs decision before implementation:

- Whether the review runner is only a Markdown template first or also a script.
- Whether `docs/job-delivery-map.yaml` should update the existing job-flow delivery scores or remain separate.
- Whether daily review outputs should be stored under `docs/job-delivery-reviews/` or kept ephemeral until the loop proves useful.

Assumptions made:

- One mapped job is enough to validate the pattern.
- The map should be structured YAML because Codex and scripts can read it easily.
- Manual evidence-based scoring is more useful than premature analytics automation.
- Design-loop links should point to existing exploration folders rather than duplicating them.

Verification evidence:

- `docs/job-delivery-map.yaml` validates as readable YAML.
- A Job Delivery Review can be generated from the map without extra context.
- The review produces a concrete recommended next action.
- The output correctly recognizes when a weak step should launch a design loop, using iOS widgets as the example.

## Built Learning Release

Built artifacts:

- `docs/job-delivery-map.yaml`
- `docs/job-delivery-review-template.md`
- `docs/job-delivery-maintenance.md`
- `docs/job-delivery-agent.md`
- `docs/job-delivery-implementation-plan-template.md`

The first map covers `job-flow-maya-review-budget-reality-before-spending` with seven job steps, current UX flows, evidence, scores, friction, surface opportunities, and recommended next actions.

The recurring-agent layer now turns a high-leverage review into an implementation-ready plan. The first produced plan is `docs/job-delivery-plans/2026-07-03-app-gate-rehearsal-path.md`.
