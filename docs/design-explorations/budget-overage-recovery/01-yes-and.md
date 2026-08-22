# Yes-And: Budget Overage Recovery

## Original idea

When Flexible spending is over budget, the negative number should lead to an action the household can actually take instead of functioning as a punishment.

## Adjacencies

### Yes, and what if it could verify the overage before asking Maya to respond?

- Serves: `jtbd-review-budget-reality-before-spending`, `jtbd-trust-this-app-with-my-life`
- Job elevation: Separate “the evidence is wrong” from “the household really overspent,” so recovery begins from a trusted fact.
- New value: A compact review can prioritize unusually large, uncategorized, duplicate-looking, outside-plan, or otherwise consequential transactions without turning every transaction into homework.
- Cost delta vs. original: medium
- Anti-pattern check: pass, if review remains optional and materially filtered rather than becoming a red-badge inbox.

Concrete evidence makes this the leading adjacency. Verification is not limited to finding a duplicate or wrong category. It must also let Maya say that a real expense was intentionally covered by savings rather than the month's flexible allocation.

### Yes, and what if it could preserve the expense while changing what funded it?

- Serves: `jtbd-review-budget-reality-before-spending`, `jtbd-trust-this-app-with-my-life`
- Job elevation: Correct the plan consequence without erasing actual household spending or changing what the purchase was for.
- New value: A material transaction can remain in Health, Travel, or another true category while its plan source becomes `Paid from savings`. The overage preview updates immediately, and the statement retains a separate savings-backed spending line.
- Cost delta vs. original: medium-high
- Anti-pattern check: pass, if this appears contextually during overage resolution rather than becoming transaction-by-transaction bookkeeping, and if Kwilt never fabricates a savings balance.

### Yes, and what if it could show what is still changeable this month?

- Serves: `jtbd-put-intention-before-impulse`, `jtbd-carry-intentions-into-action`
- Job elevation: Move from retrospective judgment to a forward-looking choice while preserving what already happened.
- New value: Kwilt can distinguish spent money from remaining planned categories and name one or two places where slowing down would still affect the month.
- Cost delta vs. original: medium
- Anti-pattern check: pass, if the language is “what is still changeable,” not “make up for your failure,” and never claims a category reduction creates cash already lost.

### Yes, and what if it could help protect a household priority rather than merely reduce spending?

- Serves: `jtbd-review-budget-reality-before-spending`, `jtbd-move-the-few-things-that-matter`
- Job elevation: Frame the decision around what the household still wants to preserve—groceries, an upcoming family commitment, or another chosen priority—not around arbitrary austerity.
- New value: Maya chooses what not to compromise, and Kwilt narrows the remaining tradeoff around that choice.
- Cost delta vs. original: medium
- Anti-pattern check: pass, if Kwilt does not infer values or silently move budgets; the user names the priority.

### Yes, and what if it could turn a chosen response into gentle follow-through?

- Serves: `jtbd-carry-intentions-into-action`, `jtbd-put-intention-before-impulse`
- Job elevation: Carry the recovery choice into the spending moment instead of leaving it as an insight Maya must remember.
- New value: A user could optionally tighten an existing category review threshold or choose an existing app-control policy for the rest of the month, with a visible and reversible expiration.
- Cost delta vs. original: high
- Anti-pattern check: conditional pass. It fails if Kwilt blocks apps automatically, treats restriction as punishment, or makes controls necessary to dismiss the overage.

### Yes, and what if it could learn from the overage without rewriting the current month?

- Serves: `jtbd-review-budget-reality-before-spending`, `jtbd-trust-this-app-with-my-life`
- Job elevation: Let lived household reality improve the next plan while keeping the current fixed plan historically truthful.
- New value: At month end—or after a repeated pattern—Kwilt can propose a next-month category or plan adjustment with explicit tradeoffs and an authoritative preview.
- Cost delta vs. original: medium
- Anti-pattern check: pass, if the suggestion is reviewable, evidence-backed, and future-dated rather than a silent current-month normalization.

### Yes, and what if it could recognize when there is no meaningful recovery action left?

- Serves: `jtbd-trust-this-app-with-my-life`
- Job elevation: Treat acceptance as a valid outcome instead of manufacturing busywork or false control.
- New value: If the number is correct and the month is effectively complete, Kwilt can say so plainly, preserve the result as learning, and offer no urgent action beyond reviewing next month when useful.
- Cost delta vs. original: low
- Anti-pattern check: pass. This directly avoids forced commitment, shame, and generic task creation.

### Yes, and what if it could support a bounded household conversation?

- Serves: `jtbd-invite-the-right-people-in`, `jtbd-review-budget-reality-before-spending`
- Job elevation: Turn a shared household tradeoff into shared context without exposing transaction detail or appointing one person as financial monitor.
- New value: A concise, privacy-bounded summary could let another planner weigh in on what to protect or change.
- Cost delta vs. original: high
- Anti-pattern check: conditional pass. It fails if sharing is default, includes merchant-level data, or becomes surveillance. Defer until shared Money ownership is real.

## Job elevation

The larger job is not “fix a red number.” It is:

> When the household plan and actual spending diverge, help me establish what is true, choose what is still within our control, and carry one realistic decision forward without rewriting history.

That job has three successive modes:

1. **Resolve** — Which transactions produce the overage, and are their category, household meaning, and plan source correct?
2. **Respond** — What can still change in the current month, if anything?
3. **Learn** — What should be reconsidered for a future plan without changing this one?

The product does not need to expose these as a three-step wizard. They define which action is honest in a given state.

## Frame recommendation

**Run the design-thinking loop with an expanded frame.**

Expand from “put an action beside a negative number” to **a contextual overage-resolution moment**. Keep the resting surface small, but lead with the material transactions producing the result. Let Maya correct category, household meaning, or plan source—including `Paid from savings`—and preview the recalculated flexible overage before saving. After resolution, the action can adapt among respond, learn, or no action based on what the remaining month genuinely supports.

The expansion is necessary because a single static CTA would sometimes route Maya to the wrong job. A generic `Review transactions` does not explain what can be corrected; `Outside the plan` hides legitimate household spending; `adjust budget` rewrites the fixed plan; `spend less` is punitive when the month is effectively over; and a future-plan suggestion does not help when a current source correction is available.

## Guardrail for divergence

The next phase should compare solution models for resolving the overage, with transaction-level funding correction as a required capability. It must reconcile two truths: routine funding-source bookkeeping remains rejected, while a contextual `Paid from savings` correction is necessary when a material transaction distorts the monthly-plan result. Household sharing and automatic app controls stay outside the first learning slice unless a divergent concept proves they are essential.

## Existing solution design to reuse

This is not a greenfield concept. Prior Money work already established:

- keep the full expense visible in its real category;
- preserve essential flexible capacity rather than implying the household should stop buying food;
- ask `How was this paid for?` with `This month's money`, `Saved money`, or `Split between them`;
- optionally name a source such as HSA or a connected savings account without requiring one;
- never claim a balance Kwilt cannot verify;
- treat savings withdrawals as asset/reserve proceeds, not ordinary income;
- do not overload `Outside the plan`, which is better reserved for duplicates, reimbursable or non-household activity, and other genuine exclusions; and
- avoid adding a funding-source field to every transaction by activating the choice only when a material overage or explicit transaction inspection makes it useful.

The divergence phase should therefore compare **where and how this known correction is offered**, not whether savings-backed spending is a valid concept.
