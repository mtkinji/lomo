# Activity Detail Decomposition Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce `ActivityDetailScreen.tsx` from a 6,119-line state-and-rendering hub into a mostly compositional screen by extracting its schedule, repeat, attachment, location, and Focus experiences without changing user-facing behavior.

**Architecture:** Each pass extracts one complete experience behind a typed component boundary. Branching state and side effects live in a colocated controller hook; pure normalization and formatting stay in small tested helpers; the parent screen owns only activity selection, shared navigation, and which experience is open. Each task is independently releasable and ends with a commit and the diff-aware verification gate.

**Tech Stack:** React Native, Expo SDK 54, TypeScript, React hooks, Zustand, Jest, React Native Testing Library, provider calendar APIs, Expo Notifications.

---

## Starting Point And Guardrails

- Start execution from current `main`, not from one of the date-stamped refinement branches.
- Port the relevant source and test files from the prior bounded commits as each task needs them. Do not cherry-pick their stale `docs/agent-code-map.md` or backlog edits.
- Preserve every accessibility label, `testID`, drawer snap point, analytics event, toast, alert, timeout, and native side effect.
- Do not redesign the drawers or change their open/close choreography in this plan.
- Keep `ActivityDetailScreen` as the owner of the single `activeSheet` discriminator during Tasks 1-4. Child controllers receive `visible`, `onClose`, and explicit open callbacks. This prevents five competing modal state machines.
- Leave `FocusSessionRuntimeHost`, `focusSessionStore`, and `focusSessionLifecycle` as the app-level runtime owners. Task 5 extracts only Activity Detail's launcher and presentation.
- Run `npm run agent:map` after each extraction and include the generated map only when it changes.
- Measure progress with both screen size and dependency count:

```bash
wc -l src/features/activities/ActivityDetailScreen.tsx
rg -c '^import ' src/features/activities/ActivityDetailScreen.tsx
npm run code:health -- --base main
```

Target after all five tasks: `ActivityDetailScreen.tsx` below 3,500 lines, at least 25 fewer direct imports, and no increase in architecture-lint violations. Total repository LOC may rise slightly because behavior gains typed boundaries and tests; screen context radius is the primary metric.

## File Ownership Map

| File | Responsibility |
|---|---|
| `ActivityDetailScreen.tsx` | Compose the activity page, own shared navigation and `activeSheet`, pass activity-scoped inputs to extracted experiences. |
| `useActivityScheduleSheetController.ts` | Schedule draft state, provider-calendar reads, slot selection, calendar-event commit, and scheduling feedback. |
| `ActivityScheduleSheet.tsx` | Schedule drawer presentation only. |
| `activityScheduleSheetStyles.ts` | Styles used only by the schedule drawer. |
| `activitySchedule*.ts` | Pure schedule draft, duration, selection, display, and block-normalization contracts. |
| `useActivityRepeatEditor.ts` | Repeat drawer transition and activity update orchestration. |
| `ActivityRepeatSheets.tsx` | Preset and custom repeat drawers. |
| `activityRepeatSheetStyles.ts` | Styles used only by the repeat drawers. |
| `activityCustomRepeat.ts` / `activityRepeatLabels.ts` | Pure repeat draft, payload, and label contracts. |
| `useActivityAttachmentsController.ts` | Attachment selection, signed URL loading, audio recording lifecycle, open/share/delete commands. |
| `ActivityAttachmentSheets.tsx` | Attachment details and record-audio drawers. |
| `activityAttachmentSheetStyles.ts` | Styles used only by attachment drawers. |
| `activityAttachmentPresentation.ts` | Pure metadata labels and formatting. |
| `useActivityLocationEditor.ts` | Location draft, permission/current-location lookup, place search, map state, dirty state, save/clear commands. |
| `ActivityLocationSheet.tsx` | Location-trigger drawer presentation. |
| `activityLocationTriggers.ts` | Pure location draft, radius, normalization, dirty-check, and save-payload contracts. |
| `useActivityFocusController.ts` | Focus setup draft, start/pause/resume/end commands, paywall and notification boundary coordination. |
| `ActivityFocusExperience.tsx` | Focus setup drawer and active-session overlay presentation. |

### Task 1: Extract The Schedule Controller And Sheet

**Impact:** Removes the largest already-tested seam first: schedule state, provider reads, slot selection, calendar event creation, and roughly 650-800 lines of schedule UI/orchestration from the screen.

