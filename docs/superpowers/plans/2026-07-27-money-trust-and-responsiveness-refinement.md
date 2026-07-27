# Money Trust And Responsiveness Refinement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `executing-plans` to implement this plan task-by-task. Do not dispatch subagents unless Andrew explicitly asks for parallel agent work. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the observed Money account, category, transaction-source, and save/reclassification flows readable, semantically truthful, and immediately responsive without weakening authoritative financial persistence.

**Architecture:** Keep Supabase as the authoritative source, but stop coupling every bounded confirmed write to a blocking reload of the complete Money snapshot. Add small pure presentation/error contracts and split mutations into two explicit paths: transaction classification, category identity, and rollover changes may use server acknowledgements plus confirmed local patches followed by versioned background refresh; governed Monthly/Reserve changes must consume an authoritative targeted plan projection because reconciliation may change multiple categories and create a receipt. Preserve transaction meaning as separate from category assignment and use conservative source classification: a card-shaped visual is shown only when the imported evidence supports a credit/debit-card source.

**Tech Stack:** React Native, Expo SDK 54, TypeScript, Jest, Supabase/Postgres, Supabase Edge Functions, Plaid, `HapticsService`, React Navigation.

---

## Execution Baseline And Boundaries

- Implement from the normal checkout at merged `main` commit `85bb938` or later. The completed consolidation merged native PRs #110–#113 and companion Money PR #8; `85bb938` contains `02f2133`, including the governed Monthly/Reserve editor shown in screenshot 4.
- Before editing, confirm the checkout is clean and reread every affected file. Do not create another worktree unless Andrew explicitly chooses parallel implementation that cannot safely share the checkout.
- The consolidation proved source, Git integration, and the full native test suite (330 suites / 2,315 tests). It did not provide simulator, signed-device, live Plaid, or TestFlight proof; those remain separate gates for this work.
- The normal Kwilt checkout is the only native worktree and is exactly synchronized with `origin/main` at the baseline. The untracked plan is intentional. Dirty companion Kwilt Budget checkouts are outside this native implementation lane and must not be modified incidentally.
- This is a bounded refinement of existing Money surfaces. It is already grounded in:
  - `docs/job-flows/maya-review-budget-reality-before-spending.md`
  - `docs/jtbd/move-the-few-things-that-matter/review-budget-reality-before-spending.md`
  - `docs/feature-briefs/transaction-freshness-trust.md`
  - `docs/feature-briefs/budget-credits-and-income-classification.md`
  - `docs/feature-briefs/category-budget-planning.md`
- Do not turn this into a new finance dashboard, category-group administration system, or blanket animation/haptics pass.

## What The Investigation Established

1. **Account connection error:** production Edge Function logs show `create-plaid-link-token` returned HTTP `400` at `2026-07-27 09:23:36 MDT`, matching screenshot 1, after `808 ms`. The deployed function returns a structured body containing `error`, `plaid.error_code`, `plaid.error_message`, and `plaid.request_id`, but `moneyPlaidApi.ts` throws only `error.message`, which becomes `Edge Function returned a non-2xx status code`. `MoneyAccountsScreen.tsx` then truncates it to one line.
2. **Underlying Plaid rejection:** the request reached version 14 of the function and Plaid rejected `/link/token/create`. Current logs do not include the response body, so the precise Plaid configuration/request defect is not yet proven. Capture `plaid.error_code` on the next reproduction before changing Plaid configuration.
3. **Category picker semantics:** `Internal transfer` exists only for inflows. Outflows get a single `No budget category` command. This conflicts with the existing Money-meaning model, where transfers are distinct from not-counted activity.
4. **Category picker density:** the generic `Input` renders an external label and elevated medium field. Each category also renders a decorative rounded-square color thumbnail even though category names already carry the recognizable label/emoji.
5. **Payment-source visual:** every outflow renders inside `paymentCard`; `getPaymentSourceKind()` changes only the icon. A checking-account transfer therefore still looks like a credit card. The palette is a hash of account ID/name and has no institution brand contract, which explains brown Chase.
6. **Save latency:** category Save always calls `renameCategory()` first. That write triggers a complete paginated snapshot reload, after which the flow previews/reconciles the plan and triggers another complete reload. Even an unchanged name pays this cost.
7. **Reclassification latency:** transaction review waits for the database mutation and a complete snapshot reload before the picker closes. With 1,869 transactions visible in screenshot 1, the reload is material.
8. **Feedback:** `Button` already emits a default selection haptic, but Money's direct `Pressable` rows do not. There is no semantic success/error haptic at mutation completion, and `MoneySummaryScreen` bypasses the centralized haptics service.

