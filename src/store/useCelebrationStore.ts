import { create } from 'zustand';
import type { CelebrationKind } from '../services/gifs';
import { useAppStore } from './useAppStore';
import { useFirstTimeUxStore } from './useFirstTimeUxStore';
import { useToastStore } from './useToastStore';

export type CelebrationMoment = {
  /** Unique key for this celebration instance to prevent duplicates */
  id: string;
  /** The kind of celebration to show (maps to GIPHY queries) */
  kind: CelebrationKind;
  /** Primary headline for the celebration */
  headline: string;
  /** Supporting message under the headline */
  subheadline?: string;
  /** Optional custom CTA label (defaults to "Continue") */
  ctaLabel?: string;
  /** Called when user dismisses the celebration */
  onDismiss?: () => void;
  /** Auto-dismiss after N ms (0 = manual dismiss only) */
  autoDismissMs?: number;
  /**
   * Priority level for conflict resolution.
   * - 'high': Important milestones (goal completion, major streaks) - will queue
   * - 'normal': Regular celebrations - will queue
   * - 'low': Minor celebrations (activity completion) - will drop if conflicts exist
   */
  priority?: 'high' | 'normal' | 'low';
};

type CelebrationState = {
  /** Currently active celebration (null = none showing) */
  activeCelebration: CelebrationMoment | null;
  /** Queue of pending celebrations (shown sequentially) */
  queue: CelebrationMoment[];
  /** Deferred celebrations waiting for conflicts to clear */
  deferred: CelebrationMoment[];
  /** Set of celebration IDs that have been shown (prevents repeat celebrations) */
  shownIds: Set<string>;
  /** Show a celebration (queued if one is already active, deferred if conflicts) */
  celebrate: (moment: CelebrationMoment) => void;
  /** Dismiss the current celebration and show next in queue */
  dismiss: () => void;
  /** Check if a celebration ID has already been shown */
  hasBeenShown: (id: string) => boolean;
  /** Mark a celebration ID as shown without displaying it */
  markShown: (id: string) => void;
  /** Clear the shown IDs (useful for testing) */
  resetShownIds: () => void;
  /** Process deferred celebrations (called when conflicts clear) */
  processDeferred: () => void;
};

/**
 * Check if there are active conflicts that should prevent celebrations.
 */
function hasActiveConflicts(): { blocked: boolean; reason?: string } {
  // Check FTUE flow
  const ftueActive = useFirstTimeUxStore.getState().isFlowActive;
  if (ftueActive) {
    return { blocked: true, reason: 'ftue_active' };
  }

  // Check if toasts are suppressed (means another overlay owns attention)
  const toastState = useToastStore.getState();
  const suppressionKeys = Object.keys(toastState.suppressionKeys ?? {});
  if (suppressionKeys.length > 0) {
    return { blocked: true, reason: 'overlay_active' };
  }

  return { blocked: false };
}

// Retry interval for processing deferred celebrations
const DEFERRED_RETRY_MS = 1500;
let deferredRetryTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleDeferredRetry() {
  if (deferredRetryTimer) return;
  deferredRetryTimer = setTimeout(() => {
    deferredRetryTimer = null;
    useCelebrationStore.getState().processDeferred();
  }, DEFERRED_RETRY_MS);
}

export const useCelebrationStore = create<CelebrationState>((set, get) => ({
  activeCelebration: null,
  queue: [],
  deferred: [],
  shownIds: new Set(),

  celebrate: (moment) => {
    const { activeCelebration, shownIds, deferred } = get();
    const priority = moment.priority ?? 'normal';

    // Don't show duplicates
    if (shownIds.has(moment.id)) {
      return;
    }

    // Mark as shown immediately to prevent race conditions
    const nextShownIds = new Set(shownIds);
    nextShownIds.add(moment.id);

    // Check for conflicts
    const conflicts = hasActiveConflicts();
    if (conflicts.blocked) {
      // Low priority celebrations get dropped during conflicts
      if (priority === 'low') {
        if (__DEV__) {
          // eslint-disable-next-line no-console
          console.log('[celebration] Dropped low-priority celebration due to conflict:', moment.id, conflicts.reason);
        }
        set({ shownIds: nextShownIds });
        return;
      }

      // Higher priority celebrations get deferred
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.log('[celebration] Deferring celebration due to conflict:', moment.id, conflicts.reason);
      }
      set((state) => ({
        deferred: [...state.deferred, moment],
        shownIds: nextShownIds,
      }));
      scheduleDeferredRetry();
      return;
    }

    if (activeCelebration) {
      // Queue it if something is already showing
      set((state) => ({
        queue: [...state.queue, moment],
        shownIds: nextShownIds,
      }));
    } else {
      // Show immediately
      set({ activeCelebration: moment, shownIds: nextShownIds });
    }
  },

  dismiss: () => {
    const { activeCelebration, queue } = get();

    // Call the onDismiss callback if provided
    activeCelebration?.onDismiss?.();

    if (queue.length > 0) {
      // Show next in queue
      const [next, ...rest] = queue;
      set({ activeCelebration: next, queue: rest });
    } else {
      set({ activeCelebration: null });
      // Check for deferred celebrations after dismissing
      setTimeout(() => {
        get().processDeferred();
      }, 300);
    }
  },

  hasBeenShown: (id) => get().shownIds.has(id),

  markShown: (id) => {
    set((state) => {
      const nextShownIds = new Set(state.shownIds);
      nextShownIds.add(id);
      return { shownIds: nextShownIds };
    });
  },

  resetShownIds: () => set({ shownIds: new Set(), deferred: [] }),

  processDeferred: () => {
    const { deferred, activeCelebration } = get();
    if (deferred.length === 0 || activeCelebration) {
      return;
    }

    const conflicts = hasActiveConflicts();
    if (conflicts.blocked) {
      // Still blocked, retry later
      scheduleDeferredRetry();
      return;
    }

    // Process the first deferred celebration
    const [next, ...rest] = deferred;
    set({ activeCelebration: next, deferred: rest });
  },
}));

