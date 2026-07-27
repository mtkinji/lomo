---
id: brief-governed-household-money-plan
title: Governed Household Money Plan
status: draft
audiences: [audience-aspirational-family-organizers]
personas: [Maya]
hero_jtbd: jtbd-move-the-few-things-that-matter
job_flow: job-flow-maya-review-budget-reality-before-spending
job_step: establish-plan-and-categories
serves: [jtbd-carry-intentions-into-action, jtbd-review-budget-reality-before-spending, jtbd-trust-this-app-with-my-life]
related_briefs: [brief-auto-budget-from-living-target, brief-budget-amount-adjustment, brief-accounts-inventory-shell, brief-transaction-rule-truth, brief-budget-credits-and-income-classification, brief-category-rollovers, brief-prediction-trust-contract]
owner: andrew
last_updated: 2026-07-27
---

# Governed Household Money Plan

## Context

Money can currently display connected transactions and user-created budgets, but a new user can reach the end of a month and see nearly empty categories because the system has not done the categorization and planning work their account evidence already supports. The existing automatic-plan, transaction-rule, category-editing, and income-classification contracts describe important parts of the answer, but not one complete system governing how evidence becomes categories, assignments, limits, later corrections, and whole-plan changes.

This brief unifies those parts. Its detailed reasoning, stress test, and accepted simplification audit live in [`docs/design-explorations/governed-household-money-plan/`](../design-explorations/governed-household-money-plan/).

## Target audience

`audience-aspirational-family-organizers` wants a household plan that becomes useful without turning setup or upkeep into a finance hobby. The system must help immediately from partial evidence while staying honest about which accounts, periods, and assumptions support its answer.

## Representative persona

Maya connects one account first, has variable or incomplete income evidence, and expects recognizable spending categories and believable month-to-date totals. She may later add another account, disagree with where Phone belongs, split Utilities, or change Housing. Those actions should teach and govern the same system that made the initial recommendation.

## Aspirational design challenge

How might we give Maya a useful, automatically maintained household plan from the evidence she has connected, while preserving her authority over category meaning, transaction treatment, monthly limits, and every material consequence?

## Hero JTBD

`jtbd-move-the-few-things-that-matter` is the demand spine: Money should help Maya carry a chosen household intention into ordinary decisions, not recruit her to administer a budgeting model.

## Job flow step

This improves step 1, **Establish the household plan and the categories that matter**, in `job-flow-maya-review-budget-reality-before-spending`. The map currently records a delivery score of 4, but that score is not evidence that a zero-category user receives a complete, account-backed starter plan in the current runtime. Do not raise or reaffirm the score until authenticated persistence, relaunch, later-account, and repeated-use evidence proves this contract.

## JTBD framing

When Maya connects whatever accounts she has available, help her see a recognizable and honest household-money reality immediately, then maintain a stable plan she can correct rather than construct. This carries intention into action (`jtbd-carry-intentions-into-action`), supports decisions from current budget reality (`jtbd-review-budget-reality-before-spending`), and earns authority through explicit evidence scope, precedence, receipts, and reversibility (`jtbd-trust-this-app-with-my-life`).

## Design

### Product decision

Build one **Governed Adaptive Plan**. System automation may perform only the same governed domain actions available to the user. There is no separate AI-owned category store, hydration pass, planner dashboard, or silent budget rewrite.

The system has two user-understandable rhythms:

1. **Live money** canonicalizes connected activity and assigns supported transactions to governed categories immediately.
2. **Monthly plan** derives a durable income basis and spending profile, computes the next plan, and activates automatic changes at the next monthly boundary. Initial supported plans activate immediately; explicit user saves apply immediately with their consequence inline.

Current spending can become accurate before the evidence is sufficient to generate limits. “Categories ready; set a monthly planning basis” is a supported useful state, not a setup failure.

### Core objects

- `EvidenceScope` records included accounts, institutions, date range, sync freshness, coverage gaps, and version.
- `CanonicalTransaction` preserves provider IDs, pending/settled relationships, transfer/refund links, amount, merchant, account, and provider metadata.
- `ProviderClassification` stores Plaid personal-finance primary, detailed, and confidence values as evidence, never as permanent household truth.
- A versioned provider-to-category mapping policy translates Plaid evidence without creating a second household taxonomy object.
- `SpendCategory` is the user-visible governed category, including status, provenance, aliases, mapping tags, and planning behavior.
- `AssignmentDecision` records category, source, confidence, reason codes, evidence version, and whether it is user-governed.
- `PlanningIncomeBasis` is a durable monthly planning number with source, supported periods, confidence, and user lock.
- A computed category spending profile contains robust completed-period proportions, recurrence, and evidence quality.
- `LivingTargetIntent` contains the user's living percentage. It does not imply what the remainder means.
- Computed `PlanCandidate` and `PlanConsequence` values make changes previewable; immutable `PlanVersion` and committed `PlanReceipt` records make applied changes attributable and auditable.

