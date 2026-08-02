# Money Living-Limit Answer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the current-month Budget surface one trustworthy answer about flexible room inside the customer's chosen living limit, and make category rebalance previews describe and commit the exact same plan.

**Architecture:** Keep the existing living-plan allocator, governed category ids, Money navigation, snapshot, and category editor. Add one pure transaction economic-role reconciliation and one pure answer projection, attach the answer to the same versioned snapshot projection already used by Money, then render it as plain typography with one disclosure. Rebalance Save receives the exact preview candidate and active-version id instead of recomputing a different candidate. Bounded AI classification runs later and off the render path; unresolved transactions always remain visible in deterministic answer bounds.

**Tech Stack:** React Native, Expo, TypeScript, Jest with `jest-expo`, Supabase/Postgres, Supabase Edge Functions with Deno, OpenAI strict structured output through a server-owned function.

---

## Scope and sequencing decisions

- Work in the existing `/Users/andrewwatanabe/Kwilt` checkout on `codex/money-capabilities`. Do not create a worktree unless Andrew later chooses parallel implementation.
- Preserve the internal `MoneySummary` route and shell navigation contracts. Change only customer-facing `Summary` copy to `Budget`.
- Retain the current eleven governed category ids for this release. Do not migrate existing categories into the proposed nine presentation groups while proving the living-limit answer.
- Treat category placement and economic role as separate. A Costco transaction assigned wholly to `food` can still produce an exact whole-plan result when `food` is flexible.
- Account for each canonical transaction with one reconciliation row. A valid split may contribute portions to more than one role, but those contributions must sum to the transaction amount.
- Treat `category_credit` as a non-spending row with a signed adjustment to its referenced protected or flexible category. Transfers and pending rows contribute zero to spend. An explicit `not_counted` outflow is real `outside_plan` spending.
- Use a conservative estimate: the displayed `About` amount is the lower flexible-room bound rounded to the nearest $10. Never present the midpoint as money the customer can safely use.
- Use `money-plan-limit-v1` materiality: exact when bounds match; estimated only when both bounds share the same answer state and their width is no more than `max($25, 5% of flexible capacity)`; ask one question when the range crosses zero or the current rebalance decision; otherwise show the narrower supported fact.
- The deterministic answer and exact preview/commit path are the first shippable slice. Background AI classification may improve future answers, but it never blocks Budget rendering and cannot make an unsupported exact claim.

## File structure

**Create**

- `src/capabilities/money/domain/moneyEconomicRole.ts` — one-row-per-transaction economic-role reconciliation.
- `src/capabilities/money/domain/moneyEconomicRole.test.ts` — invariants, credits, splits, mixed merchants, and unresolved fixtures.
- `src/capabilities/money/domain/moneyPlanLimitAnswer.ts` — pure facts, bounds, state priority, and reviewed copy inputs.
- `src/capabilities/money/domain/moneyPlanLimitAnswer.test.ts` — exact, estimated, overage, stale, missing, and branching fixtures.
- `src/capabilities/money/data/moneyPlanLimitEvidence.ts` — focused planning-basis provenance read for the active answer.
- `src/capabilities/money/data/moneyPlanLimitEvidence.test.ts` — user-set, detected-income, prior-basis, and missing evidence reads.
- `src/capabilities/money/domain/moneyRebalanceAnswer.ts` — pure preview consequence projection.
- `src/capabilities/money/domain/moneyRebalanceAnswer.test.ts` — unassigned, reallocated, protected, over-limit, and stale cases.
- `src/capabilities/money/components/MoneyPlanLimitAnswer.tsx` — the maximum-three-element current-month answer.
- `src/capabilities/money/components/MoneyPlanLimitAnswer.test.tsx` — rendering, accessibility, disclosure, and no-decoration contract.
- `src/capabilities/money/screens/MoneySummaryScreen.test.tsx` — current-only answer, Budget naming, and disclosure integration.
- `src/capabilities/money/runtime/livingPlanReconciliation.test.ts` — exact preview token and stale commit regression coverage.
- `src/capabilities/money/runtime/moneyPlanLimitAnalytics.ts` — allowlisted answer and rebalance events.
- `src/capabilities/money/runtime/moneyPlanLimitAnalytics.test.ts` — privacy contract for event properties.
- `supabase/functions/_shared/moneyTransactionClassifier.ts` — bounded prompt, schema, and response validation.
- `supabase/functions/_shared/__tests__/moneyTransactionClassifier.test.ts` — strict classifier contract tests.
- `supabase/functions/classify-money-transactions/index.ts` — authenticated background classifier and conditional persistence.
- `supabase/functions/classify-money-transactions/__tests__/classificationPolicy.test.ts` — precedence and stale-write tests.

**Modify**

- `src/capabilities/money/data/moneySnapshot.ts` — retain assignment provenance on projected transactions.
- `src/capabilities/money/data/moneySnapshot.test.ts` — comprehensive current-period fixtures and provenance.
- `src/capabilities/money/data/moneyRepository.ts` — select assignment fields and expose background classification invocation.
- `src/capabilities/money/data/moneyRepository.test.ts` — classification invocation and snapshot projection tests.
- `src/capabilities/money/data/moneyPlanProjection.ts` — derive the answer from the exact active plan and snapshot.
- `src/capabilities/money/data/moneyPlanProjection.test.ts` — attach version-matched answer and reject mismatches.
- `src/capabilities/money/data/MoneyDataContext.tsx` — keep answer versioned with the snapshot and pass exact previews to Save.
- `src/capabilities/money/data/MoneyDataContext.test.tsx` — preview/commit/return consistency.
- `src/capabilities/money/runtime/livingPlanReconciliation.ts` — return a commit-ready preview instead of recomputing on Save.
- `src/capabilities/money/screens/MoneySummaryScreen.tsx` — render the answer for month offset zero and host its disclosure.
- `src/capabilities/money/screens/MoneyCategoryDetailScreen.tsx` — render one consequence and commit the preview token.
- `src/capabilities/money/screens/MoneyCategoryDetailScreen.test.tsx` — source and interaction assertions for the reduced drawer.
- `src/capabilities/money/data/livingPlanRepository.ts` — extend receipt facts without creating a duplicate store.
- `src/capabilities/money/data/livingPlanRepository.test.ts` — exact preview candidate and extended receipt projection.
- `src/capabilities/money/domain/living-plan-receipt.ts` — include living percentage and over-target facts.
- `src/capabilities/money/domain/livingPlan.test.ts` — preserve allocator behavior while answer logic remains separate.
- `src/capabilities/money/screens/MoneyLivingPlanReceiptScreen.tsx` — show plan and limit facts that agree with Save.
- `src/capabilities/money/screens/MoneySetupScreen.tsx` — use Budget language and show the resulting percentage/dollar limit when available.
- `src/capabilities/registry.ts`, `src/capabilities/registry.test.ts`, `src/navigation/CapabilityMenu.tsx`, `src/navigation/CapabilityMenu.test.tsx`, `src/navigation/RootNavigator.tsx` — reversible customer-facing `Budget` label.
- `src/services/analytics/events.ts` — add bounded Money answer and rebalance event names.
- `src/capabilities/money/data/MoneyDataContext.tsx` — start optional classification after accepting the initial deterministic snapshot.
- `docs/feature-briefs/money-living-limit-answer.md` — record any implementation-proven policy refinements only.
- `docs/capabilities/money/README.md`, `src/capabilities/money/FEATURE.md`, `docs/agent-code-map.md` — refresh links/map if generated output changes.

