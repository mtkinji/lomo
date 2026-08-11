# Plan Selected Session Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let someone tap or hold a scheduled Kwilt session, move it directly, resize either edge, start Focus from a low actionable peek, and trust provider-backed time changes to save reversibly on release.

**Architecture:** Keep creation drafts and existing-session edits separate through a focused `usePlanSessionEditor` controller, while reusing the calendar lens's existing `PlanSlotDraft` geometry, handles, edge auto-scroll, and accessibility actions. A small pure session-edit model owns original-versus-draft comparison and conflict validation; one progressive inline drawer owns both an execution-focused peek and the expanded activity details state. Direct time changes persist on release with Undo rather than introducing transaction buttons.

**Tech Stack:** React Native, Expo SDK 54, TypeScript, React Native Gesture Handler, Jest, React Native Testing Library, Kwilt `BottomDrawer` and semantic UI primitives.

## Execution status — 2026-08-11

Implementation and automated verification are complete. The iPhone 17 Pro/iOS 26.5 Simulator proved tap selection, the titled overlay and two handles, the continuous full drawer resting at 25%, the 16px handle gap, canonical compact title hierarchy, and the Start Focus handoff. The extra resting height protects two-line to-do titles. The full management/detail content stays in its expanded layout below Start Focus, rests at a quiet 10% opacity as a continuation cue, and reveals linearly with drawer expansion; it remains excluded from pointer and accessibility traversal at rest. No real calendar data was changed during QA.

---

## UI contract

- **Job:** When a scheduled session no longer fits reality, the user needs to move or resize that one session so the plan becomes honest again without editing the underlying to-do.
- **Authority chain:** Andrew's accepted Selected Session Editor direction -> iOS direct-manipulation convention -> Kwilt UI Constitution and tokens -> existing Plan slot editor -> RNR anatomy reference.
- **Three-second read:** Selected to-do -> live time and duration -> `Start Focus`.
- **Primary action:** `Start Focus`; direct time changes save when the gesture ends and offer Undo.
- **Primary information:** To-do title and live time range/duration.
- **Secondary information:** No transaction buttons, redundant mode label, or close icon.
- **Reveal later:** Expanding the same drawer reveals Open, step-aware completion, Unschedule, the full steps list, notes, and tags. It does not repeat the title/time identity or offer a second Move action.
- **Scan order:** Selected calendar block -> compact title/time -> `Start Focus`.
- **Must not add:** A second time picker, auto-save on every handle update, editing of external calendar events, cross-day dragging, or changes to another session of the same to-do.
- **Reuse map:** Calendar geometry and handles -> `PlanCalendarLensPage`; progressive overlay -> `BottomDrawer`; actions -> `Button`; expanded detail body -> `ActivityEventPeek`; provider update -> `moveManagedEvent`; local compatibility fields -> `moveActivityScheduleSession`.
- **Nearest precedent:** Plan's new-slot editor; existing-session editor adds identity, original state, commit/cancel, and a much shorter drawer.
- **External exemplar ledger:** Apple Calendar iPhone guide, reviewed 2026-08-11: preserve direct block/handle manipulation and save-on-release expectations; translate confirmation into a reversible Kwilt toast; reject treating the session as the entire to-do. Sunsama working sessions, reviewed 2026-08-11: preserve one-task/many-session ownership and the transition from planning to Focus; reject desktop popout density. Todoist Today calendar, reviewed 2026-08-11: preserve calendar-as-canvas/tray-as-context; reject hover-dependent controls.
- **Behavior sources:** Tap selection, handles, one continuous drawer at a 25% resting viewport, two-line title allowance, 16px handle-to-title gap, canonical smaller title, Start Focus, expansion-progress fade, save-on-release with Undo, and long-press acceleration are Andrew's accepted direction; 15-minute steps and edge auto-scroll are existing Plan contracts; session-specific persistence is the current multi-session model.
- **Unresolved decisions:** Cross-day dragging and auto-commit-with-Undo are deliberately deferred until the staged editor is dogfooded.
- **Required states:** Unchanged, dirty, dragging, saving, outside availability, calendar conflict, missing binding, provider failure, cancel, and persisted success.
- **Proof path:** Real Plan route in the installed development client on iPhone 17 Pro/iOS 26.5 Simulator, Metro from this checkout on port 8081; tap, move, resize, cancel, and a provider-safe save where test data permits.