### Starter categories

For a user with no governed categories:

1. Canonicalize transactions and remove duplicates, pending/settled overlap, transfers, refunds, and unsupported money meanings from spend inference.
2. Create one compact, versioned broad starter category template regardless of which account arrived first. Partial accounts must not create a permanently partial taxonomy.
3. Use high-confidence Plaid personal-finance metadata plus merchant, recurrence, and account context to assign transactions into that stable template.
4. Use broad household defaults for ambiguity. Phone begins in Utilities; a separate Phone category appears only through a user split or strong repeated evidence plus an explicit structural proposal.
5. Include Other as the conservative supported fallback. Do not expose Plaid's full taxonomy as the user's permanent category inventory.
6. Persist category creation and transaction assignments through ordinary governed write adapters, then rebuild the authoritative snapshot.

After the first governed set exists, automation may assign into it but may not silently create, split, merge, rename, or delete visible categories.

### Assignment precedence

For each canonical transaction, the first applicable authority wins:

1. user split or explicit transaction correction
2. user exclusion or money-meaning correction
3. merchant or counterparty rule created from a user action
4. user-governed semantic-family mapping
5. previously confirmed assignment for the canonical transaction chain
6. deterministic transfer, refund, and pending/settled relationships
7. high-confidence provider classification plus local context
8. conservative fallback or `needs_review`

Automation runs only for transactions without a higher-governance decision. A user correction immediately updates current truth and may optionally establish a future rule. Sync, relaunch, provider recategorization, and plan recomputation may never overwrite it.

### Stable planning-income basis

The current month's deposits are evidence, not a live budget dial.

- Stable recurring income uses supported expected monthly receipts from completed periods.
- Established variable income uses a conservative statistic over completed periods with explicit confidence and coverage.
- Sparse, mixed, or absent income evidence does not invent a basis. Ask one focused question: “What monthly amount should this plan use?”
- A user-set basis remains locked until the user changes it.
- A newly connected account updates evidence and produces a candidate; it does not silently rewrite the active monthly plan.
- One-time inflows, asset proceeds, loans, gifts, transfers, and other ineligible money meanings never expand ordinary category limits.

### Smart-limit allocation

Let `B` be the durable monthly planning-income basis, `p` the living-target percentage, and `T = B × p` the target available to ordinary category budgets.

Each category has a blended flexible weight and a constraint type:

- **fixed**: protected recurring commitment
- **user override**: explicit amount protected from automatic redistribution
- **flexible**: system-maintained from a blend of versioned starter weights and completed-period household evidence

Allocation is deterministic:

1. Reserve fixed amounts and user overrides.
2. Compute remaining flexible capacity.
3. Blend the starter share and observed household share according to evidence confidence, normalize the flexible weights, and allocate all remaining capacity proportionally rather than by category order.
4. If protected amounts exceed `T`, preserve them and mark the plan `over_target`; never hide the conflict by shrinking another protected amount.

The invariant is explicit: `sum(category limits) = T`, unless protected amounts exceed the target, in which case `over_target = sum(protected) - T`. The living target is a complete category plan, not another inbox asking the user to assign a remainder.

### Governed funding rhythms

Every category has one user-governable funding rhythm:

- `monthly`: the category receives a monthly amount and ordinarily resets each month. The existing optional monthly rollover policy remains available for households that explicitly want prior over- or underspend carried into the next month.
- `reserve`: the category receives a stable monthly contribution and carries its available balance across periods for lumpy needs such as birthdays, holidays, travel, repairs, medical costs, and annual fees.

The monthly living target reconciles category contributions, never accumulated reserve balances. For a reserve category in one period:

`available = prior reserve + current contribution - counted spend`

An optional governed expected need contains an amount and due month, such as `$800 by December`. Reserve forecasts compare accumulated availability through the due month with that need; they never apply straight-line monthly pacing to the accumulated balance. Automatic actions and native settings use the same preview, consequence, Save, receipt, and undo contract for funding rhythm, contribution, and expected-need changes.

Funding rhythm is policy-assisted but user-owned. Obvious starter categories such as Gifts and occasions may use a versioned reserve default. Deterministic evidence may suggest reserve funding only after adequate annual history: at least 12 completed periods and repeated completed-period concentration in the same month-of-year or comparable bounded season. One spike never becomes a recurring need. Low confidence remains exposure-only or a contextual suggestion and never mutates the category.

Stable reserve contributions never jump to peak event-month spend. When a new or changed expected need is too near for the current reserve to cover, the consequence engine computes an explicit catch-up contribution from the real opening balance and remaining contribution opportunities. It shows the exact whole-plan redistribution or over-target result. The system never fabricates a starting balance or silently compresses fixed categories, other user overrides, or protected reserve contributions.

