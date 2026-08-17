# Pending Transaction Categorization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make ordinary pending purchases visible, categorized, and counted immediately, while keeping settled status out of Maya's normal workflow and never claiming a transaction is a temporary hold without explicit provider evidence.

**Architecture:** Preserve transaction lifecycle (`pending`) as source metadata, but separate it from the product concepts of category assignment, plan treatment, and current committed spend. Deterministic rules run before bounded AI classification; classification runs after every successful transaction sync and records retry state so unresolved rows cannot starve the queue. Current-period decisions include pending outflows, while completed-period planning evidence and inflows remain posted-only.

**Tech Stack:** React Native / Expo, TypeScript, Jest, Supabase Postgres and Edge Functions, Deno tests, Plaid-backed transaction data.

## Implementation status — 2026-08-17

- Implemented locally: the pending-commitment product contract, current-versus-historical counting predicates, deterministic-first categorization, retry metadata, unified post-sync reconciliation, privacy-safe telemetry, and settlement-free transaction presentation.
- Verified locally: TypeScript source and test typechecks; 14 focused Jest suites with 81 tests; the full repository Jest run; 102 Supabase Deno tests; Deno type checking; product lint; changed-file whitespace checks; and the settlement-free Transactions hierarchy on the booted iPhone 17 Pro Simulator from this checkout.
- Verification still required: local migration replay is blocked until Docker Desktop is running; authenticated pending-to-posted reconciliation and an Amazon-pending-to-Shopping runtime example require the new backend plus a real provider sync; signed-device and TestFlight proof remain separate gates.
- Release checkpoint: the migration and Edge Function have not been deployed. Live Supabase mutation still requires explicit release authorization.
- Implementation note: provider evidence is resolved in the categorization function immediately after the existing governed reconciliation RPC, instead of duplicating that large RPC inside this migration. All successful user-triggered sync paths now use the shared reconciliation coordinator; initialization retains its non-blocking background classification pass so Money can become ready without waiting on automation.
- Repository note: no task commits were created because this checkout already contains unrelated in-progress work and the user did not request staging or publication.

---

## Product contract and scope

- An ordinary pending outflow is a real household commitment. It appears in Transactions, is eligible for categorization, reduces its category, and contributes to the whole-plan answer immediately.
- `pending` is bank lifecycle metadata, not a category, review state, or reason to say `Not counted`.
- Pending inflows do not increase available money in this slice.
- Completed-period history and forecast training use posted rows only; current-period exposure includes pending outflows.
- Explicit user corrections, exclusions, splits, and merchant rules always outrank automated categorization.
- Amount changes and pending-to-posted transitions reconcile quietly and must never count the same economic event twice.
- Do not infer or display `Temporary hold` from merchant name, merchant type, amount, or generic pending status. Hold treatment is excluded until the provider supplies an explicit transaction-level signal or the user explicitly designates the transaction.
- Pending transactions remain ineligible for splitting in this slice because the amount may change. They remain eligible for a single category assignment or `Outside the plan` review.

## UI contract

- **Job:** When Maya checks Money after a purchase, she needs that purchase reflected in the category and amount left so she can trust the next decision.
- **Authority chain:** accepted pending-commitment contract -> existing Kwilt Money transaction composition -> local theme and controls -> iOS/Android accessibility conventions. No external exemplar is needed.
- **Three-second read:** merchant, category or `Needs review`, and amount.
- **Primary action:** open the transaction when Maya needs to correct its meaning.
- **Primary information:** current category/review state and amount.
- **Secondary information:** date and account context.
- **Reveal later:** category correction, money meaning, source description, and split controls on posted transactions.
- **Scan order:** merchant -> category/review state -> amount.
- **Must not add:** pending badges, settlement explanations, heuristic hold copy, new cards, or new user maintenance.
- **Reuse map:** existing transaction rows, review chips, category picker, and local theme tokens; this is a reduction, not a new component family.
- **Nearest precedent:** the current Money transaction inventory, with settlement status removed from hierarchy and category truth promoted.
- **External exemplar ledger:** N/A.
- **Behavior sources:** the accepted brief and the explicit user decisions recorded above.
- **Unresolved decisions:** none for ordinary pending purchases; explicit provider-backed hold evidence is deferred.
- **Required states:** assigned, needs review, outside plan, transfer, pending inflow, sync failure, and pending-to-posted replacement.
- **Proof path:** Transactions -> transaction detail -> category detail -> Summary on iPhone 17 Pro Simulator, followed separately by signed-device and TestFlight proof.

