# Transaction Inventory Date Scope Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Transactions a complete inventory with an explicit current-month date scope.

**Architecture:** Keep current-period budget math in `ConnectedSpendBudgetSnapshot.transactions`, add `allTransactions` for the ledger inventory, and filter date scope in the Transactions tab. Request deeper Plaid history at Link creation.

**Tech Stack:** Expo React Native, Expo Router, Supabase JS, Supabase Edge Functions, Plaid Transactions, TypeScript.

---

### Task 1: Plaid History Depth

**Files:**
- Modify: `supabase/functions/create-plaid-link-token/index.ts`
- Modify: `scripts/budget-forecast-smoke.mjs`

- [ ] Set default `PLAID_TRANSACTIONS_DAYS_REQUESTED` to `730`.
- [ ] Clamp configured values to Plaid's `1...730` range.
- [ ] Add a smoke assertion that the source no longer defaults to `30`.

### Task 2: Snapshot Inventory Split

**Files:**
- Modify: `src/platform/plaid.ts`
- Modify: `scripts/budget-forecast-smoke.mjs`

- [ ] Add `allTransactions: TransactionReviewRow[]` to `ConnectedSpendBudgetSnapshot`.
- [ ] Return all canonical rows in `allTransactions`.
- [ ] Keep `transactions` as current-period rows.
- [ ] Increase/paginate the transaction load so the app does not stop at a small first page.
- [ ] Add smoke assertions for all rows versus current rows.

### Task 3: Transactions Date Scope UI

**Files:**
- Modify: `app/(tabs)/transactions.tsx`

- [ ] Add date scope state and menu.
- [ ] Use `allTransactions` for the base inventory.
- [ ] Apply optional budget context, then date scope, then filter, then sort.
- [ ] Update copy and empty states so selected scope is clear.
- [ ] Keep transaction detail/review behavior working against the scoped inventory rows.

### Task 4: Verification

**Commands:**
- `npm run lint`
- `npm run test:forecast`

- [ ] Confirm TypeScript passes.
- [ ] Note any unrelated existing smoke failure separately.
- [ ] Optionally run a read-only live Supabase check for the simulator account to confirm historical rows exist.