**Files:**
- Create: `src/features/activities/useActivityScheduleSheetController.ts`
- Create: `src/features/activities/useActivityScheduleSheetController.test.tsx`
- Create: `src/features/activities/ActivityScheduleSheet.tsx`
- Create: `src/features/activities/activityScheduleSheetStyles.ts`
- Create from prior commits: `src/features/activities/activityScheduleDisplay.ts`
- Create from prior commits: `src/features/activities/activityScheduleDisplay.test.ts`
- Create from prior commits: `src/features/activities/activityScheduleSheetDraft.ts`
- Create from prior commits: `src/features/activities/activityScheduleSheetDraft.test.ts`
- Create from prior commits: `src/features/activities/activityScheduleSelection.ts`
- Create from prior commits: `src/features/activities/activityScheduleSelection.test.ts`
- Create from prior commit if absent: `src/services/plan/kwiltCalendarBlocks.ts`
- Create from prior commit if absent: `src/services/plan/kwiltCalendarBlocks.test.ts`
- Modify: `src/features/activities/ActivityDetailScreen.tsx:970`
- Modify: `src/features/activities/ActivityDetailScreen.tsx:2380`
- Modify: `src/features/activities/ActivityDetailScreen.tsx:5276`

- [ ] **Step 1: Restore the proven pure schedule contracts without taking documentation conflicts**

```bash
git restore --source=3f9be26 -- \
  src/features/activities/activityScheduleDisplay.ts \
  src/features/activities/activityScheduleDisplay.test.ts
git restore --source=b4a908e -- \
  src/features/activities/activityScheduleSheetDraft.ts \
  src/features/activities/activityScheduleSheetDraft.test.ts
git restore --source=ca2aa80 -- \
  src/features/activities/activityScheduleSelection.ts \
  src/features/activities/activityScheduleSelection.test.ts
git restore --source=395af26 -- \
  src/services/plan/kwiltCalendarBlocks.ts \
  src/services/plan/kwiltCalendarBlocks.test.ts
```

Run:

```bash
npx jest \
  src/features/activities/activityScheduleDisplay.test.ts \
  src/features/activities/activityScheduleSheetDraft.test.ts \
  src/features/activities/activityScheduleSelection.test.ts \
  src/services/plan/kwiltCalendarBlocks.test.ts \
  --runInBand
```

Expected: all restored contract tests pass before the screen is rewired.

- [ ] **Step 2: Write failing controller tests for open, selection reset, and commit delegation**

Create `useActivityScheduleSheetController.test.tsx` around a small harness rendered with `renderHook` from `@testing-library/react-native`. Mock `calendarApi`, `calendarEventCommit`, and `planScheduling`. Pin these behaviors:

```ts
it('hydrates the draft when the sheet opens', async () => {
  const { result, rerender } = renderHook(
    ({ visible }) => useActivityScheduleSheetController(makeProps({ visible })),
    { initialProps: { visible: false } },
  );

  rerender({ visible: true });

  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.durationMinutes).toBe(45);
  expect(result.current.targetDate).toEqual(new Date('2026-07-11T09:30:00.000Z'));
  expect(result.current.writeRef?.calendarId).toBe('kwilt-write');
});

it('clears manual selection when duration changes', async () => {
  const { result } = renderHook(() => useActivityScheduleSheetController(makeProps()));

  act(() => result.current.selectManualTime(new Date('2026-07-11T10:00:00.000Z')));
  expect(result.current.selectedSlot).not.toBeNull();

  act(() => result.current.setDurationMinutes(60));
  expect(result.current.selectedSlot).toBeNull();
  expect(result.current.selectedSlotIndex).toBe(0);
});

it('updates the activity only after a provider event is linked', async () => {
  resolveCalendarEventRefAfterCreateMock.mockResolvedValue({
    status: 'linked',
    eventRef: {
      provider: 'google',
      accountId: 'account-1',
      calendarId: 'kwilt-write',
      eventId: 'event-1',
    },
  });
  const updateActivity = jest.fn();
  const onClose = jest.fn();
  const { result } = renderHook(() =>
    useActivityScheduleSheetController(makeProps({ updateActivity, onClose })),
  );

  await act(async () => result.current.confirmSelectedSlot());

  expect(updateActivity).toHaveBeenCalledTimes(1);
  expect(onClose).toHaveBeenCalledTimes(1);
});
```

Run:

```bash
npx jest src/features/activities/useActivityScheduleSheetController.test.tsx --runInBand
```

Expected: fail because the hook does not exist.

- [ ] **Step 3: Implement the typed controller boundary**

Use this public contract in `useActivityScheduleSheetController.ts`:

```ts
export type ActivityScheduleSheetControllerProps = {
  visible: boolean;
  activity: Activity;
  activities: Activity[];
  goals: Goal[];
  activityAreas: ActivityArea[];
  userProfile: UserProfile;
  updateActivity: UpdateActivity;
  showToast: (input: ToastPayload) => void;
  onClose: () => void;
  onOpenPlanCalendarSettings: () => void;
  onScheduled: (message: string) => void;
};

type UpdateActivity = ReturnType<typeof useAppStore.getState>['updateActivity'];

export type ActivityScheduleSheetController = {
  loading: boolean;
  isCommitting: boolean;
  bindingHealth: ReturnType<typeof inferCalendarBindingHealth>;
  durationMinutes: number;
  durationOptions: number[];
  durationExpanded: boolean;
  targetDate: Date;
  targetDayLabel: string;
  busyIntervals: Array<{ start: Date; end: Date }>;
  externalEvents: CalendarEvent[];
  writeRef: CalendarRef | null;
  slots: ActivityScheduleSlot[];
  selectedSlot: ActivityScheduleSlot | null;
  selectedSlotIndex: number;
  selectedSlotLabel: string | null;
  horizonExhausted: boolean;
  kwiltBlocks: KwiltCalendarBlock[];
  setDurationExpanded: (expanded: boolean) => void;
  setDurationMinutes: (minutes: number) => void;
  selectSuggestedSlot: (index: number) => void;
  selectTargetDate: (date: Date) => void;
  selectManualTime: (date: Date) => void;
  retry: () => void;
  confirmSelectedSlot: (slotIndex?: number) => Promise<void>;
};
```

Move the current schedule state at lines 970-1077, fetch effect around lines 2380-2611, selection handlers at lines 2613-2720, and commit function at lines 2722-2815 into the hook. Replace inline duration, draft, selection, label, and Kwilt-block calculations with the restored pure helpers. Keep provider API calls and activity mutation in the hook; do not put them in the presentation component.

- [ ] **Step 4: Run the controller tests and fix only contract mismatches**

```bash
npx jest \
  src/features/activities/useActivityScheduleSheetController.test.tsx \
  src/features/activities/activityScheduleDisplay.test.ts \
  src/features/activities/activityScheduleSheetDraft.test.ts \
  src/features/activities/activityScheduleSelection.test.ts \
  src/features/activities/activityScheduleSlots.test.ts \
  src/services/plan/kwiltCalendarBlocks.test.ts \
  src/services/plan/calendarEventCommit.test.ts \
  --runInBand
```

Expected: all suites pass.

- [ ] **Step 5: Extract the existing schedule drawer into a prop-driven component**

Create `ActivityScheduleSheet.tsx` with this boundary:

```ts
type ActivityScheduleSheetProps = {
  visible: boolean;
  controller: ActivityScheduleSheetController;
  onClose: () => void;
};
```

Implement `ActivityScheduleSheet` by moving the complete drawer body currently at lines 5276-5485 into the new file and replacing each closed-over schedule value with the matching `controller` field or command. Preserve `e2e.activityDetail.schedule.confirm`, `PlanDateStrip`, `PlanCalendarLensPage`, snap points, loading/empty states, binding-health warning, and settings navigation exactly. Move every style key referenced only by this drawer from `activityDetailStyles.ts` into `activityScheduleSheetStyles.ts`; use `rg 'styles\.<key>' src/features/activities` to prove each moved key has no other consumer.

Replace all schedule orchestration in `ActivityDetailScreen` with:

```tsx
const scheduleController = useActivityScheduleSheetController({
  visible: activeSheet === 'calendar',
  activity,
  activities,
  goals,
  activityAreas,
  userProfile,
  updateActivity,
  showToast,
  onClose: () => setActiveSheet(null),
  onOpenPlanCalendarSettings: () => {
    rootNavigationRef.navigate('Settings', { screen: 'SettingsPlanCalendars' } as any);
  },
  onScheduled: setPendingCalendarToast,
});

<ActivityScheduleSheet
  visible={activeSheet === 'calendar'}
  controller={scheduleController}
  onClose={() => setActiveSheet(null)}
/>
```

- [ ] **Step 6: Verify and commit Task 1**

```bash
npm run verify:changed -- --base main --run
git add src/features/activities/ActivityDetailScreen.tsx \
  src/features/activities/ActivityScheduleSheet.tsx \
  src/features/activities/activityScheduleSheetStyles.ts \
  src/features/activities/useActivityScheduleSheetController.ts \
  src/features/activities/useActivityScheduleSheetController.test.tsx \
  src/features/activities/activityScheduleDisplay.ts \
  src/features/activities/activityScheduleDisplay.test.ts \
  src/features/activities/activityScheduleSheetDraft.ts \
  src/features/activities/activityScheduleSheetDraft.test.ts \
  src/features/activities/activityScheduleSelection.ts \
  src/features/activities/activityScheduleSelection.test.ts \
  src/services/plan/kwiltCalendarBlocks.ts \
  src/services/plan/kwiltCalendarBlocks.test.ts \
  docs/agent-code-map.md
git commit -m "Refactor Activity schedule experience"
```

Expected: verification passes; `ActivityDetailScreen.tsx` loses at least 600 lines.

### Task 2: Extract The Repeat Editor

**Impact:** Gives recurrence one named owner and removes preset/custom drawer state, transition timers, payload normalization, and about 300-450 screen lines.

