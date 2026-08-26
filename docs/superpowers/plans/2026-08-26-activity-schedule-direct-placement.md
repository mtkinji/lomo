# Activity Schedule Direct Placement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Open Activity scheduling with the next suitable slot visibly staged in the calendar, while allowing direct manual placement outside recommendations with calm advisories and explicit confirmation.

**Architecture:** Keep `useActivityScheduleSheetController` as the scheduling-sheet state owner and reuse `PlanCalendarLensPage`'s existing `PlanSlotDraft` move/resize contract. Change pure manual-slot resolution so availability and busy conflicts return advisory metadata while impossible placements remain rejected; the provider write path remains unchanged and still runs only from the existing confirmation action.

**Tech Stack:** React Native 0.83, Expo 55, TypeScript, React hooks, React Native Gesture Handler, Jest, Testing Library.

---

## UI contract

- Job: When a user chooses to schedule a to-do, they need Kwilt to make the next good placement concrete while retaining authority to put it anywhere, so the intention becomes trusted follow-through without calendar Tetris.
- Authority chain: explicit user decision -> `todo-schedule-sessions` brief -> existing Plan slot-draft behavior -> Kwilt UI tokens/components -> iOS/Android accessibility conventions.
- Three-second read: the to-do is already staged at the next good time and can be moved.
- Primary action: confirm the staged time with `Schedule <time>` or `Schedule anyway <time>`.
- Primary information: selected date, visible draft block, duration, and any conflict advisory.
- Secondary information: alternate `Good fits` suggestions.
- Reveal later: native arbitrary-date picker and duration wheel.
- Scan order: staged time guidance -> date/calendar block -> commit action.
- Must not add: background calendar writes, a scheduling-mode switcher, a new calendar screen, productivity scoring, or new settings.
- Reuse map: drawer -> `BottomDrawer`; date context -> `PlanDateStrip`; calendar placement -> `PlanCalendarLensPage`; draft movement/resizing -> `PlanSlotDraft`; actions -> local `Button`/`Pressable`.
- Nearest precedent: Plan slot capture in `PlanPager.tsx`; the Activity sheet differs only by starting from an Activity and duration rather than starting from an empty calendar slot.
- External exemplar ledger: Apple Calendar, Motion, and Todoist informed direct placement during design review; preserve precise/manual control, translate through Kwilt's calendar canvas, reject their form density and productivity automation framing.
- Behavior sources: auto-staged draft, manual override authority, confirmation-only write, and advisory conflicts are explicit user decisions from 2026-08-26.
- Unresolved decisions: none that block the bounded slice; named-event conflict copy can follow later because the current busy-interval contract does not retain event identity.
- Required states: loading, missing write calendar, no recommendation, auto-staged draft, manual draft, advisory draft, commit loading, calendar-write uncertainty.
- Proof path: Activity Detail -> Schedule on the current iOS Simulator runtime if available; inspect initial focus, alternate suggestion, empty-time tap, drag, resize, date change, advisory override, and confirmation.

### Task 1: Make manual scheduling constraints advisory

**Files:**
- Modify: `src/features/activities/activityScheduleSlots.ts`
- Test: `src/features/activities/activityScheduleSlots.test.ts`

- [ ] **Step 1: Replace the existing rejection expectations with failing advisory expectations**

```ts
expect(outsideWindow).toEqual({
  ok: true,
  slot: { startDate: expect.any(String), endDate: expect.any(String) },
  advisories: ['outside-window'],
});
expect(busy).toEqual({
  ok: true,
  slot: { startDate: expect.any(String), endDate: expect.any(String) },
  advisories: ['busy'],
});
```

- [ ] **Step 2: Run the focused test and confirm the old hard-rejection contract fails**

Run: `npm test -- --runInBand src/features/activities/activityScheduleSlots.test.ts`

Expected: FAIL because outside availability and busy intervals still return `ok: false`.

- [ ] **Step 3: Return advisory metadata for user-overridable constraints**

Keep `invalid-date`, `end-of-day`, and `past-today` as hard rejection reasons. Return a valid slot plus zero or more of `day-disabled`, `no-window`, `outside-window`, and `busy` for otherwise valid manual placements.

- [ ] **Step 4: Rerun the focused test**

Run: `npm test -- --runInBand src/features/activities/activityScheduleSlots.test.ts`

Expected: PASS.

### Task 2: Adapt Activity scheduling to Plan's editable slot draft

**Files:**
- Modify: `src/features/activities/activityScheduleSelection.ts`
- Test: `src/features/activities/activityScheduleSelection.test.ts`
- Modify: `src/features/activities/useActivityScheduleSheetController.ts`
- Test: `src/features/activities/useActivityScheduleSheetController.test.tsx`