## UI Decision

**Anchor principle:** A Money correction should feel like calmly telling Kwilt what is true, and the app should acknowledge that choice immediately without exposing provider jargon or pretending an unconfirmed write succeeded.

References already captured in Money's design work:

- **Copilot transaction types:** separates Regular, Income, and Internal Transfer from category assignment. Translate the separation; do not copy a full finance taxonomy.
- **Monarch transaction rules/categories:** demonstrates durable classification and correction rules. Translate reversibility; do not add group-management weight here.
- **Rocket Money income/refund guidance:** treats internal transfers separately and sends refunds back to category truth. Translate the practical language; do not copy reporting surfaces.

Three plausible directions:

1. **Flat mixed list:** put categories, Income, Internal transfer, and Outside the plan in one list. Compact, but categories and money meanings look equivalent and become harder to scan.
2. **Type first:** ask `Category or other movement?`, then show a second screen. Semantically clean, but adds a step to the overwhelmingly common category correction.
3. **Contextual compact picker — chosen:** show a compact search and category list first, followed by a quiet `Other money movement` section containing only direction-relevant meanings. Remove the decorative thumbnail and keep labels/consequences explicit.

**Recommendation:** Direction 3. The bet is that the dominant category-picker problem is excess visual/semantic furniture, not missing navigation. If people still choose the wrong meaning, the next move is consequence preview—not a deeper taxonomy.

## Target Interaction Contract

| Moment | Immediate response | While authoritative work runs | Completion | Failure |
| --- | --- | --- | --- | --- |
| Open category picker | selection haptic; drawer opens | none | none | none |
| Choose category/meaning | selection haptic; row shows pending check immediately | disable only the chosen mutation, keep screen responsive | close picker, update local confirmed view, success haptic; refresh full truth in background | restore prior value, keep/reopen picker with readable inline error, error haptic |
| Save category settings | button press feedback immediately | show `Saving…` and spinner when work exceeds 150 ms | for identity/rollover, apply a confirmed patch; for Monthly/Reserve, close only after the authoritative targeted plan projection and receipt are accepted; success haptic | keep drawer/drafts, readable error, error haptic |
| Connect account | selection haptic; `Opening secure connection…` visible on its own row | keep existing accounts visible | success copy and success haptic | two-line recovery copy and error haptic; never show raw provider exception |

Performance targets for these observed flows:

- tactile/pressed acknowledgement: under 100 ms;
- pending visual state: under 150 ms;
- ordinary transaction classification database acknowledgement: target under 750 ms p50 and under 2 s p95;
- no full-history transaction snapshot reload on the blocking path after a bounded confirmed write or governed plan commit;
- if any operation exceeds 2 s, its pending state remains explicit and cancellable only when cancellation is safe.

### Task 1: Capture The Plaid Failure And Establish User-Safe Error Contracts

**Files:**
- Create: `src/capabilities/money/data/moneyPlaidErrors.ts`
- Create: `src/capabilities/money/data/moneyPlaidErrors.test.ts`
- Modify: `src/capabilities/money/data/moneyPlaidApi.ts`
- Modify: `src/capabilities/money/data/moneyPlaidApi.test.ts`
- Modify: `src/capabilities/money/screens/MoneyAccountsScreen.tsx`
- Create/port: `supabase/functions/create-plaid-link-token/index.ts`
- Create/port: `supabase/functions/_shared/plaid.ts`
- Create/port as needed after exact deployed comparison: `supabase/functions/_shared/cors.ts`, `supabase/functions/_shared/supabase.ts`
- Modify: `supabase/config.toml`

- [ ] **Step 1: Add failing client-error tests before changing behavior**

Cover structured HTTP errors, expired auth, relay/network errors, and unknown errors. The public contract should be:

```ts
export type MoneyPlaidError = Error & {
  code: 'auth' | 'institution_unavailable' | 'configuration' | 'network' | 'unknown';
  diagnosticCode?: string;
  requestId?: string;
};

export async function normalizeMoneyPlaidError(
  error: unknown,
  operation: 'link_token' | 'exchange' | 'sync',
): Promise<MoneyPlaidError>;
```

Expected user messages:

```ts
auth: 'Your session expired. Sign in again, then reconnect the account.'
institution_unavailable: 'Your bank is temporarily unavailable. Try again in a few minutes.'
configuration: 'Kwilt could not start a secure bank connection. Try again, and contact support if it continues.'
network: 'Kwilt could not reach the bank connection service. Check your connection and try again.'
unknown: 'Kwilt could not start the bank connection. Try again.'
```

