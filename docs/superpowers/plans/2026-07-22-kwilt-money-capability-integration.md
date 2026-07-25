# Kwilt Money Capability Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port Kwilt Money into the unified Kwilt app as a lifecycle-scoped capability that preserves Money's local workflow and live data while using one host shell, session, settings system, native target family, and release train.

**Architecture:** Freeze an immutable standalone Money source, then port vertical slices into `src/capabilities/money/`. React Navigation remains the only router; the host owns all global providers and Money receives the host Supabase client, entitlement state, headers, settings links, and Chat bridge. Ship read-only live parity first, then authoritative writes, Plaid, widgets, and Screen Time as independently gated phases.

**Tech Stack:** Expo SDK 54, React Native 0.81.5, React 19.1, TypeScript, React Navigation 7, Supabase JS 2.78, Jest/jest-expo, Skia/Victory Native, Plaid Link, Expo Local Authentication, Expo config plugins, iOS WidgetKit, FamilyControls/ManagedSettings/DeviceActivity.

---

## Working boundaries

- Work only in `/Users/andrewwatanabe/Kwilt/.worktrees/kwilt-money-integration` on `codex/kwilt-money-integration` unless a task explicitly says to inspect the standalone source read-only.
- Do not edit `/Users/andrewwatanabe/Documents/Kwilt Budget` from this plan.
- Do not start Task 2 until Task 1 records a clean, immutable Money source SHA approved by Andrew.
- Do not merge, push, apply a Supabase migration, deploy an Edge Function, submit TestFlight, or retire standalone Money without separate authorization for that step.
- Use `production-widgets` for release/archive evidence. Simulator, debug, archive, physical device, processed TestFlight, and production remain separate gates.

## Planned file structure

```text
src/capabilities/money/
├── definition.ts                  # Capability metadata and lifecycle registration
├── domain/                        # Pure financial interpretation and planning logic
├── data/
│   ├── MoneyRepository.ts         # Read/write interface consumed by screens
│   ├── supabaseMoneyRepository.ts # Host-client implementation
│   └── moneySnapshotStore.ts      # One published authoritative snapshot
├── navigation/
│   ├── MoneyNavigator.tsx         # React Navigation local tabs + detail stack
│   ├── MoneyPlaceBar.tsx          # Summary/Transactions/Accounts local navigation
│   └── types.ts                   # Money route params
├── native/                        # Privacy, Plaid, widget, and Screen Time adapters
├── runtime/                       # Activation/deactivation and provider boundary
├── screens/                       # Ported Money surfaces, no standalone shell ownership
├── theme/                         # Finance-only semantic tokens/typography
└── ui/                            # Finance-specific reusable components
```

Files that remain host-owned include `App.tsx`, `src/navigation/RootNavigator.tsx`,
`src/navigation/CapabilityMenu.tsx`, `src/services/backend/supabaseClient.ts`, global
entitlements/settings/account deletion, and Expo/native configuration.

### Task 1: Freeze the import source and create the parity manifest

**Files:**

- Create: `docs/integration/kwilt-money-source-manifest.md`
- Modify: `docs/feature-briefs/kwilt-money-capability-integration.md`
- Inspect only: `/Users/andrewwatanabe/Documents/Kwilt Budget`

- [ ] **Step 1: Prove the host branch is the planned branch and clean**

Run:

```bash
git branch --show-current
git status --short
git rev-parse HEAD
```

Expected before implementation begins: branch `codex/kwilt-money-integration`, no
unexpected changes beyond accepted planning documents, and the recorded host branch point
still reachable.

- [ ] **Step 2: Require an explicit standalone Money checkpoint**

Run:

```bash
git -C "/Users/andrewwatanabe/Documents/Kwilt Budget" status --short --branch
git -C "/Users/andrewwatanabe/Documents/Kwilt Budget" rev-parse HEAD
```

Expected: Andrew has either committed the current
`codex/target-backed-category-adjustment` work or explicitly selected another immutable
commit. If the checkout is still dirty, stop; do not infer that the uncommitted files are
part of the import.

- [ ] **Step 3: Inventory routes, modules, dependencies, assets, and native targets**

