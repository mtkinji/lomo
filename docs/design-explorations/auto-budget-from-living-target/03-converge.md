# Converge: Transparent Versioned Shadow Planner

## Qualitative scoring

| Alternative | Persona fit | Automatic setup | Account evolution | Variable-income resilience | Trust and reversibility | System alignment | Verdict |
|---|---|---|---|---|---|---|---|
| A: Continuous Reflow | Medium | High | High | Low | Low-medium | Medium | Reject |
| B: Monthly Envelope Freeze | Medium-high | High | Low-medium | Medium | Medium-high | High | Reject as primary model |
| C: Versioned Shadow Planner | High | High | High | High | High | High | Choose |

Alternative A changes active values too readily. Alternative B keeps values calm by allowing the story to become stale. Alternative C separates evidence recomputation from active-plan promotion, which supports automatic maintenance without secret or unstable mutations.

## Chosen direction
Choose the **Transparent Versioned Shadow Planner**.

`Shadow` applies only to candidate computation. The active plan is never changed secretly. Kwilt continuously projects a candidate from the complete included-account evidence set, promotes only candidates that satisfy deterministic trust rules, bundles each promotion into one visible change receipt, and preserves prior values when a safe promotion is not possible.

The user experiences:

- categories and budgets ready after onboarding and account sync
- familiar values that change only when evidence earns the change
- one compact `Plan updated` notice after a promoted change
- a stronger notice only when the change is material
- one focused question only when Kwilt cannot maintain a coherent plan automatically
- optional category receipts and change history, not a required planning workflow

## Capability delta

### Today, the user cannot
- have the living target generate category identities and amounts
- trust that category totals fit the living target
- add an account and have the plan reconcile to the expanded evidence set
- distinguish system-generated amounts from deliberate overrides
- see why an amount changed or return to the prior plan
- rely on a coherent plan when income is variable, missing, or changed

### After this capability ships, the user can
- finish account onboarding and receive an automatically active set of household-meaningful categories and budgets
- add, remove, relink, include, or exclude an account and receive a reconciled plan after sync
- keep fixed commitments intact while flexible allocations adapt to the remaining capacity
- keep every deliberate override across future recomputations
- see every active-plan change without having to approve it
- inspect why a category amount exists or changed
- undo a material promoted change
- receive one focused exception when no trustworthy plan can be maintained

### Still intentionally not supported
- assigning the non-living remainder to savings, giving, debt, investing, or transfers
- live LLM-generated dollar amounts
- silent category or budget changes
- a spreadsheet-style planning dashboard
- routine approval queues
- automatic bank transfers or financial advice
- multi-user household negotiation

## Plan objects and invariants

The system needs four distinct concepts:

1. `LivingTargetIntent` - the active living percentage and its provenance; no inferred remainder fields.
2. `AllocationCandidate` - a pure projection from a versioned evidence set and allocator policy.
3. `MonthlyLivingPlan` - the active, account-backed plan version used by Summary, Category Detail, widgets, and app controls.
4. `PlanChangeReceipt` - the trigger, before/after values, evidence receipts, confidence, affected categories, override constraints, and reversal link for one promotion.

Invariants:

- Same normalized evidence, target, overrides, period, and allocator version produce the same candidate.
- Every candidate and active plan carries an evidence-set hash and allocator version.
- The target amount equals the selected resource basis multiplied by the living percentage.
- The non-living remainder has no allocation or semantic label.
- Fixed commitments and user overrides are hard constraints.
- Flexible allocations consume only capacity left after fixed commitments and overrides.
- The allocator may leave target capacity unassigned.
- A category may contain fixed and flexible components while remaining one user-facing category.
- Transfers, duplicate rows, excluded activity, and non-income credits do not inflate the resource or spend basis.
- An inflow affects the planning resource only when it has an eligible resource receipt; direction alone is never sufficient.
- Every active plan version has exactly one promotion receipt.
- A failed or stale recomputation cannot erase the last trustworthy plan.

## Trigger model

### Recompute a candidate
Recompute after:

- initial successful account sync after onboarding
- account add, remove, relink, include, or exclude
- a sync changes canonical income, fixed commitments, category history, transaction meaning, or assignment evidence
- living target change
- user override creation, edit, or removal
- category correction, merge, or archive
- period rollover
- allocator policy or model version change
- a pattern crosses a confidence threshold or enters a `changed` state

Recomputation reads the complete normalized evidence set. It never appends a new account's totals onto an already aggregated plan.

### Suppress as a plan trigger
Do not independently trigger an active-plan change for:

- pending-to-settled replacement with no canonical amount change
- transfers between included accounts
- provider duplicates
- stale or failed sync
- a single low-confidence label
- a transaction that changes current spend but not plan evidence
- a non-planning inflow that changes cash reality but not the eligible resource basis
- a candidate whose effective plan values are unchanged

## Promotion contract

A candidate may promote automatically only when:

1. the included-account evidence set is normalized and fresh enough for the claims it makes
2. transfer and duplicate ambiguity is below the materiality threshold
3. the resource receipt is supported for the chosen resource mode
4. fixed commitments are supported by event receipts or explicit user confirmation
5. user overrides are preserved exactly
6. category identity changes have stable mapping and do not orphan overrides or transaction rules
7. each changed flexible allocation has sufficient history or remains explicitly exposure-only
8. the candidate passes target, provenance, nonnegative-value, and idempotency invariants
9. the active version and receipt can be written atomically and reversed

If these rules fail, the candidate remains internal. Kwilt holds the last trustworthy active plan, leaves unsupported new capacity unassigned, or enters a focused exception state.

## Change visibility and materiality

### Initial plan
Initial generation is not framed as a change review. Onboarding ends with `Your budgets are ready` and continues to Summary. The generated plan and its receipts are available to inspect, but no approval screen is required.

### Routine promoted change
A routine change:

- keeps the same resource mode
- does not add, archive, or merge a user-facing category
- does not alter a fixed component or override
- does not move the living target amount by 5% or more
- changes no flexible category by both at least 20% and at least $25, and by less than $100 absolute
- creates no over-target or missing-resource state

Routine changes apply automatically and produce one bundled `Plan updated` notice in Summary. The notice persists until seen and links to the change receipt. It is informative, not an approval task.

### Material promoted change
A change is material when any of these are true:

- account scope changed
- resource mode changed
- living target amount moved by at least 5%
- a category was created, archived, or merged
- a fixed component changed
- a flexible category moved by at least 20% and $25, or by at least $100 absolute
- unassigned capacity changed materially
- the plan newly became or ceased to be over target

Material changes apply automatically only if the promotion contract passes. Summary shows a prominent but calm notice with `See what changed` and `Undo` when reversal is safe.

### Blocking or focused-exception state
Do not claim a coherent updated plan when:

- no trustworthy resource basis exists for initial allocation
- trusted fixed commitments plus user overrides exceed the living target
- account removal or disconnection removes material evidence and no safe prior basis remains
- transfer, duplication, or category-identity ambiguity could materially change the plan
- a required write is not atomic or durable

Preserve the last trustworthy values when possible. Ask one concrete question or state the specific conflict. Do not create a generic review inbox.

Provisional copy direction:

- `Plan updated` — `A new account changed three monthly budgets.`
- `Fixed costs changed` — `Housing increased by $120. Kwilt adjusted flexible budgets to keep the same living target.`
- `Target needs attention` — `Fixed costs and amounts you set are $180 over this target.`
- `Income basis needed` — `Kwilt found irregular income but not enough history to set monthly amounts. What monthly income should it plan around?`

## Variable-income policy

Resource modes are explicit and receipt-backed:

### Resource-eligibility gate
Before stable or irregular income can influence a plan, each inflow cluster is classified by its role in ordinary monthly living:

- `recurring_planning_income` - stable payroll, benefits, recurring rent, or another dependable source with earned cadence and amount confidence
- `irregular_planning_income` - commissions, gig income, business distributions, or another recurring-but-variable source with enough completed-period evidence
- `asset_proceeds` - stock sale, brokerage withdrawal, savings withdrawal, or liquidation event
- `one_time_inflow` - bonus, gift, inheritance, windfall, or loan proceeds
- `category_credit` - refund or reimbursement that reduces category spend
- `internal_transfer` - movement between owned accounts
- `unknown_inflow` - insufficient evidence