## Task 1: Reconcile every transaction into economic meaning

**Files:**

- Create: `src/capabilities/money/domain/moneyEconomicRole.ts`
- Create: `src/capabilities/money/domain/moneyEconomicRole.test.ts`
- Modify: `src/capabilities/money/data/moneySnapshot.ts`
- Modify: `src/capabilities/money/data/moneySnapshot.test.ts`
- Modify: `src/capabilities/money/data/moneyRepository.ts`
- Modify: `src/capabilities/money/data/moneyRepository.test.ts`

- [ ] **Step 1: Write the failing one-row-per-transaction tests**

Define fixtures covering assigned flexible spend, assigned protected spend, explicit outside-plan spend, transfer, pending, category credit, unsplit Costco, valid cross-role split, invalid partial split, and unassigned spend. Assert:

```ts
expect(result.rows).toHaveLength(input.transactions.length);
expect(new Set(result.rows.map((row) => row.transactionId)).size).toBe(input.transactions.length);
expect(result.totals).toEqual({
  protectedSpendCents: 80_000,
  flexibleSpendCents: 32_000,
  outsidePlanSpendCents: 5_000,
  neutralCents: 12_000,
  unresolvedOutflowCents: 18_496,
});
expect(result.invariant).toEqual({ valid: true, inputRowCount: 9, outputRowCount: 9 });
```

The Costco fixture must prove that a whole transaction assigned to a flexible category is exact without receipt splitting. The split fixture must prove that one row can contain protected and flexible contributions whose cents equal the transaction amount.

- [ ] **Step 2: Run the tests and verify the missing-module failure**

Run:

```bash
npm test -- --runInBand src/capabilities/money/domain/moneyEconomicRole.test.ts
```

Expected: FAIL because `moneyEconomicRole.ts` does not exist.

- [ ] **Step 3: Implement the pure reconciliation contract**

Use this public contract:

```ts
export type MoneyEconomicRole =
  | 'protected_spending'
  | 'flexible_spending'
  | 'outside_plan'
  | 'not_spending'
  | 'unresolved';

export type MoneyEconomicRoleContribution = {
  role: MoneyEconomicRole;
  amountCents: number;
  spendDeltaCents: number;
  categoryId: string | null;
};

export type MoneyEconomicRoleRow = {
  transactionId: string;
  amountCents: number;
  disposition: MoneyEconomicRole;
  contributions: MoneyEconomicRoleContribution[];
  reason:
    | 'pending'
    | 'transfer'
    | 'category_credit'
    | 'explicitly_outside_plan'
    | 'assigned_category'
    | 'valid_split'
    | 'missing_category'
    | 'invalid_allocation';
};

export type MoneyEconomicRoleReconciliation = {
  rows: MoneyEconomicRoleRow[];
  totals: {
    protectedSpendCents: number;
    flexibleSpendCents: number;
    outsidePlanSpendCents: number;
    neutralCents: number;
    unresolvedOutflowCents: number;
  };
  invariant: { valid: boolean; inputRowCount: number; outputRowCount: number };
};
```

Derive category role from the active plan allocation: `fixedCents > 0 || overrideCents > 0` is protected; a known remaining allocation is flexible. Apply precedence in this exact order: pending, transfer, category credit, explicit outside-plan, valid split, assigned category, unresolved. Keep credits as `not_spending` rows with negative `spendDeltaCents` against the referenced category role. Clamp final role totals at zero only after all signed contributions are summed.

- [ ] **Step 4: Preserve assignment provenance in the snapshot**

Add these optional fields to `MoneyTransactionRow` and `MoneyTransaction`, select them in `moneyRepository.ts`, and project them without interpreting them in the UI:

```ts
budget_assignment_source?: string | null;
budget_assignment_policy_version?: string | null;
budget_assignment_governed?: boolean | null;
```

Add snapshot tests proving confirmed, merchant-rule, provider-policy, and unassigned rows retain their source. Do not add provenance badges.

- [ ] **Step 5: Run focused tests**

Run:

```bash
npm test -- --runInBand \
  src/capabilities/money/domain/moneyEconomicRole.test.ts \
  src/capabilities/money/data/moneySnapshot.test.ts \
  src/capabilities/money/data/moneyRepository.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit the transaction truth slice**

```bash
git add \
  src/capabilities/money/domain/moneyEconomicRole.ts \
  src/capabilities/money/domain/moneyEconomicRole.test.ts \
  src/capabilities/money/data/moneySnapshot.ts \
  src/capabilities/money/data/moneySnapshot.test.ts \
  src/capabilities/money/data/moneyRepository.ts \
  src/capabilities/money/data/moneyRepository.test.ts
