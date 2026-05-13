/**
 * Check-in nudge store.
 *
 * Tracks per-goal check-in times, visit times, dismissed nudge state, and
 * per-goal partner-prompt state to power contextual check-in prompts and
 * lifecycle-driven "add a partner" prompts for unshared goals.
 *
 * Partner prompts are anchored to per-goal triggers, not a global exposure cap.
 * A lightweight global throttle is kept only to prevent prompts from stacking
 * across rapid navigation between goals.
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

/**
 * Cooldown after dismissing a partner prompt for a specific (goal, trigger).
 * Once dismissed, we wait this long before that same trigger can re-show on
 * that goal. The other trigger remains eligible based on its own state.
 */
const PARTNER_PROMPT_GOAL_COOLDOWN_MS = 14 * 24 * 60 * 60 * 1000;

/**
 * Lightweight global throttle. We never show two partner prompts within this
 * window so that rapid goal navigation cannot stack prompts back-to-back.
 */
const PARTNER_PROMPT_GLOBAL_THROTTLE_MS = 60 * 1000;

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type NudgeTrigger =
  | 'goal_load'
  | 'goal_return'
  | 'activity_complete'
  | 'focus_complete';

/**
 * Per-goal partner prompt triggers.
 *
 * - `first_todo_added`: goal just got its first to-do or accepted plan; the
 *   user is still unshared.
 * - `first_progress_alone`: user just completed their first to-do for this
 *   goal while still unshared.
 * - `partners_tab_empty`: contextual CTA inside the Partners sheet when the
 *   user opens it on an unshared goal. Always allowed; not throttled.
 */
export type PartnerPromptTrigger =
  | 'first_todo_added'
  | 'first_progress_alone'
  | 'partners_tab_empty';

type PartnerPromptByGoal = Record<string, Partial<Record<PartnerPromptTrigger, string>>>;

