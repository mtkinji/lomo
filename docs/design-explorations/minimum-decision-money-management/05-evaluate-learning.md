# Evaluate Learning: Managed Month

## Decision This Evaluation Must Support

Decide whether Kwilt can teach the three-part monthly model once, then help a
customer manage ordinary spending from one large flexible-money number and one
reusable **`Change plan`** action.

The evaluation is not measuring engagement with a budgeting dashboard. It is
testing whether the smallest coherent Money experience produces correct
understanding, trustworthy dollars, and confident plan changes.

## The Bet Under Test

We are betting that a customer can learn:

`monthly living money - protected costs = flexible money`

Then, during ordinary use, this is enough:

> **$343 left for flexible spending this month**
> `$617 of $960 used`

The full calculation and one **`Change plan`** action remain available through
**`See monthly plan`**. Category detail enters the same plan-change review with
that category already selected.

## Learning Questions

### Financial truth

1. Does the displayed amount reconcile exactly to the active planning basis,
   living target, protected plan, and counted flexible spending?
2. Does the planning basis stay stable when an individual paycheck arrives?
3. Is every current-period outflow counted exactly once?
4. Do ordinary mixed or unresolved flexible purchases reduce the total without
   producing a customer task?
5. Do transfers, refunds, duplicates, credits, and outside-plan activity receive
   the correct treatment?

### Initial teaching

6. After the short setup review, can the customer explain the three parts in her
   own words?
7. Does she understand that protected costs were set aside before flexible money
   was calculated?
8. Does **`Use this plan`** feel like accepting an understandable result rather
   than approving hidden financial machinery?
9. Is one teaching moment sufficient, or is a second focused moment genuinely
   necessary?

### Everyday comprehension

10. Can the customer identify flexible money left within a few seconds?
11. Does she understand that it is room in the monthly plan—not the checking
    balance or a guarantee that cash is safe until payday?
12. Is `$617 of $960 used` enough supporting context?
13. Can she find **`See monthly plan`** when she wants to verify the answer?
14. Does the calculation disclosure increase trust without becoming a second
    dashboard?

### Plan changes

15. Can the customer find **`Change plan`** from both the monthly plan and a
    category such as Shopping?
16. When entering from Shopping, does she understand why the whole plan is
    visible?
17. Before Save, can she say what receives more room, what receives less, what
    remains protected, and whether the total changes?
18. Can she distinguish this-month-only from ongoing changes?
19. After Save, do the Budget answer, category, plan calculation, and receipt all
    match the preview?
20. Can she cancel or reverse the change without uncertainty?

### Reduction and accessibility

21. Can any visible line or action be removed without harming comprehension or
    control?
22. Does the experience remain clear at large text sizes and on the smallest
    supported iPhone?
23. Does someone with low app fluency complete the path without interpreting an
    icon, hidden gesture, or unfamiliar navigation pattern?

## Evidence Gates

The gates are ordered. A visually successful screen cannot compensate for bad
financial truth.

### Gate 1: Deterministic truth

Use pure fixtures and focused regression tests for:

- supported flexible money left;
- no flexible capacity and negative flexible room;
- a persisted planning basis with partial-month income;
- a later paycheck that does not rewrite the plan;
- protected, flexible, outside-plan, and non-spending transactions;
- mixed merchants and unresolved flexible category placement;
- refunds, transfers, duplicates, and pending-to-settled relationships;
- refresh while a prior supported answer exists;
- genuinely missing target or planning basis;
- category change within flexible capacity;
- category change that alters protected costs or crosses the living target;
- stale preview rejected before commit;
- preview, commit, receipt, and post-save reconciliation.

For representative fixtures and Andrew's connected current month, independently
verify:

```text
planning basis × living target = monthly living money
monthly living money - protected plan = flexible capacity
flexible capacity - counted flexible spending = flexible money left
```

Any unexplained dollar, duplicate count, missing outflow, paycheck-driven plan
jump, or preview/commit mismatch stops the release.

### Gate 2: Andrew's Simulator review

Use the owning checkout and current connected data. Keep this early loop fast:

1. Run only the focused domain and component tests needed for the change.
2. Render the real Budget path in the Simulator.
3. Let Andrew inspect the result before expanding or polishing it.
4. Revise the product or UI direction in small increments.
5. Run comprehensive diff-aware verification only after the experience is
   accepted.

Exercise:

- the one-time teaching moment;
- ordinary Budget return;
- **`See monthly plan`**;
- **`Change plan`** from the monthly view;
- **`Change plan`** from a category;
- Save, cancel, relaunch, receipt, and reversal;
- ordinary ambiguous purchases without a review message;
- refresh and last-supported-answer behavior;
- true missing-foundation recovery using controlled data, not Andrew's valid
  onboarding state.

### Gate 3: Uncoached comprehension

