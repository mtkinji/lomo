---
id: brief-money-progressive-activation
title: Money Progressive Activation
status: accepted
audiences: [audience-aspirational-family-organizers]
personas: [Maya]
hero_jtbd: jtbd-move-the-few-things-that-matter
job_flow: job-flow-maya-review-budget-reality-before-spending
serves: [jtbd-review-budget-reality-before-spending, jtbd-put-intention-before-impulse, jtbd-trust-this-app-with-my-life]
related_briefs: [brief-guided-overture-onboarding, brief-kwilt-money-capability-integration]
exploration: docs/design-explorations/money-progressive-activation
owner: andrew
last_updated: 2026-07-27
---

# Money Progressive Activation

## Context

Money is now native inside Kwilt, while Guided Overture still presents it as an unsupported bill-alert concept. GTM, onboarding, and native Money need one truthful contract from recognizable promise to first trusted decision.

## Target audience and representative persona

Maya wants a calm read on household reality before spending or changing the plan. She does not want product taxonomy, a budgeting course, or a global Kwilt setup sequence.

## Aspirational design challenge

How might we help Maya move from a recognizable Money promise to one trusted household decision, while preserving capability ownership, financial truth, and calm progressive onboarding?

## Hero JTBD and job-flow step

`jtbd-move-the-few-things-that-matter`, through `job-flow-maya-review-budget-reality-before-spending`. The weak seam is entry-to-repeat trust: current native surfaces exist, but acquisition context, resume state, and first trusted decision are not yet one measured path.

## Design

- Canonical task promise: **Know where I stand before I spend**.
- Organic unscoped entry may present this task in Guided Overture; exact Money destinations bypass orientation.
- Agent retains the task context and asks one concrete question.
- Money owns setup, Plaid, Summary, corrections, intentional choice, receipts, and native return.
- `MoneyFirstTrustedDecision` is emitted only after `continue`, `adjust_plan`, `keep_blocked`, or `correct_truth` is authoritative.
- Monetization and cross-capability expansion occur after the trusted decision, never as a generic pre-value interruption.

## Success signal

Users can predict the next step, reach a transaction-backed decision, and return to Money. Route arrival and account connection are reported separately from first trusted decision.

## Open questions

- Which native surface should allow a user whose data is already correct to record `continue` without adding a promotional card to Summary?
- Should the first production experiment use organic Guided Overture entry or an exact Money campaign first?