**Files:**
- Create: `src/features/activities/useActivityRepeatEditor.ts`
- Create: `src/features/activities/useActivityRepeatEditor.test.tsx`
- Create: `src/features/activities/ActivityRepeatSheets.tsx`
- Create: `src/features/activities/activityRepeatSheetStyles.ts`
- Create from prior commits: `src/features/activities/activityCustomRepeat.ts`
- Create from prior commits: `src/features/activities/activityCustomRepeat.test.ts`
- Create from prior commits: `src/features/activities/activityRepeatLabels.ts`
- Create from prior commits: `src/features/activities/activityRepeatLabels.test.ts`
- Modify: `src/features/activities/ActivityDetailScreen.tsx:713`
- Modify: `src/features/activities/ActivityDetailScreen.tsx:3571`
- Modify: `src/features/activities/ActivityDetailScreen.tsx:4381`
- Modify: `src/features/activities/ActivityDetailScreen.tsx:4903`

- [ ] **Step 1: Restore and run the pure repeat contracts**

```bash
git restore --source=c1a931f -- \
  src/features/activities/activityRepeatLabels.ts \
  src/features/activities/activityRepeatLabels.test.ts
git restore --source=cc1a872 -- \
  src/features/activities/activityCustomRepeat.ts \
  src/features/activities/activityCustomRepeat.test.ts
npx jest \
  src/features/activities/activityRepeatLabels.test.ts \
  src/features/activities/activityCustomRepeat.test.ts \
  src/domain/activityRecurrence.test.ts \
  --runInBand
```

Expected: all suites pass.

- [ ] **Step 2: Write failing hook tests for hydration, transitions, commit, and clear**

```ts
it('hydrates an existing weekly custom rule before opening the custom sheet', () => {
  const { result } = renderHook(() =>
    useActivityRepeatEditor(makeProps({
      activity: makeActivity({
        repeatRule: 'custom',
        repeatCustom: { cadence: 'weeks', interval: 2, weekdays: [1, 3] },
      }),
    })),
  );

  act(() => result.current.openCustom());

  expect(result.current.draft).toEqual({ cadence: 'weeks', interval: 2, weekdays: [1, 3] });
});

it('commits a normalized custom rule and closes the editor', () => {
  const updateActivity = jest.fn();
  const onClose = jest.fn();
  const { result } = renderHook(() => useActivityRepeatEditor(makeProps({ updateActivity, onClose })));

  act(() => result.current.setInterval(2.4));
  act(() => result.current.setWeekdays([5, 1, 5]));
  act(() => result.current.commitCustom());

  expectUpdateToContain(updateActivity, {
    repeatRule: 'custom',
    repeatCustom: { cadence: 'weeks', interval: 2, weekdays: [1, 5] },
  });
  expect(onClose).toHaveBeenCalled();
});
```

Run `npx jest src/features/activities/useActivityRepeatEditor.test.tsx --runInBand` and expect failure because the hook does not exist.

- [ ] **Step 3: Implement the repeat controller and drawer pair**

Use this hook contract:

```ts
export type ActivityRepeatEditorController = {
  repeatLabel: string;
  draft: ActivityCustomRepeatDraft;
  openCustom: () => void;
  selectPreset: (rule: NonNullable<Activity['repeatRule']>) => void;
  clear: () => void;
  setCadence: (cadence: ActivityRepeatCustom['cadence']) => void;
  setInterval: (interval: number) => void;
  toggleWeekday: (weekday: number) => void;
  setWeekdays: (weekdays: number[]) => void;
  commitCustom: () => void;
  returnToPresets: () => void;
};
```

Move the state and transition cleanup at lines 713-730 and handlers at lines 3571-3634 and 3708-3718 into `useActivityRepeatEditor`. Use `resolveActivityCustomRepeatDraft`, `buildActivityCustomRepeatPayload`, and `formatActivityRepeatLabel`; remove the inline equivalents from the screen.

Move both current repeat drawers, including the 260ms non-stacking transition, into `ActivityRepeatSheets.tsx`. The component receives `presetVisible`, `customVisible`, `controller`, and `onClose`. Keep `RepeatInfoMenu`, weekday ordering, cadence options, NumberWheelPicker behavior, and all labels unchanged. Move repeat-only style keys into `activityRepeatSheetStyles.ts` after checking each key with `rg`.

- [ ] **Step 4: Rewire, verify, and commit Task 2**

```tsx
const repeatController = useActivityRepeatEditor({
  activity,
  updateActivity,
  onClose: () => setActiveSheet(null),
  onOpenCustom: () => setActiveSheet('customRepeat'),
  onReturnToPresets: () => setActiveSheet('repeat'),
});

<ActivityRepeatSheets
  presetVisible={activeSheet === 'repeat'}
  customVisible={activeSheet === 'customRepeat'}
  controller={repeatController}
  onClose={() => setActiveSheet(null)}
/>
```

```bash
npx jest \
  src/features/activities/useActivityRepeatEditor.test.tsx \
  src/features/activities/activityRepeatLabels.test.ts \
  src/features/activities/activityCustomRepeat.test.ts \
  src/domain/activityRecurrence.test.ts \
  --runInBand
npm run verify:changed -- --base main --run
git add src/features/activities docs/agent-code-map.md
git commit -m "Refactor Activity repeat editor"
```

