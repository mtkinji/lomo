# Iteration 1: Divergent System Models

## Fixed design challenge

How might we help Maya receive a credible, calm household plan from partial and changing financial evidence, while keeping monthly limits stable, category meaning personally governable, and every local change truthful about its whole-plan consequence?

## Axis of variation

The alternatives vary by **source of authority and the moment uncertainty is resolved**:

- provider evidence first, corrected later
- minimal user confirmation before activation
- continuously governed evidence with separate truth and plan clocks

All three preserve the current Money capability, Summary, Transactions, Accounts, category detail/settings, Living Plan intent, user overrides, and receipts.

## Model A: Provider-Led Starter Plan

### Structure

After the first Plaid sync, Kwilt uses high-confidence Personal Finance Categories, merchant identity, and completed history to create a compact visible category set. It assigns every eligible uncategorized transaction and computes fixed and flexible limits within the living target. The plan becomes active immediately. Users correct categories, rules, and amounts from existing native surfaces; later corrections outrank provider evidence.

### Account coverage

The first plan names its connected accounts in a receipt but otherwise assumes the visible evidence is sufficient to be useful. Adding an account reruns category derivation, assignment, and allocation. Existing user-governed categories and overrides survive; newly observed provider categories map into existing categories where possible.

### Variable income

The planning basis uses high-confidence completed-period income receipts. Current-month deposits never change limits. Established irregular income uses a conservative lower completed-period range. If the basis is missing, Kwilt asks for one planning amount.

### Category shape

A curated mapping translates provider categories into a small canonical Kwilt set. The model prefers broad defaults such as Housing, Utilities, Groceries, Restaurants, Transportation, Shopping, Subscriptions, Health, and Other spending. Users may later rename, split, merge, or create categories.

### Limit allocation

Fixed commitments and overrides reserve capacity. Remaining capacity is allocated proportionally to supported completed-period flexible spending. Unsupported target capacity remains unassigned.

### Amount changes

A local category change previews unassigned capacity, proportionally adjusted flexible categories, and over-target state. Applying it creates an override and one versioned receipt.

### Persona fit

Very low setup burden and immediate visible improvement. It matches Maya's desire not to build a finance system.

### System fit

Reuses nearly all current data, domain, and UI structures. Requires a provider-to-Kwilt mapping, starter generation, automatic assignment persistence, proportional allocation, and broader consequence preview.

### Best when

- Plaid history is broad and high confidence.
- The user's preferred category model is close to the curated mapping.
- The connected accounts represent most ordinary household activity.

### Fails when

- The account set is materially incomplete.
- Provider categories are confident but semantically wrong for this household.
- Category lump/split preferences differ substantially from the default.
- Automatic structural changes after later accounts feel like the system redesigning the plan.

### Anti-pattern check

Passes if provider evidence is clearly subordinate to user intent. Fails if “high confidence” is treated as household truth or if category correction becomes a recurring review burden.

## Model B: Confirmed Plan Skeleton

### Structure

Kwilt derives the same complete candidate, but before first activation it asks a short sequence of high-leverage questions: whether the connected evidence is sufficient for a first plan, which planning-income basis to use when income is variable, and whether a small set of ambiguous categories should remain grouped or separate. The user never reviews transactions or every limit. Their answers activate the plan and become durable governance constraints.

### Account coverage

The user chooses `Build from these accounts` or `Add another account`. This is not a completeness attestation; it is authorization to use the current evidence scope. Later account additions produce a material plan preview before activation when category identity or the resource basis changes.

### Variable income

Stable payroll can activate automatically. Variable or mixed income presents a conservative detected basis beside `Use another monthly amount`. The selected planning basis stays fixed until the user changes it or accepts a later material recommendation.

### Category shape

Kwilt shows only ambiguous structural decisions with material consequences, such as `Phone with Utilities` versus `Phone separately`. Everything else uses the compact derived set. These choices create durable semantic mappings.

### Limit allocation

The same fixed-first, override-preserving, proportional flexible allocator applies. The user sees the total and only material uncertainty, not every line-item derivation.

### Amount changes

Every increase asks the user to choose among supported consequences when multiple valid policies exist: use unassigned room, rebalance flexible categories, or save over target. A decrease can restore system-managed flexible allocations or remain unassigned.

### Persona fit

Higher comprehension and governance at the moment of greatest uncertainty, with far less work than manual budgeting.

### System fit

Uses the current setup and adjustment surfaces but adds a short confirmation layer and persisted governance decisions. More UI and resumable state are required than Model A.

### Best when

- Financial automation requires explicit early trust-building.
- Account coverage and variable-income basis cannot be inferred safely.
- A few category-shape choices dominate household understanding.

### Fails when

