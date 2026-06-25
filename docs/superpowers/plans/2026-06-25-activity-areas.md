# Activity Areas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Settings-managed Activity Areas, let Activities optionally reference one Area, use Areas for scheduling availability, and make AI "Fill details" generate an Area suggestion when confident.

**Architecture:** Areas are a durable user preference and Activities store an optional `areaId`. Scheduling resolves an Activity's Area to availability windows, falling back to the existing work/personal inference when no Area is set. AI enrichment treats Area as part of the existing `details` action, so the current "Fill details" toggle can populate `areaId` without adding a new AI action.

**Tech Stack:** React Native / Expo SDK 54, TypeScript, Zustand persisted store, Jest, existing Kwilt Settings stack, existing Plan scheduling services, existing OpenAI JSON-schema enrichment path.

---

## File Structure

- Modify `src/domain/types.ts`
  - Add `ActivityArea`, `ActivityAreaAvailabilityWindow`, optional `Activity.areaId`, and optional `UserProfile.preferences.plan.areas` if that preference type already exists nearby.
- Create `src/domain/activityAreas.ts`
  - Own default Area seeds, normalization, lookup, archive semantics, and stable helper functions.
- Create `src/domain/activityAreas.test.ts`
  - Regression tests for defaults, normalization, duplicate labels, archive display, and fallback lookup.
- Modify `src/store/useAppStore.ts`
  - Add `activityAreas`, store actions, persistence migration/normalization, and default seeding.
- Modify `src/store/useAppStore.lifecycle.test.ts`
  - Store default/migration tests.
- Create `src/features/account/ActivityAreasSettingsScreen.tsx`
  - Settings-managed list and simple add/rename/reorder/archive affordances.
- Modify `src/navigation/RootNavigator.tsx`
  - Add `SettingsActivityAreas` to `SettingsStackParamList` and stack navigator.
- Modify `src/features/account/SettingsHomeScreen.tsx`
  - Add Areas under Planning.
- Modify `src/features/activities/ActivityDraftDetailFields.tsx`
  - Add optional Area picker for draft/detail-style Activity editing.
- Modify `src/features/activities/ActivityDetailScreen.tsx`, `src/features/activities/ActivitiesScreen.tsx`, `src/features/arcs/GoalDetailScreen.tsx`, and `src/features/activities/ActivityCoachDrawer.tsx`
  - Thread Area lists and `areaId` through Activity creation/editing surfaces that already use `ActivityDraftDetailFields`.
- Modify `src/services/plan/planAvailability.ts`
  - Add Area-aware availability resolution helpers while preserving `work`/`personal` fallback.
- Modify `src/services/plan/planScheduling.ts`, `src/features/plan/PlanPager.tsx`, `src/features/plan/PlanScheduleApplyPage.tsx`, and `src/features/activities/ActivityDetailScreen.tsx`
  - Use Area-aware scheduling mode/window resolution.
- Add/modify tests in `src/services/plan/planScheduling.test.ts` and `src/services/scheduling/inferSchedulingDomain.test.ts`
  - Ensure Area wins over keyword inference and unassigned Activities still fall back.
- Modify `src/services/ai.ts`
  - Include Areas in `details` prompt and JSON schema; normalize returned `areaId`.
- Modify `src/services/ai.activityEnrichment.test.ts`
  - Assert `details` requests Area and non-details omits it.
- Modify `src/features/activities/useQuickAddDockController.ts`
  - Apply `enrichment.areaId` only when `details` is selected and the Activity has no Area.
- Modify `src/features/activities/useQuickAddDockController.test.ts`
  - Assert "Fill details" applies Area and other toggles do not.

## Implementation Notes

- Use **Area** in user-facing copy. Do not expose `scope` or `domain`.
- V1 supports zero or one Area per Activity.
- Do not block capture when no Area exists.
- Do not add Area grouping in this implementation.
- Do not add a separate AI action. Area belongs to `details`, whose UI label is already "Fill details".
- Keep archived Areas resolvable for old Activities.
- If existing code already has `schedulingDomain`, preserve it for compatibility but prefer explicit Area when present.

### Task 1: Domain Model And Area Helpers

**Files:**
- Modify: `src/domain/types.ts`
- Create: `src/domain/activityAreas.ts`
- Test: `src/domain/activityAreas.test.ts`

- [ ] **Step 1: Write failing Area helper tests**

Create `src/domain/activityAreas.test.ts`:

