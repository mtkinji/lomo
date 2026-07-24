# Diverge: Automatic Living Plan Maintenance

## Expanded frame
Build an automatic, account-aware living-plan maintenance system that creates categories and budgets after onboarding, recomputes them as included accounts and spending patterns change, preserves overrides, exposes receipts on demand, and interrupts only for material unresolved states.

No project context primer exists, so the alternatives use the persona, JTBD, job-flow, brief, model-strategy, canonical-snapshot, and current-code evidence gathered in the frame.

## Axis of variation
How should Kwilt balance freshness against stability as evidence changes?

- immediate active-plan mutation
- period-based stability
- continuous shadow recomputation with confidence-gated promotion

## Shared evidence events
All alternatives receive the same normalized events. They differ in when those events change the active plan.

### Full recomputation triggers
- initial account sync after onboarding
- account added, removed, relinked, included, or excluded
- living target changed
- calendar period changed
- model or allocation-policy version changed
- user changed or removed an override

### Evidence recomputation triggers
- sync added, modified, or removed transactions that affect income, fixed commitments, category history, or money meaning
- a recurring event crossed the confidence threshold
- a previously stable pattern materially changed
- a transaction category or money meaning was corrected
- a transfer or duplicate relationship was created or removed
- enough completed history accumulated to improve a variable recommendation

### Events that should not independently mutate a plan
- a pending row settling without changing the canonical amount
- a transfer between included accounts
- duplicate provider rows
- stale or failed sync
- one low-confidence classification
- immaterial activity that does not change a category receipt or resource basis

## Alternative A: Continuous Reflow

### Sketch
Every trustworthy evidence event immediately rebuilds and activates the current plan. Account additions backfill history and replace the active category/budget set as soon as normalization finishes. Stable recurring income sets the target resource; irregular income uses a rolling completed-month estimate. Fixed costs reserve capacity first, and all remaining flexible categories are proportionally re-fit after each material change.

### Variable-income posture
Use a rolling statistic such as the trailing three- or six-month median as the current income basis. Recompute the resource whenever a completed month or materially new income pattern changes that statistic.

### Persona fit
Maya never has to review a plan and always sees the newest interpretation of her full account set.

### Design-challenge answer
Maximum automation and freshness, with receipts available after the fact.

### System-fit note
Requires durable categories/plans, a canonical snapshot projector, versioned receipts, transfer/deduplication truth, and reliable sync-triggered writes. It can reuse existing deterministic forecast evidence but has the largest mutation surface.

### Best when
- account data is complete and classification confidence is high
- spending and income patterns are stable
- users value immediate adaptation more than month-to-month continuity

### Fails when
- variable income or seasonal spending causes the plan to oscillate
- an account backfill makes historical evidence look like a current change
- a mistaken classifier instantly rewrites several category budgets
- the user cannot tell why a familiar budget moved

### Anti-pattern check
Failure risk: invisible automation becomes an opaque financial optimizer. Fixing it requires thresholds, version history, rollback, and promotion rules—at which point it begins to resemble Alternative C.

## Alternative B: Monthly Envelope Freeze

### Sketch
Kwilt builds one plan at onboarding and again at each monthly boundary. During the month, transaction sync updates spend reality but does not normally change budget amounts. New accounts and pattern changes are analyzed immediately but queued for the next plan, except for a newly discovered fixed commitment or an impossible-plan state that must be reflected now.

### Variable-income posture
Use completed-month history only. Stable recurring income uses expected income; irregular income uses a conservative completed-month range or lower historical band selected by deterministic policy. Current-month windfalls do not expand the plan.

### Persona fit
Maya gets calm, stable category numbers for the month and is protected from constant rebalancing.

### Design-challenge answer
Automation happens on a predictable cadence, so the plan feels dependable rather than reactive.

### System-fit note
Requires period-versioned plans and next-period candidates, but fewer mid-period writes. It fits the existing month-based Summary and budget cadence well.

### Best when
- users expect budgets to be monthly commitments
- income and category history are understandable from completed periods
- stability matters more than immediately incorporating every account change