- [ ] **Step 1: Add failing conversion tests**

```ts
expect(activityScheduleSlotToDraft(firstSlot)).toEqual({
  start: new Date(firstSlot.startDate),
  end: new Date(firstSlot.endDate),
});
```

- [ ] **Step 2: Run the selection and controller tests to confirm the new contract is absent**

Run: `npm test -- --runInBand src/features/activities/activityScheduleSelection.test.ts src/features/activities/useActivityScheduleSheetController.test.tsx`

Expected: FAIL for the missing selected-slot-to-draft conversion and controller fields.

- [ ] **Step 3: Expose the staged draft contract from the controller**

Add `selectedSlotDraft`, `selectedSlotAdvisories`, `slotFocusRequestId`, and `selectSlotDraft`. Suggested slots start advisory-free; manual tap/drag runs through `resolveManualScheduleSlot`; accepted manual drafts remain authoritative. Selecting a suggestion/date/open event increments the focus request without writing the calendar.

- [ ] **Step 4: Preserve manual placement while duration changes**

When a manual draft exists, update its end from the retained start and selected duration where valid. When no manual draft exists, allow duration changes to regenerate the next suitable suggestion.

- [ ] **Step 5: Rerun the focused tests**

Run: `npm test -- --runInBand src/features/activities/activityScheduleSelection.test.ts src/features/activities/useActivityScheduleSheetController.test.tsx`

Expected: PASS.

### Task 3: Make the staged block the dominant schedule-sheet interaction

**Files:**
- Modify: `src/features/activities/ActivityScheduleSheet.tsx`
- Modify: `src/features/activities/activityDetailStyles.ts`
- Modify: `src/features/plan/PlanCalendarLensPage.tsx`
- Test: `src/features/plan/PlanCalendarLensPage.test.tsx`

- [ ] **Step 1: Add a failing no-overlay focus regression**

Render a slot draft with `slotFocusRequestId`, lay out the timeline, and assert the timeline can request a scroll even when `bottomOverlayInset` is zero.

- [ ] **Step 2: Run the focused calendar-lens test and confirm the current overlay gate fails**

Run: `npm test -- --runInBand src/features/plan/PlanCalendarLensPage.test.tsx`

Expected: FAIL because focus currently returns early when `bottomOverlayInset <= 0`.

- [ ] **Step 3: Wire the sheet to the existing editable slot overlay**

Pass `selectedSlotDraft` as `slotDraft`, pass the Activity title, wire draft change/completion to the controller, and stop painting the same selection as a passive `proposedBlock`. Keep the existing provider commit action as the only write path.

- [ ] **Step 4: Reduce and clarify the sheet**

Render suggestions in a single horizontal `Good fits` rail, add concise drag/tap guidance, expose a native arbitrary-date picker, and show advisory copy above the timeline. Use `Schedule anyway` in the primary action when advisories are present.

- [ ] **Step 5: Allow focus without a bottom overlay**

Remove only the `bottomOverlayInset <= 0` early return from the slot-focus effect; retain viewport and active-adjustment guards.

- [ ] **Step 6: Rerun the focused Activity and Plan tests**

Run: `npm test -- --runInBand src/features/activities/activityScheduleSlots.test.ts src/features/activities/activityScheduleSelection.test.ts src/features/activities/useActivityScheduleSheetController.test.tsx src/features/plan/PlanCalendarLensPage.test.tsx`

Expected: PASS.

### Task 4: Verify the bounded slice

**Files:**
- Verify: all files changed by Tasks 1-3

- [ ] **Step 1: Inspect the patch and whitespace**

Run: `git diff --check && git diff -- src/features/activities src/features/plan/PlanCalendarLensPage.tsx docs/feature-briefs/todo-schedule-sessions.md docs/superpowers/plans/2026-08-26-activity-schedule-direct-placement.md`

Expected: no whitespace errors; diff contains only the approved scheduling slice plus its records.

- [ ] **Step 2: Run task-completion verification once**

Run: `npm run verify:changed -- --run`

Expected: exit 0. If unrelated dirty files cause failures, attribute them precisely and retain the focused scheduling evidence separately.

- [ ] **Step 3: Exercise the real runtime when available**

Open Activity Detail -> Schedule on the current iOS Simulator runtime, recording checkout, branch, commit, dirty state, installed build provenance, and Metro path/port. Verify initial auto-focus, drag, resize, arbitrary date, advisory override, and calendar write confirmation separately.

- [ ] **Step 4: Report proof boundaries**

Do not claim Simulator, physical-device, TestFlight, provider-calendar, or production proof from source/tests alone.