### Task 1: Session edit model and validation

**Files:**
- Create: `src/features/plan/planSessionEdit.ts`
- Create: `src/features/plan/planSessionEdit.test.ts`

- [ ] **Step 1: Write failing model tests**

```ts
it('creates an edit that preserves the original session', () => {
  const edit = createPlanSessionEdit({ activityId: 'a1', sessionId: 's1', start, end });
  expect(edit.original).toEqual({ start, end });
  expect(edit.draft).toEqual({ start, end });
  expect(isPlanSessionEditDirty(edit)).toBe(false);
});

it('marks only changed start or end values dirty', () => {
  const edit = updatePlanSessionEditDraft(originalEdit, { start: movedStart, end: movedEnd });
  expect(isPlanSessionEditDirty(edit)).toBe(true);
});

it('ignores the session original calendar interval when checking conflicts', () => {
  expect(getPlanSessionEditConflict({ edit, busyIntervals: [originalInterval] })).toBe(false);
});
```

- [ ] **Step 2: Run the tests and observe the missing-module failure**

Run: `npx jest src/features/plan/planSessionEdit.test.ts --runInBand`

Expected: FAIL because `planSessionEdit.ts` does not exist.

- [ ] **Step 3: Implement the pure edit model**

```ts
export type PlanSessionEdit = {
  activityId: string;
  sessionId: string;
  original: PlanSlotDraft;
  draft: PlanSlotDraft;
};

export function createPlanSessionEdit(input: {
  activityId: string;
  sessionId: string;
  start: Date;
  end: Date;
}): PlanSessionEdit;

export function updatePlanSessionEditDraft(
  edit: PlanSessionEdit,
  draft: PlanSlotDraft,
): PlanSessionEdit;

export function isPlanSessionEditDirty(edit: PlanSessionEdit): boolean;

export function formatPlanSessionDuration(start: Date, end: Date): string;

export function getPlanSessionEditConflict(args: {
  edit: PlanSessionEdit;
  busyIntervals: BusyInterval[];
}): boolean;
```

The conflict helper must ignore only an interval whose start and end both match the original session within two minutes, then test normal overlap against every remaining interval.

- [ ] **Step 4: Run the focused model test**

Run: `npx jest src/features/plan/planSessionEdit.test.ts --runInBand`

Expected: PASS.

### Task 2: Compact session editor drawer

**Files:**
- Create: `src/features/plan/PlanSessionEditPage.tsx`
- Create: `src/features/plan/PlanSessionEditPage.test.tsx`
- Modify: `src/features/plan/PlanEventPeekDrawerHost.tsx`
- Modify: `src/features/plan/PlanEventPeekDrawerHost.test.tsx`

- [ ] **Step 1: Write failing component tests**

```tsx
it('shows identity at the compact title scale without transaction actions', () => {
  const view = renderWithProviders(<PlanSessionEditPage {...model} />);
  expect(view.getByText('Work on Adobe presentation')).toBeTruthy();
  expect(view.getByText('1:00 PM - 5:00 PM · 4 hrs')).toBeTruthy();
  expect(view.queryByText('Cancel')).toBeNull();
  expect(view.queryByText('Done')).toBeNull();
});

it('uses the low inline drawer and collapses during adjustment', () => {
  renderWithProviders(<PlanEventPeekDrawerHost mode="sessionEdit" sessionEdit={model} slotAdjustmentActive />);
  expect(lastBottomDrawerProps.presentation).toBe('inline');
  expect(lastBottomDrawerProps.snapIndex).toBe(0);
});
```

- [ ] **Step 2: Run the tests and observe the missing component/mode failures**

Run: `npx jest src/features/plan/PlanSessionEditPage.test.tsx src/features/plan/PlanEventPeekDrawerHost.test.tsx --runInBand`

Expected: FAIL because the session-edit page and drawer mode do not exist.

- [ ] **Step 3: Implement the reductive drawer content**

`PlanSessionEditPage` must render a flat identity/time region. It intentionally has no mode title, close icon, labeled details action, or save/cancel row:

```tsx
<Heading variant="sm">{title}</Heading>
<Text>{`${formatTimeRange(start, end)} · ${formatPlanSessionDuration(start, end)}`}</Text>
```

