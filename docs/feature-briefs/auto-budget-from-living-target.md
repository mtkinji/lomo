---
id: brief-auto-budget-from-living-target
title: Automatic Living Plan From Living Target
status: accepted
audiences: [audience-aspirational-family-organizers]
personas: [Maya]
hero_jtbd: jtbd-move-the-few-things-that-matter
job_flow: job-flow-maya-review-budget-reality-before-spending
job_step: see-budget-reality
serves: [jtbd-carry-intentions-into-action, jtbd-trust-this-app-with-my-life, jtbd-review-budget-reality-before-spending]
related_briefs: [brief-plaid-transaction-backed-meter, brief-prediction-trust-contract, brief-budget-credits-and-income-classification, brief-income-runway-detection]
owner: andrew
last_updated: 2026-07-10
source_repo: mtkinji/kwilt-budget
source_sha: df383c3ac1538dff0a83b43a21ff3e45c024298b
---

> **Money source note:** Promoted from frozen standalone Money product documentation. Preserve its product reasoning, but verify route, implementation, delivery, and release claims against `src/capabilities/money/` and current runtime evidence.

# Automatic Living Plan From Living Target

## Concept

After Maya chooses what share of ordinary monthly income she intends to live on and connects accounts, Kwilt creates and maintains her category budgets. Fixed commitments and amounts she deliberately sets remain stable; supported flexible spending adapts within the remaining target. Every active change is visible and material changes are reversible, but Maya never has to manage or approve a plan unless she chooses to inspect it.

The living target defines the total container for ordinary monthly budgets. Kwilt assigns no meaning to the remainder and makes no claim that it is savings, giving, investing, debt payment, or discretionary cash.

## Job Delivery

- Job: `review-budget-reality-before-spending`
- Step: `see-budget-reality`
- Current score: 4
- Expected delivery change: 4 -> 5 when account-backed budgets are generated from the target, remain coherent after another account is added, and every promoted change is explainable without plan maintenance.
- Evidence required: choose target -> connect accounts -> generated Summary budgets -> add account -> one change notice -> fixed cost and override survive -> exceptional inflow does not expand budgets -> safe undo restores the prior plan.
- Map update trigger: after installed-build proof with Sandbox and controlled real history.

## User Problem

Choosing a living percentage currently records an intention without making it operational. Independent budget amounts do not prove that Kwilt used the target, and asking Maya to build or repeatedly review a plan merely transfers the system's work to her.

Maya needs the budgets to add up to a trustworthy monthly amount, adapt when account evidence changes, and leave fixed commitments alone. She should be able to understand a change, but understanding the planner cannot become a prerequisite for using Kwilt.

## Product Decision

Build a **transparent versioned shadow planner**:

- Candidate computation is internal.
- Only candidates satisfying deterministic promotion rules become active.
- An active version is never changed secretly; each promotion creates one visible receipt.
- Routine changes produce one calm Summary notice.
- Material changes produce a stronger notice with `See what changed` and `Undo` when safe.
- Unsupported evidence holds the last trustworthy plan or asks one focused question.
- Initial generation ends with `Your budgets are ready`; there is no allocation review.

This is an automatic-maintenance capability consumed by Onboarding, Accounts, Summary, Category Detail, Category Settings, and Transactions. It is not a new planner destination.

## Domain Contract

### Living target

`LivingTargetIntent` contains only the selected percentage, provenance, and update time. V1 accepts 50–100% in 5% increments. It must not persist inferred giving, saving, or remainder fields.

### Transaction meaning and planning role

Classification has two independent outputs:

- `cashflowMeaning`: `income`, `category_credit`, `internal_transfer`, `not_counted`, or `unknown`.
- `planningRole`: `recurring_planning_income`, `irregular_planning_income`, `asset_proceeds`, `one_time_inflow`, or `ineligible_or_unknown`.

An inflow being income does not make it eligible to set future monthly budgets. Only user-confirmed or high-confidence deterministic recurring/irregular planning income may enter the resource basis. Medium-confidence evidence remains candidate-only; low-confidence and conflicting evidence are excluded.

Evidence precedence is:

1. remembered user correction or source rule
2. canonical duplicate, pending/settled, transfer, and refund relationships
3. account and provider context
4. normalized counterparty and description
5. recurrence, cadence, completed periods, and amount distribution
6. off-cycle and amount-outlier evidence

