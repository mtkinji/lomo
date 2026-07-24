# Scary Accurate Prediction System: Evaluation And North Star

Date: 2026-07-06

## What Prompted This

Kwilt Money currently asks users what percentage of income they want to live on,
such as 70%, but the app does not yet make that target feel like a trustworthy
operating model. A user can reasonably ask:

- Does auto-budgeting actually draw from that 70%?
- What does 70% mean as a dollar amount this month?
- What happens if income disappears and the user is living on savings?
- How can Kwilt know whether a forecast is right often enough to trust?

The deeper product question is not "can we forecast a month-end total?" It is:

> Can Kwilt tell the user what financial pattern it expected, what actually
> happened, what changed, and how much confidence it has before the user makes
> another spending decision?

## Anchor Assessment

### Restated In User Voice

When I am about to make spending decisions, I want Kwilt to understand the real
pattern of my income, savings, bills, and category spending, so that I can trust
its guidance instead of wondering whether the app is guessing from stale or
over-simple math.

### Strongest Anchor Matches

- `jtbd-trust-this-app-with-my-life` - predictions about money are high-trust
  claims, and the app must be able to prove when it knows versus when it is
  uncertain.
- `jtbd-review-budget-reality-before-spending` - the forecast exists to help the
  user understand current budget reality before opening a spend-triggering app.
- `jtbd-carry-intentions-into-action` - the user's living target should be
  carried into category budgets, runway, and review moments without constant
  manual calculation.
- `jtbd-put-intention-before-impulse` - the system should make the next spending
  action more intentional, not shameful or over-managed.

```yaml
serves: [jtbd-trust-this-app-with-my-life, jtbd-review-budget-reality-before-spending, jtbd-carry-intentions-into-action, jtbd-put-intention-before-impulse]
```

## Current System

### User-Facing Model

The app currently presents spending categories and meters. The onboarding flow
stores a living-percent target, and Summary can now show the saved target as a
monthly dollar line when current-period income is known.

The user-facing model is still mostly category-led:

- category budget amount
- current spend
- percent used
- projected period-end spend
- forecast confidence and evidence labels in some places

The app does not yet make the "source of budget truth" explicit enough. A user
can see category budgets, but they cannot reliably tell whether those budgets
were derived from income, savings drawdown, manual setup, or fixture defaults.

### Forecast Engine

The main deterministic forecast entry point is `getBudgetForecast()` in
`src/domain/budget-meter.ts`. It works per category rather than as one global
household model.

It already supports several useful modes:

- `manual`: use a user-set projected amount, with safeguards when current or
  pending spend exceeds the manual amount.
- `scheduled`: use saved scheduled bills when valid scheduled items exist.
- `paced`: project variable spend from current spend and period progress.
- `hybrid`: combine scheduled or inferred recurring spend with variable spend.

The engine also carries:

- projected spend
- range low and high
- confidence
- evidence
- drivers
- scheduled spend, posted spend, inferred spend, and remaining spend
- historical evidence and trust caps

This is a good foundation because the forecast can already say more than a
single number. It can express how it got there.

### Existing Strengths

- The forecast model is deterministic and inspectable.
- Forecast outputs already include drivers and confidence.
- Scheduled bills are separated from variable spend.
- Inferred recurring spend exists for stable monthly merchant patterns.
- Historical variable-spend projection blends current pace with historical
  baselines.
- Sparse history and no-spend states are treated conservatively.
- Pending and low-confidence evidence can lower trust.
- Plaid snapshot assembly already returns a current-month transaction inventory
  and category rows.
- Inflows are now available as current-period income totals in Summary.

### Existing Income Handling

Income is not yet a first-class prediction model.

Current inflow behavior:

- inflows are recognized as transaction direction `inflow`
- current-month income can be summed
- inflows are intentionally not assigned to spending budgets
- inflows receive an unmatched reason like "Income is tracked in runway, not
  assigned to a spending budget"

That is correct as an accounting boundary, but it is not enough to detect a
missing payroll pattern, calculate reliable runway, or decide whether the user's
living target should be income-based or savings-based.

## Problems In The Current System

### 1. Forecasts Are Category-First, Not Household-Resource-First

The current system asks, "Where will this category land?" It does not yet ask,
"What resource is this household living from right now?"

That means a 70% income target can become meaningless when:

- income is absent
- income is irregular
- the user is between jobs
- the user is deliberately living from savings
- the user receives lump-sum or seasonal income

### 2. Income Is Observed But Not Predicted

Kwilt can know that income posted this month. It cannot yet know:

- whether a regular income source was expected
- whether a deposit is payroll, benefit income, transfer, refund, or
  reimbursement
- whether an expected deposit is late
- whether a new deposit replaced an old pattern
- whether current spending is drawing down reserves

This prevents the app from safely saying, "Regular income has not arrived."

### 3. Missing-Income Alerts Would Be Risky Today

The app should not infer job loss. It should only detect observable pattern
breaks. Today, a missing-income claim would be too fragile because it could be
caused by:

- account sync gaps
- income arriving in an unlinked account
- payroll date shifting for a holiday
- a bonus replacing regular payroll
- a transfer from savings that looks like income
- a reimbursement or refund confusing the inflow total

### 4. Current Spend Comparisons Are Too Coarse

Straight-line pacing is useful but weak. Month-over-month totals are useful but
slow. Year-over-year can compare the wrong weekday and household context.
Week-over-week can lag if the app waits until the week is complete.

The current model has historical timing evidence, but it does not yet formalize
multiple comparison calendars for each category:

- same day of month
- same weekday
- same week of month
- same pay-cycle day
- same point in budget period
- partial current week versus expected partial week
- recent 4 to 8 week behavior
- seasonal or annual event context

### 5. Accuracy Is Not Yet Measured As A Product Contract

The app has smoke tests for deterministic behavior, but it does not yet have a
forecast backtesting harness that asks:

- What would Kwilt have predicted on each day in past periods?
- Did the actual period-end result land inside the forecast range?
- Did high-confidence forecasts outperform medium and low-confidence forecasts?
- Did missing-income alerts have acceptable precision?
- Which categories should refuse strong predictions?

Without calibration, the UI cannot safely decide when to speak strongly.

### 6. The UI Has No Forecast Trust Ladder

The app can show a prediction, but it does not yet have a complete user-facing
language ladder:

- "Known" for posted or scheduled events
- "Expected" for stable patterns
- "Likely" for calibrated predictions
- "Uncertain" for weak data
- "Changed" for regime shifts
- "Needs confirmation" when the model detects a possible life-pattern change

This matters because the model will never be perfect. Trust depends on the app
being honest about the type of claim it is making.

## What The New System Should Be

The new system should be a financial pattern engine that sits beside the current
category meter. It should not replace the deterministic budget meter. It should
feed it better evidence, better resource context, and better trust language.

Working name:

> Financial Pattern Engine

Primary job:

> Detect expected income, expected spend, pattern breaks, and runway state, then
> produce forecast receipts that existing Summary, category detail, review, and
> app-control surfaces can use.

## System Architecture

### Layer 1: Transaction Normalization

Input:

- Plaid transaction rows
- account metadata
- pending and settled status
- merchant and original description
- amount
- direction
- date and authorized date
- Plaid personal finance category

Output:

- normalized transaction rows
- canonical pending/settled handling
- likely duplicate removal
- source account classification
- transaction trust score

This layer mostly exists today.

### Layer 2: Inflow Classification

Classify inflows into resource types:

- regular payroll
- benefit income
- gig or client income
- transfer from savings
- brokerage or investment transfer
- refund
- reimbursement
- interest or reward
- unknown inflow

This should be probabilistic but explainable. The classification should use:

- merchant / description tokens
- Plaid category
- amount stability
- cadence
- source and destination account type
- whether the same counterparty repeats
- whether the amount resembles a prior payroll cluster

Important rule:

> Transfers from savings are not income. They are reserve drawdowns.

### Layer 3: Recurring Event Detection

Detect expected events for both income and spend.

Cadences:

- weekly
- biweekly
- semi-monthly
- monthly
- quarterly
- annual
- irregular but stable amount

For each event:

- expected amount range
- expected date window
- confidence
- grace period
- last observed date
- missed-window status
- replacement candidate

This layer generalizes today's scheduled and inferred recurring spend logic.

### Layer 4: Spend Shape Profiles

Build a category-specific expected path through the period.

For each category, learn:

- cumulative spend curve by day of month
- weekday pulses
- week-of-month pulses
- pay-cycle spend acceleration
- fixed versus variable share
- burstiness
- dormant or intermittent behavior
- typical late-month catch-up
- amount volatility

