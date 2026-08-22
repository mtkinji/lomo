# Money Spending Reconciliation Implementation Plan

> **For agentic workers:** Execute inline in the current checkout. Do not create a worktree or commit unless Andrew separately requests it.

**Goal:** Make Budget explain authoritative month-to-date spending separately from flexible-room arithmetic, while exposing unresolved outflows as an honest, reviewable Summary projection.

**Architecture:** Extend the existing pure `MoneyPlanAudit` projection rather than deriving totals in the screen. Keep unresolved outflows conservatively deducted from flexible room, but separate them from known flexible spending in presentation. Reuse `BottomDrawer`, `BottomDrawerHeader`, and the existing transaction-detail review route; do not create a durable Unknown category.

**Tech Stack:** React Native, TypeScript, Jest, Testing Library, existing Kwilt Money domain projections and UI primitives.

---

### Task 1: Project authoritative spending facts

**Files:**
- Modify: `src/capabilities/money/domain/moneyPlanAudit.ts`
- Modify: `src/capabilities/money/domain/moneyPlanAudit.test.ts`

- [ ] Add a failing test proving the audit separately returns committed, flexible, unclear, outside-plan, and non-spending transaction IDs and cents.
- [ ] Assert `totalSpendingCents` equals committed + flexible + unclear + outside-plan, while transfers and income remain excluded.
- [ ] Implement the minimal projection from `reconcileMoneyEconomicRoles()` rows and totals.
- [ ] Run `npm test -- --runInBand src/capabilities/money/domain/moneyPlanAudit.test.ts` and confirm the focused suite passes.

### Task 2: Preserve conservative flexible-room truth

**Files:**
- Modify only if required: `src/capabilities/money/domain/moneyPlanLimitAnswer.ts`
- Modify only if required: `src/capabilities/money/domain/moneyPlanLimitAnswer.test.ts`

- [ ] Confirm the existing test proves unresolved in-scope spending is deducted from flexible room.
- [ ] Preserve `countedFlexibleSpendCents = known flexible + unresolved` as calculation truth while presenting the components separately.
- [ ] Run the focused plan-limit domain suite.

### Task 3: Recompose the explanation drawer

**Files:**
- Modify: `src/capabilities/money/screens/MoneySummaryScreen.tsx`
- Modify: `src/capabilities/money/screens/MoneySummaryScreen.test.tsx`

- [ ] Add a failing screen test for an `AUGUST SPENDING` statement with Total spent, Committed, Flexible, Unclear, and Outside the plan when present.
- [ ] Add a failing screen test proving `HOW YOUR FLEXIBLE ROOM WORKS` keeps plan deductions separate and uses `Flexible and unclear spending` when unresolved cents exist.
- [ ] Replace the mixed “other activity” sentence with a quiet non-spending statement for income and transfers.
- [ ] Preserve the existing target-change and flexible-transaction review actions.

### Task 4: Add the unclear-spending Summary projection and drawer

**Files:**
- Modify: `src/capabilities/money/screens/MoneySummaryScreen.tsx`
- Modify: `src/capabilities/money/screens/MoneySummaryScreen.test.tsx`

- [ ] Add a failing test proving the Summary projection appears only when unresolved outflows exist and exposes amount plus transaction count.
- [ ] Add a failing test proving its press opens a `BottomDrawer` containing exactly those transactions.
- [ ] Implement a section-like pressable that has no budget meter, rollover, category-detail destination, or empty state.
- [ ] Implement a tall review drawer using existing transaction row language; selecting a row closes the drawer and opens `MoneyTransactionDetail` with `economicRoleReview: true`.
- [ ] Keep the drawer dismissible and accessible; do not require clearing every transaction.

### Task 5: Verify and review

**Files:**
- Review all changed paths above plus the existing dirty diff in the same files.

- [ ] Run the two focused domain suites and the focused Summary screen suite.
- [ ] Run `npm run verify:changed -- --run` once after the slice is complete.
- [ ] Inspect the real iPhone 17 Pro Simulator path if the current checkout owns the runtime; otherwise state the exact provenance blocker.
- [ ] Review the final diff to ensure existing budget-settings work remains intact and no unrelated file is staged, committed, pushed, or deployed.