git commit -m "feat(money): reconcile transaction economic roles"
```

## Task 2: Project the living-limit facts and answer state

**Files:**

- Create: `src/capabilities/money/domain/moneyPlanLimitAnswer.ts`
- Create: `src/capabilities/money/domain/moneyPlanLimitAnswer.test.ts`
- Create: `src/capabilities/money/data/moneyPlanLimitEvidence.ts`
- Create: `src/capabilities/money/data/moneyPlanLimitEvidence.test.ts`
- Modify: `src/capabilities/money/data/moneySnapshot.ts`
- Modify: `src/capabilities/money/data/moneyPlanProjection.ts`
- Modify: `src/capabilities/money/data/moneyPlanProjection.test.ts`

- [ ] **Step 1: Write failing state-priority and arithmetic tests**

Cover `supported`, `estimated`, `no_flexible_room`, `over_limit`, `over_flexible_room`, `unassigned`, `stale`, `needs_one_answer`, `insufficient_meaning`, and `missing_income_basis`. Include these non-negotiable cases:

```ts
expect(answer.facts.livingLimitCents).toBe(350_000); // 70% of $5,000
expect(answer.facts.protectedPlanCents).toBe(200_000);
expect(answer.facts.flexibleCapacityCents).toBe(150_000);
expect(answer.facts.countedFlexibleSpendCents).toBe(115_704);
expect(answer.facts.flexibleRoomCents).toBe(34_296);
expect(answer.state).toBe('supported');
```

```ts
expect(costcoAnswer.state).toBe('supported');
expect(costcoAnswer.facts.unresolvedInScopeCents).toBe(0);
```

```ts
expect(branchingAnswer.state).toBe('needs_one_answer');
expect(branchingAnswer.facts.flexibleRoomLowCents).toBeLessThan(0);
expect(branchingAnswer.facts.flexibleRoomHighCents).toBeGreaterThanOrEqual(0);
```

Also prove that a plan allocation overage produces `over_limit`, while actual overspending against otherwise valid flexible capacity produces `over_flexible_room`.

- [ ] **Step 2: Run the tests and verify the missing-module failure**

```bash
npm test -- --runInBand src/capabilities/money/domain/moneyPlanLimitAnswer.test.ts
```

Expected: FAIL because the answer projector does not exist.

- [ ] **Step 3: Implement the pure facts and answer types**

Export the feature-brief contract, plus a policy version:

```ts
export const MONEY_PLAN_LIMIT_POLICY_VERSION = 'money-plan-limit-v1';

export type MoneyPlanLimitAnswerState =
  | 'supported'
  | 'estimated'
  | 'no_flexible_room'
  | 'over_limit'
  | 'over_flexible_room'
  | 'unassigned'
  | 'stale'
  | 'needs_one_answer'
  | 'insufficient_meaning'
  | 'missing_income_basis';
```

Calculate:

```ts
const protectedPlanCents = allocations
  .filter((row) => row.fixedCents > 0 || row.overrideCents > 0)
  .reduce((sum, row) => sum + row.amountCents, 0);
const flexibleCapacityCents = Math.max(0, livingLimitCents - protectedPlanCents);
const high = flexibleCapacityCents - reconciliation.totals.flexibleSpendCents;
const low = high - reconciliation.totals.unresolvedOutflowCents;
```

Use this state priority: missing income basis; stale; plan `overTargetCents`; unassigned plan; no flexible capacity; materially branching uncertainty; unsupported wide uncertainty; actual flexible overage; bounded estimate; exact supported. Keep facts numeric and copy-free. Return the conservative lower bound as `headlineAmountCents` for `estimated`.

Include `reviewTransactionIds: string[]` on the answer. For
`needs_one_answer`, sort unresolved rows by descending unresolved cents and
then transaction id; include rows until their cumulative cents are enough to
remove the zero crossing. Every other state returns an empty array.

- [ ] **Step 4: Load the active plan's basis provenance without duplicating it**

Implement this focused read:

```ts
export type MoneyPlanLimitEvidence = {
  resourceBasisKind:
    | 'user_set'
    | 'detected_income'
    | 'prior_supported_basis'
    | 'unknown';
  resourceBasisUpdatedAtIso: string | null;
};

export async function getMoneyPlanLimitEvidence(
  client: SupabaseClient,
  active: ActiveLivingPlan,
): Promise<MoneyPlanLimitEvidence>;
```

Read the active `budget_planning_basis_overrides` row and the active
`budget_planning_income_sources` rows whose `evidence_hash` matches the active
plan. Return `user_set` when the active override equals the plan basis;
`detected_income` when matching high-confidence eligible sources reconcile to
the plan basis; `prior_supported_basis` when the plan intentionally retained a
prior basis after stale evidence; otherwise `unknown`. Return only provenance
kind and update time—never source names or account details.

Write tests for all four states and for a missing optional table returning
`unknown` rather than manufacturing zero.

- [ ] **Step 5: Attach the answer to the exact active-plan projection**

Extend `MoneySnapshot` with:

```ts
livingLimitAnswer?: MoneyPlanLimitAnswer | null;
```

In `loadMoneyPlanProjection`, read the active plan once, pass it to
`getMoneyPlanLimitEvidence`, and supply both to
`projectMoneyPlanProjection(snapshot, active, evidence, now)`. Reconcile only
transactions whose `date.slice(0, 7) === active.periodId` against
`active.allocations`, build the answer, and return it on the projected
snapshot. This prevents historical rows from consuming current flexible room
and guarantees the answer and category amounts share `active.versionId`. Do
not add a second active-plan query or stored answer table.

- [ ] **Step 6: Run focused tests**

```bash
npm test -- --runInBand \
  src/capabilities/money/domain/moneyPlanLimitAnswer.test.ts \
  src/capabilities/money/data/moneyPlanLimitEvidence.test.ts \
  src/capabilities/money/data/moneyPlanProjection.test.ts
```

Expected: PASS, including version mismatch rejection.

- [ ] **Step 7: Commit the answer projection**

```bash
git add \
  src/capabilities/money/domain/moneyPlanLimitAnswer.ts \
  src/capabilities/money/domain/moneyPlanLimitAnswer.test.ts \
  src/capabilities/money/data/moneyPlanLimitEvidence.ts \
  src/capabilities/money/data/moneyPlanLimitEvidence.test.ts \
  src/capabilities/money/data/moneySnapshot.ts \
  src/capabilities/money/data/moneyPlanProjection.ts \
  src/capabilities/money/data/moneyPlanProjection.test.ts
