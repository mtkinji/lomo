/**
 * Check-in nudge store.
 *
 * Tracks per-goal check-in times, visit times, and dismissed nudge state
 * to power contextual check-in prompts for shared goals.
 *
 * @see docs/feature-briefs/social-dynamics-evolution.md
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

/** How long before we show a "return" nudge (24 hours) */
const RETURN_NUDGE_THRESHOLD_MS = 24 * 60 * 60 * 1000;

/** Cooldown after dismissing a nudge (24 hours) */
const NUDGE_DISMISS_COOLDOWN_MS = 24 * 60 * 60 * 1000;

/** Cooldown after a successful check-in before showing another nudge (4 hours) */
const POST_CHECKIN_COOLDOWN_MS = 4 * 60 * 60 * 1000;

/** Cooldown after dismissing the share coachmark for a specific goal (14 days) */
const SHARE_COACHMARK_GOAL_COOLDOWN_MS = 14 * 24 * 60 * 60 * 1000;

/** Global cap for share coachmarks (2 per 7 days) */
const SHARE_COACHMARK_GLOBAL_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const SHARE_COACHMARK_GLOBAL_CAP = 2;

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type NudgeTrigger =
  | 'goal_load'
  | 'goal_return'
  | 'activity_complete'
  | 'focus_complete';

type CheckinNudgeState = {
  /** goalId -> ISO timestamp of last check-in */
  lastCheckinByGoalId: Record<string, string>;
  /** goalId -> ISO timestamp of last visit */
  lastVisitByGoalId: Record<string, string>;
  /** goalId -> ISO timestamp of last dismissed nudge */
  dismissedNudgesByGoalId: Record<string, string>;
  /** goalId -> ISO timestamp of last dismissed share coachmark */
  dismissedShareCoachmarkByGoalId: Record<string, string>;
  /** ISO timestamps for global share coachmark exposure cap */
  shareCoachmarkShownAt: string[];
  /** goalIds that have already been shared on this device */
  sharedGoalIds: Record<string, true>;

  // ─────────────────────────────────────────────────────────────────────────
  // Actions
  // ─────────────────────────────────────────────────────────────────────────

  /** Record that the user checked in for a goal */
  recordCheckin: (goalId: string) => void;

  /** Record that the user visited a goal detail screen */
  recordVisit: (goalId: string) => void;

  /** Record that the user dismissed a nudge for a goal */
  dismissNudge: (goalId: string) => void;

  /** Check if we should show a nudge for a goal */
  shouldShowNudge: (goalId: string, trigger: NudgeTrigger) => boolean;

  /** Record that the share coachmark was shown */
  recordShareCoachmarkShown: (goalId: string) => void;

  /** Record that the user dismissed the share coachmark for a goal */
  dismissShareCoachmark: (goalId: string) => void;

  /** Record that the goal was shared so the coachmark never refires for it */
  markGoalShared: (goalId: string) => void;

  /** Check if the share coachmark can show for a goal */
  shouldShowShareCoachmark: (goalId: string) => boolean;

  /** Get time since last check-in in ms (null if never) */
  getTimeSinceLastCheckin: (goalId: string) => number | null;

  /** Get time since last visit in ms (null if never) */
  getTimeSinceLastVisit: (goalId: string) => number | null;

  /** Clear all nudge state (for testing) */
  reset: () => void;
};

// ─────────────────────────────────────────────────────────────────────────────
// Store
// ─────────────────────────────────────────────────────────────────────────────

