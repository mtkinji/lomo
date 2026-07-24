---
id: brief-prediction-trust-contract
title: Prediction Trust Contract
status: draft
audiences: [audience-aspirational-family-organizers]
personas: [Maya]
hero_jtbd: jtbd-trust-this-app-with-my-life
job_flow: job-flow-maya-review-budget-reality-before-spending
job_step: see-budget-reality
serves: [jtbd-trust-this-app-with-my-life, jtbd-review-budget-reality-before-spending, jtbd-carry-intentions-into-action]
related_briefs: [brief-model-strategy-and-tradeoffs, brief-auto-budget-from-living-target, brief-income-runway-detection]
owner: andrew
last_updated: 2026-07-06
---

# Prediction Trust Contract

## Context

Kwilt Money can only be trusted if its model is right most of the time and
honest when it is not. This brief defines the contract between forecast accuracy,
model confidence, and UI language.

The goal is not to make every prediction exact. The goal is to prevent
overconfident claims and prove which claims deserve to be shown.

## Job Delivery

- Job: `review-budget-reality-before-spending`
- Step: `see-budget-reality`
- Current score: 4
- Expected delivery change: 4 -> 4.5 if forecast claims become calibrated and
  inspectable enough that high-confidence UI language is earned by measured
  history.
- Evidence required: historical replay harness -> baseline comparison ->
  confidence calibration report -> UI claim matrix.
- Map update trigger: after the harness produces measured accuracy results for
  existing forecast modes.

## Product Decision

Every prediction claim needs a measured or explicitly unmeasured trust level.

Kwilt should only use strong language when the model has earned it:

- `known`: posted, scheduled, or confirmed event
- `expected`: stable recurring pattern
- `likely`: calibrated forecast range
- `uncertain`: weak history or wide variance
- `changed`: pattern break or regime shift
- `needs confirmation`: user context required

## Current System Gap

The forecast engine already emits confidence, ranges, evidence, and drivers.
However, the app does not yet evaluate historical forecast performance, compare
against baselines, or define which confidence values are allowed to drive
specific UI claims.

## Backtesting Harness

The harness should replay historical periods as if each prior day were today.

For each replay:

1. Hide transactions after the replay date.
2. Run the forecast with only available data.
3. Record projected amount, range, confidence, drivers, and basis.
4. Compare against actual period-end result.
5. Score the model against simple baselines.

Baselines:

- current spend only
- straight-line pace
- last month
- trailing 3-month average
- same day-of-month average
- same weekday average
- scheduled-only

## Report Contract

The first harness should emit both machine-readable JSON and a concise markdown
summary. JSON makes the results comparable over time; markdown makes the
calibration review easy for Andrew and future agents.

Required report sections:

- dataset summary: number of users, accounts, categories, periods, and replay
  dates
- model registry: champion and challenger ids, versions, and inputs
- baseline comparison by category
- confidence calibration by trust state
- range hit rate by horizon
- high-error examples with forecast receipts
- stale-sync exclusions
- insufficient-history exclusions
- promotion recommendations

Minimum JSON shape:

```ts
type ForecastBacktestReport = {
  generatedAt: string;
  dataset: {
    source: 'preview-fixture' | 'sandbox' | 'anonymized-real';
    periodCount: number;
    replayCount: number;
    categoryCount: number;
  };
  models: Array<{
    id: string;
    role: 'champion' | 'challenger' | 'baseline';
    version: string;
  }>;
  segments: ForecastBacktestSegment[];
  recommendations: ForecastModelRecommendation[];
};

type ForecastBacktestSegment = {
  segmentId: string;
  categoryId?: string;
  horizon: 'day' | 'week' | 'month';
  confidence: 'known' | 'high' | 'medium' | 'low' | 'unknown' | 'changed';
  modelId: string;
  replayCount: number;
  medianAbsoluteErrorCents: number;
  rangeHitRate: number | null;
  directionalAccuracy: number | null;
  falseHotWarningRate: number | null;
};

type ForecastModelRecommendation = {
  modelId: string;
  segmentId: string;
  decision: 'promote' | 'keep_shadow' | 'downgrade_claims' | 'retire';
  reason: string;
};
```

## Metrics

Spend:

- median absolute dollar error
- range hit rate
- over-budget warning lead time
- false hot-warning rate
- directional accuracy
- confidence calibration

Income:

- expected deposit date-window hit rate
- expected amount range hit rate
- missing-income precision
- missing-income recall
- false prompt rate from sync gaps

UI:

- correction rate
- dismissal rate
- repeated forecast receipt opens
- review completion after forecast warning

## Claim Rules

Initial target rules:

- High-confidence spend ranges should hit at least 80% of the time before the
  UI says "likely."
- High-confidence event predictions should hit their expected date window at
  least 90% of the time before the UI says "expected around."
- Medium-confidence ranges may say "tracking toward" but should not imply
  certainty.
- Low-confidence forecasts should show current exposure, not a strong projected
  claim.
- Missing-income prompts should optimize for precision over recall.
- Any claim with stale sync should downgrade to `unknown` or show freshness
  first.
- A challenger cannot replace the champion for a segment unless it beats the
  champion and at least one simple baseline by a material margin.

These thresholds are starting targets. The harness should replace them with
measured calibration rules.

## Promotion Gates

Models move through explicit states:

1. `candidate`: implemented or prototyped, but not evaluated.
2. `shadow`: runs in reports only; no user-facing claims.
3. `lab`: visible only in internal/debug receipts.
4. `product`: allowed to drive normal UI language.
5. `retired`: kept only for historical report comparison.

Promotion from `shadow` to `lab` requires:

- beats champion or baseline in the target segment
- no worse than champion in false hot-warning rate
- no disqualifying stale-sync behavior
- forecast receipts are inspectable

Promotion from `lab` to `product` requires:

- range or event hit-rate threshold met
- confidence calibration is monotonic: high > medium > low
- user-facing language is mapped through the claim matrix
- rollback is possible by returning to the previous champion

Automatic promotion is not allowed. A report can recommend promotion, but a
human or explicit release decision accepts it.

## UI Claim Matrix

| Trust state | Allowed UI language | Disallowed UI language |
| --- | --- | --- |
| known | "Posted", "Scheduled", "Confirmed" | "Probably" |
| expected | "Expected around July 15" | "Guaranteed" |
| likely | "Likely $660-$780" | "Will be $710" |
| uncertain | "Too irregular to forecast confidently" | "On track" |
| changed | "This pattern changed" | "You lost your job" |
| needs confirmation | "Is this a savings transfer?" | "Kwilt switched your plan" |

## Acceptance Criteria

- A replay harness can score at least preview/fixture transaction history.
- The harness compares current model output against simple baselines.
- The report groups accuracy by category and confidence.
- The report has stable JSON output and a markdown summary.
- The report can recommend `promote`, `keep_shadow`, `downgrade_claims`, or
  `retire` by model segment.
- The app has a claim matrix that maps confidence to UI language.
- Strong claims are blocked when confidence, freshness, or calibration are weak.

## Out Of Scope

- New prediction algorithms.
- Income-runway UI.
- Auto-budget allocation.
- User-facing notifications.

## Open Questions

- What is the first real-history dataset we can use safely for evaluation?
- Should the harness live inside `scripts/budget-forecast-smoke.mjs` or a new
  `scripts/forecast-backtest.mjs`?
- Should the first report be human-readable markdown, machine-readable JSON, or
  both?