Run:

```bash
rg --files app src plugins supabase packages assets ios \
  "/Users/andrewwatanabe/Documents/Kwilt Budget" > /tmp/kwilt-money-files.txt
git -C "/Users/andrewwatanabe/Documents/Kwilt Budget" ls-tree -r --name-only HEAD
```

Write `docs/integration/kwilt-money-source-manifest.md` with the exact source SHA and
tables for: route -> destination route; standalone owner -> host/Money owner/retired;
dependency -> import phase; migration/function -> live version/source file; native target ->
unified target; asset -> reuse/import/drop; and standalone acceptance flow -> unified test.

- [ ] **Step 4: Record live backend state read-only**

Use Supabase project `sqxwjtorodqjdfnuvprf` to list migrations, `budget_*` tables, RLS
state, and Plaid/budget functions. Do not apply SQL. Record version/name only; never record
credentials or financial row contents.

- [ ] **Step 5: Validate the manifest has no unowned global concern**

Search the manifest for each of: auth, router, RevenueCat, analytics, notifications,
settings, deep links, deletion/export, privacy, Plaid, widgets, Screen Time, app group,
background work, realtime, and Chat. Every row must name one post-integration owner.

- [ ] **Step 6: Commit the source contract**

```bash
git add docs/integration/kwilt-money-source-manifest.md docs/feature-briefs/kwilt-money-capability-integration.md
git commit -m "docs: freeze Kwilt Money integration source"
```

### Task 2: Extend the capability and route contracts with tests first

**Files:**

- Modify: `src/capabilities/types.ts`
- Modify: `src/capabilities/registry.ts`
- Create: `src/capabilities/money/definition.ts`
- Modify: `src/capabilities/registry.test.ts`
- Modify: `src/navigation/capabilityNavigation.ts`
- Modify: `src/navigation/capabilityNavigation.test.ts`
- Modify: `src/navigation/CapabilityShellContext.tsx`
- Modify: `src/navigation/CapabilityShellContext.test.ts`

- [ ] **Step 1: Add failing registry and navigation tests**

Assert that:

```ts
expect(getCapability('money')).toMatchObject({
  id: 'money',
  label: 'Money',
  group: 'money',
  rootRoute: { root: 'Money', screen: 'MoneySummary' },
  availability: 'active',
});

expect(resolveCapabilityNavigation('money')).toEqual({
  name: 'Money',
  params: { screen: 'MoneySummary' },
});
```

Add an active-capability-state fixture whose focused root is `Money` and expect `money`.

- [ ] **Step 2: Run the focused tests and confirm failure**

```bash
npx jest src/capabilities/registry.test.ts src/navigation/capabilityNavigation.test.ts src/navigation/CapabilityShellContext.test.ts --runInBand
```

Expected: type/test failure because `money`, group `money`, and root `Money` are not defined.

- [ ] **Step 3: Add the minimum type and registry implementation**

Extend the contracts to include:

```ts
export type CapabilityId = 'goals' | 'todos' | 'plan' | 'arcs' | 'chapters' | 'money';
export type CapabilityGroupId = 'goals-plans' | 'money';
export type CapabilityRouteTarget = ExistingCapabilityRouteTarget |
  { root: 'Money'; screen: 'MoneySummary' | 'MoneyTransactions' | 'MoneyAccounts' };
```

Keep the Money definition in `src/capabilities/money/definition.ts` so lifecycle and
future settings/agent contributions do not bloat the central registry.

- [ ] **Step 4: Make navigation resolution exhaustive**

Replace tab-shape assumptions in `resolveCapabilityNavigation` with exhaustive handling of
`MainTabs` and `Money`. Do not use an unchecked cast for the Money branch.

- [ ] **Step 5: Run focused tests and typecheck**

```bash
npx jest src/capabilities/registry.test.ts src/navigation/capabilityNavigation.test.ts src/navigation/CapabilityShellContext.test.ts --runInBand
npm run lint
```

Expected: pass.

- [ ] **Step 6: Commit**

