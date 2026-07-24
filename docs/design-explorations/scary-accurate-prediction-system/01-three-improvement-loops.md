# Three Improvement Loops: Prediction Model

Date: 2026-07-06

## Loop 1: Calibration Before Confidence

### Concern

The docs said "build a backtesting harness," but the output contract was still
too soft. Without a stable report shape, future agents could produce a one-off
script that feels useful but does not create durable calibration.

### Improvement

`brief-prediction-trust-contract` now defines:

- JSON and markdown report outputs
- dataset summary
- model registry
- segment-level metrics
- recommendation decisions: `promote`, `keep_shadow`, `downgrade_claims`,
  `retire`
- promotion gates from `shadow` to `lab` and `lab` to `product`

### Result

Prediction work now has a measurable path from model idea to user-facing claim.
The key improvement is that no model can quietly become "the forecast" without
being compared against the champion and baselines.

## Loop 2: Model Modes And Runtime Discipline

### Concern

The model strategy named model families, but it did not yet make prediction mode
explicit enough. A single "forecast" label could still blur event prediction,
range prediction, exposure reporting, regime-shift detection, and resource-basis
classification.

### Improvement

`brief-model-strategy-and-tradeoffs` now defines prediction modes:

- `event`
- `range`
- `exposure`
- `change`
- `resource`

It also adds:

- target latency under 50 ms from cached local state
- cached profile strategy
- invalidation triggers
- model lifecycle states from `candidate` to `retired`
- a rule that a more accurate model can still lose if it is too slow, costly, or
  opaque

### Result

The app can keep Summary and app-gate moments fast while still evolving toward
better prediction. The mode split prevents the UI from presenting a weak
exposure claim as if it were a precise range forecast.

## Loop 3: Prediction Receipts Feed Product Behavior

### Concern

The auto-budget and income-runway briefs could still consume raw model outputs
too directly. That would recreate the black-box problem: the app would appear to
know more, but users would not know why.

### Improvement

`brief-auto-budget-from-living-target` now requires allocation to be driven by
accepted receipt modes:

- fixed event receipts
- calibrated range receipts
- exposure receipts
- manual/user-set receipts

It also blocks strong auto-generated amounts for low-confidence categories.

`brief-income-runway-detection` now names missing-income detection as a `change`
prediction mode, blocks prompts until shadow-mode precision is proven, and
requires runway calculations to identify whether reserves come from confirmed
balances, user-entered values, or partial data.

### Result

Prediction becomes a product substrate, not a hidden model. Auto-budget and
runway transitions must point back to receipts, confidence, and user
confirmation.

## Net Effect

The prediction model direction is now stronger in three ways:

1. Measurement is durable enough to compare models over time.
2. Runtime strategy protects speed and cost.
3. User-facing behavior depends on prediction receipts, not opaque model output.

The next buildable step remains the backtesting harness, but the harness now has
a clearer report contract and promotion path.
