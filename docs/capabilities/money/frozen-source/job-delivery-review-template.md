# Job Delivery Review Template

Use this template for daily or ad hoc Kwilt Money build loops.

Input:

- `docs/job-delivery-map.yaml`
- `docs/job-delivery-maintenance.md`
- relevant `docs/job-flows/` file
- linked feature briefs and design explorations
- current code/runtime evidence when a score or recommendation depends on current behavior

Rules:

- Jobs before screens.
- Evidence before score changes.
- Label assumptions clearly.
- Recommend one next action per weak step.
- If the best next move is a new surface, run or resume a design loop before implementation.
- If the review is running as a planning agent, turn the selected design loop into an implementation-ready plan.
- Do not update the map unless a shipped change, runtime proof, learning result, or explicit product decision justifies it.
- Use the maintenance guide when deciding whether to update evidence, scores, surface opportunities, or next actions.

Quick command:

```sh
npm run job-delivery:next
```

Fuller ranked report:

```sh
npm run job-delivery:review
```

Planning-agent contract:

```text
docs/job-delivery-agent.md
```

## Review Header

Date:
Reviewer:
Job:
Promised outcome:
Audience/persona:
Hero JTBD:

## Current Delivery Snapshot

Overall read:

Weakest high-value step:

Strongest current step:

Most important stale assumption:

## Top Gaps

| Rank | Step | Score | Evidence | Main friction | Recommended action |
| --- | --- | ---: | --- | --- | --- |
| 1 |  |  |  |  |  |
| 2 |  |  |  |  |  |
| 3 |  |  |  |  |  |

## Workflow Review

Current UX workflow needing improvement:

- Flow:
- Job step served:
- What breaks or drags:
- What would make traversal easier:
- Next action: `implement` / `verify` / `run_design_loop` / `reflect_after_ship` / `no_action`

## Surface Opportunity Review

Potential missing or underused surface:

- Surface:
- Job step served:
- Hypothesis:
- Existing design loop:
- Why current in-app flows may be insufficient:
- Next action:

## Recommended Next Build Move

Recommendation:

Why this is the highest-leverage move:

Design-loop basis:

Implementation-ready plan:

What not to do yet:

Verification or learning evidence needed:

## Optional Map Update

Update needed: yes/no

If yes:

- Field(s) to change:
- Evidence supporting the change:
- Maintenance trigger: feature brief / implementation / runtime verification / design loop / learning release / reflection / stale audit
- Owner:
- Follow-up review date:

## Example Output Shape

```markdown
Job Delivery Review - 2026-07-03

Job: Review Budget Reality Before Spending
Promised outcome: Maya sees live budget reality before opening a spend-triggering app.

Weakest high-value step:
Choose whether to open the app for now - 2/5.

Evidence:
The review screen records an unlock review, and Screen Time controls exist, but the app-control rehearsal path is not wired and "Leave blocked" is not a first-class choice.

Recommended next build move:
Implement the app-gate rehearsal path: budget detail -> app controls -> test review -> Open for now / Leave blocked -> review receipt.

Surface opportunity:
The iOS widget loop remains relevant for the earlier "What spending area am I trying to keep intentional?" and "Am I okay to spend right now?" steps, but it should not preempt fixing the broken app-gate traversal unless ambient visibility becomes the bottleneck.
```