## File map

**Product contract**

- Modify: `docs/feature-briefs/transaction-freshness-trust.md`
- Modify: `docs/capabilities/money/README.md`
- Modify: `src/capabilities/money/FEATURE.md`

**Counting and decision truth**

- Create: `src/capabilities/money/domain/transactionCounting.ts`
- Create: `src/capabilities/money/domain/transactionCounting.test.ts`
- Modify: `src/capabilities/money/data/moneySnapshot.ts`
- Modify: `src/capabilities/money/data/moneySnapshot.test.ts`
- Modify: `src/capabilities/money/domain/moneyEconomicRole.ts`
- Modify: `src/capabilities/money/domain/moneyEconomicRole.test.ts`
- Modify: `src/capabilities/money/domain/living-plan-evidence.ts`
- Modify: `src/capabilities/money/domain/livingPlanEvidence.test.ts`

**Categorization and retry ownership**

- Create with Supabase CLI: `supabase/migrations/<CLI-generated>_pending_transaction_categorization.sql`
- Modify: `supabase/functions/classify-money-transactions/classificationPolicy.ts`
- Modify: `supabase/functions/classify-money-transactions/__tests__/classificationPolicy_deno_test.ts`
- Create: `supabase/functions/_shared/moneyTransactionCategorization.ts`
- Create: `supabase/functions/_shared/__tests__/moneyTransactionCategorization_deno_test.ts`
- Modify: `supabase/functions/_shared/moneyTransactionClassifier.ts`
- Modify: `supabase/functions/_shared/__tests__/moneyTransactionClassifier_deno_test.ts`
- Modify: `supabase/functions/classify-money-transactions/index.ts`

**Sync orchestration and observability**

- Create: `src/capabilities/money/runtime/reconcileConnectedMoneyActivity.ts`
- Create: `src/capabilities/money/runtime/reconcileConnectedMoneyActivity.test.ts`
- Modify: `src/capabilities/money/runtime/moneySummaryAutoRefresh.ts`
- Modify: `src/capabilities/money/runtime/moneySummaryAutoRefresh.test.ts`
- Modify: `src/capabilities/money/data/moneyRepository.ts`
- Modify: `src/capabilities/money/data/moneyRepository.test.ts`
- Modify: `src/capabilities/money/data/MoneyDataContext.tsx`
- Modify: `src/capabilities/money/data/MoneyDataContext.test.tsx`
- Modify: `src/services/analytics/events.ts`
- Create: `src/capabilities/money/runtime/moneyClassificationTelemetry.ts`
- Create: `src/capabilities/money/runtime/moneyClassificationTelemetry.test.ts`

**Presentation**

- Modify: `src/capabilities/money/screens/MoneyTransactionsScreen.tsx`
- Modify: `src/capabilities/money/screens/MoneyTransactionsScreen.test.tsx`
- Modify: `src/capabilities/money/screens/MoneyCategoryDetailScreen.tsx`
- Modify: `src/capabilities/money/screens/MoneyCategoryDetailScreen.test.tsx`
- Modify: `src/capabilities/money/screens/MoneyTransactionDetailScreen.tsx`
- Modify: `src/capabilities/money/screens/MoneyTransactionDetailScreen.test.tsx`

## Task 1: Record the accepted trust contract

- [ ] In `docs/feature-briefs/transaction-freshness-trust.md`, add a section named `Pending commitment contract` with the product contract above.
- [ ] Replace the existing requirement to show pending/posted status on every transaction row with category/review-first metadata.
- [ ] Add acceptance criteria for a pending Amazon purchase appearing in Shopping and reducing the current-period answer immediately.
- [ ] Add an explicit exclusion: no hold inference or `Temporary hold` copy without a provider-backed transaction-level signal.
- [ ] Update `last_updated` to `2026-08-17`.
- [ ] Ensure the Money README and feature manifest still link to the brief; update their current proof boundary to say this behavior is planned until runtime proof exists.
- [ ] Run:

```bash
npm run product:lint
```

Expected: product taxonomy and feature-manifest links pass.

- [ ] Commit only the documentation paths:

```bash
git add docs/feature-briefs/transaction-freshness-trust.md docs/capabilities/money/README.md src/capabilities/money/FEATURE.md
git commit -m "docs(money): define pending commitment contract"
```

## Task 2: Separate current commitments from posted history

This is the core correctness change. Do not globally replace every `!pending` check; each consumer must choose current commitment truth or posted historical evidence deliberately.

- [ ] Write failing unit tests in `transactionCounting.test.ts` for these rules:

```ts
expect(isCommittedOutflow(pendingPurchase)).toBe(true);
expect(isPostedOutflow(pendingPurchase)).toBe(false);
expect(isCommittedOutflow(internalTransfer)).toBe(false);
expect(isCommittedOutflow(outsidePlanPurchase)).toBe(false);
```

- [ ] Add the two explicit predicates in `transactionCounting.ts`:

```ts
export function isCommittedOutflow(transaction: CountableMoneyTransaction): boolean {
  return transaction.direction === 'outflow'
    && transaction.moneyMeaning !== 'transfer'
    && transaction.moneyMeaning !== 'internal_transfer'
    && transaction.moneyMeaning !== 'not_counted';
}

export function isPostedOutflow(transaction: CountableMoneyTransaction): boolean {
  return !transaction.pending && isCommittedOutflow(transaction);
}
```

- [ ] Run the focused test and confirm it fails before implementation, then passes after implementation:

```bash
npx jest src/capabilities/money/domain/transactionCounting.test.ts --runInBand
```

- [ ] In `moneySnapshot.test.ts`, add regression fixtures proving:
  - an assigned pending Shopping purchase increases `spentCents` and reduces `remainingCents`;
  - an uncategorized pending outflow becomes `needs_review`, not `not_counted`;
  - pending inflow credit does not increase category room;
  - transfer and explicit `Outside the plan` treatment stay excluded;
  - the same posted transaction replaces its pending form without two projected contributions when the provider inventory contains the reconciled result.
- [ ] In `moneySnapshot.ts`, use `isCommittedOutflow` for current-period category spend, outside-plan/review totals, current reserve drawdown, and transaction review state. Keep category credits posted-only.
- [ ] Do not use `pending` as a fallback reason for `not_counted`.
- [ ] Run:

```bash
npx jest src/capabilities/money/data/moneySnapshot.test.ts --runInBand
```

Expected: all snapshot tests pass, including the new pending cases.

- [ ] In `moneyEconomicRole.test.ts`, first change the current pending fixture expectation so an assigned pending purchase contributes to its protected or flexible role and an unresolved pending purchase contributes to `unresolvedInScopeCents`.
- [ ] In `moneyEconomicRole.ts`, remove pending status from the `not_spending` branch. Preserve transfer and supported provider payment evidence as neutral.
- [ ] In `livingPlanEvidence.test.ts`, add a regression test with two posted historical purchases and one current pending purchase. Assert that historical support remains the median of posted months while current `exposureCents` includes the pending purchase.
- [ ] In `living-plan-evidence.ts`, derive two collections:

```ts
const validRows = input.transactions.filter(isValidEvidenceRow);
const postedRows = validRows.filter((row) => !row.pending);
const currentCommittedOutflows = validRows.filter((row) =>
  row.direction === 'outflow' && row.moneyMeaning !== 'not_counted'
);
```

Use `postedRows` for income sources, completed-period guideposts, confidence, and historical evidence. Use current committed outflows only for current-period exposure. Keep the evidence hash explicit about which rows affect planning so a pending amount change refreshes the current answer without becoming historical training evidence.

- [ ] Run:

```bash
npx jest \
  src/capabilities/money/domain/moneyEconomicRole.test.ts \
  src/capabilities/money/domain/livingPlanEvidence.test.ts \
  --runInBand
```

- [ ] Commit the counting slice with exact paths.

## Task 3: Make pending rows eligible for deterministic-first categorization

- [ ] Run `npx supabase --help` and `npx supabase migration new --help` before creating the migration.
- [ ] Create the migration through the CLI, not by inventing a timestamp:

```bash
npx supabase migration new pending_transaction_categorization
```

- [ ] In the CLI-generated migration, update the governed provider-category reconciliation so `HIGH` and `VERY_HIGH` provider mappings apply to eligible pending outflows as well as posted outflows. Preserve the precedence exclusions for user corrections, explicit exclusions, allocations, and merchant rules.
- [ ] Add internal retry fields to `budget_transactions`:

```sql
classification_attempted_at timestamptz,
classification_attempt_count integer not null default 0,
classification_next_retry_at timestamptz,
classification_policy_version text,
classification_last_outcome text
```

Add a constraint for the allowed non-sensitive outcomes (`assigned`, `unresolved`, `retryable_failure`) and an owner-scoped candidate index. These fields are operational metadata, not user-facing truth.

- [ ] Review the migration's RLS and privileges. It must not widen direct client access; existing owner-scoped transaction policies remain authoritative.
- [ ] In `classificationPolicy_deno_test.ts`, change the pending candidate assertion first:

```ts
if (!isMoneyClassifierCandidate({ ...base, pending: true })) {
  throw new Error('pending unresolved outflow should be eligible');
}
```

- [ ] In `classificationPolicy.ts`, remove pending status from candidacy. Keep direction, explicit assignment, user review, governed assignment, and allocation precedence intact.
- [ ] Create `moneyTransactionCategorization.ts` as a pure resolver with this precedence:
  1. provider mapping already applied by governed reconciliation;
  2. exact household merchant rule already applied by database trigger/RPC;
  3. household merchant history only when at least two posted prior transactions normalize to the same merchant and 100% resolve to one active category;
  4. AI only for the remaining candidates.
- [ ] The pure resolver should return a reason code and confidence without merchant text:

```ts
type DeterministicCategoryDecision =
  | { outcome: 'assigned'; categoryId: string; source: 'merchant_history'; confidence: 'high'; reasonCode: 'consistent_household_history' }
  | { outcome: 'unresolved'; reasonCode: 'insufficient_evidence' };
```

- [ ] Write Deno tests for Amazon-like merchant history, conflicting history, inactive categories, explicit higher-precedence treatment, and pending candidates.
- [ ] Update `classify-money-transactions/index.ts` to:
  - run governed provider reconciliation before reading residual candidates;
  - fetch a stable ordered candidate page using attempt count, retry time, date, and id;
  - apply consistent household merchant history before calling AI;
  - send no amount, account, mask, user identity, or raw provider payload to AI;
  - send at most 25 residual candidates to AI;
  - assign only high-confidence allowed categories;
  - update retry metadata for every considered row;
  - use bounded backoff for unresolved or retryable rows so never-attempted rows advance;
  - re-check all higher-precedence conditions in each conditional update to prevent a background classifier from overwriting a user action.
- [ ] Bump the policy version to a new explicit value such as `money-category-v2`; the exact value must be used consistently by the migration, function, tests, and receipt.
- [ ] Extend the receipt:

```ts
type MoneyClassificationReceipt = {
  policyVersion: string;
  consideredCount: number;
  deterministicAssignedCount: number;
  aiAssignedCount: number;
  unresolvedCount: number;
  retryableCount: number;
};
```

- [ ] Run all classifier tests:

```bash
deno test \
  supabase/functions/classify-money-transactions/__tests__/classificationPolicy_deno_test.ts \
  supabase/functions/_shared/__tests__/moneyTransactionCategorization_deno_test.ts \
  supabase/functions/_shared/__tests__/moneyTransactionClassifier_deno_test.ts
```

Expected: all Deno tests pass with no network access required.

