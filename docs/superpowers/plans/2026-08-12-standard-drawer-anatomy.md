# Standard Drawer Anatomy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Kwilt's high grab handle and compact shared header the default anatomy for ordinary bottom drawers while preserving deliberate immersive, branded, and keyboard-dock exceptions.

**Architecture:** Keep `BottomDrawer` as the canonical mechanics owner and move standard chrome measurements into one component-token module consumed by the drawer, header, tests, and Storybook specimen. Apply the default globally, remove ordinary large-header overrides, and retain explicit low-level styling only for documented exceptional surfaces until they receive named variants.

**Tech Stack:** React Native, Expo, TypeScript, Jest, React Native Testing Library, Kwilt design-system documentation and Storybook.

---

### Task 1: Tokenize and test standard drawer chrome

**Files:**
- Create: `src/ui/drawerTokens.ts`
- Modify: `src/ui/BottomDrawer.tsx`
- Modify: `src/ui/layout/BottomDrawerHeader.tsx`
- Test: `src/ui/BottomDrawer.accessibility.test.tsx`
- Test: `src/ui/layout/BottomDrawerHeader.test.tsx`

- [ ] Add component-owned tokens for zero sheet-top padding, an 8-point handle top inset, a 4-point handle-to-header inset, the standard 64-by-5 handle, and the `sm` header-title variant.
- [ ] Update `BottomDrawer` and `BottomDrawerHeader` to consume those tokens without changing drawer behavior, snap points, gestures, safe areas, or dismissal.
- [ ] Add focused render assertions proving the default surface and handle geometry and the compact shared header typography.
- [ ] Run `npm test -- --runInBand src/ui/BottomDrawer.accessibility.test.tsx src/ui/layout/BottomDrawerHeader.test.tsx`; expect both suites to pass.

### Task 2: Remove ordinary large-header exceptions

**Files:**
- Modify: `src/capabilities/money/screens/MoneyCategoryDetailScreen.tsx`
- Modify: `src/capabilities/money/screens/MoneyTransactionDetailScreen.tsx`
- Modify: `src/capabilities/money/screens/MoneySummaryScreen.tsx`
- Modify: `src/features/household-food/components/MealSetupDrawer.tsx`
- Test: `src/capabilities/money/screens/MoneyCategoryDetailScreen.test.tsx`
- Test: `src/capabilities/money/screens/MoneyTransactionDetailScreen.test.tsx`

- [ ] Remove `lg` and `md` title overrides from ordinary task, choice, and review drawer headers so they inherit `titleSm`.
- [ ] Preserve the large branded Games header as an explicit product-local exception.
- [ ] Extend the focused source-contract tests to reject large title overrides on the migrated Money drawers.
- [ ] Run the affected Money and household-food drawer tests; expect all selected suites to pass.

### Task 3: Align the design-system authority

**Files:**
- Modify: `docs/design-system/drawer-guidance.md`
- Modify: `docs/design-system/component-inventory.md`
- Modify: `docs/design-system/stories/drawers.stories.tsx`

- [ ] Record the product-owner decision that high-handle chrome and `titleSm` are canonical for standard drawers.
- [ ] Document immersive, interstitial/branded, and keyboard-dock exceptions as explicit anatomy variants rather than accidental caller drift.
- [ ] Make the Storybook specimen consume the same component tokens so its handle cannot drift from production geometry.

### Task 4: Verify the shared change

**Files:**
- Verify only; do not modify unrelated dirty files.

- [ ] Run `git diff --check`; expect no whitespace errors in the scoped diff.
- [ ] Run `npm run architecture:lint`; expect exit 0 with only documented pre-existing warnings.
- [ ] Run `npm run verify:changed -- --run`; expect all selected automated gates to pass or report the exact unrelated dirty-work blocker.
- [ ] Inspect representative standard, progressive, and exceptional drawers in the iPhone 17 Pro Simulator when the active Metro/runtime provenance is known; record Simulator proof separately from source and test proof.

No commit, push, pull request, or worktree operation is authorized by this plan.