git commit -m "feat(money): project the living limit answer"
```

## Task 3: Render the reductive Budget answer

**Files:**

- Create: `src/capabilities/money/components/MoneyPlanLimitAnswer.tsx`
- Create: `src/capabilities/money/components/MoneyPlanLimitAnswer.test.tsx`
- Create: `src/capabilities/money/screens/MoneySummaryScreen.test.tsx`
- Modify: `src/capabilities/money/navigation/types.ts`
- Modify: `src/capabilities/money/screens/MoneyTransactionsScreen.tsx`
- Modify: `src/capabilities/money/screens/MoneyTransactionsScreen.test.tsx`
- Modify: `src/capabilities/money/screens/MoneySummaryScreen.tsx`

- [ ] **Step 1: Write failing component tests for the three-element ceiling**

Render exact, estimated, stale, missing, branching, and overage states. Assert the exact state contains only the answer, limit line, and disclosure control:

```ts
expect(screen.getByText('$343 left for flexible spending')).toBeTruthy();
expect(screen.getByText('Within your 70% living limit of $3,360.')).toBeTruthy();
expect(screen.getByRole('button', { name: 'How this works' })).toBeTruthy();
expect(screen.queryByTestId('money-limit-card')).toBeNull();
expect(screen.queryByText(/confidence/i)).toBeNull();
```

Assert `estimated` begins with `About`, `needs_one_answer` exposes one `Review purchases` action, and missing evidence never renders `$0 left`.

- [ ] **Step 2: Run the tests and verify failure**

```bash
npm test -- --runInBand src/capabilities/money/components/MoneyPlanLimitAnswer.test.tsx
```

Expected: FAIL because the component does not exist.

- [ ] **Step 3: Implement reviewed deterministic copy**

`MoneyPlanLimitAnswer.tsx` must accept only the domain answer and callbacks:

```ts
type Props = {
  answer: MoneyPlanLimitAnswer;
  onExplain: () => void;
  onReview: () => void;
};
```

Use a `switch` over the typed state. Format currency with `formatMoney`; do not accept model-generated prose. Use plain `View`, `Text`, and `Pressable` with spacing only—no background, border, icon, meter, badge, status color, or wrapper card.

- [ ] **Step 4: Add one existing-pattern disclosure to Budget**

In `MoneySummaryScreen.tsx`, show the answer only when `period.monthOffset === 0`. Host one `BottomDrawer` titled `How this works` with rows for planning income, living limit, protected plan, flexible capacity, counted flexible spend, unresolved amount when nonzero, and freshness. The drawer may contain facts; the resting screen remains three elements.

Gate the answer with `useFeatureFlag('money-living-limit-answer', __DEV__)`.
When the flag is on, replace the current month's legacy total section with the
new answer. When it is off, render the existing current-month total unchanged.
Past and future months keep their saved-history total treatment in both states.

For `Review purchases`, add an optional parameter to the existing route:

```ts
MoneyTransactions: {
  categoryId?: string;
  monthStart?: string;
  monthEnd?: string;
  monthLabel?: string;
  reviewTransactionIds?: string[];
} | undefined;
```

Pass `answer.reviewTransactionIds` into this route. Filter
`MoneyTransactionsScreen` to exactly those ids and title the list `Review
purchases`. Do not add a new route or show model confidence.

- [ ] **Step 5: Add screen integration tests**

Mock `useMoneyData()` with current, past, and future period views. Assert the answer appears only on the current page, the category grid follows it, the drawer opens, and past/future pages retain saved-history treatment without current living-plan facts.

- [ ] **Step 6: Run component and screen tests**

```bash
npm test -- --runInBand \
  src/capabilities/money/components/MoneyPlanLimitAnswer.test.tsx \
  src/capabilities/money/screens/MoneySummaryScreen.test.tsx \
  src/capabilities/money/screens/MoneyTransactionsScreen.test.tsx
```

Expected: PASS.

- [ ] **Step 7: Commit the reductive answer UI**

```bash
git add \
  src/capabilities/money/components/MoneyPlanLimitAnswer.tsx \
  src/capabilities/money/components/MoneyPlanLimitAnswer.test.tsx \
  src/capabilities/money/navigation/types.ts \
  src/capabilities/money/screens/MoneySummaryScreen.tsx \
  src/capabilities/money/screens/MoneySummaryScreen.test.tsx \
  src/capabilities/money/screens/MoneyTransactionsScreen.tsx \
  src/capabilities/money/screens/MoneyTransactionsScreen.test.tsx
git commit -m "feat(money): show one living limit answer"
```

## Task 4: Make preview and Save use the same candidate

**Files:**

- Modify: `src/capabilities/money/runtime/livingPlanReconciliation.ts`
- Create: `src/capabilities/money/runtime/livingPlanReconciliation.test.ts`
- Modify: `src/capabilities/money/data/livingPlanRepository.ts`
- Modify: `src/capabilities/money/data/livingPlanRepository.test.ts`
- Modify: `src/capabilities/money/data/MoneyDataContext.tsx`
- Modify: `src/capabilities/money/data/MoneyDataContext.test.tsx`

- [ ] **Step 1: Write the regression test that proves Save currently recomputes**

Mock the first active read as `version-1` and a later active read as `version-2`. Preview a category amount, then Save. The new expectation is:

```ts
expect(applyGovernedCategoryPlanChange).toHaveBeenCalledWith(client, expect.objectContaining({
  expectedActiveVersionId: 'version-1',
  candidate: preview.candidate,
}));
expect(getActiveLivingPlan).toHaveBeenCalledTimes(1);
```

Add a stale case where the RPC rejects `version-1`; assert Save reports that the plan changed and does not silently preview/commit `version-2`.

- [ ] **Step 2: Run the regression test and verify it fails**

```bash
npm test -- --runInBand src/capabilities/money/runtime/livingPlanReconciliation.test.ts
```

Expected: FAIL because commit currently calls `evaluateLivingPlan` again.

- [ ] **Step 3: Add a typed commit-ready preview**

Split the ready branch from the blocked branch:

```ts
export type ReadyLivingPlanOverridePreview = {
  outcome: 'ready';
  expectedActiveVersionId: string | null;
  candidateHash: string;
  candidate: LivingPlanCandidate;
  comparison: LivingPlanComparison;
  changes: LivingPlanAllocationChange[];
  before: LivingPlanAdjustmentFacts | null;
  after: LivingPlanAdjustmentFacts;
  recentSpending: CompletedCategorySpendingGuidepost | null;
  currentSource: LivingPlanAllocation['source'] | null;
  protectedAmountsUnchanged: boolean;
};
```

`previewLivingPlanOverride` returns this object. `commitLivingPlanCategoryChange` must accept `preview: ReadyLivingPlanOverridePreview`, validate that `preview.candidateHash === preview.candidate.candidateHash`, then call `applyGovernedCategoryPlanChange` directly with the preview candidate, comparison, and expected version. Remove the commit-time call to `evaluateLivingPlan`.

- [ ] **Step 4: Thread the preview through MoneyDataContext**

Change the context contract to:

```ts
updateCategoryPlan: (
  categoryId: string,
  input: Parameters<MoneyRepository['updateCategoryPlan']>[1],
  preview?: ReadyLivingPlanOverridePreview,
) => Promise<void>;
```

For governed amount/funding changes, require a ready preview. If the caller has none, compute it once and immediately commit that returned object. After the RPC returns a version id, keep the existing `loadMoneyPlanProjection(client, snapshot, versionId)` gate so Budget, receipt id, category amounts, and answer all come from the confirmed version.

- [ ] **Step 5: Run the exact-preview tests**

```bash
npm test -- --runInBand \
  src/capabilities/money/runtime/livingPlanReconciliation.test.ts \
  src/capabilities/money/data/livingPlanRepository.test.ts \
  src/capabilities/money/data/MoneyDataContext.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit the atomic preview contract**

