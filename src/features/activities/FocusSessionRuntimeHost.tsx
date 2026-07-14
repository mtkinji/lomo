import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import * as Notifications from 'expo-notifications';
import { HapticsService } from '../../services/HapticsService';
import { setGlanceableFocusSession } from '../../services/appleEcosystem/glanceableState';
import { endLiveActivity, syncLiveActivity } from '../../services/appleEcosystem/liveActivity';
import { queueCheckinDraftFromProgress } from '../../services/checkinNudgeDrafts';
import { reconcileScreenTimeRestrictions } from '../../services/screenTimeProtectionRuntime';
import { startSoundscapeLoop, stopSoundscapeLoop } from '../../services/soundscape';
import { useAppStore } from '../../store/useAppStore';
import { recordShowUpWithCelebration } from '../../store/useCelebrationStore';
import {
  getFocusCompletionNotificationSeconds,
  isRunningFocusSessionExpired,
} from './focusSessionLifecycle';
import { focusOverlayColorKeyForIndex } from './focusOverlayPalette';
import { useFocusSessionStore } from './focusSessionStore';

async function cancelFocusNotification(notificationId: string | null | undefined) {
  if (!notificationId) return;
  await Notifications.cancelScheduledNotificationAsync(notificationId).catch(() => undefined);
}

async function rescheduleFocusCompletionNotification() {
  const activeSession = useFocusSessionStore.getState().activeSession;
  if (activeSession?.mode !== 'running') return;

  const seconds = getFocusCompletionNotificationSeconds(activeSession);
  if (seconds == null) return;

  const preferences = useAppStore.getState().notificationPreferences;
  const permissions = await Notifications.getPermissionsAsync().catch(() => null);
  const canNotify =
    permissions?.status === 'granted' &&
    preferences.notificationsEnabled &&
    preferences.allowActivityReminders;

  await cancelFocusNotification(activeSession.notificationId);
  useFocusSessionStore.getState().setNotificationId(activeSession.sessionId, null);
  if (!canNotify) return;

  const identifier = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Focus session complete',
      body: activeSession.title,
      data: {
        type: 'focusSession',
        activityId: activeSession.activityId,
        sessionId: activeSession.sessionId,
      },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds,
      repeats: false,
    },
  }).catch(() => null);

  if (!identifier) return;
  const latest = useFocusSessionStore.getState().activeSession;
  if (latest?.sessionId !== activeSession.sessionId || latest.mode !== 'running') {
    await cancelFocusNotification(identifier);
    return;
  }
  useFocusSessionStore.getState().setNotificationId(activeSession.sessionId, identifier);
}

function completeExpiredFocusSessionIfNeeded(nowMs = Date.now()) {
  const completed = useFocusSessionStore.getState().completeExpiredSession(nowMs);
  if (!completed) return;

  void HapticsService.trigger('outcome.success');
  recordShowUpWithCelebration();
  useAppStore.getState().recordCompletedFocusSession({ completedAtMs: completed.completedAtMs });
  useAppStore.getState().recordScreenTimeQualifyingAction({
    action: 'focus_session_completed',
    occurredAt: new Date(completed.completedAtMs),
    focusMinutes: completed.durationMinutes,
  });

  if (completed.goalId) {
    void queueCheckinDraftFromProgress({
      goalId: completed.goalId,
      trigger: 'focus_complete',
      source: 'activity_detail_focus',
      sourceType: 'focus_session',
      sourceId: completed.sessionId,
      title: completed.title,
      completedAt: new Date(completed.completedAtMs).toISOString(),
      durationMinutes: completed.durationMinutes,
      openPromptDelayMs: 1500,
    });
  }
}