```bash
git add src/capabilities src/navigation/capabilityNavigation.ts src/navigation/capabilityNavigation.test.ts src/navigation/CapabilityShellContext.tsx src/navigation/CapabilityShellContext.test.ts
git commit -m "feat(money): register Money capability"
```

### Task 3: Build the React Navigation Money shell without data

**Files:**

- Create: `src/capabilities/money/navigation/types.ts`
- Create: `src/capabilities/money/navigation/MoneyNavigator.tsx`
- Create: `src/capabilities/money/navigation/MoneyPlaceBar.tsx`
- Create: `src/capabilities/money/navigation/MoneyPlaceBar.test.tsx`
- Create: `src/capabilities/money/screens/MoneySummaryScreen.tsx`
- Create: `src/capabilities/money/screens/MoneyTransactionsScreen.tsx`
- Create: `src/capabilities/money/screens/MoneyAccountsScreen.tsx`
- Modify: `src/navigation/RootNavigator.tsx`
- Modify: `src/navigation/CapabilityMenu.test.tsx`

- [ ] **Step 1: Define exact route params**

```ts
export type MoneyStackParamList = {
  MoneyPlaces: NavigatorScreenParams<MoneyPlacesParamList> | undefined;
  MoneyCategoryDetail: { categoryId: string; monthOffset?: number };
  MoneyTransactionDetail: { transactionId: string; returnCategoryId?: string };
  MoneyReview: { categoryId: string; targetAppId: string; targetLabel: string };
  MoneyCategorySettings: { categoryId: string };
};

export type MoneyPlacesParamList = {
  MoneySummary: undefined;
  MoneyTransactions: { categoryId?: string; accountId?: string } | undefined;
  MoneyAccounts: undefined;
};
```

- [ ] **Step 2: Write failing local navigation tests**

Render `MoneyPlaceBar` with each active route. Assert three visible places, selected state,
navigation events, 44-point targets, and no standalone Ask/More/Goals/Plan items.

- [ ] **Step 3: Implement the local place bar and navigator**

Use React Navigation bottom tabs nested in a Money native stack. Reuse host motion/safe-area
metrics where they apply, but keep finance colors/icons in Money. The host header opens the
Option G menu; do not port Money's standalone avatar/router handlers.

- [ ] **Step 4: Add structural screens with honest empty copy**

The screens may say that live Money is not connected on this branch. They must not show
fixture dollars or fake categories.

- [ ] **Step 5: Run navigation tests**

```bash
npx jest src/capabilities/money/navigation/MoneyPlaceBar.test.tsx src/navigation/CapabilityMenu.test.tsx --runInBand
npm run lint
```

- [ ] **Step 6: Commit**

```bash
git add src/capabilities/money src/navigation/RootNavigator.tsx src/navigation/CapabilityMenu.test.tsx
git commit -m "feat(money): add capability-local navigation"
```

### Task 4: Port finance theme, UI primitives, and pure domain logic

**Files:**

- Create: `src/capabilities/money/theme/financeTheme.ts`
- Create: `src/capabilities/money/domain/*.ts`
- Create: `src/capabilities/money/domain/*.test.ts`
- Create: `src/capabilities/money/ui/*`
- Modify only if necessary: `src/theme/*`

- [ ] **Step 1: Map source modules from the frozen manifest**

Port only pure modules needed by the read-only surfaces: meter, matching display,
transaction display names, month selection, living-plan evidence labels, freshness, and
category/account projections. Defer mutation, app-gate, widget, and Screen Time logic.

- [ ] **Step 2: Port or translate each source test before its implementation**

For every pure module, copy the accepted behavior into Jest tests under the Money domain.
Preserve cases that distinguish actual spend, planned capacity, forecast, outside-budget
spend, credits, transfers, exclusions, and unreviewed evidence.

- [ ] **Step 3: Run tests and confirm missing implementations fail**

```bash
npx jest src/capabilities/money/domain --runInBand
```

- [ ] **Step 4: Port minimal implementations with host imports**

Use host `src/theme` primitives for shared tokens. Keep only finance semantics such as
Money blue, positive/negative/neutral amount treatment, and finance typography in the
capability theme. Do not import the standalone `@kwilt/tokens` package, Expo Router,
standalone icon font, auth, or shell.