```bash
git add \
  src/capabilities/money/runtime/livingPlanReconciliation.ts \
  src/capabilities/money/runtime/livingPlanReconciliation.test.ts \
  src/capabilities/money/data/livingPlanRepository.ts \
  src/capabilities/money/data/livingPlanRepository.test.ts \
  src/capabilities/money/data/MoneyDataContext.tsx \
  src/capabilities/money/data/MoneyDataContext.test.tsx
git commit -m "fix(money): commit the reviewed living plan preview"
```

## Task 5: Explain rebalance consequences before Save

**Files:**

- Create: `src/capabilities/money/domain/moneyRebalanceAnswer.ts`
- Create: `src/capabilities/money/domain/moneyRebalanceAnswer.test.ts`
- Modify: `src/capabilities/money/screens/MoneyCategoryDetailScreen.tsx`
- Modify: `src/capabilities/money/screens/MoneyCategoryDetailScreen.test.tsx`

- [ ] **Step 1: Write failing pure consequence tests**

Use this output contract:

```ts
export type MoneyRebalanceAnswer = {
  state: 'within_unassigned' | 'within_reallocated' | 'over_limit' | 'no_change';
  headlineAmountCents: number;
  movedCents: number;
  protectedAmountsUnchanged: boolean;
  changedCategories: Array<{
    categoryId: string;
    beforeCents: number | null;
    afterCents: number | null;
    deltaCents: number;
  }>;
};
```

Assert a $60 increase funded from unassigned capacity produces `within_unassigned`; a $60 increase that reduces Dining and Shopping produces `within_reallocated` with only changed categories; and an $84 overage produces `over_limit` without claiming protected amounts moved.

- [ ] **Step 2: Run the test and verify failure**

```bash
npm test -- --runInBand src/capabilities/money/domain/moneyRebalanceAnswer.test.ts
```

Expected: FAIL because the projector does not exist.

- [ ] **Step 3: Implement the pure consequence projector**

Derive state from `before.unassignedCents`, `after.overTargetCents`, the edited category delta, and preview changes. Exclude unchanged categories. Sort changes by descending absolute delta and then category id for deterministic output. Return facts, not prose.

- [ ] **Step 4: Replace the current impact box with one consequence**

In `MoneyCategoryDetailScreen.tsx`:

- retain the existing Settings drawer and Save button;
- render one bold headline and one short supporting line from the typed consequence;
- show the visible living percentage and dollar limit in the headline or support line;
- add `See changes` only when another category changes;
- reveal exact before/after values inline in the same drawer;
- pass the displayed ready preview into `updateCategoryPlan` on Save;
- clear the preview whenever name, amount, rhythm, expected amount, or due month changes;
- never show a decorative impact card or unchanged categories.

Use these reviewed templates:

```text
This stays within your 70% living limit.
This uses $60 that was not assigned. No other category changes.
```

```text
This stays within your 70% living limit.
$60 moves from Dining and Shopping. Protected expenses do not change.
```

```text
This puts your plan $84 over its 70% living limit.
Protected amounts stay in place.
```

- [ ] **Step 5: Run the consequence and screen tests**

```bash
npm test -- --runInBand \
  src/capabilities/money/domain/moneyRebalanceAnswer.test.ts \
  src/capabilities/money/screens/MoneyCategoryDetailScreen.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit the rebalance experience**

```bash
git add \
  src/capabilities/money/domain/moneyRebalanceAnswer.ts \
  src/capabilities/money/domain/moneyRebalanceAnswer.test.ts \
  src/capabilities/money/screens/MoneyCategoryDetailScreen.tsx \
  src/capabilities/money/screens/MoneyCategoryDetailScreen.test.tsx
git commit -m "feat(money): explain rebalance consequences"
```

## Task 6: Keep the receipt consistent with the committed answer

**Files:**

- Modify: `src/capabilities/money/domain/living-plan-receipt.ts`
- Modify: `src/capabilities/money/data/livingPlanRepository.ts`
- Modify: `src/capabilities/money/data/livingPlanRepository.test.ts`
- Modify: `src/capabilities/money/screens/MoneyLivingPlanReceiptScreen.tsx`

- [ ] **Step 1: Write failing receipt projection tests**

Extend `LivingPlanReceiptFacts` and assert the repository reads the exact committed version:

```ts
export type LivingPlanReceiptFacts = {
  candidateHash: string;
  livingPercent: number;
  resourceBasisCents: number;
  targetCents: number;
  plannedCents: number;
  unassignedCents: number;
  overTargetCents: number;
  protectedPlanCents: number;
  flexibleCapacityCents: number;
};
```

Assert the returned `candidateHash` equals the preview candidate hash and changed category values match the receipt version components.

- [ ] **Step 2: Run the receipt tests and verify failure**

```bash
npm test -- --runInBand src/capabilities/money/data/livingPlanRepository.test.ts
```

Expected: FAIL because the current receipt query omits these fields/components.

- [ ] **Step 3: Extend the existing receipt read additively**

Select `candidate_hash,living_percent,resource_basis_cents,target_cents,planned_cents,unassigned_cents,over_target_cents` from `budget_living_plan_versions` and `fixed_cents,override_cents,amount_cents` from components. Calculate protected and flexible capacity with the same pure helper used by the answer projector. Do not add a receipt table or persist current spending as historical receipt truth.

- [ ] **Step 4: Update receipt presentation**

Show the committed living percentage, dollar limit, whether the plan fit, and exact changed categories. Keep reversal behavior unchanged. Do not show current flexible spending on an old receipt.

- [ ] **Step 5: Run receipt tests and commit**

```bash
npm test -- --runInBand \
  src/capabilities/money/data/livingPlanRepository.test.ts \
  src/capabilities/money/domain/livingPlan.test.ts
