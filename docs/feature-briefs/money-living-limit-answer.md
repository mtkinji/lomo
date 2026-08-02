---
id: brief-money-living-limit-answer
title: Money Living-Limit Answer
status: accepted
audiences: [audience-aspirational-family-organizers]
personas: [Maya]
hero_jtbd: jtbd-move-the-few-things-that-matter
job_flow: job-flow-maya-review-budget-reality-before-spending
serves: [jtbd-review-budget-reality-before-spending, jtbd-trust-this-app-with-my-life, jtbd-carry-intentions-into-action]
related_briefs: [brief-auto-budget-from-living-target, brief-budget-amount-adjustment, brief-summary-freshness-recovery, brief-money-progressive-activation, brief-transaction-rule-truth, brief-plaid-transaction-backed-meter, brief-model-strategy-and-tradeoffs]
exploration: docs/design-explorations/money-plan-meaning-controls
owner: andrew
last_updated: 2026-08-02
---

# Money Living-Limit Answer

## Context

Kwilt Money already stores a chosen living percentage, builds a versioned plan,
shows category spending, previews category amount changes, and preserves fixed
amounts and customer overrides. The customer still has to reconstruct the most
important whole-plan answer instead of receiving the flexible money left after
protected costs.

This brief turns the existing living-plan truth into one reductive native answer
that remains consistent from current-month orientation through preview, Save,
receipt, and return. It does not broaden the release into Chat, notifications,
Screen Time, purchase checking, or external connectors.

Trust here means more than correct arithmetic. The answer must account for every
relevant transaction exactly once, disclose what remains uncertain, and avoid
presenting category guesses as settled financial truth. A customer should not
need perfect receipt-level categorization before Kwilt can provide a useful
whole-plan answer.

## Target Audience

`audience-aspirational-family-organizers` — people who want household money to
support ordinary life without becoming a budgeting hobby. They need the product
to perform the financial synthesis and expose only the decision-relevant result.

## Representative Persona

Maya is trying to understand whether her household plan still fits the boundary
she chose. She is not trying to learn a planning model or optimize every
category. She may have low confidence with apps, yet still expects the numbers
to reconcile and the consequences of a change to be clear before she saves it.

## Aspirational Design Challenge

How might we help Maya trust that the whole-plan number is real and
comprehensive—even when individual purchases are mixed or imperfectly
categorized—while using the fewest visible interface elements possible?

## Hero JTBD

`jtbd-move-the-few-things-that-matter` — household money matters because it
supports the ordinary commitments and choices Maya is trying to carry forward,
not because maintaining a budget is a goal in itself.

## Job Flow Step

This brief serves `job-flow-maya-review-budget-reality-before-spending`, mainly:

- Step 5: see relevant category and whole-plan reality before changing the
  plan;
- Step 6: understand actual spending, planned capacity, freshness, and
  confidence in plain language;
- Step 8: choose whether to continue or adjust the plan;
- Step 9: see an authoritative result and trust the pattern enough to repeat it.

Current delivery is strongest in underlying plan maintenance and evidence
correction. It remains weaker at `See reality before acting` (3/5) and `Trust
and repeat the pattern` (2/5) because the living-limit answer is not visible in
ordinary use and longitudinal TestFlight comprehension is unproven.

## JTBD Framing

In Maya's voice:

> Tell me what I still have room for inside the limit I chose. If I change one
> category, show me whether I still fit, what else moves, and what stays
> protected before I save it. Do not make me read a dashboard or learn your
> budgeting vocabulary.

This directly serves `jtbd-review-budget-reality-before-spending`. It serves
`jtbd-trust-this-app-with-my-life` by keeping the calculation inspectable,
qualified, versioned, and reversible. It serves
`jtbd-carry-intentions-into-action` by carrying the chosen living percentage
into the category-change moment without requiring manual arithmetic.

## Design

### One-sentence concept

Kwilt teaches the three-part monthly plan once, then Budget shows one exact
current-month flexible-money answer built from every relevant transaction.
Broad categories remain supporting guidance, and every plan-change entry uses
one governed whole-plan review contract.

