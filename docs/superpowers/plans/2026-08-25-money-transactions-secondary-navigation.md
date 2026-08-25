# Money Transactions Secondary Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Budgets the only global Money destination while preserving full and contextual transaction access as a secondary Budget flow.

**Architecture:** Mark the transaction destination hidden in `CAPABILITY_MENU_REGISTRY` so its route contract remains available but it no longer renders globally; keep the Money transaction screen, deep link, persistence, sync, filters, and detail flows intact. Reuse Budget's existing overflow and category activity entries, map secondary Money routes back to Budgets for drawer selection, and make every transaction inventory back-owned with a safe Budget fallback.

**Tech Stack:** React Native, Expo, TypeScript, React Navigation, Jest, React Native Testing Library

---

### Task 1: Reduce the global Money navigation

**Files:**
- Modify: `src/capabilities/registry.ts`
- Test: `src/capabilities/registry.test.ts`
- Test: `src/navigation/CapabilityMenu.test.tsx`
- Modify: `src/navigation/CapabilityShellContext.tsx`
- Test: `src/navigation/CapabilityShellContext.test.ts`

- [ ] **Step 1: Change the registry test to expect only Budgets in the Money menu**

Update the Money expectation to:

```ts
expect(CAPABILITY_MENU_REGISTRY.filter(({ group, availability }) => group === 'money' && availability === 'active').map(
  ({ id, label, ownerId, rootRoute }) => ({ id, label, ownerId, rootRoute }),
)).toEqual([{
  id: 'money-summary',
  label: 'Budgets',
  ownerId: 'money',
  rootRoute: { root: 'Money', screen: 'MoneySummary' },
}]);
```

- [ ] **Step 2: Run the focused registry/menu tests and confirm the old menu fails**

Run: `npm test -- --runInBand src/capabilities/registry.test.ts src/navigation/CapabilityMenu.test.tsx`

Expected: FAIL because `money-transactions` is still active and the visible Transactions row still exists.

- [ ] **Step 3: Mark only the `money-transactions` entry hidden and update menu/active-destination assertions**

Keep the transaction capability id and route types intact. Update the rendered hierarchy test to assert that Transactions and Accounts are absent, replace the direct-Money-destinations test with a Budgets-only selection assertion, and map Money transaction surfaces to the visible `money-summary` destination.

- [ ] **Step 4: Rerun the focused registry/menu tests**

Run: `npm test -- --runInBand src/capabilities/registry.test.ts src/navigation/CapabilityMenu.test.tsx src/navigation/CapabilityShellContext.test.ts`

Expected: PASS.

### Task 2: Preserve intentional transaction access

**Files:**
- Modify: `src/capabilities/money/screens/MoneySummaryScreen.tsx`
- Modify: `src/capabilities/money/screens/MoneyCategoryDetailScreen.tsx`
- Modify: `src/capabilities/money/screens/MoneyTransactionsScreen.tsx`
- Test: `src/capabilities/money/screens/MoneySummaryScreen.test.tsx`
- Test: `src/capabilities/money/screens/MoneyCategoryDetailScreen.test.tsx`
- Test: `src/capabilities/money/screens/MoneyTransactionsScreen.test.tsx`

- [ ] **Step 1: Add focused expectations for the approved access labels and back behavior**

Test that Budget's menu exposes `All transactions`, Category Detail contains `View all activity`, and an unscoped Transactions inventory renders a back button. When history exists it calls `goBack()`; without history it replaces the route with `MoneySummary`.

- [ ] **Step 2: Run the focused screen tests and confirm the new expectations fail**

Run: `npm test -- --runInBand src/capabilities/money/screens/MoneySummaryScreen.test.tsx src/capabilities/money/screens/MoneyCategoryDetailScreen.test.tsx src/capabilities/money/screens/MoneyTransactionsScreen.test.tsx`

Expected: FAIL on the old labels and top-level menu-button behavior.

- [ ] **Step 3: Implement the minimal copy and navigation changes**

Use `All transactions` in the Budget overflow and `View all activity` on Category Detail. Give `MoneyTransactionsScreen` one back handler:

```ts
const returnToBudget = () => {
  if (navigation.canGoBack()) navigation.goBack();
  else navigation.replace('MoneySummary');
};
```

Pass `returnToBudget` to `MoneyScreenFrame` for every transaction inventory.

- [ ] **Step 4: Rerun the focused screen tests**

Run: `npm test -- --runInBand src/capabilities/money/screens/MoneySummaryScreen.test.tsx src/capabilities/money/screens/MoneyCategoryDetailScreen.test.tsx src/capabilities/money/screens/MoneyTransactionsScreen.test.tsx`

Expected: PASS.

### Task 3: Verify the bounded slice

**Files:**
- Inspect: all files changed by Tasks 1-2

- [ ] **Step 1: Inspect the task diff and whitespace**

Run: `git diff --check && git diff -- src/capabilities/registry.ts src/capabilities/registry.test.ts src/navigation/CapabilityMenu.test.tsx src/navigation/CapabilityShellContext.tsx src/navigation/CapabilityShellContext.test.ts src/capabilities/money/screens/MoneySummaryScreen.tsx src/capabilities/money/screens/MoneySummaryScreen.test.tsx src/capabilities/money/screens/MoneyCategoryDetailScreen.tsx src/capabilities/money/screens/MoneyCategoryDetailScreen.test.tsx src/capabilities/money/screens/MoneyTransactionsScreen.tsx src/capabilities/money/screens/MoneyTransactionsScreen.test.tsx`

Expected: no whitespace errors and only the approved navigation/copy/test changes.

- [ ] **Step 2: Run the repository task-completion gate once**

Run: `npm run verify:changed -- --run`

Expected: PASS, or report exact unrelated baseline blockers separately.

- [ ] **Step 3: Verify the real Simulator path**

On the single active iPhone Simulator runtime, confirm: MONEY contains only Budgets; Budget overflow opens All transactions; Category Detail opens View all activity; Transactions returns to its source or Budget; deep/direct Transactions entry falls back to Budget.
