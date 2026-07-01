# Diverge: Activation Experiment Loop

## Option 1: Weekly Activation Brief

### Shape

A recurring skill produces a weekly activation read:

- pipeline stage counts
- biggest drop-off
- stuck cohort
- recent movement
- likely opportunity
- one recommended area to inspect

The output remains read-only. Andrew decides whether to run a design loop and whether to create work in Kwilt.

### Objects touched

- No Kwilt objects are changed.
- The loop reads analytics and product docs only.

### Capture-first stance

No capture is blocked. This option does not write user or operator work into Kwilt.

### Strengths

- Lowest trust risk.
- Fastest to implement.
- Useful immediately as a recurring product review.

### Weaknesses

- Does not solve the core evaporation problem.
- Still relies on Andrew to convert insight into experiment work.
- Can become dashboard theater if not paired with action.

## Option 2: Activation Experiment Drafting Loop

### Shape

The loop runs the activation audit, identifies the highest-leverage weakness, frames it through the design loop, produces one experiment candidate, and prepares a Kwilt Goal draft with phase-level Activities. The write payload is previewed for review. When the Kwilt-write capability is available and approved, the loop can create the Goal and Activities.

### Objects touched

- Reads analytics, personas, JTBDs, job flows, and feature briefs.
- Writes or previews a Kwilt Goal for the experiment.
- Writes or previews phase-level Activities under that Goal.
- May create design exploration and feature brief artifacts when the experiment becomes accepted work.

### Capture-first stance

No end-user capture is blocked. Operator capture is improved: the experiment becomes durable work in Kwilt after review.

### Strengths

- Directly addresses the operating-model need.
- Turns insight into reviewable action without jumping to automatic implementation.
- Keeps the loop grounded in Kwilt's taxonomy and job flows.
- Fits Nina's trust job: inspect, approve, edit, audit.

### Weaknesses

- Needs careful thresholds so it does not draft experiments from noisy data.
- Needs a clear payload format for Kwilt writes.
- Still depends on future write integration for the full loop.

## Option 3: Closed-Loop Experiment Board

### Shape

The system maintains a full internal experiment board: backlog, active experiment, status, metrics, cohorts, ship dates, decision history, and reflection updates. It can automatically move experiments through stages and remind Andrew when decisions are due.

### Objects touched

- Many Goals and Activities, or a new internal experiment object.
- Analytics queries and reflection artifacts.
- Possibly a dedicated desktop/admin surface.

### Capture-first stance

End-user capture is unaffected. Operator capture is heavy and structured.

### Strengths

- Strong lifecycle management.
- Good for a larger product team or mature experimentation cadence.
- Makes reflection hard to forget.

### Weaknesses

- Too much surface area for the current stage.
- Risks inventing a project-management layer.
- Encourages experiment inventory before the basic audit-to-action loop is proven.

## Option 4: Manual Dashboard With Skill Buttons

### Shape

A lightweight internal dashboard shows the activation pipeline and offers buttons such as "Run diagnosis," "Run design loop," and "Draft Kwilt Goal."

### Objects touched

- Reads analytics.
- Writes only after explicit button-triggered actions.

### Capture-first stance

No capture is blocked. Operator action is manual.

### Strengths

- Highly inspectable.
- Useful if Andrew wants a visual cockpit.
- Can expose debug information and query status.

### Weaknesses

- Builds UI before proving the operating loop.
- Makes the dashboard the center instead of the learning rhythm.
- Slower than a skill/script learning release.

## Divergence summary

The options vary along two important axes:

- **Passive vs active:** brief/dashboard show evidence; drafting loop creates an experiment candidate.
- **Manual vs autonomous:** dashboard requires explicit operation; closed loop may over-automate.

The best first shape is likely Option 2: active enough to turn evidence into a draft experiment, but permissioned enough to preserve Andrew's judgment.