### Product relationship

- Rename customer-facing `Summary` to `Budget` in the screen title, menu row,
  setup destination, and return copy.
- Keep the internal `MoneySummary` route and stored navigation contract.
- Keep the existing month pager, category grid, Transactions, Accounts,
  category detail, settings drawer, Save path, receipt path, and app shell.
- Put the new current-month answer above the category grid as plain typography.
- Keep past and future month rendering unchanged until historical living-plan
  semantics are separately proven.
- Reuse `previewLivingPlanOverride` as the non-mutating scenario boundary and
  the existing expected-version commit as the authority boundary.

### Reductive UI contract

The underlying projection is comprehensive. The resting surface is not.

```yaml
Job: When I open Budget or change one category amount, tell me whether I still
  have room inside the living limit I chose.
Primary action: `What’s included?` reveals the calculation and evidence. Its
  living-target row opens the existing focused target editor. Save appears only
  inside a governed plan-change review.
Must show: Exact flexible money left this month and total flexible capacity.
Reveal later: The chosen monthly boundary, income basis, bills and money set
  aside, flexible calculation, affected categories, freshness, receipts, and
  category inventory presentation choices, category plan role, and transaction
  treatment.
Must not add: Banners, charts, new meters, legends, status icons,
  fixed/flexible badges, health scores, tutorials, permanent helper copy,
  duplicate settings, an independent transaction protected flag, or a new
  destination.
Reuse map: Money typography, month header, category grid and list, existing drawer,
  category editor, shared plan-change review contract, Save flow, preview
  service, and receipt route.
```

At rest, the new Budget content has three groups:

> Flexible spending
>
> **$343** left
>
> out of $960
>
> `What’s included?`

The label and explicit question action share one row above the compact answer
card. The card contains only the amount left and total flexible capacity. There
is no separate info icon, meter, legend, or decorative state. The currency
symbol is smaller and top-aligned so the amount remains the visual anchor.
Existing type and spacing establish hierarchy, and the category grid begins
immediately afterward.

The category inventory begins with `Categories` and one right-aligned `View`
menu. `View` offers three valid presentations: percentage tiles, a percentage
list, or a dollars-left list. Square tiles remain percentage-only because
realistic currency values do not reliably fit beside a status word. These
choices change presentation only; they do not change category truth,
calculations, ordering, or navigation.

`What’s included?` uses an existing disclosure surface. It leads with the exact
amount left, then presents a compact monthly statement: the chosen boundary
minus bills and money set aside equals flexible room; current flexible spending
then produces the exact amount left. Planning-income source, target percentage,
freshness, and the bill/set-aside composition remain supporting evidence. The
living-target evidence row is actionable and replaces a separate `Adjust plan`
button. It never describes plan room as account balance, cash available, or
guaranteed affordability.

Customer-facing copy says `Bills and money set aside`, not `Protected costs`.
The counted amount is conservative and category-specific: monthly obligations
retain at least their planned amount, uncovered spending above plan reduces
flexible room, and spending funded by an accumulated reserve is not charged to
the current month twice.

Each category also has one durable `Counts as` role: `Protected` or `Flexible`.
This is separate from `Funding rhythm` (`Monthly` or `Reserve`): role answers
whether the category is kept aside before flexible spending, while rhythm
answers when its money is needed. Existing categories continue to infer a role
until the customer makes an explicit choice.

