# Learning Release: Transparent Automatic Living Plan

## Concept To Build
After the user chooses a living target and connects accounts, Kwilt creates and maintains category budgets automatically from trustworthy income, fixed-cost, override, and spending-pattern evidence; every active change is visible and reversible without requiring plan approval.

## Capability Delta

Today, the user cannot:

- have onboarding create a target-backed category plan
- add an account and receive a reconciled plan
- distinguish generated amounts, fixed commitments, and user overrides
- see or reverse a system-driven budget change
- rely on safe behavior when income is irregular, missing, or stale

After this release, the user can:

- choose a living percentage, connect accounts, and reach Summary with automatically generated categories and budgets
- receive fixed-first allocations that fit the supported living target when possible
- have later account syncs recompute a candidate and automatically promote trustworthy changes
- see one bundled notice for every promoted plan version
- inspect the changed categories and the evidence behind them
- undo the latest safely reversible material promotion
- set a category amount deliberately and keep that override across later plan versions
- encounter honest partial, held, or blocked states when the evidence cannot support a complete plan

Still intentionally not supported:

- assigning the non-living remainder
- a global plan builder or approval step
- LLM-generated dollar amounts
- automatic bank transfers or advice
- push notifications
- multi-user plan negotiation
- multiple currencies
- automatic promotion from uncalibrated challenger models

## User Experience

### Initial happy path

1. The user chooses a monthly living target in onboarding.
2. The user connects one or more accounts.
3. Kwilt completes the first transaction sync and normalizes the included evidence set.
4. The allocator creates a candidate using the living target, resource receipt, fixed commitments, overrides, and supported variable history.
5. If the candidate passes promotion rules, Kwilt atomically persists categories, active plans, allocation components, and the initial receipt.
6. Onboarding says `Your budgets are ready` and opens Summary. It does not show an allocation review.
7. Summary shows the generated category meters using the active plan version.
8. Category Detail shows one compact source line such as `Fixed bill`, `From recent spending`, or `Set by you`.

### Later account addition

1. The user adds another account from Accounts.
2. Sync backfills transactions and rebuilds the complete canonical evidence set.
3. Transfers and duplicates are normalized before allocation.
4. The shadow planner creates a candidate and compares it with the active plan.
5. A trustworthy candidate promotes automatically.
6. Summary shows one bundled `Plan updated` notice, such as `A new account changed three monthly budgets.`
7. `See what changed` opens a focused receipt with before/after values, cause, and category explanations.
8. If the change is material and safely reversible, the receipt offers `Undo`.

### Non-ideal paths

- Missing or stale income: preserve the last trustworthy plan; never calculate from zero.
- Sparse irregular income during first setup: create supported category structure, allocate only supported amounts, and ask one monthly-resource question only when no coherent target-backed plan is possible.
- Stock sale, brokerage withdrawal, bonus, gift, inheritance, loan proceeds, or other one-time inflow: update cash evidence but do not expand the planning-income basis or next month's budgets.
- Fixed commitments plus overrides exceed the target: preserve them, show the over-target amount, and do not shrink fixed costs.
- Account removal invalidates material evidence: hold the last trustworthy plan until removal and transfer effects are resolved.
- Sync or write failure: keep the prior active version and state that the plan could not refresh.
- Low-confidence category: leave capacity unassigned or keep the category exposure-only rather than inventing a precise budget.

## Existing Product Relationship

This release enhances existing surfaces rather than creating a planner destination:

- Onboarding owns the living target and initial account connection.
- Accounts owns adding, removing, relinking, including, and excluding evidence sources.
- Summary owns the current active plan and one current plan notice.
- Category Detail owns category reality and its compact allocation source.
- Category Settings owns deliberate overrides.
- Transactions owns corrections that can change future allocator evidence.

The allocator becomes a domain and persistence capability consumed by these surfaces. It does not replace the existing category-first navigation model.

## Buildable Slice

### Must be real