The model should not force all categories into one curve. Groceries, rent,
restaurants, gas, AI tools, and shopping behave differently.

### Layer 5: Comparative Calendar Ensemble

Use several comparison clocks at once.

Candidate clocks:

- period progress: day 10 of a 30-day month
- day of month: 10th versus prior 10ths
- weekday: Monday versus prior Mondays
- week of month: second week pattern
- pay-cycle day: two days after payroll
- partial week: first 3 days of this week versus expected first 3 days
- recent window: last 3, 7, and 14 days versus recent norms
- seasonal window: same month or known annual pattern, only when enough history exists

The engine should learn which clocks matter by category and event type.

Example:

- Rent: day-of-month and merchant recurrence matter most.
- Restaurants: weekday and recent 7-day momentum matter most.
- Groceries: weekly cadence and household routine matter most.
- Shopping: burst detection and recent momentum matter more than straight-line
  month pacing.
- Payroll: cadence and expected date window matter most.

### Layer 6: Regime Shift Detection

Detect when old assumptions may no longer be safe.

Regime shifts:

- regular income missing
- new income source appeared
- spending source changed accounts
- savings transfers replaced income
- large fixed bill changed amount
- category moved from dormant to active
- category moved from active to dormant
- unusual large spend appeared
- sync freshness is too weak to evaluate

Regime shifts should produce questions, not accusations.

Good copy:

> Kwilt has not seen the regular deposit usually arriving around the 1st and
> 15th. Are you living from savings right now?

Bad copy:

> You lost your job.

### Layer 7: Forecast Composer

Compose final outputs:

- expected income
- expected committed spend
- expected variable spend
- expected category spend
- likely range
- confidence
- explanatory drivers
- missing events
- changed events
- runway state
- model refusal reason when confidence is too low

The output should be a receipt, not just a number.

## Forecast Output Contract

Every prediction should include:

```ts
type ForecastReceipt = {
  subjectId: string;
  subjectType: 'household' | 'category' | 'income-source' | 'event';
  claim: string;
  projectedCents: number | null;
  rangeLowCents: number | null;
  rangeHighCents: number | null;
  confidence: 'known' | 'high' | 'medium' | 'low' | 'unknown' | 'changed';
  horizon: 'today' | 'week' | 'month' | 'runway';
  basis: Array<
    | 'posted'
    | 'pending'
    | 'scheduled'
    | 'recurring-pattern'
    | 'spend-shape'
    | 'recent-momentum'
    | 'income-pattern'
    | 'reserve-drawdown'
    | 'manual-target'
  >;
  drivers: string[];
  warnings: string[];
  needsUserConfirmation: boolean;
};
```

The UI should never have to reverse-engineer confidence from raw transactions.

## Evaluation Harness

Before the app makes stronger claims, build a backtesting harness.

### Method

For each historical account and category:

1. Pick a past period.
2. Pretend each day in that period was "today."
3. Hide all transactions after that day.
4. Run the forecast.
5. Compare prediction against the actual period-end result.
6. Record the forecast drivers and confidence at the time of prediction.
7. Repeat by category, income source, and household total.

### Baselines To Beat

The new model must beat simple baselines:

- straight-line pace
- last month
- trailing 3-month average
- same day-of-month average
- same weekday average
- scheduled-only
- current spend only

If the new model does not beat a baseline for a category, the app should use the
baseline or speak with lower confidence.

### Spend Metrics

- Mean absolute dollar error
- Median absolute dollar error
- Percent error by category
- Range hit rate
- Directional accuracy: hotter, cooler, normal
- Early-warning lead time before over-budget state
- False alarm rate
- Confidence calibration: high confidence should be right materially more often
  than medium or low confidence

### Income Metrics

- Deposit date window hit rate
- Deposit amount range hit rate
- Missing-income precision
- Missing-income recall
- False missing-income rate caused by sync gaps
- Replacement-income detection rate
- Transfer-versus-income classification accuracy

### Product Metrics

- User correction rate
- User dismissal rate
- Pattern confirmation rate
- Repeat use of forecast explanations
- App-control review completion after forecast warning
- Reduction in "why did Kwilt say this?" moments

## How Good It Can Be

These are target expectations, not measured repo facts yet.

### Very High Accuracy Candidates

Scheduled bills and stable recurring deposits can become very accurate.

Target:

- 90% to 97% date-window accuracy after 3 or more observations
- 90% or better amount-range accuracy for stable fixed events
- Missing-event alerts only after freshness and grace checks

Examples:

- mortgage
- rent
- paycheck
- fixed subscription
- utility autopay with stable merchant

### Medium To High Accuracy Candidates

Routine categories can become useful and often accurate, but usually as ranges.

Target:

- 70% to 85% range hit rate after enough history
- useful hot/cool direction before mid-month
- early warnings 3 to 10 days before the user would otherwise notice

Examples:

- groceries
- gas
- restaurants
- childcare
- household staples

### Low Accuracy Candidates

Bursty or rare categories should often refuse strong predictions.

Target:

- do not pretend precision
- detect unusual events quickly
- use budget limits and current exposure more than point prediction

Examples:

- travel
- medical
- car repair
- shopping bursts
- annual fees

### Missing Income Detection

This can be powerful, but only if conservative.

Target:

- high precision over high recall
- never say "job loss"
- only ask a contextual question after expected income misses a grace window
- require account sync freshness
- check for replacement deposits or savings transfers

Example:

> Kwilt has not seen the regular deposit usually arriving around July 1. Your
> spending is continuing from checking. Are you living from savings right now?

## UI Impacts

### Summary

Summary should evolve from "spent / budgeted" into a resource-state view.

Possible states:

#### Normal Income State

> 70% of $4,800 income = $3,360 living target. Planned categories are $140
> under target.

#### Missing Income State

> Regular income has not arrived yet. Kwilt expected a deposit around July 1.
> Spending is tracking toward $3,240 this month.

Actions:

- "I'm living from savings"
- "Income is irregular"
- "Ignore this month"

#### Savings Runway State

> Savings plan: $3,200/month from $18,000 reserve. Current runway: about 5.6
> months.

#### Low-Trust State

> Kwilt needs more history before it can forecast this month confidently.

### Category Detail

Category detail should show not just the projection, but why.

Example:

> Groceries projected $710, likely $660-$780.
> Based on 4 prior weekly grocery runs, 2 posted this month, and one pending
> Smith's charge.

Potential compact UI:

- Projection line
- Likely range
- Driver chips: `weekly pattern`, `pending included`, `ahead of normal`
- Confidence label
- "Why?" expandable receipt

### App Review / App Gate

The app gate should use pattern language only when it affects the spend decision.

Examples:

> Shopping is already $60 over its target and Kwilt still expects one recurring
> household order this month.

> Restaurants are running hotter than the last 6 Fridays. Opening DoorDash now
> will likely push the category over target.

If confidence is low:

> Kwilt cannot forecast Restaurants yet, but current spend is already 92% of the
> category.

### Transactions

Transactions should become the correction surface for pattern trust.

Possible affordances:

- "This is income"
- "This is a savings transfer"
- "This is a refund"
- "This repeats"
- "Ignore this pattern"

Avoid turning Transactions into a spreadsheet. Corrections should appear only
when a transaction materially affects a forecast or runway claim.

### Settings / Onboarding

The onboarding question should remain simple, but the model behind it should be
more general.

Current:

> What percentage of income do you want to live on?

Future:

> What should Kwilt use as your monthly living target?

Modes:

- Income percent: live on 70% of income
- Fixed monthly amount: live on $X per month
- Savings runway: make $Y last N months
- Irregular income: use confirmed deposits and conservative runway

The app should not ask every user for all modes upfront. It should discover when
the current mode no longer fits.

## What Perfect Might Look Like

Perfect does not mean every number is exactly right. Perfect means the app is
almost never overconfident, and when it is wrong, the user understands why.

### Perfect Summary

The user opens Summary and immediately sees:

- what resource they are living from
- how much of that resource is available this month
- what Kwilt expects to happen next
- what changed since the last check
- how long savings lasts if income is absent

Example:

> Living target: $3,360 from July income.
> Expected income: $4,800, $2,400 received, $2,400 still expected around July
> 15.
> Planned categories: $3,210.
> Current forecast: $3,420, likely $3,300-$3,620.
> Main change: restaurants are running hotter than the last 6 comparable weeks.

### Perfect Missing-Income Moment

Kwilt waits until the expected deposit window and sync freshness are strong
enough. Then it asks:

> Kwilt expected a regular deposit around July 1 and has not seen it. It looks
> like spending is continuing from savings. Should Kwilt switch this month to a
> savings runway plan?

