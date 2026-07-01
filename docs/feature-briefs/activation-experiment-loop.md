---
id: brief-activation-experiment-loop
title: Activation Experiment Loop
status: draft
audiences: [audience-ai-native-life-operators, audience-burned-out-productivity-power-users]
personas: [Nina, Marcus]
hero_jtbd: jtbd-trust-this-app-with-my-life
job_flow: job-flow-nina-trust-ai-with-my-life-system
serves: [jtbd-trust-this-app-with-my-life, jtbd-move-the-few-things-that-matter, jtbd-carry-intentions-into-action, jtbd-capture-and-find-meaning]
related_briefs: [brief-build-continuity-control-plane, brief-dynamic-next-best-action, brief-meaningful-first-app-access]
owner: andrew
last_updated: 2026-06-29
---

## Context

Kwilt now has enough production telemetry to start treating activation as an operating loop rather than a one-off analytics question. The goal is meaningful daily active use: users should not merely open the app, but return to identity-anchored action, capture progress, and build a habit of follow-through. The current product-ops gap is that activation insight can emerge in a Codex/PostHog/Supabase thread but does not automatically become one grounded experiment and durable Kwilt work for review.

## Target audience

`audience-ai-native-life-operators` is the primary audience because this is an internal operator capability: Andrew is letting Codex and Kwilt work together near the product system. The capability must be inspectable, permissioned, reversible, and grounded.

`audience-burned-out-productivity-power-users` is the beneficiary audience because the experiments produced by the loop should improve Marcus's path from setup to daily meaningful action.

## Representative persona

Nina, adapted to the internal founder-operator case, is using AI tools, analytics, and Kwilt to operate product learning. She wants the system to notice activation weaknesses and draft the next experiment, but she does not want opaque automation to mutate the roadmap or create noisy work.

Marcus is the first beneficiary persona. He needs Kwilt to help him move the few things that matter, especially after setup when he needs to know the next honest action and capture progress without maintaining another system.

## Aspirational design challenge

How might we help Andrew turn activation telemetry into one evidence-backed, job-flow-grounded Kwilt experiment each cycle, while preserving human judgment, reviewable writes, and a clear path from insight to shipped learning?

## Hero JTBD

`jtbd-trust-this-app-with-my-life` - This is the demand spine because the loop asks an AI-assisted system to operate near product strategy and durable Kwilt records. The same trust contract required for user-facing AI operation applies here: preview, approval, editability, audit, and reversibility.

## Job flow step

Primary internal job flow: `job-flow-nina-trust-ai-with-my-life-system`.

This improves Nina's weak steps around AI suggesting changes, inspecting exactly what would change, approving or editing changes, and keeping actions auditable. The current delivery scores for inspect/approve/audit are low, so V1 must be preview-first.

Beneficiary job flow: `job-flow-marcus-move-the-few-things-that-matter`.

The first activation opportunity likely targets Marcus's weak handoff from plan to action: break a goal into activities, decide what to do next, and capture progress without maintaining the system.

## JTBD framing

When Andrew sees an activation weakness, he wants Kwilt and Codex to turn that evidence into one clear experiment candidate, so the product can improve the user's path toward meaningful daily active use without losing the insight in chat or turning activation into dashboard theater. The work serves `jtbd-trust-this-app-with-my-life` by keeping automation inspectable, `jtbd-move-the-few-things-that-matter` and `jtbd-carry-intentions-into-action` by targeting plan-to-action failures, and `jtbd-capture-and-find-meaning` by defining meaningful active use as real progress rather than raw opens.

## Design

### One sentence

The Activation Experiment Loop reads the activation pipeline, identifies the highest-leverage weak stage, runs a design-loop frame against that weakness, drafts one experiment, and prepares a Kwilt Goal with phase-level Activities for review.

### Loop stages

```text
Activation Audit
  -> Weakest Stage Diagnosis
  -> Design Loop Frame
  -> Experiment Candidate
  -> Kwilt Goal Draft
  -> Andrew Review
  -> Ship / Learn / Reflect
```