- [ ] **Step 5: Verify domain and architecture boundaries**

```bash
npx jest src/capabilities/money/domain --runInBand
npm run lint
npm run architecture:lint
```

- [ ] **Step 6: Commit**

```bash
git add src/capabilities/money/domain src/capabilities/money/theme src/capabilities/money/ui src/theme
git commit -m "feat(money): port financial read model"
```

### Task 5: Create one host-session Money repository and snapshot source

**Files:**

- Create: `src/capabilities/money/data/MoneyRepository.ts`
- Create: `src/capabilities/money/data/supabaseMoneyRepository.ts`
- Create: `src/capabilities/money/data/moneySnapshotStore.ts`
- Create: `src/capabilities/money/data/supabaseMoneyRepository.test.ts`
- Create: `src/capabilities/money/data/moneySnapshotStore.test.ts`
- Reuse: `src/services/backend/supabaseClient.ts`

- [ ] **Step 1: Define a read-only interface**

```ts
export type MoneyRepository = {
  getSnapshot(monthOffset?: number): Promise<MoneySnapshot>;
  listAccounts(): Promise<MoneyAccount[]>;
  subscribe(listener: (snapshot: MoneySnapshot) => void): () => void;
  dispose(): Promise<void>;
};
```

The implementation factory accepts an existing `SupabaseClient`; it does not call
`createClient`.

- [ ] **Step 2: Write failing repository tests with a fake Supabase client**

Cover user-scoped budget tables, pagination beyond 1,000 transaction rows, transfer/credit
semantics, known-good-data retention on refresh failure, realtime teardown, and no fixture
fallback.

- [ ] **Step 3: Port the minimum read query graph**

Adapt the frozen Money `getConnectedSpendBudgetSnapshot`, account inventory, and read-only
transaction projections. Keep provider access tokens server-side. Do not port save/update
methods yet.

- [ ] **Step 4: Publish one immutable snapshot**

Every successful refresh publishes the full `MoneySnapshot`. Screen selectors derive from
that snapshot; they do not maintain private competing live snapshots.

- [ ] **Step 5: Verify**

```bash
npx jest src/capabilities/money/data --runInBand
npm run lint
```

- [ ] **Step 6: Commit**

```bash
git add src/capabilities/money/data
git commit -m "feat(money): add shared-session read repository"
```

### Task 6: Port the read-only vertical slice

**Files:**

- Modify: `src/capabilities/money/screens/MoneySummaryScreen.tsx`
- Modify: `src/capabilities/money/screens/MoneyTransactionsScreen.tsx`
- Modify: `src/capabilities/money/screens/MoneyAccountsScreen.tsx`
- Create: `src/capabilities/money/screens/MoneyCategoryDetailScreen.tsx`
- Create: `src/capabilities/money/screens/MoneyTransactionDetailScreen.tsx`
- Create: `src/capabilities/money/screens/*.test.tsx`
- Create: `src/capabilities/money/runtime/MoneyCapabilityProvider.tsx`

- [ ] **Step 1: Add screen contract tests**

For each screen, test loading, live success, empty, retained-known-good refresh failure, and
hard error. Assert hard error contains no fixture value. Test the exact navigation params for
category, transaction, and account filters.

- [ ] **Step 2: Port Summary composition**

Preserve monthly runway, freshness, actual/planned distinction, category rows, and pull to
refresh. If the accepted Summary requires Skia/Victory, add those dependencies only in Task
9 after a no-chart structural version proves the data/navigation boundary.

- [ ] **Step 3: Port Transactions and Accounts**

Keep existing filters/sorts and inventory grammar. Hide mutation and Connect Account actions
in the read-only release; do not render disabled promises that imply a broken app.

- [ ] **Step 4: Port detail screens read-only**

Category detail must preserve the month scope and activity truth. Transaction detail must
show current authoritative classification but no correction actions yet.

- [ ] **Step 5: Verify**

```bash
npx jest src/capabilities/money/screens --runInBand
npm run lint
```

- [ ] **Step 6: Commit**

```bash
git add src/capabilities/money/screens src/capabilities/money/runtime
git commit -m "feat(money): add read-only Money surfaces"
```

