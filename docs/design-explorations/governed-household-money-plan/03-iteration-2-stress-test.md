# Iteration 2: Stress Test And Model Revision

## Starting hypothesis

The leading model is a Governed Adaptive Plan: an immediate useful first plan, internal evidence provenance, user-governed visible categories, a stable planning-income basis, fixed-first and override-preserving allocation, three clocks, and one consequence engine.

This iteration tests whether that model remains coherent when the evidence and the user's mental model are incomplete or changing.

## Stress-test principles

A passing response must:

- improve current truth without silently rewriting user intent
- keep active monthly limits stable through ordinary transaction noise
- name the evidence boundary without turning setup into a completeness checklist
- preserve one authoritative snapshot and one active plan version
- show local and whole-plan truth separately
- avoid a generic review inbox
- avoid requiring the user to understand provider categories, confidence scores, or allocation internals
- remain deterministic and testable

## Scenario 1: New user, one spending account, no categories

### Situation

Maya connects one credit card. Plaid returns several months of high-confidence spending categories, but no income is visible and another household account remains unconnected.

### Model A response

Creates categories and assignments successfully, but cannot calculate a target-backed overall limit without an income basis. It risks falling back to independent historical category amounts that do not reconcile to the user's living percentage.

### Model B response

Asks whether the connected account is enough and requests a monthly planning amount. Accurate but introduces setup before any value is shown.

### Model C response

Immediately creates and assigns the evidence-supported category structure, so current spending is useful. It does **not** pretend category limits are target-backed. It asks one focused next question: connect an income-bearing account or enter the monthly amount Kwilt should plan around. Existing transaction truth remains useful while plan status is `basis needed`.

### Revision

Current transaction truth and an active monthly plan are separate activation thresholds. The system may activate assignments and categories before it can activate target-backed limits.

## Scenario 2: New user, one account containing spending and stable payroll

### Situation

Maya connects her primary checking account. It contains three or more completed periods of stable payroll and ordinary spending.

### Expected response

- Derive a compact category set from high-confidence evidence.
- Persist assignments for every eligible ungoverned outflow.
- Classify the payroll source as supported recurring planning income.
- Apply the living percentage to the supported monthly basis.
- Detect fixed commitments, preserve evidence uncertainty, and allocate flexible limits proportionally.
- Activate the first plan without asking for approval.
- Show `Your plan is ready` with a receipt naming account scope, period coverage, planning basis, and any unassigned capacity.

### Revision

Immediate plan activation is correct when both category and resource evidence pass deterministic gates. Account completeness is not a required user claim.

## Scenario 3: Variable income with large monthly swings

### Situation

Income across six completed months is $7,200, $4,100, $9,500, $5,000, $6,800, and $3,900. Current month has already received $10,000.

### Failure to avoid

Applying the living percentage to current-month receipts would make category limits expand dramatically, then contract later.

### Revised response

- Classify the source as established irregular planning income.
- Use a conservative completed-period basis according to a versioned policy, such as a lower calibrated range rather than the current month or simple maximum.
- Store the basis and its source as a durable `PlanningIncomeBasis`.
- Do not change it when the $10,000 current-month deposit arrives.
- Re-evaluate at period close or after a sustained material pattern change.
- If a new basis is materially different, produce a candidate and receipt; do not continuously reflow the active plan.
- Let the user set a different stable monthly planning amount, which becomes a hard override until removed.

### Revision

`livingPercent` and `PlanningIncomeBasis` are separate plan inputs. The percentage expresses intent; the basis is a stable monthly planning estimate. Neither is the same as observed income this month.

## Scenario 4: Income evidence is sparse or structurally mixed

### Situation

The connected history contains one paycheck, two transfers, a tax refund, and a brokerage withdrawal.

### Revised response

- Exclude transfers, tax refunds, asset proceeds, and one-time inflows from an automatic ordinary planning basis.
- Do not calculate against zero.
- Preserve any prior trustworthy basis for an existing user.
- For a new user, ask one concrete question: `What monthly income should Kwilt use for this plan?`
- Keep the living percentage neutral about the remainder.

### Revision

The system must support a user-set planning basis as a first-class governed input, not merely as an exception hidden in onboarding.

## Scenario 5: Phone bill category ambiguity

### Situation

Plaid identifies a recurring mobile-carrier payment. The household could reasonably consider it Utilities, Housing, Subscriptions, or Phone.

### Model A response

Uses a curated mapping, likely Utilities. Fast but may teach the wrong household model.

### Model B response

Asks during setup. Accurate but premature; the user may not care until they see the category in context.

### Model C revised response

- Map the transaction to an internal semantic family such as `connectivity`.
- Place it in the compact default visible category `Utilities` unless a durable household mapping says otherwise.
- Do not ask during setup.
- When the user opens the transaction or category, make `Move to another category` and `Make Phone its own category` understandable actions.
- If the user creates Phone, move the selected history according to explicit preview, persist the carrier rule/mapping, and run the consequence engine for category-limit redistribution.
- Never ask the user to manage the semantic family.