### Activation pipeline model

The loop should classify users into a stable activation path:

1. Signed Up / Installed
2. Oriented
3. Identity Anchored
4. Commitment Made
5. Plan Formed
6. First Meaningful Action
7. Return Hook Set
8. Day-2 Return
9. Activated
10. Daily Habit Candidate

The north star is meaningful daily active use. A meaningful active day should include app use plus at least one real progress signal, such as creating an Activity, completing or updating an Activity, invoking an Activity action, creating a Goal or Arc, using a Chapter next step, or responding to a notification in a way that leads to action.

### Slice 1 dashboard

The first implementation artifact is the PostHog dashboard [Activation - Pipeline & Experiments](https://us.posthog.com/project/266832/dashboard/1775561).

The dashboard is the visual readout for Slice 1, not the whole operating loop. It currently contains:

- `Activation - FTUX to first meaningful action (30d)` - strict funnel from `ftue_started -> ftue_completed -> arc_created -> goal_created -> activity_created -> activity_completion_toggled`, with a 30-day date range and 7-day conversion window.
- `Activation - Meaningful action volume (30d)` - daily volume for progress-like activation events: `activity_created`, `activity_completion_toggled`, `activity_action_invoked`, `goal_created`, `arc_created`, `chapter_next_step_cta_tapped`, and `notification_opened`.
- `Activation - Active users by app build (30d)` - daily unique users for `Application Became Active`, broken down by `$app_build`, to confirm reads are coming from current production builds after the analytics fix.
- A dashboard text card with the interpretation ritual: name the weakest stage, map it to a Kwilt job-flow gap, and create an experiment Goal only after the weak stage is clear.

The strict funnel is expected to be sparse until more external users enter through the current production build. Use the meaningful-action and app-build tiles as supporting signal when the funnel has too few users for confident experiment selection.

### Opportunity scoring

The loop should rank weaknesses using an explicit formula:

```text
opportunity = users_stuck
  x importance_of_next_stage
  x confidence_we_can_improve
  x proximity_to_daily_use
```

The score is a decision aid, not a decision replacement. The loop must show assumptions and confidence.

### Generative-credit posture

Most of the loop should run without generative credits.

Deterministic/code-only work:

- Pull PostHog insight data or Supabase counts.
- Compute funnel stage counts, drop-offs, week-over-week movement, and opportunity score.
- Detect insufficient sample size.
- Map known activation stage transitions to known job-flow gaps using a lookup table.
- Produce a templated Activation Pipeline Brief.
- Create or update Kwilt Activities/Goals from fixed templates.

Reserved for generative reasoning:

- Running the design loop after a weak stage has enough signal.
- Proposing or comparing experiment concepts.
- Writing nuanced Goal descriptions or experiment briefs.
- Reflecting on shipped experiment evidence.

The default weekly automation should be cheap: run the deterministic audit first, write a templated status if there is no strong signal, and spend generative credits only when the audit identifies a clear experiment-worthy activation weakness.

### Data contract

The loop reads:

- Supabase auth/users and product tables for object creation, update, and recent activity.
- PostHog mobile events for app lifecycle, screen flow, notifications, and client-side actions.
- The internal-user exclusion list, including known internal/test users.
- Persona, JTBD, and job-flow docs.

The loop outputs:

- Activation Pipeline Brief.
- Weakest Stage Diagnosis.
- Opportunity score and assumptions.
- Design Loop Frame.
- One Experiment Candidate.
- Kwilt Goal Draft payload.

### Experiment candidate format

Each candidate should include:

- Title.
- Target activation stage.
- Job-flow gap.
- Hypothesis.
- Buildable slice.
- Success metric.
- Disconfirming signal.
- Learning window.
- Release channel.
- Instrumentation needed.
- Why this is the one experiment to run next.

Default to one candidate. If confidence is low, produce an instrumentation recommendation instead of a speculative experiment.

### Kwilt Goal draft format

The Goal draft should include:

- Goal title: `Experiment: <plain-language experiment name>`
- Outcome: the behavior the experiment is trying to change.
- Hypothesis: one sentence.
- Target stage: activation pipeline stage.
- Success signal: metric or observable learning.
- Decision rule: proceed, revise, simplify, or retire.
- Review date or data threshold.

Phase-level Activities should be durable, not micro-task spam:

- Verify instrumentation.
- Inspect the stuck stage/cohort.
- Finalize the learning-release brief.
- Build the smallest intervention.
- Ship through the safest useful channel.
- Review the activation result.
- Decide continue, revise, or retire.

### First likely experiment

The first experiment this loop should probably draft is:

**Experiment: First Meaningful Action After Plan Formation**

Hypothesis: Users who create or receive Activities are more likely to return daily if Kwilt immediately gives them one calm, obvious next action instead of leaving them to browse or maintain the system.

Target stage: `Plan Formed -> First Meaningful Action -> Day-2 Return`.

Beneficiary job-flow gap: Marcus needs stronger "what now?" decision relief.

### Agent behavior

The loop should:

1. Pull or request the latest activation read.
2. Confirm internal-user filters.
3. Name the data window.
4. Classify stages and identify the weak point.
5. Map the weak point to job-flow language.
6. Produce one experiment candidate.
7. Preview the Kwilt Goal draft.
8. Ask for approval before writing once write tools are available.
9. After ship, trigger reflect-after-ship or an equivalent reflection pass.

### Guardrails

- Do not optimize for app opens alone.
- Do not create a dashboard as the primary output.
- Do not auto-write Goals or Activities without preview.
- Do not use named-user examples in durable artifacts unless deliberately redacted.
- Do not infer user motivation beyond the available evidence.
- Do not create a multi-experiment backlog by default.
- Do not implement the experiment automatically.

## Success signal

The loop is successful if Andrew can move from activation data to an accepted experiment Goal faster, with less rework and clearer job-flow grounding. Within three loop runs or one complete experiment cycle, at least one proposed experiment should be accepted or lightly edited, and the resulting Goal should be useful enough to guide build, ship, and reflection.

For the beneficiary side, the first shipped experiment should be evaluated against the targeted activation stage rather than generic engagement. If the first experiment targets plan-to-action, success means a higher share of new users form a plan, take one meaningful action within 24 hours, and return after day 0.

## Learning release

See [`docs/design-explorations/activation-experiment-loop/04-learning-release.md`](../design-explorations/activation-experiment-loop/04-learning-release.md).

## Spec refinement

Build-ready enough for an internal skill/script learning release, not yet for scheduled automation.

Clarified:

- V1 is internal/operator-facing.
- V1 produces one experiment candidate by default.
- V1 can preview Kwilt writes before the write integration is finished.
- V1 should use Goals and Activities rather than a new experiment object.
- V1 treats meaningful active days as progress actions, not raw opens.

Still to decide before implementation:

- Minimum cohort size or signal threshold before recommending an experiment.
- Whether design exploration files are created every run or only after Andrew accepts a candidate.
- Exact approval UX once Kwilt-write tools are available.
- Whether the recurring cadence should be weekly by default or manually triggered until the first complete cycle.

Acceptance criteria:

- The loop has a stable stage model and exclusion contract.
- The loop produces a consistent Activation Pipeline Brief.
- The loop can run a deterministic audit without generative reasoning.
- The loop maps the selected weak stage to a persona/JTBD/job-flow step.
- The loop produces one experiment candidate with hypothesis, success metric, disconfirming signal, learning window, and release channel.
- The loop produces a Kwilt Goal draft with phase-level Activities.
- The loop can stop with "insufficient signal" and recommend instrumentation.
- No durable write happens without preview and approval.

## Open questions

- Should this become a new Codex skill named `activation-experiment-loop`, or should it start as documentation plus reusable scripts?
- If PostHog remains the Slice 1 source of truth, which missing server-side stage counts should stay in Supabase-only follow-up reads?
- How should the future Kwilt-write loop represent experiment status: Goal description, Activity notes, tags, or a small structured metadata block?