Expected: verification passes; `ActivityDetailScreen.tsx` loses at least 300 additional lines.

### Task 3: Extract Attachment Details And Audio Recording

**Impact:** Removes signed-URL lifecycle, preview metadata, sharing/deletion commands, recording state, and two drawers from the screen. It also replaces `any` attachment state with the domain attachment type.

**Files:**
- Create: `src/features/activities/activityAttachmentPresentation.ts`
- Create: `src/features/activities/activityAttachmentPresentation.test.ts`
- Create: `src/features/activities/useActivityAttachmentsController.ts`
- Create: `src/features/activities/useActivityAttachmentsController.test.tsx`
- Create: `src/features/activities/ActivityAttachmentSheets.tsx`
- Create: `src/features/activities/activityAttachmentSheetStyles.ts`
- Modify: `src/features/activities/ActivityDetailScreen.tsx:1081`
- Modify: `src/features/activities/ActivityDetailScreen.tsx:1713`
- Modify: `src/features/activities/ActivityDetailScreen.tsx:4145`
- Modify: `src/features/activities/ActivityDetailScreen.tsx:5653`

- [ ] **Step 1: Define and test pure attachment presentation data**

Create this contract:

```ts
export type ActivityAttachmentPresentation = {
  kind: string;
  kindLabel: string;
  name: string;
  statusLabel: 'Uploading' | 'Failed' | 'Uploaded';
  isOpenable: boolean;
  isFailed: boolean;
  sizeLabel: string | null;
  durationLabel: string | null;
  createdAtLabel: string | null;
  uploadError: string | null;
};

export function buildActivityAttachmentPresentation(
  attachment: ActivityAttachment,
  locale?: string,
): ActivityAttachmentPresentation;
```

Write tests that pin photo/audio/document labels, blank file-name fallback, byte thresholds, `m:ss` audio duration, failed status, and invalid metadata returning `null`. Run the focused test and expect failure before implementing the formatter.

- [ ] **Step 2: Write failing controller tests for URL races and recording cleanup**

```ts
it('ignores a signed URL that resolves after the details sheet closes', async () => {
  const deferred = createDeferred<string>();
  getAttachmentDownloadUrlMock.mockReturnValue(deferred.promise);
  const { result, rerender } = renderHook(
    ({ detailsVisible }) => useActivityAttachmentsController(makeProps({ detailsVisible })),
    { initialProps: { detailsVisible: true } },
  );

  act(() => result.current.openDetails(makePhotoAttachment()));
  rerender({ detailsVisible: false });
  await act(async () => deferred.resolve('https://signed.example/photo'));

  expect(result.current.downloadUrl).toBeNull();
});

it('cancels an active recording when the recording sheet closes', async () => {
  const { result } = renderHook(() => useActivityAttachmentsController(makeProps()));
  await act(async () => result.current.startRecording());
  await act(async () => result.current.closeRecording());
  expect(cancelAudioRecordingMock).toHaveBeenCalledTimes(1);
  expect(result.current.isRecording).toBe(false);
});
```

- [ ] **Step 3: Implement controller and presentation component**

Use a typed `ActivityAttachment` imported from the attachment service or domain model; do not preserve `any` in the new API.

```ts
export type ActivityAttachmentsController = {
  selected: ActivityAttachment | null;
  presentation: ActivityAttachmentPresentation | null;
  downloadUrl: string | null;
  photoAspectRatio: number;
  isLoadingDownloadUrl: boolean;
  isRecording: boolean;
  openDetails: (attachment: ActivityAttachment) => void;
  closeDetails: () => void;
  setPhotoAspectRatio: (ratio: number) => void;
  shareSelected: () => Promise<void>;
  deleteSelected: () => void;
  startRecording: () => Promise<void>;
  stopAndAttachRecording: () => Promise<void>;
  cancelRecording: () => Promise<void>;
  closeRecording: () => Promise<void>;
};
```

Move state/effect lines 1081-1139, `isRecordingAudio` at line 1713, and the details/audio drawer blocks at lines 5653-5939. Keep the destructive `Alert`, share-to-Linking fallback, photo aspect-ratio handling, safe-area padding, snap points, and all three attachment-recording `testID`s unchanged.

Move attachment-only style keys into `activityAttachmentSheetStyles.ts` after checking each key with `rg`.

Pass `controller.openDetails` to `ActivityDetailRefresh` in place of `openAttachmentDetails`. Keep upload/pick actions that belong to the page where they currently are; this task owns only details and audio-recording sheet behavior.

- [ ] **Step 4: Verify and commit Task 3**

```bash
npx jest \
  src/features/activities/activityAttachmentPresentation.test.ts \
  src/features/activities/useActivityAttachmentsController.test.tsx \
  --runInBand
npm run verify:changed -- --base main --run
git add src/features/activities docs/agent-code-map.md
git commit -m "Refactor Activity attachment sheets"
```