### Task 7: Scope lifecycle and privacy to Money

**Files:**

- Create: `src/capabilities/money/runtime/moneyRuntime.ts`
- Create: `src/capabilities/money/runtime/moneyRuntime.test.ts`
- Create: `src/capabilities/money/native/moneyPrivacyLock.ts`
- Create: `src/capabilities/money/native/MoneyPrivacyGate.tsx`
- Create: `src/capabilities/money/native/moneyPrivacyLock.test.ts`
- Modify: `src/capabilities/money/definition.ts`
- Modify: `app.config.ts`

- [ ] **Step 1: Write lifecycle tests**

Assert duplicate activation is idempotent; pre-entry has zero repository calls; activation
starts only the repository runtime; deactivation unsubscribes/disposes; re-entry can refresh;
and activation failure leaves Money inactive.

- [ ] **Step 2: Port privacy state tests**

Preserve one-shot automatic authentication, 30-second relock, retry-only visible UI,
background cover, cancel/failure, biometric lockout, unavailable state, and device passcode
fallback. Add the key unified-app case: switching to a non-Money capability must not present
Money unlock UI.

- [ ] **Step 3: Implement runtime hooks**

Wire `definition.lifecycle.activate/deactivate` to a module that owns only Money repository
resources. Do not initialize Skia, Plaid, widgets, or Screen Time here during the read-only
phase.

- [ ] **Step 4: Add LocalAuthentication configuration**

Add `expo-local-authentication` with a Kwilt-wide Face ID usage string. Wrap only protected
Money presentation and app-switcher snapshots. Do not copy standalone auth or launch gates.

- [ ] **Step 5: Verify**

```bash
npx jest src/capabilities/money/runtime src/capabilities/money/native --runInBand
npm run lint
```

- [ ] **Step 6: Commit**

```bash
git add src/capabilities/money/runtime src/capabilities/money/native src/capabilities/money/definition.ts app.config.ts package.json package-lock.json
git commit -m "feat(money): scope lifecycle and privacy"
```

### Task 8: Add deep links, restoration, settings, and Chat exact return

**Files:**

- Modify: `src/navigation/linkingConfig.ts`
- Modify: `src/navigation/linkingConfig.test.ts`
- Modify: `src/navigation/navigationPersistence.ts`
- Modify: `src/navigation/navigationPersistence.test.ts`
- Modify: `src/features/ai/workflowRegistry.ts`
- Modify: `src/features/ai/capabilityAgentContext.ts`
- Modify: `src/features/ai/capabilityAgentContext.test.ts`
- Modify: `src/features/unifiedChat/launchContext.ts`
- Modify: `src/features/unifiedChat/capabilityAdapters.ts`
- Modify: `src/features/unifiedChat/capabilityAdapters.test.ts`
- Modify: `src/features/account/SettingsHomeScreen.tsx`

- [ ] **Step 1: Add failing deep-link and restore tests**

Cover Money root, Transactions, Accounts, category, and transaction paths; unknown IDs;
cold/warm state; and old `kwilt-nav-state-v4` migration. Bump to `kwilt-nav-state-v5` only
with an explicit old-state fallback.

- [ ] **Step 2: Extend context object types**

Add `money-category`, `money-transaction`, and `money-account` (or a typed Money object union)
without weakening existing Goal/Activity/Arc/Chapter exhaustiveness.

- [ ] **Step 3: Implement exact return**

Money root returns to its last local place. Category and transaction context returns to the
named object with the previous local filter/month params when present. Missing/deleted objects
fall back to the correct Money inventory, not Goals `MainTabs`.

- [ ] **Step 4: Add read-only Chat context**

Expose bounded, labeled, freshness-aware Money evidence. Do not expose merchant/account
details unless explicitly selected and necessary. Do not add mutation operations in this task.

- [ ] **Step 5: Reconcile settings links**

Global settings may link to Money privacy/connections when those screens exist; contextual
category settings remain owned by Money. Do not port standalone `settings.tsx` or `more.tsx`.

- [ ] **Step 6: Verify and commit**