- [ ] **Step 2: Run the focused test and verify the raw-message behavior fails**

Run:

```bash
npx jest src/capabilities/money/data/moneyPlaidErrors.test.ts --runInBand
```

Expected: FAIL because `normalizeMoneyPlaidError` does not exist.

- [ ] **Step 3: Parse `FunctionsHttpError.context` without leaking Plaid payloads into UI**

Use current Supabase's documented error classes:

```ts
import {
  FunctionsFetchError,
  FunctionsHttpError,
  FunctionsRelayError,
} from '@supabase/supabase-js';

type FunctionErrorBody = {
  error?: string;
  plaid?: { error_code?: string; error_message?: string; request_id?: string };
};
```

For `FunctionsHttpError`, clone/parse `error.context`, map stable error codes, and return only the safe message. Retain `diagnosticCode` and `requestId` for privacy-safe diagnostics. Do not return Plaid's free-form `error_message` to the screen.

- [ ] **Step 4: Preserve the structured error from every Plaid API call**

Replace `throw new Error(error.message)` in all three API methods with:

```ts
if (error) throw await normalizeMoneyPlaidError(error, 'link_token');
```

Use the corresponding operation for exchange and sync.

- [ ] **Step 5: Make the account status readable and recoverable**

In `MoneyAccountsScreen.tsx`, replace the single truncating `freshnessRow` error placement with a dedicated status block:

```tsx
{connectionMessage ? (
  <View accessibilityLiveRegion="polite" style={styles.connectionStatus}>
    <Icon name={connectionTone === 'error' ? 'warning' : 'refresh'} size={15} color={connectionTone === 'error' ? colors.madder600 : colors.textSecondary} />
    <Text style={[styles.connectionStatusText, connectionTone === 'error' ? styles.connectionStatusError : null]}>
      {connectionMessage}
    </Text>
  </View>
) : null}
```

Allow two lines, keep the account inventory visible, and provide `Try again` only for a failed link-token start. Do not render the diagnostic code unless a debug/support affordance is explicitly added later.

- [ ] **Step 6: Canonicalize the deployed function source in the host repo**

Retrieve deployed version 14 and compare it byte-for-byte with `/Users/andrewwatanabe/Documents/Kwilt Budget/supabase/functions/create-plaid-link-token/index.ts`. Port the deployed source and relative dependencies into Kwilt. Add:

```toml
[functions.create-plaid-link-token]
verify_jwt = true
```

Do not deploy during this task until the next reproduction proves the Plaid error code.

- [ ] **Step 7: Capture the precise Plaid rejection on the next reproduction**

Add privacy-safe server logging immediately before returning the Plaid failure:

```ts
console.error('[create-plaid-link-token] plaid rejected request', {
  errorCode: plaidJson.error_code,
  errorType: plaidJson.error_type,
  requestId: plaidJson.request_id,
  environment,
});
```

Never log tokens, account data, user IDs, institution names, or full payloads. Reproduce once, read the Edge Function log, state a single root-cause hypothesis from the captured code, then apply the smallest request/configuration correction. Examples are not interchangeable: redirect-URI, product, environment, and credentials errors require different fixes.

- [ ] **Step 8: Verify locally and against the deployed boundary**

Run:

```bash
npx jest src/capabilities/money/data/moneyPlaidErrors.test.ts src/capabilities/money/data/moneyPlaidApi.test.ts --runInBand
npx supabase functions serve create-plaid-link-token --env-file supabase/.env.local
```

Expected: unit tests PASS; local function returns structured JSON for success/error. After approved deployment, live link-token start returns 2xx or a readable recovery message with a logged diagnostic code.

- [ ] **Step 9: Commit the isolated error/diagnostic slice**

```bash
git add src/capabilities/money/data/moneyPlaidErrors.ts src/capabilities/money/data/moneyPlaidErrors.test.ts src/capabilities/money/data/moneyPlaidApi.ts src/capabilities/money/data/moneyPlaidApi.test.ts src/capabilities/money/screens/MoneyAccountsScreen.tsx supabase/functions/create-plaid-link-token supabase/functions/_shared supabase/config.toml
git commit -m "fix(money): surface recoverable Plaid connection errors"
```

### Task 2: Reduce And Clarify The Category Picker

**Files:**
- Create: `src/capabilities/money/domain/transactionMeaningOptions.ts`
- Create: `src/capabilities/money/domain/transactionMeaningOptions.test.ts`
- Modify: `src/capabilities/money/screens/MoneyTransactionDetailScreen.tsx`

- [ ] **Step 1: Write failing tests for direction-relevant non-category options**

Define the exact contract:

```ts
export type TransactionMeaningOption = {
  meaning: 'income' | 'transfer' | 'not_counted';
  label: string;
  detail: string;
};

expect(getTransactionMeaningOptions('outflow')).toEqual([
  { meaning: 'transfer', label: 'Internal transfer', detail: 'Money moved between your accounts' },
  { meaning: 'not_counted', label: 'Outside the plan', detail: 'Do not count this as spending or income' },
]);

expect(getTransactionMeaningOptions('inflow')).toEqual([
  { meaning: 'income', label: 'Income', detail: 'Available to fund the plan' },
  { meaning: 'transfer', label: 'Internal transfer', detail: 'Money moved between your accounts' },
  { meaning: 'not_counted', label: 'Outside the plan', detail: 'Do not count this as spending or income' },
]);
```

- [ ] **Step 2: Run the focused test and verify it fails**

```bash
npx jest src/capabilities/money/domain/transactionMeaningOptions.test.ts --runInBand
```

Expected: FAIL because the helper is not implemented.

- [ ] **Step 3: Implement the pure option helper and use it for both inflows and outflows**

Keep category choice as the dominant list. Add a small section label after categories:

```tsx
<Text style={styles.secondarySectionLabel}>OTHER MONEY MOVEMENT</Text>
{getTransactionMeaningOptions(transaction.direction).map((option) => (
  <CategoryCommand key={option.meaning} {...option} selected={transaction.moneyMeaning === option.meaning} />
))}
```

For outflow `not_counted`, continue to use the current audited exclusion mutation. For inflow, use `reviewTransactionMeaning`. Update `getCategoryRelationLabel()` to return `Outside the plan` instead of `No budget category`.

- [ ] **Step 4: Remove the category thumbnail**

Delete `styles.categoryIcon` and `styles.categoryDotLarge`, and render no leading decorative container in category rows. Preserve the category name/emoji, remaining amount, selected check, and 44-point minimum touch target.

- [ ] **Step 5: Replace the large labeled search field with a compact search control**

Use the existing Input affordances:

```tsx
<Input
  accessibilityLabel="Search categories"
  autoCapitalize="none"
  elevation="flat"
  leadingIcon="search"
  placeholder="Search categories"
  returnKeyType="search"
  size="sm"
  variant="filled"
  value={categoryQuery}
  onChangeText={setCategoryQuery}
/>
```

Do not pass `label`; the placeholder and accessibility label carry the job without the extra vertical block.

- [ ] **Step 6: Add empty-search and accessibility behavior**

When no category matches, show `No categories match “query”` and keep `Create “query”` available. Ensure every meaning row has an accessibility hint describing its consequence.

- [ ] **Step 7: Verify the picker**

Run:

```bash
npx jest src/capabilities/money/domain/transactionMeaningOptions.test.ts --runInBand
npm run lint
```

Simulator checks:

- ordinary outflow: compact category list, no thumbnail, `Internal transfer`, `Outside the plan`;
- inflow: `Income`, categories (as category-credit choices), `Internal transfer`, `Outside the plan`;
- search: keyboard does not hide the selected/creation action and empty results are readable;
- Dynamic Type and VoiceOver: names, balances, and consequences remain understandable.

- [ ] **Step 8: Commit the picker slice**

```bash
git add src/capabilities/money/domain/transactionMeaningOptions.ts src/capabilities/money/domain/transactionMeaningOptions.test.ts src/capabilities/money/screens/MoneyTransactionDetailScreen.tsx
git commit -m "refactor(money): simplify transaction category choices"
```

### Task 3: Give Card And Bank Transactions Different Visual Grammar

**Files:**
- Create: `src/capabilities/money/domain/paymentSourcePresentation.ts`
- Create: `src/capabilities/money/domain/paymentSourcePresentation.test.ts`
- Modify: `src/capabilities/money/data/moneySnapshot.ts`
- Modify: `src/capabilities/money/data/moneySnapshot.test.ts`
- Modify: `src/capabilities/money/data/moneyRepository.ts`
- Modify: `src/capabilities/money/screens/MoneyTransactionDetailScreen.tsx`
- Create with `npx supabase migration new add_budget_transaction_payment_source_evidence` if required by captured source evidence; use the exact path printed by the CLI in the implementation commit.
- Create/port the canonical Plaid import source after Task 1 ownership is established: `supabase/functions/_shared/plaid-sync.ts`

- [ ] **Step 1: Write the failing presentation tests**

Use a conservative output type:

```ts
export type PaymentSourcePresentation =
  | { kind: 'credit_card' | 'debit_card'; palette: InstitutionPalette }
  | { kind: 'bank_account'; railLabel: string; palette: InstitutionPalette }
  | { kind: 'deposit'; railLabel: string; palette: InstitutionPalette }
  | { kind: 'account'; palette: InstitutionPalette };
```

Required fixtures:

```ts
checking + TRANSFER_OUT_ACCOUNT_TRANSFER -> bank_account
checking + no explicit card evidence -> bank_account
credit account -> credit_card
depository + explicit debit-card evidence -> debit_card
inflow -> deposit
institutionName 'Chase' -> { primary: '#0A5DBB', soft: '#EAF3FF', foreground: '#FFFFFF' }
unknown institution -> neutral pine palette
```

- [ ] **Step 2: Run the focused test and verify it fails**

```bash
npx jest src/capabilities/money/domain/paymentSourcePresentation.test.ts --runInBand
```

- [ ] **Step 3: Establish what evidence Plaid actually supplies before adding schema**

Inspect one redacted checking transfer and one known debit-card transaction from the provider response or stored raw-safe fields. If `payment_channel` plus `transaction_code` (or another explicit field) reliably separates debit-card use, add only those bounded columns. If it does not, do not infer debit-card use from merchant name; use `bank_account` for depository activity and document the conservative false-negative.

If schema is needed, create the migration with:

```bash
npx supabase migration new add_budget_transaction_payment_source_evidence
```

Add nullable text columns, keep RLS unchanged, and update canonical sync upserts. Do not store full provider payloads.

- [ ] **Step 4: Implement pure source and institution presentation**

Rules, in order:

1. inflow -> `deposit`;
2. account type/subtype explicitly credit -> `credit_card`;
3. explicit imported debit-card evidence -> `debit_card`;
4. checking/savings/depository or transfer/direct-debit evidence -> `bank_account`;
5. unknown -> neutral `account` receipt, never a speculative card.

Normalize institution names so `CHASE`, `Chase Bank`, and `JPMorgan Chase` share the blue Chase palette. Keep the brand mapping in the pure helper, not inline in the component.

- [ ] **Step 5: Split `PaymentSourceCard` into honest components**

Render:

- `CardPaymentSource` only for credit/debit-card kinds; retain chip/mask grammar;
- `BankPaymentSource` for checking/savings/transfer activity: compact bank receipt with institution, account name/mask, and rail label, with no chip or plastic-card silhouette;
- `DepositPaymentSource` for inflows;
- `GenericAccountSource` for unknown types.

The screenshot-3 fixture must render Chase blue accents and the bank-account receipt, not the brown card.

- [ ] **Step 6: Verify domain, repository, and simulator behavior**

```bash
npx jest src/capabilities/money/domain/paymentSourcePresentation.test.ts src/capabilities/money/data/moneySnapshot.test.ts src/capabilities/money/data/moneyRepository.test.ts --runInBand
npm run lint
```

Simulator matrix: Chase checking transfer, Chase credit card purchase, non-Chase checking spend, inflow deposit, and unknown account type.

- [ ] **Step 7: Commit the visual-truth slice**

```bash
git add src/capabilities/money/domain/paymentSourcePresentation.ts src/capabilities/money/domain/paymentSourcePresentation.test.ts src/capabilities/money/data/moneySnapshot.ts src/capabilities/money/data/moneySnapshot.test.ts src/capabilities/money/data/moneyRepository.ts src/capabilities/money/screens/MoneyTransactionDetailScreen.tsx supabase/migrations supabase/functions/_shared/plaid-sync.ts
git commit -m "fix(money): distinguish bank and card payment sources"
```

### Task 4: Separate Bounded Patches From Governed Plan Projections

**Files:**
- Create: `src/capabilities/money/data/moneyConfirmedPatches.ts`
- Create: `src/capabilities/money/data/moneyConfirmedPatches.test.ts`
- Create: `src/capabilities/money/data/moneyPlanProjection.ts`
- Create: `src/capabilities/money/data/moneyPlanProjection.test.ts`
- Modify: `src/capabilities/money/data/moneyDataState.ts`
- Modify: `src/capabilities/money/data/moneyDataState.test.ts`
- Modify: `src/capabilities/money/data/moneyRepository.ts`
- Modify: `src/capabilities/money/data/moneyRepository.test.ts`
- Modify: `src/capabilities/money/data/MoneyDataContext.tsx`

- [ ] **Step 1: Write failing tests for confirmed local patches, governed projections, and rollback-safe refresh**

Add reducer actions:

```ts
| { type: 'confirmed_transaction_patch'; patch: ConfirmedTransactionPatch }
| { type: 'confirmed_category_patch'; patch: ConfirmedCategoryPatch }
| { type: 'authoritative_plan_projection'; projection: MoneyPlanProjection }
| { type: 'background_failure'; message: string }
```

Tests must prove:

- a confirmed category assignment immediately updates the transaction's category/meaning/review state;
- a confirmed outside-plan or transfer choice updates the relation label state;
- a confirmed category identity or rollover write updates only its bounded display fields;
- an authoritative plan projection atomically updates every allocation changed by Monthly/Reserve reconciliation plus its version/receipt metadata;
- a governed plan response is never represented as a single-category local patch;
- background refresh success replaces the patch with authoritative projection;
- background refresh failure keeps the confirmed local patch and exposes calm stale/retry state;
- no optimistic patch is applied before a failed server write.

- [ ] **Step 2: Run focused tests and verify failure**

```bash
npx jest src/capabilities/money/data/moneyConfirmedPatches.test.ts src/capabilities/money/data/moneyPlanProjection.test.ts src/capabilities/money/data/moneyDataState.test.ts --runInBand
```

- [ ] **Step 3: Change small repository writes to return receipts, not full snapshots**

For transaction assignment/meaning/not-counted and bounded category rename/rollover writes, change the contract from `Promise<MoneySnapshot>` to a bounded result such as:

```ts
export type ConfirmedMoneyWrite<TPatch> = {
  confirmedAt: string;
  patch: TPatch;
};
```

The repository should await the authoritative update/RPC, then return the normalized patch. It must not call `loadSnapshot()` on that blocking path. Keep full reloads for initial load, manual sync, create/split/rule flows whose result affects broad data until they receive their own safe patch contract.

Do **not** use this contract for a governed amount/rhythm/expected-need save. The merged `commitLivingPlanCategoryChange()` contract can rebalance multiple allocations and persist an immutable reconciliation receipt. Add a targeted `loadPlanProjection()` read (categories, active plan/version, allocations, and receipt metadata only—no full transaction history), or extend the authoritative commit/RPC response to return that same normalized projection. Accept it atomically before resolving the Save action.

- [ ] **Step 4: Apply the patch after server acknowledgement and refresh in background**

Context flow:

```ts
const result = await mutation();
dispatch({ type: 'confirmed_transaction_patch', patch: result.patch });
void refresh({ background: true });
```

Do not await `refresh()` before resolving a bounded screen action. Ensure overlapping refreshes cannot let an older response overwrite a newer confirmed patch; use a monotonically increasing request/mutation version and accept only responses current for that version. Governed plan saves instead await the targeted authoritative projection, never the full-history snapshot.

- [ ] **Step 5: Prove the call-count improvement**

Update repository tests to assert an assignment does one auth check, one review RPC, and zero snapshot reads before resolution. Update category tests to assert unchanged fields do not write. Add a governed-save call-count test proving the commit plus targeted plan projection performs zero `budget_transactions` history reads after the commit returns.

Expected test contract:

```ts
expect(client.auth.getUser).toHaveBeenCalledTimes(1);
expect(calls.filter((call) => call.table === 'budget_transactions')).toHaveLength(0);
expect(calls.filter((call) => call.table === 'budget_categories')).toHaveLength(0);
```

Adjust the precise table expectations to distinguish the mutation RPC from background refresh, which is exercised separately.

- [ ] **Step 6: Verify the data foundation**

```bash
npx jest src/capabilities/money/data/moneyConfirmedPatches.test.ts src/capabilities/money/data/moneyPlanProjection.test.ts src/capabilities/money/data/moneyDataState.test.ts src/capabilities/money/data/moneyRepository.test.ts --runInBand
npm run lint
```

- [ ] **Step 7: Commit the responsiveness foundation**

```bash
git add src/capabilities/money/data/moneyConfirmedPatches.ts src/capabilities/money/data/moneyConfirmedPatches.test.ts src/capabilities/money/data/moneyPlanProjection.ts src/capabilities/money/data/moneyPlanProjection.test.ts src/capabilities/money/data/moneyDataState.ts src/capabilities/money/data/moneyDataState.test.ts src/capabilities/money/data/moneyRepository.ts src/capabilities/money/data/moneyRepository.test.ts src/capabilities/money/data/MoneyDataContext.tsx
git commit -m "perf(money): decouple confirmed writes from snapshot refresh"
```

### Task 5: Make Category Save And Transaction Reclassification Feel Immediate

