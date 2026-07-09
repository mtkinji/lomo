# Calendar Empty Slot Capture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a user long-press an empty time on the Plan calendar, drag to choose duration, release, then create a new to-do or pick an existing to-do for that exact slot.

**Architecture:** Add an empty-slot gesture layer inside the calendar timeline, keep draft slot state in `PlanPager`, and open a dedicated drawer mode for slot placement. Creating a new to-do reuses `useQuickAddDockController`; picking an existing to-do uses a compact selectable list of unscheduled activities; calendar writes still wait for an explicit Commit.

**Tech Stack:** React Native, Expo, `react-native-gesture-handler`, existing Kwilt plan scheduling/calendar services, Jest with React Native Testing Library.

---

## File Structure

- Modify `src/features/plan/PlanCalendarLensPage.tsx`
  - Own empty-time long-press/drag/release gesture detection.
  - Render a transient draft block while dragging.
  - Emit `onCreateSlotDraft({ start, end })` on release.
- Modify `src/features/plan/PlanPager.tsx`
  - Own `slotDraft` state.
  - Add drawer mode `slotCapture`.
  - Pass the slot drawer model into `PlanEventPeekDrawerHost`.
  - Convert accepted slot actions into a normal recommendation proposal or immediate local scheduled draft.
- Modify `src/features/plan/PlanEventPeekDrawerHost.tsx`
  - Add `slotCapture` drawer mode.
  - Route to a new `PlanSlotCapturePage`.
- Create `src/features/plan/PlanSlotCapturePage.tsx`
  - Drawer UI for “Create new to-do” and “Pick existing to-do”.
  - Shows selected time range, duration, Quick Add composer, and eligible existing to-dos.
- Create `src/features/plan/usePlanSlotCapture.ts`
  - Hook that creates real activities or binds existing activities to the selected draft slot.
  - Reuses `useQuickAddDockController` for new to-do creation.
  - Validates conflicts/availability before offering Commit.
- Create `src/features/plan/planSlotDraft.ts`
  - Pure helpers for converting timeline y-position to snapped minutes and enforcing minimum/maximum slot duration.
- Create `src/features/plan/planSlotDraft.test.ts`
  - Unit tests for snapping, duration clamp, and same-day bounds.
- Create `src/features/plan/PlanSlotCapturePage.test.tsx`
  - Component tests for create-new and pick-existing flows.
- Modify `src/features/plan/PlanRecsPage.test.tsx` only if shared mocks need adjustment.

---

## Task 1: Slot Draft Math

**Files:**
- Create: `src/features/plan/planSlotDraft.ts`
- Test: `src/features/plan/planSlotDraft.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
import {
  clampSlotDraft,
  dateForTimelineY,
  snapMinutesToStep,
} from './planSlotDraft';

describe('planSlotDraft', () => {
  it('snaps timeline y positions to 15-minute dates', () => {
    const dayStart = new Date('2026-07-08T00:00:00.000-06:00');
    const date = dateForTimelineY({
      y: 96,
      hourHeight: 64,
      dayStart,
      stepMinutes: 15,
    });

    expect(date.getHours()).toBe(1);
    expect(date.getMinutes()).toBe(30);
  });

  it('clamps draft slots to the day and a minimum duration', () => {
    const dayStart = new Date('2026-07-08T00:00:00.000-06:00');
    const start = new Date(dayStart);
    start.setHours(23, 45, 0, 0);
    const end = new Date(dayStart);
    end.setHours(23, 50, 0, 0);

    const slot = clampSlotDraft({
      start,
      end,
      dayStart,
      minDurationMinutes: 15,
      maxDurationMinutes: 240,
    });

    expect(slot.start.getHours()).toBe(23);
    expect(slot.start.getMinutes()).toBe(45);
    expect(slot.end.getHours()).toBe(24);
    expect(slot.end.getMinutes()).toBe(0);
  });

  it('keeps drag direction irrelevant by ordering start and end', () => {
    const dayStart = new Date('2026-07-08T00:00:00.000-06:00');
    const later = new Date(dayStart);
    later.setHours(12, 0, 0, 0);
    const earlier = new Date(dayStart);
    earlier.setHours(11, 15, 0, 0);

    const slot = clampSlotDraft({
      start: later,
      end: earlier,
      dayStart,
      minDurationMinutes: 15,
      maxDurationMinutes: 240,
    });

    expect(slot.start.getHours()).toBe(11);
    expect(slot.start.getMinutes()).toBe(15);
    expect(slot.end.getHours()).toBe(12);
    expect(slot.end.getMinutes()).toBe(0);
  });
});
```

- [ ] **Step 2: Run the failing test**

```bash
npm test -- --runInBand src/features/plan/planSlotDraft.test.ts
```

Expected: fail because `planSlotDraft.ts` does not exist.

- [ ] **Step 3: Implement the helper**

