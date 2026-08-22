# Frame: Budget Overage Recovery

## What the user said

> When we show that number, if it's negative, it almost just feels like a punishment and there's nothing we can do about it. If we're going to show it, we should probably come up with an action that the user can take.

## Restated in user voice

When the household is over its flexible budget, Maya wants to understand what is still changeable and choose a realistic next step, so the budget helps her recover agency instead of merely reporting failure.

## Target audience

`audience-aspirational-family-organizers` — people who want household life to feel more organized without becoming operators of a finance system.

## Representative persona

Maya is trying to keep her household's ordinary commitments and spending intentional without turning budgeting into a hobby.

- Current situation: The month is already over the fixed flexible-spending plan, and the amount is materially negative.
- What she's trying to become/do: Respond calmly, understand what is still within her control, and make one useful household choice.
- Emotional state or tension: The number may be true, but it can feel accusatory, final, and detached from any path forward.
- What would make this feel wrong to her: Shame, gamified recovery, a generic task list, financial advice, or quietly increasing the budget so the overage disappears.

## Hero anchor

`jtbd-move-the-few-things-that-matter` — help Maya make real progress in the few areas that matter without adding administrative burden.

## Job flow step

Primary step: **Make the intentional choice** — current score **3/5**.

The current product can show actual, planned, and freshness evidence; open transaction review; edit a living target; adjust category amounts; and hand off to spending controls. The gap is that the summary's over-budget answer does not yet turn a true negative result into a bounded recovery choice. The available actions are scattered and do not explain which one is relevant.

Supporting step: **See reality before acting** — current score **3/5**. The fixed-plan answer is now consistent, but a negative answer without a meaningful continuation risks making truth feel punitive rather than useful.

## Active anchors

- `jtbd-review-budget-reality-before-spending` — the overage must remain truthful while helping Maya decide whether to correct evidence, change future spending, or revisit a household priority.
- `jtbd-put-intention-before-impulse` — recovery should lead to a chosen next action, not a warning that merely creates guilt.
- `jtbd-carry-intentions-into-action` — the fixed plan should influence what happens next without requiring Maya to manually operate the budget.
- `jtbd-trust-this-app-with-my-life` — Kwilt must distinguish correcting bad evidence from rewriting a valid plan after overspending.

## Friction we're addressing

The red overage is truthful but inert. It says what has happened without distinguishing three materially different situations: the evidence may be wrong, the month may still contain avoidable spending, or the overage may already be unavoidable. Treating all three as the same negative status makes the product feel judgmental and leaves Maya to invent the recovery workflow herself.

Concrete dogfood evidence sharpened the first situation: a transaction currently counted against Flexible spending was intentionally paid from savings. The category and expense are correct, but the plan source is wrong. Maya needs to correct how the transaction is funded without hiding the spending, changing its category, or rewriting the fixed plan.

## System alignment

Constraint posture: `Extend the system`

Current system facts:

- Existing surface: the neutral Flexible spending answer card and its single explanation drawer on Budget.
- Existing user flow: the drawer can review flexible transactions, review other activity, or open the living-target editor; category rows open category detail.
- Existing domain/data model: a fixed monthly plan; separate flexible and committed variances; exact current-month transactions; category budgets; projections; plan-adjustment previews; authoritative receipts.
- Existing technical affordances: transaction corrections, category amount changes with impact preview, fixed-plan statement arithmetic, month progress, forecast state, category ordering, and Screen Time spending controls.
- Existing UX/copy conventions: one primary answer first, supporting evidence on disclosure, reversible changes, no silent plan rewriting, and calm language that treats drift as information rather than failure.
- Existing product framing: prior dogfood work used the same orthodontic-expense case and established that a real Health expense funded by HSA/savings should remain visible while ordinary monthly room is restored. It proposed `How was this paid for?` with `This month's money`, `Saved money`, and `Split between them` as the minimal source correction.
- Existing design boundary: the monthly-household-plan exploration rejected funding-source annotation as routine bookkeeping, but explicitly left `Outside the plan` unresolved for unusual real expenses funded from savings. Contextual overage resolution is the exception that makes the earlier primitive useful without making it universal.
- Current runtime gap: transaction detail can change category, plan role, or money meaning and can mark an outflow `Outside the plan`; it does not persist a distinct funding source. Therefore it cannot currently say `Paid from savings` while preserving the expense as household spending.

Constraints to preserve:

- The plan remains fixed until the user explicitly edits it.
- Actual spending never changes merely because the user changes a plan.
- Raising the budget after an overage cannot be presented as recovery by default.
- The resting Budget surface should keep one primary answer and avoid a recovery dashboard, checklist, or permanent coaching panel.
- Kwilt should offer only actions supported by current evidence; it should not imply financial advice or cash-safe-until-payday certainty.
- Transaction correction, spending adjustment, and future-plan change must remain visibly different jobs.
- Expense meaning, category, plan treatment, funding source, and connected-account balance must remain separate. `Paid from savings` cannot be implemented as `Outside the plan` because the expense is still real household spending.
- Funding-source correction should be exceptional and contextual, not a field Maya must maintain on every transaction.

Constraints we may challenge:

- The current answer card is informational only. An over-budget state may need one contextual action.
- The explanation drawer currently behaves as an evidence statement. It may need to become a decision surface when recovery is possible, while staying compact.
- A single generic action may be insufficient if the next useful step depends on whether the overage is correct, avoidable, or already sunk.

Design implication:

The solution should not erase or soften the truth of `$2,480 over budget`. It should translate that truth into the smallest evidence-backed choice available now. The likely product boundary is a contextual overage-resolution action attached to the existing answer. It should first reveal the transactions materially producing the overage and let Maya correct a transaction's plan source—such as `Paid from savings`—with a preview of the revised flexible result. Only after the result is accepted as true should Kwilt suggest what can still change this month or next.

## Aspirational design challenge

How might we help Maya resolve why the household is over budget, including correcting spending intentionally covered by savings, then move to one realistic next choice while preserving the fixed plan, actual spending history, and a calm one-answer Budget surface?

## Out of scope

- Debt payoff, bank transfers, or financial-advice recommendations.
- Automatically blocking apps or changing Screen Time policy.
- Silently reallocating or increasing category budgets.
- A new global planning dashboard or generic recovery task list.
- Treating a plan variance as cash available or a forecast of insolvency.

## Resolved question

The first action should optimize for resolving the overage's cause. In the observed case, that means changing one transaction from ordinary flexible-plan funding to savings-backed funding while keeping the expense and category visible. Responding to a trusted overage remains the next mode, not the first assumption.

The earlier product work already answers the conceptual model: expense meaning, funding source, planning eligibility, and account balance are separate. This exploration should reuse that model rather than invent a competing recovery concept.

## Open question

Should `Paid from savings` be a simple user-declared source in the first slice, or require selection of a specific connected savings account when one is available?
