# Native Money And Shared Settings Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish Money as a real native Kwilt navigation/lifecycle capability and replace Kwilt Settings Home's parallel presentation with the shared Money-derived settings grammar.

**Architecture:** React Navigation remains the only router. Money registers eagerly but performs no runtime work before entry; its nested navigator owns Summary, Transactions, Accounts, and future detail routes. Global Settings remains host-owned and renders existing destinations through shared `SettingsSurface` primitives; capabilities contribute named destinations without introducing another settings root.

**Tech Stack:** React Native, Expo SDK 54, React Navigation, TypeScript, Jest, React Native Testing Library.

---

### Task 1: Reconcile the accepted product and source contracts

**Files:**
- Modify: `docs/feature-briefs/kwilt-money-capability-integration.md`
- Modify: `docs/job-flows/maya-move-family-life-forward.md`
- Create: `docs/design-explorations/kwilt-money-native-settings/*.md`
- Verify: `docs/integration/kwilt-money-source-manifest.md`

- [x] **Step 1: Bring the frozen Money source manifest onto the fresh integration branch**

Use source commit `df383c3ac1538dff0a83b43a21ff3e45c024298b`; later standalone changes require explicit port decisions.

- [x] **Step 2: Record the Money-first sequence and shared-settings decision**

The brief must name `codex/native-money-settings-integration`, the current `main` branch point, the existing Maya job flow, and the rule that Money contributes settings destinations to one host-owned settings stack.

- [x] **Step 3: Validate product references**

Run: `npm run product:lint`

Expected: zero errors; existing unrelated warnings may remain.

- [x] **Step 4: Commit the reconciled contracts**

```bash
git add docs
git commit -m "docs: accept native Money and shared settings program"
```

### Task 2: Register Money without changing startup work

**Files:**
- Create: `src/capabilities/money/definition.ts`
- Modify: `src/capabilities/types.ts`
- Modify: `src/capabilities/registry.ts`
- Test: `src/capabilities/registry.test.ts`
- Test: `src/navigation/CapabilityShellContext.test.ts`
- Test: `src/navigation/capabilityNavigation.test.ts`
- Test: `src/navigation/placeTabs.test.ts`

- [x] **Step 1: Add failing registry and navigation expectations**

```ts
expect(getCapability('money')).toMatchObject({
  id: 'money',
  group: 'money',
  rootRoute: { root: 'Money', screen: 'MoneySummary' },
  availability: 'active',
});
expect(resolveCapabilityNavigation('money')).toEqual({
  name: 'Money',
  params: { screen: 'MoneySummary' },
});
```

- [x] **Step 2: Run the focused tests and confirm the new expectations fail**

Run: `npm test -- --runInBand src/capabilities/registry.test.ts src/navigation/CapabilityShellContext.test.ts src/navigation/capabilityNavigation.test.ts src/navigation/placeTabs.test.ts`

Expected: fail because `money` is not a capability id or registered route.

- [x] **Step 3: Add the typed Money definition and root-route union**

```ts
export const moneyCapabilityDefinition = {
  id: 'money',
  label: 'Money',
  group: 'money',
  icon: 'cart',
  availability: 'active',
  rootRoute: { root: 'Money', screen: 'MoneySummary' },
  deepLinks: ['kwilt://money', 'kwilt://money/transactions', 'kwilt://money/accounts'],
  agent: { surfaces: ['inventory', 'detail'], supportsObjectContext: true },
  lifecycle: {},
} as const satisfies CapabilityDefinition;
```

Update active-capability derivation and capability navigation to handle the non-`MainTabs` root without weakening existing typed targets. Keep Money out of the host place bar.

- [x] **Step 4: Run the focused tests**

Expected: all four suites pass.

- [x] **Step 5: Commit capability registration**

```bash
git add src/capabilities src/navigation/CapabilityShellContext.tsx src/navigation/CapabilityShellContext.test.ts src/navigation/capabilityNavigation.ts src/navigation/capabilityNavigation.test.ts src/navigation/placeTabs.ts src/navigation/placeTabs.test.ts
git commit -m "feat(money): register native Money capability"
```