#### Product data
- Replace `IncomePlanTarget` with a living-target-only model and migrate compatible local onboarding state.
- Persist the active living target in account-backed storage.
- Persist categories and active category plans as product data rather than fixture-derived production truth.
- Persist plan versions, allocation components, user overrides, promotion receipts, visibility state, and reversal lineage.
- Persist source-level inflow profiles separately from transaction money meaning, including planning role, confidence, cadence/range evidence, provenance, and explicit user resource-basis choice.
- Apply owner RLS and preserve the current household-read posture without adding shared writes.

#### Pure allocation system
- Build a deterministic projector whose inputs include normalized accounts, transactions, money meanings, resource-eligibility receipts, category assignments, fixed-event receipts, variable-history receipts, existing categories, overrides, target intent, period, sync state, and allocator version.
- Produce category identity suggestions, fixed and flexible components, resource basis, target amount, unassigned capacity, over-target state, confidence, candidate hash, and human-readable receipt facts.
- Make identical inputs idempotent.
- Preserve fixed commitments and overrides as hard constraints.
- Support stable planning income, established irregular planning income, sparse irregular income, missing/changed income, asset proceeds, one-time inflows, fixed-over-target, mixed categories, transfers, refunds, duplicates, sparse categories, and nonmonthly commitments.
- Use deterministic code for numeric decisions; AI-assisted classification is not required.

#### Inflow and resource classifier
- Separate transaction cashflow meaning from source-level planning eligibility.
- Normalize pending/settled rows and provider duplicates before classification.
- Pair same-owner cross-account transfers before income aggregation.
- Match refund-like credits to prior outflows when evidence supports it.
- Build stable source clusters from account provenance, provider category/confidence, normalized counterpart/description, cadence, date windows, amount distribution, and completed-period history.
- Detect off-cycle and amount outliers from otherwise recurring sources so bonuses do not alter the recurring basis.
- Classify brokerage/investment proceeds and withdrawals as asset proceeds even when cash lands in checking.
- Default conflicting or weak evidence to unknown/ineligible.
- Let user corrections and remembered source rules override inference and feed future recomputation.
- Keep medium/low-confidence resource roles in shadow; only high-confidence deterministic or user-confirmed roles may change active budgets.

#### Promotion and triggers
- Run initial allocation after the first sufficiently complete account sync.
- Recompute after account scope, relevant sync evidence, target, override, category correction, period, or allocator-version changes.
- Suppress non-material canonicalization events as plan triggers.
- Compare candidate with active plan and classify the result as no-op, routine, material, or blocked.
- Persist promotion, active version, and receipt atomically.
- Hold the prior active plan when promotion rules fail.
- Reverse the latest safely reversible material promotion without mutating raw evidence.

#### User-visible surfaces
- Replace the final onboarding setup state with `Your budgets are ready` when initial promotion succeeds.
- Add one Summary plan notice that supports routine, material, blocked, seen, and refresh-failed states.
- Add a focused `See what changed` receipt surface with bundled changes and optional reversal.
- Add one compact allocation source line to Category Detail.
- Make Category Settings amount changes durable overrides that survive recomputation.
- Show honest first-setup blocking copy when no resource basis exists.
- Keep resource classifier types out of default Summary/category UI; expose only a compact resource-basis sentence, transaction-level meaning when inspected, and one focused unresolved-inflow question when materially necessary.

#### Verification fixtures and evidence
- Add pure tests before allocator implementation.
- Include deterministic fixtures for one account, second-account backfill, stable payroll, variable commission, sparse income, missing income, stock liquidation into checking, brokerage withdrawal, repeated asset withdrawals, paired internal transfer, unmatched transfer, payroll bonus outlier, gift/inheritance, loan proceeds, matched refund, unmatched reimbursement, conflicting provider category, weak unknown deposit, user-corrected source rule, fixed-over-target, duplicates, mixed utilities, annual commitment, sparse bursty category, override preservation, stale sync, category merge, and reversal.
- Add a TestFlight proof script that starts at onboarding, reaches generated Summary budgets, adds another account, inspects the notice, verifies Housing remains fixed, changes one amount, resyncs, and proves the override survives.