Only the first two classes are eligible to set the ordinary living-plan resource automatically. The other classes may change cashflow or current balances, but they do not expand monthly category budgets.

Resource eligibility rules:

- A single large deposit never becomes planning income because of size.
- A strong current month does not raise the next plan unless completed-period evidence changes the established planning-income receipt.
- Asset withdrawals remain ineligible even when repeated unless the user explicitly chooses them as a living resource. Repetition alone does not turn liquidation into ordinary income.
- Bonuses and one-time inflows remain outside the recurring basis. They can remain unassigned without Kwilt recommending a purpose.
- Unknown inflows are excluded from resource math until classification is trustworthy or corrected.
- Corrections and remembered money-meaning rules can change future eligibility, but any resulting active-plan change still follows normal promotion and visibility rules.

### Inflow classification pipeline

Classification has two independent outputs:

1. `cashflowMeaning` - how the transaction affects current cashflow and category truth: `income`, `category_credit`, `internal_transfer`, `not_counted`, or `unknown`.
2. `planningRole` - whether the source may govern ordinary future budgets: `recurring_planning_income`, `irregular_planning_income`, `asset_proceeds`, `one_time_inflow`, or `ineligible_or_unknown`.

`cashflowMeaning: income` is not sufficient for planning eligibility.

Evidence is evaluated in precedence order:

1. User-confirmed correction or remembered source rule.
2. Canonical transaction relationships: pending/settled replacement, duplicate suppression, paired transfer across included accounts, and matched refund to a prior outflow.
3. Account and provider context: source and destination account type/subtype, institution, provider personal-finance category and confidence, direction, and connection ownership.
4. Counterparty and description evidence: normalized employer, gig platform, brokerage, loan provider, merchant, benefit source, transfer markers, and statement counterpart.
5. Pattern evidence: active completed periods, cadence, date window, amount distribution, volatility, and whether the source behaves like a stable or irregular repeated resource.
6. Outlier evidence: a deposit from a normally recurring source may still be a bonus or correction when its amount/date falls outside the earned source profile.

Classifier precedence:

- Confirmed user meaning and source rules win unless the underlying transaction identity changes.
- A high-confidence paired transfer is never planning income.
- A refund matched to prior spend is a category credit, not planning income.
- Brokerage/investment-source evidence produces `asset_proceeds` even when the destination is checking.
- A paycheck-like source must repeat across completed periods before it becomes `recurring_planning_income`.
- A commission/gig source must repeat across completed periods and pass irregular-income calibration before it becomes `irregular_planning_income`.
- A single large or ambiguous inflow remains `one_time_inflow` or `ineligible_or_unknown`; amount never upgrades confidence by itself.
- Repeated asset withdrawals remain `asset_proceeds` until the user explicitly chooses asset drawdown as a resource basis.

Each source profile records:

- stable source key and account provenance
- cashflow meaning and planning role
- classification source: `provider`, `deterministic_rule`, `paired_evidence`, `user_confirmed`, or `user_rule`
- confidence and supporting evidence facts
- cadence, completed-period count, expected date window, and amount range when applicable
- first/last observed dates and last evaluated evidence-set hash
- explicit user resource-basis choice when one exists

Promotion eligibility:

- Only user-confirmed or high-confidence deterministic planning roles may affect the resource basis.
- Medium-confidence roles may run in shadow and appear in developer receipts, but cannot change active budgets.
- Low-confidence or conflicting evidence remains excluded from resource math.
- AI-assisted classification may suggest a role for evaluation, but it cannot make a numeric resource claim or promote a plan without deterministic or user-confirmed support.

Concrete examples:

| Transaction pattern | Likely cashflow meaning | Planning role | Plan effect |
|---|---|---|---|
| Payroll source repeats near the same dates for several completed months | income | recurring planning income | Eligible after cadence and amount confidence qualify |
| Commission platform repeats with variable amounts across enough completed months | income | irregular planning income | Eligible through the calibrated irregular-income basis |
| Brokerage sends a large ACH credit to checking after a stock sale | income or transfer-like cash inflow | asset proceeds | No automatic change to ordinary monthly budgets |
| Same amount leaves savings and enters checking within a narrow date window | internal transfer | ineligible | No resource or spend change |
| Merchant credit matches a prior purchase | category credit | ineligible | Reduces the relevant category's spend evidence |
| Employer sends an unusually large off-cycle deposit | income | one-time inflow until proven otherwise | Does not raise the recurring basis |
| Large deposit has weak provider category and no source history | unknown | ineligible or unknown | Excluded; no plan change |
| Brokerage withdrawal repeats monthly | income or asset inflow | asset proceeds | Still excluded until the user explicitly chooses asset drawdown |

### UI exposure contract for inflow types

The classifier taxonomy is primarily internal. Raw enum names never appear in normal Summary or category rows.

- Summary shows at most one resource-basis sentence when it helps explain the plan: `Based on regular monthly income` or `Based on variable income history`.
- A plan-change receipt names the concrete cause only when the resource basis changed: `Regular income changed` or `Kwilt now has enough variable-income history to update monthly budgets.`
- Transaction Detail may show a plain-language money meaning with its consequence when the user inspects or corrects an inflow.
- A material unresolved inflow may ask one concrete question. It does not open an income-management workflow.
- Users never have to classify every inflow for the allocator to remain safe; unknown inflows stay excluded.
- Internal confidence, source-profile ids, completed-period counts, and classifier/model names remain in developer receipts only.

User-facing transaction meanings:

| Internal result | User-facing label | Consequence copy |
|---|---|---|
| recurring planning income | Regular income | `Included when Kwilt sets monthly budgets.` |
| irregular planning income | Variable income | `Included using your completed-month income pattern.` |
| asset proceeds | Investment or reserve money | `Not included in ordinary monthly budgets.` |
| one-time inflow | One-time money | `Not included in ordinary monthly budgets.` |
| category credit | Refund or category credit | `Reduces spending in the matched category.` |
| internal transfer | Transfer | `Does not count as income or spending.` |
| ineligible or unknown | Needs meaning | `Not included in monthly budgets unless you choose otherwise.` |

If the user explicitly chooses repeated asset withdrawals as a resource basis, the UI says `Used for monthly living`; it does not relabel liquidation as regular income.

### Stable recurring income
- Use expected recurring income only when cadence, amount range, freshness, and backtested confidence qualify.
- A current-month windfall or replacement deposit does not increase the recurring basis automatically.

### Established irregular income
- Use the lower bound of a calibrated completed-month income range as the planning basis.
- Prefer 12 completed months; permit shorter 6- or 3-month windows only with downgraded confidence and measured rules.
- Re-evaluate at period rollover or when a material pattern change is confirmed, not after every deposit.
- Include only clusters already classified as `irregular_planning_income`; asset proceeds and one-time inflows never enter the range.

### Sparse irregular income
- Create category structure from supported spending evidence.
- Do not invent a target dollar amount from one deposit.
- If confirmed deposits and fixed commitments support only a partial plan, keep unsupported flexible capacity unassigned.
- If no coherent amount plan is possible, ask one focused monthly-resource question rather than opening a plan builder.

### Missing or changed income
- Never calculate the living target from zero.
- Hold the last trustworthy plan while freshness and replacement-income checks run.
- If the missing/changed state persists beyond its earned threshold, ask about the resource basis without claiming a life event.

## Fixed, flexible, and nonmonthly policy

Allocation order:

1. fixed commitments with known cadence and amount
2. user overrides
3. stable variable categories with calibrated history
4. lower-confidence exposure-only categories
5. unassigned target capacity

Mixed categories such as Utilities keep one user-facing category but record a fixed baseline and flexible component separately.

Known quarterly or annual living costs use a monthly accrual component only when the event cadence is trusted and the category supports rollover. The receipt names the future bill and monthly equivalent. Without trustworthy cadence or rollover support, the allocator treats the item as due-period exposure rather than pretending the household has accumulated the money.

If fixed commitments exceed the target, Kwilt preserves the fixed amounts and shows the conflict. It never cuts Housing or another fixed commitment to make the target appear satisfied.

## Category-generation policy

