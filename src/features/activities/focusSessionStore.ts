import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  type ActiveFocusSession,
  type CompletedFocusSession,
  buildPausedFocusSession,
  buildRunningFocusSession,
  completeExpiredFocusSession,
  resumePausedFocusSession,
} from './focusSessionLifecycle';

type StartFocusSessionParams = {
  activityId: string;
  goalId?: string | null;
  title: string;
  minutes: number;
  startedAtMs?: number;
};

type EndedFocusSession = {
  sessionId: string;
  notificationId: string | null;
};

type FocusSessionState = {
  activeSession: ActiveFocusSession | null;
  startSession: (params: StartFocusSessionParams) => ActiveFocusSession;
  pauseSession: (sessionId: string, nowMs?: number) => EndedFocusSession | null;
  resumeSession: (sessionId: string, nowMs?: number) => ActiveFocusSession | null;
  endSession: (sessionId?: string) => EndedFocusSession | null;
  completeExpiredSession: (nowMs?: number) => CompletedFocusSession | null;
  setNotificationId: (sessionId: string, notificationId: string | null) => void;
  clearNotificationId: (sessionId: string) => string | null;
  reset: () => void;
};

function matchesActiveSession(activeSession: ActiveFocusSession | null, sessionId?: string): activeSession is ActiveFocusSession {
  if (!activeSession) return false;
  return sessionId == null || activeSession.sessionId === sessionId;
}

export const useFocusSessionStore = create<FocusSessionState>()(
  persist(
    (set, get) => ({
      activeSession: null,

      startSession: (params) => {
        const session = buildRunningFocusSession({
          ...params,
          startedAtMs: params.startedAtMs ?? Date.now(),
        });
        set({ activeSession: session });
        return session;
      },

      pauseSession: (sessionId, nowMs = Date.now()) => {
        const activeSession = get().activeSession;
        if (!matchesActiveSession(activeSession, sessionId)) return null;
        const notificationId = activeSession.notificationId;
        set({ activeSession: buildPausedFocusSession(activeSession, nowMs) });
        return { sessionId: activeSession.sessionId, notificationId };
      },

      resumeSession: (sessionId, nowMs = Date.now()) => {
        const activeSession = get().activeSession;
        if (!matchesActiveSession(activeSession, sessionId)) return null;
        const session = resumePausedFocusSession(activeSession, nowMs);
        set({ activeSession: session });
        return session;
      },

      endSession: (sessionId) => {
        const activeSession = get().activeSession;
        if (!matchesActiveSession(activeSession, sessionId)) return null;
        set({ activeSession: null });
        return {
          sessionId: activeSession.sessionId,
          notificationId: activeSession.notificationId,
        };
      },

      completeExpiredSession: (nowMs = Date.now()) => {
        const activeSession = get().activeSession;
        const completed = completeExpiredFocusSession(activeSession, nowMs);
        if (!completed) return null;
        set({ activeSession: null });
        return completed;
      },

      setNotificationId: (sessionId, notificationId) => {
        const activeSession = get().activeSession;
        if (!matchesActiveSession(activeSession, sessionId)) return;
        set({
          activeSession: {
            ...activeSession,
            notificationId,
          },
        });
      },

      clearNotificationId: (sessionId) => {
        const activeSession = get().activeSession;
        if (!matchesActiveSession(activeSession, sessionId)) return null;
        const notificationId = activeSession.notificationId;
        if (notificationId == null) return null;
        set({
          activeSession: {
            ...activeSession,
            notificationId: null,
          },
        });
        return notificationId;
      },

      reset: () => set({ activeSession: null }),
    }),
    {
      name: 'kwilt-focus-session-v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        activeSession: state.activeSession,
      }),
    },
  ),
);