### Task 3: Add the Money navigation skeleton and lifecycle boundary

**Files:**
- Create: `src/capabilities/money/navigation/MoneyNavigator.tsx`
- Create: `src/capabilities/money/navigation/types.ts`
- Create: `src/capabilities/money/navigation/MoneyPlaceBar.tsx`
- Create: `src/capabilities/money/screens/MoneySummaryScreen.tsx`
- Create: `src/capabilities/money/screens/MoneyTransactionsScreen.tsx`
- Create: `src/capabilities/money/screens/MoneyAccountsScreen.tsx`
- Create: `src/capabilities/money/runtime/moneyLifecycle.ts`
- Modify: `src/navigation/RootNavigator.tsx`
- Modify: `src/navigation/linkingConfig.ts`
- Modify: `src/navigation/navigationPersistence.ts`
- Test: `src/capabilities/money/runtime/moneyLifecycle.test.ts`
- Test: `src/navigation/linkingConfig.test.ts`
- Test: `src/navigation/navigationPersistence.test.ts`

- [x] **Step 1: Write failing lifecycle, deep-link, and persistence tests**

```ts
expect(moneyLifecycle.getSnapshot()).toEqual({ active: false, activationCount: 0 });
await moneyLifecycle.activate();
await moneyLifecycle.activate();
expect(moneyLifecycle.getSnapshot()).toEqual({ active: true, activationCount: 1 });
await moneyLifecycle.deactivate();
expect(moneyLifecycle.getSnapshot().active).toBe(false);
```

Deep-link tests must resolve `/money`, `/money/transactions`, `/money/accounts`, `/money/category/:categoryId`, and `/money/transaction/:transactionId`. Persistence tests must sanitize unknown Money detail state safely and preserve known roots.

- [x] **Step 2: Run the focused tests and confirm failure**

Run: `npm test -- --runInBand src/capabilities/money/runtime/moneyLifecycle.test.ts src/navigation/linkingConfig.test.ts src/navigation/navigationPersistence.test.ts`

- [x] **Step 3: Implement the nested navigator and idempotent lifecycle**

The structural screens must contain no fixture amounts and must not import Supabase, Plaid, Skia, LocalAuthentication, widgets, or Screen Time. Reuse the existing `CapabilityLifecycleCoordinator`; the Money definition delegates to the idempotent lifecycle object, which owns later cleanup registration. Do not add a second runtime provider.

- [x] **Step 4: Register the root and links**

Add `Money: NavigatorScreenParams<MoneyStackParamList> | undefined` to `RootDrawerParamList`, mount `MoneyNavigator` in the root stack, and bump the persisted navigation key with deterministic migration.

- [x] **Step 5: Run focused navigation and lifecycle tests**

Expected: all new and modified suites pass.

- [ ] **Step 6: Commit the navigation skeleton**

```bash
git add src/capabilities/money src/navigation
git commit -m "feat(money): add native navigation and lifecycle skeleton"
```

### Task 4: Make the shared settings primitives behaviorally complete

**Files:**
- Modify: `src/ui/SettingsSurface.tsx`
- Create: `src/ui/SettingsSurface.test.tsx`

- [ ] **Step 1: Write failing component behavior tests**

Cover grouped title/footer rendering, divider rendering, disabled rows, destructive rows, value+chevron behavior, and one toggle callback per press.

```tsx
const onPress = jest.fn();
const { getByRole } = renderWithProviders(
  <SettingsToggleRow title="Privacy lock" enabled={false} onPress={onPress} />,
);
fireEvent.press(getByRole('switch'));
expect(onPress).toHaveBeenCalledTimes(1);
```

- [ ] **Step 2: Run the test and confirm any behavior gap fails**

Run: `npm test -- --runInBand src/ui/SettingsSurface.test.tsx`

- [ ] **Step 3: Correct the shared primitives**

