import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert } from 'react-native';
import * as Notifications from 'expo-notifications';
import type { Activity } from '../../domain/types';
import { HapticsService } from '../../services/HapticsService';
import { nativeCrashErrorMessage, recordNativeCrashBreadcrumb } from '../../services/nativeCrashBreadcrumbs';
import { openPaywallInterstitial } from '../../services/paywall';
import { reconcileScreenTimeRestrictions } from '../../services/screenTimeProtectionRuntime';
import { preloadSoundscape, type SoundscapeId } from '../../services/soundscape';
import type { ActiveFocusSession } from './focusSessionLifecycle';
import { useFocusSessionStore } from './focusSessionStore';
import {
  buildFocusCustomMinuteOptions,
  clampFocusMinutes,
  FOCUS_PRESET_MINUTES,
  getRemainingFocusMs,
} from './focusSessionPresentation';

type ActivityFocusControllerProps = {
  activity: Activity | undefined;
  activityId: string;
  maxMinutes: number;
  lastFocusMinutes: number | null | undefined;
  soundscapeTrackId: SoundscapeId;
  setLastFocusMinutes: (minutes: number) => void;
  onOpen: () => void;
  onClose: () => void;
};

export type ActivityFocusController = {
  session: ActiveFocusSession | null;
  minutes: number;
  maxMinutes: number;
  presets: readonly number[];
  customOptions: number[];
  customExpanded: boolean;
  isCustomValue: boolean;
  remainingMs: number;
  open: () => void;
  close: () => void;
  setMinutes: (minutes: number) => void;
  setCustomExpanded: (expanded: boolean | ((current: boolean) => boolean)) => void;
  start: (overrideMinutes?: number) => Promise<void>;
  pauseOrResume: () => Promise<void>;
  end: () => Promise<void>;
};

async function runFocusNativeBoundary<T>(
  operation: string,
  fn: () => Promise<T>,
  context?: Record<string, unknown>,
): Promise<T> {
  await recordNativeCrashBreadcrumb({ area: 'focus.session', operation, phase: 'before', context });
  try {
    const result = await fn();
    await recordNativeCrashBreadcrumb({ area: 'focus.session', operation, phase: 'after', context });
    return result;
  } catch (error) {
    await recordNativeCrashBreadcrumb({
      area: 'focus.session',
      operation,
      phase: 'error',
      context,
      errorMessage: nativeCrashErrorMessage(error),
    });
    throw error;
  }
}

async function cancelScheduledFocusNotification(
  notificationId: string,
  context?: Record<string, unknown>,
) {
  await runFocusNativeBoundary(
    'Notifications.cancelScheduledNotificationAsync.focusComplete',
    () => Notifications.cancelScheduledNotificationAsync(notificationId),
    { notificationId, ...context },
  );
}

export function useActivityFocusController({
  activity,
  activityId,
  maxMinutes,
  lastFocusMinutes,
  soundscapeTrackId,
  setLastFocusMinutes,
  onOpen,
  onClose,
}: ActivityFocusControllerProps): ActivityFocusController {
  const activeSession = useFocusSessionStore((state) => state.activeSession);
  const session = activeSession?.activityId === activityId ? activeSession : null;
  const [minutesDraft, setMinutesDraft] = useState('25');
  const [customExpanded, setCustomExpanded] = useState(false);
  const [tickMs, setTickMs] = useState(Date.now());
  const launchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const minutes = clampFocusMinutes(minutesDraft, maxMinutes);
  const customOptions = useMemo(() => buildFocusCustomMinuteOptions(maxMinutes), [maxMinutes]);

  const clearPendingLaunch = () => {
    if (!launchTimeoutRef.current) return;
    clearTimeout(launchTimeoutRef.current);
    launchTimeoutRef.current = null;
  };

  useEffect(() => clearPendingLaunch, []);
  useEffect(() => {
    if (session?.mode !== 'running') return;
    const interval = setInterval(() => setTickMs(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [session]);

  const cancelNotificationIfNeeded = async () => {
    if (!session?.notificationId) return;
    await cancelScheduledFocusNotification(session.notificationId).catch(() => undefined);
    useFocusSessionStore.getState().clearNotificationId(session.sessionId);
  };

  const end = async () => {
    clearPendingLaunch();
    const ended = useFocusSessionStore.getState().endSession(session?.sessionId);
    if (ended?.notificationId) {
      await cancelScheduledFocusNotification(ended.notificationId, { reason: 'ended_by_user' }).catch(() => undefined);
    }
  };

  const start = async (overrideMinutes?: number) => {
    if (!activity) return;
    const requested = typeof overrideMinutes === 'number' && Number.isFinite(overrideMinutes)
      ? Math.max(1, Math.floor(overrideMinutes))
      : Math.max(1, Math.floor(Number(minutesDraft)));
    if (!Number.isFinite(requested) || requested <= 0) {
      Alert.alert('Choose a duration', 'Enter a number of minutes greater than 0.');
      return;
    }
    if (requested > maxMinutes) {
      void HapticsService.trigger('outcome.warning');
      openPaywallInterstitial({ reason: 'pro_only_focus_mode', source: 'activity_focus_mode' });
      return;
    }
    void HapticsService.trigger('canvas.primary.confirm');
    setLastFocusMinutes(requested);
    const replaced = useFocusSessionStore.getState().endSession();
    if (replaced?.notificationId) {
      await cancelScheduledFocusNotification(replaced.notificationId, { reason: 'replaced_by_new_session' }).catch(() => undefined);
    }
    onClose();
    await preloadSoundscape({ soundscapeId: soundscapeTrackId }).catch(() => undefined);
    clearPendingLaunch();
    launchTimeoutRef.current = setTimeout(() => {
      const startedAtMs = Date.now();
      useFocusSessionStore.getState().startSession({
        activityId: activity.id,
        goalId: activity.goalId ?? null,
        title: activity.title,
        minutes: requested,
        startedAtMs,
      });
      launchTimeoutRef.current = null;
      setTickMs(startedAtMs);
      void reconcileScreenTimeRestrictions({ focusSessionActive: true, now: new Date(startedAtMs) });
    }, 320);
  };

  return {
    session,
    minutes,
    maxMinutes,
    presets: FOCUS_PRESET_MINUTES,
    customOptions,
    customExpanded,
    isCustomValue: !FOCUS_PRESET_MINUTES.includes(minutes as (typeof FOCUS_PRESET_MINUTES)[number]),
    remainingMs: getRemainingFocusMs(session, tickMs),
    open: () => {
      if (!activity) return;
      setMinutesDraft(String(clampFocusMinutes(lastFocusMinutes ?? activity.estimateMinutes ?? 25, maxMinutes)));
      setCustomExpanded(false);
      onOpen();
    },
    close: onClose,
    setMinutes: (next) => setMinutesDraft(String(next)),
    setCustomExpanded,
    start,
    pauseOrResume: async () => {
      if (!session) return;
      if (session.mode === 'paused') {
        void HapticsService.trigger('canvas.toggle.on');
        await cancelNotificationIfNeeded();
        const resumedAtMs = Date.now();
        useFocusSessionStore.getState().resumeSession(session.sessionId, resumedAtMs);
        setTickMs(resumedAtMs);
        return;
      }
      void HapticsService.trigger('canvas.toggle.off');
      const paused = useFocusSessionStore.getState().pauseSession(session.sessionId);
      if (paused?.notificationId) {
        await cancelScheduledFocusNotification(paused.notificationId, { reason: 'paused' }).catch(() => undefined);
      }
    },
    end,
  };
}
