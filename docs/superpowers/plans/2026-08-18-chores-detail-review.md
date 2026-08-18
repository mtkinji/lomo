# Chores Detail And Review Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the local Chores learning slice with child detail, optional household tokens, and a caregiver-owned approval queue.

**Architecture:** Keep `ChoreLearningRecord` as the versioned local adapter and add only the state required to simulate the accepted product contract: member roles, optional token policy, definition-of-done copy, review receipts, and another-pass state. Keep projections and transitions pure, then let the Zustand store delegate to them. Compose the screen from the existing inventory plus capability-local detail/settings/review drawers using Canonical `BottomDrawer`, `BottomGuide`, `BottomDrawerHeader`, `BottomDrawerFooter`, `Button`, and `SettingsToggleRow`.

**Tech Stack:** React Native, Expo, TypeScript, Zustand persistence, Jest, React Native Testing Library, Kwilt UI primitives.

---

## UI contract

Job: When household work is available or awaiting review, a child needs enough context to act and a caregiver needs a bounded place to resolve submissions, so the household can move without a second task system or approval inbox.

Authority chain: accepted Chores brief -> iOS/accessibility -> Kwilt UI constitution and Canonical drawer/button/settings primitives -> Candidate inventory/list and detail/review patterns -> current Chores inventory.

Three-second read: child = chore identity, responsibility, current action; caregiver = pending review count, next item, approve/another-pass decision.

Primary action: the occurrence's one current action; in review detail, `Approve`.

Primary information: title, actor/eligibility, definition of done, review state.

Secondary information: meaningful timing and token value only when enabled.

Reveal later: definition of done and lower-frequency release/another-pass controls.

Scan order: Chores/member -> progress or approval attention -> current inventory -> contextual drawer.

Must not add: full detail route, global notification inbox, blind bulk approval, required photo proof or automated photo judgment, rankings, token residue when disabled, caregiver-authentication theater, or Screen Time claims.

## 2026-08-18 evidence-first review amendment

Job: When a caregiver reviews a submitted chore, they need to identify the child and inspect any evidence at a glance, so they can make a calm decision without reading workflow copy.

Authority chain: explicit user decision -> Chores feature brief -> Kwilt BottomDrawer/Button/ProfileAvatar primitives -> iOS accessibility conventions.

Three-second read: chore title -> submitted photo -> Charlie identity pill -> checkmarked Approve.

Primary action: Approve, with a leading checkmark.

Primary information: definition of done, optional submitted photo, performer identity.

Secondary information: optional reward and another-pass note field.

Reveal later: photo selection happens only from the child's chore detail.

Scan order: title -> definition/photo -> performer pill -> note if needed -> decision.

Must not add: `Done by` subtitle, instructional review copy, mandatory evidence, caregiver photo upload, AI adjudication, or bulk approval.

Reuse map: drawer mechanics -> `BottomDrawer`; identity -> `ProfileAvatar`; evidence -> native `Image`; selection -> Expo Image Picker plus app-owned file persistence; actions -> `Button` and `Icon`.

Required states: no photo, seeded fixture photo, child-added photo, permission denied, canceled picker, one/many review, returned for another pass.

Proof path: Labs > Chores on iPhone 17 Pro/iOS 26.5 Simulator, child detail through caregiver review.

Reuse map: attention -> `BottomGuide`; review/detail/settings -> `BottomDrawer` + `BottomDrawerHeader`; fixed decisions -> `BottomDrawerFooter`; actions -> `Button`; token setting -> `SettingsToggleRow`; count -> capability-local neutral badge treatment.

Nearest precedent: Groceries inventory for flat scanning; Kwilt detail/review drawer anatomy for bounded evidence and one decision. Chores differs by actor-aware completion and review state.

External exemplar ledger: N/A.

Behavior sources: user-approved 2026-08-18 refinement and `brief-chores-as-recurring-activities`.

Unresolved decisions: production push cadence, authenticated caregiver delivery, series configuration, and correction history remain excluded.

Required states: child ready/available/claimed/waiting/needs-another-pass/completed; tokens on/off; caregiver zero/one/many approvals; first-caregiver-wins already-resolved behavior at the future backend seam.