After Andrew accepts the interaction direction, test with at least three people,
including Blair and at least one person who describes herself as having low
confidence using apps. Age may be relevant research context, but it is not used
as a proxy for ability.

Give no feature tour. Ask each person to:

1. Review the three-part monthly plan.
2. Open Budget and explain the large amount.
3. Find how the amount was calculated.
4. Open Shopping and give it more room.
5. Explain the whole-plan consequence before saving.
6. Save or cancel, then explain the resulting state.

Use neutral questions:

- `What does this amount mean to you?`
- `What was set aside before Kwilt calculated it?`
- `Is this your bank balance?`
- `What would change if you saved this?`
- `What would stay protected?`
- `Where would you go if the plan felt wrong?`

Do not teach the answers while testing them.

### Gate 4: Small TestFlight use

After truth and comprehension pass, ship the same experience to Andrew and a
small invited cohort for at least one ordinary budget check and one real plan
change. TestFlight evaluates whether the model remains trusted as transactions
arrive, not whether people repeatedly open the app.

## Supporting Evidence

The bet is supported when:

- every displayed amount reconciles to authoritative Money facts;
- customers explain flexible money as what remains after protected costs;
- they find the number quickly without summing category tiles;
- they do not call it their account balance or cash safe until payday;
- they can reopen the calculation without help;
- a category-originated change naturally expands to the whole-plan consequence;
- they correctly identify what changes and what stays protected before Save;
- Save, return, receipt, relaunch, and reversal remain consistent;
- ordinary transaction ambiguity produces no administrative request;
- low-app-fluency customers complete the same path without moderator rescue;
- no additional permanent UI is needed.

## Disconfirming Signals

Revise or stop when:

- the total cannot be independently reconciled;
- one paycheck changes the durable monthly plan without a confirmed planning
  update;
- ordinary mixed purchases cause blocking or vague messages;
- customers interpret the large number as bank balance or guaranteed purchasing
  power;
- the setup lesson is forgotten immediately and **`See monthly plan`** does not
  restore the model;
- **`Change plan`** opens different financial logic from different entry points;
- users change a category without realizing another category, protected cost,
  or the living target is affected;
- preview and committed results differ without rejecting stale state;
- the reusable review grows into a general-purpose planner dashboard;
- comprehension depends on persistent helper copy, warnings, or decoration;
- large text or a small screen hides the amount, consequence, or Save action.

## Decision Rule

Proceed to a small TestFlight release only when:

- every Gate 1 reconciliation passes;
- Andrew accepts the real connected-data Simulator result;
- all uncoached participants identify flexible money left correctly;
- all distinguish it from account balance after the final wording;
- all can find the calculation and plan-change action;
- all correctly explain the consequence before saving;
- no participant requires category cleanup to receive the primary answer;
- the surface passes the reductive-UI runtime scorecard.

If comprehension fails but the arithmetic is sound, revise in this order:

1. the teaching language;
2. the large-number wording;
3. reading order and typography;
4. the used-versus-capacity line;
5. the disclosure organization;
6. the scope of the financial claim.

Do not add a new card, dashboard, meter, legend, or warning until those smaller
corrections have been tested.

If financial truth fails, do not soften the copy or show an estimate. Fix the
calculation or withhold the unsupported claim through the one true recovery
state.

## Learning Instrumentation

For the local Simulator phase, use test output, screenshots, reconciliation
notes, and Andrew's direct feedback. Do not delay early iteration to implement
production analytics.

Before TestFlight, add only privacy-safe events needed to answer the learning
questions:

- `money_managed_month_viewed`
  - answer state, period relation, freshness bucket;
- `money_monthly_plan_opened`
  - originating surface;
- `money_plan_change_started`
  - whole plan or category origin;
- `money_plan_change_previewed`
  - consequence class and number-of-affected-categories bucket;
- `money_plan_change_saved` or `money_plan_change_cancelled`
  - origin and this-month-versus-ongoing choice;
- `money_plan_change_stale_rejected`;
- `money_plan_recovery_opened`
  - missing target or missing planning basis.

Do not collect merchant names, category names, dollar amounts, account balances,
income, receipt text, conversation content, screen recordings, or generic
time-on-screen.

## Brand-Goodwill Check

Ask after testing:

- `Did Kwilt make your monthly spending feel clearer or more complicated?`
- `Did any number sound more certain than it should?`
- `Was anything unnecessary?`
- `Would you be comfortable letting Kwilt keep this plan current?`
- `What, if anything, would you be afraid to change?`

The experience passes when customers describe it as calm, understandable,
inspectable, and reversible—not merely polished.

## Expected Next Action

Refine the native Money feature brief against this plan, resolve any remaining
domain or product ambiguity, then implement the local learning release with
regression-first logic tests, focused component tests, and Simulator review
before comprehensive verification.