// Subscribe to conflict sources and process deferred when they clear
if (typeof window !== 'undefined') {
  // Watch FTUE flow changes
  useFirstTimeUxStore.subscribe((state, prevState) => {
    if (prevState.isFlowActive && !state.isFlowActive) {
      // FTUE just ended, check for deferred celebrations
      setTimeout(() => {
        useCelebrationStore.getState().processDeferred();
      }, 500);
    }
  });

  // Watch toast suppression changes
  useToastStore.subscribe((state, prevState) => {
    const prevKeys = Object.keys(prevState.suppressionKeys ?? {}).length;
    const nextKeys = Object.keys(state.suppressionKeys ?? {}).length;
    if (prevKeys > 0 && nextKeys === 0) {
      // Suppression just ended, check for deferred celebrations
      setTimeout(() => {
        useCelebrationStore.getState().processDeferred();
      }, 500);
    }
  });
}

// ============================================================================
// Helper functions for common celebration moments
// ============================================================================

/**
 * Trigger a goal completion celebration
 */
export function celebrateGoalCompleted(goalTitle: string, onDismiss?: () => void) {
  useCelebrationStore.getState().celebrate({
    id: `goal-completed-${Date.now()}`,
    kind: 'goalCompleted',
    headline: 'Goal Achieved! 🏆',
    subheadline: `You completed "${goalTitle}" — that's real progress.`,
    priority: 'high',
    onDismiss,
  });
}

/**
 * Trigger an activity completion celebration (for significant activities)
 */
export function celebrateActivityCompleted(activityTitle: string, onDismiss?: () => void) {
  useCelebrationStore.getState().celebrate({
    id: `activity-completed-${Date.now()}`,
    kind: 'activityCompleted',
    headline: 'Nice work! ✨',
    subheadline: `"${activityTitle}" is done. Keep the momentum going!`,
    autoDismissMs: 3500,
    priority: 'low', // Low priority - drop if conflicts exist
    onDismiss,
  });
}

/**
 * Trigger a first activity celebration
 */
export function celebrateFirstActivity(onDismiss?: () => void) {
  const store = useCelebrationStore.getState();
  const celebrationId = 'first-activity-ever';

  if (store.hasBeenShown(celebrationId)) {
    return;
  }

  store.celebrate({
    id: celebrationId,
    kind: 'firstActivity',
    headline: 'First Step Taken! 🎯',
    subheadline: 'Every journey starts with a single step. You just took yours.',
    priority: 'high',
    onDismiss,
  });
}

/**
 * Trigger a weekly streak celebration
 */
export function celebrateWeeklyStreak(weekCount: number, onDismiss?: () => void) {
  useCelebrationStore.getState().celebrate({
    id: `weekly-streak-${weekCount}`,
    kind: 'weeklyStreak',
    headline: `${weekCount} Week Streak! 🔥`,
    subheadline: `You've been showing up consistently for ${weekCount} week${weekCount === 1 ? '' : 's'}. Unstoppable!`,
    priority: 'normal',
    onDismiss,
  });
}

// ============================================================================
// Daily Streak Celebrations
// ============================================================================

/**
 * Special milestone days that get bigger celebrations.
 * After 365, we also celebrate every 100 days and yearly anniversaries.
 */