```ts
import {
  DEFAULT_ACTIVITY_AREAS,
  findActivityAreaById,
  normalizeActivityAreas,
  resolveActivityAreaFallbackMode,
} from './activityAreas';

describe('activityAreas', () => {
  it('seeds intelligent defaults in stable order', () => {
    expect(DEFAULT_ACTIVITY_AREAS.map((area) => area.label)).toEqual([
      'Work',
      'Personal',
      'Family',
      'Home',
      'Health',
    ]);
    expect(DEFAULT_ACTIVITY_AREAS.map((area) => area.id)).toEqual([
      'area-work',
      'area-personal',
      'area-family',
      'area-home',
      'area-health',
    ]);
  });

  it('falls back to defaults when persisted areas are missing', () => {
    expect(normalizeActivityAreas(undefined).map((area) => area.id)).toEqual(
      DEFAULT_ACTIVITY_AREAS.map((area) => area.id),
    );
  });

  it('keeps archived areas resolvable but inactive', () => {
    const areas = normalizeActivityAreas([
      {
        id: 'area-church',
        label: 'Church',
        order: 0,
        archivedAt: '2026-06-25T12:00:00.000Z',
        scheduling: { fallbackMode: 'personal' },
      },
    ]);

    expect(findActivityAreaById(areas, 'area-church')?.label).toBe('Church');
    expect(findActivityAreaById(areas, 'area-church')?.archivedAt).toBe('2026-06-25T12:00:00.000Z');
  });

  it('deduplicates invalid labels and keeps a valid default list', () => {
    const areas = normalizeActivityAreas([
      { id: 'area-a', label: 'Work', order: 0 },
      { id: 'area-b', label: 'Work', order: 1 },
      { id: 'area-empty', label: '   ', order: 2 },
    ]);

    expect(areas.filter((area) => area.label === 'Work')).toHaveLength(1);
    expect(areas.some((area) => area.id === 'area-empty')).toBe(false);
    expect(areas.length).toBeGreaterThanOrEqual(5);
  });

  it('resolves scheduling fallback modes for default areas', () => {
    const areas = normalizeActivityAreas(undefined);

    expect(resolveActivityAreaFallbackMode(areas, 'area-work')).toBe('work');
    expect(resolveActivityAreaFallbackMode(areas, 'area-family')).toBe('personal');
    expect(resolveActivityAreaFallbackMode(areas, 'area-health')).toBe('personal');
    expect(resolveActivityAreaFallbackMode(areas, null)).toBe(null);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm test -- src/domain/activityAreas.test.ts --runInBand
```

Expected: FAIL because `src/domain/activityAreas.ts` does not exist.

- [ ] **Step 3: Add Area types**

In `src/domain/types.ts`, near the Activity scheduling types, add:

```ts
export type ActivityAreaFallbackMode = 'work' | 'personal' | 'flexible';

export type ActivityAreaAvailabilityWindow = {
  weekday: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  start: string;
  end: string;
};

export type ActivityArea = {
  id: string;
  label: string;
  order: number;
  archivedAt?: string | null;
  isDefault?: boolean;
  scheduling?: {
    enabled?: boolean;
    windows?: ActivityAreaAvailabilityWindow[];
    fallbackMode?: ActivityAreaFallbackMode;
  };
};
```

In the `Activity` interface, add this before `schedulingDomain`:

```ts
  /**
   * Optional user-managed life area for this Activity, such as Work,
   * Personal, Family, Home, or Health. Area is user-facing; schedulingDomain
   * remains compatibility/inference plumbing.
   */
  areaId?: string | null;
```

- [ ] **Step 4: Implement Area helpers**

Create `src/domain/activityAreas.ts`:

```ts
import type { ActivityArea, ActivityAreaFallbackMode } from './types';

export const DEFAULT_ACTIVITY_AREAS: ActivityArea[] = [
  {
    id: 'area-work',
    label: 'Work',
    order: 0,
    isDefault: true,
    scheduling: { enabled: true, fallbackMode: 'work' },
  },
  {
    id: 'area-personal',
    label: 'Personal',
    order: 1,
    isDefault: true,
    scheduling: { enabled: true, fallbackMode: 'personal' },
  },
  {
    id: 'area-family',
    label: 'Family',
    order: 2,
    isDefault: true,
    scheduling: { enabled: true, fallbackMode: 'personal' },
  },
  {
    id: 'area-home',
    label: 'Home',
    order: 3,
    isDefault: true,
    scheduling: { enabled: true, fallbackMode: 'personal' },
  },
  {
    id: 'area-health',
    label: 'Health',
    order: 4,
    isDefault: true,
    scheduling: { enabled: true, fallbackMode: 'personal' },
  },
];

function normalizeFallbackMode(value: unknown): ActivityAreaFallbackMode | undefined {
  return value === 'work' || value === 'personal' || value === 'flexible' ? value : undefined;
}

function normalizeArea(value: unknown, fallbackOrder: number): ActivityArea | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Partial<ActivityArea>;
  const id = typeof raw.id === 'string' ? raw.id.trim() : '';
  const label = typeof raw.label === 'string' ? raw.label.trim() : '';
  if (!id || !label) return null;
  const order = typeof raw.order === 'number' && Number.isFinite(raw.order) ? raw.order : fallbackOrder;
  const archivedAt =
    typeof raw.archivedAt === 'string' && raw.archivedAt.trim().length > 0 ? raw.archivedAt.trim() : null;
  const fallbackMode = normalizeFallbackMode(raw.scheduling?.fallbackMode);

  return {
    id,
    label,
    order,
    archivedAt,
    isDefault: raw.isDefault === true,
    scheduling: {
      enabled: raw.scheduling?.enabled !== false,
      fallbackMode,
      windows: Array.isArray(raw.scheduling?.windows) ? raw.scheduling?.windows : undefined,
    },
  };
}

export function normalizeActivityAreas(value: unknown): ActivityArea[] {
  const input = Array.isArray(value) ? value : [];
  const seenIds = new Set<string>();
  const seenLabels = new Set<string>();
  const normalized: ActivityArea[] = [];

  input.forEach((candidate, index) => {
    const area = normalizeArea(candidate, index);
    if (!area) return;
    const labelKey = area.label.toLowerCase();
    if (seenIds.has(area.id) || seenLabels.has(labelKey)) return;
    seenIds.add(area.id);
    seenLabels.add(labelKey);
    normalized.push(area);
  });

  DEFAULT_ACTIVITY_AREAS.forEach((defaultArea) => {
    const labelKey = defaultArea.label.toLowerCase();
    if (seenIds.has(defaultArea.id) || seenLabels.has(labelKey)) return;
    normalized.push(defaultArea);
  });

  return normalized.sort((a, b) => a.order - b.order || a.label.localeCompare(b.label));
}

export function getActiveActivityAreas(areas: ActivityArea[]): ActivityArea[] {
  return normalizeActivityAreas(areas).filter((area) => !area.archivedAt);
}

export function findActivityAreaById(areas: ActivityArea[], areaId: string | null | undefined): ActivityArea | null {
  if (!areaId) return null;
  return normalizeActivityAreas(areas).find((area) => area.id === areaId) ?? null;
}

export function resolveActivityAreaFallbackMode(
  areas: ActivityArea[],
  areaId: string | null | undefined,
): ActivityAreaFallbackMode | null {
  const area = findActivityAreaById(areas, areaId);
  return area?.scheduling?.fallbackMode ?? null;
}

export function createActivityAreaId(label: string, existingAreas: ActivityArea[]): string {
  const base = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'area';
  const existing = new Set(existingAreas.map((area) => area.id));
  let id = `area-${base}`;
  let index = 2;
  while (existing.has(id)) {
    id = `area-${base}-${index}`;
    index += 1;
  }
  return id;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run:

```bash
npm test -- src/domain/activityAreas.test.ts --runInBand
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/domain/types.ts src/domain/activityAreas.ts src/domain/activityAreas.test.ts
git commit -m "Add activity area domain model"
```

### Task 2: Persist Areas In The App Store

**Files:**
- Modify: `src/store/useAppStore.ts`
- Test: `src/store/useAppStore.lifecycle.test.ts`

- [ ] **Step 1: Write failing store lifecycle tests**

In `src/store/useAppStore.lifecycle.test.ts`, add tests near existing quick-add/default preference tests:

```ts
it('defaults to intelligent activity areas', () => {
  expect(useAppStore.getState().activityAreas.map((area) => area.label)).toEqual([
    'Work',
    'Personal',
    'Family',
    'Home',
    'Health',
  ]);
});