### Fails when
- a newly added account materially changes the household story mid-month
- a fixed bill changes or appears after the monthly plan is frozen
- onboarding happens mid-period with partial evidence
- the plan stays visibly wrong until the next boundary

### Anti-pattern check
Passes the calm-UX test, but can fail truthfulness if "stable" becomes "stale." The fix requires explicit exception rules and partial mid-cycle promotion, again moving toward Alternative C.

## Alternative C: Versioned Shadow Planner

### Sketch
Every relevant event recomputes a candidate plan from the complete included-account evidence set, but the active plan is a separately versioned artifact. Kwilt automatically promotes a candidate only when its resource basis, fixed-cost evidence, category identity, and change magnitude satisfy deterministic confidence and materiality rules. Safe changes apply without approval but are never secret: every promotion stores and surfaces a before/after receipt. Unsafe or unresolved candidates preserve the active values, leave capacity unassigned, or ask one focused question. Every promotion can be rolled back.

### Variable-income posture
Route through explicit resource receipts:

- `stable_income`: use expected recurring income when sync is fresh and confidence is earned
- `irregular_history`: use a calibrated completed-month income range and a conservative deterministic planning basis
- `confirmed_only`: when history is sparse, use only confirmed deposits without pretending they are recurring
- `missing_or_changed`: hold the prior active plan and ask only when no trustworthy basis can support it

The living percentage always applies to the selected resource basis. It never assigns the remainder.

### Persona fit
Maya receives automatic setup and maintenance without routine plan review, while familiar budgets remain stable unless new evidence genuinely earns a change.

### Design-challenge answer
The system absorbs complexity in the background, but autonomy is bounded by evidence and every active value remains explainable.

### System-fit note
Best fit with the documented champion/challenger model lifecycle, cached receipts, canonical snapshot projector, account-backed category/plan tables, and category-first UI. It has more domain machinery than Alternative B but less user-visible machinery than either alternative.

### Best when
- accounts arrive over time and each changes the evidence set
- some categories are fixed, some variable, and some unforecastable
- income basis can move between stable, irregular, and unresolved states
- user overrides and reversibility are non-negotiable

### Fails when
- promotion rules are poorly calibrated and hold too many useful changes
- the distinction between candidate and active plan leaks into normal UI
- recomputation is not idempotent or account backfills create duplicate evidence
- version history exists technically but cannot explain changes plainly

### Anti-pattern check
Pass if the candidate/active distinction stays internal, normal screens show one coherent plan, every active change is visibly acknowledged, and only a material unresolved state asks for a decision. Fail if it creates a secret allocator, inbox, approval queue, or permanent planning dashboard.

## Visibility contract for the Versioned Shadow Planner

The word `shadow` describes candidate computation, not hidden active-plan mutation.

- Candidate recomputation is internal because no user-facing value changed.
- Every promoted active-plan change creates a durable before/after receipt with trigger, evidence, model version, affected categories, and whether an override constrained the result.
- Routine changes appear as one compact in-app `Plan updated` notice and remain available from the affected category or Summary.
- Multiple small changes from one sync or account backfill are bundled into one notice rather than producing notification spam.
- Material changes receive a prominent Summary notice with `See what changed` and `Undo` or the safest equivalent reversal.
- Impossible or unresolved states do not masquerade as successful updates. They preserve trustworthy prior values where possible and ask one focused question.
- Push notifications are not required for the first release; in-product visibility is required.
- A plan-change receipt is not an approval task. The user can ignore it and keep using the current plan.

## Complicating edge cases