If the user confirms:

> Savings runway target: $3,000/month. At the current forecast, reserves last
> about 5.4 months.

### Perfect Category Forecast

The category forecast is specific, calm, and inspectable:

> Groceries: $710 likely.
> Range: $660-$780.
> Why: 2 of 4 usual weekly trips have posted, one pending Smith's charge is
> included, and this week is 8% above the normal grocery shape.

If weak:

> Shopping is too bursty to forecast confidently. Current exposure is $410 of
> $500.

### Perfect App Gate

The pause is not generic. It is situational:

> Amazon is paused because Shopping is over target and this month has a second
> unusual burst. Open for 20 minutes?

The user can still choose. The app is a witness, not a scold.

### Perfect Model Behavior

The model:

- knows when it is seeing a stable pattern
- knows when the pattern broke
- distinguishes income from reserve drawdown
- distinguishes refunds from income
- distinguishes bills from variable spend
- learns category-specific spend shapes
- compares partial periods, not only completed periods
- refuses strong claims for bursty categories
- always produces a receipt
- gets better after user corrections
- proves its accuracy in backtests

## Proposed Build Sequence

### Phase 1: Forecast Backtesting Harness

Build the evaluation system before shipping stronger claims.

Deliverables:

- replay historical periods day by day
- compare model outputs against actual period-end outcomes
- score existing model against baselines
- produce per-category and per-confidence calibration reports

Why first:

The product cannot know whether to trust new model claims without a truth meter.

### Phase 2: Income Pattern Detector In Shadow Mode

Detect income patterns without changing UI.

Deliverables:

- likely payroll cluster detection
- cadence and date-window inference
- amount range inference
- missing-window status
- replacement deposit detection
- transfer-versus-income heuristics
- test fixtures for missing payroll, irregular income, refunds, transfers

UI:

No user-facing alert yet. Log receipts and evaluate.

### Phase 3: Spend Shape Profiles

Add category-specific shape models.

Deliverables:

- cumulative spend-by-day profiles
- weekday and partial-week comparisons
- pay-cycle relative comparisons
- recent momentum weighting
- burstiness score
- range forecasts and confidence calibration

UI:

Start with internal receipts or debug copy in forecast explainers.

### Phase 4: Forecast Receipt UI

Expose receipts where they clarify existing surfaces.

Deliverables:

- Summary forecast receipt line
- category detail "why" receipt
- compact confidence language
- refusal state when model is weak

### Phase 5: Savings Runway State

Only after income detection is conservative enough.

Deliverables:

- missing-income prompt
- savings runway target mode
- reserve drawdown calculation
- Summary state for living from savings
- user confirmation and correction affordances

## Open Design Questions

1. Should the first backtesting harness run only on Plaid Sandbox fixtures, or
   should it support imported anonymized real histories?
2. How much user correction UI is acceptable before this feels like a finance
   admin tool?
3. Should savings runway use current account balances, user-entered reserve
   amount, or both?
4. Should income-pattern confirmation live in Summary, Transactions, or
   onboarding/settings?
5. What is the minimum measured precision required before a missing-income
   prompt can ship?

## Recommended Bet

Build the truth meter before the smarter model.

The most valuable next slice is not a new UI surface. It is an offline forecast
evaluation harness that replays historical periods and proves where the current
model is good, where it is weak, and which future prediction claims deserve to
appear in the app.

We are betting that a deterministic, receipt-based pattern engine can become
trusted if every user-facing claim is calibrated against historical outcomes and
the UI refuses precision when the model has not earned it.

If that bet is wrong, we should keep Kwilt Money as a simpler live meter and
avoid strong month-end or income-pattern claims.

## Brief Split

This north-star doc should not become one large implementation scope. The work
splits into separate briefs:

- `brief-auto-budget-from-living-target` - make the user's living target
  operational by deriving or reconciling category budgets against the visible
  monthly target.
- `brief-prediction-trust-contract` - define the backtesting harness,
  calibration thresholds, and UI language rules that decide which forecast
  claims Kwilt is allowed to make.
- `brief-model-strategy-and-tradeoffs` - define the model families, AI
  boundaries, and cost/speed/accuracy tradeoffs for champion/challenger
  prediction work.
- `brief-income-runway-detection` - detect missing or irregular income and help
  the user switch to a savings-runway resource basis when appropriate.
