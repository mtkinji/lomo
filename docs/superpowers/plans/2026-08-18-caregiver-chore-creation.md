# Caregiver Chore Creation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a caregiver-only Chores action dock that directly reuses To-do Quick Add, opens an immediately editable New chore drawer with non-blocking AI enrichment, creates local Activity-backed Chore occurrences only on Add chore, opens child review requests from the dock, and launches truthful contextual Chat.

**Architecture:** Keep the existing `QuickAddDock` as the capture component and add one optional action-filter prop so Chores can expose only steps/triggers/details. Put Chore draft defaults, enrichment mapping, touched-field arbitration, and local publication in a pure `choreCreation` module, then let `ChoresScreen` orchestrate transient editor state and the existing local Zustand store persist only committed records. Reuse the existing Chores review drawer and Unified Chat drawer; do not add a fake Chat write operation while Chores remains Labs-local.

**Tech Stack:** React Native, Expo SDK 54, TypeScript, Zustand persistence, Jest, React Native Testing Library, Kwilt UI primitives, existing Activity AI enrichment service.

---

## UI contract

Job: When a caregiver notices household work, they need to capture it in one sentence and immediately shape the actual chore while AI fills useful structure, so they can add a child-legible responsibility without configuring a task system.

Authority chain: explicit user decisions -> Chores feature brief -> Kwilt Pattern Atlas -> `QuickAddDock`, `BottomDrawer`, `KwiltLoader`, picker/input/button primitives -> iOS/accessibility.

Three-second read: **Add a chore** at rest; **New chore**, **For**, **Available**, and **Add chore** in the editor.

Primary action: **Add chore**.

Primary information: title, participant, availability.

Secondary information: definition of done, review policy, conditional token value.

Reveal later: picker choices and optional policy.

Scan order: inventory -> dock -> New chore -> required fields -> optional fields -> Add chore.

Must not add: preview/confirmation drawer, draft list, blocking loader, generic recurrence UI, expectations, Screen Time, or child-visible caregiver controls.

Reuse map: capture -> `QuickAddDock`; loading -> `KwiltLoader`; editor -> `BottomDrawer`; commit -> `BottomDrawerFooter`; choices -> `SmallSetPickerField`; review -> `ChoreReviewDrawer`; Chat -> `UnifiedChatDrawer`.

Nearest precedent: To-do Quick Add for capture; Chores detail/review drawers for capability language. The Chore-specific difference is that submit opens the editor and does not commit.

External exemplar ledger: N/A.

Behavior sources: `docs/design-explorations/parent-chore-creation/03-converge.md`, `04-learning-release.md`, `05-evaluate-learning.md`, `06-ui-contract.md`.

Unresolved decisions: production typed Chat draft handoff remains excluded until household-authorized Chores operations exist.

Required states: caregiver zero/one review; child; focused dock; loading; enriched; failed; edit race; save race; dismiss race; tokens off/on; assigned/open; relaunch.

Proof path: Settings -> Kwilt Labs -> Chores on iPhone 17 Pro / iOS 26.5 Simulator.

### Task 1: Define and test the Chore draft contract

**Files:**
- Create: `src/capabilities/chores/domain/choreCreation.ts`
- Create: `src/capabilities/chores/domain/choreCreation.test.ts`

- [ ] Write failing tests for `createChoreDraft`, `applyChoreDraftEnrichment`, and `addChoreDraftToLearningRecord` covering visible Household/As-needed defaults, exact fixture-member matching, recurrence mapping, definition-of-done mapping, touched-field protection, caregiver authority, stable IDs, and assigned/open occurrence state.
- [ ] Run `npm test -- --runInBand src/capabilities/chores/domain/choreCreation.test.ts` and confirm the missing module/functions fail.
- [ ] Define `ChoreDraft`, `ChoreAvailability`, `ChoreDraftTouchedFields`, and the three pure functions. Map only `steps`, `notes`, and supported `repeatRule` fields from `ActivityAiEnrichment`; ignore reminders, dates, Goals, tags, priority, difficulty, and place.
- [ ] Rerun the focused test and confirm it passes.

### Task 2: Persist committed local Chores only

**Files:**
- Modify: `src/capabilities/chores/domain/choreLearning.ts`
- Modify: `src/capabilities/chores/domain/choreLearning.test.ts`
- Modify: `src/capabilities/chores/runtime/useChoreLearningStore.ts`
- Modify: `src/capabilities/chores/runtime/useChoreLearningStore.test.ts`

- [ ] Add failing tests requiring `availability` on normalized occurrences and a caregiver-only `addChore` store action.
- [ ] Run the two focused suites and confirm failure.
- [ ] Bump the local persisted record to version 5, migrate earlier records with `availability: 'as_needed'`, validate supported availability, and add `addChore(draft, createdAtIso, idSeed)` that delegates to the pure function.
- [ ] Rerun the two focused suites and confirm they pass.

