# Frame: Auto Budget From Living Target

## What the user said
> Build the full allocator. Kwilt should use the living target and spending patterns to set monthly budgets intelligently: fixed costs first, then flexible spending. The remainder of income must stay undefined; Kwilt should not infer savings, giving, or any other purpose for it.

## Restated in user voice
When I choose how much of my income my household should live on and connect my accounts, I want Kwilt to create and maintain useful category budgets from my real spending patterns without making me manage a plan, so I can trust the numbers when I need them without Kwilt deciding what the rest of my income is for.

## Target audience
`audience-aspirational-family-organizers` - households trying to become more organized without adopting a finance or productivity methodology.

## Representative persona
Maya is a parent or household lead who wants calm support for ordinary family decisions, not another finance hobby.

- Current situation: She can name a monthly living target and connect one or more accounts, but the app does not turn that evidence into maintained category budgets.
- What she's trying to become/do: Have trustworthy budgets ready when she needs them without becoming the plan manager.
- Emotional state or tension: She wants help, but money recommendations feel high-stakes when the system is opaque or overconfident.
- What would make this feel wrong to her: Requiring a planning review, cutting rent to make the math work, assigning the remainder to savings or giving, overwriting a number she set, or presenting weak guesses as facts.

## Hero anchor
`jtbd-move-the-few-things-that-matter` - Help Maya make real progress in the few areas her household most wants to protect.

## Job flow step
`see-budget-reality` in `job-flow-maya-review-budget-reality-before-spending`.

- Current offering: Summary and Category Detail show spend, limits, pace, projections, and a living-target reconciliation sentence.
- Current delivery score: 4, medium confidence.
- Gap: The living target does not generate category limits, recommendation receipts, or a durable plan. Existing category amounts can therefore look authoritative without being target-backed.

## Active anchors
- `jtbd-carry-intentions-into-action` - The chosen living target should become a usable plan without category-by-category setup.
- `jtbd-trust-this-app-with-my-life` - Every allocation needs evidence, confidence, reversibility, and respect for user overrides.
- `jtbd-review-budget-reality-before-spending` - A meter is only trustworthy when its limit reconciles to the household's chosen living resource.

## Anchor assessment

### serves snippet
```yaml
serves: [jtbd-carry-intentions-into-action, jtbd-trust-this-app-with-my-life, jtbd-review-budget-reality-before-spending]
```

No new anchor is needed. The feature is correctly framed as carrying a chosen intention into a trustworthy plan, not as generic financial optimization.

## Friction we're addressing
The onboarding choice currently behaves more like explanatory copy than plan intent. It is stored locally, Summary only compares it with independently defined category totals, and the domain model still invents `givingPercent` and `savingPercent` from the remainder. Meanwhile, the forecast engine already distinguishes scheduled/fixed evidence from variable projections, but no allocator turns those receipts into automatically maintained category budgets. Account additions and removals also have no plan-reconciliation contract even though each account changes the available income, commitments, transfers, duplicates, and category history.

## System alignment
Constraint posture: `Bend the system`

The current target and category persistence constraints block the promised job, so the allocator must replace parts of the model while preserving the existing category-first product grammar.

Current system facts:
- Existing surface: first-time onboarding captures the living percentage; Summary shows category rows and aggregate totals; Category Detail and Category Settings own local category truth and maintenance.
- Existing user flow: `welcome -> living target -> connect accounts -> setup`. Data-dependent allocation must remain downstream of a real account connection and fresh transaction history. Later account additions happen from Accounts and must re-enter the same reconciliation pipeline.
- Existing domain/data model: `IncomePlanTarget` stores `livingPercent`, inferred `givingPercent`, inferred `savingPercent`, and a template id in AsyncStorage. Category definitions are partly fixture-backed; connected categories are assembled from fixed definitions, forecast settings, transaction matches, and custom ids.
- Existing technical affordances: income-pattern assessment; per-category scheduled, paced, hybrid, and manual forecast modes; fixed-spend inference; variable projections and ranges; transaction match confidence; money-meaning classification; Supabase-authenticated persistence and RLS patterns.
- Existing UX/copy conventions: category-first language, evidence before advice, one useful next step, plain tradeoffs, no shame, visible receipts, and deliberate user confirmation before plan mutations.

Constraints to preserve:
- The living percentage defines only the resource available to monthly budgets. The remainder has no inferred purpose.
- Fixed commitments reserve capacity before flexible recommendations.
- Weak, stale, missing, or ambiguous data cannot produce strong allocations.
- Cash inflow is not automatically planning income. Asset proceeds, transfers, refunds, reimbursements, gifts, bonuses, loan proceeds, and unknown deposits cannot expand ordinary monthly budgets without an eligible sustained pattern or explicit user intent.
- User-set amounts are durable overrides and are never silently overwritten.
- Each recommendation records its source, confidence, and explanation.
- The system may leave capacity unassigned; it must not force every target dollar into a category.
- The normal path does not require plan review. Explanations and full-plan inspection are available on demand.
- Automatic plan changes are never secret. Every promoted change leaves an in-product receipt; material changes receive a prominent notice with review and reversal.
- Adding, removing, relinking, or materially resyncing an account recomputes the plan from the new evidence set.
- Account changes must not silently erase user overrides or double-count transfers and duplicate transactions.
- Category Detail remains the place to understand a category; Summary remains the place to understand the whole month.
- Raw financial details and exact amounts are not analytics payloads.

Constraints we must challenge:
- Replace the three-way `IncomePlanTarget` with living-target-only intent.
- Move the active living target from device-only onboarding state to account-backed plan data while keeping onboarding resumable.
- Introduce a first-class monthly living plan and allocation receipts instead of treating independent `budgetCents` values as a coherent plan.
- Separate system recommendations, automatically active plan values, and user overrides even when no approval screen is shown.

Design implication:
The allocator should be deterministic, receipt-driven, and autonomous within confidence guardrails. It should consume the complete included-account evidence set; create categories and budgets after onboarding; recompute when that set changes; preserve overrides; and decline or hold values when evidence does not support a safe change. UI should show ready-to-use budgets by default, announce every active-plan change without requiring approval, and reveal deeper reasoning when requested or when the system genuinely cannot proceed safely.

## Aspirational design challenge
How might we help Maya have trustworthy category budgets created and maintained automatically from her chosen living-income share and connected accounts, while preserving fixed commitments, user control, explainability on demand, and complete neutrality about the remainder?

## Out of scope
- Assigning the non-living remainder to savings, giving, debt, investing, or transfers.
- Opaque AI allocation or conversational personality around recommendations.
- Automatic bank transfers or financial advice.
- Multi-user negotiation and approval workflows.
- Silently rewriting user overrides.
- Treating missing income as zero or inventing precision from sparse history.

## Decision from Phase 0 review
Kwilt creates categories and budgets automatically after account onboarding. Users do not review or manage a plan unless they choose to. Every later account addition, removal, relink, or material sync changes the evidence set and triggers plan reconciliation.

## Open question
Which allocator outcomes are serious enough to interrupt Maya instead of quietly updating the plan and leaving an on-demand receipt?
