import type { Activity, ActivityStep } from './types';

function hashString(input: string): string {
  // Small deterministic hash (djb2-ish) to stabilize generated IDs across devices/sessions.
  let hash = 5381;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 33) ^ input.charCodeAt(i);
  }
  // Unsigned + base36 for compactness.
  return (hash >>> 0).toString(36);
}

function buildFallbackStepId(activityId: string, index: number, title: string): string {
  const safeActivityId = String(activityId || 'activity').trim() || 'activity';
  const safeTitle = String(title || '').trim();
  return `step-${safeActivityId}-${index}-${hashString(safeTitle)}`;
}

export function normalizeActivitySteps(params: {
  activityId: string;
  steps: unknown;
  nowIso: string;
}): { steps: ActivityStep[]; changed: boolean } {
  const { activityId, steps, nowIso } = params;
  if (!Array.isArray(steps)) return { steps: [], changed: steps != null };

  let changed = false;
  const seenIds = new Set<string>();

  const nextSteps: ActivityStep[] = steps.map((raw, index) => {
    const obj = raw && typeof raw === 'object' ? (raw as any) : null;
    const title = typeof obj?.title === 'string' ? obj.title : String(obj?.title ?? '');
    const rawId = typeof obj?.id === 'string' ? obj.id.trim() : '';

    let id = rawId;
    if (!id || seenIds.has(id)) {
      id = buildFallbackStepId(activityId, index, title);
      changed = true;
    }
    seenIds.add(id);

    const base: ActivityStep = {
      id,
      title,
    };

    if (obj) {
      if ('linkedActivityId' in obj) (base as any).linkedActivityId = obj.linkedActivityId;
      if ('linkedAt' in obj) (base as any).linkedAt = obj.linkedAt;
      if ('isOptional' in obj) (base as any).isOptional = Boolean(obj.isOptional);
      if ('completedAt' in obj) (base as any).completedAt = obj.completedAt ?? null;
      if ('orderIndex' in obj) (base as any).orderIndex = obj.orderIndex;
    }

    // If we had to coerce a non-object into a step object, treat it as a change.
    if (!obj) changed = true;

    return base;
  });

  // If we generated ids based on index + title, but the original list had duplicates,
  // we may still collide in pathological cases (same title, same index is impossible),
  // so no additional de-dupe pass is needed.

  // When a repair happens, callers typically want to bump the parent Activity.updatedAt
  // so sync merges propagate the fix across devices.
  void nowIso;
  return { steps: nextSteps, changed };
}

export function normalizeActivity(params: { activity: Activity; nowIso: string }): Activity {
  const { activity, nowIso } = params;
  const normalized = normalizeActivitySteps({ activityId: activity.id, steps: activity.steps, nowIso });
  if (!normalized.changed) return activity;
  return {
    ...activity,
    steps: normalized.steps,
    updatedAt: nowIso,
  };
}


