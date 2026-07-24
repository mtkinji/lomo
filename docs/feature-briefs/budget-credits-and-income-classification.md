---
id: brief-budget-credits-and-income-classification
title: Budget Credits And Income Classification
status: draft
audiences: [audience-aspirational-family-organizers]
personas: [Maya]
hero_jtbd: jtbd-move-the-few-things-that-matter
job_flow: job-flow-maya-review-budget-reality-before-spending
job_step: see-budget-reality
serves: [jtbd-trust-this-app-with-my-life, jtbd-review-budget-reality-before-spending, jtbd-carry-intentions-into-action]
related_briefs: [brief-income-runway-detection, brief-plaid-transaction-backed-meter, brief-prediction-trust-contract]
owner: andrew
last_updated: 2026-07-09
source_repo: mtkinji/kwilt-budget
source_sha: df383c3ac1538dff0a83b43a21ff3e45c024298b
---

> **Money source note:** Promoted from frozen standalone Money product documentation. Preserve its product reasoning, but verify route, implementation, delivery, and release claims against `src/capabilities/money/` and current runtime evidence.

# Budget Credits And Income Classification

## Context

Positive transactions currently expose two trust gaps. A recurring rent deposit may be dependable income, while a refund or reimbursement should usually reduce a category. Both arrive as green inflows, but they should not drive the same product behavior.

The Housing example makes the gap concrete: a `$2,200` rent deposit appears in Housing activity beside a `$2,052` mortgage outflow, but the category header still speaks as if all assigned activity is spend. If the deposit is income, Housing should stay at `$2,052 spent`. If it is a Housing credit, Housing should become `$148 ahead`. The user needs to create that meaning and see what changes.

## Job Delivery

- Job: `review-budget-reality-before-spending`
- Step: `see-budget-reality`
- Current score: 4
- Expected delivery change: 4 -> 4.5 if local and TestFlight verification prove that income, refunds, category credits, transfers, and not-counted inflows keep the category meter truthful.
- Evidence required: transaction detail meaning choice -> saved meaning/rule -> category header recompute -> income/runway inclusion/exclusion -> reload/refetch proof.
- Map update trigger: after runtime verification with the rent/Housing case and at least one refund/category-credit case.

## User Problem

When money comes back in, Kwilt needs to know what kind of household truth it represents:

- dependable income, like paycheck or recurring rent
- a category credit, like a refund or bill adjustment
- a reimbursement that should reduce spending but not inflate income
- a transfer or account movement that should not count either way
- a reward or small credit that may be not counted

Without this meaning, the top metric can overstate spend, hide refunds, inflate income, or make a good net-credit month look impossible.

## Product Decision

Build `Meaning Choice With Meter Preview`.

For positive transactions, the transaction detail sheet should offer a `Money meaning` section with impact preview:

- `Income` - counts toward income/runway and does not reduce a spending category.
- `Category credit` - reduces a selected category and can make the category net-credit for the month.
- `Not counted / transfer` - keeps the transaction out of income and category meters.

Kwilt may suggest the likely meaning, but the user decides. Recurring dependable rent should be suggested as income. Refund-like and reimbursement-like inflows should be suggested as category credits when there is a clear category. Transfers and unclear deposits should stay conservative until reviewed.

## User Experience

### Rent

1. User taps a positive rent transaction.
2. Transaction detail says `Looks like recurring income`.
3. The user sees:
   - `Income`: Adds `$2,200` to income this month. Housing stays at `$2,052 spent`.
   - `Housing credit`: Makes Housing `$148 ahead` this month.
   - `Not counted`: Leaves income and Housing unchanged.
4. User chooses `Income`.
5. Kwilt offers to remember similar deposits.
6. The transaction row shows the meaning, income includes the deposit, and Housing remains a spend category.

### Refund

1. User taps a positive refund transaction.
2. Transaction detail suggests the category credit when the category is clear.
3. The preview shows the category's new net position.
4. User saves and optionally remembers similar transactions.

## System Shape

Add transaction meaning separate from budget match. Budget match answers "which category is this connected to?" Meaning answers "how does this money affect Budget?"

First-release meanings:

- `income`
- `category_credit`
- `transfer`
- `not_counted`
- `unknown` or `needs_review`

Meaning sources:

- `inferred`
- `confirmed`
- `rule`
- `corrected`

Category math should represent signed net position. Income/runway should include confirmed income and high-confidence income patterns, while excluding category credits, refunds, transfers, rewards, and not-counted inflows.

## Acceptance Criteria

- Positive transactions can be assigned a money meaning from transaction detail.
- The sheet previews the impact of each meaning before saving.
- Recurring rent-like inflows can be treated as income and remembered for similar future transactions.
- Refund-like inflows can be treated as category credits.
- Category detail supports net-credit states when credits exceed spend.
- Income/runway excludes category credits, refunds, transfers, and not-counted transactions.
- Raw transaction details remain visible.
- Meaning rules are reversible.
- Domain tests cover income versus category credit, refund/category netting, transfer/not-counted exclusion, and negative category position.

## Out Of Scope

- Split transaction meanings.
- Expected refund tracking.
- Full income category management.
- Business, tax, or rental-property accounting.
- Notifications.
- Bulk rules management.

## Spec Refinement

Clear enough to build:

- The product surface is transaction detail.
- The first-release choices are income, category credit, and not-counted/transfer.
- The user should see a meter-impact preview before saving.
- Similar-source remembering should reuse the existing similar-transaction posture where possible.
- Domain tests should come before UI because the risk is accounting truth.

Needs implementation discovery:

- Whether current backend columns can persist transaction meaning or need a migration.
- Whether `spentCents` should become signed net position or whether a new field such as `netSpendCents` should be added while preserving compatibility.
- How to prevent existing forecast code from clamping category net position back to zero.
- Whether `transfer` and `not_counted` should be one first-release control or separate persisted meanings with one combined UI choice.

Deferred:

- Split credits.
- Expected refund inbox.
- Income source naming beyond similar-source rule labels.
- Full rule management UI.

Verification evidence:

- Unit tests for signed category math and meaning classification.
- Local run showing the rent/Housing example in the app.
- Local or TestFlight proof that a refund can make a category net-credit.
- Reload/refetch proof that saved meaning still affects category and income totals.
