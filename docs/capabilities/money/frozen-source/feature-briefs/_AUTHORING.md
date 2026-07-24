# Feature Brief Authoring

Every user-facing Kwilt Money feature brief should connect to the Job Delivery Map unless it is explicitly internal or operational.

## Required Front Matter

```yaml
id: brief-example
title: Example
status: draft
audiences: [audience-aspirational-family-organizers]
personas: [Maya]
hero_jtbd: jtbd-put-intention-before-impulse
job_flow: job-flow-maya-review-budget-reality-before-spending
job_step: choose-intentional-access
serves: [jtbd-put-intention-before-impulse]
related_briefs: []
owner: andrew
last_updated: 2026-07-03
```

If a brief has `job_flow`, it must also include `job_step` matching a step id in `docs/job-delivery-map.yaml`.

Internal-only briefs may opt out:

```yaml
job_delivery_map: opt_out
```

Use opt-out sparingly. If the work affects a user-visible flow, it should map to a job step.

## Required Sections

Include a short Job Delivery section:

```markdown
## Job Delivery

- Job: `review-budget-reality-before-spending`
- Step: `choose-intentional-access`
- Current score: 2
- Expected delivery change: 2 -> 3 if simulator verification proves the full rehearsal path.
- Evidence required: budget detail -> app controls -> test review -> Open for now / Leave blocked -> review receipt.
- Map update trigger: after runtime verification.
```

## Completion Checklist

Before finishing the feature, answer:

- Did this change affect the mapped job step?
- Did it add, remove, or materially alter a UX flow?
- Did it create evidence that should be added to `docs/job-delivery-map.yaml`?
- Should friction or recommended next action change?
- Should the delivery score change, and what proof supports that?

Run:

```sh
npm run job-delivery:check
```

To inspect the next highest-leverage map recommendation before or after the brief:

```sh
npm run job-delivery:next
```