it('can add, rename, reorder, and archive activity areas', () => {
  const store = useAppStore.getState();

  store.addActivityArea('Church');
  const church = useAppStore.getState().activityAreas.find((area) => area.label === 'Church');
  expect(church).toBeTruthy();

  useAppStore.getState().renameActivityArea(church!.id, 'Church / Service');
  expect(useAppStore.getState().activityAreas.find((area) => area.id === church!.id)?.label).toBe('Church / Service');

  useAppStore.getState().reorderActivityAreas([church!.id, 'area-work', 'area-personal', 'area-family', 'area-home', 'area-health']);
  expect(useAppStore.getState().activityAreas[0]?.id).toBe(church!.id);

  useAppStore.getState().archiveActivityArea(church!.id, '2026-06-25T12:00:00.000Z');
  expect(useAppStore.getState().activityAreas.find((area) => area.id === church!.id)?.archivedAt).toBe(
    '2026-06-25T12:00:00.000Z',
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm test -- src/store/useAppStore.lifecycle.test.ts --runInBand
```

Expected: FAIL because `activityAreas` and actions do not exist.

- [ ] **Step 3: Add store fields and actions**

In `src/store/useAppStore.ts`, import:

```ts
import {
  createActivityAreaId,
  DEFAULT_ACTIVITY_AREAS,
  normalizeActivityAreas,
} from '../domain/activityAreas';
import type { ActivityArea } from '../domain/types';
```

Add to `AppState`:

```ts
  activityAreas: ActivityArea[];
  setActivityAreas: (updater: ActivityArea[] | ((current: ActivityArea[]) => ActivityArea[])) => void;
  addActivityArea: (label: string) => void;
  renameActivityArea: (areaId: string, label: string) => void;
  reorderActivityAreas: (orderedAreaIds: string[]) => void;
  archiveActivityArea: (areaId: string, archivedAtIso?: string) => void;
```

In initial state:

```ts
      activityAreas: DEFAULT_ACTIVITY_AREAS,
```

In actions:

```ts
      setActivityAreas: (updater) =>
        set((state) => {
          const current = normalizeActivityAreas(state.activityAreas);
          const next = typeof updater === 'function' ? updater(current) : updater;
          return { activityAreas: normalizeActivityAreas(next) };
        }),
      addActivityArea: (label) =>
        set((state) => {
          const current = normalizeActivityAreas(state.activityAreas);
          const cleanLabel = label.trim();
          if (!cleanLabel) return { activityAreas: current };
          const exists = current.some((area) => area.label.toLowerCase() === cleanLabel.toLowerCase());
          if (exists) return { activityAreas: current };
          return {
            activityAreas: normalizeActivityAreas([
              ...current,
              {
                id: createActivityAreaId(cleanLabel, current),
                label: cleanLabel,
                order: current.length,
                scheduling: { enabled: true, fallbackMode: 'personal' },
              },
            ]),
          };
        }),
      renameActivityArea: (areaId, label) =>
        set((state) => {
          const cleanLabel = label.trim();
          if (!cleanLabel) return { activityAreas: normalizeActivityAreas(state.activityAreas) };
          return {
            activityAreas: normalizeActivityAreas(
              state.activityAreas.map((area) => (area.id === areaId ? { ...area, label: cleanLabel } : area)),
            ),
          };
        }),
      reorderActivityAreas: (orderedAreaIds) =>
        set((state) => {
          const orderById = new Map(orderedAreaIds.map((id, index) => [id, index]));
          return {
            activityAreas: normalizeActivityAreas(
              state.activityAreas.map((area) => ({
                ...area,
                order: orderById.get(area.id) ?? area.order,
              })),
            ),
          };
        }),
      archiveActivityArea: (areaId, archivedAtIso) =>
        set((state) => ({
          activityAreas: normalizeActivityAreas(
            state.activityAreas.map((area) =>
              area.id === areaId
                ? { ...area, archivedAt: archivedAtIso ?? new Date().toISOString() }
                : area,
            ),
          ),
        })),
```

In the persist migration/rehydration section where other preferences are normalized, add:

```ts
        state.activityAreas = normalizeActivityAreas((state as any).activityAreas);
```

In `partialize`, include:

```ts
          activityAreas: state.activityAreas,
```

- [ ] **Step 4: Run lifecycle tests**

Run:

```bash
npm test -- src/store/useAppStore.lifecycle.test.ts --runInBand
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/store/useAppStore.ts src/store/useAppStore.lifecycle.test.ts
git commit -m "Persist activity areas"
```

### Task 3: Add Settings Areas Management

**Files:**
- Create: `src/features/account/ActivityAreasSettingsScreen.tsx`
- Modify: `src/navigation/RootNavigator.tsx`
- Modify: `src/features/account/SettingsHomeScreen.tsx`

- [ ] **Step 1: Add navigation route**

In `src/navigation/RootNavigator.tsx`, import:

```ts
import { ActivityAreasSettingsScreen } from '../features/account/ActivityAreasSettingsScreen';
```

In `SettingsStackParamList`, add:

```ts
  SettingsActivityAreas: undefined;
```

In `SettingsStackNavigator`, add near Plan Availability:

```tsx
      <SettingsStack.Screen
        name="SettingsActivityAreas"
        component={ActivityAreasSettingsScreen}
      />
```

- [ ] **Step 2: Add Settings menu entry**

In `src/features/account/SettingsHomeScreen.tsx`, in the `planning` group `items`, add:

```ts
      {
        id: 'activity_areas',
        title: 'Areas',
        description: 'Manage where different to-dos belong.',
        icon: 'settings',
        route: 'SettingsActivityAreas',
        tags: ['areas', 'planning', 'availability'],
      },
```

- [ ] **Step 3: Create Settings screen**

Create `src/features/account/ActivityAreasSettingsScreen.tsx`:

```tsx
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { SettingsStackParamList } from '../../navigation/RootNavigator';
import { useAppStore } from '../../store/useAppStore';
import { getActiveActivityAreas } from '../../domain/activityAreas';
import { AppShell } from '../../ui/layout/AppShell';
import { PageHeader } from '../../ui/layout/PageHeader';
import { Text, Heading, HStack, VStack } from '../../ui/primitives';
import { Button } from '../../ui/Button';
import { colors, spacing, typography } from '../../theme';
import { Icon } from '../../ui/Icon';

type Nav = NativeStackNavigationProp<SettingsStackParamList, 'SettingsActivityAreas'>;

export function ActivityAreasSettingsScreen() {
  const navigation = useNavigation<Nav>();
  const areas = useAppStore((state) => state.activityAreas);
  const addActivityArea = useAppStore((state) => state.addActivityArea);
  const renameActivityArea = useAppStore((state) => state.renameActivityArea);
  const archiveActivityArea = useAppStore((state) => state.archiveActivityArea);
  const [newAreaLabel, setNewAreaLabel] = useState('');

  const activeAreas = getActiveActivityAreas(areas);

  function handleAddArea() {
    const label = newAreaLabel.trim();
    if (!label) return;
    addActivityArea(label);
    setNewAreaLabel('');
  }

  function promptRename(areaId: string, currentLabel: string) {
    Alert.prompt?.(
      'Rename area',
      undefined,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Save',
          onPress: (value) => {
            const next = String(value ?? '').trim();
            if (next) renameActivityArea(areaId, next);
          },
        },
      ],
      'plain-text',
      currentLabel,
    );
  }

  return (
    <AppShell>
      <PageHeader
        title="Areas"
        subtitle="Where different to-dos usually belong."
        leftAction={{ icon: 'chevronLeft', label: 'Back', onPress: () => navigation.goBack() }}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <VStack gap={spacing.md}>
          <View style={styles.panel}>
            <Heading size="sm">Your areas</Heading>
            <Text variant="bodySmall" color="secondary">
              Areas help Kwilt schedule work in the part of life where it usually fits.
            </Text>
            {activeAreas.map((area) => (
              <HStack key={area.id} align="center" justify="space-between" style={styles.row}>
                <View style={styles.rowText}>
                  <Text variant="body">{area.label}</Text>
                  <Text variant="caption" color="secondary">
                    Usually fits: {area.scheduling?.fallbackMode === 'work' ? 'work hours' : 'personal time'}
                  </Text>
                </View>
                <HStack gap={spacing.xs}>
                  <Pressable accessibilityRole="button" accessibilityLabel={`Rename ${area.label}`} onPress={() => promptRename(area.id, area.label)} style={styles.iconButton}>
                    <Icon name="edit" size={18} color={colors.text.primary} />
                  </Pressable>
                  <Pressable accessibilityRole="button" accessibilityLabel={`Archive ${area.label}`} onPress={() => archiveActivityArea(area.id)} style={styles.iconButton}>
                    <Icon name="x" size={18} color={colors.text.secondary} />
                  </Pressable>
                </HStack>
              </HStack>
            ))}
          </View>
          <View style={styles.panel}>
            <Heading size="sm">Add area</Heading>
            <HStack gap={spacing.sm} align="center">
              <TextInput
                value={newAreaLabel}
                onChangeText={setNewAreaLabel}
                placeholder="Church, School, Side project"
                placeholderTextColor={colors.text.tertiary}
                style={styles.input}
              />
              <Button label="Add" onPress={handleAddArea} disabled={!newAreaLabel.trim()} />
            </HStack>
          </View>
        </VStack>
      </ScrollView>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  panel: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border.muted,
    borderRadius: 8,
    padding: spacing.md,
    gap: spacing.sm,
  },
  row: {
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border.muted,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    minHeight: 44,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border.default,
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    color: colors.text.primary,
    fontSize: typography.body.fontSize,
  },
});
```

If `Alert.prompt` is not available in the app's Android path, replace rename with an inline editing row before committing.

- [ ] **Step 4: Run typecheck**

Run:

```bash
npm run lint
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/account/ActivityAreasSettingsScreen.tsx src/navigation/RootNavigator.tsx src/features/account/SettingsHomeScreen.tsx
git commit -m "Add activity areas settings"
```

### Task 4: Add Activity Area Assignment

**Files:**
- Modify: `src/features/activities/ActivityDraftDetailFields.tsx`
- Modify: `src/features/activities/ActivitiesScreen.tsx`
- Modify: `src/features/activities/ActivityDetailScreen.tsx`
- Modify: `src/features/arcs/GoalDetailScreen.tsx`
- Modify: `src/features/activities/ActivityCoachDrawer.tsx`

- [ ] **Step 1: Add `areaId` to Activity drafts**

In `src/features/activities/ActivityDraftDetailFields.tsx`, update `ActivityDraft`:

```ts
export type ActivityDraft = {
  // existing fields...
  areaId?: string | null;
};
```

Add props:

```ts
  areas?: ActivityArea[];
