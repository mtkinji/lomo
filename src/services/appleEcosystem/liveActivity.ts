import { NativeModules, Platform } from 'react-native';
import { nativeCrashErrorMessage, recordNativeCrashBreadcrumb } from '../nativeCrashBreadcrumbs';

type KwiltLiveActivityNativeModule = {
  start: (activityId: string, title: string, startedAtMs: number, endAtMs: number) => Promise<boolean>;
  update: (activityId: string, title: string, startedAtMs: number, endAtMs: number) => Promise<boolean>;
  sync?: (
    activityId: string,
    title: string,
    sessionId: string,
    mode: LiveActivityMode,
    startedAtMs: number,
    endAtMs: number,
    remainingMs: number,
    colorKey: string,
  ) => Promise<Partial<SyncLiveActivityResult> | null | undefined>;
  end: () => Promise<boolean>;
  getActiveFocusLiveActivities?: () => Promise<ActiveFocusLiveActivity[]>;
};

const native: KwiltLiveActivityNativeModule | undefined = (NativeModules as any)?.KwiltLiveActivity;

export type LiveActivityMode = 'running' | 'paused' | 'ended';

export type SyncLiveActivityResult = {
  action: 'started' | 'updated' | 'ended' | 'unsupported' | 'legacy-ended' | 'legacy-started' | 'legacy-updated' | 'failed';
  activeCount: number;
  staleEndedCount: number;
  sessionId: string;
};

export type ActiveFocusLiveActivity = {
  id: string;
  activityId: string;
  title: string;
  sessionId?: string;
  mode?: LiveActivityMode | string;
  startedAtMs: number;
  endAtMs: number;
  remainingMs?: number;
  colorKey?: string;
  activityState?: string;
};

function buildUnsupportedResult(sessionId: string): SyncLiveActivityResult {
  return {
    action: 'unsupported',
    activeCount: 0,
    staleEndedCount: 0,
    sessionId,
  };
}

function normalizeResult(
  raw: Partial<SyncLiveActivityResult> | null | undefined,
  sessionId: string,
): SyncLiveActivityResult {
  const action = raw?.action;
  return {
    action:
      action === 'started' ||
      action === 'updated' ||
      action === 'ended' ||
      action === 'unsupported' ||
      action === 'legacy-ended' ||
      action === 'legacy-started' ||
      action === 'legacy-updated' ||
      action === 'failed'
        ? action
        : 'unsupported',
    activeCount: typeof raw?.activeCount === 'number' ? raw.activeCount : 0,
    staleEndedCount: typeof raw?.staleEndedCount === 'number' ? raw.staleEndedCount : 0,
    sessionId: typeof raw?.sessionId === 'string' && raw.sessionId ? raw.sessionId : sessionId,
  };
}

export async function syncLiveActivity(params: {
  mode: LiveActivityMode;
  activityId: string;
  title: string;
  startedAtMs: number;
  endAtMs?: number;
  remainingMs?: number;
  colorKey?: string;
  sessionId?: string;
}): Promise<SyncLiveActivityResult> {
  const sessionId = params.sessionId ?? `${params.activityId}-${params.startedAtMs}`;
  if (Platform.OS !== 'ios') return buildUnsupportedResult(sessionId);
  if (!native) return buildUnsupportedResult(sessionId);
  const context = {
    activityId: params.activityId,
    sessionId,
    mode: params.mode,
    startedAtMs: params.startedAtMs,
    endAtMs: params.endAtMs ?? 0,
    remainingMs: params.remainingMs ?? 0,
    colorKey: params.colorKey ?? 'pine',
  };
  try {
    if (native.sync) {
      await recordLiveActivityBreadcrumb('sync', 'before', context);
      const raw = await native.sync(
        params.activityId,
        params.title,
        sessionId,
        params.mode,
        params.startedAtMs,
        params.endAtMs ?? 0,
        params.remainingMs ?? 0,
        params.colorKey ?? 'pine',
      );
      const result = normalizeResult(raw, sessionId);
      await recordLiveActivityBreadcrumb('sync', 'after', {
        ...context,
        action: result.action,
        activeCount: result.activeCount,
        staleEndedCount: result.staleEndedCount,
      });
      return result;
    }

    if (params.mode !== 'running') {
      await recordLiveActivityBreadcrumb('legacy.end', 'before', context);
      await native.end();
      await recordLiveActivityBreadcrumb('legacy.end', 'after', context);
      return {
        action: 'legacy-ended',
        activeCount: 0,
        staleEndedCount: 1,
        sessionId,
      };
    }

    const endAtMs = params.endAtMs ?? 0;
    // Best-effort: update first; if no activity exists, start.
    await recordLiveActivityBreadcrumb('legacy.update', 'before', context);
    const ok = await native.update(params.activityId, params.title, params.startedAtMs, endAtMs);
    await recordLiveActivityBreadcrumb('legacy.update', 'after', { ...context, updated: ok });
    if (!ok) {
      await recordLiveActivityBreadcrumb('legacy.start', 'before', context);
      await native.start(params.activityId, params.title, params.startedAtMs, endAtMs);
      await recordLiveActivityBreadcrumb('legacy.start', 'after', context);
      return {
        action: 'legacy-started',
        activeCount: 1,
        staleEndedCount: 0,
        sessionId,
      };
    }
    return {
      action: 'legacy-updated',
      activeCount: 1,
      staleEndedCount: 0,
      sessionId,
    };
  } catch (error) {
    await recordLiveActivityBreadcrumb('sync', 'error', context, error);
    // best-effort only
    return {
      action: 'failed',
      activeCount: 0,
      staleEndedCount: 0,
      sessionId,
    };
  }
}

export async function endLiveActivity(): Promise<void> {
  if (Platform.OS !== 'ios') return;
  if (!native) return;
  try {
    await recordLiveActivityBreadcrumb('end', 'before');
    await native.end();
    await recordLiveActivityBreadcrumb('end', 'after');
  } catch (error) {
    await recordLiveActivityBreadcrumb('end', 'error', undefined, error);
    // best-effort
  }
}

export async function getActiveFocusLiveActivities(): Promise<ActiveFocusLiveActivity[]> {
  if (Platform.OS !== 'ios') return [];
  if (!native?.getActiveFocusLiveActivities) return [];
  try {
    await recordLiveActivityBreadcrumb('getActiveFocusLiveActivities', 'before');
    const activities = await native.getActiveFocusLiveActivities();
    const normalized = Array.isArray(activities) ? activities : [];
    await recordLiveActivityBreadcrumb('getActiveFocusLiveActivities', 'after', {
      count: normalized.length,
    });
    return normalized;
  } catch (error) {
    await recordLiveActivityBreadcrumb('getActiveFocusLiveActivities', 'error', undefined, error);
    return [];
  }
}

async function recordLiveActivityBreadcrumb(
  operation: string,
  phase: 'before' | 'after' | 'error',
  context?: Record<string, unknown>,
  error?: unknown,
): Promise<void> {
  await recordNativeCrashBreadcrumb({
    area: 'focus.liveActivity',
    operation,
    phase,
    context,
    errorMessage: error === undefined ? undefined : nativeCrashErrorMessage(error),
  });
}
