# Evaluate Learning: Transparent Automatic Living Plan

## Bet under evaluation
Maya will trust and keep using automatically maintained budgets when fixed commitments and deliberate overrides stay stable, exceptional inflows cannot distort the planning resource, every active change is visibly explained, and only genuine exceptions ask for attention.

## Learning questions

### Plan usefulness
1. Does initial account onboarding produce a small, household-meaningful category set without manual cleanup?
2. Do generated category amounts feel plausible enough to use immediately without an allocation review?
3. Do planned categories reconcile to the living target while allowing supported capacity to remain unassigned?
4. Does the plan remain useful after a second account changes the evidence story?

### Resource truth
5. Can the classifier distinguish cashflow meaning from planning eligibility consistently?
6. Do payroll, benefits, recurring rent, commission, and gig patterns become planning resources only after earning the required evidence?
7. Do stock liquidation, brokerage withdrawal, bonus, gift, inheritance, loan proceeds, refunds, reimbursements, transfers, and unknown deposits stay out of the ordinary planning basis?
8. Does a strong current month avoid inflating the next plan when the established resource pattern did not change?
9. Can a user correction or remembered source rule change future classification without corrupting raw transaction history?

### Allocation trust
10. Do fixed commitments remain intact across plan versions, including after account backfill?
11. Do flexible budgets absorb supported capacity changes without oscillating or pretending to be precise?
12. Do user overrides survive target changes, account changes, period rollover, and model-version changes?
13. Do fixed-over-target and override-over-target cases state the conflict instead of cutting protected values?
14. Are mixed and nonmonthly costs represented truthfully without implying money was accumulated when it was not?

### Change transparency
15. Can the user understand what changed and why from the compact notice and focused receipt?
16. Does bundling one allocation run into one notice prevent notification fatigue?
17. Does every active mutation have a durable before/after receipt?
18. Does reversal restore the intended prior values without deleting evidence or creating a false history?
19. Are routine updates informative without feeling like planning chores?

### Technical feasibility
20. Are candidate projection and promotion deterministic and idempotent?
21. Can account backfills, transfers, pending/settled replacements, and provider duplicates be canonicalized before allocation?
22. Can active plan, promotion receipt, notice state, and reversal lineage be written atomically under RLS?
23. Do Summary, Category Detail, Transactions, widgets, and app controls read the same active plan version?
24. Can the system hold the last trustworthy plan through stale sync, provider failure, blocked candidates, and relaunch?

## Evidence plan

### Layer 1: Pure deterministic fixture suite

Required before any automatic mutation reaches TestFlight:

- same input produces the same candidate hash and allocations
- repeated recomputation produces no duplicate version or notice
- adding a second account rebuilds from the canonical evidence set rather than appending totals
- paired transfers, pending/settled rows, and provider duplicates count once or not at all as appropriate
- fixed commitments and overrides never change unless their own evidence or user intent changes
- fixed-plus-overrides over target remains visibly over target
- unsupported capacity remains unassigned
- stale or failed sync cannot promote a candidate
- reversal creates a new version that restores prior effective values

Resource-classification fixtures:

| Fixture | Expected planning role | Must affect planning basis? |
|---|---|---|
| stable payroll across completed months | recurring planning income | yes, after confidence gate |
| recurring benefits | recurring planning income | yes, after confidence gate |
| repeated variable commission | irregular planning income | yes, through calibrated range |
| sparse gig deposit | ineligible/unknown or partial evidence | no strong basis |
| stock liquidation into checking | asset proceeds | no |
| one brokerage withdrawal | asset proceeds | no |
| repeated brokerage withdrawals | asset proceeds until explicit choice | no |
| employer bonus outlier | one-time inflow | no |
| gift or inheritance | one-time inflow | no |
| loan proceeds | one-time/ineligible inflow | no |
| paired owned-account transfer | internal transfer | no |
| unmatched transfer-like deposit | unknown/ineligible | no |
| matched refund | category credit | no; reduce category evidence |
| reimbursement with category evidence | category credit | no; reduce category evidence |
| ambiguous large deposit | unknown/ineligible | no |
| user-confirmed asset drawdown | explicit resource basis | yes, only after choice |

Allocation fixtures:

- fixed Housing plus variable Groceries, Restaurants, Gas, and Shopping
- mixed Utilities with fixed baseline and variable overage
- annual or quarterly commitment with and without trusted cadence/rollover
- sparse bursty Travel or Medical exposure
- category merge with assignment rules and override preservation
- target reduction below fixed commitments
- established irregular-income range with one unusually strong month
- missing expected income with fresh sync
- missing expected income with stale sync

### Layer 2: Historical replay and shadow evaluation

Run the allocator over completed fixture, Sandbox, and controlled real-history periods as if each prior period boundary were today.

Compare:

- generated target/resource basis against the eligible source receipts
- generated fixed components against actual recurring commitments
- generated variable amounts against subsequent completed-period spend ranges
- number and magnitude of candidate changes per period
- number of candidates held by confidence/materiality rules
- false resource promotions
- false fixed-cost changes
- user-override violations
- notice class that would have been produced

Baselines:

- current independent category amounts
- prior active plan unchanged
- trailing three-month category median
- trailing six-month category median
- fixed-only plan with all remaining capacity unassigned

The allocator does not need to minimize dollar error at the expense of trust. A conservative plan that leaves capacity unassigned can beat a more complete plan that misclassifies income or mutates fixed costs.

### Layer 3: Sandbox and simulator workflow proof

Scripted scenarios:

