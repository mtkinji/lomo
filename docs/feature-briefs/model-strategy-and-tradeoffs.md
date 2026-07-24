---
id: brief-model-strategy-and-tradeoffs
title: Model Strategy And Tradeoffs
status: draft
audiences: [audience-aspirational-family-organizers]
personas: [Maya]
hero_jtbd: jtbd-move-the-few-things-that-matter
job_flow: job-flow-maya-review-budget-reality-before-spending
job_step: see-budget-reality
serves: [jtbd-trust-this-app-with-my-life, jtbd-review-budget-reality-before-spending, jtbd-carry-intentions-into-action]
related_briefs: [brief-prediction-trust-contract, brief-auto-budget-from-living-target, brief-income-runway-detection]
owner: andrew
last_updated: 2026-07-06
source_repo: mtkinji/kwilt-budget
source_sha: df383c3ac1538dff0a83b43a21ff3e45c024298b
---

> **Money source note:** Promoted from frozen standalone Money product documentation. Preserve its product reasoning, but verify route, implementation, delivery, and release claims against `src/capabilities/money/` and current runtime evidence.

# Model Strategy And Tradeoffs

## Context

Kwilt Money needs predictions that are accurate enough to trust, cheap enough
to run often, fast enough for Summary and app-gate moments, and explainable
enough for a user to understand why the app made a claim.

This brief defines the model strategy before implementation. It prevents the
team from treating "AI forecasting" as a shortcut and makes cost, speed,
accuracy, and trust tradeoffs explicit.

## Job Delivery

- Job: `review-budget-reality-before-spending`
- Step: `see-budget-reality`
- Current score: 4
- Expected delivery change: no direct score change until paired with
  `brief-prediction-trust-contract`; this brief defines constraints and model
  posture.
- Evidence required: model family matrix, AI boundary rules, champion/challenger
  evaluation harness, and measured calibration before any stronger UI claims.
- Map update trigger: after a model challenger beats current baselines and a
  user-facing claim ships with runtime verification.

## Product Principle

Prediction trust should come from calibrated receipts, not model sophistication.

The system should optimize in this order:

1. correctness and calibration
2. explainability
3. speed
4. cost
5. model sophistication

The app should prefer a simple model that knows when it is uncertain over a
complex model that sounds confident without proof.

## Champion / Challenger Strategy

The current forecast engine is the `champion`.

Every new model becomes a `challenger` and must be scored against:

- current Kwilt forecast
- current spend only
- straight-line pace
- last month
- trailing 3-month average
- same day-of-month average
- same weekday average
- scheduled-only

No model reaches the UI because it sounds smarter. It reaches the UI because it
beats baselines for the relevant category, horizon, and confidence band.

## Model Families

Prediction should be modeled as several modes, not one universal algorithm.
Each mode has a different accuracy bar, cost profile, and UI language.

### Prediction Modes

- `event`: a known or recurring thing is expected to happen, such as payroll,
  rent, or a subscription.
- `range`: a category is likely to land inside a calibrated dollar range.
- `exposure`: the model cannot forecast well, but current and pending exposure
  are already useful.
- `change`: a prior pattern appears to have broken.
- `resource`: the household's current living resource is income, savings,
  irregular deposits, or unknown.

Every forecast receipt should declare its mode. This keeps UI language honest:
an exposure claim should not read like a range forecast, and a change detection
should not read like a confirmed life event.

### 1. Deterministic Event Models

Best for:

- rent
- mortgage
- subscriptions
- fixed bills
- payroll-like deposits

Inputs:

- merchant/source cluster
- amount stability
- date cadence
- pending/posted status
- user-confirmed schedule

Cost: very low  
Speed: very fast  
Accuracy potential: very high  
Trust posture: strong when history is stable and sync is fresh

Use first.

### 2. Deterministic Spend-Shape Models

Best for:

- groceries
- gas
- restaurants
- household staples
- routine recurring variable spend

Inputs:

- cumulative spend by period day
- weekday pulses
- week-of-month pulses
- pay-cycle-relative spend
- recent 3/7/14-day momentum
- category volatility

Cost: low  
Speed: fast after profile caching  
Accuracy potential: medium to high as calibrated ranges  
Trust posture: strong as a range, weaker as a point estimate

Use after the backtesting harness exists.

### 3. Exposure / Refusal Models

Best for:

- shopping bursts
- travel
- medical
- car repair
- annual fees
- sparse categories

Inputs:

- current spend
- pending exposure
- budget limit
- known future dated spend
- anomaly size

Cost: very low  
Speed: very fast  
Accuracy potential: low for point estimates  
Trust posture: refuse precision; show current exposure and anomaly context

Use whenever the model cannot earn confidence.

### 4. Lightweight Statistical Models

Best for:

- categories with enough history but complex seasonality
- household-level monthly spend ranges
- confidence calibration

Candidate approaches:

- weighted moving averages
- median and median absolute deviation
- quantile bands
- Bayesian shrinkage toward category history
- simple gradient boosting only if enough data exists

Cost: low to medium  
Speed: fast if precomputed  
Accuracy potential: medium to high  
Trust posture: acceptable only if backtests beat deterministic challengers

Use selectively.

### 5. AI-Assisted Feature Models

Best for:

- messy transaction description classification
- payroll versus transfer versus refund distinction
- merchant clustering
- human-readable forecast receipts
- synthetic edge-case generation for testing

