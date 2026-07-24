# Diverge: job-delivery-map

Axis of variation: static map vs. review runner vs. design-loop operating system.

## Alternative 1: Static Job Delivery Map

A single structured `docs/job-delivery-map.yaml` records each job, job step, user question, current UX flows, score, evidence, and next gap. Daily and ad hoc reviews read this map manually or through Codex. Design explorations can be referenced in `surface_opportunities`, but the map itself does not prescribe automation.

Audience/persona fit: Good. It keeps Maya's job visible without adding product complexity.

Design-challenge answer: Helps Andrew and Codex assess delivery by job step, but relies on humans to run the review.

System-fit note: High. It fits the existing docs system with minimal new machinery.

Best when: The team needs a lightweight source of truth immediately.

Fails when: The map gets stale because no recurring process reads or updates it.

Anti-pattern check: Pass, if the map stays short and step-based rather than turning into a screen inventory.

## Alternative 2: Job Delivery Review Runner

Add the structured map plus a small repeatable review command or prompt template. The runner reads the map, current job-flow docs, selected source files, recent evidence, and optional screenshots or smoke results, then emits a ranked report: weakest high-value steps, stale assumptions, surface opportunities, and recommended design loops.

Audience/persona fit: Strong. It lets product work ask whether Maya's job is getting easier instead of whether more screens exist.

Design-challenge answer: Directly supports daily and ad hoc build loops with a practical output.

System-fit note: High. It extends docs and existing Codex review behavior without requiring app UI.

Best when: Andrew wants an operating rhythm for "what should we improve next?"

Fails when: The runner overclaims from code without runtime proof, or when scores are updated automatically without judgment.

Anti-pattern check: Pass, if the report always labels evidence vs. assumptions.

## Alternative 3: Design-Loop Backlog Board

Create a doc or data model where every weak job step becomes a backlog item with linked design-loop phases, surface opportunities, and implementation status. The map feeds a queue: not started, framed, diverged, converged, learning release, shipped, reflected.

Audience/persona fit: Medium. It improves product discipline, but it can become too internal and too process-heavy.

Design-challenge answer: Makes design-loop status explicit, including missing surfaces like widgets.

System-fit note: Medium. It may duplicate feature briefs and roadmap artifacts unless tightly scoped.

Best when: Multiple agents or multiple parallel feature loops are active.

Fails when: The board becomes a product-management surface rather than a job-delivery tool.

Anti-pattern check: Mixed. Fix by keeping the board derived from the map and feature briefs, not a separate planning universe.

## Alternative 4: In-App Outcome Health Surface

Build a hidden or internal app screen that shows job steps, scores, workflow coverage, and recommended next improvements. It could eventually be useful for dogfooding and demos.

Audience/persona fit: Low for Maya, higher for Andrew as builder.

Design-challenge answer: Makes delivery status visible, but in-app UI is not required to improve Maya's job.

System-fit note: Low to medium. It adds a new app surface for internal product work before the docs/process layer is proven.

Best when: Product-health visibility needs to travel in TestFlight or demos.

Fails when: It distracts from the user-facing job and adds UI debt.

Anti-pattern check: Failure for the first release. Fix by deferring app UI until the map/review loop proves useful.

## Alternative 5: Analytics-First Outcome Scoring

Define analytics events and funnels for each job step, then compute delivery scores from event completion rates, drop-off, and recurrence. The map becomes a schema for instrumentation.

Audience/persona fit: Medium. Behavior data can improve truth, but early-stage Budget needs qualitative and runtime evidence too.

Design-challenge answer: Strong later, weak now. It answers "what happens?" but not yet "what surface should exist?"

System-fit note: Medium. The app does not yet have a complete analytics layer for this product loop.

Best when: The core flows are stable enough that instrumentation reflects meaningful user behavior.

Fails when: Metrics become premature or noisy.

Anti-pattern check: Mixed. Fix by making analytics one evidence type, not the scoring authority.

## Divergence Summary

The most useful first direction is Alternative 2: a Job Delivery Review Runner backed by a structured map. It is small enough to ship as docs and a script/prompt, but strong enough to launch design loops for missing surfaces.
