# Job Delivery Planning Agent

Use this contract for recurring or ad hoc agents that answer:

> What is the next highest-leverage enhancement or fix to make?

The agent's job is not only to answer the question. It must also run or refresh the relevant design loop and leave behind an implementation-ready plan.

## Operating Contract

- Start from the job, job steps, and promised outcome, not the current screen list.
- Use `docs/job-delivery-map.yaml` as the source artifact for scores, workflows, evidence, surface opportunities, and recommended actions.
- Run the repo checks before making a recommendation.
- Inspect current source or runtime evidence for the recommended step.
- Run, resume, or cite the relevant design loop before producing an implementation plan.
- Produce a concrete plan an implementation pass can execute without redoing product discovery.
- Do not implement product code during the planning run.
- Do not change delivery scores unless the maintenance guide's evidence rule is satisfied.

## Inputs

- `docs/job-delivery-map.yaml`
- `docs/job-delivery-maintenance.md`
- `docs/job-delivery-review-template.md`
- `docs/job-delivery-implementation-plan-template.md`
- relevant `docs/job-flows/` file
- linked `docs/design-explorations/`
- linked `docs/feature-briefs/`
- current source/runtime evidence for the selected step

## Required Loop

1. Mechanical health
   - Run `npm run job-delivery:check`.
   - Run `npm run job-delivery:next`.
   - Run `npm run job-delivery:review`.

2. Select the target step
   - Prefer the top `job-delivery:next` recommendation unless current evidence clearly invalidates it.
   - Record the job id, step id, current score, action type, and linked workflow or surface opportunity.

3. Inspect the current workflow
   - Read mapped route/component refs for the selected step.
   - Confirm whether the friction is still present, fixed, stale, or needs runtime proof.
   - If the current map is stale, report the stale assumption and recommend the evidence-gathering action before planning a feature.

4. Run the design loop
   - Use the Codex `design-thinking-loop` skill for this step.
   - If a linked design exploration already exists and still fits the selected step, cite the relevant frame, converge, learning-release, and evaluate-learning artifacts.
   - If no fitting design exploration exists, create or refresh `docs/design-explorations/<slug>/` using the design-thinking-loop phases through learning release and evaluation.
   - For small workflow fixes, the design loop can be lightweight, but it still needs frame, alternatives considered, convergence, learning-release scope, and evidence plan.

5. Produce the implementation-ready plan
   - Write the plan only when the recommendation is durable enough to implement.
   - Use `docs/job-delivery-implementation-plan-template.md`.
   - Save plans as `docs/job-delivery-plans/YYYY-MM-DD-<slug>.md`.
   - Include scoped tasks, acceptance criteria, verification commands, and map update triggers.

6. Report back
   - Lead with the recommendation.
   - Include the plan path.
   - Name any stale evidence or design-loop gaps.
   - State whether the map should be updated now, later, or not at all.

## When Not To Write A Plan

Do not write a new plan if:

- the top action is purely `verify` and current evidence is too stale to decide what to build,
- a current implementation plan already exists and still matches the recommendation,
- the design loop uncovered a user-owned product decision that needs Andrew's judgment,
- or the right action is `no_action`.

In those cases, report the blocker and the exact next evidence or decision needed.

## Output Standard

The final output should be short enough to read in a daily loop:

- Recommendation
- Why this is highest leverage
- Design-loop basis
- Implementation plan path
- Verification needed
- Map update needed: yes/no/later
