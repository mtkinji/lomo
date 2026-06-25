# Goal Area Rollups Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Derive Areas for Goals from their child to-dos and use those rollups as calm inference context for future to-do Area suggestions, without adding editable Goal Areas.

**Architecture:** Activity `areaId` remains the source of truth. A pure domain helper computes Goal Area rollups from child Activities and active/archived Area definitions. AI enrichment uses the rollup to prioritize candidate Areas when filling details for a to-do under a Goal; Goal UI may show a read-only "Areas showing up here" cue, but no `Goal.areaIds` field or migration is introduced.

**Tech Stack:** React Native / Expo SDK 54, TypeScript, Zustand store data, Jest, existing Activity Area helpers, existing OpenAI JSON-schema enrichment path.

---

## Product Decision

Ship the opinionated model:

- Activity Area is source of truth.
- Goal Areas are derived from child to-dos.
- Vectors remain intentional meaning on Goals.
- Goal Area rollups are read-only and inference-oriented.
- Do not add `Goal.areaIds`.
- Do not add editable Goal Area multi-select.
- Do not block capture or to-do creation when no Area can be inferred.

## File Structure

- Modify `src/domain/activityAreas.ts`
  - Add `ActivityAreaRollup` and pure rollup helpers.
- Modify `src/domain/activityAreas.test.ts`
  - Add regression tests for derived Goal Area rollups, archived Area resolution, sorting, and no-data behavior.
- Modify `src/services/ai.ts`
  - Use Goal Area rollups to prioritize `areaId` candidates in `enrichActivityWithAI`.
  - Include a short "Observed areas already showing up on this goal" section in the user prompt when applicable.
- Modify `src/services/ai.activityEnrichment.test.ts`
  - Add prompt/candidate tests around Goal Area rollup context.
- Create `src/features/goals/GoalAreaRollupSummary.tsx`
  - Small read-only presentation component for Goal Detail / Goal creation surfaces if there are rollups.
- Create `src/features/goals/GoalAreaRollupSummary.test.tsx`
  - Render tests for hidden-empty, sorted chips, and max display.
- Modify `src/features/arcs/GoalDetailScreen.tsx`
  - Compute rollups for the current Goal and render the read-only summary near the Goal detail metadata.
- Modify `docs/design-explorations/areas-vectors-reconciliation/00-frame.md`
  - Add a short decision note: Goal Areas are derived rollups for now.
- Modify `docs/feature-briefs/activity-areas.md`
  - Add a short note that Goal-level Area context is derived from child Activities and may inform AI suggestions.

## Task 1: Domain Rollup Helper

**Files:**
- Modify: `src/domain/activityAreas.ts`
- Modify: `src/domain/activityAreas.test.ts`

- [ ] **Step 1: Write failing rollup tests**

Add these imports to `src/domain/activityAreas.test.ts`:

```ts
import type { Activity } from './types';
```

Extend the existing import from `./activityAreas`:

```ts
import {
  DEFAULT_ACTIVITY_AREAS,
  deriveGoalAreaRollups,
  findActivityAreaById,
  normalizeActivityAreas,
  resolveActivityAreaFallbackMode,
} from './activityAreas';
```

Add this helper below the imports:

```ts
function activity(overrides: Partial<Activity>): Activity {
  return {
    id: overrides.id ?? 'activity-1',
    goalId: overrides.goalId ?? 'goal-1',
    title: overrides.title ?? 'Activity',
    type: 'task',
    tags: [],
    status: 'planned',
    forceActual: {},
    createdAt: overrides.createdAt ?? '2026-06-01T12:00:00.000Z',
    updatedAt: overrides.updatedAt ?? '2026-06-01T12:00:00.000Z',
    reminderAt: null,
    repeatRule: undefined,
    repeatCustom: undefined,
    scheduledDate: null,
    scheduledAt: null,
    estimateMinutes: null,
    areaId: overrides.areaId ?? null,
    ...overrides,
  } as Activity;
}
```

Add this `describe` block at the end of the file:

```ts
describe('deriveGoalAreaRollups', () => {
  it('rolls up child activity Areas for one Goal', () => {
    const areas = normalizeActivityAreas(undefined);
    const rollups = deriveGoalAreaRollups({
      goalId: 'goal-1',
      activities: [
        activity({ id: 'a1', goalId: 'goal-1', areaId: 'area-home', updatedAt: '2026-06-10T12:00:00.000Z' }),
        activity({ id: 'a2', goalId: 'goal-1', areaId: 'area-home', updatedAt: '2026-06-11T12:00:00.000Z' }),
        activity({ id: 'a3', goalId: 'goal-1', areaId: 'area-family', updatedAt: '2026-06-12T12:00:00.000Z' }),
        activity({ id: 'a4', goalId: 'goal-2', areaId: 'area-work', updatedAt: '2026-06-13T12:00:00.000Z' }),
      ],
      areas,
    });

    expect(rollups.map((rollup) => ({ id: rollup.area.id, count: rollup.count }))).toEqual([
      { id: 'area-home', count: 2 },
      { id: 'area-family', count: 1 },
    ]);
    expect(rollups[0]?.latestActivityAt).toBe('2026-06-11T12:00:00.000Z');
  });

  it('keeps archived Areas resolvable for old goal to-dos', () => {
    const areas = normalizeActivityAreas([
      {
        id: 'area-church',
        label: 'Church',
        order: 0,
        archivedAt: '2026-06-20T12:00:00.000Z',
        scheduling: { fallbackMode: 'personal' },
      },
    ]);

    const rollups = deriveGoalAreaRollups({
      goalId: 'goal-1',
      activities: [activity({ areaId: 'area-church' })],
      areas,
    });

    expect(rollups).toHaveLength(1);
    expect(rollups[0]?.area.label).toBe('Church');
    expect(rollups[0]?.isArchived).toBe(true);
  });

  it('returns an empty rollup when the goal has no assigned Activity Areas', () => {
    const rollups = deriveGoalAreaRollups({
      goalId: 'goal-1',
      activities: [
        activity({ id: 'a1', goalId: 'goal-1', areaId: null }),
        activity({ id: 'a2', goalId: 'goal-2', areaId: 'area-work' }),
      ],
      areas: normalizeActivityAreas(undefined),
    });

    expect(rollups).toEqual([]);
  });

  it('limits results after sorting by count and recency', () => {
    const rollups = deriveGoalAreaRollups({
      goalId: 'goal-1',
      activities: [
        activity({ id: 'a1', areaId: 'area-family', updatedAt: '2026-06-10T12:00:00.000Z' }),
        activity({ id: 'a2', areaId: 'area-home', updatedAt: '2026-06-11T12:00:00.000Z' }),
        activity({ id: 'a3', areaId: 'area-health', updatedAt: '2026-06-12T12:00:00.000Z' }),
      ],
      areas: normalizeActivityAreas(undefined),
      limit: 2,
    });

    expect(rollups.map((rollup) => rollup.area.id)).toEqual(['area-health', 'area-home']);
  });
});
```

- [ ] **Step 2: Run the failing domain test**

Run:

```bash
npm test -- src/domain/activityAreas.test.ts --runInBand
```

Expected: FAIL because `deriveGoalAreaRollups` is not exported.

- [ ] **Step 3: Add rollup types and helper**

In `src/domain/activityAreas.ts`, change the import:

```ts
import type { Activity, ActivityArea, ActivityAreaFallbackMode } from './types';
```

Add this type after `DEFAULT_ACTIVITY_AREAS`:

```ts
export type ActivityAreaRollup = {
  area: ActivityArea;
  count: number;
  latestActivityAt: string | null;
  isArchived: boolean;
};
```

Add this helper after `resolveActivityAreaFallbackMode`:

```ts
export function deriveGoalAreaRollups(params: {
  goalId: string | null | undefined;
  activities: Activity[];
  areas: ActivityArea[];
  limit?: number;
}): ActivityAreaRollup[] {
  const goalId = params.goalId?.trim();
  if (!goalId) return [];

  const byAreaId = new Map<string, { count: number; latestActivityAt: string | null }>();
  for (const activity of params.activities) {
    if (activity.goalId !== goalId) continue;
    const areaId = typeof activity.areaId === 'string' ? activity.areaId.trim() : '';
    if (!areaId) continue;
    const previous = byAreaId.get(areaId) ?? { count: 0, latestActivityAt: null };
    const updatedAt = typeof activity.updatedAt === 'string' && activity.updatedAt.length > 0 ? activity.updatedAt : null;
    const latestActivityAt =
      previous.latestActivityAt && updatedAt
        ? previous.latestActivityAt > updatedAt
          ? previous.latestActivityAt
          : updatedAt
        : previous.latestActivityAt ?? updatedAt;
    byAreaId.set(areaId, {
      count: previous.count + 1,
      latestActivityAt,
    });
  }

  const rollups: ActivityAreaRollup[] = [];
  byAreaId.forEach((value, areaId) => {
    const area = findActivityAreaById(params.areas, areaId);
    if (!area) return;
    rollups.push({
      area,
      count: value.count,
      latestActivityAt: value.latestActivityAt,
      isArchived: Boolean(area.archivedAt),
    });
  });

  const sorted = rollups.sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    const bTime = b.latestActivityAt ?? '';
    const aTime = a.latestActivityAt ?? '';
    if (bTime !== aTime) return bTime.localeCompare(aTime);
    return a.area.order - b.area.order || a.area.label.localeCompare(b.area.label);
  });

  return sorted.slice(0, Math.max(0, params.limit ?? sorted.length));
}
```

