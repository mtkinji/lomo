# Screen Time Rule Governance Implementation Plan

> Partially implemented inventory/prototype plan. Task 4's inline builder is
> superseded by `2026-08-16-structured-screen-time-rule-builder.md`.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the misleading fixed-mode Screen Time management composition with scoped rule inventories, individual Money rules, Household setup separation, and a constrained personal rule builder.

**Architecture:** Add a pure presentation projection under `src/features/screen-time` that converts existing personal and Money domain records into stable inventory rows without changing ownership. Keep current persistence paths: personal rules in `screenTimeProtection`, Money policies in Money, and Household setup/agreements in Household. The Settings screen composes the projections and owns one inline personal editor inside My rules that creates one supported rule per currently enforceable personal condition.

**Tech Stack:** React Native, Expo, TypeScript, Zustand, Jest, React Native Testing Library, Apple Family Controls bridge.

---

### Task 1: Project Existing Rules Into One Inventory

**Files:**
- Create: `src/features/screen-time/domain/screenTimeRuleInventory.ts`
- Create: `src/features/screen-time/domain/screenTimeRuleInventory.test.ts`

- [ ] Write failing tests proving personal Focus/real-step and individual Money policies produce readable, stable rows with correct target counts and routes.
- [ ] Run `npm test -- --runInBand src/features/screen-time/domain/screenTimeRuleInventory.test.ts` and confirm the missing-module failure.
- [ ] Implement `buildMyScreenTimeRuleInventory` with no persistence or navigation side effects.
- [ ] Run the focused test and confirm all cases pass.

### Task 2: Make Personal Rule Mutation Explicit

**Files:**
- Modify: `src/services/screenTimeProtection.ts`
- Modify: `src/services/screenTimeProtection.test.ts`

- [ ] Add failing tests for listing available personal conditions, creating a missing condition, and refusing an exact condition duplicate in the bounded release.
- [ ] Run `npm test -- --runInBand src/services/screenTimeProtection.test.ts` and confirm the new expectations fail.
- [ ] Add pure helpers for available conditions and safe insertion while preserving normalization and selection identity.
- [ ] Run the focused service test and confirm it passes.

### Task 3: Build The Grouped Inventory

**Files:**
- Modify: `src/features/account/ScreenTimeProtectionSettingsScreen.tsx`
- Modify: `src/features/account/ScreenTimeProtectionSettingsScreen.test.tsx`
- Modify: `src/features/account/screenTimeOverview.ts`
- Modify: `src/features/account/screenTimeOverview.test.ts`

- [ ] Update component expectations for `My rules · N`, `Household rules · N`, individual Money rows, scoped add actions, and Household setup outside rule counts.
- [ ] Implement compact authorization and rule rows using Kwilt-owned Settings/list primitives.
- [ ] Rename `Family` to `Household` on this surface and preserve canonical routing.
- [ ] Run the account Screen Time suites and confirm they pass.

### Task 4: Add The Constrained Personal Builder

**Files:**
- Modify: `src/features/account/ScreenTimeProtectionSettingsScreen.tsx`
- Modify: `src/features/account/ScreenTimeProtectionSettingsScreen.test.tsx`

- [ ] Add component tests for opening the My-rules builder, selecting a condition, invoking Apple selection, previewing the sentence, committing the rule, cancelling, and no-condition availability.
- [ ] Implement one inline editor with `Pause [apps] when [condition]`, one primary create action, and no arbitrary logic. Saved rules remain visible and saving collapses the editor into the inventory.
- [ ] Keep Household Add rule scoped to child selection and the existing child-specific route.
- [ ] Run the focused screen suite and confirm it passes.

### Task 5: Verify Product Links And Changed Code

**Files:**
- Modify if required: `src/features/screen-time/FEATURE.md`
- Verify: all changed paths

- [ ] Run `npm run product:lint` and repair brief/manifest drift.
- [ ] Run `npm run verify:changed -- --run` and repair all relevant failures.
- [ ] Run `git diff --check`.
- [ ] Render Settings > Screen Time on the iPhone 17 Pro Simulator from this worktree and capture normal, builder, and Household setup states.
- [ ] Exercise visible affordances and report Simulator proof separately from signed-device enforcement proof.