```ts
export function snapMinutesToStep(minutes: number, stepMinutes = 15): number {
  if (!Number.isFinite(minutes)) return 0;
  return Math.round(minutes / stepMinutes) * stepMinutes;
}

export function dateForTimelineY(params: {
  y: number;
  hourHeight: number;
  dayStart: Date;
  stepMinutes?: number;
}): Date {
  const rawMinutes = (Math.max(0, params.y) / params.hourHeight) * 60;
  const snapped = Math.max(0, Math.min(24 * 60, snapMinutesToStep(rawMinutes, params.stepMinutes ?? 15)));
  return new Date(params.dayStart.getTime() + snapped * 60_000);
}

export function clampSlotDraft(params: {
  start: Date;
  end: Date;
  dayStart: Date;
  minDurationMinutes?: number;
  maxDurationMinutes?: number;
}): { start: Date; end: Date } {
  const minDuration = params.minDurationMinutes ?? 15;
  const maxDuration = params.maxDurationMinutes ?? 240;
  const dayEnd = new Date(params.dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  let start = params.start <= params.end ? params.start : params.end;
  let end = params.start <= params.end ? params.end : params.start;
  start = new Date(Math.max(params.dayStart.getTime(), Math.min(dayEnd.getTime(), start.getTime())));
  end = new Date(Math.max(params.dayStart.getTime(), Math.min(dayEnd.getTime(), end.getTime())));

  const minEnd = new Date(start.getTime() + minDuration * 60_000);
  if (end < minEnd) end = minEnd;
  const maxEnd = new Date(start.getTime() + maxDuration * 60_000);
  if (end > maxEnd) end = maxEnd;
  if (end > dayEnd) {
    end = dayEnd;
    start = new Date(Math.max(params.dayStart.getTime(), end.getTime() - minDuration * 60_000));
  }

  return { start, end };
}
```

- [ ] **Step 4: Run the helper tests**

```bash
npm test -- --runInBand src/features/plan/planSlotDraft.test.ts
```

Expected: pass.

---

## Task 2: Calendar Long-Press Draft Interaction

**Files:**
- Modify: `src/features/plan/PlanCalendarLensPage.tsx`

- [ ] **Step 1: Replace empty tap with long-press/drag props**

Add props:

```ts
  slotDraft?: { start: Date; end: Date } | null;
  onSlotDraftChange?: (slot: { start: Date; end: Date } | null) => void;
  onSlotDraftComplete?: (slot: { start: Date; end: Date }) => void;
```

Keep `onPressEmptyTime` temporarily only if callers still use it; remove it once `PlanPager` is migrated.

- [ ] **Step 2: Add gesture state**

Use `Gesture.LongPress().minDuration(320)` followed by a pan update on the events column. The start y comes from the long-press location, updates convert y to dates through `dateForTimelineY`, and completion calls `onSlotDraftComplete`.

Use constants:

```ts
const SLOT_MIN_DURATION_MINUTES = 15;
const SLOT_MAX_DURATION_MINUTES = 240;
const SLOT_STEP_MINUTES = 15;
```

- [ ] **Step 3: Render the transient draft block**

Render a blue or pine-tinted block with:

```tsx
<View pointerEvents="none" style={[styles.slotDraftBlock, { top, height }]}>
  <Text style={styles.slotDraftTime}>{formatTimeRange(slotDraft.start, slotDraft.end)}</Text>
</View>
```

Place it under real event blocks or above grid rows but below active event press targets. It should not look committed.

- [ ] **Step 4: Preserve existing event behavior**

Ensure long-press on an existing Kwilt block still moves that block, and empty-slot gesture only begins from the empty column layer. Existing external/Kwilt/proposal blocks should keep their current press handlers.

---

## Task 3: Slot Capture Drawer Model

**Files:**
- Modify: `src/features/plan/PlanEventPeekDrawerHost.tsx`
- Create: `src/features/plan/PlanSlotCapturePage.tsx`

- [ ] **Step 1: Add drawer mode**

Change:

```ts
export type PlanDrawerMode = 'recs' | 'activity' | 'external' | 'slotCapture';
```

Add a `slotCapture` model:

```ts
type PlanSlotCaptureModel = {
  start: Date;
  end: Date;
  quickAdd: PlanRecommendationsQuickAddModel;
  existingActivities: Array<{ activityId: string; title: string; estimateMinutes?: number | null }>;
  selectedActivityId: string | null;
  committingActivityId?: string | null;
  onSelectActivity: (activityId: string) => void;
  onCommitNew: () => void;
  onCommitExisting: () => void;
  onClose: () => void;
};
```

- [ ] **Step 2: Implement the page**

`PlanSlotCapturePage` should show:
- selected time range and duration,
- segmented options: `New to-do` and `Existing`,
- existing Quick Add composer in the new tab,
- selectable existing unscheduled to-dos in the existing tab,
- primary action `Commit to calendar`,
- secondary action `Save to To-dos` for a new to-do if the title exists but user does not want to commit.

Do not render marketing/explanation copy. This is a work surface.