Cost: medium to high unless cached  
Speed: slow if run live  
Accuracy potential: useful for classification; risky for numeric forecasts  
Trust posture: AI can help create features and explanations, but should not own
the money claim.

Use off the hot path.

## Where AI Is Allowed

AI may help with:

- labeling transaction descriptions when provider categories are weak
- grouping unknown merchant names
- suggesting whether an inflow looks like payroll, transfer, refund, or
  reimbursement
- generating plain-language receipts from deterministic forecast facts
- creating synthetic test cases for model evaluation
- flagging possible pattern changes for later deterministic confirmation

AI output must be:

- cached
- inspectable
- correctable
- non-blocking for Summary and app-gate moments
- excluded from strong UI claims unless validated by deterministic evidence or
  measured evaluation

## Where AI Is Forbidden In V1

AI should not:

- directly forecast dollar amounts
- directly decide whether income is missing
- silently reallocate category budgets
- run live on every Summary render
- block app-gate review
- produce untraceable money claims
- replace the backtesting harness

The numeric forecast must be reproducible from stored transactions, patterns,
and deterministic model code.

## Cost / Speed / Accuracy Matrix

| Approach | Cost | Speed | Accuracy Potential | Trust Risk | Recommended Use |
| --- | --- | --- | --- | --- | --- |
| Current deterministic forecast | Very low | Very fast | Medium | Medium without calibration | Champion baseline |
| Scheduled/recurring event detection | Very low | Very fast | Very high for stable events | Low if freshness checked | Bills and income events |
| Spend-shape profiles | Low | Fast if cached | Medium-high as ranges | Medium if overconfident | Routine categories |
| Quantile/statistical ranges | Low-medium | Fast if cached | Medium-high with history | Medium | Calibration and ranges |
| AI-assisted classification | Medium | Async, not hot path | High for messy labels | Medium-high if unverified | Feature extraction |
| LLM numeric forecasting | High | Slow | Unknown and hard to calibrate | High | Do not use |

## Runtime Strategy

Fast path:

- Summary and app gates read precomputed pattern profiles.
- Forecast receipts are deterministic and cached.
- No network AI call is required to render current budget reality.
- Target latency for Summary and app-gate receipts is under 50 ms from cached
  local state.

Background path:

- Plaid sync updates transactions.
- Pattern profiles recompute after sync.
- AI-assisted classification may run asynchronously for uncertain rows.
- Backtesting runs offline in scripts, not in app runtime.
- Expensive model evaluation runs after sync, on demand, or in developer
  scripts, never during the user's spending pause.

Fallback path:

- If profile data is stale or missing, use current deterministic forecast.
- If sync is stale, downgrade confidence and show freshness.
- If category history is too sparse, show current exposure instead of a strong
  forecast.

## Data And Cache Strategy

The app should persist pattern outputs, not rerun full inference on every view.

Candidate cached records:

- income source patterns
- recurring spend events
- category spend-shape profiles
- latest forecast receipts
- model version and generated-at timestamp
- stale reason when a profile cannot be trusted

Cache invalidation:

- new Plaid sync modifies relevant transactions
- user corrects a transaction category or inflow type
- user edits a budget amount or living target
- calendar period changes
- model version changes

This keeps normal app surfaces fast while preserving explainability.

## Model Lifecycle

Models move through the trust contract lifecycle:

- `candidate`: code or prototype exists.
- `shadow`: model produces reports only.
- `lab`: model output is visible only in internal/debug receipts.
- `product`: model can drive normal UI claims.
- `retired`: model no longer drives claims but remains useful for historical
  comparison.

The default for any new model is `shadow`. Strong user-facing claims require a
measured promotion.

## Decision Rules

1. A model must beat baseline before replacing baseline.
2. A model must be calibrated before it gets strong UI language.
3. AI can improve inputs, but deterministic code owns the claim.
4. High-risk claims require high precision, especially missing-income prompts.
5. Fast app surfaces cannot depend on slow model calls.
6. Every prediction must produce a receipt.
7. When cost, speed, and accuracy conflict, protect trust first and refuse
   precision.
8. A model may improve accuracy but still lose if it is too slow, too costly, or
   too opaque for the user moment.

## Build Order

1. Implement `brief-prediction-trust-contract` backtesting harness.
2. Establish champion metrics for the current forecast.
3. Add deterministic recurring income/event challenger.
4. Add deterministic spend-shape challenger.
5. Add calibration report and UI claim matrix.
6. Add AI-assisted classification only for cases where deterministic
   classification is weak and evaluation proves value.

## Acceptance Criteria

- The repo has a documented model-family matrix.
- AI boundaries are explicit.
- The backtesting harness can compare champion and challenger outputs.
- No user-facing numeric forecast depends on a live AI call.
- Strong UI claims have measured thresholds.
- Low-confidence surfaces have refusal language.

## Open Questions

- What minimum report should the first backtesting harness emit: markdown,
  JSON, or both?
- Should AI-assisted classification be prototyped with local heuristics first,
  then evaluated against an LLM challenger?
- What is the maximum acceptable latency for Summary and app-gate forecast
  receipts?
- What model outputs should be persisted versus recomputed after sync?
- Should model lifecycle state be stored in code/config only, or should it be a
  persisted per-model feature flag?