Add `sessionEdit` to `PlanDrawerMode`. Host it in an inline `BottomDrawer` with drag, resting, and expanded snap points near 14%, 25%, and 85%, bottom-safe-area continuation, and the same controlled collapse behavior used by slot creation. Render the full details surface once. Keep the 25% rest backdrop-free, with room for a two-line title, a 16px handle-to-title gap, and Start Focus as the sole visible dominant action. Keep Open, step-aware completion, Unschedule, full steps, notes, and tags in their expanded positions below it, but fade them from transparent to opaque using continuous drawer expansion progress and hide them from pointer/accessibility traversal until expansion settles.

- [ ] **Step 4: Run the drawer tests**

Run: `npx jest src/features/plan/PlanSessionEditPage.test.tsx src/features/plan/PlanEventPeekDrawerHost.test.tsx --runInBand`

Expected: PASS.

### Task 3: Make an existing session become the editable calendar overlay

**Files:**
- Modify: `src/features/plan/PlanCalendarLensPage.tsx`
- Modify: `src/features/plan/PlanCalendarLensPage.test.tsx`

- [ ] **Step 1: Write failing selected-session tests**

```tsx
it('replaces the selected persisted block with the editable overlay', () => {
  const view = renderWithProviders(
    <PlanCalendarLensPage
      {...baseProps}
      kwiltBlocks={[scheduledBlock]}
      editingKwiltBlock={{ activityId: 'a1', sessionId: 's1' }}
      slotDraft={{ start, end }}
      slotDraftTitle="Work on Adobe presentation"
      onSlotDraftChange={jest.fn()}
      onSlotDraftComplete={jest.fn()}
    />,
  );
  expect(view.queryByText('Hold to move')).toBeNull();
  expect(view.getByLabelText('Move Work on Adobe presentation, 1:00 PM - 5:00 PM')).toBeTruthy();
  expect(view.getByLabelText('Change start time')).toBeTruthy();
  expect(view.getByLabelText('Change end time')).toBeTruthy();
});
```

- [ ] **Step 2: Run the calendar test and observe the missing prop/behavior failure**

Run: `npx jest src/features/plan/PlanCalendarLensPage.test.tsx --runInBand`

Expected: FAIL because an existing block cannot yet be represented as the selected overlay.

- [ ] **Step 3: Implement selected overlay ownership**

Add these props:

```ts
editingKwiltBlock?: { activityId: string; sessionId: string } | null;
slotDraftTitle?: string | null;
onBeginKwiltBlockAdjustment?: (input: {
  activityId: string;
  sessionId: string;
  start: Date;
  end: Date;
}) => void;
onKwiltBlockAdjustmentChange?: (input: {
  activityId: string;
  sessionId: string;
  draft: PlanSlotDraft;
}) => void;
```

Hide the persisted rendering only for the selected session, include the selected title in the editable overlay and accessibility label, and remove the permanent `Hold to move` helper copy from all Kwilt blocks.

- [ ] **Step 4: Add long-press direct movement**

Wrap each editable Kwilt block with a `Gesture.Pan().activateAfterLongPress(300)` gesture. On activation, trigger `canvas.selection`, seed the gesture base from that session, and notify the parent. During update, reuse the existing 15-minute translation and edge auto-scroll calculations; emit session-identified draft changes. On finalization, end the adjustment state so the drawer returns to its resting height.

- [ ] **Step 5: Run the calendar tests**

Run: `npx jest src/features/plan/PlanCalendarLensPage.test.tsx --runInBand`

Expected: PASS.

### Task 4: Stage, cancel, inspect, and commit one provider-backed session

**Files:**
- Modify: `src/features/plan/PlanPager.tsx`
- Modify: `src/services/plan/activityScheduleSessions.test.ts`

- [ ] **Step 1: Extend the session persistence regression test**

```ts
it('updates both edges of only the selected session', () => {
  const updated = moveActivityScheduleSession(activity, 'session-2', {
    start: '2026-08-11T20:30:00.000Z',
    end: '2026-08-11T22:15:00.000Z',
    updatedAt,
  });
  expect(updated.scheduleSessions?.find((item) => item.id === 'session-1')).toEqual(firstSession);
  expect(updated.scheduleSessions?.find((item) => item.id === 'session-2')).toMatchObject({
    start: '2026-08-11T20:30:00.000Z',
    end: '2026-08-11T22:15:00.000Z',
  });
});
```

- [ ] **Step 2: Run the focused persistence test**