```

Import:

```ts
import type { ActivityArea } from '../../domain/types';
import { getActiveActivityAreas } from '../../domain/activityAreas';
```

- [ ] **Step 2: Add Area picker UI**

Inside `ActivityDraftDetailFields`, derive active areas:

```ts
  const activeAreas = getActiveActivityAreas(areas ?? []);
```

Render this near tags/details metadata:

```tsx
      {activeAreas.length > 0 ? (
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Area</Text>
          <View style={styles.chipRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="No area"
              onPress={() => onChange((prev) => ({ ...prev, areaId: null }))}
              style={[styles.chip, !draft.areaId && styles.chipSelected]}
            >
              <Text style={[styles.chipText, !draft.areaId && styles.chipTextSelected]}>No area</Text>
            </Pressable>
            {activeAreas.map((area) => {
              const selected = draft.areaId === area.id;
              return (
                <Pressable
                  key={area.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Area ${area.label}`}
                  onPress={() => onChange((prev) => ({ ...prev, areaId: area.id }))}
                  style={[styles.chip, selected && styles.chipSelected]}
                >
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{area.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}
```

Reuse existing chip styles in this file if present. If no compatible styles exist, add styles matching existing tag chips.

- [ ] **Step 3: Thread Areas from screens**

In screens that render `ActivityDraftDetailFields`, read from store:

```ts
const activityAreas = useAppStore((state) => state.activityAreas);
```

Pass:

```tsx
<ActivityDraftDetailFields
  // existing props
  areas={activityAreas}
/>
```

Ensure draft initializers include:

```ts
areaId: null,
```

Ensure Activity creation/update writes:

```ts
areaId: draft.areaId ?? null,
```

- [ ] **Step 4: Run focused typecheck**

Run:

```bash
npm run lint
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/activities/ActivityDraftDetailFields.tsx src/features/activities/ActivitiesScreen.tsx src/features/activities/ActivityDetailScreen.tsx src/features/arcs/GoalDetailScreen.tsx src/features/activities/ActivityCoachDrawer.tsx
git commit -m "Let activities use areas"
```

### Task 5: Make Scheduling Area-Aware

**Files:**
- Modify: `src/services/plan/planAvailability.ts`
- Modify: `src/services/plan/planScheduling.ts`
- Modify: `src/features/plan/PlanPager.tsx`
- Modify: `src/features/plan/PlanScheduleApplyPage.tsx`
- Modify: `src/features/activities/ActivityDetailScreen.tsx`
- Test: `src/services/plan/planScheduling.test.ts`

- [ ] **Step 1: Write failing scheduling tests**

In `src/services/plan/planScheduling.test.ts`, add:

```ts
it('uses the activity Area fallback mode before keyword inference', () => {
  const workArea = {
    id: 'area-work',
    label: 'Work',
    order: 0,
    scheduling: { enabled: true, fallbackMode: 'work' as const },
  };
  const result = proposeSlotsForActivity({
    activity: activity({ title: 'Walk the dog', areaId: 'area-work', estimateMinutes: 30 }),
    goals: [],
    userProfile: null,
    activityAreas: [workArea],
    targetDate: new Date('2026-06-29T12:00:00.000Z'),
    busyIntervals: [],
    writeCalendarId: 'cal-1',
  });

  expect(result[0]?.startDate).toContain('09:00');
  expect(result[0]?.domain).toBe('work');
});

it('falls back to inferred scheduling domain when no Area is assigned', () => {
  const result = proposeSlotsForActivity({
    activity: activity({ title: 'Walk the dog', areaId: null, estimateMinutes: 30 }),
    goals: [],
    userProfile: null,
    activityAreas: [],
    targetDate: new Date('2026-06-29T12:00:00.000Z'),
    busyIntervals: [],
    writeCalendarId: 'cal-1',
  });

  expect(result[0]?.startDate).toContain('17:00');
  expect(result[0]?.domain).toBe('personal');
});
```

Adjust date/time assertions if existing test helpers normalize timezone differently.

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm test -- src/services/plan/planScheduling.test.ts --runInBand
```

Expected: FAIL because `activityAreas` is not an accepted parameter and Area is not used.

- [ ] **Step 3: Add Area-aware window helper**

In `src/services/plan/planAvailability.ts`, import:

```ts
import type { ActivityArea } from '../../domain/types';
import { resolveActivityAreaFallbackMode } from '../../domain/activityAreas';
```

Add:

```ts
export function resolvePlanModeForArea(
  areas: ActivityArea[],
  areaId: string | null | undefined,
  fallbackMode: PlanMode,
): PlanMode {
  const mode = resolveActivityAreaFallbackMode(areas, areaId);
  if (mode === 'work') return 'work';
  if (mode === 'personal') return 'personal';
  return fallbackMode;
}
```

- [ ] **Step 4: Update `planScheduling` signatures and resolution**

In `src/services/plan/planScheduling.ts`, import `ActivityArea` and `resolvePlanModeForArea`.

Change `resolveModeForActivity`:

```ts
function resolveModeForActivity(activity: Activity, goals: Goal[], areas: ActivityArea[]): PlanMode {
  const inferred = inferSchedulingDomain(activity, goals).toLowerCase().includes('work') ? 'work' : 'personal';
  return resolvePlanModeForArea(areas, activity.areaId, inferred);
}
```

Add `activityAreas?: ActivityArea[]` to `proposeDailyPlan` and `proposeSlotsForActivity` params. Use:

```ts
  const activityAreas = params.activityAreas ?? [];
```

Then call:

```ts
const mode = resolveModeForActivity(activity, goals, activityAreas);
```

When constructing proposals, set:

```ts
domain: mode,
```

- [ ] **Step 5: Thread Areas through scheduling callsites**

In `ActivityDetailScreen.tsx`, `PlanPager.tsx`, and `PlanScheduleApplyPage.tsx`, read:

```ts
const activityAreas = useAppStore((state) => state.activityAreas);
```

Pass `activityAreas` into `proposeSlotsForActivity` and `proposeDailyPlan`.

For direct manual slot validation in `ActivityDetailScreen.tsx`, replace:

```ts
const inferredDomain = inferSchedulingDomain(activity, goals ?? []).toLowerCase();
const mode = inferredDomain.includes('work') ? 'work' : 'personal';
```

with:

```ts
const inferredDomain = inferSchedulingDomain(activity, goals ?? []).toLowerCase();
const inferredMode = inferredDomain.includes('work') ? 'work' : 'personal';
const mode = resolvePlanModeForArea(activityAreas, activity.areaId, inferredMode);
```

- [ ] **Step 6: Run scheduling tests and typecheck**

Run:

```bash
npm test -- src/services/plan/planScheduling.test.ts --runInBand
npm run lint
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/services/plan/planAvailability.ts src/services/plan/planScheduling.ts src/services/plan/planScheduling.test.ts src/features/plan/PlanPager.tsx src/features/plan/PlanScheduleApplyPage.tsx src/features/activities/ActivityDetailScreen.tsx
git commit -m "Use areas for scheduling availability"
```

### Task 6: Generate Area From AI Fill Details

**Files:**
- Modify: `src/services/ai.ts`
- Modify: `src/services/ai.activityEnrichment.test.ts`
- Modify: `src/features/activities/useQuickAddDockController.ts`
- Modify: `src/features/activities/useQuickAddDockController.test.ts`

- [ ] **Step 1: Write failing prompt tests**

In `src/services/ai.activityEnrichment.test.ts`, add:

```ts
it('requests areaId when details are selected', () => {
  const prompt = buildActivityEnrichmentSystemPrompt(['details']);

  expect(prompt).toContain('areaId');
  expect(prompt).toContain('Choose areaId only from Candidate areas');
});

it('omits areaId when details are not selected', () => {
  const prompt = buildActivityEnrichmentSystemPrompt(['steps']);

  expect(prompt).toContain('details is not requested: omit notes, tags, goalId, areaId');
});
```

- [ ] **Step 2: Write failing quick-add application tests**

In `src/features/activities/useQuickAddDockController.test.ts`, add `areaId` to the `enrichment` fixture:

```ts
  areaId: 'area-work',
```

In `fills all details when Details is selected`, assert:

```ts
    expect(result.areaId).toBe('area-work');
```

In `applies only the selected AI actions`, assert:

```ts
    expect(result.areaId).toBeUndefined();
```

Add:

```ts
  it('does not overwrite an existing area when Fill details runs', () => {
    const result = applyQuickAddAiEnrichment(baseActivity({ areaId: 'area-family' }), enrichment, {
      activityId: 'activity-1',
      selectedActions: ['details'],
      timestamp: '2026-05-13T12:00:00.000Z',
    });

    expect(result.areaId).toBe('area-family');
  });
```

- [ ] **Step 3: Run tests to verify failure**

Run:

```bash
npm test -- src/services/ai.activityEnrichment.test.ts src/features/activities/useQuickAddDockController.test.ts --runInBand
```

Expected: FAIL because prompt/schema/application do not include `areaId`.

- [ ] **Step 4: Update AI enrichment type and prompt**

In `src/services/ai.ts`, extend `ActivityAiEnrichment` if defined in this file:

```ts
  areaId?: string | null;
```

In `buildActivityEnrichmentSystemPrompt`, change the details line:

```ts
? '- details: add notes, tags, goalId, areaId, type, estimateMinutes, priority, or difficulty when useful.\n'
: '- details is not requested: omit notes, tags, goalId, areaId, type, estimateMinutes, priority, and difficulty unless needed to satisfy another requested action.\n'
```

Add:

```ts
    '- areaId: choose one id from Candidate areas only if the to-do clearly belongs to that area; otherwise omit or null.\n' +
    '- Choose areaId only from Candidate areas. Do not invent areas.\n' +
```

- [ ] **Step 5: Include candidate Areas in AI user prompt and schema**

Inside `enrichActivityWithAI`, after `goalCandidates`, add:

```ts
    const areaCandidates =
      state?.activityAreas
        ?.filter((area) => !area.archivedAt && typeof area.id === 'string' && typeof area.label === 'string')
        .slice(0, 20)
        .map((area) => ({ id: area.id, label: area.label })) ?? [];
    const validAreaIds = new Set(areaCandidates.map((area) => area.id));
```

In `userPrompt`, add:

```ts
      areaCandidates.length > 0
        ? [
            'Candidate areas for life-domain assignment (choose areaId only from this list):',
            ...areaCandidates.map((area) => `- ${area.id}: ${area.label}`),
          ].join('\n')
        : 'Candidate areas for life-domain assignment: (none)',
```

In the JSON schema properties, add:

```ts
              areaId: { type: ['string', 'null'] },
```

In normalization, after `goalId` normalization:

```ts
    if (typeof (parsed as any).areaId === 'string' && validAreaIds.has((parsed as any).areaId)) {
      normalized.areaId = (parsed as any).areaId;
    } else if ((parsed as any).areaId === null) {
      normalized.areaId = null;
    }
```

- [ ] **Step 6: Apply Area in quick-add enrichment details**

In `src/features/activities/useQuickAddDockController.ts`, inside `if (selectedActions.has('details'))`, add after `goalId`:

```ts
    if (enrichment.areaId && !activity.areaId) {
      updates.areaId = enrichment.areaId;
    }
```

- [ ] **Step 7: Run focused tests**

Run:

```bash
npm test -- src/services/ai.activityEnrichment.test.ts src/features/activities/useQuickAddDockController.test.ts --runInBand
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/services/ai.ts src/services/ai.activityEnrichment.test.ts src/features/activities/useQuickAddDockController.ts src/features/activities/useQuickAddDockController.test.ts
git commit -m "Generate areas from fill details"
```

### Task 7: Verification And Product Docs

**Files:**
- Modify: `docs/feature-briefs/activity-areas.md`
- Modify if generated: `docs/agent-code-map.md`

- [ ] **Step 1: Update feature brief implementation notes**

In `docs/feature-briefs/activity-areas.md`, under `### Activity assignment`, add:

```md
AI "Fill details" participates in Area assignment. When the `details` quick-add AI action is selected, enrichment may return `areaId` from the user's active Area list. Kwilt applies it only when the Activity has no existing Area, and the AI must not invent Area ids.
```

- [ ] **Step 2: Run product lint**

Run:

```bash
npm run product:lint
```

Expected: PASS with 0 warnings.

- [ ] **Step 3: Run changed verification**

Run:

```bash
npm run verify:changed -- --run
```

Expected: PASS. If `verify:changed` stalls on a docs-only or no-related-tests path, rerun the specific failing Jest command with `--passWithNoTests` and record the reason in the final handoff.

- [ ] **Step 4: Manual QA checklist**

Use a local build or simulator/device:

```text
1. Open Settings > Areas.
2. Confirm defaults: Work, Personal, Family, Home, Health.
3. Add Church.
4. Rename Church to Church / Service.
5. Archive Church / Service.
6. Create a to-do with Quick Add and leave Area unset.
7. Open Activity detail and set Area to Work.
8. Open Schedule for that Activity and confirm suggestions prefer work windows.
9. Create a quick-add to-do with AI actions > Fill details enabled.
10. Use a clear title like "Review client roadmap before sync".
11. Confirm AI enrichment can set Area to Work.
12. Repeat with Fill details disabled and confirm Area is not populated by AI enrichment.
```

- [ ] **Step 5: Commit verification/docs**

```bash
git add docs/feature-briefs/activity-areas.md docs/agent-code-map.md
git commit -m "Document activity areas implementation"
```

## Self-Review

- Spec coverage:
  - Settings-managed Areas: Tasks 2-3.
  - Intelligent defaults: Tasks 1-2.
  - Optional Activity Area: Task 4.
  - Area-aware scheduling setup/placement: Task 5.
  - AI Fill details generates Area: Task 6.
  - Capture remains unblocked: Tasks 4 and 6 only apply optional fields.
  - No Area grouping: explicit non-goal, no implementation task.
- Placeholder scan:
  - No placeholder markers, generic "add tests", or undefined implementation concepts remain.
- Type consistency:
  - User-facing field is `Area`; code uses `areaId` and `ActivityArea`.
  - `schedulingDomain` remains compatibility plumbing.
  - AI enrichment uses existing `details` action / "Fill details" toggle.