### Universal consequence engine

Every target, account-scope, category-structure, category-amount, income-basis, or rule change runs through one pure `PlanConsequenceEngine`. It returns the prior and proposed totals, every affected category, over-target change, evidence delta, reason codes, and undo safety.

When Maya raises a category amount, capacity comes proportionally from eligible flexible categories. Fixed amounts and other user overrides are never silently reduced. Any unresolved remainder becomes an explicit over-target amount.

When she lowers a category amount, capacity redistributes proportionally across eligible flexible categories. Category creation, merge, split, archive, and backfill use the same consequence and receipt contract.

The amount editor must therefore answer inline, before one explicit `Save`: “What changes elsewhere?” A local field save that conceals whole-plan effects is invalid. A separate confirmation is reserved for destructive structural changes or unsafe history loss.

### Two rhythms

- **Live money:** on sync or correction, update canonical truth and assignment coverage immediately.
- **Monthly plan:** recompute when completed periods, account scope, or governed assumptions change, but apply automatic maintenance at the next monthly boundary. Initial supported plans and explicit user saves apply immediately.

The user-visible rule is: activity updates now; automatic limits update next month; changes you explicitly save apply now.

### Surface contract

- **Setup:** connect accounts, create supported categories immediately, and ask for a planning basis only when evidence cannot support one.
- **Summary:** show current spend, active limits, over-target facts, freshness, account scope when relevant, and one latest-change notice.
- **Accounts:** show inventory and scope; adding an account updates current truth now and the automatic plan next month.
- **Transactions:** show assignment status and filter by account/category without conflating assignment truth with planning readiness.
- **Transaction Detail:** allow category, split, exclusion, and rule corrections through governed writes.
- **Category Detail/Settings:** expose local truth and the ordinary amount edit; reveal split/merge/archive and backfill consequences contextually rather than as permanent planner chrome.
- **Money Settings:** contain planning basis and living target. Open compact plan history from the latest change or Settings; do not add a separate Automatic Plan destination or promotion toggle.
- **System automation/Chat:** explain and invoke the same previews and mutations. Automation cannot bypass confirmation requirements, create hidden categories, or mutate plan state without a receipt.
- **Widgets/app controls:** consume the authoritative active snapshot and last trustworthy plan; they never calculate competing truth.

### Failure and refusal behavior

- Stale sync preserves the last trustworthy snapshot and labels freshness.
- Unsupported income preserves category truth and requests a basis instead of inventing limits.
- A failed batch write leaves the prior active version intact.
- Conflicting or low-confidence assignments remain `needs_review` and do not distort category spending.
- A later account may materially change history; show the candidate impact and preserve the active plan until promotion rules are satisfied.
- Undo is offered only while dependent later mutations do not make reversal unsafe.

### Implementation boundary

Extend the existing Money snapshot, category, assignment, transaction-rule, automatic-plan, receipt, and mutation-adapter contracts. Persist only committed authority: transaction truth and provider evidence, effective assignment provenance and user rules, visible categories and structural lineage, planning basis and living target, and immutable plan versions/receipts. Provider mapping policy, spending profiles, ordinary candidates, and consequence previews are deterministic computations or caches; persist a candidate only when a held next-month result must survive across sessions.

Migration must be additive. Existing user categories, corrections, rules, splits, exclusions, fixed amounts, overrides, and active plans are authoritative inputs. No migration may reinterpret or overwrite them from Plaid metadata.

### Acceptance contract

Pure-domain fixtures must prove precedence, canonicalization, variable-income stability, sparse-basis behavior, category derivation, order-independent allocation, protected-amount handling, consequences, promotion, and undo safety.

Historical replay must compare uncategorized rate, user-correction survival, category-total accuracy, limit volatility, and category-shape churn across partial and expanded account scopes.

Authenticated runtime proof requires category creation, assignment persistence, exact database reconciliation, termination/relaunch, later-account recomputation, category corrections, amount changes, receipts, and safe undo. TestFlight and repeated-use proof must cross at least two period boundaries and two account-scope changes before the job-flow delivery score moves.

## Success signal

After connecting a realistic partial account set, Maya sees recognizable categories and believable current spending without manually classifying the month. When a trustworthy basis exists, category limits reconcile to her living target and remain stable through ordinary income variation. Adding an account or changing one category produces an understandable, reversible whole-plan result. Over time, Maya corrects exceptions instead of administering the system.

## Open questions

- Calibrate the minimum completed-period and coverage thresholds for stable and variable income.
- Calibrate the broad starter vocabulary/default weights, assignment confidence, evidence/default blending, and receipt-notice threshold.
- Decide when repeated evidence is strong enough to propose—not silently perform—a category split such as Phone from Utilities.
- Validate the starter vocabulary and Plaid mapping policy against realistic Sandbox and dogfood history before treating them as product policy.
