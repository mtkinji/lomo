# Evaluate Learning: Budget Overage Review

## Learning questions

### Desire and timing

- When Flexible spending is materially over budget, does `Review overages` feel like a useful next step rather than an accusation or cleanup obligation?
- Does the action appear at the moment Andrew naturally wants it, without adding noise to ordinary positive Budget visits?
- When the overage is already understood and correct, is leaving the review without changing anything comfortable and complete?

### Comprehension

- Can Andrew predict that the review will show the budgets and transactions contributing to the whole-plan result?
- Does the grouped view explain why gross category overages can exceed the net Flexible spending overage because other budgets remain under their amounts?
- Are these three decisions clearly different:
  - category: what the purchase was for;
  - coverage: August plan versus saved money; and
  - money meaning: whether it was household spending at all?
- Does `Saved money` communicate that the expense remains real without implying that Kwilt knows the remaining savings balance?
- Does removing the fixed budget amount from the resting card improve the three-second read, with the statement still making the calculation easy to inspect?

### Corrective usefulness

- Can Andrew find the expected material transaction quickly from the whole-plan overage?
- Do category reassignment, split category, full saved-money coverage, and split coverage each produce the expected plan consequence?
- Does the exact before/after preview make the save decision obvious without becoming a finance worksheet?
- After a correction, does the remaining overage still suggest a useful next action—or is explanation enough?

### Trust and technical truth

- Does the saved-money correction preserve the transaction’s category and full actual spending while changing only monthly-plan-covered spending?
- Do Budget, category detail, transaction detail, the statement drawer, and any bounded Chat/widget consumers agree after correction?
- Does save survive refresh, relaunch, a subsequent transaction sync, and pending-to-posted replacement boundaries where supported?
- Is undo safe, exact, and clear?
- Does the positive card remain calm, with any acknowledgment limited to the specific over-to-within transition receipt?

## Evidence plan

### Required dogfood scenarios

Evaluate at least these three real or faithful current-account scenarios:

1. **Saved-money correction:** one large categorized posted transaction is intentionally covered fully or partly by savings.
2. **Category correction:** one material transaction is assigned to the wrong flexible or committed category and is recategorized or split.
3. **Accepted overage:** the grouped budgets and transactions are correct, so Andrew exits without changing anything.

For each scenario, record:

- whether `Review overages` was the expected action;
- time and navigation path to the intended transaction;
- whether category, coverage, and money meaning were understood without explanation;
- the predicted versus observed before/after amount;
- whether any wording felt punitive, vague, or overly administrative;
- whether the return destination and receipt felt complete; and
- refresh, relaunch, sync, and undo results when applicable.

### Supporting evidence

- iPhone 17 Pro screen recordings or screenshots for the resting card, grouped review, coverage drawer, preview, receipt, and recalculated return;
- focused automated proof for cents reconciliation, projection parity, immutable actual spending, persistence, version conflicts, and undo;
- authenticated same-account Simulator proof before TestFlight;
- internal TestFlight dogfood notes across at least three naturally occurring Budget visits, not only one scripted pass; and
- concise freeform reaction immediately after each use: `useful`, `neutral`, `punitive`, `confusing`, or `unnecessary`, with one sentence explaining why.

## Privacy-safe instrumentation

Allowed events:

- `money_overage_review_opened`
- `money_overage_category_opened`
- `money_overage_transaction_opened`
- `money_transaction_coverage_previewed`
- `money_transaction_coverage_saved`
- `money_transaction_coverage_undone`
- `money_overage_review_exited`

Allowed properties are bounded enums and counts only:

- entry state: `over_flexible_room`;
- correction kind: `category`, `split_category`, `saved_money`, `split_coverage`, `meaning`, `none`;
- result transition: `over_to_over`, `over_to_within`, `within_to_within`;
- source: `budget_card`, `category_detail`, `transaction_detail`;
- grouped category count bucket: `1`, `2_3`, `4_plus`;
- material transaction count bucket: `1`, `2_3`, `4_plus`; and
- outcome: `saved`, `undone`, `exited_without_change`, `failed`.

Do not track:

- transaction amount or overage amount;
- merchant, description, category identity, account identity, or institution;
- saved-money amount or split percentage;
- inferred savings balance, wealth, or runway;
- raw transaction ids in analytics; or
- a “correction rate” framed as user success or compliance.

## Supporting signals

The bet is supported when:

- Andrew chooses `Review overages` without needing to remember where transaction editing lives;
- he finds the intended transaction without scanning the full ledger;
- he correctly predicts that `Saved money` preserves the expense and removes only its monthly-plan-covered portion;
- the preview and resulting Budget agree exactly;
- the correction survives refresh, relaunch, and sync;
- the no-change scenario feels acceptable rather than unfinished;
- the resting positive card needs no praise or repeated helper text; and
- overage review remains occasional and contextual rather than becoming routine bookkeeping.

Brand goodwill is protected when Andrew describes the action as useful or neutral, never punitive; when no copy implies fault; and when the feature can be dismissed without leaving a badge, queue, or nag.

## Disconfirming signals

Revisit or stop if any of these occur:

- `Review overages` is interpreted as a forced audit or a demand to reduce spending.
- Andrew expects the action to change the budget rather than inspect its causes.
- The grouped categories do not reconcile intuitively with the whole-plan number.
- `Saved money` is mistaken for `Outside the plan`, a category change, an account transfer, or a claim about current savings.
- A user must inspect many ordinary transactions before reaching the material one.
- The correction hides actual spending or causes category detail, Budget, Chat, or widgets to disagree.
- Sync or classification overwrites the explicit coverage decision.
- Undo cannot restore the exact prior projection.
- The positive-state receipt feels congratulatory, patronizing, or unnecessary.
- Most review openings end without either increased understanding or a meaningful correction.

## Decision rule

### Proceed to permanent capability

Proceed after all three required dogfood scenarios pass and at least three naturally occurring internal TestFlight uses show:

- the intended transaction is reached without guidance;
- category, coverage, and meaning are understood correctly;
- every saved or undone correction reconciles exactly across refresh and relaunch;
- one post-correction sync preserves the decision;
- no transaction or actual spending disappears;
- the no-change exit feels complete; and
- the experience is consistently described as useful or neutral, not punitive.

### Simplify or revise

Revise when the entry action is valuable but the grouped view, labels, or correction model is confusing. Likely responses:

- replace `Review overages` with `See what’s contributing` if users expect budget editing;
- simplify the grouped view to one category at a time if reconciliation is unclear;
- change `How this is covered` wording while preserving the underlying domain distinction;
- defer split coverage if exact amount entry creates disproportionate friction; or
- keep saved-money correction in transaction detail but remove overage-specific grouping if users consistently know the exact transaction already.

### Retire or reframe

Retire the action if repeated use shows that a correct overage rarely has a meaningful correction and the grouped review mostly reproduces information already visible on Budget. Preserve the funding-source model if transaction-level `Saved money` remains useful from ordinary transaction detail, and let the over-budget card return to a quiet informational state.

## Expected next action

If this evaluation plan is accepted, write and refine the build brief around the internal TestFlight slice. Implementation should begin only after the brief resolves persistence shape, atomic coverage/undo authority, pending-to-posted behavior, grouped-contribution arithmetic, and exact navigation/return contracts.
