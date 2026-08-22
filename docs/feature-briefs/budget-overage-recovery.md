---
id: brief-budget-overage-recovery
title: Review and correct what is driving a Budget overage
status: accepted
audiences: [audience-aspirational-family-organizers]
personas: [Maya]
hero_jtbd: jtbd-move-the-few-things-that-matter
job_flow: job-flow-maya-review-budget-reality-before-spending
serves: [jtbd-review-budget-reality-before-spending, jtbd-put-intention-before-impulse, jtbd-carry-intentions-into-action, jtbd-trust-this-app-with-my-life]
related_briefs: [brief-money-living-limit-answer, brief-transaction-truth-to-five, brief-budget-credits-and-income-classification, brief-governed-household-money-plan]
owner: andrew
last_updated: 2026-08-21
---

# Budget overage recovery

## Context

A negative Flexible spending answer currently reports a consequence without a useful next step. A real expense may be correctly categorized but covered by saved money rather than the current month's fixed plan; treating that expense as `Outside the plan` would erase important household-spending truth.

## Target audience

Aspirational family organizers need to understand a surprising month without turning Budget into a finance-maintenance system.

## Representative persona

Maya sees a large overage and needs to determine whether it reflects ordinary monthly spending, the wrong category, or an unusual purchase covered by money already saved.

## Aspirational design challenge

How might we help Maya understand and correct a surprising overage while preserving actual spending, category truth, and a calm fixed-plan model?

## Hero JTBD

`jtbd-move-the-few-things-that-matter` — Budget should move Maya from a surprising result to the one consequential correction without creating a cleanup queue.

## Job flow step

`job-flow-maya-review-budget-reality-before-spending`, at the step where Maya makes an intentional choice from current money reality. The current offering shows category and plan results but does not connect the whole-plan overage to a reversible transaction-level correction.

## JTBD framing

When Budget says the household is over, help me see what is driving it and correct the meaning of an unusual purchase without hiding what we spent or changing the plan behind my back.

## Design

The supported negative Flexible spending card says `$N over budget` and offers one neutral `Review overages` action. It does not repeat the fixed budget amount. The information affordance continues to explain calculation truth.

The action opens the existing Transactions inventory in a category-first overage mode. Only over-budget flexible categories appear, ordered by their plan-covered overage. Each category shows its overage and material current-month posted transactions. An offset sentence explains when under-budget categories make gross category overages differ from the whole-plan answer.

Transaction detail keeps three distinct facts:

- `Category`: what the purchase was for, including existing reassignment and split behavior.
- `How this is covered`: current month plan, saved money, or an exact split.
- `Money meaning`: household spending, transfer, credit, or genuinely excluded activity.

Coverage is an additive user-authored annotation. The full actual transaction remains in its category and total spending. Only the current-month-plan-covered cents affect Flexible spending. Monthly-plan cents plus saved-money cents must equal the canonical posted outflow exactly. Kwilt does not infer a savings balance, source account, or affordability.

Before save, the coverage drawer shows the exact current and proposed Flexible spending result and confirms that category and actual spending remain unchanged. Save rebuilds the authoritative snapshot. The user can return coverage to the month plan; a compact receipt may acknowledge a transition back within plan. The ordinary positive card stays quiet.

### UI contract

- Job: When Flexible spending is over, review the few categories and transactions driving it so the plan reflects what the household meant.
- Authority chain: this brief and accepted exploration; Kwilt Money domain and local UI primitives; iOS conventions; RNR anatomy reference.
- Three-second read: overage amount, contributing category, largest material transaction.
- Primary action: open a transaction to review its truth.
- Secondary information: category overage and cross-category offset.
- Reveal later: coverage choices, split amount, exact impact preview, money meaning.
- Scan order: whole-plan context, category contribution, material transactions.
- Must not add: resolve-all pressure, fabricated savings balance, praise, warning-colored CTA, new top-level destination.
- Reuse map: MoneyPlanLimitAnswer, MoneyTransactions, MoneyTransactionDetail, BottomDrawer, SettingsChoiceRow, Button.
- Nearest precedent: scoped Money transaction inventories and transaction-detail correction drawers.
- External exemplar ledger: N/A.
- Required states: supported overage, no contributing rows, save in progress, save failure, full saved coverage, split coverage, reverted coverage, positive result.
- Proof path: Budget to Review overages to a posted transaction on iPhone 17 Pro Simulator; save, refresh, relaunch, and reverse separately require deployed persistence proof.

### Data contract

For each posted outflow, absence of a correction means the full canonical amount is covered by the month plan. A correction stores exact saved-money cents, review time, and provenance; month-plan cents are derived as transaction amount minus saved-money cents. Pending, inflow, transfer, and excluded transactions cannot receive coverage corrections. Sync and classification do not overwrite the annotation.

### Activation and learning release

Show `Review overages` only for a supported current-month negative result with contributing evidence. No tutorial, notification, badge, or recurring nudge is added. The first release is an internal TestFlight learning release after additive backend deployment; local Simulator proof establishes UI and calculation behavior but not persistence.

## Spec refinement

- `Saved money` is a declaration of plan coverage, not a bank-account transfer or savings-ledger entry.
- Split coverage accepts the saved-money portion; the month-plan portion is derived to preserve an exact invariant.
- Category overage contribution uses plan-covered posted spending minus the category's fixed amount; actual category meters continue to show total actual spending.
- The first slice supports current-month canonical posted outflows only.
- Undo is implemented by restoring the prior saved-money cents while the same transaction remains available.
- Backend changes are migration files only in this task; deployment and connected-session proof are separate gates.

## Acceptance criteria

- A supported negative card has `Review overages`, no `Current budget` helper, and a quiet positive state.
- Review mode groups only over-budget flexible categories and opens the selected transaction.
- Coverage choices cannot change category, actual spending, provider facts, or money meaning.
- Exact before/after Flexible spending results are shown before save.
- Saving or reversing coverage recalculates fixed-plan usage exactly and survives snapshot reconstruction when the migration is deployed.
- Saved-money spending is disclosed in the calculation statement without a balance claim.
- Focused domain, repository, projection, screen, product-lint, and Simulator checks pass at their respective proof levels.

## Success signal

In the real orthodontic-expense case, Maya reaches the expected purchase, marks the correct saved-money amount, sees Flexible spending recalculate exactly, and can explain why category spending stayed unchanged.

## Open questions

Whether repeated saved-money use should later suggest a durable reserve plan remains intentionally deferred.