1. Complete onboarding with a living target and one Sandbox account.
2. Verify `Your budgets are ready` and the generated Summary rows.
3. Relaunch and prove the same active version persists.
4. Add a second account with a paired transfer and historical backfill.
5. Verify one plan notice, no double-counting, and one receipt.
6. Verify Housing remains fixed while supported flexible categories change.
7. Enter a deliberate category override, resync, and prove it survives.
8. Introduce a stock-liquidation deposit and prove the resource basis and budgets do not change.
9. Introduce a payroll bonus and prove it remains outside the recurring basis.
10. Trigger fixed-over-target and inspect the focused exception.
11. Promote and undo one material safe change.
12. Simulate stale sync and write failure; prove the last trustworthy plan remains active.

### Layer 4: Andrew-only TestFlight self-use

Use the installed app over at least:

- two account-scope changes
- two period transitions
- one material promoted change
- one deliberate override
- one exceptional inflow or synthetic equivalent
- one stale/error recovery

Capture:

- screenshots or recordings of initial success, routine notice, material receipt, blocked state, and reversal
- a short manual journal for each active change: `expected`, `understood`, `surprising`, `would undo`, and `felt like plan work`
- whether Summary and category numbers remained believable without opening the receipt
- whether the notice explained the change without developer data
- whether any account or transaction correction was required before the plan felt safe

## Instrumentation

### Privacy-safe product events

Allowed event metadata:

- allocator policy version
- trigger class: onboarding, account scope, sync evidence, target, override, category correction, period, model version
- outcome: no-op, routine promotion, material promotion, blocked, held, failed
- resource mode and classification confidence band
- changed-category count
- fixed/flexible/override component counts
- materiality reason codes
- exception code
- receipt created, notice shown, notice opened, reversal attempted, reversal completed
- run duration and atomic-write success/failure
- evidence freshness band and completed-period-count band

Never send to analytics:

- exact income, budget, transaction, or balance amounts
- merchant or source names
- transaction descriptions
- account ids, masks, institutions, or connection ids
- raw evidence facts
- category names created by the user
- receipt prose

Exact financial evidence remains inside the account-backed product records required to render receipts and support reversal. Developer logs use synthetic or redacted fixtures unless Andrew explicitly inspects his own controlled test data.

### Evaluation artifacts

- machine-readable fixture and replay report
- concise markdown calibration summary
- promotion/hold reason distribution
- receipt audit for every promoted fixture run
- TestFlight proof checklist
- manual self-use journal
- reductive UI scorecard and screenshots

## Supporting evidence

Evidence supports the bet when:

- all invariant fixtures pass
- no excluded inflow changes the planning resource
- no transfer or duplicate is double-counted
- fixed commitments and overrides survive every unrelated recomputation
- established irregular-income bases remain stable despite unusually strong individual months
- initial and account-change plans are understandable from their receipts
- material changes are visible and reversible
- routine notices do not create repeated plan-management behavior
- the same active version is rendered across all converted surfaces
- Andrew continues using generated budgets without repeatedly correcting or opening the plan system

## Disconfirming evidence

Any of these is a serious negative signal:

- stock, brokerage, bonus, gift, loan, transfer, refund, or unknown inflow expands ordinary budgets without explicit eligibility
- fixed Housing or another trusted commitment is reduced to satisfy the target
- a user override is overwritten or orphaned
- adding an account double-counts transfers, duplicates, income, or spend
- the same evidence produces different active plans
- plan values change repeatedly within a period without a material evidence change
- a change is active without a visible durable receipt
- a notice claims success after a failed or partial write
- reversal corrupts later evidence or silently deletes history
- the user needs developer details to understand a receipt
- routine notices make the user feel obligated to manage the plan
- too many unknown inflows trigger questions instead of remaining safely excluded

## Decision rules

### Stop before TestFlight
Do not ship an automatic-mutation build if any of these remain:

- nondeterministic or non-idempotent projector output
- any excluded-inflow resource promotion in the required fixtures
- any fixed-cost or override corruption
- any transfer/duplicate double count
- non-atomic promotion and receipt writes
- failed rollback rehearsal
- stale/failed sync can replace the active plan
- normal UI exposes candidate-versus-active machinery or requires plan approval

### Revise the learning release
Keep the capability internal and revise when:

- classifier uncertainty blocks too many initial plans
- useful changes are routinely held by thresholds
- material notices occur more often than the underlying household story changes
- irregular-income planning swings materially between completed periods without a true pattern change
- receipts are accurate but not understandable
- canonical category generation creates repeated cleanup work

Likely revisions:

- tighten or loosen individual promotion thresholds
- move unstable categories to exposure-only or period-stable behavior
- require more completed periods for resource eligibility
- improve deterministic source clustering or transfer/refund pairing
- simplify receipts and notice materiality
- reduce generated category count

### Proceed toward permanent product capability
Proceed only when:

- every critical fixture and atomicity invariant passes
- Sandbox and TestFlight flows complete without manual database repair
- excluded inflows remain excluded in fixture and controlled real-history evaluation
- second-account backfill produces one coherent version and notice
- fixed commitments and overrides remain stable across two account changes and two period transitions
- every promoted change is explainable and reversible when promised
- no blocked or failed candidate replaces the last trustworthy plan
- the UI passes every critical reductive UI category
- Andrew's journal shows the system remained useful without creating a plan-management habit

## Expected next action

If Phase 6 produces a build-ready spec with no unresolved trust boundary, implement in this order:

1. classifier and allocator fixtures
2. pure cashflow/resource classification
3. pure allocation candidate projector
4. version comparison, materiality, promotion, and reversal logic
5. additive account-backed schema and RLS
6. repositories and atomic promotion path
7. onboarding initial activation
8. Summary notice and focused receipt
9. Category Detail source and Category Settings override
10. Sandbox, simulator, TestFlight, and reductive UI proof

If the spec cannot make resource eligibility, atomic promotion, or canonical category identity precise enough to test, stop before implementation and resolve that design gap rather than shipping a partial automatic allocator.