Stock sales, brokerage or reserve withdrawals, bonuses, gifts, inheritances, loans, and other one-time inflows do not expand ordinary monthly budgets. Repeated asset withdrawals stay ineligible until the user explicitly chooses them as a living resource.

### Resource basis

- Stable recurring income uses a supported expected monthly receipt.
- Established variable income uses a conservative calibrated range from completed periods; 12 periods are preferred, with 6 and 3 explicitly downgraded.
- Sparse or missing history may create supported category structure and leave capacity unassigned, but it cannot invent income.
- A missing or stale new receipt never turns the resource basis into zero and never erases the last trustworthy plan.

### Allocation order

The pure allocator applies this order:

1. fixed monthly components supported by event receipts
2. deliberate user overrides
3. stable flexible components supported by calibrated history
4. exposure-only categories without a precise asserted amount
5. unassigned target capacity

Fixed and flexible components may coexist inside one user-facing category. Annual or quarterly commitments become monthly accruals only when cadence and rollover support that claim; otherwise they remain due-period exposure. Fixed commitments are never reduced to force the plan under target.

### Category identity

Generated categories use the existing canonical Kwilt ontology plus `Other spending`. Provider labels are evidence, not user-facing category identity. The allocator reuses compatible categories before creating one and preserves overrides and transaction rules through any stable merge. Sparse evidence favors fewer categories and unassigned capacity over false precision.

### Candidate and active plan

Identical normalized evidence, target, overrides, period, and allocator version must produce the same `AllocationCandidate`, evidence hash, and candidate hash.

`MonthlyLivingPlan` is immutable and contains the resource receipt, target amount, category components, unassigned capacity, over-target state, evidence hash, allocator version, and predecessor. A pointer identifies the active version.

Every active version has exactly one `PlanChangeReceipt` containing the trigger, before/after facts, affected categories, materiality reasons, evidence references, override constraints, and reversal lineage.

## Trigger And Promotion Contract

Recompute from the complete included-account evidence set after initial sync; account add, remove, relink, include, or exclude; relevant canonical evidence change; target or override change; category correction; period rollover; or allocator-version change.

Do not treat pending-to-settled replacement, transfers, duplicates, stale sync, one low-confidence label, spend-only changes, excluded inflows, or effective no-ops as independent active-plan changes.

A candidate may promote only when:

- the evidence is sufficiently fresh for every claim
- transfer and duplicate ambiguity is immaterial
- the resource and fixed-component receipts are supported
- overrides are preserved exactly
- category mappings do not orphan rules or overrides
- changed flexible values have sufficient history or remain exposure-only
- target, provenance, nonnegative, and idempotency invariants pass
- the plan, active pointer, and receipt can commit atomically and reverse safely

Otherwise Kwilt holds the prior plan, leaves unsupported capacity unassigned, or enters one focused exception state. A failed or stale computation can never replace the active plan.

### Materiality

A change is material when account scope or resource mode changes; target amount moves at least 5%; a category is created, archived, or merged; a fixed component changes; a flexible category moves by both 20% and $25 or by $100 absolute; unassigned capacity changes materially; or the plan enters/leaves over-target.

Everything else that passes promotion is routine. Thresholds are policy-versioned and evaluated in pure code.

## Experience Contract

### Onboarding

- Teach the purpose in one compact statement: Kwilt fits monthly budgets inside this share of supported income, keeping fixed costs in place and adjusting flexible spending.
- Use only the 50–100% slider with 5% steps and lower, current, and upper values.
- Do not use a numeric text field, segmented preset control, remainder label, savings implication, or plan review.
- After the first atomic promotion, show `Your budgets are ready` and open Summary.
- If no trustworthy resource exists, ask one concrete resource-basis question instead of showing an empty or invented plan.

### Summary

- The active category budgets are the primary evidence; do not add a persistent plan-math panel.
- Show at most one current plan notice.
- Routine: `Plan updated` plus one cause sentence and `See what changed`.
- Material: the same focused receipt entry plus `Undo` when safe.
- Blocked/refresh failure: preserve the last trustworthy budgets and state the specific limitation.
- If useful, one resource sentence may say `Based on regular monthly income` or `Based on variable income history`.

### Change receipt

Show one bundled cause, only changed categories, concise before/after values, and plain evidence labels. Do not expose candidate-versus-active terminology, confidence scores, source-profile internals, or require approval.