- [ ] Run the migration locally and inspect the diff before any remote push:

```bash
npx supabase db reset
npx supabase migration list
```

Expected: local reset succeeds and the new migration is present exactly once.

- [ ] Commit only the generated migration and classifier paths.

## Task 4: Reconcile after every successful connected-activity sync

- [ ] Create regression-first tests in `reconcileConnectedMoneyActivity.test.ts` for this order:

```ts
await syncMoneyTransactions(client);
await repository.ensureGovernedPlanFoundation();
await repository.classifyUnresolvedTransactions();
await reconcileLivingPlan(client, 'sync_evidence_changed');
await refreshSnapshot();
```

The test must also prove classification failure does not erase the last trustworthy snapshot, while still returning a privacy-safe failure receipt for telemetry.

- [ ] Implement `reconcileConnectedMoneyActivity.ts` as the single coordinator for initialization refresh, manual check, account connection completion, and stale Summary refresh. Keep the classifier optional to the visible load, but never silently omit its result.
- [ ] Replace the one-time, initialization-only classification call in `MoneyDataContext.tsx` with this coordinator.
- [ ] Refactor `moneySummaryAutoRefresh.ts` and every successful Money sync caller to use the same coordinator rather than duplicating partial sequences.
- [ ] Extend `MoneyRepository.classifyUnresolvedTransactions()` validation for the new receipt, including `policyVersion` and non-negative integer counts.
- [ ] Add a privacy-safe analytics adapter. Allowed properties are trigger, outcome, policy version, and aggregate counts. Merchant names, descriptions, amounts, account identifiers, masks, and category names are forbidden.
- [ ] Add unit tests that reject or omit non-allowlisted telemetry properties.
- [ ] Run:

```bash
npx jest \
  src/capabilities/money/runtime/reconcileConnectedMoneyActivity.test.ts \
  src/capabilities/money/runtime/moneySummaryAutoRefresh.test.ts \
  src/capabilities/money/data/moneyRepository.test.ts \
  src/capabilities/money/data/MoneyDataContext.test.tsx \
  src/capabilities/money/runtime/moneyClassificationTelemetry.test.ts \
  --runInBand
```

- [ ] Commit only the orchestration, repository, context, analytics-event, and telemetry paths.

## Task 5: Remove settlement status from the normal transaction experience

- [ ] Add screen regressions before changing UI:
  - a pending Amazon row assigned to Shopping renders `Shopping` and no `Pending` or `Not counted` copy;
  - a pending unresolved outflow renders `Needs review`;
  - a pending assigned row in category detail shows its account name, not settlement status;
  - transaction detail does not elevate `Pending` as a hero label;
  - no transaction screen renders `Temporary hold`.
- [ ] In `MoneyTransactionsScreen.tsx`, derive the chip only from review state. Remove the `Pending` filter from the visible filter list and type if it has no remaining caller. Preserve the underlying `pending` field in the model.
- [ ] In `MoneyCategoryDetailScreen.tsx`, show `Needs review` when required; otherwise show the account name.
- [ ] In `MoneyTransactionDetailScreen.tsx`, remove the standalone pending label. Keep single-category review available for pending outflows and keep split controls unavailable until posting.
- [ ] Do not add explanatory settlement copy elsewhere. Freshness remains a list/account-level concept owned by the existing freshness brief.
- [ ] Run:

```bash
npx jest \
  src/capabilities/money/screens/MoneyTransactionsScreen.test.tsx \
  src/capabilities/money/screens/MoneyCategoryDetailScreen.test.tsx \
  src/capabilities/money/screens/MoneyTransactionDetailScreen.test.tsx \
  --runInBand
```

- [ ] Commit only the three screen/test pairs.

## Task 6: Prove pending-to-posted reconciliation before promotion

The checked-in repository does not currently contain the deployed `sync-plaid-transactions` function source, so do not claim or patch deduplication by inference.

- [ ] In the linked non-production Supabase project, capture an owner-scoped test transaction lifecycle:
  1. pending purchase arrives;
  2. pending purchase is categorized and counted;
  3. provider marks it posted or replaces it through `pending_transaction_id` semantics;
  4. amount changes if the provider supplies a final amount;
  5. only one economic contribution remains in the projected snapshot.