const SPECIAL_STREAK_MILESTONES = [3, 7, 14, 21, 30, 50, 75, 100, 150, 200, 365];

/**
 * Check if a streak count is a SPECIAL milestone (bigger celebration).
 */
export function isSpecialStreakMilestone(days: number): boolean {
  if (SPECIAL_STREAK_MILESTONES.includes(days)) {
    return true;
  }
  // After 365: every 100 days is special
  if (days > 365 && days % 100 === 0) {
    return true;
  }
  // Yearly anniversaries are special
  if (days > 365 && days % 365 === 0) {
    return true;
  }
  return false;
}

/**
 * Check if we should celebrate this streak day at all.
 * Returns true for ALL days >= 1 (every day deserves recognition!)
 */
export function isDailyStreakMilestone(days: number): boolean {
  return days >= 1;
}

/**
 * Get a celebratory message for a streak day.
 * Special milestones get custom messages; regular days get encouraging quick messages.
 */
function getStreakMessage(days: number): {
  headline: string;
  subheadline: string;
  isSpecial: boolean;
} {
  const isSpecial = isSpecialStreakMilestone(days);

  // Special milestone messages
  if (days === 3) {
    return {
      headline: '3 Day Streak! 🌱',
      subheadline: "You're building momentum. Three days of showing up!",
      isSpecial: true,
    };
  }
  if (days === 7) {
    return {
      headline: '1 Week Streak! 🔥',
      subheadline: "A full week of progress. You're on fire!",
      isSpecial: true,
    };
  }
  if (days === 14) {
    return {
      headline: '2 Week Streak! 💪',
      subheadline: 'Two weeks strong! This is becoming a habit.',
      isSpecial: true,
    };
  }
  if (days === 21) {
    return {
      headline: '3 Week Streak! 🚀',
      subheadline: 'They say it takes 21 days to form a habit. You did it!',
      isSpecial: true,
    };
  }
  if (days === 30) {
    return {
      headline: '30 Day Streak! 🏆',
      subheadline: "A whole month of consistency. You're unstoppable!",
      isSpecial: true,
    };
  }
  if (days === 50) {
    return {
      headline: '50 Day Streak! ⭐',
      subheadline: 'Fifty days! Your dedication is truly inspiring.',
      isSpecial: true,
    };
  }
  if (days === 75) {
    return {
      headline: '75 Day Streak! 💎',
      subheadline: "75 days of showing up. That's real commitment!",
      isSpecial: true,
    };
  }
  if (days === 100) {
    return {
      headline: '100 Day Streak! 🎯',
      subheadline: 'Triple digits! 100 days of progress. Legendary!',
      isSpecial: true,
    };
  }
  if (days === 150) {
    return {
      headline: '150 Day Streak! 🌟',
      subheadline: "150 days! You're in the top tier of dedicated users.",
      isSpecial: true,
    };
  }
  if (days === 200) {
    return {
      headline: '200 Day Streak! 👑',
      subheadline: "200 days of consistency. You're royalty!",
      isSpecial: true,
    };
  }
  if (days === 365) {
    return {
      headline: '1 Year Streak! 🎉',
      subheadline: 'ONE FULL YEAR of showing up every single day. Incredible!',
      isSpecial: true,
    };
  }

  // Yearly anniversaries (730, 1095, 1460, etc.)
  if (days % 365 === 0) {
    const years = Math.floor(days / 365);
    return {
      headline: `${years} Year${years === 1 ? '' : 's'} Streak! 🎊`,
      subheadline: `${years} year${years === 1 ? '' : 's'} of daily dedication. You're a legend!`,
      isSpecial: true,
    };
  }

  // Every 100 days after 365
  if (days > 365 && days % 100 === 0) {
    return {
      headline: `${days} Day Streak! 🔥`,
      subheadline: `${days} days of showing up! Your consistency is remarkable.`,
      isSpecial: true,
    };
  }

  // Regular daily celebrations (quick, encouraging)
  // Vary the message based on the day to keep it fresh
  const encouragements = [
    { headline: `Day ${days}! ✨`, subheadline: 'Keep it going!' },
    { headline: `Day ${days}! 💫`, subheadline: "You're on a roll!" },
    { headline: `Day ${days}! ⚡`, subheadline: 'Another day, another win!' },
    { headline: `Day ${days}! 🌟`, subheadline: 'Consistency is key!' },
    { headline: `Day ${days}! 💪`, subheadline: "You've got this!" },
    { headline: `Day ${days}! 🎯`, subheadline: 'Staying on target!' },
  ];
  const picked = encouragements[days % encouragements.length];
  return { ...picked, isSpecial: false };
}