export const useCheckinNudgeStore = create<CheckinNudgeState>()(
  persist(
    (set, get) => ({
      lastCheckinByGoalId: {},
      lastVisitByGoalId: {},
      dismissedNudgesByGoalId: {},
      dismissedShareCoachmarkByGoalId: {},
      shareCoachmarkShownAt: [],
      sharedGoalIds: {},

      recordCheckin: (goalId: string) => {
        const now = new Date().toISOString();
        set((state) => ({
          lastCheckinByGoalId: {
            ...state.lastCheckinByGoalId,
            [goalId]: now,
          },
        }));
      },

      recordVisit: (goalId: string) => {
        const now = new Date().toISOString();
        set((state) => ({
          lastVisitByGoalId: {
            ...state.lastVisitByGoalId,
            [goalId]: now,
          },
        }));
      },

      dismissNudge: (goalId: string) => {
        const now = new Date().toISOString();
        set((state) => ({
          dismissedNudgesByGoalId: {
            ...state.dismissedNudgesByGoalId,
            [goalId]: now,
          },
        }));
      },

      shouldShowNudge: (goalId: string, trigger: NudgeTrigger): boolean => {
        const state = get();
        const now = Date.now();

        // Check if nudge was recently dismissed
        const dismissedAt = state.dismissedNudgesByGoalId[goalId];
        if (dismissedAt) {
          const dismissedMs = Date.parse(dismissedAt);
          if (now - dismissedMs < NUDGE_DISMISS_COOLDOWN_MS) {
            return false;
          }
        }

        // Check if user recently checked in
        const lastCheckin = state.lastCheckinByGoalId[goalId];
        if (lastCheckin) {
          const checkinMs = Date.parse(lastCheckin);
          if (now - checkinMs < POST_CHECKIN_COOLDOWN_MS) {
            return false;
          }
        }

        // For goal_return trigger, also require 24h+ since last check-in
        if (trigger === 'goal_return') {
          if (!lastCheckin) {
            // Never checked in - show nudge
            return true;
          }
          const checkinMs = Date.parse(lastCheckin);
          return now - checkinMs >= RETURN_NUDGE_THRESHOLD_MS;
        }

        // For other triggers, show if not recently checked in or dismissed
        return true;
      },

      recordShareCoachmarkShown: (goalId: string) => {
        const now = new Date().toISOString();
        set((state) => ({
          shareCoachmarkShownAt: [...state.shareCoachmarkShownAt, now],
        }));
      },

      dismissShareCoachmark: (goalId: string) => {
        const now = new Date().toISOString();
        set((state) => ({
          dismissedShareCoachmarkByGoalId: {
            ...state.dismissedShareCoachmarkByGoalId,
            [goalId]: now,
          },
        }));
      },

      markGoalShared: (goalId: string) => {
        set((state) => ({
          sharedGoalIds: {
            ...state.sharedGoalIds,
            [goalId]: true,
          },
        }));
      },

      shouldShowShareCoachmark: (goalId: string): boolean => {
        const state = get();
        const now = Date.now();

        if (state.sharedGoalIds[goalId]) return false;

        const dismissedAt = state.dismissedShareCoachmarkByGoalId[goalId];
        if (dismissedAt) {
          const dismissedMs = Date.parse(dismissedAt);
          if (now - dismissedMs < SHARE_COACHMARK_GOAL_COOLDOWN_MS) {
            return false;
          }
        }

        const recentShows = state.shareCoachmarkShownAt.filter((iso) => {
          const shownMs = Date.parse(iso);
          return Number.isFinite(shownMs) && now - shownMs < SHARE_COACHMARK_GLOBAL_WINDOW_MS;
        });

        return recentShows.length < SHARE_COACHMARK_GLOBAL_CAP;
      },

      getTimeSinceLastCheckin: (goalId: string): number | null => {
        const lastCheckin = get().lastCheckinByGoalId[goalId];
        if (!lastCheckin) return null;
        return Date.now() - Date.parse(lastCheckin);
      },

      getTimeSinceLastVisit: (goalId: string): number | null => {
        const lastVisit = get().lastVisitByGoalId[goalId];
        if (!lastVisit) return null;
        return Date.now() - Date.parse(lastVisit);
      },

      reset: () => {
        set({
          lastCheckinByGoalId: {},
          lastVisitByGoalId: {},
          dismissedNudgesByGoalId: {},
          dismissedShareCoachmarkByGoalId: {},
          shareCoachmarkShownAt: [],
          sharedGoalIds: {},
        });
      },
    }),
    {
      name: 'kwilt-checkin-nudge-v1',
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist the data, not the functions
      partialize: (state) => ({
        lastCheckinByGoalId: state.lastCheckinByGoalId,
        lastVisitByGoalId: state.lastVisitByGoalId,
        dismissedNudgesByGoalId: state.dismissedNudgesByGoalId,
        dismissedShareCoachmarkByGoalId: state.dismissedShareCoachmarkByGoalId,
        shareCoachmarkShownAt: state.shareCoachmarkShownAt,
        sharedGoalIds: state.sharedGoalIds,
      }),
    }
  )
);

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Format time since last check-in as a human-readable string.
 */
export function formatTimeSinceCheckin(ms: number | null): string | null {
  if (ms === null) return null;

  const hours = Math.floor(ms / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return days === 1 ? '1 day ago' : `${days} days ago`;
  }

  if (hours > 0) {
    return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
  }

  return 'recently';
}