| Edge case | Required invariant | Alternative A | Alternative B | Alternative C |
|---|---|---|---|---|
| Fixed commitments exceed target | Preserve fixed truth; show the plan is impossible; never cut housing to hide it | Immediate interrupt and over-target plan | Mid-cycle exception to frozen plan | Candidate blocked; active plan held or fixed-first over-target state promoted with one focused explanation |
| Fixed costs consume nearly all capacity | Do not create false flexible precision | Refit flexible categories toward zero | Next monthly plan sharply reduces flexible envelopes | Promote only supported flexible floors; leave remaining categories unassigned/exposure-only |
| Variable income with long history | Use a labeled deterministic basis, not a current-month guess | Rolling median changes active plan frequently | Conservative completed-month basis for the full period | Calibrated resource receipt; promote only material, confident basis changes |
| Variable income with sparse history | Never treat missing evidence as zero or stable income | Confirmed deposits drive a volatile plan | Requires a fallback amount or waits for next period | Create category structure; use confirmed-only basis if sufficient, otherwise ask one focused resource question |
| One-time windfall | Do not expand ordinary budgets automatically | High misallocation risk unless excluded | Ignored until history proves recurrence | Classified as non-recurring; no resource-basis promotion |
| Stock sale or brokerage withdrawal | Treat as asset proceeds, not ordinary planning income, unless the user explicitly chooses withdrawals as the resource basis | High risk of inflating the next plan | Excluded from completed-month planning income | Evidence may recompute, but resource candidate remains unchanged without explicit intent |
| Bonus, gift, inheritance, or loan proceeds | Do not let a one-time cash event redefine consistent income | High misallocation risk | Excluded from recurring basis | Classified as non-planning inflow; may increase cash reality but not monthly budget capacity |
| New account with historical backfill | Recompute from canonical deduplicated history, not append totals | Immediate full reflow | Analyze now, apply next period except fixed truth | New candidate version; promote only after transfer/deduplication and confidence checks |
| Account removed or disconnected | Preserve last known truth with freshness; do not fabricate deletion | Immediate contraction risk | Hold until next period unless evidence becomes invalid | Mark evidence unavailable; hold active plan until removal is confirmed/materially unresolved |
| Transfers across included accounts | Exclude from income and spend | Must normalize before every reflow | Must normalize before monthly build | Projector prerequisite; candidate cannot promote while transfer ambiguity is material |
| Refunds and reimbursements | Reduce the relevant category or stay uncounted; do not inflate income | Immediate category movement | Spend reality changes, next plan uses completed evidence | Money-meaning receipt updates candidate and current meter separately |
| Pending/settled duplicates | Count exposure once | High churn risk | Low budget-change risk | Suppressed as non-trigger after canonicalization |
| Quarterly or annual fixed bill | Represent known commitment without implying savings intent | Allocate in due month or continuously reflow | Decide at period build | Explicit event receipt; convergence must choose due-month versus monthly accrual policy |
| Mixed category such as utilities | Preserve fixed baseline and variable range separately | Refit combined amount | Freeze combined monthly amount | Allocation contains fixed and flexible components with one user-facing category |
| Sparse or bursty category | Refuse a point estimate | Likely unstable fallback | Generic monthly fallback | Exposure-only receipt or unassigned capacity until evidence improves |
| User overrides exceed target | Never overwrite; show consequence | Refit every non-overridden category immediately | Preserve through period and flag next plan | Override is a hard constraint; candidate becomes over-target and may trigger one focused exception |
| Category correction or merge | Recompute history idempotently; keep provenance | Immediate rewrite | Next monthly build | Candidate version records identity change and preserves compatible overrides |
| Stale sync or provider outage | No strong new plan claims | Hold despite event-driven posture | Frozen plan naturally holds | Candidate cannot promote; active plan carries freshness state |
| Target changes mid-month | User intent is authoritative | Immediate full reflow | Exception to monthly freeze or defer by choice | Immediate candidate; promote deterministic consequences while preserving overrides |

## Divergence takeaway
Alternative A maximizes freshness but creates plan churn. Alternative B maximizes stability but can ignore the very account changes the user says modify the story. Alternative C treats recomputation and activation as separate decisions, which best supports automatic maintenance, variable income, account evolution, and trust without forcing users into plan review.

Phase 3 should test whether Alternative C can be reduced enough that users experience only ready budgets, occasional focused exceptions, and optional receipts—not a visible planning system.