**Files:**
- Modify: `src/capabilities/money/screens/MoneyCategoryDetailScreen.tsx`
- Modify: `src/capabilities/money/screens/MoneyTransactionDetailScreen.tsx`
- Modify: `src/capabilities/money/data/MoneyDataContext.tsx`
- Create: `src/capabilities/money/runtime/moneyMutationTelemetry.ts`
- Create: `src/capabilities/money/runtime/moneyMutationTelemetry.test.ts`
- Modify: `src/services/analytics/events.ts`

- [ ] **Step 1: Add privacy-safe latency bucket tests**

Allow only operation, outcome, and a bounded duration bucket:

```ts
type MoneyMutationOperation = 'transaction_category' | 'transaction_meaning' | 'category_settings';
type MoneyMutationDurationBucket = 'under_250ms' | '250_to_749ms' | '750ms_to_1999ms' | '2s_or_more';
```

No merchant, description, amount, account, institution, category name/id, transaction id, user id, or raw duration is allowed.

- [ ] **Step 2: Stop saving unchanged category identity**

Build one `saveCategorySettings()` handler. Compare normalized draft values with the current category and invoke only changed writes. Never call `renameCategory()` when the name is unchanged. Reuse a valid `planImpact` preview; do not repeat the preview RPC unless a dependent field changed after preview.

- [ ] **Step 3: Keep explicit pending state but shorten its critical path**

On Save:

1. validate all drafts synchronously;
2. record start time and let Button's immediate press feedback occur;
3. show `Saving…`/activity indication while the authoritative write runs;
4. for name/rollover-only changes, apply the confirmed bounded patch; for governed amount/rhythm/expected-need changes, atomically accept the targeted authoritative plan projection and receipt;
5. emit success haptic;
6. close the drawer, then background-refresh only the broader data not already covered by the authoritative result.

On failure, keep the drawer and drafts intact, announce the error, and emit `outcome.error`.

- [ ] **Step 4: Make transaction choice visibly pending immediately**

Track the chosen option separately from global `reviewingTransactionId`, render its check plus a small activity indicator, and disable only additional review choices. After confirmed write, close the picker immediately; do not wait for background snapshot refresh.

- [ ] **Step 5: Measure the observed flows**

Capture the allowlisted mutation result through `useAnalytics`. Add development-only timing logs with operation and bucket only. The first simulator run should report the old and new path for the same fixture; record p50/p95 from at least ten repeated classification actions and five category saves.

- [ ] **Step 6: Verify focused behavior**

```bash
npx jest src/capabilities/money/runtime/moneyMutationTelemetry.test.ts src/capabilities/money/data/moneyConfirmedPatches.test.ts --runInBand
npm run lint
```

Simulator checks:

- tap a category: immediate pressed/pending feedback, no dead interval, drawer closes after confirmed write;
- re-open/relaunch: authoritative category persists;
- force a failed write: prior value remains, picker/drafts are recoverable, error is announced;
- save unchanged category settings: no name write and no duplicate preview;
- save a Monthly/Reserve change: pending UI remains explicit, all affected allocations update together, and receipt truth is present before the drawer closes;
- force a stale background snapshot after a newer mutation: it does not overwrite the confirmed patch or authoritative plan projection.

- [ ] **Step 7: Commit the observed-flow improvement**

```bash
git add src/capabilities/money/screens/MoneyCategoryDetailScreen.tsx src/capabilities/money/screens/MoneyTransactionDetailScreen.tsx src/capabilities/money/data/MoneyDataContext.tsx src/capabilities/money/runtime/moneyMutationTelemetry.ts src/capabilities/money/runtime/moneyMutationTelemetry.test.ts src/services/analytics/events.ts
git commit -m "perf(money): acknowledge small edits immediately"
```

### Task 6: Standardize Semantic Haptics Across Money Actions

**Files:**
- Modify: `src/capabilities/money/screens/MoneyAccountsScreen.tsx`
- Modify: `src/capabilities/money/screens/MoneyTransactionDetailScreen.tsx`
- Modify: `src/capabilities/money/screens/MoneyCategoryDetailScreen.tsx`
- Modify: `src/capabilities/money/screens/MoneySummaryScreen.tsx`
- Create: `src/capabilities/money/runtime/moneyMutationFeedback.test.tsx`

- [ ] **Step 1: Write failing haptic contract tests**

Mock `HapticsService.trigger` and prove:

- category/meaning row selection -> `canvas.selection` once;
- successful confirmed mutation -> `outcome.success` once;
- failed mutation -> `outcome.error` once;
- Monthly/Reserve/toggle choice -> `canvas.toggle.on` or `canvas.toggle.off`;
- no direct `expo-haptics` import remains in Money.

- [ ] **Step 2: Run the focused test and verify failure**

```bash
npx jest src/capabilities/money/runtime/moneyMutationFeedback.test.tsx --runInBand
```