### Revision

Semantic families are internal evidence vocabulary. Visible categories are household-governed containers. The default is intentional lumping; splits happen contextually when the distinction becomes useful.

## Scenario 6: Recommended category set feels incomplete

### Situation

The first plan includes Housing, Utilities, Groceries, Restaurants, Transportation, Shopping, and Other spending. Maya expects Childcare and Medical.

### Revised response

- The first set contains only supported categories plus a restrained fallback.
- Creating a category can begin from a transaction, a group of similar transactions, or an empty category intent.
- When started from evidence, Kwilt proposes which history moves, the merchant mapping, and a target-backed initial limit.
- When created without evidence, the category can begin with a user-set amount or zero/exposure-only state; the system must not invent history.
- The new category becomes a governed mapping destination for future assignments.
- The consequence engine shows which flexible limits fund it or whether the plan becomes over target.

### Revision

Category creation is a structural plan mutation, not only insertion of a row and amount. It must share the consequence engine.

## Scenario 7: Recommended category set feels too detailed

### Situation

Maya does not want separate Phone, Internet, Electricity, and Water categories. She wants Utilities.

### Revised response

- `Combine categories` previews moved assignments, rules, overrides, fixed components, and resulting limits.
- The destination category inherits durable mappings and transaction rules.
- Conflicting overrides are not summed blindly; the preview names the proposed destination amount and funding effect.
- The merge creates category lineage so old plan versions and receipts remain interpretable.
- Future provider evidence maps directly to the governed destination.

### Revision

Visible category identity needs immutable lineage separate from its current name and membership. Merge/archive cannot orphan history, rules, or receipts.

## Scenario 8: A second account is connected later

### Situation

The first plan was based on a credit card and checking account. Maya later adds another card containing phone, medical, and travel spending plus transfers to the first account.

### Revised response

1. Add current transactions and resolve transfers/duplicates before category totals update.
2. Apply existing governed mappings and rules to eligible new rows.
3. Map new provider evidence into existing visible categories where possible.
4. Add a new category only when the evidence supports a materially distinct household job and no governed mapping covers it.
5. Recompute spending profiles and fixed evidence from the complete included-account set.
6. Keep the active planning-income basis unless the new account changes supported resource evidence materially.
7. Produce a candidate plan.
8. Promote routine limit changes only under cadence and materiality rules; category creation, fixed-cost changes, and resource-basis changes are material and receive a visible receipt.

### Revision

Adding an account changes current truth immediately but does not automatically mean every plan component should change immediately. Evidence incorporation and active-plan promotion are distinct transactions.

## Scenario 9: User raises Housing by $300

### Situation

Housing is fixed or user-governed. Maya changes its monthly amount from $2,000 to $2,300.

### Revised consequence order

1. Use unassigned target capacity.
2. If more capacity is needed, compress only system-managed flexible components according to their available slack and allocation weights.
3. Never reduce fixed components or other user overrides.
4. If eligible flexible slack is insufficient, show the remaining over-target amount.

### Preview contract

- Housing: `$2,000 -> $2,300 · Set by you`
- Unassigned capacity used, if any.
- Every flexible category that changes, with before/after amount.
- New planned total, living target, and variance.
- Actual Housing spend remains unchanged.
- Apply creates or replaces the Housing override and one plan version.

### Revision

The system needs `flexibleSlack` and `allocationWeight`, not only a supported amount. Proportional compression must not use category identifier order.

## Scenario 10: User lowers Housing by $300

### Situation

Maya lowers a user-governed Housing amount.

### Valid policies

- Restore system-managed flexible categories toward their supported profile.
- Leave released capacity unassigned.

### Revised default

Restore eligible flexible categories proportionally toward supported caps; leave any remainder unassigned. The preview names restored categories. The user does not choose a destination for every dollar because that would turn a local correction into manual allocation.

### Revision

The consequence engine needs deterministic release-capacity behavior as well as shortage behavior. It must never assign the released amount a moral purpose.

## Scenario 11: Fixed commitments and overrides exceed the target

### Situation

Housing, Utilities, Childcare, and amounts set by Maya total $5,400 against a $5,000 target.

### Revised response

- Preserve every fixed component and override.
- Set system-managed flexible components to their policy floors or zero as supported.
- Mark the plan `over target by $400`.
- Explain which protected amounts create the state.
- Offer contextual actions: change target, change a user-set amount, or review whether a fixed classification is wrong.
- Do not recommend which protected cost to cut.

### Revision

Over-target is a legitimate plan state, not allocator failure. It cannot block current spending truth or erase the last active plan.

## Scenario 12: Current month is unusually expensive

### Situation

Medical spending spikes because of one event.

### Revised response