export function FocusSessionRuntimeHost() {
  const activeSession = useFocusSessionStore((state) => state.activeSession);
  const soundscapeEnabled = useAppStore((state) => state.soundscapeEnabled);
  const soundscapeTrackId = useAppStore((state) => state.soundscapeTrackId);
  const focusOverlayColorIndex = useAppStore((state) => state.focusOverlayColorIndex);
  const focusOverlayColorKey = focusOverlayColorKeyForIndex(focusOverlayColorIndex);
  const lastSessionIdRef = useRef<string | null>(null);
  const activeSessionEndAtMs = activeSession?.mode === 'running' ? activeSession.endAtMs : undefined;

  useEffect(() => {
    if (activeSession?.mode !== 'running') return;
    completeExpiredFocusSessionIfNeeded();
    const id = setInterval(() => completeExpiredFocusSessionIfNeeded(), 1000);
    return () => clearInterval(id);
  }, [activeSession?.mode, activeSession?.sessionId, activeSessionEndAtMs]);

  useEffect(() => {
    if (activeSession?.mode !== 'running') return;
    void rescheduleFocusCompletionNotification();
    // Re-arm when the active session changes or when resume moves the end time.
  }, [activeSession?.mode, activeSession?.sessionId, activeSessionEndAtMs]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        completeExpiredFocusSessionIfNeeded();
      }
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    const previousSessionId = lastSessionIdRef.current;

    if (!activeSession) {
      lastSessionIdRef.current = null;
      if (previousSessionId) {
        void stopSoundscapeLoop({ unload: true }).catch(() => undefined);
        void setGlanceableFocusSession(null).catch(() => undefined);
        void endLiveActivity().catch(() => undefined);
        void reconcileScreenTimeRestrictions({ focusSessionActive: false }).catch(() => undefined);
      }
      return;
    }

    // The expiry effect above clears restored sessions synchronously, but the
    // remaining effects from that render still see the stale session value.
    // Do not restart native Focus state while that cleanup rerender is pending.
    if (isRunningFocusSessionExpired(activeSession)) {
      return;
    }

    lastSessionIdRef.current = activeSession.sessionId;

    void reconcileScreenTimeRestrictions({ focusSessionActive: true }).catch(() => undefined);

    if (activeSession.mode === 'running') {
      if (soundscapeEnabled) {
        void startSoundscapeLoop({ fadeInMs: 250, soundscapeId: soundscapeTrackId }).catch(() => undefined);
      } else {
        void stopSoundscapeLoop().catch(() => undefined);
      }

      void setGlanceableFocusSession({
        id: activeSession.sessionId,
        mode: 'running',
        startedAtMs: activeSession.startedAtMs,
        endAtMs: activeSession.endAtMs,
        activityId: activeSession.activityId,
        title: activeSession.title,
      });
      return;
    }

    void stopSoundscapeLoop().catch(() => undefined);
    void cancelFocusNotification(activeSession.notificationId).then(() => {
      useFocusSessionStore.getState().clearNotificationId(activeSession.sessionId);
    });
    void setGlanceableFocusSession({
      id: activeSession.sessionId,
      mode: 'paused',
      startedAtMs: activeSession.startedAtMs,
      remainingMs: activeSession.remainingMs,
      activityId: activeSession.activityId,
      title: activeSession.title,
    });
  }, [activeSession, soundscapeEnabled, soundscapeTrackId]);

  useEffect(() => {
    if (!activeSession || isRunningFocusSessionExpired(activeSession)) return;

    if (activeSession.mode === 'running') {
      void syncLiveActivity({
        mode: 'running',
        activityId: activeSession.activityId,
        title: activeSession.title,
        colorKey: focusOverlayColorKey,
        sessionId: activeSession.sessionId,
        startedAtMs: activeSession.startedAtMs,
        endAtMs: activeSession.endAtMs,
      });
      return;
    }

    void syncLiveActivity({
      mode: 'paused',
      activityId: activeSession.activityId,
      title: activeSession.title,
      colorKey: focusOverlayColorKey,
      sessionId: activeSession.sessionId,
      startedAtMs: activeSession.startedAtMs,
      remainingMs: activeSession.remainingMs,
    });
  }, [activeSession, focusOverlayColorKey]);

  return null;
}