Transaction detail always discloses `Plan treatment`. Ordinary outflows inherit
their category's effective role. Choosing `Flexible spending` or `A protected
bill or reserve` assigns a category with that role; choosing `Outside the plan`
uses the existing not-counted meaning. Kwilt does not store a second,
transaction-level role that could contradict the category.

### Current-month answer states

The pure projection must support:

| State | Primary answer direction |
| --- | --- |
| `supported` | `$343 left for flexible spending this month` |
| `no_flexible_room` | `Your protected plan uses the full 70% living limit` |
| `over_limit` | `Your plan is $84 over its 70% living limit` |
| `over_flexible_room` | `Flexible spending is $84 beyond the room in your living limit` |
| `stale` | Keep the last exact supported answer; disclose its age inside the monthly plan. |
| `invalid_reconciliation` | Do not publish a number; preserve the prior supported answer and record the defect. |
| `missing_income_basis` | Show one `Finish your monthly plan` action card only when the foundation is genuinely absent. |

Missing evidence never becomes `$0`. Stale evidence never becomes `About`; it
retains the last supported amount with a dated basis. Ordinary transaction or
category ambiguity never becomes a blocking answer state. The deterministic
policy counts an unresolved ordinary outflow conservatively as flexible
spending until stronger meaning is available.

### Domain projection

Add a pure, versioned current-month projection with two layers:

1. `MoneyPlanLimitFacts` owns arithmetic and evidence state.
2. `MoneyPlanLimitAnswer` converts supported facts into bounded display states
   and deterministic copy inputs.

Conceptual contract:

```ts
type MoneyPlanLimitFacts = {
  periodId: string;
  planVersionId: string;
  resourceBasisCents: number | null;
  resourceBasisKind: string | null;
  livingPercent: number;
  livingLimitCents: number | null;
  protectedPlanCents: number | null;
  protectedOverageCents: number;
  flexibleCapacityCents: number | null;
  countedFlexibleSpendCents: number | null;
  flexibleRoomCents: number | null;
  flexibleRoomLowCents: number | null;
  flexibleRoomHighCents: number | null;
  unresolvedInScopeCents: number;
  plannedCents: number;
  unassignedCents: number;
  overLimitCents: number;
  freshness: 'fresh' | 'stale';
  confidence: 'supported' | 'qualified';
  qualificationReason: string | null;
};

