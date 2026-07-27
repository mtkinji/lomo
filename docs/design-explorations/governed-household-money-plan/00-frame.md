# Frame: Governed Household Money Plan

## What the user said

> This system design is really important and I want to get it right and complete in this next revision. There is a dynamic interplay among variable income, incomplete account lists, imperfect recommended categories, ambiguous category boundaries, living-percentage intent, and the whole-plan consequences of changing one category amount. We have useful pieces, but we have not nailed the complete system yet.

## Restated in user voice

When I connect whatever accounts I am ready to connect and tell Kwilt what share of dependable monthly income I intend to live on, I want it to build a useful first household plan without pretending it knows more than it does. I want the plan to stay calm when income varies, adapt when I add evidence, let me organize categories in a way that makes sense to me, and show exactly what changes elsewhere before I change one category amount.

## Target audience

`audience-aspirational-family-organizers` - households that want help staying organized without adopting a finance methodology or becoming full-time plan administrators.

## Representative persona

Maya is the household member trying to make ordinary family money decisions with less mental overhead.

- Current situation: She may connect one account today and another later. Her income may vary, Plaid may provide useful but imperfect classification, and her category boundaries may differ from a provider taxonomy or another household's model.
- What she is trying to do: See a credible plan and current spending reality quickly, then govern exceptions without building the system by hand.
- Emotional state or tension: She wants Kwilt to take the first responsible step, but financial automation becomes untrustworthy when it is unstable, falsely complete, or impossible to explain.
- What would make this feel wrong: Empty or misleading meters, category limits that move with each deposit, a canned category set treated as universal, hidden redistribution, arbitrary flexible-category starvation, or user corrections that automation later overwrites.

## Hero anchor

`jtbd-move-the-few-things-that-matter` - Help Maya make real progress on the ordinary household choices she wants to protect.

## Job flow step

Primary: Step 1, establish the household plan and the categories that matter, in `job-flow-maya-review-budget-reality-before-spending`.

Secondary consequences:

- Step 2: bring connected-account activity into a current, inspectable view.
- Step 3: see category and whole-plan reality.
- Step 4: understand actual, planned, outside-plan, forecast, freshness, and confidence.
- Step 5: correct transaction meaning or planning assumptions.
- Step 7: trust the result enough to use the pattern again.

The job flow currently scores plan-and-category establishment at 4. That score is not supported by the current source and observed first-open experience. The unified app can persist categories, plans, targets, overrides, and receipts, but it does not currently derive a starter category set, apply Plaid category evidence to uncategorized transactions, or allocate every flexible category coherently inside the target. Treat this step as provisionally 2-3 until the complete path is designed, built, and proven with partial-account and variable-income cases. Do not update the durable score until runtime evidence exists.

## Active anchors

- `jtbd-carry-intentions-into-action` - The living percentage must become a useful plan without category-by-category setup.
- `jtbd-review-budget-reality-before-spending` - Category meters must be based on credible assignments and a coherent whole-plan limit.
- `jtbd-trust-this-app-with-my-life` - Automation must expose evidence boundaries, preserve user authority, and remain reversible.

## Anchor assessment

```yaml
serves: [jtbd-carry-intentions-into-action, jtbd-review-budget-reality-before-spending, jtbd-trust-this-app-with-my-life]
```

No new JTBD is required. The missing work is not generic personalization or financial optimization. It is the trustworthy carrying-forward of a user's household intention under incomplete and changing evidence.

## Job-flow review

### Weakest step

`Establish the household plan and the categories that matter.`

The current system asks for a living percentage and can reconcile an existing set of categories, but a new user has neither durable category identity nor trustworthy assignments. The system therefore cannot turn the user's intent into a truthful first plan without manual repair.

### Evidence

- Plaid primary, detailed, and confidence fields are stored and projected, but effective category totals still require a persisted category assignment.
- Existing correction, exclusion, split, merchant-rule, category, target, override, plan-version, and receipt contracts provide strong governance primitives.
- Current starter-category derivation exists in historical design documentation, not in the unified runtime path.
- Current flexible evidence is derived from assigned completed-period history. Unassigned history cannot support category limits.
- Current flexible allocation consumes remaining capacity in stable category-id order rather than distributing constrained capacity coherently across all supported flexible categories.
- Current resource classification uses completed-period evidence and conservative receipts, which is directionally correct, but the product does not yet explain partial account coverage or distinguish a stable planning basis from this month's observed income clearly enough.
- Current amount-adjustment design can preview target facts, but the funding policy and affected-category model are not yet comprehensive enough to make every local edit understandable.