- [ ] **Step 4: Run the domain test**

Run:

```bash
npm test -- src/domain/activityAreas.test.ts --runInBand
```

Expected: PASS.

## Task 2: AI Enrichment Uses Goal Area Rollups

**Files:**
- Modify: `src/services/ai.ts`
- Modify: `src/services/ai.activityEnrichment.test.ts`

- [ ] **Step 1: Export a pure candidate builder for tests**

In `src/services/ai.ts`, update the Area helper import:

```ts
import { deriveGoalAreaRollups, getActiveActivityAreas } from '../domain/activityAreas';
```

Add this exported helper near `buildActivityEnrichmentSystemPrompt`:

```ts
export type ActivityAreaPromptCandidate = {
  id: string;
  label: string;
  observedCount?: number;
};

export function buildActivityAreaPromptCandidates(params: {
  goalId: string | null;
  activities: Array<{ goalId?: string | null; areaId?: string | null; updatedAt?: string | null }>;
  areas: Array<{ id: string; label: string; order: number; archivedAt?: string | null }>;
  limit?: number;
}): ActivityAreaPromptCandidate[] {
  const activeAreas = getActiveActivityAreas(params.areas as any);
  const rollups = deriveGoalAreaRollups({
    goalId: params.goalId,
    activities: params.activities as any,
    areas: params.areas as any,
    limit: params.limit,
  }).filter((rollup) => !rollup.isArchived);
  const seen = new Set<string>();
  const candidates: ActivityAreaPromptCandidate[] = [];

  for (const rollup of rollups) {
    seen.add(rollup.area.id);
    candidates.push({
      id: rollup.area.id,
      label: rollup.area.label.trim(),
      observedCount: rollup.count,
    });
  }

  for (const area of activeAreas) {
    if (seen.has(area.id)) continue;
    candidates.push({
      id: area.id,
      label: area.label.trim(),
    });
    if (candidates.length >= (params.limit ?? 24)) break;
  }

  return candidates.slice(0, params.limit ?? 24);
}
```

- [ ] **Step 2: Write failing AI candidate tests**

In `src/services/ai.activityEnrichment.test.ts`, extend the import:

```ts
import {
  buildActivityAreaPromptCandidates,
  buildActivityEnrichmentSystemPrompt,
  normalizeActivityAiEnrichmentActions,
} from './ai';
```

Add this test block before `describe('normalizeActivityAiEnrichmentActions', ...)`:

```ts
describe('buildActivityAreaPromptCandidates', () => {
  const areas = [
    { id: 'area-work', label: 'Work', order: 0 },
    { id: 'area-home', label: 'Home', order: 1 },
    { id: 'area-family', label: 'Family', order: 2 },
    { id: 'area-health', label: 'Health', order: 3 },
  ];

  it('prioritizes Areas already showing up on the linked Goal', () => {
    const candidates = buildActivityAreaPromptCandidates({
      goalId: 'goal-1',
      areas,
      activities: [
        { goalId: 'goal-1', areaId: 'area-family', updatedAt: '2026-06-10T12:00:00.000Z' },
        { goalId: 'goal-1', areaId: 'area-family', updatedAt: '2026-06-11T12:00:00.000Z' },
        { goalId: 'goal-1', areaId: 'area-home', updatedAt: '2026-06-12T12:00:00.000Z' },
      ],
      limit: 4,
    });

    expect(candidates.slice(0, 2)).toEqual([
      { id: 'area-family', label: 'Family', observedCount: 2 },
      { id: 'area-home', label: 'Home', observedCount: 1 },
    ]);
    expect(candidates.map((candidate) => candidate.id)).toContain('area-work');
  });

  it('falls back to active Areas when the Goal has no observed Areas', () => {
    const candidates = buildActivityAreaPromptCandidates({
      goalId: 'goal-empty',
      areas,
      activities: [{ goalId: 'goal-1', areaId: 'area-family' }],
      limit: 2,
    });

    expect(candidates).toEqual([
      { id: 'area-work', label: 'Work' },
      { id: 'area-home', label: 'Home' },
    ]);
  });
});
```

