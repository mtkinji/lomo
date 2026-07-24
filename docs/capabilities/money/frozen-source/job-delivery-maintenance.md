# Job Delivery Map Maintenance

Use this guide to keep `docs/job-delivery-map.yaml` dependable as Kwilt Money changes.

The map should update when our truth about Maya's ability to complete a job step changes. It should not update just because a screen changed, a feature shipped, or someone has a new opinion.

## Source Of Truth

- Map: `docs/job-delivery-map.yaml`
- Review template: `docs/job-delivery-review-template.md`
- Planning agent contract: `docs/job-delivery-agent.md`
- Implementation plan template: `docs/job-delivery-implementation-plan-template.md`
- Implementation plans: `docs/job-delivery-plans/`
- Job-flow source: `docs/job-flows/`
- Design loops: `docs/design-explorations/`
- Feature briefs: `docs/feature-briefs/`

## Maintenance Rule

Every meaningful product change should answer:

> Did this change what we believe about Maya's ability to complete a job step?

If yes, update the map or create a review note that explains why the map should change later.

If no, leave the map alone.

## When To Check The Map

Check the map at these moments:

1. Feature brief creation
2. Before implementation starts
3. Before finishing a development branch
4. After runtime verification
5. After a design loop converges
6. After a learning release ships
7. During daily or ad hoc Job Delivery Reviews

## Feature Brief Checklist

Every user-facing feature brief should name:

- Job id
- Job step id
- Current delivery score, if known
- Expected delivery improvement
- Evidence needed before changing the score
- Whether the work improves an existing UX flow or explores a missing surface
- Linked design exploration, if the work is non-trivial

The repository enforces this with:

```sh
npm run job-delivery:check
```

To ask for the next highest-leverage move, run:

```sh
npm run job-delivery:next
```

Example:

```markdown
Job step: `choose-intentional-access`
Expected movement: 2 -> 3 if simulator review proves the rehearsal path works.
Evidence needed: budget detail -> app controls -> test review -> Open for now / Leave blocked -> review receipt.
```

## Before Implementation

Before building a user-facing change, check:

- Which mapped job step does this serve?
- Is the current recommendation `implement`, `verify`, `run_design_loop`, `reflect_after_ship`, or `no_action`?
- Does the change improve current traversal, add evidence, or introduce a new surface?
- What proof would justify a map update?

If the answer is "new surface" and no design loop exists, run a design loop before implementation.

## During Completion Review

Before calling a user-facing change done, ask:

- Did the change affect a mapped job step?
- Did it add, remove, or materially change a UX flow?
- Did it create runtime evidence?
- Did it invalidate a current assumption?
- Should any `current_friction`, `evidence`, `surface_opportunities`, `recommended_next_action`, or `delivery_score` field change?

Most completed work should update evidence, friction, or next action before it updates a score.

## Score Change Rules

Only change a score when at least one of these is true:

- A shipped change has been verified in the real app or simulator.
- A smoke test or E2E test proves the relevant workflow.
- Self-use or user feedback shows the step became easier or harder.
- Analytics or support evidence shows a changed behavior pattern.
- Andrew makes an explicit product judgment and the assumption is recorded.

Do not change a score for:

- Code existence alone.
- A design exploration that has not shipped or been tested.
- A feature brief moving to `draft` or `concept-ready`.
- A screenshot that does not prove traversal.
- A local assumption that is not recorded.

## Evidence Updates

Use evidence statuses consistently:

- `observed` - directly seen in code, app, simulator, or docs.
- `prior_evidence` - true in a previous verified run; may need refresh.
- `needs_runtime_check` - plausible, but not verified in the live path.
- `needs_learning` - requires self-use, user feedback, or repeated behavior.
- `observed_gap` - a gap was directly seen.

When adding evidence, include the smallest useful refs:

- route or component path,
- feature brief,
- design exploration,
- smoke command,
- screenshot path,
- review note,
- or runtime observation.

## Design Loop Updates

After a design loop changes the product direction, update the relevant `surface_opportunities` entry:

- `hypothesis`
- `job_elevation`
- `linked_design_exploration`
- `design_loop_status`
- `next_action`

Suggested statuses:

- `not_started`
- `candidate`
- `framed`
- `diverged`
- `converged`
- `concept_ready`
- `learning_release_built`
- `verified`
- `retired`

Design loops do not automatically change delivery scores. Scores change when the loop produces verified product behavior or a recorded product decision.

## Daily Or Ad Hoc Review

Use `npm run job-delivery:next` for the simplest "what should we improve next?" question.

Use `docs/job-delivery-review-template.md` or `npm run job-delivery:review` when you need the fuller ranked review.

Use `docs/job-delivery-agent.md` when the loop should produce an implementation-ready plan. That agent should:

- run the job-delivery checks,
- inspect current source or runtime evidence,
- run, resume, or cite the relevant design loop,
- write a plan under `docs/job-delivery-plans/YYYY-MM-DD-<slug>.md`,
- and stop before implementing product code.

Default output should stay short:

- weakest high-value step,
- evidence,
- recommended next build move,
- surface opportunity, if relevant,
- implementation plan path, if one was produced,
- map update needed: yes/no.

Store review outputs only when they contain useful durable learning. If stored, use:

```text
docs/job-delivery-reviews/YYYY-MM-DD-<slug>.md
```

Do not store routine reports that add no new evidence or decision.

Store implementation-ready plans when the recommendation is durable enough for a build pass. If stored, use:

```text
docs/job-delivery-plans/YYYY-MM-DD-<slug>.md
```

Do not store a plan when the right next action is only to gather evidence or ask Andrew for a product decision.

## Post-Ship Reflection

After a shipped user-facing change, update the map if the change affected job delivery.

Reflection questions:

- What job step changed?
- What did the user previously have to do?
- What can the user do now?
- What proof do we have?
- What score, evidence, friction, or next action should change?
- What remains weak?

If the proof is incomplete, update evidence with `needs_runtime_check` instead of changing the score.

## Stale Map Audit

Run a stale-map audit when:

- a major route or feature brief changes,
- a design exploration supersedes an older one,
- the app ships a meaningful UX change,
- or more than a week of active product work passes without a map check.

Audit questions:

- Are referenced paths still real?
- Are scores still supported by evidence?
- Are `recommended_next_action` fields still accurate?
- Are any surface opportunities obsolete?
- Did new work create a better next action?

## What Good Maintenance Looks Like

Good:

- A small evidence update after simulator proof.
- A score change with clear before/after traversal evidence.
- A surface opportunity moving from `candidate` to `concept_ready` after a design loop.
- A recommendation changing from `implement` to `verify` after code lands.

Not good:

- Updating scores because a feature "feels better."
- Adding every idea as a surface opportunity.
- Turning the map into a backlog.
- Letting old assumptions remain as current evidence.
- Treating current screens as the boundary of the job.