Expected: verification passes; `ActivityDetailScreen.tsx` loses at least 325 additional lines and no attachment controller state uses `any`.

### Task 4: Extract The Location Trigger Editor

**Impact:** Removes the densest standalone editor: permissions, current location, provider/fallback place search, map gestures, radius/trigger draft, dirty-checking, and the location drawer. This should be the largest visible screen reduction.

**Files:**
- Create from prior commit: `src/features/activities/activityLocationTriggers.ts`
- Create from prior commit: `src/features/activities/activityLocationTriggers.test.ts`
- Create: `src/features/activities/useActivityLocationEditor.ts`
- Create: `src/features/activities/useActivityLocationEditor.test.tsx`
- Create: `src/features/activities/ActivityLocationSheet.tsx`
- Create: `src/features/activities/activityLocationSheetStyles.ts`
- Modify: `src/features/activities/ActivityDetailScreen.tsx:1140`
- Modify: `src/features/activities/ActivityDetailScreen.tsx:4516`

- [ ] **Step 1: Restore the location draft contract and verify it**

```bash
git restore --source=d9c153b -- \
  src/features/activities/activityLocationTriggers.ts \
  src/features/activities/activityLocationTriggers.test.ts
npx jest src/features/activities/activityLocationTriggers.test.ts --runInBand
```

Expected: the helper tests pass before moving permission or search effects.

- [ ] **Step 2: Write failing controller tests for hydration, search cancellation, and save**

```ts
it('hydrates the saved location each time the editor opens', () => {
  const { result, rerender } = renderHook(
    ({ visible, activity }) => useActivityLocationEditor(makeProps({ visible, activity })),
    { initialProps: { visible: false, activity: makeActivity({ location: savedLocation }) } },
  );

  rerender({ visible: true, activity: makeActivity({ location: savedLocation }) });

  expect(result.current.previewLocation).toEqual({
    label: 'School',
    latitude: 39.7,
    longitude: -104.9,
  });
  expect(result.current.trigger).toBe('arrive');
  expect(result.current.radiusM).toBeCloseTo(45.72);
});

it('aborts the previous search when the query changes', async () => {
  const { result } = renderHook(() => useActivityLocationEditor(makeProps({ visible: true })));
  act(() => result.current.setQuery('coffee'));
  act(() => result.current.setQuery('coffee shop'));
  await advanceDebounce();
  expect(cancelApplePlaceSearchBestEffortMock).toHaveBeenCalled();
});

it('saves the normalized trigger payload and closes', () => {
  const updateActivity = jest.fn();
  const onClose = jest.fn();
  const { result } = renderHook(() => useActivityLocationEditor(makeProps({ updateActivity, onClose })));
  act(() => result.current.selectResult(makePlaceResult()));
  act(() => result.current.save());
  expectUpdateToContain(updateActivity, {
    location: expect.objectContaining({ trigger: 'leave', radiusM: expect.any(Number) }),
  });
  expect(onClose).toHaveBeenCalledTimes(1);
});
```

- [ ] **Step 3: Implement the location controller with injected boundaries**

Use this public surface:

```ts
export type ActivityLocationEditorController = {
  query: string;
  results: ActivityLocationSearchResult[];
  searchError: string | null;
  statusHint: string | null;
  previewLocation: ActivityLocationPreview | null;
  selectedValue: string;
  trigger: ActivityLocationTrigger;
  radiusM: number;
  currentCoords: Coordinates | null;
  resolvedMapCenter: Coordinates;
  showNativeMap: boolean;
  isDirty: boolean;
  setQuery: (query: string) => void;
  setTrigger: (trigger: ActivityLocationTrigger) => void;
  setRadiusM: (radiusM: number) => void;
  selectResult: (result: ActivityLocationSearchResult) => void;
  useCurrentLocation: () => Promise<void>;
  clearSelection: () => void;
  setDroppedPin: (coordinates: Coordinates) => void;
  save: () => void;
  close: () => void;
};

export type Coordinates = { latitude: number; longitude: number };

export type ActivityLocationSearchResult = {
  id: string;
  label: string;
  latitude: number;
  longitude: number;
};
```

Move lines 1140-1712 into the hook, except `windowWidth`-derived dimensions and the PanResponder presentation binding, which belong in `ActivityLocationSheet`. Replace inline radius clamping, saved-location hydration, dirty comparison, and save payload construction with `activityLocationTriggers.ts`.

Keep the search policy unchanged: two-character minimum, cache key behavior, Apple best-effort search first, fallback search, nearest-first sorting, abort cleanup, and user-location seeding. Keep permission reads and store preference updates in the controller.

- [ ] **Step 4: Extract the location drawer and styles**