- Start from persisted Kwilt category ontology and user meaning, not provider taxonomy copied one-for-one.
- Use provider categories, merchants, recurring-event clusters, assignment history, and corrections as evidence.
- Generate the smallest useful category set; avoid fragmenting every merchant or rare purchase into a category.
- Prefer an existing compatible category before creating a new one.
- Sparse or bursty spending may remain `Other spending` or exposure-only until a stable household meaning emerges.
- Category merges and renames preserve transaction rules, receipts, and compatible overrides.

## Accepted trade-offs

- The domain model is more complex so the user-facing model can stay simple.
- Some useful candidates will be held when evidence is not strong enough.
- Irregular-income plans may intentionally use a lower resource basis than a strong month ultimately provides.
- Initial setup may require one resource question when account history cannot support a coherent target.
- Every promotion creates durable history even though most users may never open it.

## Rejected trade-offs

- Do not require plan approval after onboarding or routine changes.
- Do not silently mutate active values.
- Do not reduce fixed commitments to force target compliance.
- Do not distribute the entire target when evidence supports less.
- Do not treat current-month deposits as recurring income without earned evidence.
- Do not equate cash inflow, taxable income, or account-balance growth with planning income.
- Do not expose candidate-versus-active model machinery in normal UI.
- Do not add a permanent planner, confidence dashboard, allocator settings matrix, or notification center.

## Reductive design decisions

The smallest coherent visible system is:

1. Existing onboarding target step teaches what the number controls.
2. Existing setup completion becomes `Your budgets are ready` and routes to Summary.
3. Summary shows the active categories and budgets as it does today.
4. Summary shows at most one current plan notice: routine, material, or blocked.
5. `See what changed` opens one focused receipt surface, not a plan dashboard.
6. Category Detail has one compact source line such as `Fixed bill`, `From recent spending`, or `Set by you`; deeper evidence is revealed on demand.
7. Material safe changes offer reversal from the receipt.

Refuse to add:

- an onboarding allocation review
- a global plan tab
- persistent confidence badges on every row
- per-account budget views
- a feed of every shadow recomputation
- push notifications in the first release
- language that assigns the non-living remainder

## Activation path

### First activation
The first successful, sufficiently complete account sync after the user chooses a living target runs the allocator. On success, onboarding says `Your budgets are ready` and opens Summary. If evidence is insufficient, onboarding asks only the blocking resource or account question.

### Ongoing activation
Account and evidence events recompute candidates in the background. Promoted changes surface the next time Summary becomes active or refreshes. Material changes remain visible until seen; routine changes are bundled by allocation run.

### Organic adoption
Adoption is not opening a planner. It is continuing to use the generated category meters, leaving most amounts untouched, correcting the occasional wrong category or amount, and understanding a plan-change notice without seeking external explanation.

## System implications

- Replace inferred `givingPercent` and `savingPercent` with living-target-only intent.
- Persist account-backed target, categories, plans, plan versions, allocation components, overrides, and receipts.
- Build one pure allocation projector from canonical snapshot inputs.
- Recompute after normalized evidence events, not from UI renders.
- Write promotion, active plan, and receipt atomically.
- Make widgets, Summary, Category Detail, and app controls consume the same active plan version.
- Run new allocation models through shadow/backtest promotion before they can change product plans.
- Keep AI-assisted classification off the numeric decision path and require deterministic evidence for promotion.

## Bet
We're betting that Maya will trust and keep using automatically maintained budgets when fixed commitments and deliberate overrides stay stable, every active change is visibly explained, and only genuine exceptions ask for attention. If users still feel surprised or repeatedly undo changes, revisit by tightening promotion thresholds and moving more categories to period-stable or user-set behavior—not by adding a mandatory planning workflow.

## Success signal
In a real installed flow, Maya can:

1. choose a living target and connect accounts
2. reach Summary with useful categories and budgets without reviewing a plan
3. add another account and receive one understandable plan-update notice
4. see fixed Housing remain intact while supported flexible budgets adjust
5. inspect why one amount changed and undo a material promotion
6. keep a user-set amount across later syncs and plan versions
7. encounter variable, missing, stale, transfer, refund, sparse-history, and over-target states without false precision or a planning dashboard