- Current Medical actuals and forecast update immediately.
- The active monthly Medical limit does not increase merely because the user spent more.
- Completed-period evidence may later change the flexible profile if recurrence becomes supported.
- If the transaction represents a new recurring fixed commitment, that separate evidence may generate a material plan candidate.

### Revision

Actual spend never trains the active limit inside the same period without an explicit structural reason. This avoids `spend more -> receive a larger budget` feedback.

## Scenario 13: Stale sync or provider outage

### Revised response

- Keep the last trustworthy assignments and active plan.
- Show freshness on current truth.
- Block plan promotion.
- Do not recalculate a missing resource basis as zero.
- Queue no hidden mutation that later applies without revalidation.

### Revision

Freshness is claim-specific: stale data can block a plan change without making the prior plan disappear.

## Scenario 14: Pending, duplicate, transfer, refund, and credit ambiguity

### Revised response

- Pending transactions may appear in current activity and forecast but do not create durable fixed or flexible planning evidence.
- Pending-to-settled pairs canonicalize before assignments and profiles are counted.
- Transfers between included accounts are excluded from income and spend.
- Refunds and reimbursements require money meaning; high-confidence category credits may reduce current category net spend but do not expand planning income.
- Ambiguous inflows and outflows remain conservative without blocking unrelated categories.

### Revision

Canonicalization and money meaning precede both category assignment and planning evidence. The system cannot safely treat them as downstream cleanup.

## Cross-scenario revised state model

### Evidence objects

- `EvidenceScope`: included accounts, connection status, covered periods, freshness, known exclusions, and evidence hash.
- `CanonicalTransaction`: one settled economic event after pending, duplicate, transfer, and removal reconciliation.
- `ProviderClassification`: immutable Plaid primary/detailed/confidence evidence.
- `AssignmentDecision`: effective visible category, provenance, confidence, governing rule or correction, and revision lineage.
- `PlanningIncomeReceipt`: source role, completed-period evidence, conservative amount, confidence, and eligibility.
- `SpendingProfileReceipt`: category completed-period samples, fixed/flexible evidence, weight, cap, floor, and confidence.

### Governance objects

- `SemanticFamily`: internal stable vocabulary used for mapping and explanation.
- `SpendCategory`: visible household container with stable identity, name, lineage, and status.
- `CategoryMappingConstraint`: household choice mapping provider/merchant/family evidence into a visible category.
- `UserAmountOverride`: explicit category amount with durable precedence.
- `PlanningBasisOverride`: explicit monthly resource basis with durable precedence.

### Plan objects

- `LivingTargetIntent`: percentage and provenance.
- `PlanningIncomeBasis`: active monthly basis, mode, source receipts, confidence, and last material review.
- `AllocationCandidate`: pure projection from scope, basis, categories, profiles, constraints, and policy version.
- `MonthlyLivingPlan`: immutable active version.
- `PlanConsequencePreview`: before/after facts for any proposed structural or amount mutation.
- `PlanChangeReceipt`: committed trigger, affected facts, evidence, reversibility, and lineage.

## Revised precedence contract

### Transaction assignment

1. explicit split allocation
2. explicit correction or exclusion
3. explicit money-meaning decision
4. user-governed merchant/source rule
5. household category mapping constraint
6. high-confidence provider and merchant inference
7. conservative fallback or Needs review

### Category amount

1. explicit user amount override
2. supported fixed commitment
3. system-managed flexible allocation
4. exposure-only category with zero or conservative amount

### Planning-income basis

1. explicit user-set planning basis
2. supported stable recurring basis
3. supported conservative irregular basis
4. prior trustworthy basis during temporary uncertainty
5. basis needed; never zero-by-default

## Revised clock contract

### Transaction clock

Runs after sync, correction, rule change, pending settlement, or account-scope change. It canonicalizes and persists eligible assignments, then republishes the authoritative Money snapshot.

### Plan-evidence clock

Runs after completed-period close, meaningful category mapping changes, canonical historical correction, account-scope change, or planning-input change. It produces receipts and candidates but does not necessarily change active limits.

### Plan-promotion clock

Runs when a candidate is valid and a promotion trigger is eligible. Initial supported plans activate immediately. Routine changes may promote automatically under cadence and materiality policy. Structural, resource-basis, fixed-cost, override, or over-target changes receive material visibility and reversal where safe.

## Iteration 2 finding

The Governed Adaptive Plan survives the stress tests only after five refinements:

1. Categories and transaction truth may activate before a target-backed plan.
2. The planning-income basis is durable and independent from current-month deposits.
3. Semantic families stay internal while visible category shape is governed by the household.
4. The allocator uses weights, caps, floors, slack, and proportional redistribution rather than sequential truncation.
5. One consequence engine governs every structural and amount mutation.

Iteration 3 must turn these refinements into one closed system contract with exact state transitions, algorithms, surface ownership, non-goals, migration boundaries, and acceptance evidence.