Proof path: Settings > Kwilt Labs > Chores on iPhone 17 Pro Simulator; inspect row detail, token-off and token-on states, submit for review, caregiver one/many queue, approve, needs-another-pass, and relaunch persistence.

### Task 1: Extend the pure learning contract

**Files:**
- Modify: `src/capabilities/chores/domain/choreLearning.ts`
- Test: `src/capabilities/chores/domain/choreLearning.test.ts`

- [ ] Add failing tests for `tokensEnabled: false`, caregiver role projection, pending review counts, approval preserving `performedByMemberId`/`performedAtIso`, and `Needs another pass` returning the same occurrence.
- [ ] Run `npm test -- --runInBand src/capabilities/chores/domain/choreLearning.test.ts` and confirm the new expectations fail.
- [ ] Add `role`, `definitionOfDone`, optional review receipt fields, `needs_another_pass`, `setChoreTokensEnabled`, `approveChoreOccurrence`, `returnChoreOccurrenceForAnotherPass`, and caregiver/approval projections.
- [ ] Rerun the focused domain test and confirm it passes.

### Task 2: Persist the accepted transitions

**Files:**
- Modify: `src/capabilities/chores/runtime/useChoreLearningStore.ts`
- Test: `src/capabilities/chores/runtime/useChoreLearningStore.test.ts`

- [ ] Add failing store tests for token toggling, caregiver approval, another-pass feedback, and actor authorization.
- [ ] Run `npm test -- --runInBand src/capabilities/chores/runtime/useChoreLearningStore.test.ts` and confirm failure.
- [ ] Add store actions that delegate to the pure transitions and bump the persisted schema with normalization/migration that safely falls back from malformed state.
- [ ] Rerun the focused store test and confirm it passes.

### Task 3: Build the detail and caregiver review drawers

**Files:**
- Create: `src/capabilities/chores/components/ChoreDetailDrawer.tsx`
- Create: `src/capabilities/chores/components/ChoreReviewDrawer.tsx`
- Create: `src/capabilities/chores/components/ChoreSettingsDrawer.tsx`
- Modify: `src/capabilities/chores/screens/ChoresScreen.tsx`
- Test: `src/capabilities/chores/screens/ChoresScreen.test.tsx`

- [ ] Add component expectations for row-tap detail, stateful drawer actions, total removal of token copy when disabled, caregiver-only settings, one/many review entry, approval, and another-pass copy.
- [ ] Implement capability-local drawer anatomy using Canonical drawer headers, scroll helpers, footer geometry, buttons, and settings toggle row.
- [ ] Treat row completion as intent: open the taller detail drawer without mutating state, make optional camera capture easy, and require the drawer's explicit completion/submission action.
- [ ] Add a caregiver-only floating guide that opens one direct review or a multi-item queue without adding a global inbox or bulk approval.
- [ ] Run the focused screen tests and correct hierarchy or accessibility failures.

### Task 4: Surface caregiver attention in the capability menu

**Files:**
- Modify: `src/navigation/CapabilityMenu.tsx`
- Modify: `src/navigation/CapabilityShellContext.tsx`
- Test: `src/navigation/CapabilityMenu.test.tsx`
- Test: `src/navigation/CapabilityShellContext.test.ts`

- [ ] Add failing tests that require a caregiver-only numeric Chores badge and no badge in child context or at zero.
- [ ] Project the local approval count/actor role into the capability shell and render a neutral count at the end of the Chores destination.
- [ ] Give the Chores destination an accessibility label/value that includes the pending count without changing its visible name.
- [ ] Rerun focused navigation tests.

### Task 5: Verify the learning slice

**Files:**
- Modify if generated: `docs/agent-code-map.md`

- [ ] Run the focused Chores and navigation suites.
- [ ] Start or reuse Metro only after confirming it belongs to this checkout and branch.
- [ ] Operate the real Labs > Chores path in the iPhone 17 Pro Simulator across token, detail, submit, one/many review, approval, another-pass, and persisted reload states.
- [ ] Run a fresh visual critic against the UI contract and fix any critical failure before rerendering.
- [ ] Run `npm run verify:changed -- --run` once after the diff is stable.
- [ ] Reconcile the durable Kwilt Activity only after implementation and verification pass.