Run:

```bash
npm test -- src/services/ai.activityEnrichment.test.ts --runInBand
```

Expected: FAIL until the helper export is implemented.

- [ ] **Step 3: Replace flat Area candidate construction in `enrichActivityWithAI`**

In `src/services/ai.ts`, replace:

```ts
    const areaCandidates =
      includeDetails && state?.activityAreas
        ? getActiveActivityAreas(state.activityAreas)
            .filter((area) => typeof area.id === 'string' && typeof area.label === 'string' && area.label.trim().length > 0)
            .slice(0, 24)
            .map((area) => ({ id: area.id, label: area.label.trim() }))
        : [];
```

with:

```ts
    const areaCandidates =
      includeDetails && state?.activityAreas
        ? buildActivityAreaPromptCandidates({
            goalId: params.goalId ?? null,
            activities: state.activities ?? [],
            areas: state.activityAreas,
            limit: 24,
          })
        : [];
```

- [ ] **Step 4: Add observed rollup prompt copy**

In the `userPrompt` array in `src/services/ai.ts`, immediately after the existing `Candidate areas for areaId` block, add:

```ts
      areaCandidates.some((area) => typeof area.observedCount === 'number')
        ? [
            'Observed areas already showing up on this goal:',
            ...areaCandidates
              .filter((area) => typeof area.observedCount === 'number')
              .map((area) => `- ${area.id}: ${area.label} (${area.observedCount} to-do${area.observedCount === 1 ? '' : 's'})`),
          ].join('\n')
        : 'Observed areas already showing up on this goal: (none)',
```

- [ ] **Step 5: Run AI tests**

Run:

```bash
npm test -- src/services/ai.activityEnrichment.test.ts --runInBand
```

Expected: PASS.

## Task 3: Read-Only Goal Area Rollup Summary UI

**Files:**
- Create: `src/features/goals/GoalAreaRollupSummary.tsx`
- Create: `src/features/goals/GoalAreaRollupSummary.test.tsx`
- Modify: `src/features/arcs/GoalDetailScreen.tsx`

- [ ] **Step 1: Create the presentation component**

Create `src/features/goals/GoalAreaRollupSummary.tsx`:

```tsx
import * as React from 'react';
import { StyleSheet } from 'react-native';
import type { ActivityAreaRollup } from '../../domain/activityAreas';
import { colors, spacing, typography } from '../../theme';
import { Badge } from '../../ui/Badge';
import { Icon } from '../../ui/Icon';
import { HStack, Text, VStack } from '../../ui/primitives';
import { getActivityAreaIcon } from '../activities/activityAreaIcons';

type Props = {
  rollups: ActivityAreaRollup[];
  maxVisible?: number;
};

export function GoalAreaRollupSummary({ rollups, maxVisible = 3 }: Props) {
  const visible = rollups.filter((rollup) => !rollup.isArchived).slice(0, maxVisible);
  if (visible.length === 0) return null;

  const hiddenCount = Math.max(0, rollups.filter((rollup) => !rollup.isArchived).length - visible.length);

  return (
    <VStack space="xs" style={styles.container}>
      <Text style={styles.label}>Areas showing up here</Text>
      <HStack space="xs" style={styles.chipRow}>
        {visible.map((rollup) => (
          <Badge key={rollup.area.id} variant="muted" style={styles.badge}>
            <HStack space="xs" alignItems="center">
              <Icon name={getActivityAreaIcon(rollup.area)} size={13} color={colors.textSecondary} />
              <Text style={styles.badgeText}>{rollup.area.label}</Text>
              <Text style={styles.countText}>{rollup.count}</Text>
            </HStack>
          </Badge>
        ))}
        {hiddenCount > 0 ? (
          <Badge variant="muted" style={styles.badge}>
            <Text style={styles.badgeText}>+{hiddenCount}</Text>
          </Badge>
        ) : null}
      </HStack>
    </VStack>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.md,
  },
  label: {
    ...typography.caption,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0,
  },
  chipRow: {
    flexWrap: 'wrap',
  },
  badge: {
    marginBottom: spacing.xs,
  },
  badgeText: {
    ...typography.caption,
    color: colors.textPrimary,
  },
  countText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});
```

