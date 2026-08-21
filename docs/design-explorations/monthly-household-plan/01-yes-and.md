# Yes-And: Monthly Household Plan

## Original Idea

Replace percentage-of-income as Kwilt Money's universal center with one
evidence-backed monthly household plan amount that the user can understand and
adopt quickly.

## Adjacencies

### Yes, and connect evidence before asking for a plan decision

- Serves: `jtbd-review-budget-reality-before-spending`
- Job elevation: the user recognizes a plausible plan instead of estimating one
  from memory.
- New value: Kwilt can use income cadence, committed costs, category spending,
  account coverage, and eventually supported balances.
- Cost delta: medium.
- Anti-pattern check: pass when account connection remains optional and missing
  evidence never becomes invented certainty.

### Yes, and present concrete amounts and consequences instead of methods

- Serves: `jtbd-carry-intentions-into-action`
- Job elevation: choosing a plan becomes a three-second judgment rather than a
  budgeting exercise.
- New value: the user can compare an income-rule amount, a stable amount, or a
  runway-protecting amount through recognizable monthly outcomes.
- Cost delta: medium.
- Anti-pattern check: pass when the UI does not become a scenario dashboard.

### Yes, and keep the derivation behind the answer

- Serves: `jtbd-trust-this-app-with-my-life`
- Job elevation: the recommendation remains inspectable without making the
  method the interface.
- New value: the plan can record whether it came from normalized income,
  user-set amount, spending evidence, or runway modeling while ordinary UI says
  simply what amount governs the household.
- Cost delta: low.
- Anti-pattern check: pass through progressive disclosure.

### Yes, and recommend one plan rather than showing equal-choice configuration

- Serves: `jtbd-review-budget-reality-before-spending`
- Job elevation: Kwilt performs the analysis while the household retains the
  final decision.
- New value: a primary `Use this plan` action can coexist with an optional
  comparison path.
- Cost delta: medium to high because recommendation quality must be calibrated
  and explainable.
- Anti-pattern check: pass only with humble evidence language and an easy user
  override.

### Yes, and preserve the category system when the derivation changes

- Serves: `jtbd-carry-intentions-into-action`
- Job elevation: job loss, school, lumpy income, or another change becomes a
  plan adjustment rather than a financial restart.
- New value: category identity, history, rules, committed amounts, protected
  floors, and deliberate overrides survive.
- Cost delta: medium.
- Anti-pattern check: pass because it reduces administration.

### Yes, and let category room accumulate or recover across months

- Serves: `jtbd-review-budget-reality-before-spending`
- Job elevation: lumpy but ordinary spending can be handled without mental math
  or one-time exceptions every time.
- New value: positive and negative category adjustments persist, with current
  availability derived from the base monthly amount plus prior carry.
- Cost delta: medium.
- Anti-pattern check: pass when the balance is explained without debt or shame
  language.

### Yes, and let a family accept a real exception before or after it happens

- Serves: `jtbd-trust-this-app-with-my-life`
- Job elevation: an unexpected but intentional expense can belong to the month's
  plan without rewriting future months or disappearing from reality.
- New value: the household can add a named, category-bound amount after making
  a fast real-life decision.
- Cost delta: medium.
- Anti-pattern check: pass when additions remain rare, explicit, and do not
  create general flexible room.

### Yes, and make rollover history startable and resettable

- Serves: `jtbd-trust-this-app-with-my-life`
- Job elevation: the household controls which history governs today's answer.
- New value: a new August user can ask what current room would look like if the
  plan had begun in January, and can later start one category or all categories
  fresh without erasing history.
- Cost delta: medium.
- Anti-pattern check: pass when Kwilt labels retroactive calculation as a
  counterfactual and does not fabricate missing months.

## Frame Recommendation

Run the loop with the expanded frame: **an evidence-backed monthly household
plan with persistent signed category adjustments and bounded current-month
additions**.

Do not frame the work as a job-loss mode, savings mode, budgeting-method
selector, transaction-provenance feature, or category-reserve feature. Those
are narrower manifestations of the larger household-plan job.