git add \
  src/capabilities/money/domain/living-plan-receipt.ts \
  src/capabilities/money/data/livingPlanRepository.ts \
  src/capabilities/money/data/livingPlanRepository.test.ts \
  src/capabilities/money/screens/MoneyLivingPlanReceiptScreen.tsx
git commit -m "feat(money): reconcile plan receipts with previews"
```

Expected: PASS and commit succeeds.

## Task 7: Provide the one-question recovery path

**Files:**

- Modify: `src/capabilities/money/screens/MoneyTransactionsScreen.test.tsx`
- Modify: `src/capabilities/money/screens/MoneyTransactionDetailScreen.tsx`
- Modify: `src/capabilities/money/screens/MoneyTransactionDetailScreen.test.tsx`

- [ ] **Step 1: Write failing recovery-flow tests**

Using the `reviewTransactionIds` filter added in Task 3, assert the filtered list
opens transaction detail and returns to Budget after the customer chooses
`Flexible spending`, `A protected bill or reserve`, or `Outside the plan`.

- [ ] **Step 2: Run tests and verify failure**

```bash
npm test -- --runInBand \
  src/capabilities/money/screens/MoneyTransactionsScreen.test.tsx \
  src/capabilities/money/screens/MoneyTransactionDetailScreen.test.tsx
```

Expected: FAIL because the economic-role filter/actions do not exist.

- [ ] **Step 3: Reuse existing governed writes for the three choices**

Map choices without adding a new generic questionnaire:

- `Flexible spending` opens the existing category picker with flexible categories first and persists the selected category through the confirmed transaction write.
- `A protected bill or reserve` opens the same picker filtered to active protected allocations.
- `Outside the plan` uses the existing confirmed `markTransactionNotCounted` write.

After the write, refresh the authoritative snapshot and return to `MoneySummary`. Never ask for grocery percentages unless the customer explicitly opens the existing Split action.

- [ ] **Step 4: Return through the existing navigation path**

After a confirmed write, refresh the versioned Money snapshot and use the
existing back path to return to Budget. If another unresolved row still changes
the conclusion, the recomputed answer may offer `Review purchases` again; do
not chain a second question automatically.

- [ ] **Step 5: Run recovery tests and commit**

```bash
npm test -- --runInBand \
  src/capabilities/money/screens/MoneyTransactionsScreen.test.tsx \
  src/capabilities/money/screens/MoneyTransactionDetailScreen.test.tsx
git add \
  src/capabilities/money/screens/MoneyTransactionsScreen.test.tsx \
  src/capabilities/money/screens/MoneyTransactionDetailScreen.tsx \
  src/capabilities/money/screens/MoneyTransactionDetailScreen.test.tsx
git commit -m "feat(money): resolve material budget uncertainty"
```

Expected: PASS and commit succeeds.

## Task 8: Rename the customer-facing destination to Budget and align setup

**Files:**

- Modify: `src/capabilities/registry.ts`
- Modify: `src/capabilities/registry.test.ts`
- Modify: `src/navigation/CapabilityMenu.tsx`
- Modify: `src/navigation/CapabilityMenu.test.tsx`
- Modify: `src/navigation/RootNavigator.tsx`
- Modify: `src/capabilities/money/screens/MoneySummaryScreen.tsx`
- Modify: `src/capabilities/money/screens/MoneySetupScreen.tsx`

- [ ] **Step 1: Write failing copy-contract tests**

Assert the global Money group and screen title say `Budget`, setup finishes with `View Budget`, and internal route/deep-link assertions still use `MoneySummary` and `kwilt://money`.

- [ ] **Step 2: Run the tests and verify current Summary copy fails**

```bash
npm test -- --runInBand \
  src/capabilities/registry.test.ts \
  src/navigation/CapabilityMenu.test.tsx \
  src/capabilities/money/screens/MoneySummaryScreen.test.tsx
```

Expected: FAIL on customer-facing `Summary` expectations.

- [ ] **Step 3: Change copy without route churn**

Read `money-living-limit-answer` once in `RootNavigator` and pass a
`moneyLivingLimitEnabled` boolean into `CapabilityMenu`. Change visible strings
and accessibility labels only when it is enabled:

```ts
label: 'Budget'
title="Budget"
accessibilityLabel="Budget options"
```

Keep `money-summary`, `MoneySummary`, navigator types, linking config, navigation persistence, and shell ownership unchanged.

When the flag is off, the menu and screen say `Summary`, setup says `View Money
summary`, and the legacy current total remains available. When it is on, they
say `Budget` and use the new answer.

On setup completion, show `Your 70% living limit is $3,360.` when `snapshot.livingLimitAnswer?.limitLine` exists; otherwise retain a narrower completion statement and let Budget provide the answer after refresh.

- [ ] **Step 4: Run tests and commit**

```bash
npm test -- --runInBand \
  src/capabilities/registry.test.ts \
  src/navigation/CapabilityMenu.test.tsx \
  src/navigation/capabilityNavigation.test.ts \
  src/navigation/CapabilityShellContext.test.ts \
  src/navigation/linkingConfig.test.ts \
  src/navigation/navigationPersistence.test.ts \
  src/capabilities/money/screens/MoneySummaryScreen.test.tsx
git add \
  src/capabilities/registry.ts \
  src/capabilities/registry.test.ts \
  src/navigation/CapabilityMenu.tsx \
  src/navigation/CapabilityMenu.test.tsx \
  src/navigation/RootNavigator.tsx \
  src/capabilities/money/screens/MoneySummaryScreen.tsx \
  src/capabilities/money/screens/MoneySetupScreen.tsx
git commit -m "refactor(money): name the summary surface Budget"
```