### Can be thin or temporary

- Limit generated category identity to the existing canonical Kwilt ontology plus `Other spending` rather than solving open-ended category invention.
- Trigger recomputation from foreground sync/account actions and period refresh; background webhook scheduling can follow after the core path is proven.
- Show only the latest unread plan notice and latest material reversal in the UI while retaining full receipt history in storage.
- Use deterministic merchant/provider-category heuristics already available in the app; no new AI classification service is needed.
- Support owner writes and current household reads only.
- Use one configured policy version for provisional materiality thresholds.
- Keep preview mode on explicit fixtures while routing it through the same pure allocator.

### Intentionally excluded

- A global plan tab, spreadsheet allocation view, or recurring review queue.
- Push, email, or SMS plan-change notifications.
- Per-account budgets or separate account plans.
- Automatic category splitting for every merchant.
- Shared household editing and conflict resolution.
- Forecast-model promotion automation.
- Savings-runway switching beyond holding the prior plan and asking the resource-basis question.
- Destructive removal of legacy ids or fallback paths before the new system proves stable.

## Release Channel

`TestFlight build`

Start with Andrew-only TestFlight use on a dedicated test or Sandbox-backed account set, then repeat with a controlled real-history account set only after the fixture and Sandbox proof passes.

Why TestFlight:

- Account Link, transaction backfill, relaunch persistence, and repeated sync must be tested in an installed app.
- The learning depends on adding another account and observing a real plan-version change.
- Simulator-only proof cannot establish device persistence, TestFlight configuration, account reconnect behavior, or realistic usage over multiple days.
- Production-default exposure is too risky before automatic mutations and reversal have real evidence.

## Brand-Goodwill Guardrails

- Gate the learning release to Andrew/internal access; do not expose it to normal production users.
- Never label a candidate as active before the promotion transaction succeeds.
- Never show a successful-update notice if the write or receipt failed.
- Preserve the last trustworthy plan through stale sync, provider failure, or blocked candidates.
- Make every active change visible in product, with plain before/after facts.
- Keep copy descriptive and nonjudgmental; never say spending is bad or that the remainder should be saved.
- Do not send exact amounts, merchant names, transaction details, or account identifiers to analytics.
- Keep numeric decisions deterministic and inspectable.
- Do not imply that a budget plan moves money or guarantees affordability.

## Reversibility

- Use additive migrations; do not drop legacy ids, onboarding fields, or forecast settings in the learning release.
- Store active plan versions immutably and point to the current version rather than overwriting history.
- Undo creates a new active version derived from the prior plan; it does not delete receipts or raw evidence.
- Keep an internal kill switch that stops candidate promotion while preserving reads of the last active version.
- If category/plan reads fail, show the last trustworthy active snapshot with freshness/error language; do not rebuild from fake defaults.
- If the release is withdrawn, stop promotion, hide plan notices and source lines, and keep persisted versions available for migration or audit.
- Do not remove the existing preview/compatibility path until TestFlight proof and rollback rehearsal pass.

## Permanent Product Threshold

Promote this from internal learning release to accepted product capability only when:

- fixture, Sandbox, and controlled real-history runs produce idempotent plans
- adding a second account does not double-count transfers, duplicates, income, or spend
- fixed commitments and user overrides survive every tested recomputation
- established irregular-income fixtures and real-history cases produce stable, understandable resource receipts
- one-time asset and windfall inflows never inflate the ordinary planning basis without explicit intent
- inflow classification receipts are understandable and user corrections persist into later syncs
- users can understand every promoted change from the compact notice and focused receipt
- reversal restores the intended prior active values without corrupting later evidence
- no stale, failed, or blocked candidate overwrites the last trustworthy plan
- the allocator beats or materially improves on current independent category amounts in the evaluation harness
- the visible UI passes the reductive UI scorecard and real-device proof
- Andrew can use the system across at least two account changes and two period transitions without feeling compelled to manage the plan manually