Ensure the nested switch cannot double-fire the row callback, preserve 44-point interaction targets, use shared colors/type/radii, and expose no Expo Router dependency.

- [ ] **Step 4: Run the test**

Expected: pass.

- [ ] **Step 5: Commit the shared primitives**

```bash
git add src/ui/SettingsSurface.tsx src/ui/SettingsSurface.test.tsx
git commit -m "refactor(settings): harden shared settings primitives"
```

### Task 5: Migrate Kwilt Settings Home to the shared grouped grammar

**Files:**
- Modify: `src/features/account/SettingsHomeScreen.tsx`
- Modify: `src/features/account/SettingsHomeScreen.test.tsx`
- Modify: `docs/settings-product-inventory.md`

- [ ] **Step 1: Extend Settings Home tests before changing layout**

Assert that Planning, Integrations, Personalization, Account, and internal groups render only when they contain visible rows; existing destination presses still navigate to their exact routes; account deletion remains off the root; hidden/incomplete items remain absent; role/dev gates remain intact.

- [ ] **Step 2: Run the focused test and confirm the new group expectations fail**

Run: `npm test -- --runInBand src/features/account/SettingsHomeScreen.test.tsx`

- [ ] **Step 3: Replace the flat row renderer with shared groups and rows**

Keep the editable profile header and the single subscription surface. Render `SettingsGroup` sections with `SettingsRow` and `SettingsDivider`; remove decorative row icons and per-row description plumbing from the home menu. Keep detailed explanations inside destination screens or group footers only when they prevent misunderstanding.

- [ ] **Step 4: Run the reduction pass**

Remove the streak dashboard card from Settings Home because it is not a setting, retain no duplicate subscription CTA, and confirm every visible element orients, states, or opens a durable choice.

- [ ] **Step 5: Run Settings and adjacent account tests**

Run: `npm test -- --runInBand src/features/account/SettingsHomeScreen.test.tsx src/features/account/ProfileSettingsScreen.test.tsx src/features/account/LegalPrivacyScreen.test.tsx src/features/account/NotificationsSettingsScreen.test.tsx src/ui/SettingsSurface.test.tsx`

Expected: pass.

- [ ] **Step 6: Commit the Settings Home migration**

```bash
git add src/features/account/SettingsHomeScreen.tsx src/features/account/SettingsHomeScreen.test.tsx docs/settings-product-inventory.md
git commit -m "refactor(settings): adopt shared grouped settings system"
```

### Task 6: Verify the foundation and prepare the live Money plan

**Files:**
- Create: `docs/superpowers/plans/2026-07-23-native-money-read-only.md`
- Modify: `docs/feature-briefs/kwilt-money-capability-integration.md`

- [ ] **Step 1: Run the repository completion gate**

Run: `npm run verify:changed -- --run`

Expected: all derived typecheck, Jest, product, architecture, and native follow-up gates pass or name an exact runtime boundary.

- [ ] **Step 2: Render and operate the real paths**

Open avatar -> Settings and exercise every visible row plus free/Pro and signed-in/out states. Open Option G -> Money and exercise Summary/Transactions/Accounts, back, side-sheet switching, deep links, persistence restoration, and reduced motion. Capture evidence and record any physical-device boundary separately.

- [ ] **Step 3: Score the settings UI contract**

Record PASS/FAIL evidence for job clarity, reduction, hierarchy, system fit, interaction, states, resilience, and runtime proof. Fix and rerender every critical failure.

- [ ] **Step 4: Write the read-only Money implementation plan from the now-current foundation**

The plan must map frozen domain/read modules to focused files, pass the host Supabase client into one repository, define snapshot/error/freshness contracts, port Summary/Transactions/Accounts and two detail screens, add capability-local privacy and Chat context, and enumerate archive/device parity evidence.

- [ ] **Step 5: Commit verification artifacts and the next plan**

```bash
git add docs src
git commit -m "docs(money): plan live read-only integration"
```