Expected: PASS; no route or persistence snapshots change except visible labels.

## Task 9: Add privacy-safe learning analytics

**Files:**

- Create: `src/capabilities/money/runtime/moneyPlanLimitAnalytics.ts`
- Create: `src/capabilities/money/runtime/moneyPlanLimitAnalytics.test.ts`
- Modify: `src/services/analytics/events.ts`
- Modify: `src/capabilities/money/screens/MoneySummaryScreen.tsx`
- Modify: `src/capabilities/money/screens/MoneyCategoryDetailScreen.tsx`

- [ ] **Step 1: Write failing allowlist tests**

Build event properties and assert their keys are exactly bounded:

```ts
expect(Object.keys(buildMoneyBudgetAnswerViewedProps(input)).sort()).toEqual([
  'freshness_bucket',
  'period_relation',
  'projection_version',
  'state',
]);
expect(JSON.stringify(props)).not.toMatch(/merchant|category|account|amount|income|transaction/i);
```

Cover answer viewed, explanation opened, preview viewed, changes opened, save, cancel, stale rejection, and recovery invoked.

- [ ] **Step 2: Run and verify failure**

```bash
npm test -- --runInBand src/capabilities/money/runtime/moneyPlanLimitAnalytics.test.ts
```

Expected: FAIL because the builders/events do not exist.

- [ ] **Step 3: Implement typed event builders and captures**

Add the feature-brief event names to `AnalyticsEvent`. Export typed builders whose input may contain rich domain objects but whose returned `AnalyticsProps` include only enums, booleans, count buckets, freshness buckets, duration buckets, and policy version. Never pass ids, cents, percentages, merchant/category names, account facts, or receipt prose.

- [ ] **Step 4: Run tests and commit**

```bash
npm test -- --runInBand \
  src/capabilities/money/runtime/moneyPlanLimitAnalytics.test.ts \
  src/capabilities/money/screens/MoneySummaryScreen.test.tsx \
  src/capabilities/money/screens/MoneyCategoryDetailScreen.test.tsx
git add \
  src/services/analytics/events.ts \
  src/capabilities/money/runtime/moneyPlanLimitAnalytics.ts \
  src/capabilities/money/runtime/moneyPlanLimitAnalytics.test.ts \
  src/capabilities/money/screens/MoneySummaryScreen.tsx \
  src/capabilities/money/screens/MoneyCategoryDetailScreen.tsx
git commit -m "feat(money): measure living limit comprehension safely"
```

Expected: PASS.

## Task 10: Add bounded background AI classification

**Files:**

- Create: `supabase/functions/_shared/moneyTransactionClassifier.ts`
- Create: `supabase/functions/_shared/__tests__/moneyTransactionClassifier.test.ts`
- Create: `supabase/functions/classify-money-transactions/index.ts`
- Create: `supabase/functions/classify-money-transactions/__tests__/classificationPolicy.test.ts`
- Modify: `src/capabilities/money/data/moneyRepository.ts`
- Modify: `src/capabilities/money/data/moneyRepository.test.ts`
- Modify: `src/capabilities/money/data/MoneyDataContext.tsx`
- Modify: `src/capabilities/money/data/MoneyDataContext.test.tsx`

- [ ] **Step 1: Write failing prompt and response validation tests**

The prompt input contains only normalized merchant/description text, provider category values, permitted existing category ids/names, and the plan-derived role for each category. It excludes amount, date, account, institution, household, income, and balance.

Use this response contract:

```ts
export type MoneyTransactionClassification = {
  transactionId: string;
  categoryId: string | null;
  economicRole:
    | 'protected_spending'
    | 'flexible_spending'
    | 'not_spending'
    | 'unresolved';
  confidence: 'high' | 'medium' | 'low';
  evidenceKeys: Array<'merchant' | 'provider_primary' | 'provider_detailed'>;
};
```

Assert validation rejects unknown transaction ids, new category ids, `outside_plan`, mismatched category/role pairs, missing evidence keys, duplicate results, and malformed confidence. `outside_plan` remains a customer-governed choice.

- [ ] **Step 2: Run Deno tests and verify failure**

```bash
deno test supabase/functions/_shared/__tests__/moneyTransactionClassifier.test.ts
```

Expected: FAIL because the classifier module does not exist.

- [ ] **Step 3: Implement a deterministic prompt builder and strict validator**

Use a strict JSON schema with `additionalProperties: false`, a maximum of 25 input rows, and only the enumerated roles/evidence keys. The system instruction must say:

```text
Choose only from the supplied category ids and their supplied economic roles.
Do not create a category, merchant rule, split, amount, or outside-plan decision.
Return unresolved when the supplied evidence does not support one allowed choice.
```

Validation—not model confidence—decides whether a result is eligible to persist.

- [ ] **Step 4: Implement the authenticated Edge Function**

`classify-money-transactions/index.ts` must:

1. authenticate with `getAuthenticatedUser`;
2. query at most 25 posted outflows with no allocation, no confirmed/corrected/excluded/merchant-rule source, no category, and no governed assignment;
3. query the user's active categories and active-plan allocations;
4. call OpenAI server-side with strict structured output and a low-cost classification model;
5. validate every result with the shared validator;
6. persist only high-confidence existing-category assignments;
7. condition each update on the row still being unassigned and ungoverned;
8. set `budget_assignment_source = 'ai_classifier'`, `budget_assignment_policy_version = 'money-category-ai-v1'`, `budget_assignment_governed = false`, a bounded confidence, and a generic reason;
9. never persist a rule, split, outside-plan choice, or `not_spending` meaning;
10. return only `{ consideredCount, assignedCount, unresolvedCount }` and never log transaction content.

- [ ] **Step 5: Add stale-write and precedence tests**

Mock a row corrected after classification begins and assert the conditional update affects zero rows. Assert splits, customer corrections, exclusions, merchant rules, and provider-policy assignments are never queried as classifier candidates.

- [ ] **Step 6: Invoke classification off the hot path**