Move the full drawer at lines 4516-4901 into `ActivityLocationSheet.tsx`. The component receives `visible`, `controller`, `portalHostName`, and `onClose`. It owns map dimensions, PanResponder wiring, native/static map rendering, dropdowns, combobox layout, and footer buttons. Preserve the portal host name, map accessibility labels, keyboard behavior, snap points, and Save disabled state.

Replace the parent implementation with:

```tsx
const locationController = useActivityLocationEditor({
  visible: activeSheet === 'location',
  activity,
  updateActivity,
  onClose: () => setActiveSheet(null),
});

<ActivityLocationSheet
  visible={activeSheet === 'location'}
  controller={locationController}
  portalHostName="activity-detail-location-sheet"
  onClose={locationController.close}
/>
```

- [ ] **Step 5: Verify and commit Task 4**

```bash
npx jest \
  src/features/activities/activityLocationTriggers.test.ts \
  src/features/activities/useActivityLocationEditor.test.tsx \
  src/services/LocationPermissionService.test.ts \
  --runInBand
npm run verify:changed -- --base main --run
git add src/features/activities docs/agent-code-map.md
git commit -m "Refactor Activity location editor"
```

Expected: verification passes; `ActivityDetailScreen.tsx` loses at least 750 additional lines.

### Task 5: Extract The Focus Launcher And Overlay

**Impact:** Removes Focus-specific setup, animation, notification commands, and overlay UI from Activity Detail while retaining the existing persisted runtime host. This is last because it touches the most native boundaries.

**Files:**
- Create: `src/features/activities/focusSessionPresentation.ts`
- Create: `src/features/activities/focusSessionPresentation.test.ts`
- Create: `src/features/activities/useActivityFocusController.ts`
- Create: `src/features/activities/useActivityFocusController.test.tsx`
- Create: `src/features/activities/ActivityFocusExperience.tsx`
- Create: `src/features/activities/activityFocusExperienceStyles.ts`
- Modify: `src/features/activities/ActivityDetailScreen.tsx:756`
- Modify: `src/features/activities/ActivityDetailScreen.tsx:2108`
- Modify: `src/features/activities/ActivityDetailScreen.tsx:5100`
- Modify: `src/features/activities/ActivityDetailScreen.tsx:5487`
- Keep: `src/features/activities/FocusSessionRuntimeHost.tsx`
- Keep: `src/features/activities/focusSessionStore.ts`
- Keep: `src/features/activities/focusSessionLifecycle.ts`

- [ ] **Step 1: Add pure Focus presentation contracts first**

```ts
export const FOCUS_PRESET_MINUTES = [10, 25, 45, 60] as const;

export function clampFocusMinutes(raw: string | number, maxMinutes: number): number {
  const parsed = Math.floor(Number(raw) || 1);
  return Math.min(maxMinutes, Math.max(1, parsed));
}

export function buildFocusCustomMinuteOptions(maxMinutes: number): number[] {
  return Array.from({ length: Math.max(1, Math.floor(maxMinutes / 5)) }, (_, index) => (index + 1) * 5);
}

export function getRemainingFocusMs(session: ActiveFocusSession | null, nowMs: number): number {
  if (!session) return 0;
  return session.mode === 'paused'
    ? Math.max(0, session.remainingMs)
    : Math.max(0, session.endAtMs - nowMs);
}
```

Write tests for invalid/negative/max duration, custom option bounds, paused remaining time, running remaining time, and expired sessions. Run the test first and expect failure, then implement the exact functions above.

- [ ] **Step 2: Write failing controller tests around native command ordering**

Pin the riskiest behavior rather than animation details:

```ts
it('starts the persisted session before reconciling Screen Time', async () => {
  const order: string[] = [];
  startSessionMock.mockImplementation(() => {
    order.push('start');
    return runningSession;
  });
  reconcileScreenTimeRestrictionsMock.mockImplementation(async () => {
    order.push('reconcile');
    return [];
  });
  const { result } = renderHook(() => useActivityFocusController(makeProps()));

  await act(async () => result.current.start());

  expect(order).toEqual(['start', 'reconcile']);
});

it('cancels the active notification before ending a session', async () => {
  const order: string[] = [];
  cancelScheduledNotificationAsyncMock.mockImplementation(async () => order.push('cancel'));
  endSessionMock.mockImplementation(() => {
    order.push('end');
    return { sessionId: 'focus-1', notificationId: 'notification-1' };
  });
  const { result } = renderHook(() => useActivityFocusController(makeProps({ session: runningSession })));
  await act(async () => result.current.end());
  expect(order).toEqual(['cancel', 'end']);
});

it('routes over-limit starts to the paywall without creating a session', async () => {
  const { result } = renderHook(() => useActivityFocusController(makeProps({ maxMinutes: 10 })));
  act(() => result.current.setMinutes(25));
  await act(async () => result.current.start());
  expect(openPaywallInterstitialMock).toHaveBeenCalledWith({
    reason: 'pro_only_focus_mode',
    source: 'activity_focus_mode',
  });
  expect(startSessionMock).not.toHaveBeenCalled();
});
```