```bash
npx jest src/navigation/linkingConfig.test.ts src/navigation/navigationPersistence.test.ts src/features/ai/capabilityAgentContext.test.ts src/features/unifiedChat/capabilityAdapters.test.ts --runInBand
npm run lint
git add src/navigation src/features/ai src/features/unifiedChat src/features/account/SettingsHomeScreen.tsx
git commit -m "feat(money): add links settings and Chat return"
```

### Task 9: Complete the read-only release and archive gate

**Files:**

- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `src/capabilities/money/screens/MoneySummaryScreen.tsx`
- Create: `docs/integration/kwilt-money-read-only-parity.md`
- Create: `docs/integration/kwilt-money-read-only-release-evidence.md`

- [ ] **Step 1: Add chart dependencies one at a time**

Add pinned Expo-compatible `@shopify/react-native-skia` and `victory-native` versions from
the accepted Money source. Resolve `react-native-worklets`, `lucide-react-native`, and
`@rn-primitives/*` conflicts in favor of one host version; never install both majors.

- [ ] **Step 2: Port the accepted Summary chart**

Keep chart construction inside the mounted Money Summary surface. Test selectors and labels;
verify rendered bounds on device rather than trusting equal container sizes.

- [ ] **Step 3: Run repository verification**

```bash
npm run verify:changed -- --run
npm test -- --runInBand
git diff --check
```

Expected: all suites pass. Record any pre-existing Jest open-handle warning separately; do
not hide a new hang.

- [ ] **Step 4: Run same-account parity**

Record immutable unified/standalone build and source IDs plus Summary totals, category state,
transaction state, accounts, freshness, and error behavior. Store no sensitive raw values in
git; use pass/fail/delta labels and redacted screenshots.

- [ ] **Step 5: Run lifecycle/navigation/privacy device matrices**

Use the iPhone 17 Pro simulator for layout/navigation iteration and a signed physical iPhone
for LocalAuthentication/app-switcher evidence. Verify no pre-entry query/subscription, exact
return, timeout/cancel/fallback, and deactivation.

- [ ] **Step 6: Produce release archive evidence**

Using the exact production-widgets commit/environment, generate an Xcode archive and App
Thinning report. Compare embedded frameworks, extensions, compressed/installed size, ten cold
and ten warm launches, time to usable To-dos, first Money usable time, and idle/peak memory.

- [ ] **Step 7: Commit the accepted read-only boundary**

```bash
git add package.json package-lock.json src/capabilities/money docs/integration
git commit -m "feat(money): complete read-only capability slice"
git tag -a kwilt-money-read-only-accepted-2026-07 -m "Accepted read-only Money capability"
```

Create the tag only after Andrew accepts the evidence.

### Task 10: Enable transaction correction as the first write slice

**Files:**

- Modify: `src/capabilities/money/data/MoneyRepository.ts`
- Modify: `src/capabilities/money/data/supabaseMoneyRepository.ts`
- Create: `src/capabilities/money/data/transactionRulePersistence.ts`
- Create: `src/capabilities/money/data/transactionRulePersistence.test.ts`
- Modify: `src/capabilities/money/screens/MoneyTransactionsScreen.tsx`
- Modify: `src/capabilities/money/screens/MoneyTransactionDetailScreen.tsx`
- Create: `src/capabilities/money/screens/MoneyTransactionWriteParity.test.tsx`

- [ ] **Step 1: Port failing write-plan tests**

Cover move, exclude, income, category credit, transfer/not-counted, apply-to-similar exact
merchant rule, existing-rule update, partial failure, and no optimistic success after a failed
write.

- [ ] **Step 2: Add repository mutation methods**

Methods accept an idempotency key where the backend supports it and return an authoritative
snapshot or force an immediate rebuild. Do not let screens patch private row state as truth.

- [ ] **Step 3: Restore correction UI and receipts**

After success, prove source removal, destination insertion, totals, category detail,
transaction detail, activity, and back-navigation from the same published snapshot.

- [ ] **Step 4: Verify with tests and authenticated runtime proof**

```bash
npx jest src/capabilities/money/data/transactionRulePersistence.test.ts src/capabilities/money/screens/MoneyTransactionWriteParity.test.tsx --runInBand
npm run verify:changed -- --run
```

