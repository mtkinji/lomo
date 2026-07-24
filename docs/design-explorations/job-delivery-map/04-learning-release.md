# Learning Release: job-delivery-map

## Concept To Build

Create a docs-first Job Delivery Map and review template that let Codex and Andrew evaluate how well Kwilt Money delivers Maya's first budget job, then choose the next improvement or design loop.

## Capability Delta

Today, the user cannot:

- Ask one durable artifact how well the app delivers its promised Budget outcome.
- See job steps, current UX flows, scores, evidence, and surface opportunities together.
- Run a daily/ad hoc review that distinguishes "improve this workflow" from "run a design loop for a missing surface."
- Preserve learning from design explorations back into job-step delivery.

After this release, the user can:

- Open `docs/job-delivery-map.yaml` and see the first Budget job mapped to job steps.
- Run a repeatable review using `docs/job-delivery-review-template.md`.
- Identify the weakest high-value step and its current flows.
- See surface opportunities such as iOS widgets and Screen Time gates as design-loop candidates.
- Link a recommended improvement to the job step it improves.

Still intentionally not supported:

- Automatic scoring from analytics.
- A user-facing UI.
- Full coverage of every future Budget job.
- Implementing any new surface.
- Automatic updates to job-flow delivery scores.

## User Experience

Andrew or Codex starts a build loop by asking for a Job Delivery Review. The reviewer reads the map, checks the current repo/runtime evidence when needed, and emits a compact report:

- promised outcome,
- weakest job step,
- current UX flows,
- evidence and assumptions,
- recommended next improvement,
- whether to implement directly, verify, or run a design loop,
- linked surface opportunities.

If the weak step suggests a new surface, the next action is a design loop, not immediate implementation. For example, if "What spending area am I trying to keep intentional?" is reasonably supported in-app but weak outside the app, the review can recommend continuing or refreshing the iOS widget exploration.

## Existing Product Relationship

This enhances the existing JTBD/job-flow/design-exploration system. It does not replace:

- `docs/jtbd/_index.md`,
- `docs/job-flows/`,
- `docs/design-explorations/`,
- `docs/feature-briefs/`,
- or shipped UX surfaces.

It adds the operating map that connects those artifacts.

## Buildable Slice

Must be real:

- `docs/job-delivery-map.yaml` with one mapped job.
- Per-step fields for user question, desired outcome, current UX flows, evidence, score, gaps, surface opportunities, and recommended next action.
- `docs/job-delivery-review-template.md` with daily/ad hoc output shape.
- Feature brief for the system.
- At least one surface opportunity that links to `docs/design-explorations/ios-budget-widgets`.
- At least one workflow gap that points at the current app-gate/review path.

Can be thin or temporary:

- Scores can be manual and evidence-labeled.
- UX flow references can be route/file names, not deep links to every component.
- Review runner can be a template/prompt before becoming a script.
- Only Maya's first job needs to be mapped.

Intentionally excluded:

- App UI.
- Analytics instrumentation.
- Broad multi-persona taxonomy.
- Automatic code scanning.
- Widget implementation.

## Release Channel

Local build.

Rationale: this is an internal operating artifact for Andrew and Codex. The first learning is whether the map improves daily/ad hoc product decisions, not whether end users see it.

## Brand-Goodwill Guardrails

- Keep the review focused on Maya's job, not internal productivity.
- Label assumptions clearly.
- Do not use delivery scores as false certainty.
- Do not let the artifact turn into a feature backlog.
- Design loops remain required for meaningful new surfaces.

## Reversibility

If the artifact does not help, remove or archive the map and template without changing app behavior. Feature briefs and design explorations remain valid.

## Permanent Product Threshold

Promote this into a standard repo practice when it produces better next-build choices in at least three review cycles, and when at least one shipped or designed improvement can be traced from weak job step -> design loop or implementation -> updated delivery assessment.
