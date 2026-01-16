/**
 * Check-in nudge store.
 *
 * Tracks per-goal check-in times, visit times, and dismissed nudge state
 * to power contextual check-in prompts for shared goals.
 *
 * @see docs/prds/social-dynamics-evolution-prd.md
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