Use a safe authenticated transaction correction, reload/refetch, and verify persistence.

- [ ] **Step 5: Commit**

```bash
git add src/capabilities/money
git commit -m "feat(money): enable authoritative transaction correction"
```

### Task 11: Enable category and living-plan writes

**Files:**

- Port into: `src/capabilities/money/domain/`
- Port into: `src/capabilities/money/data/`
- Create/modify: `src/capabilities/money/screens/MoneyCategorySettingsScreen.tsx`
- Create: `src/capabilities/money/screens/MoneyLivingPlanReceiptScreen.tsx`
- Create: `src/capabilities/money/screens/MoneyLivingPlanWriteParity.test.tsx`

- [ ] **Step 1: Port regression-first domain tests**

Cover living target normalization, account-backed income evidence, duplicate/transfer
exclusion, user override persistence, unassigned capacity, plan versioning, impact preview,
promotion, receipt, mark-seen, and reversal.

- [ ] **Step 2: Reconcile the frozen source with the current live schema**

List live migrations/functions and compare signatures before calling any RPC. If source and
live versions differ, update the repository adapter or produce a separately approved
migration; never replay an old migration under a new number.

- [ ] **Step 3: Port category creation/name/amount/rollover and plan receipts**

Show target impact before save. If the whole plan cannot reconcile safely, leave the prior
plan visible and state that the write did not complete. Preserve undo/reversal receipts.

- [ ] **Step 4: Verify**

```bash
npx jest src/capabilities/money/domain src/capabilities/money/data src/capabilities/money/screens/MoneyLivingPlanWriteParity.test.tsx --runInBand
npm run verify:changed -- --run
```

- [ ] **Step 5: Commit**

```bash
git add src/capabilities/money
git commit -m "feat(money): enable category and living plan writes"
```

### Task 12: Add Plaid Link as a separately measured native boundary

**Files:**

- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `app.config.ts`
- Create: `src/capabilities/money/native/plaid.ts`
- Create: `src/capabilities/money/native/usePlaidLink.ts`
- Create: `src/capabilities/money/native/plaid.test.ts`
- Modify: `src/capabilities/money/screens/MoneyAccountsScreen.tsx`
- Modify: `src/navigation/linkingConfig.ts`

- [ ] **Step 1: Pin the accepted Plaid SDK and configure unified redirect URIs**

Use `react-native-plaid-link-sdk` from the frozen source, but replace the standalone
`kwiltbudget`/`app.kwilt.budget` redirect with the unified Kwilt scheme/domain. Keep tokens in
Edge Functions; no access token reaches client storage.

- [ ] **Step 2: Port token/exchange/sync tests and adapter**

Cover JWT-required functions, cancelled Link, OAuth return, exchange failure, sync failure,
relink, and cleanup/destroy on capability exit.

- [ ] **Step 3: Add contextual Connect/Reconnect actions**

Request Link only after the user taps Connect/Reconnect. Refresh and publish one full
snapshot after successful sync.

- [ ] **Step 4: Verify release and device behavior**