---

## Task 4: Slot Capture Hook

**Files:**
- Create: `src/features/plan/usePlanSlotCapture.ts`
- Modify: `src/features/plan/PlanPager.tsx`

- [ ] **Step 1: Create hook inputs**

The hook receives `slotDraft`, `activities`, `goals`, `arcs`, `activityAreas`, `busyIntervals`, `writeRef`, stores/actions, and the existing commit function.

- [ ] **Step 2: Filter existing activities**

Eligible existing activities:
- not `done`,
- not `cancelled`,
- no `scheduledAt`,
- title is non-empty,
- not already represented by a current recommendation proposal for this day.

- [ ] **Step 3: Validate selected slot**

Before committing, reject if:
- no write calendar,
- slot overlaps external busy intervals or committed Kwilt blocks,
- slot is outside availability for the selected activity’s area/domain.

Use the same overlap logic already used by `handleMoveRecommendation`.

- [ ] **Step 4: New to-do behavior**

Submitting the Quick Add from slot drawer creates a real activity with:

```ts
{
  estimateMinutes: Math.round((slot.end.getTime() - slot.start.getTime()) / 60000),
  scheduledDate: dateKey,
}
```

After creation, keep it selected in the drawer and show `Commit to calendar`.

- [ ] **Step 5: Commit behavior**

For both new and existing activities, create a `DailyPlanProposal`:

```ts
{
  activityId,
  title: activity.title,
  startDate: slot.start.toISOString(),
  endDate: slot.end.toISOString(),
  calendarId: writeRef.calendarId,
  domain: getPlanModeForActivity(activity),
  goalId: activity.goalId ?? null,
}
```

Then call the same commit path used by recommendation cards. If direct reuse is awkward, extract `commitProposal(activityId, proposal)` from `PlanPager` first.

---

## Task 5: Wire `PlanPager`

**Files:**
- Modify: `src/features/plan/PlanPager.tsx`

- [ ] **Step 1: Add state**

```ts
const [slotDraft, setSlotDraft] = useState<{ start: Date; end: Date } | null>(null);
```

- [ ] **Step 2: Pass gesture props**

Pass into `PlanCalendarLensPage`:

```tsx
slotDraft={slotDraft}
onSlotDraftChange={setSlotDraft}
onSlotDraftComplete={(slot) => {
  setSlotDraft(slot);
  setPeekSelection(null);
  setSheetSnapIndex(0);
}}
```

- [ ] **Step 3: Add drawer mode**

`drawerMode` becomes `slotCapture` when `slotDraft` exists and no event peek is active.

- [ ] **Step 4: Close behavior**

Closing the slot drawer clears `slotDraft`.

---

## Task 6: Tests

**Files:**
- Create: `src/features/plan/PlanSlotCapturePage.test.tsx`
- Update: existing plan tests as needed

- [ ] **Step 1: Test page mode switching**

Render the page with two eligible existing to-dos. Assert `New to-do`, `Existing`, time range, and existing titles render.

- [ ] **Step 2: Test existing pick**

Press an existing title, press `Commit to calendar`, assert `onSelectActivity` and `onCommitExisting` are called.

- [ ] **Step 3: Test new to-do composer visibility**

Mock `QuickAddDock`, press `Add a to-do`, assert it receives the slot-specific quickAdd model.

- [ ] **Step 4: Run related tests**

```bash
npm test -- --runInBand --findRelatedTests \
  src/features/plan/PlanCalendarLensPage.tsx \
  src/features/plan/PlanEventPeekDrawerHost.tsx \
  src/features/plan/PlanPager.tsx \
  src/features/plan/PlanSlotCapturePage.tsx \
  src/features/plan/usePlanSlotCapture.ts \
  src/features/plan/planSlotDraft.ts
```

Expected: pass.

---

## Task 7: Verification

- [ ] **Step 1: Typecheck app**

```bash
npm run lint -- --pretty false
```

- [ ] **Step 2: Typecheck tests**

```bash
npm run lint:tests -- --pretty false
```

- [ ] **Step 3: Run focused tests**

```bash
npm test -- --runInBand --findRelatedTests \
  src/features/plan/PlanCalendarLensPage.tsx \
  src/features/plan/PlanEventPeekDrawerHost.tsx \
  src/features/plan/PlanPager.tsx \
  src/features/plan/PlanSlotCapturePage.tsx \
  src/features/plan/usePlanSlotCapture.ts \
  src/features/plan/planSlotDraft.ts
```

- [ ] **Step 4: Run changed-file verifier**

```bash
npm run verify:changed -- --run
```

- [ ] **Step 5: Manual simulator check**

On iOS simulator:
- Open Plan.
- Long-press empty calendar space.
- Drag to change duration.
- Release.
- Confirm slot drawer opens.
- Create a new to-do and commit it.
- Confirm calendar block appears.
- Repeat with an existing unscheduled to-do.
- Confirm a single tap on empty calendar space does nothing.
