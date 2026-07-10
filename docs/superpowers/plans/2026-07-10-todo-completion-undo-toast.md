# To-do Completion Undo Toast Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show a five-second `To-do complete` toast with a safe Undo action from every primary Activity completion surface.

**Architecture:** Add a small pure snapshot/restoration helper beside the Activities feature so Undo can restore the prior completion state only when the toast still matches the current completion. Wire the existing global toast action into Activities, Activity Detail, Goal Detail, and Plan without changing their established completion side effects.

**Tech Stack:** React Native, TypeScript, Zustand, Jest, existing `ToastHost`/`useToastStore`.

---

### Task 1: Guarded completion restoration

**Files:**
- Create: `src/features/activities/activityCompletionUndo.ts`
- Test: `src/features/activities/activityCompletionUndo.test.ts`

- [ ] **Step 1: Write failing tests** for snapshot capture, successful restoration, unrelated-field preservation, and stale-completion refusal.
- [ ] **Step 2: Run** `npm test -- src/features/activities/activityCompletionUndo.test.ts --runInBand` and confirm the missing module fails.
- [ ] **Step 3: Implement** `buildActivityCompletionUndoSnapshot` and `restoreActivityCompletionFromSnapshot`, keyed by the represented `completedAt` value.
- [ ] **Step 4: Re-run the focused test** and confirm it passes.

### Task 2: Wire the existing toast contract

**Files:**
- Modify: `src/features/activities/ActivitiesScreen.tsx`
- Modify: `src/features/activities/ActivityDetailScreen.tsx`
- Modify: `src/features/arcs/GoalDetailScreen.tsx`
- Modify: `src/features/plan/ActivityEventPeek.tsx`

- [ ] **Step 1: Capture a snapshot before each direct completion** and show `{ message: 'To-do complete', variant: 'light', durationMs: 5000, actionLabel: 'Undo' }` only when the transition reaches `done`.
- [ ] **Step 2: Restore through the guarded helper** in each toast action and emit the existing completion-toggle analytics transition only when restoration succeeds.
- [ ] **Step 3: Add `Undo` to Activity Detail's existing post-animation toast**, reusing its established `handleToggleComplete` semantics so Finish can revert the steps it checked.
- [ ] **Step 4: Run focused tests** for the helper and Plan peek component, then run `npm run lint`.

### Task 3: Product links and completion verification

**Files:**
- Modify: `src/features/activities/FEATURE.md`
- Modify: `src/features/arcs/FEATURE.md`
- Modify: `src/features/plan/FEATURE.md`

- [ ] **Step 1: Add `todo-completion-undo-toast`** to the affected manifests and refresh `last_reviewed`.
- [ ] **Step 2: Run** `npm run product:lint`.
- [ ] **Step 3: Run** `npm run verify:changed -- --run`.
- [ ] **Step 4: In the native iOS runtime**, complete and undo a to-do from Activities, Activity Detail, Goal Detail, and Plan; verify the item returns and the toast does not compete with completion animation.
