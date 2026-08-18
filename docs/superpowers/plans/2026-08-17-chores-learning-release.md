# Chores Learning Release Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Kwilt-Labs-gated native Chores inventory that makes the accepted child claim and completion lifecycle operable with a replaceable local learning adapter.

**Architecture:** Add Chores as a direct root capability and keep the learning data behind `src/capabilities/chores`. A pure domain module owns stable occurrence records, member projections, progress, and transitions; a small persisted Zustand store owns the temporary local adapter; the screen only renders projections and dispatches actions. Production Activity sync, Household authority, and To-dos projection remain untouched.

**Tech Stack:** React Native, Expo SDK 54, TypeScript, React Navigation, Zustand persistence, AsyncStorage, Jest, React Native Testing Library.

---

## UI contract

Job: When household work is ready, a child needs to distinguish what is theirs from what they may choose, so they can act without another negotiation.

Authority chain: accepted Chores brief -> Kwilt pattern atlas and local UI/tokens -> Groceries inventory precedent -> iOS/Android accessibility conventions -> RNR anatomy for generic button and drawer completeness.

Three-second read: `Chores`, active child, expectation progress, `For [child]`, `Household`.

Primary action: `Take` on one available household row; direct completion is the row's canonical state control.

Primary information: title, responsibility grouping, lifecycle state. Secondary information: token value. Reveal later: member choices in the existing BottomDrawer. Scan order: header/member -> compact progress -> assigned rows -> available rows. Must not add: dashboard cards, charts, rankings, separate streak, caregiver configuration, recurrence chrome, or Screen Time claims.

Reuse map: shell -> `AppShell`; header -> `PageHeader`; scrolling -> `CanvasScrollView`; controls -> `Button`; identity -> `ProfileAvatar` + `BottomDrawer`; typography -> `src/ui/primitives`; icons -> `Icon`.

Nearest precedent: `GroceryListScreen` for quiet inventory hierarchy and direct row actions; Chores differs by grouping responsibility and preserving lifecycle state rather than shopping coverage.

External exemplar ledger: N/A.

Behavior sources: grouping, claim, completion, review, tokens -> accepted feature brief and Activity-backed system design; Labs gate -> existing Explore activation pattern.

Unresolved decisions: production claim leases, approval queue, assignment scope, Household Mode authentication. Required states: assigned, claimed, available, completed, waiting for approval, empty member. Proof path: Settings > Kwilt Labs > Chores on iPhone 17 Pro Simulator, including member switch, Take, complete, reset/relaunch persistence.

### Task 1: Add the pure learning domain with red-green tests

**Files:**
- Create: `src/capabilities/chores/domain/choreLearning.ts`
- Test: `src/capabilities/chores/domain/choreLearning.test.ts`

- [ ] **Step 1: Write failing tests** for `createChoreLearningRecord`, `projectChoreInventory`, `takeChoreOccurrence`, `releaseChoreOccurrence`, and `completeChoreOccurrence`. Assert stable `activityOccurrenceId`, member isolation, `Take` movement from Household to `For [member]`, one completion per occurrence, pending-review preservation, and count/token separation.
- [ ] **Step 2: Run** `npm test -- --runInBand src/capabilities/chores/domain/choreLearning.test.ts` and confirm the missing-module failure.
- [ ] **Step 3: Implement** discriminated occurrence lifecycle types and pure immutable transitions. Invalid actor/state transitions return the unchanged record; trusted completion records the performing member and completion time.
- [ ] **Step 4: Rerun** the focused test and require zero failures.

### Task 2: Add the versioned local learning adapter

**Files:**
- Create: `src/capabilities/chores/runtime/useChoreLearningStore.ts`
- Test: `src/capabilities/chores/runtime/useChoreLearningStore.test.ts`

- [ ] **Step 1: Write failing tests** for versioned normalization, member switching, take/release/complete dispatch, and reset.
- [ ] **Step 2: Implement** a Zustand persisted store at `kwilt-chores-learning-v1` whose state is one normalized `ChoreLearningRecord` and whose commands delegate to the pure domain functions.
- [ ] **Step 3: Run** both Chores domain/store suites and require zero failures.

### Task 3: Register and gate Chores as a direct capability

**Files:**
- Modify: `src/labs/kwiltLabs.ts`
- Modify: `src/labs/kwiltLabs.test.ts`
- Modify: `src/capabilities/types.ts`
- Modify: `src/capabilities/registry.ts`
- Modify: `src/navigation/CapabilityMenu.tsx`
- Modify: `src/navigation/CapabilityMenu.test.tsx`
- Modify: `src/navigation/capabilityNavigation.ts`
- Modify: `src/navigation/capabilityNavigation.test.ts`
- Modify: `src/navigation/CapabilityShellContext.tsx`
- Modify: `src/navigation/CapabilityShellContext.test.ts`
- Modify: `src/navigation/RootNavigator.tsx`
- Modify: `src/navigation/linkingConfig.ts`

- [ ] **Step 1: Extend failing tests** so `chores` is a known Lab, hidden from the menu while disabled, visible as a direct destination while enabled, navigates to `{ name: 'Chores' }`, and derives as the active capability.
- [ ] **Step 2: Add** `chores` to the capability types and registry with `group: null`, `icon: 'home'`, root route `Chores`, and deep link `kwilt://chores`.
- [ ] **Step 3: Add** the Labs toggle and pass `choresEnabled` through the existing capability-menu host.
- [ ] **Step 4: Add** the root navigation/linking seams and rerun the focused navigation, menu, and Labs suites.

### Task 4: Build the native inventory and member switcher

**Files:**
- Create: `src/capabilities/chores/FEATURE.md`
- Create: `src/capabilities/chores/screens/ChoresScreen.tsx`
- Create: `src/capabilities/chores/screens/ChoresScreen.test.tsx`
- Modify: `src/navigation/RootNavigator.tsx`

- [ ] **Step 1: Write screen tests** that assert the three-second hierarchy, member switcher, `Take` movement, trusted completion, waiting-approval copy, quiet token metadata, and no dashboard/reward language.
- [ ] **Step 2: Build** `ChoresScreen` from `AppShell`, `PageHeader`, `CanvasScrollView`, `ProfileAvatar`, `BottomDrawer`, `Button`, `Icon`, and local typography/tokens. Keep one flat canvas and section separators; do not nest dashboard cards.
- [ ] **Step 3: Wire** `ChoresCapabilityHost` behind the Labs gate, using the same disabled-capability fallback as Explore.
- [ ] **Step 4: Run** the Chores screen suite and the focused capability/navigation suites.

### Task 5: Verify the learning release

**Files:**
- Verify: all changed files

- [ ] **Step 1: Run** `npm run product:lint`, `npm run architecture:lint`, and `git diff --check`.
- [ ] **Step 2: Start the existing Expo runtime from this checkout, open Settings > Kwilt Labs, enable Chores, then navigate through the real capability menu on iPhone 17 Pro Simulator.
- [ ] **Step 3: Operate** member switching, Take, trusted completion, pending approval, long titles, and relaunch persistence; capture reviewable screenshots.
- [ ] **Step 4: Run once** `npm run verify:changed -- --run` after the slice is stable.
- [ ] **Step 5: Re-read the accepted brief and record any remaining unverified native, backend, Household Mode, To-dos projection, and signed-device gates.
