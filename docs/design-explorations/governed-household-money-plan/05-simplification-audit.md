# Simplification Audit: Governed Household Money Plan

## Audit standard

A reduction is accepted only when it does the same user job with fewer concepts, decisions, states, or maintenance tasks **without** weakening current-money truth, user precedence, plan stability, whole-plan consequences, or reversibility.

Restated in user voice:

> When I connect whatever accounts I have and choose what I can live on, give me a believable plan automatically, keep it stable, let me correct it in ordinary language, and make the effect of my changes obvious without teaching me your planning machinery.

This remains anchored to:

- `jtbd-carry-intentions-into-action`
- `jtbd-review-budget-reality-before-spending`
- `jtbd-trust-this-app-with-my-life`

## Accepted reductions

| Before audit | Simplified system | Why it is genuinely better |
| --- | --- | --- |
| Derive each new user's visible category inventory from whatever accounts and history happen to be connected first. | Create one compact, versioned broad starter template; use Plaid and local evidence to assign transactions and tune amounts, not invent the initial visible taxonomy. | Partial accounts no longer produce a permanently incomplete category set. The user learns one stable vocabulary and changes only exceptions. |
| Persist a separate `SemanticFamily` domain object between Plaid metadata and visible categories. | Keep a versioned provider-to-category mapping table as policy/configuration. A category can carry internal mapping tags without exposing or persisting a second taxonomy object. | Preserves inference while removing a parallel household ontology and its migration burden. |
| Treat transaction, plan-evidence, and plan-promotion as three clocks. | Expose two rhythms: live money updates now; the automatic plan updates at the next monthly boundary. Evidence, candidate computation, and promotion are stages inside the monthly plan pipeline, not separate clocks. | Matches the user's mental model and directly prevents variable income or a newly added account from churning current-month limits. |
| Permit routine and material automatic promotion at policy-defined cadences throughout the month. | Initial supported plans activate immediately; explicit user edits apply through one Save; automatic maintenance becomes next month's plan at the period boundary. | Removes a materiality/confirmation matrix and makes “when will my limits change?” answerable in one sentence. |
| Allow supported caps to leave ordinary target capacity `unassigned`. | Once a planning basis exists, allocate the entire living target across the category set. Blend household evidence with versioned starter weights and normalize the flexible remainder. | Every category gets the smart limit the user expected, totals reconcile, and lowering one category has an obvious destination elsewhere. |
| Persist evidence scopes, spending profiles, allocation candidates, consequence previews, decision lineage, and receipts as separate records by default. | Persist source evidence already needed for truth, user governance, planning basis, active immutable plan versions, and committed receipts. Compute profiles, candidates, and previews; cache them only for performance or persist a held next plan when needed. | Keeps auditability at committed boundaries without turning every intermediate calculation into product state. |
| Compose three global states for truth, assignment coverage, and plan readiness. | Show sync health and plan health. `Needs review` remains a transaction count/filter, not another global mode. | Removes state combinations users do not need to understand while retaining the actionable exception inventory. |
| Require a preview followed by a separate confirmation for every user-requested plan change. | Put the whole-plan consequence inline in the editor and use one explicit `Save`. Add a second confirmation only for destructive structural changes or unsafe loss of history. | The consequence remains visible before commitment without introducing confirmation ceremony. |
| Create a dedicated Automatic Plan settings concept and expose receipts broadly. | Put monthly basis and living target in Money Settings. Open plan history from the latest change or Settings. Keep assignment provenance contextual to Transaction Detail. | Avoids a planner destination and audit-log navigation becoming recurring user work. |
| Treat lumpy categories as monthly budgets with peak-month forecasts or a general rollover switch. | Give each category one governed `monthly` or `reserve` rhythm. Reserve carries availability and forecasts a specific optional need; monthly rollover remains a separate opt-in policy. | The monthly target stays contribution-based, event months do not inflate the stable contribution, and the user gets one plain model for birthdays, travel, repairs, and annual costs. |

## Simplifications rejected

| Proposed reduction | Decision | Reason |
| --- | --- | --- |
| Use Plaid's category as the stored user category. | Reject. | Provider evidence can change and cannot outrank household corrections. |
| Let system automation categorize or resize through a separate path. | Reject. | Two mutation paths would drift in precedence, receipts, and undo behavior. |
| Remove canonicalization and classify raw transaction rows directly. | Reject. | Pending/settled overlap, duplicates, transfers, and refunds would corrupt both current totals and recommendations. |
| Store only the latest assignment with no source. | Reject. | The system could not protect user corrections or explain why an assignment survived sync. Effective provenance can be compact, but it is required. |
| Change limits continuously as income or spending arrives. | Reject. | It destroys the stable monthly planning contract the user explicitly expects. |
| Update only the edited category and let totals drift. | Reject. | It hides the exact whole-plan consequence the user needs to govern the system. |
| Ask the user to approve every inferred category and monthly plan. | Reject. | It transfers system work back to the user and defeats automatic setup. |
| Remove plan versions and receipts entirely. | Reject. | Automatic monthly change would become silent and irrecoverable. Keep receipts compact and contextual instead. |

## Simplified operating model

### Live money

1. Sync and canonicalize connected activity.
2. Apply user rules and corrections before provider inference.
3. Assign every sufficiently supported ungoverned transaction into the stable category set.
4. Publish current actuals immediately; leave only weak conflicts in `Needs review`.

### Monthly plan

1. Establish one stable monthly planning basis; ask for one number only when account evidence cannot support it.
2. Apply the living percentage to get the complete category target.
3. Reserve fixed commitments and explicit user amounts.
4. Blend starter weights with completed-period household evidence and normalize all remaining target capacity across flexible categories.
   Reserve categories contribute their stable monthly funding amount here; accumulated reserve availability never enters target capacity.
5. Activate the first supported plan immediately. Thereafter, prepare the automatic result for the next month and promote it at the boundary with a compact change receipt.
6. Apply explicit user edits immediately through one consequence-aware Save.

### Persisted authority

- canonical transaction truth and provider evidence
- effective assignment provenance, user corrections, and reusable rules
- user-visible categories and their lineage when structurally changed
- planning-income basis and living-target intent
- immutable active monthly plan versions and committed change receipts

Everything else is a deterministic computation or cache until it crosses a committed boundary.

## Result

The revised system does the same core jobs with:

- one stable starter vocabulary rather than a generated taxonomy
- two rhythms rather than three clocks
- two global health concepts rather than three combinatorial state machines
- one Save rather than preview-plus-confirm ceremony
- one fully allocated target rather than a normal residual bucket
- one funding-rhythm choice rather than peak-month pacing, fabricated balances, or a reserve dashboard
- five durable authority areas rather than making every intermediate stage a record

The complexity retained is domain complexity required to make the visible experience calm. It does not become navigation, setup, or ongoing plan-management work.