### Category detail and settings

- Show one source line: `Fixed bill`, `From recent spending`, `Set by you`, or `Current exposure`.
- An edited amount becomes a durable override and survives recomputation.
- Do not surround ordinary editing with a target-impact calculator; over-target conflict appears only when it is real.

### Transaction detail

Show a plain money meaning only when inspected: `Regular income`, `Variable income`, `Investment or reserve money`, `One-time money`, `Refund or category credit`, `Transfer`, or `Needs meaning`. If an asset drawdown is explicitly chosen, say `Used for monthly living`, not `Regular income`.

## Data And Security Requirements

- Persist target intent, source profiles, immutable plan versions, category components, overrides, receipts, notice state, reversal lineage, and the active pointer in account-backed storage.
- Add tables and policies additively; retain compatibility fields until the learning release proves safe.
- Owner may write. Existing household members retain read-only access; this feature adds no shared editing.
- Promotion and reversal run server-side in one transaction/RPC with ownership checks and an expected-active-version precondition.
- Raw transaction evidence remains authoritative and immutable from allocator writes.
- Analytics must not contain exact amounts, merchant descriptions, account identifiers, user category names, or receipt prose.
- A kill switch disables promotion while preserving reads of the last active version.

## Acceptance Criteria

### Determinism and resource truth

- Required fixtures produce byte-stable candidate facts and hashes for identical inputs.
- Transfers, duplicates, refunds, asset proceeds, one-time inflows, and unknown inflows cannot inflate the planning resource.
- A payroll bonus outlier does not alter the established recurring receipt.
- Variable income changes only from eligible completed-period evidence under the configured policy.
- Missing/stale income holds the prior trustworthy basis; it is never treated as zero.

### Allocation trust

- Fixed components and overrides survive every recomputation unchanged.
- Flexible allocations consume only remaining target capacity.
- Unsupported capacity may remain unassigned.
- Fixed plus overrides over target produces an honest over-target state without cutting either.
- Mixed, annual, sparse, exposure-only, and category-merge fixtures retain valid provenance.

### Versioning and visibility

- Initial, routine, material, blocked, no-op, failed, and reversed outcomes are representable.
- Promotion writes the immutable plan, components, active pointer, and receipt atomically.
- Every active version has exactly one receipt; every displayed notice points to an active receipt.
- A second-account backfill recomputes from complete evidence without double counting.
- Safe undo creates a new version from the prior values and does not delete evidence or history.

### Reductive experience

- The full onboarding-to-Summary path requires no allocation review or planner visit.
- Default UI contains no confidence dashboard, shadow-plan feed, global plan tab, remainder semantics, or per-account plans.
- Every promoted change is discoverable from one Summary notice and understandable from its focused receipt.
- The user can ignore plan mechanics during ordinary use.

### Proof

- Pure fixture suite, historical replay, Sandbox/simulator script, and installed TestFlight flow pass.
- The TestFlight flow covers a second account, fixed Housing, a durable override, exceptional inflow exclusion, material notice, and reversal.
- No stale, failed, or blocked candidate overwrites the last trustworthy plan.
- The rendered experience passes every critical reductive-UI scorecard item.

## Release And Reversal

Release first to Andrew-only TestFlight behind a promotion kill switch. Use additive schema, immutable versions, and compatibility reads. Withdrawal disables promotion and hides notices/source lines without deleting plan history or raw evidence. Permanent-product promotion requires the evidence and decision thresholds in `docs/design-explorations/auto-budget-from-living-target/05-evaluate-learning.md`.

## Out Of Scope

- assigning meaning or destinations to the non-living remainder
- a plan dashboard, approval queue, recurring review, or per-account plan
- LLM-generated dollar amounts or uncalibrated model promotion
- push, email, or SMS plan notifications
- automatic transfers or financial advice
- multi-user editing and conflict resolution
- multiple currencies
- open-ended category invention or automatic merchant-by-merchant splitting

## Resolved Questions

- The learning release generates real category budgets; reconciliation-only would not test the product bet.
- Sparse history uses supported categories, exposure, and unassigned capacity—not starter-template dollar amounts.
- No arbitrary default buffer is forced. Unassigned capacity is an honest result of unsupported evidence.
- Classifier types remain internal except for plain transaction meaning, a compact resource sentence, or one material unresolved question.
