# Converge: Activation Experiment Drafting Loop

## Chosen option

Option 2: **Activation Experiment Drafting Loop**.

## Why this option

The core user need is not to see more activation data. The need is to close the loop from evidence to action:

1. Find the weakest activation stage.
2. Explain why that stage matters.
3. Map it to a Kwilt job-flow gap.
4. Draft one experiment.
5. Prepare the Kwilt Goal and Activities for review.

Option 2 does that without overreaching into automatic roadmap management or a new dashboard surface.

## Product concept

The Activation Experiment Drafting Loop is an internal operator loop that turns activation telemetry into one reviewable experiment candidate.

The loop runs on demand at first, and later on a weekly cadence. It reads the activation pipeline, excludes internal users, identifies the largest opportunity, frames the weakness through Kwilt's audience/persona/JTBD/job-flow model, drafts one experiment, and prepares a Kwilt Goal payload for Andrew to approve.

## Stated bet

Andrew will make faster and better activation decisions if Codex can regularly convert usage evidence into one job-flow-grounded experiment draft and a reviewable Kwilt Goal, instead of leaving insights scattered across analytics tools and chat threads.

## Capability delta

### Cannot be done reliably today

- Re-run the same activation pipeline read without bespoke query work.
- Exclude internal users consistently across Supabase/PostHog interpretation.
- Classify the current weakest activation stage and opportunity.
- Automatically frame that stage against a Kwilt job-flow gap.
- Produce one experiment candidate in a consistent format.
- Convert the experiment into a Kwilt Goal draft with phase-level Activities.

### Becomes possible after the learning release

- Run `activation-experiment-loop` on demand and receive a consistent Activation Pipeline Brief.
- See the highest-leverage activation weakness and why it matters.
- Review one experiment candidate with hypothesis, target stage, success metric, and decision rule.
- Preview the Kwilt Goal/Activities payload.
- Once write integration is available, approve the payload to create durable Kwilt work.

### Still intentionally unsupported

- Automatic implementation of the experiment.
- Automatic roadmap prioritization beyond the single candidate.
- Production dashboarding.
- User-level scoring or surveillance.
- Auto-writing to Kwilt without preview and approval.

## Activation path

The loop itself has an activation path for Andrew:

1. Run an activation audit manually.
2. Trust that the pipeline classification is consistent.
3. See a weak stage described in behavioral terms.
4. Accept the design-loop frame.
5. Review one experiment candidate.
6. Approve or edit the Kwilt Goal draft.
7. Use the Goal to ship and later reflect.

## First likely experiment

Based on the current activation read, the first experiment candidate should likely target:

- Stage: `Plan Formed -> First Meaningful Action -> Day-2 Return`
- User job-flow gap: Marcus needs help deciding the next honest action after setup.
- Product hypothesis: Users who create or receive Activities are more likely to return daily if Kwilt immediately gives them one calm, obvious next action instead of leaving them to browse or maintain the system.

## Guardrails

- Prefer aggregate/cohort reads over named-user stories unless debugging requires identity.
- Show confidence and assumptions.
- Produce one candidate by default.
- Keep raw app opens separate from meaningful active days.
- Require review before durable Kwilt writes.
- If evidence is too thin, say "insufficient signal" and recommend instrumentation before experiment design.

## Open questions

- What minimum sample size or activity threshold should trigger a confident experiment recommendation?
- Should the loop produce a design exploration every time, or only when Andrew accepts the experiment candidate?
- Should the first implementation be a Codex skill, a repo script, or both?