type MoneyPlanLimitAnswer = {
  state:
    | 'supported'
    | 'no_flexible_room'
    | 'over_limit'
    | 'over_flexible_room'
    | 'stale'
    | 'invalid_reconciliation'
    | 'missing_income_basis';
  facts: MoneyPlanLimitFacts;
  headlineAmountCents: number | null;
  limitLine: { livingPercent: number; livingLimitCents: number } | null;
  qualification: string | null;
  recoveryAction: 'refresh' | 'review_income' | null;
};
```

The domain contract returns facts and bounded state—not arbitrary prose. The UI
formats currency and selects reviewed templates.

### Two layers of transaction meaning

Category placement and whole-plan economic meaning are separate decisions.

**Layer 1: economic role** determines the living-limit answer:

- `protected_spending` — uses an amount already protected for a supported bill,
  commitment, or reserve;
- `flexible_spending` — uses the flexible capacity inside the living limit;
- `outside_plan` — real spending intentionally excluded from the ordinary
  living plan;
- `not_spending` — transfer, refund, category credit, duplicate, pending/settled
  relationship, or another canonical non-spend case;
- `unresolved` — in-scope evidence whose economic role is not yet supported.

**Layer 2: broad category** helps the customer understand where money went and
maintains useful category guides. It does not control whether a dollar is
counted at all.

Every canonical current-period row must appear exactly once in the economic
role reconciliation. `not_spending` rows remain explicitly accounted for in
the reconciliation even though they do not consume plan room. Nothing may
disappear merely because its category is uncertain.

### Broad default categories

Use a small, versioned category set designed to tolerate ordinary mixed
merchants. Start from the existing governed categories and evaluate a simpler
customer-facing grouping such as:

- Home and bills;
- Food and household;
- Transportation;
- Health and care;
- Family;
- Personal and fun;
- Gifts and occasions;
- Debt and fees;
- Other.

The exact names and grouping remain a versioned product policy, not an AI-created
taxonomy. Existing user-created categories and corrections remain valid. A
category may contain different purchase types; that is acceptable when their
economic role is the same.

Merchant names remain evidence, not default categories. `Costco` or `Walmart`
may appear as merchants, search groupings, and rule scopes, but Kwilt should not
create a permanent merchant category merely because the receipt contents are
unknown. A customer may still create one deliberately if it is useful to them.

### Costco and Walmart rule

Suppose Kwilt cannot tell whether a Costco purchase was 100% groceries or 25%
groceries plus household goods and clothing. If every plausible interpretation
is `flexible_spending`, count the entire transaction once against flexible room,
choose the best broad category, and do not interrupt the customer for a split.

The category guide may be approximate while the whole-plan answer remains
complete. Exact splitting is useful only when it changes an economic role, a
customer-protected amount, or a decision the customer is currently making.

### Assignment hierarchy

Use this precedence:

1. canonical transfer, refund, duplicate, and pending/settled relationships;
2. explicit transaction splits and customer corrections;
3. active customer-confirmed merchant rules;
4. confirmed household/category mappings and remembered choices;
5. high-confidence provider evidence mapped into the versioned broad taxonomy;
6. bounded AI classification when governed and provider evidence are
   insufficient;
7. `unresolved` when none of the above supports the economic role.

AI may select only a supported economic role and an existing category id. It
must return confidence and evidence references, cannot override a split,
correction, exclusion, or merchant rule, and cannot silently create categories
or durable merchant rules. Prompt and response contracts are versioned and
tested. Customer corrections outrank every later inference.

### Conservative uncertainty policy

The primary whole-plan answer is deterministic even when local category meaning
is imperfect:

1. Monthly bills retain at least their planned amount even before they post.
2. Supported spending above a monthly bill's plan reduces flexible room.
3. Reserve-funded spending consumes the accumulated reserve before it can
   reduce current-month flexible room.
4. Supported flexible spending consumes flexible capacity.
5. An ordinary unresolved outflow is conservatively counted as flexible
   spending until corrected.
6. Supported transfers, refunds, duplicates, credits, pending replacements, and
   outside-plan activity retain their canonical non-flexible treatment.
7. A later correction may move spending between economic roles and therefore
   update the answer, but Kwilt does not withhold the best deterministic answer
   while waiting for optional bookkeeping.

The projection may retain unresolved totals for inspection and debugging, but
the UI does not show `About`, `Kwilt needs one answer`, or a transaction cleanup
request for ordinary ambiguity. Only a genuinely missing planning foundation or
an invalid reconciliation can prevent publication of the current answer.

### Rebalance preview

When the customer changes a category amount, the existing editor runs a
non-mutating preview before Save. The preview must expose:

- the living percentage and dollar limit;
- whether the proposal uses unassigned capacity, reallocates flexible capacity,
  or exceeds the limit;
- every materially changed category with before, after, and delta;
- whether protected amounts remain unchanged;
- the active plan version used for the preview.

The visible editor adds at most one consequence headline, one short explanation,
one optional disclosure, and the existing Save action.

Within the limit:

> **This stays within your 70% living limit.**
>
> $60 moves from Dining and Shopping. Protected expenses do not change.
>
> `See changes`

Using unassigned capacity:

> **This stays within your 70% living limit.**
>
> This uses $60 that was not assigned. No other category changes.

Over the limit:

> **This puts your plan $84 over its 70% living limit.**
>
> Protected amounts stay in place.
>
> `See ways to make it fit`

`See changes` reveals exact category names and amounts in the current decision
surface. They need not remain expanded when the short consequence is sufficient.
The UI does not show unchanged categories.

Save must use the previewed plan version. If the active version changed, reject
the Save and offer a fresh preview. A successful Save updates the active plan,
creates the authoritative receipt, closes the editor, and causes Budget to
render the matching committed answer.

### Shared plan-change review

`Change plan` is one reusable Money contract entered from the monthly-plan
disclosure, category detail, or a later contextual proposal. The entry supplies
the authoritative version, originating route, focused object, and optional
change. The shared review supplies the whole-plan calculation, affected
categories, protected facts, this-month-versus-ongoing scope, version-checked
Save, receipt, reversal, and exact return.

The shared behavior does not require one oversized visual component. A living
percentage, protected amount, and category allocation may use different focused
inputs while reusing the same preview and consequence renderer.

### Setup alignment

Do not redesign Plaid or create another onboarding system. Align only the
handoffs necessary to make the product promise coherent:

- explain that the chosen percentage is the share of planning income intended
  for ordinary living;
- once evidence exists, teach monthly living money minus protected costs equals
  flexible money in one compact review;
- remove a redundant abstract build decision when Kwilt is simply performing
  the requested calculation;
- finish with `Use this plan`, then the same supported answer used by Budget.

Budget and rebalance form the first implementation slice. Setup alignment may
follow immediately in the same TestFlight learning release, but it must not
delay proving the current-user comprehension loop.

### Analytics and privacy

Allowed events:

- `money_budget_answer_viewed` with state, period relation, freshness bucket,
  and projection version;
- `money_budget_explanation_opened` with state and surface;
- `money_rebalance_preview_viewed` with outcome class, changed-category count
  bucket, and used-unassigned boolean;
- `money_rebalance_changes_opened` with count bucket;
- `money_rebalance_saved`, `money_rebalance_cancelled`, and
  `money_rebalance_stale_rejected` with bounded outcome metadata;
- `money_budget_recovery_invoked` with recovery reason.

Never emit dollar amounts, income, account balance, merchant or category names,
transaction detail, receipt prose, or inferred financial confidence.

### Release and reversibility

Release first in the owning local Simulator build, visible by default without a
feature flag. Preserve `MoneySummary`, existing plan rows, category identity,
and compatibility reads. After Andrew accepts the interaction and the focused
truth tests pass, run comprehensive verification and package the same experience
for an Andrew-only TestFlight build.

Withdrawal restores the prior Budget hierarchy without deleting plans,
transactions, receipts, or evidence.

## Acceptance Criteria

### Financial truth

- Identical versioned inputs produce identical `MoneyPlanLimitFacts` and answer
  state.
- Every canonical current-period transaction reconciles exactly once as
  protected spending, flexible spending, outside the plan, not spending, or
  unresolved.
- The reconciliation total equals the canonical transaction scope after
  explicit pending, duplicate, transfer, refund, and credit treatment; category
  uncertainty never drops a transaction from the whole-plan calculation.
- `livingLimitCents` equals the supported planning-income basis multiplied by
  the chosen percentage under the canonical rounding rule.
- Protected, flexible, unassigned, and over-limit amounts reconcile to the
  active plan.
- A plan allocation overage and actual flexible-spending overage produce
  different answer states and cannot share misleading copy.
- Fixed, reserve, override, purely flexible, mixed-merchant, split,
  provisional, and missing-evidence fixtures produce explicitly tested
  outcomes.
- A mixed merchant whose plausible assignments share one economic role counts
  once in the whole-plan answer without requiring a split.
- Category assignment cannot change the top-line answer when economic role is
  unchanged.
- Ordinary unresolved outflows are included once in counted flexible spending
  under the conservative policy and do not create a blocking answer state.
- AI classification is restricted to allowed economic roles and existing
  category ids, preserves governed precedence, exposes bounded confidence and
  evidence, and never creates a durable rule without confirmation.
- Stale or missing evidence never becomes zero and never overwrites the last
  trustworthy answer.
- Category and transaction totals reconcile with the records exposed through
  their evidence path.

### Budget experience

- Customer-facing `Summary` becomes `Budget`; internal route names do not
  change.
- The current month renders one answer line, one used-versus-capacity line, and
  one disclosure action above the existing grid.
- The new answer has no wrapper card, icon, illustration, chart, meter, legend,
  badge, border, status color dependency, persistent CTA, or tutorial.
- The planning-income basis, living percentage and dollar amount, protected
  composition, freshness, and calculation are reachable in one disclosure.
- The answer never implies account balance, cash-flow coverage, financial
  advice, or guaranteed affordability.
- Ordinary category or merchant ambiguity never produces `About`, `Kwilt needs
  one answer`, or a transaction-cleanup request above the category grid.
- Past and future months do not reuse current-plan facts as historical truth.
- Large text preserves the amount, limit, qualification, disclosure, and
  category-grid reading order.

### Rebalance experience

- `Change plan` from the monthly plan and from category detail uses the same
  whole-plan preview, version, Save, receipt, and return contract.
- Editing a category amount produces a non-mutating preview before Save.
- The visible consequence uses no more than a headline, short explanation,
  optional disclosure, and existing Save action.
- The preview states whether the proposal remains within or exceeds the chosen
  limit and whether unassigned or other flexible capacity funds it.
- Every material category change is inspectable before Save; unchanged
  categories remain absent.
- Protected amounts are not silently reduced.
- Actual recorded spending does not change.
- Save rejects a stale preview and cannot commit a different plan than the one
  described.
- After Save, Budget and receipt agree with the accepted preview.

### Reduction and learning

- Every persistent visible element has a named comprehension or safety failure
  that would occur if it were removed.
- If the headline needs explanatory helper copy, revise the headline, hierarchy,
  disclosure, or claim before adding another component.
- Fixture truth passes before moderated comprehension begins.
- Andrew first accepts the connected-data Simulator result. Then at least three
  uncoached participants, including one with low app confidence, correctly
  explain the answer and plan-change consequence; all distinguish plan room
  from account balance and preview from committed state.
- Small TestFlight use covers at least one real category change and an ordinary
  return to Budget.
- No additional persistent UI is required to meet the comprehension threshold.

### Verification

- Pure projection and answer-state tests cover every required state and the
  conservative unresolved-outflow policy, including Costco/Walmart-style mixed
  merchants.
- Classification tests cover precedence from canonical relationships through
  customer corrections, provider mapping, bounded AI inference, and unresolved
  fallback.
- AI prompt-builder and response-validation tests reject new category ids,
  unsupported roles, missing evidence, governed overrides, and malformed
  confidence.
- Rebalance tests cover unassigned, reallocation, over-limit, no-op, blocked,
  stale, commit, receipt, and return consistency.
- `npm run verify:changed -- --run` passes.
- The owning Simulator runtime proves normal, loading, stale, true missing
  foundation, preview, Save, return, and large-text states.
- Signed TestFlight proof remains distinct from Simulator proof and is required
  for the learning decision, not for claiming source completion.

## Success Signal

Maya can open Budget, explain what remains inside her chosen limit, verify what
the limit is based on, change a category, predict the whole-plan consequence,
save once, and see the same truth afterward—without assistance, manual
arithmetic, or additional persistent interface.

She can also trust that every relevant transaction was counted once even when
Kwilt cannot perfectly divide a Costco or Walmart purchase. Category
imperfection is visible when material but does not prevent a comprehensive
whole-plan answer when the economic role is stable.

This work should improve the job-flow steps `See reality before acting` and
`Trust and repeat the pattern` only after comprehension, signed TestFlight use,
and preview/commit reconciliation are observed. Source completion alone does not
raise the delivery scores.

## Spec Refinement

### Resolved decisions

- The first implementation is native Money only.
- The first proof path is current-month Budget through category rebalance and
  back to Budget.
- Whole-plan economic role is authoritative for the living-limit answer;
  category assignment is a separate organizational layer.
- Every canonical transaction is reconciled once. Ordinary unresolved outflows
  are counted conservatively as flexible spending and do not block the answer.
- Broad, versioned default categories are the normal destination. Merchant
  names do not become categories by default.
- Costco/Walmart-style ambiguity does not trigger a question when every
  plausible assignment has the same economic role.
- Bounded AI follows canonical relationships, customer corrections, merchant
  rules, and supported provider evidence. It cannot invent categories or
  override governed truth.
- `Budget` is customer-facing copy; `MoneySummary` remains the internal route.
- The resting UI has three groups: a label, one compact amount card, and one
  right-aligned disclosure question.
- The flexible-spending label does not repeat the month because the whole page
  is already scoped by the month header.
- `$343 left` is the supported headline and `out of $960` preserves total
  flexible capacity without repeating the derived amount spent.
- The chosen percentage, dollar limit, bills and money set aside, derived spending, and
  income basis are progressively disclosed through
  `What’s included?`.
- `What’s included?` contains one secondary `Adjust plan` action.
- The category inventory has a plain `Categories` heading and one `View` menu
  for percentage tiles, a percentage list, or a dollars-left list. The initial
  learning release keeps these choices screen-local rather than inventing
  preference storage.
- `Change plan` from monthly plan and category detail shares one governed
  whole-plan review contract while allowing context-specific focused inputs.
- Current active-plan facts and `previewLivingPlanOverride` remain the truth and
  scenario boundaries.
- Save uses optimistic version consistency and the existing receipt path.
- Historical answers, Chat, outreach, purchase checking, Screen Time changes,
  widgets, SMS, connectors, and household scope are deferred.

### Assumptions requiring implementation-time proof

- The current settings drawer may support the reduced consequence and expanded
  category changes without needing a new focused review surface.
- Existing historical month paging can remain untouched while only the current
  month receives the new answer.

### Confirmed code findings

1. `getActiveLivingPlan` already returns one versioned plan with
   `resourceBasisCents`, living percentage, target, planned, unassigned,
   over-target, candidate/evidence hashes, and per-category fixed, override,
   flexible, exposure, source, rhythm, and reserve facts. Do not create a second
   plan store or recompute target arithmetic in the screen.
2. Income-source provenance and sync freshness are not included in that return.
   They exist in current planning-income and connection/snapshot sources. Add a
   Money-owned loader that composes those reads into `MoneyPlanLimitFacts`; do
   not persist a duplicate answer row merely to make the UI convenient.
3. The allocator currently chooses a hard allocation when fixed or override
   cents exist and sets that allocation's `flexibleCents` to zero. Current
   spending is aggregated at visible-category level. The revision does not
   require perfect subcategory attribution when all plausible meanings share
   one economic role, but it does require a new transaction-level economic-role
   reconciliation and explicit uncertainty bounds when roles may differ.
4. `promote_budget_living_plan` locks the active pointer and rejects an
   `expected_active_version_id` mismatch. `apply_governed_category_plan_change`
   performs the category write, override write, plan promotion, pointer update,
   and receipt inside one database transaction, so a promotion exception rolls
   back the preceding writes.
5. The current UI preview/Save contract is still insufficient. A cached
   `LivingPlanOverridePreview` does not expose or carry its active version or
   candidate hash into Save. `updateCategoryPlan` recomputes from whatever plan
   is active at commit time, so it can truthfully commit that newer candidate
   while differing from the consequence the customer saw. Extend the preview
   result with `expectedActiveVersionId` and `candidateHash`, and require the
   commit API to apply that exact preview or reject and render a fresh one.
6. Receipt detail already links prior/current versions and exact changed
   category amounts. Its current version read includes resource basis, target,
   planned, and unassigned facts, but omits living percentage, over-target, and
   component fields needed by this answer. Extend the receipt read projection
   additively from existing version/component rows; no new receipt table is
   justified. Current spending remains a current Budget fact, not a historical
   receipt fact.

### Revised domain decision

Implement the smallest Money-owned economic-role reconciliation that can:

- account for every canonical transaction exactly once;
- preserve existing governed assignment precedence;
- distinguish economic role from broad category;
- count ordinary unresolved outflows conservatively as flexible spending;
- use bounded AI only after deterministic, customer, rule, and supported
  provider evidence;
- reserve blocking publication for a genuinely missing planning foundation or
  invalid reconciliation.

This removes perfect category attribution as the blocker. The first local slice
uses existing transaction meaning, split, scheduled-plan, and allocation
provenance without schema work. Fixture and connected-data reconciliation must
prove that this is sufficient before any additive economic-role field is
considered.

### Intentionally deferred decisions

- Exact historical-plan answer semantics.
- Forecast-risk language in the primary answer.
- Automatic within-month category rebalancing.
- Purchase scenarios and `safe to spend` claims.
- Chat query and loop contracts.
- Notification, Phone Agent, and connector delivery.
- Household authority and shared Money views.
- Receipt-level item parsing and automatic percentage splitting for mixed
  merchants.
- A merchant-as-category default model.

## Open Questions

- Should the first category-policy version retain the current eleven governed
  categories or test the proposed nine broader customer-facing groups while
  preserving existing category ids and corrections?
- Does the composed shared review remain calm with affected categories expanded
  at large text sizes, or does that evidence require an existing nested detail
  pattern?
