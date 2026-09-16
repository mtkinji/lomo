# Household Money Review And Uncategorized Status Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let every active adult in a canonical Kwilt household safely review the one shared Money ledger, and keep a month-scoped Uncategorized transactions status visible in the Budget overview with urgency-based placement.

**Architecture:** Preserve the canonical household owner as the durable owner of Money rows while resolving every transaction mutation through `budget_effective_owner_user_id()`. Keep public mutation functions `security invoker`, enforce adult household authority through RLS, preserve `auth.uid()` as the reviewing actor, and return an exact categorization receipt. In the native summary, reuse the existing Money section and pressable anatomy; render it before the budget categories when action is needed and after the monthly summary when the month is clear.

**Tech Stack:** Expo 55, React Native 0.83, TypeScript, Jest, Supabase Postgres 17/RLS, PL/pgSQL.

---

## UI contract

- **Job:** When household spending arrives, an adult needs to see and resolve uncategorized spending so the month stays truthful without becoming bookkeeping work.
- **Authority chain:** Andrew's current decision -> Kwilt Money job flow -> UI constitution and tokens -> existing Money Summary section -> RNR generic status/pressable anatomy.
- **Three-second read:** Either “transactions need categories” or “this month is clear.”
- **Primary action:** Review uncategorized transactions, only when work exists.
- **Primary information:** Month scope, transaction count, and unresolved amount.
- **Secondary information:** Calm completion copy when no spending needs a category.
- **Reveal later:** Individual transaction detail and category/rule choices.
- **Scan order:** Actionable uncategorized status -> flexible room/categories -> committed categories -> monthly receipt. When complete: flexible room/categories -> committed categories -> monthly receipt -> completion status.
- **Must not add:** A second transaction inventory, a completion button, decorative success chrome, budget-capacity restrictions, or automatic merging of adults' legacy personal Money rows.
- **Reuse map:** Custom interaction -> canonical `HapticPressable`; layout/copy -> existing Money Summary section styles and tokens; detail -> existing unclear-spending drawer.
- **Nearest precedent:** Current `UnclearSpendingProjection`; preserve its direct review path while making its presence and placement stable.
- **External exemplar ledger:** N/A.
- **Behavior sources:** Household adult roles and canonical owner routing from `20260901040118_canonical_household_money_access.sql`; overview placement from Andrew's 2026-09-15 decision.
- **Unresolved decisions:** None that change this slice. Legacy personal ledgers remain separate.
- **Required states:** Actionable, complete, stale/refresh owned by the existing Money frame, caregiver success, owner success, child denial, stale transaction failure.
- **Proof path:** Focused Jest, rollback-only SQL assertions against deployed schema, `verify:local -- --run` scoped to changed files, iPhone 17 Pro Simulator current Budget route if the local runtime is available.

### Task 1: Add regression contracts for household transaction writes

**Files:**
- Create: `src/capabilities/money/data/moneyHouseholdTransactionWriteMigration.test.ts`
- Create: `supabase/tests/household_money_transaction_writes.sql`
- Modify: `src/capabilities/money/data/moneyRepository.test.ts`

- [ ] Add a failing migration-contract test requiring a new migration marker, household-adult transaction UPDATE policy, effective-owner resolution in categorization, splits, merchant rules, and transfer review, child denial through the existing owner resolver, actor audit preservation, and removal of unrestricted allocation access.
- [ ] Add a failing repository test requiring `assignTransactionCategory` and `markTransactionNotCounted` to accept an exact RPC receipt rather than generating confirmation time locally.
- [ ] Run the focused tests and confirm they fail because the migration and receipt parser do not exist.

### Task 2: Implement canonical household transaction mutation authority

**Files:**
- Create: `supabase/migrations/<generated>_household_money_transaction_write_authority.sql`
- Modify: `src/capabilities/money/data/moneyRepository.ts`
- Modify: `src/capabilities/money/data/moneyRepository.test.ts`

- [ ] Generate the migration filename with `supabase migration new household_money_transaction_write_authority`.
- [ ] Replace the transaction UPDATE policy with `USING (public.can_manage_budget_user(user_id))` and `WITH CHECK (user_id = public.budget_effective_owner_user_id())`.
- [ ] Replace allocation SELECT/INSERT/DELETE policies with canonical owner-aware policies; remove the unrestricted permanent-user `ALL` policy.
- [ ] Replace merchant-rule INSERT/UPDATE policies with canonical owner-aware adult policies.
- [ ] Recreate `replace_budget_transaction_review` to use the effective owner for categories, transactions, and allocations; leave it `security invoker`; return `{transaction_ids, category_id, review_state, updated_at}`.
- [ ] Recreate allocation, merchant-rule, and transfer-pair functions so every row lookup/write uses the effective owner while trigger audit fields continue to use the actor.
- [ ] Parse and validate the categorization receipt in the repository and return its authoritative timestamp.
- [ ] Run focused migration and repository tests to green.

### Task 3: Make Uncategorized transactions a stable responsive section

**Files:**
- Modify: `src/capabilities/money/screens/MoneySummaryScreen.tsx`
- Modify: `src/capabilities/money/screens/MoneySummaryScreen.test.tsx`

- [ ] Add failing component tests proving actionable status precedes Flexible spending, complete status follows the monthly summary, and the complete state has no action.
- [ ] Rename the section and drawer to `Uncategorized transactions`.
- [ ] When count is positive, render the existing quiet review surface first with count, amount, and direct review behavior.
- [ ] When count is zero, render a non-interactive bottom status: `You're all set for <month>.` and `No spending needs a category.`
- [ ] Run the focused screen tests to green and perform a reduction pass: one action only in the actionable state, no nested card or duplicate helper copy.

### Task 4: Verify locally and deploy the backend repair

**Files:**
- Verify all files above; do not modify unrelated untracked files.

- [ ] Run focused Jest tests for the migration contract, repository, plan audit, Money Summary, and transaction detail.
- [ ] Run `npm run verify:local -- --run --files <changed paths>` once and inspect omitted-file reporting.
- [ ] Run Supabase security and performance advisors before applying the DDL.
- [ ] Apply the reviewed migration to the Kwilt Supabase project.
- [ ] Execute the rollback-only SQL test against production and verify owner success, caregiver success, child denial, actor audit, split/rule/transfer coverage, and cross-household denial.
- [ ] Read back deployed policies and function definitions to prove deployment matches source.
- [ ] Attempt current-route iPhone 17 Pro Simulator verification from this checkout only. Record source branch, commit, dirty state, Metro/build provenance, and any runtime blocker.
