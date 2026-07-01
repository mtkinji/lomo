# Frame: Activation Experiment Loop

## What the user said

> My goal for these users is daily active use. I want to track the activation path towards that in a pipeline.
>
> In a model where we are trying to optimize for activation, we'd want to identify where it is failing, or where the biggest oppo to improve is, then experiment to improve it.
>
> This is feeling like a really compelling operating model dynamic. Like I'm wondering how to automate it with loops and skills, etc.
>
> Yes to the activation audit loop. After that I'd run a Design Loop to address activation funnel weakness and produce an experiment to run. Then I'd have the loop write to a Goal to Kwilt to for that specific Experiment and its todos for me to review... or something like that.
>
> The design loop itself should trigger the loop to write to Kwilt, we're building that in another thread now.

## Restated in user voice

When I look at activation, I do not just want a dashboard. I want a loop that notices where users are failing to become daily active, frames the highest-leverage weakness through Kwilt's product model, drafts one experiment, and turns that experiment into reviewable work in Kwilt before the insight evaporates.

## Target audience

`audience-ai-native-life-operators` - AI-native life operators.

This is an internal operator capability first: Andrew is using Codex, PostHog, Supabase, product skills, and Kwilt together as a life/work operating surface. The closest established audience is Nina because the core trust issue is the same: AI can operate near an important system only when its actions are inspectable, permissioned, reversible, and grounded.

## Representative persona

Nina, adapted to the internal founder-operator case.

- Current situation: She has enough product intuition and enough telemetry to see activation problems, but the loop from evidence to experiment to durable work still happens manually in chat.
- What she's trying to become/do: Operate Kwilt with a weekly learning rhythm where product decisions are grounded in real activation behavior and job-flow gaps.
- Emotional state or tension: Excited that the operating model is compelling, but wary of turning it into dashboard theater or opaque automation.
- What would make this feel wrong to her: Silent roadmap mutation, shallow metric optimization, PII-heavy summaries, or many speculative experiments instead of one reviewable bet.

## Hero anchor

`jtbd-trust-this-app-with-my-life` - Nina will only let AI operate near her life/work system if she can inspect, approve, edit, and audit what changes.

## Beneficiary job flow

`job-flow-marcus-move-the-few-things-that-matter`

The loop exists to improve real user activation, not just internal process. The current activation read suggests the most important beneficiary gap is Marcus moving from setup into daily action:

- Break the goal into activities: delivery score 3.
- Decide what to do next: delivery score 3.
- Capture progress without maintaining the system: delivery score 4, but only after the user has crossed into meaningful use.

The likely product weakness is not that users cannot create identity structure. It is that after Arc/Goal/Activity setup, they do not reliably return to one obvious next action and record meaningful progress.

## Active anchors

- `jtbd-trust-this-app-with-my-life` - The loop must preview its diagnosis, experiment, and Kwilt-write payload before durable mutation.
- `jtbd-move-the-few-things-that-matter` - The experiments should improve the user's ability to carry an intention into real action.
- `jtbd-carry-intentions-into-action` - The activation pipeline should treat plan-to-action as the central behavioral handoff.
- `jtbd-capture-and-find-meaning` - A meaningful active day should include captured progress or a real action, not only an app open.

## Friction we're addressing

Activation analysis currently depends on a human asking the right question, pulling the right data, remembering to exclude internal users, interpreting the funnel, connecting the result back to job flows, and deciding what experiment to run. That work can produce strong insight in a thread, but the insight is fragile until it becomes a durable Goal and phase-level Activities in Kwilt.

## System alignment

Constraint posture: `Extend the system`

Current system facts:

- PostHog and Supabase can supply activation and usage evidence.
- Kwilt's product taxonomy already connects analytics to audiences, personas, JTBDs, and job flows.
- `design-thinking-loop` can frame, diverge, converge, and produce learning-release artifacts.
- Kwilt Goals and Activities are the durable planning units.
- A separate thread is building the Kwilt-write capability from design-loop artifacts.

Constraints to preserve:

- Do not create a generic KPI dashboard as the primary product.
- Do not let the loop silently create roadmap work or mutate Kwilt without preview.
- Do not optimize for raw opens when the stated goal is meaningful daily active use.
- Do not leak user-level PII into durable artifacts unless explicitly needed and consented.
- Do not create a new Kwilt object type for experiments unless Goals and Activities fail.

Constraints we may challenge:

- Activation review should become a recurring skill/loop, not a bespoke analysis thread.
- Design-loop output should be able to hand off directly into Kwilt once the write contract exists.
- The loop may need a small structured "experiment candidate" format that sits between analytics and feature briefs.

## Aspirational design challenge

How might we help Andrew turn activation telemetry into one evidence-backed, job-flow-grounded Kwilt experiment each cycle, while preserving human judgment, reviewable writes, and a clear path from insight to shipped learning?

## Out of scope

- A production analytics dashboard.
- Automatic experiment selection without user review.
- Automatic code implementation.
- User-level behavioral scoring or activation grades.
- Any user-facing shame, streak-loss, or urgency framing.
- A separate project-management layer outside Kwilt Goals and Activities.

## Open question

Should the first implementation live purely as a Codex skill, or as a skill plus a small saved query/script package that standardizes the activation pipeline data pull?