### Product change needed

Design one governed planning system spanning account evidence, transaction meaning, category identity, planning-income basis, category-limit allocation, user overrides, plan versions, consequence previews, and receipts. Onboarding, sync, Accounts, Summary, Transactions, Category Detail, Category Settings, and Living Plan settings must consume the same system rather than owning separate setup logic.

## Friction we are addressing

The current design treats several dependent problems as if they can be solved independently:

- A category cannot have a trustworthy spending profile until transactions are assigned to it.
- Transactions cannot be assigned well until category identity exists.
- Category limits cannot reconcile to an overall target until the planning-income basis is stable enough to support that target.
- The planning-income basis cannot be treated as complete when account coverage is partial or unknown.
- A category amount cannot be changed responsibly without a policy for where the added or removed capacity goes.
- Automatic maintenance cannot be trusted unless user corrections, category-shape choices, and explicit amounts have durable precedence.

The system must produce useful truth under uncertainty without converting uncertainty into either empty screens or false precision.

## System alignment

Constraint posture: `Bend the system`

The existing modular Money architecture, persisted objects, transaction-review contracts, and versioned Living Plan are the correct containment. The constraint that must bend is the assumption that independently implemented setup, categorization, and allocation behaviors add up to a coherent system.

### Current system facts

- Existing surfaces: Money Setup, Accounts, Summary, Transactions, Category Detail, Transaction Detail, Category Settings, Automatic Plan settings, plan receipts, and widgets.
- Existing flow: living percentage and account connection can precede reconciliation; later account changes occur independently through Accounts.
- Existing evidence: Plaid transaction metadata, merchant names, account context, stored assignments, money meaning, rules, completed-period history, forecast settings, and connection freshness.
- Existing durable user actions: create, rename, assign, exclude, split, remember merchant behavior, set a category amount, set the living percentage, include account evidence, and undo eligible plan changes.
- Existing plan objects: living-target intent, planning-income receipts, allocation candidates, active immutable plan versions, overrides, and plan-change receipts.
- Existing architecture: one authenticated Money repository and snapshot consumed by native Money surfaces.

### Missing or incomplete system contracts

1. **Account evidence coverage**
   - The system knows which accounts are connected and included.
   - It does not know whether those accounts represent the user's complete household picture.
   - A plan must name its evidence scope without pressuring the user to connect everything.

2. **Stable planning-income basis**
   - Actual deposits are observations, not a live monthly budget dial.
   - Variable income needs a conservative planning basis derived from completed periods or an explicit user-set planning amount.
   - A strong or weak current month must not automatically reflow category limits in real time.
   - Changes to the planning basis require cadence, materiality, and receipt rules separate from transaction sync.

3. **Starter category identity**
   - Plaid categories are useful evidence, not permanent user-facing truth.
   - New users need a small first set derived from their actual history, with a generic fallback only when evidence is insufficient.
   - Category identity needs provenance and stable mapping so renames, merges, rules, assignments, and plan history survive later refinements.

4. **Category-shape governance**
   - There is no universal answer to whether Phone belongs in Utilities, Housing, Subscriptions, or its own category.
   - The system needs a distinction between semantic family, user-facing category, and transaction evidence.
   - System recommendations should prefer a small coherent set, while user split, merge, rename, and move decisions become durable preferences rather than one-time edits.

5. **Automatic transaction assignment**
   - Only transactions without an effective governed assignment are eligible for automatic categorization.
   - User corrections, exclusions, splits, and rules always win.
   - Plaid metadata, merchant history, account context, and household preferences may supply an inferred assignment with provenance and confidence.
   - Ambiguous transfers, duplicates, and genuinely weak matches remain outside the plan or in Needs review.

6. **Target-backed category limits**
   - Fixed commitments and user overrides reserve capacity first.
   - Flexible limits should use completed-period evidence and distribute constrained capacity across all supported flexible categories coherently.
   - Category-id ordering can never determine who receives the remaining capacity.
   - Sparse evidence may leave capacity unassigned rather than manufacturing precision.
   - Fixed commitments plus overrides may exceed the target; the system reports over-target truth instead of silently shrinking them.

7. **Local edit to whole-plan consequence**
   - Raising a category amount creates an explicit durable override.
   - Before apply, the user sees whether the increase uses unassigned capacity, reduces flexible categories, or makes the plan over target.
   - Every affected category is named, with before/after amounts and the reason it moved.
   - Lowering an amount needs a destination policy for released capacity: restore flexible categories according to plan weights or leave it unassigned, without silently creating a new purpose.

