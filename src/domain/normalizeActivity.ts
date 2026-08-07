import type {
  Activity,
  ActivityActionCardBinding,
  ActivityActionCardProviderId,
  ActivityPriorityRankSource,
  ActivityPriorityReasonCode,
  ActivityPriorityState,
  ActivityStep,
  ActivitySourceReference,
} from './types';

const PRIORITY_STATES = new Set<ActivityPriorityState>(['active', 'later', 'waiting', 'needs_review']);
const PRIORITY_RANK_SOURCES = new Set<ActivityPriorityRankSource>(['inferred', 'auto', 'manual']);
const PRIORITY_REASON_CODES = new Set<ActivityPriorityReasonCode>([
  'explicit_priority',
  'goal_priority',
  'due_today',
  'due_soon',
  'reminder_soon',
  'scheduled_later',
  'recently_updated',
  'started',
  'has_steps',
  'context_errands',
  'context_location',
  'context_surface',
  'unanchored',
  'later',
  'waiting',
  'needs_review',
  'moved_by_user',
]);

const MAX_SOURCE_REFERENCES = 3;

function boundedString(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : null;
}

function optionalBoundedString(value: unknown, maxLength: number): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return boundedString(value, maxLength);
}

function validIso(value: unknown): string | null {
  const bounded = boundedString(value, 64);
  return bounded && Number.isFinite(Date.parse(bounded)) ? bounded : null;
}

export function normalizeActivityContext(value: unknown): {
  sourceReferences: ActivitySourceReference[];
  actionCardBinding: ActivityActionCardBinding | null;
} {
  const object = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const rawSources = Array.isArray(object.sourceReferences) ? object.sourceReferences : [];
  const sourceReferences: ActivitySourceReference[] = [];
  for (const raw of rawSources) {
    if (sourceReferences.length >= MAX_SOURCE_REFERENCES) break;
    if (!raw || typeof raw !== 'object') continue;
    const source = raw as Record<string, unknown>;
    const snapshot = source.snapshot && typeof source.snapshot === 'object'
      ? source.snapshot as Record<string, unknown>
      : null;
    const id = boundedString(source.id, 128);
    const providerId = boundedString(source.providerId, 80);
    const resourceKind = boundedString(source.resourceKind, 80);
    const resourceRef = boundedString(source.resourceRef, 512);
    const capturedAt = validIso(source.capturedAt);
    const providerLabel = snapshot ? boundedString(snapshot.providerLabel, 120) : null;
    const reason = snapshot ? boundedString(snapshot.reason, 240) : null;
    if (!id || !providerId || !resourceKind || !resourceRef || !capturedAt || !providerLabel || !reason) continue;
    sourceReferences.push({
      id,
      providerId: providerId as ActivityActionCardProviderId,
      resourceKind,
      resourceRef,
      capturedAt,
      snapshot: {
        providerLabel,
        sourceLabel: optionalBoundedString(snapshot?.sourceLabel, 120),
        reason,
        occurredAt: snapshot?.occurredAt == null ? optionalBoundedString(snapshot?.occurredAt, 64) : validIso(snapshot.occurredAt),
      },
    });
  }

  const rawBinding = object.actionCardBinding && typeof object.actionCardBinding === 'object'
    ? object.actionCardBinding as Record<string, unknown>
    : null;
  const providerId = boundedString(rawBinding?.providerId, 80);
  const projectionKind = boundedString(rawBinding?.projectionKind, 80);
  const resourceRef = boundedString(rawBinding?.resourceRef, 512);
  const rawSourceVersion = rawBinding?.sourceVersion;
  const sourceVersion = rawSourceVersion === null ? null : boundedString(rawSourceVersion, 128);
  const actionCardBinding = providerId && projectionKind && resourceRef && (sourceVersion !== null || rawSourceVersion === null)
    ? { providerId: providerId as ActivityActionCardProviderId, projectionKind, resourceRef, sourceVersion }
    : null;
  return { sourceReferences, actionCardBinding };
}

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
  const priorityState = PRIORITY_STATES.has((activity as any).priorityState)
    ? activity.priorityState
    : undefined;
  const priorityRankSource = PRIORITY_RANK_SOURCES.has((activity as any).priorityRankSource)
    ? activity.priorityRankSource
    : undefined;
  const priorityReasonCodes = Array.isArray(activity.priorityReasonCodes)
    ? activity.priorityReasonCodes.filter((code) => PRIORITY_REASON_CODES.has(code))
    : undefined;
  const priorityReasonCodesChanged =
    Array.isArray(activity.priorityReasonCodes) &&
    (priorityReasonCodes?.length !== activity.priorityReasonCodes.length ||
      priorityReasonCodes.some((code, index) => code !== activity.priorityReasonCodes?.[index]));
  const priorityRankKey =
    typeof activity.priorityRankKey === 'string' || activity.priorityRankKey === null
      ? activity.priorityRankKey
      : undefined;
  const priorityChanged =
    priorityState !== activity.priorityState ||
    priorityRankSource !== activity.priorityRankSource ||
    priorityRankKey !== activity.priorityRankKey ||
    priorityReasonCodesChanged;
  const hasContext = Object.prototype.hasOwnProperty.call(activity, 'sourceReferences') ||
    Object.prototype.hasOwnProperty.call(activity, 'actionCardBinding');
  const normalizedContext = hasContext ? normalizeActivityContext(activity) : null;
  const contextChanged = Boolean(normalizedContext) && (
    JSON.stringify(activity.sourceReferences ?? []) !== JSON.stringify(normalizedContext?.sourceReferences) ||
    JSON.stringify(activity.actionCardBinding ?? null) !== JSON.stringify(normalizedContext?.actionCardBinding)
  );

  if (!normalized.changed && !priorityChanged && !contextChanged) return activity;
  return {
    ...activity,
    steps: normalized.steps,
    priorityState,
    priorityRankKey,
    priorityRankSource,
    priorityReasonCodes,
    ...(normalizedContext ? normalizedContext : {}),
    updatedAt: nowIso,
  };
}