- [ ] **Step 3: Route Money haptics through the semantic service**

Replace direct `expo-haptics` usage in `MoneySummaryScreen.tsx`. Wrap direct Pressables with `withHapticPress` or call `HapticsService.trigger` at the semantic boundary. Do not add haptics to typing, scrolling, every row render, or background refresh.

- [ ] **Step 4: Avoid duplicate haptics**

`Button` already defaults to `canvas.selection`. For buttons that add explicit semantic feedback, keep the press haptic and add only completion success/error. For direct category rows, add the selection haptic exactly once.

- [ ] **Step 5: Verify on physical hardware**

The simulator cannot prove tactile output. Run tests/typecheck first, then check a signed physical device with haptics enabled and disabled, plus Reduce Motion enabled. Confirm subtle feedback, no double-fire, and no machine-gun effect.

- [ ] **Step 6: Commit the haptics slice**

```bash
git add src/capabilities/money/screens/MoneyAccountsScreen.tsx src/capabilities/money/screens/MoneyTransactionDetailScreen.tsx src/capabilities/money/screens/MoneyCategoryDetailScreen.tsx src/capabilities/money/screens/MoneySummaryScreen.tsx src/capabilities/money/runtime/moneyMutationFeedback.test.tsx
git commit -m "feat(money): add semantic mutation feedback"
```

### Task 7: Run Full Verification And Record The Evidence Boundary

**Files:**
- Modify if behavior/evidence changed: `docs/job-flows/maya-review-budget-reality-before-spending.md`
- Modify: `docs/capabilities/money/README.md`
- Regenerate: `docs/agent-code-map.md`

- [ ] **Step 1: Run focused Money suites**

```bash
npx jest \
  src/capabilities/money/data/moneyPlaidErrors.test.ts \
  src/capabilities/money/data/moneyPlaidApi.test.ts \
  src/capabilities/money/domain/transactionMeaningOptions.test.ts \
  src/capabilities/money/domain/paymentSourcePresentation.test.ts \
  src/capabilities/money/data/moneyConfirmedPatches.test.ts \
  src/capabilities/money/data/moneyDataState.test.ts \
  src/capabilities/money/data/moneyRepository.test.ts \
  src/capabilities/money/runtime/moneyMutationTelemetry.test.ts \
  src/capabilities/money/runtime/moneyMutationFeedback.test.tsx \
  --runInBand
```

Expected: PASS.

- [ ] **Step 2: Run repository gates**

```bash
npm run product:lint
npm run architecture:lint
npm run agent:map
npm run verify:changed -- --run
```

Expected: all diff-derived required gates PASS. If shared store/repository infrastructure changed broadly, also run:

```bash
npm test -- --runInBand
```

- [ ] **Step 3: Perform one-owner simulator verification**

Record checkout, branch, commit, dirty state, Metro port, build/install provenance, and backend environment. Verify all four screenshots' flows plus error rollback. Capture before/after screen recordings and timing buckets.

- [ ] **Step 4: Perform signed-device verification**

Required for Plaid Link and haptics. Prove:

- account connection starts or returns readable recovery copy;
- Chase checking transfer uses bank-account visual and Chase blue;
- credit/debit-card evidence uses card visual;
- transaction classification and category setting survive terminate/relaunch;
- haptics respect the app toggle and accessibility policy.

- [ ] **Step 5: Update delivery evidence without inflating the score**

Update the Money README/job flow only with proof actually obtained. Source/unit/simulator proof does not establish installed TestFlight or live-provider reliability. Do not raise job-flow delivery scores unless the documented evidence threshold is met.

- [ ] **Step 6: Commit verification/docs**

```bash
git add docs/capabilities/money/README.md docs/job-flows/maya-review-budget-reality-before-spending.md docs/agent-code-map.md
git commit -m "docs(money): record trust refinement evidence"
```

## Completion Definition

The initiative is complete only when:

- the Plaid 400's exact provider code is captured and its actual cause corrected or clearly handled;
- no raw `Edge Function returned a non-2xx status` copy reaches the UI;
- the category picker has no decorative thumbnail, uses compact placeholder search, and exposes Internal transfer/Outside the plan appropriately;
- checking transfers do not look like plastic cards and Chase uses a blue institution palette;
- small confirmed writes no longer block on a full transaction-history reload;
- saves/reclassification have immediate pending feedback plus semantic success/error haptics;
- persistence is proven by refetch/relaunch, not inferred from local UI state;
- `npm run verify:changed -- --run` passes;
- simulator, signed-device, and TestFlight claims remain separately stated.