8. **Plan stability and adaptation**
   - New evidence may update transaction reality without changing the monthly plan.
   - Candidate recomputation and active-plan promotion remain separate.
   - Routine corrections to uncategorized history can repair meters immediately while plan-limit changes follow controlled promotion rules.
   - Material account, income-basis, category-shape, fixed-cost, or override changes create bundled receipts and safe reversal when possible.

### Constraints to preserve

- Do useful work automatically, then let the user govern exceptions.
- Never overwrite explicit user intent with inferred evidence.
- Never use current-month variable income as a real-time category-limit control.
- Never assume an unconnected account does not exist.
- Never represent partial evidence as a complete household picture.
- Never force a provider taxonomy on the household.
- Never force every target dollar into a category when evidence is weak.
- Never reduce fixed commitments or user overrides merely to make the target appear balanced.
- Never hide which categories fund a user-requested increase.
- Never mix actual spend, planned capacity, outside-plan activity, forecast, and confidence.
- Never create a separate planner destination, recommendation inbox, or onboarding-only data model.
- Keep category and plan mutations durable, authoritative, explainable, and reversible where safe.

### Constraints we may challenge

- The current flat category model may need an internal semantic-family layer or optional category grouping so the system can understand overlap without dictating the user's visible structure.
- Living percentage alone may be insufficient when no trustworthy planning-income basis exists; one focused planning-basis question may be necessary.
- Automatic promotion may need different cadence rules for transaction assignments, category identity, planning-income basis, and category limits rather than one global recomputation policy.
- The existing amount-adjustment preview may need to become the universal consequence engine for category create, split, merge, archive, and limit changes.

## Core design tensions

1. **Useful now vs. complete evidence** - A first plan should help after one account, but clearly remain based on the connected evidence rather than claim household completeness.
2. **Stable plan vs. changing reality** - Transactions should update continuously; monthly category limits should change only when planning evidence earns a controlled revision.
3. **Automatic help vs. user governance** - The system should take the first step while making user corrections and structural preferences permanent constraints.
4. **Small category set vs. household-specific meaning** - Defaults should reduce setup, but users need durable freedom to lump or split ambiguous spending domains.
5. **Local choice vs. whole-plan constraint** - Every category amount is edited locally but funded globally.
6. **Conservative planning vs. incomplete usefulness** - Refusing false precision must not collapse the product back into empty categories and manual bookkeeping.

## Design implication

The next design should not begin with screens. It should define the state model, precedence rules, recomputation cadences, consequence engine, and user-governance contract first. The UI should then expose only the minimum moments where the user needs to understand scope, correct a structural assumption, or choose among real whole-plan consequences.

The system will likely need three separate but connected clocks:

- **Transaction clock:** sync and classify current evidence continuously.
- **Plan-evidence clock:** update completed-period spending and planning-income receipts conservatively.
- **Plan-promotion clock:** change active monthly limits only after materiality, confidence, stability, and governance checks pass.

## Aspirational design challenge

How might we help Maya receive a credible, calm household plan from partial and changing financial evidence, while keeping monthly limits stable, category meaning personally governable, and every local change truthful about its whole-plan consequence?

## Out of scope

- Assigning the non-living remainder to savings, giving, debt, investing, or transfers.
- Financial advice, wealth optimization, or cash-transfer automation.
- A universal category taxonomy that every household must adopt.
- Live LLM-generated dollar amounts or opaque allocation.
- Requiring every account before Money becomes useful.
- Requiring a full plan review before initial use.
- Treating a current-month income spike or dip as an immediate budget rewrite.
- Multi-user negotiation or approval workflows in this revision.
- Building new screens before the domain and consequence contracts converge.

## Relationship to the prior design

This exploration revises and broadens `auto-budget-from-living-target`. The Transparent Versioned Shadow Planner remains a useful mechanism, but it is no longer sufficient as the complete product model. The next design must integrate starter category derivation, automatic governed assignments, account-coverage truth, category-shape governance, stable variable-income planning, coherent flexible allocation, and universal consequence previews.

## Open question

When the initial connected accounts may be incomplete, should Kwilt make the first generated plan active immediately with a plain evidence-scope receipt, or should it ask one lightweight question such as “Is this enough of your household spending to build a first plan?” before activating limits?
