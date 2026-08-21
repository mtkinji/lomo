# Money Capability First Entry Implementation Plan

**Goal:** Give Budgets, Transactions, Accounts, and universal onboarding one destination-preserving Money FTUX, with truthful deferral states and progressive Transactions visibility.

**Branch:** `codex/capability-first-entry-onboarding`

**Product authority:** `docs/feature-briefs/money-capability-first-entry.md`

## Task 1: Model the entry decision

**Files:**
- Modify: `src/capabilities/money/domain/moneyOnboarding.ts`
- Modify: `src/capabilities/money/domain/moneyOnboarding.test.ts`
- Modify: `src/capabilities/money/runtime/moneyOnboardingStorage.ts`
- Modify: `src/capabilities/money/runtime/moneyOnboardingStorage.test.ts`

- [ ] Add typed entry source, requested place, checkpoint, and reduced availability contracts.
- [ ] Write failing decision-table and v1-migration tests.
- [ ] Implement normalization and destination-preserving decisions.
- [ ] Run the focused domain/storage tests.

## Task 2: Add the Money-owned entry route

**Files:**
- Modify: `src/capabilities/money/navigation/types.ts`
- Modify: `src/capabilities/money/navigation/MoneyNavigator.tsx`
- Add: `src/capabilities/money/screens/MoneyEntryScreen.tsx`
- Modify: `src/capabilities/money/screens/MoneySetupScreen.tsx`
- Modify: `src/navigation/capabilityNavigation.ts`
- Modify: `src/navigation/capabilityNavigation.test.ts`
- Modify: `src/features/capability-onboarding/capabilityOnboardingNavigationTarget.ts`
- Modify its focused test.

- [ ] Route all external Money doors through `MoneyEntry` with the requested destination.
- [ ] Pass oriented users directly through.
- [ ] Replace the coordinator on defer and completion so Back does not replay it.
- [ ] Preserve existing internal Money navigation.

## Task 3: Project progressive navigation availability

**Files:**
- Add: `src/capabilities/money/runtime/moneyNavigationAvailability.ts`
- Add its focused test.
- Modify: `src/capabilities/money/data/MoneyDataContext.tsx`
- Modify: `src/navigation/CapabilityMenu.tsx`
- Modify: `src/navigation/CapabilityMenu.test.tsx`
- Modify the root capability-menu host.

- [ ] Reduce snapshots to `unknown | pristine | available` inside Money.
- [ ] Preserve visibility for unknown, loading, and errors.
- [ ] Hide pristine Transactions without hiding direct routes.
- [ ] Freeze the result for an open-menu render to avoid row reflow.

## Task 4: Make defer destinations truthful

**Files:**
- Modify: `src/capabilities/money/screens/MoneySummaryScreen.tsx`
- Modify: `src/capabilities/money/screens/MoneyAccountsScreen.tsx`
- Modify: `src/capabilities/money/screens/MoneyTransactionsScreen.tsx`
- Modify their focused tests.

- [ ] Add one-action empty states using the canonical `EmptyState` and `Button` components.
- [ ] Budgets explains why account evidence matters and opens explicit setup.
- [ ] Accounts offers direct connection.
- [ ] Transactions explains sync and opens Accounts safely.

## Task 5: Verify the learning release

- [ ] Run focused Jest tests after each behavior slice.
- [ ] Run `git diff --check`.
- [ ] Run `npm run verify:changed -- --run` once at task completion.
- [ ] Start Metro from this checkout and record branch, commit, dirty state, and port.
- [ ] Review universal onboarding, Budgets, Accounts, direct Transactions, Not now, resume, completion, Back, enlarged text, and Reduce Motion on iPhone 17 Pro Simulator.
- [ ] Record signed-device Plaid, TestFlight, and production first-run as separate later gates.