Run targeted tests, `verify:changed`, production-widgets archive/App Thinning comparison,
and signed-device sandbox OAuth/connect/sync/relaunch proof.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json app.config.ts src/capabilities/money src/navigation/linkingConfig.ts
git commit -m "feat(money): add unified Plaid connection flow"
```

### Task 13: Consolidate widgets and Screen Time into existing Kwilt targets

**Files:**

- Modify: `app.config.ts`
- Modify: `plugins/appleEcosystem/*`
- Create/modify: `src/services/appleEcosystem/moneyWidgets.ts`
- Create/modify: `src/services/appleEcosystem/moneyScreenTime.ts`
- Create: focused JS/Jest contract tests for generated Swift/config
- Modify generated native files only through the accepted plugin/prebuild workflow

- [ ] **Step 1: Add failing native-generation contract tests**

Assert one Kwilt widget target, one shield configuration target, one shield action target,
one app group (`group.com.andrewwatanabe.kwilt`), unique bundle IDs, Money blue
`#1B283A` with dark material, active review copy, and both Goals and Money rule namespaces.

- [ ] **Step 2: Fold Money widget kinds into `KwiltWidgets`**

Do not copy `KwiltBudgetWidget` as a second extension target. Write Money snapshots to the
unified app group only while Money data is available. Tell testers to re-add the widget;
placement/configuration from the standalone bundle is not portable.

- [ ] **Step 3: Fold Money policies into the shared shield targets**

Namespace saved rules and pending review markers by capability/category. Preserve one-shot
two-minute shield handoff cadence, `Open for now`/`Leave blocked`, and native authorization.
Tell testers to reselect controlled apps; opaque FamilyControls selections from the
standalone app group are not claimed to migrate.

- [ ] **Step 4: Verify on a signed device**

Prove widget refresh, app-group reads, permission, selection, restriction, shield appearance,
review handoff, unlock/leave-blocked receipt, normal foreground quietness, relaunch, and
deactivation. Run archive/App Thinning/privacy-manifest/entitlement checks after each target
change.

- [ ] **Step 5: Commit**

```bash
git add app.config.ts plugins src/services/appleEcosystem package.json package-lock.json
git commit -m "feat(money): consolidate widgets and Screen Time"
```

### Task 14: Reconcile global ownership and prepare retirement evidence

**Files:**

- Modify: `src/features/account/SettingsHomeScreen.tsx`
- Modify: `src/services/accountDeletion.ts`
- Modify: global entitlement/privacy/legal/export files identified by Task 1
- Create: `docs/integration/kwilt-money-final-parity.md`
- Create: `docs/integration/kwilt-money-retirement-readiness.md`

- [ ] **Step 1: Reconcile RevenueCat and settings**

Map standalone Money products/entitlements to the one host customer identity and accepted
Kwilt plan. Remove duplicate purchase/restore ownership. Ensure Money privacy, connections,
category configuration, widgets, and Screen Time settings have one discoverable owner.

- [ ] **Step 2: Complete deletion/export/privacy coverage**

Verify the deployed account-delete function and repository source cover all `budget_*` rows,
Plaid server tokens/connections, living-plan history, household membership/invites, widget
snapshots, local secure/privacy state, and Screen Time/app-group state. Review RLS and
SECURITY DEFINER grants before changing anything.

- [ ] **Step 3: Run the complete parity checklist**

Compare onboarding/empty state, Summary, Transactions, Accounts, category detail/settings,
transaction corrections, living plan, Plaid, privacy, widgets, Screen Time, entitlements,
Chat context/return, deep links, background/foreground, deletion/export, and failure states.

- [ ] **Step 4: Run final verification**

```bash
npm run verify:changed -- --run
npm test -- --runInBand
npm run product:lint
npm run architecture:lint
git diff --check
```

Then run current-source production-widgets archive/App Thinning, signed physical-device,
and internal TestFlight evidence. A processed TestFlight build is still not public-release
proof.

- [ ] **Step 5: Write the retirement readiness decision**

List every accepted parity gate, outstanding deferral, prior unified build, standalone Money
build, source tags/commits, TestFlight expiration, and rollback action. Recommend retirement
only if all required workflows are accepted.

- [ ] **Step 6: Commit the evidence**

```bash
git add src docs/integration
git commit -m "docs: record Kwilt Money parity and retirement readiness"
```

Stop. Merging, pushing, TestFlight promotion, and retiring standalone Money require Andrew's
explicit authorization.

## Plan self-review

- Spec coverage: source ownership, local navigation, shared session, read parity, lifecycle,
  privacy, Chat, writes, Plaid, widgets, Screen Time, settings, deletion/export, release,
  rollback, and retirement all map to named tasks.
- Placeholder scan: implementation values are either exact or deliberately derived from the
  approved immutable source at Task 1; no uncommitted source is assumed.
- Type consistency: the plan uses one `money` capability, one `Money` root, one
  `MoneySnapshot`, and one `MoneyRepository` boundary throughout.
- Phase gate: Task 9 is the first TestFlight learning release; Tasks 10-14 cannot be inferred
  from approval to begin the read-only slice.