type CheckinNudgeState = {
  /** goalId -> ISO timestamp of last check-in */
  lastCheckinByGoalId: Record<string, string>;
  /** goalId -> ISO timestamp of last visit */
  lastVisitByGoalId: Record<string, string>;
  /** goalId -> ISO timestamp of last dismissed nudge */
  dismissedNudgesByGoalId: Record<string, string>;
  /** goalId -> trigger -> ISO timestamp the partner prompt was last shown */
  partnerPromptShownAt: PartnerPromptByGoal;
  /** goalId -> trigger -> ISO timestamp the partner prompt was last dismissed */
  partnerPromptDismissedAt: PartnerPromptByGoal;
  /**
   * goalId -> ISO timestamp recorded when the first to-do was completed
   * while the goal was still unshared. Used to gate `first_progress_alone`.
   */
  firstProgressAloneAt: Record<string, string>;
  /** ISO timestamp of the most recent partner prompt shown (for global throttle) */
  partnerPromptLastShownAt: string | null;
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

  /** Record that a partner prompt was shown for a (goal, trigger) */
  recordPartnerPromptShown: (goalId: string, trigger: PartnerPromptTrigger) => void;

  /** Record that the user dismissed the partner prompt for a (goal, trigger) */
  dismissPartnerPrompt: (goalId: string, trigger: PartnerPromptTrigger) => void;

  /** Record that the goal was shared so partner prompts never refire for it */
  markGoalShared: (goalId: string) => void;

  /** Check whether a partner prompt is eligible to show for a (goal, trigger) */
  shouldShowPartnerPrompt: (goalId: string, trigger: PartnerPromptTrigger) => boolean;

  /**
   * Record that the user completed their first to-do for this goal while
   * still unshared. Safe to call repeatedly; only the first call sticks.
   */
  markFirstProgressAlone: (goalId: string) => void;

  /** Whether `markFirstProgressAlone` has been recorded for this goal */
  hasRecordedFirstProgressAlone: (goalId: string) => boolean;

  /** Get time since last check-in in ms (null if never) */
  getTimeSinceLastCheckin: (goalId: string) => number | null;

  /** Get time since last visit in ms (null if never) */
  getTimeSinceLastVisit: (goalId: string) => number | null;

  /** Clear all nudge state (for testing) */
  reset: () => void;
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function setTriggerStamp(
  current: PartnerPromptByGoal,
  goalId: string,
  trigger: PartnerPromptTrigger,
  iso: string,
): PartnerPromptByGoal {
  const existing = current[goalId] ?? {};
  return {
    ...current,
    [goalId]: {
      ...existing,
      [trigger]: iso,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Store
// ─────────────────────────────────────────────────────────────────────────────

export const useCheckinNudgeStore = create<CheckinNudgeState>()(
  persist(
    (set, get) => ({
      lastCheckinByGoalId: {},
      lastVisitByGoalId: {},
      dismissedNudgesByGoalId: {},
      partnerPromptShownAt: {},
      partnerPromptDismissedAt: {},
      firstProgressAloneAt: {},
      partnerPromptLastShownAt: null,
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

        const dismissedAt = state.dismissedNudgesByGoalId[goalId];
        if (dismissedAt) {
          const dismissedMs = Date.parse(dismissedAt);
          if (now - dismissedMs < NUDGE_DISMISS_COOLDOWN_MS) {
            return false;
          }
        }

        const lastCheckin = state.lastCheckinByGoalId[goalId];
        if (lastCheckin) {
          const checkinMs = Date.parse(lastCheckin);
          if (now - checkinMs < POST_CHECKIN_COOLDOWN_MS) {
            return false;
          }
        }

        if (trigger === 'goal_return') {
          if (!lastCheckin) {
            return true;
          }
          const checkinMs = Date.parse(lastCheckin);
          return now - checkinMs >= RETURN_NUDGE_THRESHOLD_MS;
        }

        return true;
      },

      recordPartnerPromptShown: (goalId: string, trigger: PartnerPromptTrigger) => {
        const now = new Date().toISOString();
        set((state) => ({
          partnerPromptShownAt: setTriggerStamp(state.partnerPromptShownAt, goalId, trigger, now),
          partnerPromptLastShownAt: trigger === 'partners_tab_empty'
            ? state.partnerPromptLastShownAt
            : now,
        }));
      },

      dismissPartnerPrompt: (goalId: string, trigger: PartnerPromptTrigger) => {
        const now = new Date().toISOString();
        set((state) => ({
          partnerPromptDismissedAt: setTriggerStamp(
            state.partnerPromptDismissedAt,
            goalId,
            trigger,
            now,
          ),
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

      shouldShowPartnerPrompt: (
        goalId: string,
        trigger: PartnerPromptTrigger,
      ): boolean => {
        const state = get();
        const now = Date.now();

        if (state.sharedGoalIds[goalId]) return false;

        const dismissedAt = state.partnerPromptDismissedAt[goalId]?.[trigger];
        if (dismissedAt) {
          const dismissedMs = Date.parse(dismissedAt);
          if (Number.isFinite(dismissedMs) && now - dismissedMs < PARTNER_PROMPT_GOAL_COOLDOWN_MS) {
            return false;
          }
        }

        // Once shown for a (goal, trigger), don't re-fire that same trigger.
        // The user will get a separate trigger later (e.g. first_progress_alone).
        const shownAt = state.partnerPromptShownAt[goalId]?.[trigger];
        if (shownAt) return false;

        // The Partners tab CTA is always allowed when unshared; it lives in
        // a deliberate destination and shouldn't be globally throttled.
        if (trigger === 'partners_tab_empty') return true;

        const lastShown = state.partnerPromptLastShownAt;
        if (lastShown) {
          const lastMs = Date.parse(lastShown);
          if (Number.isFinite(lastMs) && now - lastMs < PARTNER_PROMPT_GLOBAL_THROTTLE_MS) {
            return false;
          }
        }

        return true;
      },

      markFirstProgressAlone: (goalId: string) => {
        const state = get();
        if (state.firstProgressAloneAt[goalId]) return;
        if (state.sharedGoalIds[goalId]) return;
        const now = new Date().toISOString();
        set((s) => ({
          firstProgressAloneAt: {
            ...s.firstProgressAloneAt,
            [goalId]: now,
          },
        }));
      },

      hasRecordedFirstProgressAlone: (goalId: string): boolean => {
        return Boolean(get().firstProgressAloneAt[goalId]);
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
          partnerPromptShownAt: {},
          partnerPromptDismissedAt: {},
          firstProgressAloneAt: {},
          partnerPromptLastShownAt: null,
          sharedGoalIds: {},
        });
      },
    }),
    {
      // Bumped to v2: store now tracks per-goal partner prompt state instead
      // of the legacy global share-coachmark cap.
      name: 'kwilt-checkin-nudge-v2',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        lastCheckinByGoalId: state.lastCheckinByGoalId,
        lastVisitByGoalId: state.lastVisitByGoalId,
        dismissedNudgesByGoalId: state.dismissedNudgesByGoalId,
        partnerPromptShownAt: state.partnerPromptShownAt,
        partnerPromptDismissedAt: state.partnerPromptDismissedAt,
        firstProgressAloneAt: state.firstProgressAloneAt,
        partnerPromptLastShownAt: state.partnerPromptLastShownAt,
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