- [ ] **Step 3: Implement the controller while preserving runtime ownership**

```ts
export type ActivityFocusController = {
  session: ActiveFocusSession | null;
  minutes: number;
  maxMinutes: number;
  presets: readonly number[];
  customOptions: number[];
  customExpanded: boolean;
  remainingMs: number;
  soundscapeMenuOpen: boolean;
  screenTimeOfferVisible: boolean;
  setMinutes: (minutes: number) => void;
  setCustomExpanded: (expanded: boolean) => void;
  setSoundscapeMenuOpen: (open: boolean) => void;
  open: () => void;
  close: () => void;
  start: (overrideMinutes?: number) => Promise<void>;
  pauseOrResume: () => Promise<void>;
  end: () => Promise<void>;
};
```

Move Focus setup state/effects at lines 756-968 and commands at lines 2108-2380 into the hook. Keep persisted session transitions in `focusSessionStore`; keep background completion, soundscape runtime, Screen Time runtime, Live Activity, and glanceable-state synchronization in `FocusSessionRuntimeHost`. The hook may call the same native boundaries currently called by explicit user commands, but it must not duplicate the host's ongoing synchronization effects.

Retain the existing launch timeout that prevents stacking the Focus modal over a closing drawer, and clear it during hook cleanup. Preserve analytics payloads and crash breadcrumbs exactly.

- [ ] **Step 4: Extract setup drawer and active overlay into one experience component**

Move the setup drawer at lines 5100-5274 and active overlay at lines 5487-5612 into `ActivityFocusExperience.tsx`. Keep color cycling and soundscape-menu animation local to the presentation component because they are visual state, not session state.

```ts
type ActivityFocusExperienceProps = {
  setupVisible: boolean;
  activityTitle: string;
  controller: ActivityFocusController;
  screenTimeOffer: ReactNode;
  soundscapeEnabled: boolean;
  soundscapeTrackId: string;
  focusOverlayColorIndex: number;
  setSoundscapeEnabled: (enabled: boolean) => void;
  setSoundscapeTrackId: (id: string) => void;
  setFocusOverlayColorIndex: (index: number) => void;
  onClose: () => void;
};
```

Preserve `e2e.activityDetail.focus.start`, setup drawer snap points, long-press soundscape behavior, safe-area padding, active-session title/timer, pause/resume/end labels, and color palette. Do not move app-level runtime effects into this component.

- [ ] **Step 5: Run focused runtime and controller verification**

```bash
npx jest \
  src/features/activities/focusSessionPresentation.test.ts \
  src/features/activities/useActivityFocusController.test.tsx \
  src/features/activities/focusSessionLifecycle.test.ts \
  src/features/activities/focusSessionStore.test.ts \
  src/features/activities/FocusSessionRuntimeHost.test.tsx \
  --runInBand
npm run verify:changed -- --base main --run
```

Expected: all tests pass, including notification expiry and persisted runtime tests.

- [ ] **Step 6: Measure the completed decomposition and commit Task 5**

```bash
wc -l src/features/activities/ActivityDetailScreen.tsx
rg -c '^import ' src/features/activities/ActivityDetailScreen.tsx
npm run code:health -- --base main
git add src/features/activities docs/agent-code-map.md
git commit -m "Refactor Activity Focus experience"
```

Expected: `ActivityDetailScreen.tsx` is below 3,500 lines, has at least 25 fewer imports than the 109-import audit baseline, and all five experiences have named component/controller owners.

## Final Behavioral Check

After Task 5, run the full automated suite once:

```bash
npm test -- --runInBand
npm run verify:changed -- --base main --run
```

Then perform one device/simulator pass because BottomDrawer stacking, map gestures, native calendar permissions, audio recording, and Focus overlays cannot be fully proven by Jest:

1. Open an activity and schedule a suggested slot, then a manually tapped calendar slot.
2. Set a preset repeat, edit a custom weekly repeat, return to presets, and clear it.
3. Open a photo attachment, share it, cancel a delete alert, record audio, and cancel an active recording by closing the sheet.
4. Open location, use current location, search a place, drag/drop the pin, change trigger/radius, save, reopen, and clear it.
5. Start Focus with a preset, pause/resume, switch soundscape, cycle overlay color, end it, and repeat with the free-tier maximum.

Record any behavior mismatch as a regression test in the extracted owner before changing implementation.

## Stop Conditions

- Stop a task if the extracted component needs more than 20 parent props; move cohesive state into its controller before continuing.
- Stop if two drawers become visible simultaneously; preserve the parent's single `activeSheet` source of truth.
- Stop if an extraction changes copy, navigation destination, native permission timing, analytics payloads, or persistence shape; those require a separate product/behavior change.
- Do not combine adjacent page cleanup with these commits. Each commit should contain one experience extraction plus its tests and generated map update.
