# Converge: job-delivery-map

## Qualitative Scoring

| Alternative | Persona Fit | JTBD Fit | System Fit | Blast Radius | Notes |
| --- | --- | --- | --- | --- | --- |
| Static Job Delivery Map | High | High | High | Low | Good foundation, but weak as an operating loop by itself. |
| Job Delivery Review Runner | High | High | High | Low-Medium | Best balance: structured map plus repeatable recommendations. |
| Design-Loop Backlog Board | Medium | Medium | Medium | Medium | Useful later if multiple design loops compete for attention. |
| In-App Outcome Health Surface | Low | Medium | Low | Medium | Internal UI too early; not needed to learn. |
| Analytics-First Outcome Scoring | Medium | Medium | Medium | Medium | Valuable later, but premature as the first authority. |

## Capability Delta

Today, Andrew and Codex cannot:

- Ask "how well does Kwilt Money deliver its promised outcome?" against one durable artifact.
- See which job step is weakest and which UX workflows currently serve it.
- Distinguish an in-app workflow improvement from a missing surface opportunity.
- Tell whether the next action should be implementation, design-loop exploration, runtime verification, or reflection.
- Reliably feed daily/ad hoc build loops with job-step based priorities.

After this concept ships, Andrew and Codex can:

- Read one structured job delivery map for Maya's first Budget job.
- Run a repeatable review that ranks underserved job steps and workflow gaps.
- See current UX flows, evidence, assumptions, surface opportunities, and design-loop status per step.
- Launch a design loop from a weak step, such as "ambient glance surface may help Maya keep Shopping intentional."
- Update the map after shipped learning, preserving outcome memory across build cycles.

Still intentionally not supported:

- Fully automated product scoring.
- A production dashboard.
- Analytics-derived scoring as the only truth source.
- Auto-writing design explorations without human review.
- Implementing widgets, gates, or notifications as part of the map release.

## Reductive Design Pass

Smallest elegant version:

- One YAML map: `docs/job-delivery-map.yaml`.
- One Markdown review template: `docs/job-delivery-review-template.md`.
- One first job: `review-budget-reality-before-spending`.
- One output shape: top gaps, evidence, surface opportunities, recommended next design loop.
- Feature briefs reference the job step they improve.

Can this enhance an existing feature instead of creating a new one?

Yes. It enhances the existing JTBD, job-flow, design-exploration, and feature-brief docs. No app UI is needed.

What we refuse to add:

- A new internal app screen.
- A broad roadmap database.
- Scores with false precision.
- A workflow that treats current screens as the boundaries of the solution.
- Automatic delivery-score updates without evidence.

What would make this feel like clutter:

- Too many fields per job step.
- Multiple maps for the same job.
- Reports longer than the build decision they are supposed to support.
- Treating every weak score as a mandate to build instead of sometimes running a design loop.

Is the concept doing one sharp job?

Yes: it helps the build loop decide what improvement would most increase delivery against a promised user outcome.

## Activation and Learning Pass

Most ready moment:

- At the start of a daily build loop.
- After shipping a meaningful UX change.
- When Andrew asks "what should we improve next?"
- When a design loop proposes a new surface.

Education:

Do not teach this in-app. Use repo docs and Codex prompts. The report should be self-explanatory enough to become the education.

Adoption signal:

Andrew naturally asks for "job delivery review" or "what is the weakest step?" and the map produces a concrete next action that survives review.

## Chosen Alternative

Choose `Job Delivery Review Runner`.

This is the right bet because the concept needs to become an operating habit, not just a static taxonomy. The runner does not need to be sophisticated at first. It can be a Markdown template plus a Codex prompt command before it becomes a script.

## Accepted Trade-Offs

- Accept a docs-first implementation so the habit can form before tooling hardens.
- Accept manually judged scores because early evidence will mix code, simulator proof, product judgment, and memory.
- Accept one mapped job first to avoid building a framework before the first loop proves value.
- Accept linking out to existing design explorations like `ios-budget-widgets` rather than duplicating their contents.

## Rejected Trade-Offs

- Do not start with analytics automation.
- Do not create an internal app dashboard.
- Do not make every surface opportunity a roadmap commitment.
- Do not require every feature brief to be rewritten before this becomes useful.

## System Implications

- Add a map file that references existing JTBDs, personas, job flows, routes, feature briefs, and design explorations.
- Add a review template that Codex can use for daily/ad hoc build loops.
- Add a feature brief so future implementation can create the map/review runner without redesigning it.
- Future design loops should be able to update `surface_opportunities` and `design_loop_status`.

## Stated Bet

We are betting that a lightweight job delivery map plus review runner will produce better next-build decisions than screen-by-screen critique alone. If it does not, revisit by reducing the artifact to only the top three job steps and a one-page review prompt.

## Success Signal

Within a few build loops, the map should produce at least one high-quality recommendation that would have been missed by screen review alone, such as "run the iOS widget loop for the ambient lane-reminder step" instead of "polish the budget detail page again."
