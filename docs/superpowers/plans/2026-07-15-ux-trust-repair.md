# UX Trust Repair Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Repair every actionable UX gap from the July 15 audit except Ask, with durable money writes, truthful completion states, working navigation, accessible paging, and a clean native verification lane.

**Architecture:** Use one atomic Supabase category-plan RPC and connected snapshot refresh instead of adding another in-memory repository. Keep UI changes reductive: remove unfinished actions, carry existing route context into headers, and make onboarding completion depend on reconciliation success. Extract branchy state decisions into pure helpers covered by the existing smoke-test harnesses.

**Tech Stack:** Expo Router, React Native, TypeScript, Supabase, Expo LocalAuthentication/Screen Time native modules, Node smoke tests.

---

## UI contract

Job: When a person creates or adjusts their money plan, they need the app to persist the change and clearly report failure, so they can trust every amount they see.

Primary action: Complete the requested money or setup action exactly once.

Must show: current context, pending state, success only after durable completion, actionable recovery on failure.

Reveal later: secondary settings, image customization, subscription plan selection.

Must not add: Ask work, new configuration surfaces, fixture-backed production actions, custom confirmation chrome.

Reuse map: connected snapshot and living-plan repositories for persistence; `SettingsPage`, `SettingsRow`, `Button`, toast provider, and existing page headers for UI; `FlatList` accessibility props for paging.

Behavior sources: `docs/jtbd/_index.md`, `docs/concepts/kwilt-budget-v1-concept.md`, the signed-in transaction-detail category creation path, and the audit reproductions.

Unresolved decisions: none; unfinished Share/upload/generate controls will be removed until their real capability exists.

Required states: preview, signed-in loading, success, persistence error, reconciliation blocked/not-ready, entitlement gate, empty account-filtered transactions, current and offscreen months.

Proof path: current iOS simulator development client in preview for layout/accessibility, TypeScript and smoke suites for logic, production-style Expo export for asset resolution; signed-in persistence and Screen Time remain explicitly identified if credentials/entitlements prevent live proof.

## Reductive UI gates

- [x] Ground changes in the JTBD, concept, existing components, and signed-in persistence examples.
- [x] Preserve the UI contract above while implementing the smallest correct surfaces.
- [x] Remove redundant or nonfunctional controls instead of adding explanatory copy.
- [x] Render and operate the available normal, empty, and gated paths in the simulator; cover persistence/error branches with regression tests where signed-in state is unavailable.
- [x] Score job clarity, reduction, hierarchy, system fit, interaction, states, resilience, and runtime proof; fix every critical failure.

### Task 1: Durable category creation

**Files:**
- Modify: `app/budgets/new.tsx`
- Modify: `app/(tabs)/transactions.tsx`
- Modify: `src/platform/budget-product-data.ts`
- Add: `supabase/migrations/20260716023558_create_budget_category_with_plan.sql`
- Test: `scripts/budget-forecast-smoke.mjs`

- [x] Add a regression assertion proving signed-in category creation cannot resolve through the local repository path.
- [x] Add or reuse one Supabase write function that creates the category and active-plan allocation atomically enough for the current schema, returning the saved category id.
- [x] Make `/budgets/new` show a pending state, persist for signed-in users, and show inline failure without navigating.
- [x] Route transaction category creation through the same live write before saving the review; retain local creation only in preview.
- [x] Run `npm run test:forecast` and `npm run lint`.

### Task 2: Paywall navigation

**Files:**
- Modify: `src/components/paywall.tsx`
- Modify: `app/screen-time-controls.tsx`
- Test: `scripts/security-hardening-smoke.mjs`

- [x] Add a regression assertion that Screen Time's full-screen `ProGate` receives a real close behavior.
- [x] Make Screen Time's gate navigate back from both X and Not now while keeping the plan drawer dismissible.
- [x] Run `npm run test:security` and `npm run lint`.

### Task 3: Truthful onboarding completion

**Files:**
- Modify: `src/features/onboarding/BudgetOnboardingFlow.tsx`
- Modify: `src/domain/living-plan.ts` or a focused new domain helper if needed
- Test: `scripts/living-plan-smoke.mjs`

- [x] Add regression coverage for promoted/no-op versus blocked/not-ready onboarding outcomes.
- [x] Keep onboarding open while saving, prevent duplicate completion taps, and surface a concise recovery message.
- [x] Mark onboarding complete only after the target save and acceptable reconciliation outcome; allow account-later completion only when a usable starter state exists.
- [x] Run `npm run test:living-plan` and `npm run lint`.

### Task 4: Context and accessibility

**Files:**
- Modify: `app/(tabs)/index.tsx`
- Modify: `app/(tabs)/transactions.tsx`
- Test: `scripts/budget-forecast-smoke.mjs`

- [x] Hide non-current Summary pager pages from accessibility while preserving swipe and arrow navigation.
- [x] Put the selected account name in the visible Transactions shell header and empty-state copy.
- [x] Render Summary and account-filtered Transactions in the simulator and inspect the accessibility tree for duplicates and missing context.
- [x] Run `npm run test:forecast` and `npm run lint`.

### Task 5: Remove unfinished category actions

**Files:**
- Modify: `app/budgets/[budgetId].tsx`
- Modify: `src/components/budget-banner-sheet.tsx`

- [x] Remove Share from the category menu until a real share contract exists.
- [x] Remove upload and pseudo-generate actions; retain curated selection, search when configured, and remove-image behavior.
- [x] Render the category menu and image sheet in the simulator and inspect every remaining affordance.
- [x] Run `npm run lint`.

### Task 6: Clean verification lane

**Files:**
- Add: `docs/development/simulator-verification.md`
- Test: resolved Expo config and export output.

- [x] Reproduce the encoded auth-wallpaper request from a clean Metro start and trace it to the other Kwilt development client reconnecting to Kwilt Money's Metro port.
- [x] Document the exact clean-launch sequence without changing valid application asset code.
- [x] Run a production-style iOS Expo export and a fresh simulator launch.

### Task 7: Full verification

**Files:**
- Verify all modified files and preserve pre-existing user changes.

- [x] Run `npm run lint`.
- [x] Run `npm run test:forecast`.
- [x] Run `npm run test:living-plan`.
- [x] Run `npm run test:security`.
- [x] Run `npm run job-delivery:check` and `git diff --check`.
- [x] Re-read this plan and report any signed-in or native-only proof that remains unverified.