- [ ] **Step 2: Write render tests**

Create `src/features/goals/GoalAreaRollupSummary.test.tsx`:

```tsx
import React from 'react';
import { renderWithProviders } from '../../test/renderWithProviders';
import { GoalAreaRollupSummary } from './GoalAreaRollupSummary';

describe('GoalAreaRollupSummary', () => {
  const rollups = [
    {
      area: { id: 'area-home', label: 'Home', order: 0 },
      count: 3,
      latestActivityAt: '2026-06-12T12:00:00.000Z',
      isArchived: false,
    },
    {
      area: { id: 'area-family', label: 'Family', order: 1 },
      count: 2,
      latestActivityAt: '2026-06-11T12:00:00.000Z',
      isArchived: false,
    },
  ];

  it('renders nothing with no active rollups', () => {
    const { queryByText } = renderWithProviders(<GoalAreaRollupSummary rollups={[]} />);

    expect(queryByText('Areas showing up here')).toBeNull();
  });

  it('renders active rollup labels and counts', () => {
    const { getByText } = renderWithProviders(<GoalAreaRollupSummary rollups={rollups} />);

    expect(getByText('Areas showing up here')).toBeTruthy();
    expect(getByText('Home')).toBeTruthy();
    expect(getByText('3')).toBeTruthy();
    expect(getByText('Family')).toBeTruthy();
    expect(getByText('2')).toBeTruthy();
  });

  it('summarizes hidden active rollups', () => {
    const { getByText, queryByText } = renderWithProviders(
      <GoalAreaRollupSummary
        maxVisible={1}
        rollups={[
          ...rollups,
          {
            area: { id: 'area-health', label: 'Health', order: 2 },
            count: 1,
            latestActivityAt: '2026-06-10T12:00:00.000Z',
            isArchived: false,
          },
        ]}
      />,
    );

    expect(getByText('Home')).toBeTruthy();
    expect(getByText('+2')).toBeTruthy();
    expect(queryByText('Family')).toBeNull();
  });
});
```

Run:

```bash
npm test -- src/features/goals/GoalAreaRollupSummary.test.tsx --runInBand
```

Expected: PASS once the component exists.

- [ ] **Step 3: Render rollup summary in Goal Detail**

In `src/features/arcs/GoalDetailScreen.tsx`, add imports:

```ts
import { deriveGoalAreaRollups } from '../../domain/activityAreas';
import { GoalAreaRollupSummary } from '../goals/GoalAreaRollupSummary';
```

In the main `GoalDetailScreen` component, add the store selector near the existing `activities`, `goals`, and `arcs` selectors:

```ts
  const activityAreas = useAppStore((state) => state.activityAreas);
```

In the main `GoalDetailScreen` component, compute the rollups after `goal` is resolved:

```ts
  const goalAreaRollups = useMemo(
    () =>
      deriveGoalAreaRollups({
        goalId: goal?.id ?? goalId,
        activities,
        areas: activityAreas,
        limit: 4,
      }),
    [activities, activityAreas, goal?.id, goalId],
  );
```

Render the summary in the Details section near the current Vectors block, before "Vectors for this goal":

```tsx
                  <GoalAreaRollupSummary rollups={goalAreaRollups} />
```

Do not add an edit button, picker, or `Goal.areaIds`.

- [ ] **Step 4: Run Goal UI tests and typecheck**

Run:

```bash
npm test -- src/features/goals/GoalAreaRollupSummary.test.tsx --runInBand
npm run lint
```

Expected: both PASS.

## Task 4: Use Rollups In Local To-Do Creation Defaults Only When Unambiguous

**Files:**
- Modify: `src/features/arcs/GoalDetailScreen.tsx`

- [ ] **Step 1: Compute rollups inside `GoalActivityCoachDrawer`**

Inside `GoalActivityCoachDrawer`, after `focusGoal` is computed, add:

```ts
  const goalAreaRollups = useMemo(
    () =>
      deriveGoalAreaRollups({
        goalId: focusGoalId,
        activities,
        areas: activityAreas,
        limit: 4,
      }),
    [activities, activityAreas, focusGoalId],
  );
```

- [ ] **Step 2: Add a local helper to choose a default Area**

Inside `GoalActivityCoachDrawer`, immediately after `goalAreaRollups`, add:

```ts
  const unambiguousGoalAreaId = useMemo(() => {
    const activeRollups = goalAreaRollups.filter((rollup) => !rollup.isArchived);
    if (activeRollups.length !== 1) return null;
    return activeRollups[0]?.area.id ?? null;
  }, [goalAreaRollups]);
```

- [ ] **Step 3: Use it when resetting the manual activity draft**

In the `useEffect` inside `GoalActivityCoachDrawer` that resets `manualDraft` when `visible` is false, replace:

```ts
    areaId: null,
```

with:

```ts
    areaId: unambiguousGoalAreaId,
```

Update the effect dependency array from:

```ts
  }, [visible]);
```

to:

```ts
  }, [unambiguousGoalAreaId, visible]);
```

- [ ] **Step 4: Apply the default when switching into manual mode**

Replace `handleSwitchToManual` in `GoalActivityCoachDrawer`:

```ts
  const handleSwitchToManual = useCallback(() => {
    setActiveTab('manual');
  }, []);
```

with:

```ts
  const handleSwitchToManual = useCallback(() => {
    setActiveTab('manual');
    setManualDraft((current) => {
      const isUntouched =
        current.title.trim().length === 0 &&
        current.notes.trim().length === 0 &&
        current.steps.length === 0 &&
        current.tags.length === 0 &&
        current.areaId == null;
      if (!isUntouched) return current;
      return {
        ...current,
        areaId: unambiguousGoalAreaId,
      };
    });
  }, [unambiguousGoalAreaId]);
```

Do not apply this behavior to raw global Quick Add.

- [ ] **Step 5: Preserve user edits**

Ensure the `ActivityDraftDetailFields` Area picker can still set `manualDraft.areaId` to `null` or another Area. The create handler should continue to use:

```ts
areaId: manualDraft.areaId ?? null,
```

- [ ] **Step 6: Run typecheck**

Run:

```bash
npm run lint
```

Expected: PASS.

## Task 5: Docs And Product Model Notes

**Files:**
- Modify: `docs/design-explorations/areas-vectors-reconciliation/00-frame.md`
- Modify: `docs/feature-briefs/activity-areas.md`

- [ ] **Step 1: Add decision note to the design exploration frame**

Append this section to `docs/design-explorations/areas-vectors-reconciliation/00-frame.md`:

```md
## Interim Product Decision

Do not converge on a full Areas/Vectors redesign yet. For the next implementation slice:

- Activity Area remains the source of truth.
- Goal Areas are derived from child to-dos, not manually edited.
- Goal Area rollups can inform AI and defaulting when creating new to-dos under a Goal.
- Vectors remain Goal intent and Activity actuals; they are not replaced by Areas.
```

- [ ] **Step 2: Update Activity Areas feature brief**

Add this note near the AI / scheduling section of `docs/feature-briefs/activity-areas.md`:

```md
### Goal Area rollups

Goals do not own editable Areas in this slice. Instead, Kwilt derives "Areas showing up here" from the Areas assigned to child to-dos. The rollup can help AI infer the Area for future to-dos under the Goal, but the Activity's `areaId` remains the source of truth.
```

- [ ] **Step 3: Run product lint**

Run:

```bash
npm run product:lint
```

Expected: PASS.

## Task 6: Verification Pass

**Files:**
- All files touched by previous tasks.

- [ ] **Step 1: Run focused tests**

Run:

```bash
npm test -- src/domain/activityAreas.test.ts src/services/ai.activityEnrichment.test.ts src/features/goals/GoalAreaRollupSummary.test.tsx --runInBand
```

Expected: PASS.

- [ ] **Step 2: Run typecheck**

Run:

```bash
npm run lint
```

Expected: PASS.

- [ ] **Step 3: Run diff-aware verification**

Run:

```bash
npm run verify:changed -- --run
```

Expected: PASS. Existing architecture warnings about raw React Native `Text` imports may still appear; do not treat those as failures unless the command exits non-zero.

## Acceptance Criteria

- No `Goal.areaIds` field exists.
- No editable Goal Area multi-select exists.
- `deriveGoalAreaRollups` returns sorted, limited, archived-aware rollups from child Activities.
- AI `Fill details` receives Goal Area rollup context and prioritizes observed Areas before generic active Areas.
- Goal Detail can show a read-only "Areas showing up here" summary when child to-dos have Areas.
- New Goal-specific manual to-dos may default to an Area only when the Goal rollup is unambiguous.
- Activity Area remains the source of truth for scheduling.
- Vectors remain separate from Areas and continue to represent growth intent/actuals.