Run: `npx jest src/services/plan/activityScheduleSessions.test.ts --runInBand`

Expected: PASS with the existing session helper, proving duration updates are already session-specific.

- [ ] **Step 3: Add separate session-edit state in `PlanPager`**

```ts
const [sessionEdit, setSessionEdit] = useState<PlanSessionEdit | null>(null);
const [isSavingSessionEdit, setIsSavingSessionEdit] = useState(false);
const calendarDraft = sessionEdit?.draft ?? slotDraft;
```

Tap or long-press starts an edit from the exact `activityId + sessionId` block. Empty-time creation, external-event selection, day navigation, and drawer close must cancel the edit without writing. `Details` must restore the existing activity peek; if the draft is dirty, confirm before discarding it.

- [ ] **Step 4: Implement one explicit provider commit**

When a move or resize gesture ends, do nothing when unchanged. Otherwise validate the draft against availability and non-original busy intervals, require the session binding, call:

```ts
await moveManagedEvent({ binding, start: sessionEdit.draft.start, end: sessionEdit.draft.end });
```

Then update only the selected session through `moveActivityScheduleSession`. Keep the peek selected, show `Plan updated` with Undo, and let Undo restore the original provider and session times. On provider error, snap the draft back to its original time and reuse the current reconnect/settings alerts.

- [ ] **Step 5: Route calendar and drawer props by edit kind**

Pass `calendarDraft`, selected identity/title, and session-adjustment callbacks to `PlanCalendarLensPage`. Use session-edit drawer ratios for `bottomOverlayInset`, select `sessionEdit` before the ordinary activity drawer mode, and pass the compact editor model into `PlanEventPeekDrawerHost`.

- [ ] **Step 6: Run the complete focused Plan suite**

Run:

```bash
npx jest \
  src/features/plan/planSessionEdit.test.ts \
  src/features/plan/PlanSessionEditPage.test.tsx \
  src/features/plan/PlanCalendarLensPage.test.tsx \
  src/features/plan/PlanEventPeekDrawerHost.test.tsx \
  src/features/plan/ActivityEventPeek.test.tsx \
  src/services/plan/activityScheduleSessions.test.ts \
  src/services/plan/kwiltCalendarBlocks.test.ts \
  --runInBand
```

Expected: all suites PASS.

### Task 5: Reduction, repository verification, and real runtime acceptance

**Files:**
- Modify only if evidence exposes a defect: files listed above.

- [ ] **Step 1: Run static verification**

Run:

```bash
git diff --check
npm run lint -- --pretty false
npm run lint:tests -- --pretty false
npm run verify:changed -- --run
```

Expected: exit 0 for every command. Because this checkout contains pre-existing Unified Chat changes, record that the changed-file gate covers both initiatives while focused Plan tests isolate this feature.

- [ ] **Step 2: Operate the actual Plan route**

From `/Users/andrewwatanabe/Kwilt`, serve the installed development client through Metro port 8081. Record checkout, branch, commit, dirty state, installed bundle, Simulator device, and Metro ownership.

Exercise:

1. Tap an existing Kwilt session; verify the persisted block becomes the editable titled overlay with both handles.
2. Drag the center; verify 15-minute movement, drawer collapse, edge auto-scroll, and unchanged duration.
3. Drag each handle; verify only the corresponding edge changes.
4. Release a changed block; verify one provider update, one persisted session update, and an Undo toast.
5. Trigger Undo; verify the original time returns through the same provider/session path.
6. Expand the same drawer; verify management actions and details fade in without changing their expanded spacing. If a disposable provider-backed session is unavailable, report persistence and Undo as source/test verified and keep them as explicit unobserved gates.

- [ ] **Step 3: Run the visual critic**

Mark PASS/FAIL with evidence for job clarity, reduction, hierarchy, system fit, composition, interaction, states, resilience, and runtime proof. Confirm one primary action, no redundant `Hold to move` copy, 44-point effective handle targets, safe-area continuation, and that the selected block remains visible above the drawer.

- [ ] **Step 4: Re-run affected verification after any visual fix**

Run the focused Plan suite and `npm run verify:changed -- --run` again after the final code edit.

## Execution note

This plan intentionally omits commit steps. The user requested implementation, not publication, and the active checkout contains unrelated uncommitted Unified Chat work. Stage or commit only with a later explicit scope decision.
