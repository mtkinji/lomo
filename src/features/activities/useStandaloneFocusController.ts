import { useEffect, useState } from 'react';
import * as Notifications from 'expo-notifications';
import { HapticsService } from '../../services/HapticsService';
import { openPaywallInterstitial } from '../../services/paywall';
import { reconcileScreenTimeRestrictions } from '../../services/screenTimeProtectionRuntime';
import { preloadSoundscape, type SoundscapeId } from '../../services/soundscape';
import { useAppStore } from '../../store/useAppStore';
import {
  STANDALONE_FOCUS_ACTIVITY_ID,
  isStandaloneFocusSession,
  type ActiveFocusSession,
} from './focusSessionLifecycle';
import { getRemainingFocusMs } from './focusSessionPresentation';
import { useFocusSessionStore } from './focusSessionStore';

export type StandaloneFocusController = {
  session: ActiveFocusSession | null;
  maxMinutes: number;
  remainingMs: number;
  start: (minutes: number, audio?: SoundscapeId | 'none') => Promise<boolean>;
  pauseOrResume: () => Promise<void>;
  end: () => Promise<void>;
};

async function cancelNotification(notificationId: string | null | undefined) {
  if (!notificationId) return;
  await Notifications.cancelScheduledNotificationAsync(notificationId).catch(() => undefined);
}

export function useStandaloneFocusController(params: {
  maxMinutes: number;
  soundscapeTrackId: SoundscapeId;
}): StandaloneFocusController {
  const activeSession = useFocusSessionStore((state) => state.activeSession);
  const session = isStandaloneFocusSession(activeSession) ? activeSession : null;
  const setLastFocusMinutes = useAppStore((state) => state.setLastFocusMinutes);
  const [tickMs, setTickMs] = useState(Date.now());

  useEffect(() => {
    if (session?.mode !== 'running') return;
    const interval = setInterval(() => setTickMs(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [session?.mode, session?.sessionId]);

  const start = async (requestedMinutes: number, audio?: SoundscapeId | 'none') => {
    const minutes = Number.isFinite(requestedMinutes) ? Math.max(1, Math.floor(requestedMinutes)) : 25;
    if (minutes > params.maxMinutes) {
      void HapticsService.trigger('outcome.warning');
      openPaywallInterstitial({ reason: 'pro_only_focus_mode', source: 'focus_widget' });
      return false;
    }

    void HapticsService.trigger('canvas.primary.confirm');
    setLastFocusMinutes(minutes);
    const effectiveSoundscape = audio && audio !== 'none' ? audio : params.soundscapeTrackId;
    if (audio === 'none') {
      useAppStore.getState().setSoundscapeEnabled(false);
    } else if (audio) {
      useAppStore.getState().setSoundscapeEnabled(true);
      useAppStore.getState().setSoundscapeTrackId(audio);
    }
    const replaced = useFocusSessionStore.getState().endSession();
    await cancelNotification(replaced?.notificationId);
    if (audio !== 'none') {
      await preloadSoundscape({ soundscapeId: effectiveSoundscape }).catch(() => undefined);
    }

    const startedAtMs = Date.now();
    useFocusSessionStore.getState().startSession({
      activityId: STANDALONE_FOCUS_ACTIVITY_ID,
      goalId: null,
      title: 'Focus',
      minutes,
      startedAtMs,
    });
    setTickMs(startedAtMs);
    void reconcileScreenTimeRestrictions({ focusSessionActive: true, now: new Date(startedAtMs) });
    return true;
  };

  const end = async () => {
    const ended = useFocusSessionStore.getState().endSession(session?.sessionId);
    await cancelNotification(ended?.notificationId);
  };

  const pauseOrResume = async () => {
    if (!session) return;
    if (session.mode === 'paused') {
      void HapticsService.trigger('canvas.toggle.on');
      await cancelNotification(session.notificationId);
      useFocusSessionStore.getState().clearNotificationId(session.sessionId);
      const resumedAtMs = Date.now();
      useFocusSessionStore.getState().resumeSession(session.sessionId, resumedAtMs);
      setTickMs(resumedAtMs);
      return;
    }

    void HapticsService.trigger('canvas.toggle.off');
    const paused = useFocusSessionStore.getState().pauseSession(session.sessionId);
    await cancelNotification(paused?.notificationId);
  };

  return {
    session,
    maxMinutes: params.maxMinutes,
    remainingMs: getRemainingFocusMs(session, tickMs),
    start,
    pauseOrResume,
    end,
  };
}
