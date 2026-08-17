# Plan Helper And Contextual Chat Implementation Plan

> **For agentic workers:** Execute this plan inline in the current Kwilt checkout. Do not create a worktree or commit while unrelated user changes share the branch.

**Goal:** Restore a direct, count-aware Plan helper action and add a distinct contextual Chat action scoped to the selected Plan day.

**Architecture:** Add a small Plan-owned floating action dock that opens the existing recommendations drawer or the existing `UnifiedChatDrawer`. Extend the shared launch-context contract with a bounded `plan` / `day` reference so Chat receives the selected local date and can return to that exact Plan day; keep all planning operations in the existing Plan capability.

**Tech Stack:** React Native, Expo, TypeScript, React Navigation, Jest, React Native Testing Library.

---

## UI contract

- **Job:** When a day looks under-planned or needs trade-off help, the user needs to either see concrete placement recommendations or discuss the day without restating its date.
- **Authority chain:** accepted user recommendation -> Plan's existing recommendations drawer -> Goals/Grocery floating-control precedents -> Kwilt tokens and local UI components -> iOS accessibility conventions.
- **Three-second read:** the selected day and calendar remain primary; one black `Plan this day` pill is the dominant next action; Chat is visibly secondary.
- **Primary action:** `Plan this day · N` when recommendations are available, otherwise `Plan this day`.
- **Secondary action:** circular `navAiGuide` control labeled `Chat about this day`.
- **Reveal later:** recommendation details and conversational workbench content stay in their existing progressive drawers.
- **Scan order:** selected date -> scheduled day -> Plan this day -> Chat.
- **Must not add:** a prompt carousel, AI badge, mode picker, separate Plan assistant, invisible broad context, or a durable empty thread.
- **Reuse map:** `FloatingControlSurface`, `FloatingDockActionButton`, `UnifiedChatDrawer`, `PlanPager`, and shared resting-composer geometry.
- **Nearest precedent:** Grocery's primary pill plus circular secondary dock for hierarchy; Goals' contextual Chat drawer for launch and resumption behavior.
- **External exemplar ledger:** N/A.
- **Behavior sources:** explicit user decision for the action split; existing `PlanPager` recommendation callbacks; contextual Chat launch/drawer contracts.
- **Unresolved decisions:** none that change the accepted slice.
- **Required states:** zero/multiple recommendations, selected-date changes, drawer open/close, first-send thread creation, exact Plan return.
- **Proof path:** Plan tab on iPhone Simulator; open both actions; verify 60% -> 100% Chat expansion and selected-date scope.

### Task 1: Extend Plan launch context

**Files:**
- Modify: `src/features/unifiedChat/launchContext.ts`
- Test: `src/features/unifiedChat/launchContext.test.ts`
- Modify: `src/features/unifiedChat/contextualChatPresentation.ts`
- Test: `src/features/unifiedChat/contextualChatPresentation.test.ts`

- [x] Add a failing test that resolves `{ capabilityId: 'plan', object: { type: 'day', id: '2026-08-17' } }` to a visible day attachment with the exact return target.
- [x] Add a failing test for the Plan drawer title and placeholder.
- [x] Run `npm test -- --runInBand src/features/unifiedChat/launchContext.test.ts src/features/unifiedChat/contextualChatPresentation.test.ts` and confirm the new cases fail.
- [x] Add `plan` and `day` to the narrow launch-only type contract, project a valid local date key without loading private objects, and add Plan drawer copy.
- [x] Re-run the focused tests and confirm they pass.

### Task 2: Restore the direct helper and add contextual Chat

**Files:**
- Create: `src/features/plan/PlanActionDock.tsx`
- Create: `src/features/plan/PlanActionDock.test.tsx`
- Modify: `src/features/plan/PlanScreen.tsx`
- Test: `src/features/plan/PlanScreen.test.tsx`

- [x] Add a component test proving the primary label includes a positive recommendation count and the secondary control exposes `Chat about this day`.
- [x] Add screen tests proving the primary action opens `PlanPager` recommendations and Chat receives the selected day launch context.
- [x] Run `npm test -- --runInBand src/features/plan/PlanActionDock.test.tsx src/features/plan/PlanScreen.test.tsx` and confirm the new cases fail.
- [x] Compose the dock from the existing floating surface and circular action primitives, using shared 48-point resting geometry and compact bottom inset.
- [x] Wire `PlanScreen` to the existing recommendation snap-index state and a `UnifiedChatDrawer` whose scope, object id, and return target follow the selected local date.
- [x] Reset the in-visit contextual thread when the selected day changes so a prior day's thread is never silently reused under a new scope.
- [x] Re-run the focused tests and confirm they pass.

### Task 3: Verify the complete slice

**Files:**
- Verify only; no additional planned file changes.

- [x] Run the four focused Jest files together.
- [x] Run `npm run lint`; run `npm run lint:tests` and record its unrelated Grocery/Recipes missing-module blockers.
- [x] Run `npm run verify:changed -- --run` and distinguish failures caused by unrelated dirty files.
- [x] Open Plan in the current iOS Simulator runtime, verify both controls, open the recommendations drawer, open contextual Chat, focus the composer to reach 100% height, and inspect hierarchy at the smallest tested viewport.
- [x] Run the reductive visual critic: one dominant action, secondary Chat, no obscured calendar interaction, safe-area correctness, clear selected-day scope, and bounded return target.