- [ ] Query only the test user's rows and verify there is no simultaneous counted pending/posted duplicate.
- [ ] If this fails, stop promotion. Restore the exact deployed sync source into the repository and create a separate regression-first repair plan; do not hide the defect in snapshot heuristics.
- [ ] Record proof level precisely: automated, local Supabase, authenticated Simulator, signed device, TestFlight, and production are separate gates.

## Task 7: Verify locally and visually

- [ ] Run focused logic and UI suites together:

```bash
npx jest \
  src/capabilities/money/domain/transactionCounting.test.ts \
  src/capabilities/money/data/moneySnapshot.test.ts \
  src/capabilities/money/domain/moneyEconomicRole.test.ts \
  src/capabilities/money/domain/livingPlanEvidence.test.ts \
  src/capabilities/money/runtime/reconcileConnectedMoneyActivity.test.ts \
  src/capabilities/money/data/moneyRepository.test.ts \
  src/capabilities/money/data/MoneyDataContext.test.tsx \
  src/capabilities/money/screens/MoneyTransactionsScreen.test.tsx \
  src/capabilities/money/screens/MoneyCategoryDetailScreen.test.tsx \
  src/capabilities/money/screens/MoneyTransactionDetailScreen.test.tsx \
  --runInBand
```

- [ ] Run the repository's diff-aware completion gate:

```bash
npm run verify:changed -- --run
```

- [ ] Because shared Money stores/services changed, run the full Jest suite:

```bash
npm test -- --runInBand
```

- [ ] In the iPhone 17 Pro Simulator, using one explicitly recorded checkout/branch/commit and Metro port, verify:
  - a pending Amazon purchase displays Shopping without a pending badge;
  - the same amount reduces Shopping and whole-plan flexible money immediately;
  - a pending unknown purchase says `Needs review`, not `Not counted`;
  - explicit `Outside the plan`, transfers, and pending inflows remain correct;
  - a manual activity check triggers categorization and refreshes the visible snapshot;
  - there is no `Temporary hold` copy anywhere.
- [ ] Capture screenshots of Transactions, Shopping detail, transaction detail, and Summary using the same test rows and compare the amounts across surfaces.

## Task 8: Deploy only after explicit release authorization

- [ ] Before remote mutation, inspect `supabase/config.toml`, the current Supabase CLI changelog/help, linked-project status, and migration diff.
- [ ] Ask Andrew for explicit authorization to push the migration and deploy `classify-money-transactions`.
- [ ] After authorization, push the reviewed migration and deploy the function with the required secret configured.
- [ ] Confirm the deployed function list contains `classify-money-transactions` and smoke-test it with an authenticated non-production user.
- [ ] Run Supabase security and performance advisors. Resolve findings caused by this migration before promotion.
- [ ] Repeat the Amazon pending -> Shopping -> counted -> posted lifecycle on a signed device, then in TestFlight before calling the behavior shipped.
- [ ] Update `transaction-freshness-trust.md`, the Money README/manifest proof boundary, and the Maya job-flow delivery evidence only to the proof level actually observed.

## Release acceptance checklist

- [ ] Pending outflows are visible and count immediately.
- [ ] Pending rows are categorized by the same precedence rules as posted rows.
- [ ] User corrections, exclusions, splits, and merchant rules cannot be overwritten.
- [ ] Current answers include pending outflows; historical plan learning excludes them.
- [ ] Pending inflows do not increase available money.
- [ ] Settlement status is not promoted in routine transaction UI.
- [ ] No `Temporary hold` claim exists without explicit provider-backed evidence.
- [ ] Classification runs after successful sync and unresolved rows cannot starve indefinitely.
- [ ] Classification failures are observable without exposing financial details or blocking the last trustworthy Money view.
- [ ] Pending-to-posted reconciliation is proven against the real sync path with no double count.
- [ ] Automated, Simulator, signed-device, TestFlight, and production proof are reported separately.