/**
 * Trigger a daily streak celebration.
 * - Regular days: Quick auto-dismiss celebration (low priority)
 * - Special milestones: Bigger celebration with manual dismiss (high priority)
 */
export function celebrateDailyStreak(days: number, onDismiss?: () => void) {
  if (!isDailyStreakMilestone(days)) {
    return;
  }

  const store = useCelebrationStore.getState();
  const celebrationId = `daily-streak-${days}`;

  if (store.hasBeenShown(celebrationId)) {
    return;
  }

  const { headline, subheadline, isSpecial } = getStreakMessage(days);

  store.celebrate({
    id: celebrationId,
    kind: 'dailyStreak',
    headline,
    subheadline,
    // Special milestones: high priority, manual dismiss
    // Regular days: low priority (drops during conflicts), auto-dismiss
    priority: isSpecial ? 'high' : 'low',
    autoDismissMs: isSpecial ? undefined : 2500,
    onDismiss,
  });
}

/**
 * Trigger an all activities done celebration
 */
export function celebrateAllActivitiesDone(onDismiss?: () => void) {
  useCelebrationStore.getState().celebrate({
    id: `all-done-${Date.now()}`,
    kind: 'allActivitiesDone',
    headline: 'All Clear! 🎉',
    subheadline: "You knocked out everything on your list. Time to plan what's next!",
    autoDismissMs: 4000,
    priority: 'low', // Low priority - drop if conflicts exist
    onDismiss,
  });
}

/**
 * Celebrate when the user's streak was saved by grace (free day or shield).
 * This educates the user about the grace system and encourages consistency.
 */
export function celebrateStreakSaved(
  streakDays: number,
  graceDaysUsed: number,
  remainingFreeGrace: number,
  remainingShields: number,
  onDismiss?: () => void,
) {
  const store = useCelebrationStore.getState();
  // Only show once per session (don't spam if they miss multiple days and come back)
  const celebrationId = `streak-saved-${new Date().toISOString().slice(0, 10)}`;

  if (store.hasBeenShown(celebrationId)) {
    return;
  }

  const graceDescription =
    graceDaysUsed === 1 ? '1 grace day' : `${graceDaysUsed} grace days`;

  let subheadline = `You missed ${graceDaysUsed === 1 ? 'a day' : `${graceDaysUsed} days`}, but we've got your back! Your ${streakDays}-day streak lives on.`;

  // Add info about remaining grace
  const totalRemaining = remainingFreeGrace + remainingShields;
  if (totalRemaining === 0) {
    subheadline += " ⚠️ You're out of grace days until next week - don't miss tomorrow!";
  } else if (totalRemaining === 1) {
    subheadline += ' You have 1 grace day left this week.';
  } else {
    subheadline += ` You have ${totalRemaining} grace days remaining.`;
  }

  store.celebrate({
    id: celebrationId,
    kind: 'streakSaved',
    headline: 'Streak Saved! 🛡️',
    subheadline,
    ctaLabel: "I'm back!",
    autoDismissMs: 0, // Require tap to dismiss - this is educational
    priority: 'high', // Important to inform user about grace usage
    onDismiss,
  });
}

/**
 * Record a show-up and trigger daily streak celebration if hitting a milestone.
 * Use this wrapper instead of calling recordShowUp directly when you want
 * streak celebrations.
 */
export function recordShowUpWithCelebration() {
  const appStore = useAppStore.getState();
  const prevStreak = appStore.currentShowUpStreak ?? 0;
  const prevDate = appStore.lastShowUpDate;
  const prevGrace = appStore.streakGrace ?? {
    freeDaysRemaining: 1,
    lastFreeResetWeek: null,
    shieldsAvailable: 0,
    graceDaysUsed: 0,
  };

  // Record the show-up
  appStore.recordShowUp();

  // Get updated state
  const nextState = useAppStore.getState();
  const nextStreak = nextState.currentShowUpStreak ?? 0;
  const nextDate = nextState.lastShowUpDate;
  const nextGrace = nextState.streakGrace ?? prevGrace;

  // Only celebrate if the date changed (i.e., this is a new day)
  if (prevDate !== nextDate) {
    // Check if grace was used to save the streak
    if (nextGrace.graceDaysUsed > 0 && nextStreak > 1) {
      // Grace was used! Show the "streak saved" celebration first
      setTimeout(() => {
        celebrateStreakSaved(
          nextStreak,
          nextGrace.graceDaysUsed,
          nextGrace.freeDaysRemaining,
          nextGrace.shieldsAvailable,
        );
      }, 500);
    } else if (nextStreak > prevStreak) {
      // Normal streak increment - celebrate the milestone
      setTimeout(() => {
        celebrateDailyStreak(nextStreak);
      }, 500);
    }
  }
}
