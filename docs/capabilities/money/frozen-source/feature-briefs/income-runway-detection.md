---
id: brief-income-runway-detection
title: Income Runway Detection
status: draft
audiences: [audience-aspirational-family-organizers]
personas: [Maya]
hero_jtbd: jtbd-trust-this-app-with-my-life
job_flow: job-flow-maya-review-budget-reality-before-spending
job_step: see-budget-reality
serves: [jtbd-trust-this-app-with-my-life, jtbd-carry-intentions-into-action, jtbd-review-budget-reality-before-spending]
related_briefs: [brief-auto-budget-from-living-target, brief-model-strategy-and-tradeoffs, brief-prediction-trust-contract]
owner: andrew
last_updated: 2026-07-06
---

# Income Runway Detection

## Context

A living-percent target works when income is present and regular. It fails when
the user is between jobs, living from savings, or receiving irregular deposits.
Kwilt should detect when the assumed income model may no longer fit and help the
user understand runway without making scary or invasive claims.

## Job Delivery

- Job: `review-budget-reality-before-spending`
- Step: `see-budget-reality`
- Current score: 4
- Expected delivery change: 4 -> 4.5 if Summary can safely explain when current
  spending is drawing from reserves rather than regular income.
- Evidence required: income pattern detector in shadow mode -> conservative
  missing-income receipt -> user confirmation path -> Summary runway state.
- Map update trigger: after runtime verification with realistic missing-income
  and irregular-income fixtures.

## User Problem

When regular income disappears, the most important budget question changes from:

> Am I living on 70% of income?

to:

> How long can I keep spending at this pace from savings?

The app should discover this transition from transaction patterns, then ask for
confirmation. It should not require every user to configure a job-loss mode in
onboarding.

## Product Decision

Kwilt should never say "you lost your job." It should detect observable states:

- expected income did not arrive
- account sync is fresh
- no replacement deposit was found
- spending continues
- savings transfers or balances suggest reserve drawdown

Then it should ask:

> Kwilt has not seen the regular deposit usually arriving around July 1. Are you
> living from savings right now?

This is a `change` prediction mode, not a fact claim. The UI must treat it as a
question until the user confirms the resource basis.

## Current System Gap

The app currently recognizes inflows and can sum current-month income. It does
not yet:

- classify payroll versus transfer versus refund
- infer income cadence
- define expected deposit windows
- detect missing regular deposits
- detect savings drawdown
- calculate confirmed runway
- ask the user to switch resource basis

## Detection Model

### Inflow Classification

Classify each inflow as one of:

- payroll
- benefits
- gig income
- transfer from savings
- brokerage transfer
- refund
- reimbursement
- interest/reward
- unknown

### Income Pattern

For likely income clusters:

- amount range
- cadence
- expected date window
- last observed date
- account/source
- confidence
- grace period

### Missing-Income Receipt

Only emit a missing-income receipt when:

- pattern confidence is high enough
- expected window plus grace period has passed
- account sync is fresh
- no replacement deposit exists
- no linked-account gap explains the absence
- missing-income precision has passed the threshold defined by
  `brief-prediction-trust-contract`

### Runway Calculation

Runway should use:

- confirmed reserve balance when available
- user-entered reserve amount when balance is unavailable or partial
- current month forecasted spend
- known committed spend
- user-selected runway target, if present

## UI Impact

### Summary Prompt

> Kwilt expected regular income around July 1 and has not seen it. Are you
> living from savings right now?

Actions:

- "Yes, use savings runway"
- "Income is irregular"
- "Ignore this month"

### Savings Runway State

> Savings plan: $3,200/month from $18,000 reserve. Current runway: about 5.6
> months.

### Irregular Income State

> Income is irregular this month. Kwilt is using confirmed deposits and current
> spending pace instead of a regular paycheck target.

## Acceptance Criteria

- The detector can identify stable income patterns in fixture history.
- The detector refuses missing-income claims when sync is stale.
- The detector distinguishes at least payroll, refund, and savings transfer in
  common fixture cases.
- Summary can represent income-present, income-missing, savings-runway, and
  irregular-income states.
- The user must confirm before Kwilt switches the active resource basis.
- All copy describes observable facts, not life-event assumptions.
- Missing-income prompts are blocked until the model has passed shadow-mode
  precision targets.
- Savings-runway calculations identify whether they use confirmed balances,
  user-entered reserves, or partial reserve data.

## Out Of Scope

- Employment detection.
- Credit advice.
- Automatic savings transfers.
- Multi-account net-worth planning.
- Production notifications.

## Open Questions

- Do we have enough account-balance access to calculate runway without user
  input?
- Should the first runway release require manually entered savings?
- How conservative should the grace period be for payroll-like deposits?