- Even three questions feel like finance setup.
- Users do not understand the consequences before seeing the plan in use.
- The system asks questions that later evidence could have resolved quietly.

### Anti-pattern check

Passes if questions are rare, concrete, and skippable. Fails if onboarding becomes a planning review, preference wizard, or permission ceremony.

## Model C: Governed Adaptive Plan

### Structure

Kwilt maintains an internal evidence model distinct from the visible household plan. Plaid categories, merchant patterns, account scope, transaction assignments, planning-income receipts, semantic families, category preferences, fixed components, flexible profiles, and user overrides each have explicit provenance and precedence. The first useful plan becomes active immediately, but every component knows whether it is observed, inferred, governed, or user-set. Three clocks update transactions, plan evidence, and active limits independently.

### Account coverage

Every plan version carries an `EvidenceScope`: included accounts, covered periods, freshness, and material known gaps. Kwilt never asks users to claim completeness. Summary can say `Based on 2 connected accounts` in the plan receipt; Accounts remains the natural place to expand scope. A later account changes current truth immediately, but changes category identity or monthly limits only through plan-promotion rules.

### Variable income

`PlanningIncomeBasis` is a durable plan input, not current-month income. It may be system-supported stable, system-supported conservative variable, or user-set. Completed-period evidence can create a new candidate basis, but only material, sustained change promotes automatically. The active basis survives a weak month, late deposit, sync gap, or one unusually strong month.

### Category shape

An internal `SemanticFamily` organizes evidence such as housing, utilities, connectivity, food, and transportation. A visible `SpendCategory` is the household-governed container. Phone can remain inside Utilities, move under a Housing presentation group, or become its own visible category without rewriting raw provider evidence. User lump/split/rename/merge decisions become durable mapping constraints.

### Automatic assignment

The precedence ladder is explicit:

1. split allocation or explicit user correction
2. exclusion or money-meaning decision
3. user-governed merchant/source rule
4. household category mapping preference
5. high-confidence provider and merchant inference
6. conservative fallback or Needs review

Only ungoverned transactions move automatically. Current meters reconcile immediately after persisted assignments.

### Limit allocation

Each visible category contains components with provenance:

- fixed commitment
- user override
- system-managed flexible amount
- exposure-only evidence

After fixed components and overrides, flexible capacity is distributed against supported flexible weights. When the requested flexible profile exceeds capacity, all eligible flexible categories compress proportionally subject to policy floors and caps; none is starved by identifier order. When evidence supports less than the available target, the remainder stays unassigned.

### Amount changes

One `PlanConsequenceEngine` handles target, account, category, and amount mutations. It returns the proposed active plan, funding sources, affected categories, target status, evidence changes, reversible boundary, and plain-language receipt. The UI shows only the consequences relevant to the action.

### Persona fit

Best long-term fit: automatic by default, calm under variable income, honest about partial evidence, and increasingly personalized through ordinary corrections.

### System fit

Preserves the current capability and versioned-plan architecture but extends the domain model materially. It requires explicit provenance types, evidence scope, semantic-family mapping, flexible-weight allocation, distinct recomputation policies, and a universal consequence engine.

### Best when

- Kwilt is expected to become a trusted long-lived household system.
- Account scope, income, and category structure evolve over time.
- The user wants automation without surrendering authority.

### Fails when

- Internal complexity leaks into the UI.
- Provenance states are stored but do not actually govern precedence.
- The system becomes too conservative to deliver a useful first plan.
- Migration tries to replace all current data contracts at once.

### Anti-pattern check

Passes if the evidence graph stays internal and the user sees a calm plan plus contextual explanations. Fails if it becomes a financial dashboard, confidence-score display, or taxonomy editor.

## Iteration 1 comparison

| Criterion | Provider-Led Starter | Confirmed Skeleton | Governed Adaptive |
|---|---|---|---|
| Immediate usefulness | High | Medium-high | High |
| Partial-account honesty | Medium | High | High |
| Variable-income stability | High | High | High |
| Household category governance | Medium | High | High |
| Ongoing automatic maintenance | Medium-high | Medium | High |
| User setup burden | Low | Medium | Low |
| Domain-model complexity | Medium | Medium-high | High |
| Risk of false confidence | Medium-high | Low-medium | Low if implemented fully |
| Fit for a long-lived system | Medium | Medium-high | High |

## Iteration 1 finding

Model C is the strongest comprehensive direction, but it should borrow two disciplines from the other models:

- From Model A: make the first useful plan active immediately and reuse a compact canonical mapping rather than inventing open-ended categories.
- From Model B: ask one focused question only when no safe planning basis or structural choice can be inferred; do not require a routine approval flow.

Iteration 2 must pressure-test this combined direction rather than accepting its conceptual completeness at face value.