### Task 3: Reuse QuickAddDock with Chore-relevant AI actions

**Files:**
- Modify: `src/features/activities/QuickAddDock.tsx`
- Modify: `src/features/activities/QuickAddDock.test.tsx`

- [ ] Add a failing component test showing that `availableAiActions={['steps','triggers','details']}` omits **Find cover** while retaining the same Quick Add composer.
- [ ] Run `npm test -- --runInBand src/features/activities/QuickAddDock.test.tsx` and confirm the new expectation fails.
- [ ] Add the optional `availableAiActions` prop, filter rendering and selected-action summaries through it, and preserve every existing caller when the prop is omitted.
- [ ] Rerun the focused test and confirm it passes.

### Task 4: Build the actual New chore editor

**Files:**
- Create: `src/capabilities/chores/components/ChoreEditorDrawer.tsx`
- Create: `src/capabilities/chores/components/ChoreEditorDrawer.test.tsx`

- [ ] Add component tests for immediately editable required fields, canonical **Adding details…** loader, non-disabled editing/loading state, participant and availability choices, optional completion/token behavior, **Add chore**, and dismissal.
- [ ] Implement one `BottomDrawer` with `BottomDrawerScrollView`, `BottomDrawerHeader`, `Input`, project picker/settings primitives, and `BottomDrawerFooter`. Keep the loader compact and live-announced; never cover or disable the editor.
- [ ] Run the focused component test and correct behavior/accessibility failures.

### Task 5: Compose the caregiver dock and local creation flow

**Files:**
- Modify: `src/capabilities/chores/screens/ChoresScreen.tsx`
- Modify: `src/capabilities/chores/screens/ChoresScreen.test.tsx`

- [ ] Add failing screen tests for no child dock, caregiver `QuickAddDock` reuse, submit opening the editor without an inventory write, loader visibility, safe AI failure, touched-field protection, save/dismiss late-result invalidation, committed child projection, conditional review button, removed `BottomGuide`, and Chat circle.
- [ ] Render `QuickAddDock` only for the caregiver, reserve trailing width for Chat and conditional review circles, and place both `FloatingDockActionButton`s on the same canonical bottom line.
- [ ] On submit, open `ChoreEditorDrawer` immediately, start `enrichActivityWithAI`, apply results only to untouched fields for the active request, and clear/invalidate on save or close.
- [ ] Save through the store's caregiver-authorized `addChore` action and show a concise local receipt. Replace `BottomGuide` with the conditional review action.
- [ ] Add `UnifiedChatDrawer` only after a truthful Chores inventory launch context compiles and is covered; do not add any Chores write tool or success claim.
- [ ] Run the focused screen suite and correct failures.

### Task 6: Add truthful Chores contextual Chat launch

**Files:**
- Modify: `src/features/unifiedChat/requestPolicy.ts`
- Modify: `src/features/unifiedChat/launchContext.ts`
- Modify: `src/features/unifiedChat/launchContext.test.ts`
- Modify: `src/features/unifiedChat/contextualChatPresentation.ts`
- Modify: `src/features/unifiedChat/contextualChatPresentation.test.ts`

- [ ] Add failing tests for capability-level Chores launch attachment, **Chat about chores** copy, and no fake Chore draft offers.
- [ ] Add `chores` as a contextual capability ID and inventory launch label without registering tools, evidence reads, or mutations. Preserve the existing `chores.open` boundary evaluation.
- [ ] Rerun the focused Chat tests and the capability coverage contract.

### Task 7: Verify and review the learning slice

**Files:**
- Modify if needed: `docs/agent-code-map.md`
- Update: `docs/design-explorations/parent-chore-creation/04-learning-release.md`
- Update: `docs/design-explorations/parent-chore-creation/05-evaluate-learning.md`

- [ ] Run all focused Chores, Quick Add, and contextual Chat suites.
- [ ] Confirm the active Metro/server belongs to `/Users/andrewwatanabe/Kwilt`, branch `codex/chores`, current HEAD, and one runtime owner before using it.
- [ ] Operate the Labs route in the iPhone 17 Pro / iOS 26.5 Simulator through caregiver dock, delayed loading, field edit, save, AI failure, child projection, review request, and Chat launch.
- [ ] Run a fresh visual-critic pass against `06-ui-contract.md`; fix any critical failure and rerender.
- [ ] Run `npm run verify:changed -- --run` once after the diff is stable.
- [ ] Reconcile docs with the actual proof and leave production Household, physical-device, TestFlight, and backend gates explicit.