Add `classifyUnresolvedTransactions()` to `MoneyRepository`. In
`MoneyDataContext.initialize`, accept and render the deterministic snapshot
first, then invoke classification without awaiting it. When classification
reports `assignedCount > 0`, increment `mutationVersionRef` and use the existing
`refreshInBackground` path. A classifier failure is swallowed by this optional
background lane and must not change Money status, set the visible error, or
erase the supported answer.

- [ ] **Step 7: Run focused client and Deno tests**

```bash
deno test \
  supabase/functions/_shared/__tests__/moneyTransactionClassifier.test.ts \
  supabase/functions/classify-money-transactions/__tests__/classificationPolicy.test.ts
npm test -- --runInBand \
  src/capabilities/money/data/moneyRepository.test.ts \
  src/capabilities/money/data/MoneyDataContext.test.tsx
```

Expected: PASS.

- [ ] **Step 8: Commit the background classifier**

```bash
git add \
  supabase/functions/_shared/moneyTransactionClassifier.ts \
  supabase/functions/_shared/__tests__/moneyTransactionClassifier.test.ts \
  supabase/functions/classify-money-transactions/index.ts \
  supabase/functions/classify-money-transactions/__tests__/classificationPolicy.test.ts \
  src/capabilities/money/data/moneyRepository.ts \
  src/capabilities/money/data/moneyRepository.test.ts \
  src/capabilities/money/data/MoneyDataContext.tsx \
  src/capabilities/money/data/MoneyDataContext.test.tsx
git commit -m "feat(money): classify unresolved spending in background"
```

## Task 11: Run full verification and native proof

**Files:**

- Modify only if findings require it: `docs/feature-briefs/money-living-limit-answer.md`
- Regenerate: `docs/agent-code-map.md`

- [ ] **Step 1: Run focused Money suites together**

```bash
npm test -- --runInBand \
  src/capabilities/money/domain/moneyEconomicRole.test.ts \
  src/capabilities/money/domain/moneyPlanLimitAnswer.test.ts \
  src/capabilities/money/domain/moneyRebalanceAnswer.test.ts \
  src/capabilities/money/data/moneySnapshot.test.ts \
  src/capabilities/money/data/moneyPlanProjection.test.ts \
  src/capabilities/money/data/livingPlanRepository.test.ts \
  src/capabilities/money/data/MoneyDataContext.test.tsx \
  src/capabilities/money/runtime/livingPlanReconciliation.test.ts \
  src/capabilities/money/runtime/moneyPlanLimitAnalytics.test.ts \
  src/capabilities/money/components/MoneyPlanLimitAnswer.test.tsx \
  src/capabilities/money/screens/MoneySummaryScreen.test.tsx \
  src/capabilities/money/screens/MoneyCategoryDetailScreen.test.tsx \
  src/capabilities/money/screens/MoneyTransactionsScreen.test.tsx \
  src/capabilities/money/screens/MoneyTransactionDetailScreen.test.tsx
```

Expected: PASS.

- [ ] **Step 2: Run Supabase classifier tests**

```bash
deno test \
  supabase/functions/_shared/__tests__/moneyTransactionClassifier.test.ts \
  supabase/functions/classify-money-transactions/__tests__/classificationPolicy.test.ts
```

Expected: PASS.

- [ ] **Step 3: Run the repository completion gate**

```bash
npm run verify:changed -- --run
```

Expected: app typecheck, test typecheck, related Jest, product lint, architecture lint, Supabase function lint, and code-map generation pass. Existing unrelated warnings may remain, but no new error or ratchet regression is allowed.

- [ ] **Step 4: Verify one runtime owner before launching Simulator**

Record the checkout, branch, commit, dirty state, installed binary/build, Metro checkout, and port. Use only this checkout for the proof. Do not infer that an open Simulator is running this branch.

- [ ] **Step 5: Prove the required Simulator states**

Capture evidence for:

- exact current-month answer;
- Costco/Walmart assigned wholly to flexible spending without a split prompt;
- bounded `About` answer;
- one-question zero-crossing state;
- missing basis and stale evidence without `$0` fabrication;
- plan over-limit versus actual flexible-spending overage;
- rebalance using unassigned capacity;
- rebalance moving other flexible categories;
- rebalance over the limit;
- stale preview rejection;
- Save, receipt, return, and matching version/answer;
- past/future month isolation;
- large text reading order and reachable disclosure.

- [ ] **Step 6: Run the TestFlight learning release only after source and Simulator proof**

Keep signed TestFlight proof distinct. Use at least six participants, including low-app-fluency participants, and record whether they can find the limit, explain the answer, distinguish plan room from account balance, predict the rebalance consequence, and complete the flow without coaching.

- [ ] **Step 7: Update the brief only with proven refinements and commit documentation**

If implementation evidence resolved category grouping, materiality, or drawer behavior, replace the corresponding open question with the observed decision and proof boundary. Do not raise job-flow delivery scores from source completion alone.

```bash
npm run agent:map
git add \
  docs/feature-briefs/money-living-limit-answer.md \
  docs/capabilities/money/README.md \
  src/capabilities/money/FEATURE.md \
  docs/agent-code-map.md
git commit -m "docs(money): record living limit proof boundaries"
```

## Self-review result

- Spec coverage: the plan covers comprehensive transaction accounting, exact and bounded answers, mixed merchants, visible limit, progressive disclosure, exact preview/commit, receipt consistency, one-question recovery, Budget naming, setup alignment, privacy-safe analytics, bounded AI, automated verification, Simulator proof, and TestFlight learning.
- Deliberate non-migration: the plan retains eleven category ids for the learning release. The proposed nine groups remain a later presentation-policy experiment because changing taxonomy is not required to prove the answer.
- Type consistency: `MoneyEconomicRoleReconciliation` feeds `MoneyPlanLimitAnswer`; the answer is attached to `MoneySnapshot`; `ReadyLivingPlanOverridePreview` feeds both `MoneyRebalanceAnswer` and the commit API.
- Trust correction: plan allocation overage and actual flexible-spending overage are separate states and copy paths.
- Reduction check: the resting Budget answer remains three elements; review and calculation details reuse existing drawers and transaction routes.
- Placeholder scan: the plan contains no `TBD`, `TODO`, generic error-handling instruction, or undefined implementation task.
