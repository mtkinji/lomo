import { create } from 'zustand';
import { persist, createJSONStorage, subscribeWithSelector } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState as RNAppState, InteractionManager } from 'react-native';
import {
  DEFAULT_DAILY_FOCUS_TIME,
  DAILY_FOCUS_TIME_ROUND_MINUTES,
  DEFAULT_GOAL_NUDGE_TIME,
} from '../services/notifications/defaultTimes';
import { roundDownToIntervalTimeHHmm } from '../services/notifications/timeRounding';
import Constants from 'expo-constants';
import {
  Activity,
  ActivityType,
  ActivityView,
  Arc,
  ArcProposalFeedback,
  Force,
  ForceLevel,
  Goal,
  GoalDraft,
  UserProfile,
} from '../domain/types';
import { getArcHeroUriById } from '../domain/curatedHeroLibrary';
import { normalizeActivity } from '../domain/normalizeActivity';
import {
  FREE_GENERATIVE_CREDITS_PER_MONTH,
  PRO_GENERATIVE_CREDITS_PER_MONTH,
  getMonthKey,
} from '../domain/generativeCredits';
import type { CelebrationKind, MediaRole } from '../services/gifs';
import type { SoundscapeId } from '../services/soundscape';
import { useToastStore } from './useToastStore';
import { useCreditsInterstitialStore } from './useCreditsInterstitialStore';

export type LlmModel = 'gpt-4o-mini' | 'gpt-4o' | 'gpt-5.1';

type Updater<T> = (item: T) => T;

type DomainState = Pick<AppState, 'arcs' | 'goals' | 'activities' | 'activityTagHistory'>;

const DOMAIN_STORAGE_KEY = 'kwilt-domain-v1';
// In dev, JS reloads can interrupt scheduled persistence; keep the debounce short and avoid
// InteractionManager deferrals so domain objects survive quick reloads.
const DOMAIN_PERSIST_DEBOUNCE_MS = __DEV__ ? 250 : 3000;

let domainPersistTimeout: ReturnType<typeof setTimeout> | null = null;
let domainPersistInFlight = false;
let domainPersistQueued: DomainState | null = null;

const persistDomainStateNow = async (snapshot: DomainState): Promise<void> => {
  const serialized = JSON.stringify(snapshot);
  await AsyncStorage.setItem(DOMAIN_STORAGE_KEY, serialized);
};

const schedulePersistDomainState = (domain: DomainState) => {
  domainPersistQueued = domain;

  // Critical safety: never write to `DOMAIN_STORAGE_KEY` until the domain has hydrated.
  // This prevents unrelated startup store writes (notifications, entitlements, etc.) from
  // overwriting the user's domain snapshot with the initial empty arrays on refresh.
  //
  // We still keep the latest snapshot queued so early user actions are persisted as soon
  // as hydration completes (see the `domainHydrated` subscription near the bottom).
  if (useAppStore.getState().domainHydrated !== true) {
    return;
  }

  if (domainPersistTimeout) clearTimeout(domainPersistTimeout);
  domainPersistTimeout = setTimeout(() => {
    const snapshot = domainPersistQueued;
    domainPersistQueued = null;
    domainPersistTimeout = null;
    if (!snapshot) return;

    // Avoid back-to-back multi-second JSON.stringify calls; keep only the latest.
    if (domainPersistInFlight) {
      domainPersistQueued = snapshot;
      return;
    }

    domainPersistInFlight = true;
    const persistNow = async () => {
      try {
        await persistDomainStateNow(snapshot);
      } catch (error) {
        if (__DEV__) {
          console.warn('[store] Failed to persist domain snapshot', error);
        }
        // best-effort only; keep the snapshot queued so a later attempt can retry.
        domainPersistQueued = snapshot;
      } finally {
        domainPersistInFlight = false;
        // Flush the latest queued state soon.
        if (domainPersistQueued) schedulePersistDomainState(domainPersistQueued);
      }
    };

    if (__DEV__) {
      void persistNow();
      return;
    }

    InteractionManager.runAfterInteractions(() => {
      void persistNow();
    });
  }, DOMAIN_PERSIST_DEBOUNCE_MS);
};

const flushPersistDomainState = () => {
  const state = useAppStore.getState();
  // Critical safety: during cold start, domain objects are loaded asynchronously from
  // `DOMAIN_STORAGE_KEY`. Do NOT flush an empty snapshot before hydration completes,
  // otherwise a transient "empty store" moment can overwrite the user's saved domain.
  //
  // If we *do* have a queued domain snapshot (i.e. real mutations occurred), allow flush.
  const queued = domainPersistQueued;
  if (!queued && state.domainHydrated !== true) return;

  if (domainPersistTimeout) {
    clearTimeout(domainPersistTimeout);
    domainPersistTimeout = null;
  }

  domainPersistQueued = null;
  const snapshot: DomainState =
    queued ?? {
      arcs: state.arcs ?? [],
      goals: state.goals ?? [],
      activities: state.activities ?? [],
      activityTagHistory: state.activityTagHistory ?? {},
    };

  // Best-effort: on background/exit, favor durability over throttling.
  void persistDomainStateNow(snapshot).catch((error) => {
    if (__DEV__) {
      console.warn('[store] Failed to flush domain snapshot', error);
    }
  });
};

export type ActivityTagUsage = {
  activityId: string;
  activityTitle: string;
  activityType: ActivityType;
  usedAt: string;
};

export type ActivityTagHistoryEntry = {
  tag: string;
  firstUsedAt: string;
  lastUsedAt: string;
  totalUses: number;
  /**
   * Recent activity examples where this tag was used. Capped to keep persisted
   * state + AI context compact.
   */
  recentUses: ActivityTagUsage[];
};

export type ActivityTagHistoryIndex = Record<string, ActivityTagHistoryEntry>;

const normalizeTagKey = (tag: string) => tag.trim().toLowerCase();

const normalizeTagsForCompare = (tags: unknown): string[] => {
  const arr = Array.isArray(tags) ? tags : [];
  return arr
    .filter((t): t is string => typeof t === 'string')
    .map((t) => normalizeTagKey(t))
    .filter(Boolean)
    .sort();
};

const tagsEqualForCompare = (a: unknown, b: unknown) => {
  const aa = normalizeTagsForCompare(a);
  const bb = normalizeTagsForCompare(b);
  if (aa.length !== bb.length) return false;
  for (let i = 0; i < aa.length; i += 1) {
    if (aa[i] !== bb[i]) return false;
  }
  return true;
};

const recordTagUsageForActivity = (
  index: ActivityTagHistoryIndex | null | undefined,
  activity: Activity,
  atIso: string,
): ActivityTagHistoryIndex => {
  const tags = Array.isArray(activity.tags) ? activity.tags : [];
  if (tags.length === 0) return index ?? {};

  const base = index ?? {};
  let changed = false;
  const nextIndex: ActivityTagHistoryIndex = { ...base };

  const MAX_RECENT_USES_PER_TAG = 10;

  tags.forEach((raw) => {
    if (typeof raw !== 'string') return;
    const trimmed = raw.trim();
    if (!trimmed) return;
    const key = normalizeTagKey(trimmed);
    if (!key) return;

    const existing = nextIndex[key];
    const tagLabel = existing?.tag ?? trimmed;
    const usage: ActivityTagUsage = {
      activityId: activity.id,
      activityTitle: activity.title,
      activityType: activity.type,
      usedAt: atIso,
    };

    if (!existing) {
      changed = true;
      nextIndex[key] = {
        tag: tagLabel,
        firstUsedAt: atIso,
        lastUsedAt: atIso,
        totalUses: 1,
        recentUses: [usage],
      };
      return;
    }

    // Update existing entry
    const prevUses = Array.isArray(existing.recentUses) ? existing.recentUses : [];
    const existingUseIdx = prevUses.findIndex((u) => u.activityId === activity.id);
    const nextUses =
      existingUseIdx >= 0
        ? prevUses.map((u, idx) => (idx === existingUseIdx ? usage : u))
        : [usage, ...prevUses];

    const cappedUses = nextUses.slice(0, MAX_RECENT_USES_PER_TAG);

    // Always update lastUsedAt + metadata for the activity row if present.
    // Increment totalUses when it's a new usage event for this activity.
    const nextTotalUses = existingUseIdx >= 0 ? existing.totalUses : existing.totalUses + 1;

    // Detect whether anything changed to avoid unnecessary state churn.
    const shouldUpdate =
      existing.lastUsedAt !== atIso ||
      existing.tag !== tagLabel ||
      existing.totalUses !== nextTotalUses ||
      cappedUses !== prevUses;

    if (shouldUpdate) {
      changed = true;
      nextIndex[key] = {
        ...existing,
        tag: tagLabel,
        lastUsedAt: atIso,
        totalUses: nextTotalUses,
        recentUses: cappedUses,
      };
    }
  });

  return changed ? nextIndex : base;
};

export type AgentHostAction =
  | {
      id: string;
      createdAt: string;
      objectType: 'activity';
      objectId: string;
      type: 'openFocusMode';
      minutes?: number;
    }
  | {
      id: string;
      createdAt: string;
      objectType: 'activity';
      objectId: string;
      type: 'openCalendar';
      startAtISO?: string;
      durationMinutes?: number;
    }
  | {
      id: string;
      createdAt: string;
      objectType: 'activity';
      objectId: string;
      type: 'confirmStepCompletion';
      stepIndex: number;
      completed: boolean;
    };

export type EnqueueAgentHostAction =
  | {
      objectType: 'activity';
      objectId: string;
      type: 'openFocusMode';
      minutes?: number;
    }
  | {
      objectType: 'activity';
      objectId: string;
      type: 'openCalendar';
      startAtISO?: string;
      durationMinutes?: number;
    }
  | {
      objectType: 'activity';
      objectId: string;
      type: 'confirmStepCompletion';
      stepIndex: number;
      completed: boolean;
    };

export type AuthIdentity = {
  userId: string;
  email?: string;
  name?: string;
  avatarUrl?: string;
  provider?: string;
};

export type SchedulingApplyUndoRecord = {
  appliedAtMs: number;
  items: Array<{
    activityId: string;
    calendarId: string;
    eventId: string;
    startAtISO: string;
    endAtISO: string;
    prevScheduledAt: string | null | undefined;
    prevCalendarId: string | null | undefined;
    domain: string;
  }>;
  /**
   * Optional domain→calendar mapping that should be persisted when the user applies.
   */
  domainCalendarMappingApplied?: Record<string, string>;
};

export type DailyPlanRecord = {
  plannedAtMs: number;
  committedActivityIds: string[];
};

export type DailyActivityResolutionRecord = {
  /**
   * Activity ids explicitly dismissed for this dateKey ("not today").
   * This is intentionally per-day and does not mutate the Activity due date.
   */
  dismissedActivityIds: string[];
};

interface AppState {
  forces: Force[];
  arcs: Arc[];
  goals: Goal[];
  activities: Activity[];
  /**
   * Persisted index of tags used across all Activities (even if an Activity is later deleted),
   * with lightweight metadata about where they were used. This is fed to AI so it can reuse
   * the user's existing tagging language before inventing new tags.
   */
  activityTagHistory: ActivityTagHistoryIndex;
  /**
   * Domain objects (arcs/goals/activities/tag history) are persisted separately under
   * `DOMAIN_STORAGE_KEY` for performance. This flag indicates that the domain snapshot
   * has finished loading (or we have definitively decided there's nothing to load yet).
   *
   * Screens that depend on domain objects should avoid showing scary "not found" empty
   * states until this is true, because the arrays start empty on cold start.
   */
  domainHydrated: boolean;
  /**
   * Dev-only feature flags / experiments. Persisted so we can A/B UX patterns
   * locally across reloads, but always gated behind `__DEV__` at the callsite.
   */
  devBreadcrumbsEnabled: boolean;
  devObjectDetailHeaderV2Enabled: boolean;
  devArcDetailDebugLoggingEnabled: boolean;
  /**
   * Dev-only nav experiment: show a hamburger menu affordance in primary headers
   * to open the Root Drawer (left-rail) even when bottom tabs are the default shell.
   */
  devNavDrawerMenuEnabled: boolean;
  /**
   * App-level notification preferences and OS permission status.
   * Used by the notifications service to decide what to schedule.
   */
  notificationPreferences: {
    notificationsEnabled: boolean;
    osPermissionStatus: 'notRequested' | 'authorized' | 'denied' | 'restricted';
    allowActivityReminders: boolean;
    allowDailyShowUp: boolean;
    dailyShowUpTime: string | null;
    allowDailyFocus: boolean;
    dailyFocusTime: string | null;
    /**
     * Auto: the app can tune dailyFocusTime based on observed Focus completion times.
     * Manual: user explicitly set the time (do not auto-tune).
     */
    dailyFocusTimeMode?: 'auto' | 'manual';
    allowGoalNudges: boolean;
    goalNudgeTime: string | null;
    allowStreakAndReactivation: boolean;
  };
  /**
   * Location-based completion offers (arrive/leave prompts).
   * Stored as lightweight preferences so FTUE + settings can gate the experience.
   */
  locationOfferPreferences: {
    enabled: boolean;
    osPermissionStatus: 'notRequested' | 'authorized' | 'denied' | 'restricted' | 'unavailable';
    dailyCap: number;
    globalMinSpacingMs: number;
    defaultCooldownMs: number;
  };
  /**
   * Which "Send to…" destinations are enabled for the user.
   *
   * - Built-in retailers (Amazon/Home Depot/Instacart/DoorDash) can be toggled here.
   * - Installed destinations (e.g. Cursor) are controlled by their own `is_enabled` flag.
   */
  enabledSendToDestinations: Record<string, boolean>;
  setSendToDestinationEnabled: (kind: string, enabled: boolean) => void;
  toggleSendToDestinationEnabled: (kind: string) => void;
  /**
   * Last used Focus mode duration (in minutes). Used as the default suggestion
   * across sessions so Focus feels sticky/personal.
   */
  lastFocusMinutes: number | null;
  /**
   * Whether the in-app soundscape should play during Focus sessions.
   */
  soundscapeEnabled: boolean;
  /**
   * One-time hint: we can't reliably detect system volume in Expo-managed JS, so show a gentle
   * "turn up your volume if you don't hear it" toast once when Focus audio starts.
   */
  hasShownFocusSoundscapeVolumeHint: boolean;
  /**
   * Whether in-app haptics are enabled (semantic haptics layer).
   * Default: true.
   */
  hapticsEnabled: boolean;
  /**
   * Whether activity search should include completed & closed activities.
   * Default: false.
   */
  activitySearchIncludeCompleted: boolean;
  setActivitySearchIncludeCompleted: (include: boolean) => void;
  /**
   * Whether activity search should show the completion check circle.
   * Default: false.
   */
  activitySearchShowCheckCircle: boolean;
  setActivitySearchShowCheckCircle: (show: boolean) => void;
  /**
   * Whether activity search should show the metadata row.
   * Default: false.
   */
  activitySearchShowMeta: boolean;
  setActivitySearchShowMeta: (show: boolean) => void;
  /**
   * Selected soundscape track id for Focus sessions.
   */
  soundscapeTrackId: SoundscapeId;
  /**
   * Simple engagement state for show-up streaks and recent activity.
   */
  lastShowUpDate: string | null;
  currentShowUpStreak: number;
  lastActiveDate: string | null;
  /**
   * Streak grace system (like Duolingo's streak freeze).
   * - Everyone gets 1 free grace day per week (auto-applied on miss)
   * - Pro users can earn "Streak Shields" for additional protection
   * - Grace is consumed automatically when you return after missing a day
   */
  streakGrace: {
    /** How many grace days available this week (resets every Monday, max 1 for free users) */
    freeDaysRemaining: number;
    /** ISO week key (YYYY-Www) when free days last reset */
    lastFreeResetWeek: string | null;
    /** Streak Shields: Pro users can earn these, stackable up to 3 */
    shieldsAvailable: number;
    /** Days "covered" by grace since last show-up (for UI messaging) */
    graceDaysUsed: number;
  };
  /**
   * Lightweight lifecycle counters used for post-activation nudges (e.g. widgets).
   * Best-effort only; do not use for billing/security.
   */
  appOpenCount: number;
  firstOpenedAtMs: number | null;
  lastOpenedAtMs: number | null;
  /**
   * iOS widget adoption nudge state machine.
   */
  widgetNudge: {
    status: 'notEligible' | 'eligible' | 'shown' | 'dismissed' | 'completed';
    shownCount: number;
    modalShownCount: number;
    dismissedCount: number;
    lastShownAtMs: number | null;
    cooldownUntilMs: number | null;
    completedAtMs: number | null;
    completedSource: string | null;
  };
  /**
   * Focus mode streak: counts days where the user completes at least one *full*
   * Focus session (timer reaches zero). This is independent from "show up".
   *
   * Dates are stored as local calendar keys: YYYY-MM-DD (local time).
   */
  lastCompletedFocusSessionDate: string | null;
  /**
   * ISO timestamp (local device clock) of the most recent completed Focus session.
   * Used for auto-tuning daily focus reminder time-of-day.
   */
  lastCompletedFocusSessionAtIso: string | null;
  currentFocusStreak: number;
  bestFocusStreak: number;
  /**
   * When set, this is the goal that was most recently created by the
   * first-time onboarding flow so we can land the user directly on it.
   */
  goalRecommendations: Record<string, GoalDraft[]>;
  /**
   * Lightweight global count of Plan recommendations for the currently selected day
   * (best-effort). Used for bottom-bar badge and other shell-level affordances.
   */
  planRecommendationsCount: number;
  arcFeedback: ArcProposalFeedback[];
  /**
   * Runtime-only signed-in identity derived from Supabase Auth session.
   * Intentionally separate from `userProfile` (local coaching profile).
   */
  authIdentity: AuthIdentity | null;
  userProfile: UserProfile | null;
  llmModel: LlmModel;
  /**
   * Local-first "generative credits" ledger (monthly, no rollover).
   * Used as a UX/cost-safety layer until the AI proxy + quotas backend exists.
   */
  generativeCredits: {
    monthKey: string;
    usedThisMonth: number;
  };
  /**
   * Bonus monthly AI credits (reward layer).
   * Additive to the base monthly allowance (Free/Pro) for the current month only.
   */
  bonusGenerativeCredits: {
    monthKey: string;
    bonusThisMonth: number;
  };
  /**
   * One-time flag indicating that the user has completed the first-time
   * onboarding flow. Used to avoid re-triggering FTUE on subsequent launches.
   */
  hasCompletedFirstTimeOnboarding: boolean;
  /**
   * One-time reward flag: user completed onboarding (Arc + Goal + ≥1 Activity),
   * and we've granted the "exit with 50/50" top-up + shown the reward reveal.
   */
  hasReceivedOnboardingCompletionReward: boolean;
  /**
   * When set, this is the Arc that was most recently created by the
   * first-time onboarding flow so we can land the user directly on it and
   * show a one-time celebration.
   */
  lastOnboardingArcId: string | null;
  lastOnboardingGoalId: string | null;
  /**
   * One-time flag so we only show the "first goal created" celebration
   * the first time the user lands on the onboarding-created goal.
   */
  hasSeenFirstGoalCelebration: boolean;
  /**
   * One-time flag so we only show the "first Arc created" celebration the
   * first time the user lands on the onboarding-created Arc.
   */
  hasSeenFirstArcCelebration: boolean;
  /**
   * Local date key (YYYY-MM-DD) of when the daily Plan kickoff drawer was last shown.
   */
  lastKickoffShownDateKey: string | null;
  /**
   * Per-day planning records for the Plan surface.
   */
  dailyPlanHistory: Record<string, DailyPlanRecord>;
  /**
   * Per-day resolution records (e.g. dismissed-for-today).
   */
  dailyActivityResolutions: Record<string, DailyActivityResolutionRecord>;
  /**
   * Most recent Scheduling Assist apply operation, stored so the user can Undo.
   * Best-effort: event deletion can fail if permissions change or the event is edited externally.
   */
  lastSchedulingApply: SchedulingApplyUndoRecord | null;
  /**
   * Dismissal flag for the post-onboarding "create your first goal" guide.
   * This is intentionally separate from the celebration flags so users can
   * dismiss guidance without losing celebrations (and vice versa).
   */
  hasDismissedOnboardingGoalGuide: boolean;
  /**
   * Dismissal flag for the post-onboarding "add activities" guide shown on the
   * onboarding-created goal.
   */
  hasDismissedOnboardingActivitiesGuide: boolean;
  /**
   * Dismissal flag for the post-onboarding "plan ready" handoff shown once the
   * onboarding-created goal has at least one Activity.
   */
  hasDismissedOnboardingPlanReadyGuide: boolean;
  /**
   * Post-onboarding handoff: when a new goal is created after onboarding is complete,
   * we land the user on the Goal's Plan tab and show a one-time guide inviting them
   * to create a plan (activities) with AI.
   */
  pendingPostGoalPlanGuideGoalId: string | null;
  /**
   * Per-goal dismissal state for the post-goal "create a plan" guide so it only
   * shows once per newly-created goal.
   */
  dismissedPostGoalPlanGuideGoalIds: Record<string, true>;
  /**
   * Global flag indicating the user has seen the post-goal "create a plan" coachmark (tooltip) at least once.
   * Once true, the coachmark will not show again, though the bottom guide still will for new goals.
   */
  hasSeenPostGoalPlanCoachmark: boolean;
  setHasSeenPostGoalPlanCoachmark: (hasSeen: boolean) => void;
  /**
   * Dismissal flag for the first-time Goal detail "Vectors for this goal" coachmark.
   * Explains how balancing vectors leads to more sustainable goals.
   */
  hasDismissedGoalVectorsGuide: boolean;
  /**
   * Dismissal flag for the first-time Activities list guide (views/filter/sort + card affordances).
   * This is intentionally separate from onboarding-only guidance: users can discover Activities
   * later, outside the E2E FTUE.
   */
  hasDismissedActivitiesListGuide: boolean;
  /**
   * Dismissal flag for the first-time Activity detail guide.
   */
  hasDismissedActivityDetailGuide: boolean;
  /**
   * Persisted UI preference: last expansion state for Activity detail sections.
   * Applies at the object-type level (all Activities), not per-Activity.
   *
   * Default: collapsed (false) for both sections.
   */
  activityDetailPlanExpanded: boolean;
  activityDetailDetailsExpanded: boolean;
  /**
   * Dismissal flag for the first-time Arc detail "explore" coachmarks
   * (banner edit, tabs navigation, and Development Insights).
   */
  hasDismissedArcExploreGuide: boolean;
  /**
   * One-time FTUE evangelism/share prompt. Triggered after the user creates
   * their first onboarding Activities (social accountability + referral hook).
   */
  hasSeenOnboardingSharePrompt: boolean;
  /**
   * One-time hero interstitial shown when the user first attempts to invite/share a goal
   * while signed out. Teaches why sign-in is required and what sharing includes.
   */
  hasSeenShareSignInHero: boolean;
  /**
   * One-time educational interstitial teaching AI credits during FTUE.
   */
  hasSeenCreditsEducationInterstitial: boolean;
  /**
   * Local idempotence cache for referral redemptions.
   * Server remains authoritative; this just avoids repeated redemption calls
   * if the app is opened multiple times via the same link.
   */
  redeemedReferralCodes: Record<string, true>;
  /**
   * One-time coachmark for AI writing refine: after the first successful refine,
   * we teach users that the header Undo button restores the prior text.
   */
  hasSeenRefineUndoCoachmark: boolean;
  /**
   * Saved configurations for the Activities list. Includes both system views
   * like "Default view" and user-created custom views.
   */
  activityViews: ActivityView[];
  /**
   * The currently active Activities view. When unset, the app falls back to
   * the "default" view entry in `activityViews`.
   */
  activeActivityViewId: string | null;
  /**
   * Optional context binding (e.g. from iOS Focus Filters) used to bias "Next Up"
   * and (optionally) narrow the Activities canvas to a single Goal.
   *
   * Stored as a Goal id; null means no context binding is active.
   */
  focusContextGoalId: string | null;
  /**
   * Per-user denylist of celebration GIF ids that should never be shown again.
   * Populated via lightweight "Not quite right" feedback controls.
   */
  blockedCelebrationGifIds: string[];
  /**
   * Per-user cache of specifically liked celebration GIFs so we can reuse
   * them without hitting the network every time.
   */
  likedCelebrationGifs: {
    id: string;
    url: string;
    role: MediaRole;
    kind: CelebrationKind;
  }[];
  /**
   * Queue of agent-requested host actions (open sheets, prefill drafts, etc.).
   * These are consumed by screens that own the relevant UI surfaces.
   */
  agentHostActions: AgentHostAction[];
  enqueueAgentHostAction: (action: EnqueueAgentHostAction) => void;
  consumeAgentHostActions: (filter: { objectType: AgentHostAction['objectType']; objectId: string }) => AgentHostAction[];
  /**
   * Best-effort lifecycle counter updates. Call on cold start rehydrate and when the app
   * returns to foreground.
   */
  recordAppOpen: (reason: 'rehydrate' | 'foreground') => void;
  /**
   * Widget nudge state transitions.
   */
  markWidgetPromptShown: (surface: 'inline' | 'modal') => void;
  dismissWidgetPrompt: (surface: 'inline' | 'modal') => void;
  completeWidgetNudge: (source: string) => void;
  /**
   * Update the local date key (YYYY-MM-DD) of when the daily Plan kickoff drawer was last shown.
   */
  updateLastKickoffShownDateKey: (dateKey: string) => void;
  /**
   * Update notification preferences in a single place so the notifications
   * service and settings screens stay in sync.
   */
  setNotificationPreferences: (
    updater:
      | ((
          current: AppState['notificationPreferences'],
        ) => AppState['notificationPreferences'])
      | AppState['notificationPreferences'],
  ) => void;
  setLocationOfferPreferences: (
    updater:
      | ((current: AppState['locationOfferPreferences']) => AppState['locationOfferPreferences'])
      | AppState['locationOfferPreferences'],
  ) => void;
  setLastFocusMinutes: (minutes: number) => void;
  setSoundscapeEnabled: (enabled: boolean) => void;
  setHasShownFocusSoundscapeVolumeHint: (shown: boolean) => void;
  setHapticsEnabled: (enabled: boolean) => void;
  setSoundscapeTrackId: (trackId: SoundscapeId) => void;
  setFocusContextGoalId: (goalId: string | null) => void;
  /**
   * Record that the user "showed up" today by visiting Today or completing
   * an Activity. Updates streak and lastActiveDate.
   */
  recordShowUp: () => void;
  /**
   * Record that the user completed a full Focus session (timer reached 0).
   * Updates the daily Focus streak (at most once per calendar day).
   */
  recordCompletedFocusSession: (params?: { completedAtMs?: number }) => void;
  /**
   * Explicitly reset the show-up streak (used by future engagement flows).
   */
  resetShowUpStreak: () => void;
  resetFocusStreak: () => void;
  /**
   * Award streak shields to the user (Pro feature, max 3 shields at a time).
   * Shields protect the streak when you miss a day (consumed after free grace).
   */
  addStreakShields: (count: number) => void;
  addArc: (arc: Arc) => void;
  updateArc: (arcId: string, updater: Updater<Arc>) => void;
  removeArc: (arcId: string) => void;
  addGoal: (goal: Goal) => void;
  updateGoal: (goalId: string, updater: Updater<Goal>) => void;
  removeGoal: (goalId: string) => void;
  addActivity: (activity: Activity) => void;
  updateActivity: (activityId: string, updater: Updater<Activity>) => void;
  /**
   * Bulk-update orderIndex for a list of activities in a single state update.
   * Accepts an array of activity IDs in the desired order; each activity's
   * orderIndex is set to its position in the array.
   */
  reorderActivities: (orderedIds: string[]) => void;
  removeActivity: (activityId: string) => void;
  setGoalRecommendations: (arcId: string, goals: GoalDraft[]) => void;
  dismissGoalRecommendation: (arcId: string, goalTitle: string) => void;
  clearGoalRecommendations: (arcId: string) => void;
  setPlanRecommendationsCount: (count: number) => void;
  addArcFeedback: (feedback: ArcProposalFeedback) => void;
  setAuthIdentity: (identity: AuthIdentity) => void;
  clearAuthIdentity: () => void;
  setUserProfile: (profile: UserProfile) => void;
  updateUserProfile: (updater: (current: UserProfile) => UserProfile) => void;
  clearUserProfile: () => void;
  setLlmModel: (model: LlmModel) => void;
  tryConsumeGenerativeCredit: (params: {
    tier: 'free' | 'pro';
  }) => { ok: boolean; remaining: number; limit: number };
  setBonusGenerativeCreditsThisMonth: (bonusThisMonth: number) => void;
  addBonusGenerativeCreditsThisMonth: (bonusDelta: number) => void;
  /**
   * Dev-only helpers to make monetization/quota testing deterministic.
   * (No-op outside __DEV__.)
   */
  devResetGenerativeCredits: () => void;
  devSetGenerativeCreditsUsedThisMonth: (usedThisMonth: number) => void;
  setLastOnboardingArcId: (arcId: string | null) => void;
  setHasSeenFirstArcCelebration: (seen: boolean) => void;
  setLastOnboardingGoalId: (goalId: string | null) => void;
  setHasSeenFirstGoalCelebration: (seen: boolean) => void;
  setLastKickoffShownDateKey: (dateKey: string | null) => void;
  setLastSchedulingApply: (record: SchedulingApplyUndoRecord | null) => void;
  setDailyPlanRecord: (dateKey: string, record: DailyPlanRecord | null) => void;
  addDailyPlanCommitment: (dateKey: string, activityId: string) => void;
  removeDailyPlanCommitment: (dateKey: string, activityId: string) => void;
  dismissActivityForDay: (dateKey: string, activityId: string) => void;
  undismissActivityForDay: (dateKey: string, activityId: string) => void;
  setHasSeenOnboardingSharePrompt: (seen: boolean) => void;
  setHasSeenShareSignInHero: (seen: boolean) => void;
  setHasSeenCreditsEducationInterstitial: (seen: boolean) => void;
  setHasSeenRefineUndoCoachmark: (seen: boolean) => void;
  setHasDismissedOnboardingGoalGuide: (dismissed: boolean) => void;
  setHasDismissedOnboardingActivitiesGuide: (dismissed: boolean) => void;
  setHasDismissedOnboardingPlanReadyGuide: (dismissed: boolean) => void;
  setPendingPostGoalPlanGuideGoalId: (goalId: string | null) => void;
  dismissPostGoalPlanGuideForGoal: (goalId: string) => void;
  setHasDismissedGoalVectorsGuide: (dismissed: boolean) => void;
  setHasDismissedActivitiesListGuide: (dismissed: boolean) => void;
  setHasDismissedActivityDetailGuide: (dismissed: boolean) => void;
  setHasDismissedArcExploreGuide: (dismissed: boolean) => void;
  setActivityDetailPlanExpanded: (expanded: boolean) => void;
  setActivityDetailDetailsExpanded: (expanded: boolean) => void;
  toggleActivityDetailPlanExpanded: () => void;
  toggleActivityDetailDetailsExpanded: () => void;
  setActiveActivityViewId: (viewId: string | null) => void;
  addActivityView: (view: ActivityView) => void;
  updateActivityView: (viewId: string, updater: Updater<ActivityView>) => void;
  removeActivityView: (viewId: string) => void;
  blockCelebrationGif: (gifId: string) => void;
  likeCelebrationGif: (gif: { id: string; url: string; role: MediaRole; kind: CelebrationKind }) => void;
  setDevBreadcrumbsEnabled: (enabled: boolean) => void;
  setDevObjectDetailHeaderV2Enabled: (enabled: boolean) => void;
  setDevArcDetailDebugLoggingEnabled: (enabled: boolean) => void;
  setDevNavDrawerMenuEnabled: (enabled: boolean) => void;
  setHasCompletedFirstTimeOnboarding: (completed: boolean) => void;
  resetOnboardingAnswers: () => void;
  resetStore: () => void;
}

const now = () => new Date().toISOString();
const createAgentActionId = () => `agent-action-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;

const localDateKey = (date: Date) => {
  const y = String(date.getFullYear());
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const parseLocalDateKey = (key: string) => {
  const parts = key.split('-').map((p) => Math.floor(Number(p)));
  if (parts.length !== 3) return null;
  const [y, m, d] = parts;
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null;
  return new Date(y, m - 1, d);
};

// Prefer the explicit `environment` value wired through `app.config.ts`. When that
// isn't available at runtime (for example, in certain standalone/TestFlight builds),
// fall back to the bundler dev flag so production installs don't accidentally pick
// up demo data or dev-only defaults.
const appEnvironment =
  (Constants.expoConfig?.extra as { environment?: string } | undefined)?.environment ??
  (__DEV__ ? 'development' : 'production');

const isProductionEnvironment = appEnvironment === 'production';

const buildDefaultUserProfile = (): UserProfile => {
  const timestamp = now();
  return {
    id: 'local-user',
    createdAt: timestamp,
    updatedAt: timestamp,
    communication: {},
    visuals: {},
  };
};

type ForceSeed = {
  id: string;
  name: string;
  emoji: string;
  definition: string;
};

const canonicalForceSeeds: ForceSeed[] = [
  {
    id: 'force-activity',
    name: '🏃 Activity',
    emoji: '🏃',
    definition:
      'Work that engages your body, hands, or physical energy. Tangible doing that anchors you in the real world.',
  },
  {
    id: 'force-connection',
    name: '🤝 Connection',
    emoji: '🤝',
    definition:
      'Work that strengthens relationships or contributes to others through service, teaching, empathy, or collaboration.',
  },
  {
    id: 'force-mastery',
    name: '🧠 Mastery',
    emoji: '🧠',
    definition:
      'Work that develops skill, clarity, or understanding. Learning, craftsmanship, problem-solving, strategic thinking.',
  },
  {
    id: 'force-spirituality',
    name: '✨ Spirituality',
    emoji: '✨',
    definition:
      'Work that deepens discipleship and inner character: devotion, gratitude, repentance, obedience, alignment with God.',
  },
];

const canonicalForces: Force[] = canonicalForceSeeds.map((seed) => ({
  id: seed.id,
  name: seed.name,
  emoji: seed.emoji,
  definition: seed.definition,
  kind: 'canonical',
  isActive: true,
  createdAt: now(),
  updatedAt: now(),
}));

const withUpdate = <T extends { id: string }>(items: T[], id: string, updater: Updater<T>): T[] =>
  items.map((item) => (item.id === id ? updater(item) : item));

const countCompletedSteps = (steps: unknown): number => {
  if (!Array.isArray(steps)) return 0;
  let count = 0;
  for (const step of steps) {
    if (!step || typeof step !== 'object') continue;
    const completedAt = (step as any).completedAt;
    if (typeof completedAt === 'string' && completedAt.trim().length > 0) {
      count += 1;
    }
  }
  return count;
};

// Fresh installs must start with *no* out-of-the-box user objects (Arcs/Goals/Activities).
// Dev/test data should be created explicitly via DevTools, not implicitly via store defaults.
const initialArcs: Arc[] = [];
const initialGoals: Goal[] = [];
const initialActivities: Activity[] = [];

const initialActivityViews: ActivityView[] = [
  {
    id: 'default',
    name: 'Default view',
    filterMode: 'all',
    sortMode: 'manual',
    showCompleted: true,
    isSystem: true,
  },
  {
    id: 'priorityFocus',
    name: 'Starred',
    filterMode: 'priority1',
    sortMode: 'priority',
    showCompleted: true,
    isSystem: true,
  },
];

export const useAppStore = create<AppState>()(
  subscribeWithSelector(
    persist<AppState>((set, get) => ({
      forces: canonicalForces,
      arcs: initialArcs,
      goals: initialGoals,
      activities: initialActivities,
      activityTagHistory: {},
      domainHydrated: false,
      devBreadcrumbsEnabled: false,
      devObjectDetailHeaderV2Enabled: false,
      devArcDetailDebugLoggingEnabled: false,
      devNavDrawerMenuEnabled: false,
      notificationPreferences: {
        notificationsEnabled: false,
        osPermissionStatus: 'notRequested',
        allowActivityReminders: false,
        allowDailyShowUp: false,
        dailyShowUpTime: null,
        allowDailyFocus: false,
        dailyFocusTime: null,
        dailyFocusTimeMode: 'auto',
        // System nudge: default ON once notifications are enabled (user can toggle off).
        allowGoalNudges: true,
        goalNudgeTime: null,
        allowStreakAndReactivation: false,
      },
      locationOfferPreferences: {
        enabled: false,
        osPermissionStatus: 'notRequested',
        dailyCap: 2,
        globalMinSpacingMs: 6 * 60 * 60 * 1000,
        defaultCooldownMs: 2 * 60 * 60 * 1000,
      },
      lastFocusMinutes: null,
      soundscapeEnabled: true,
      hasShownFocusSoundscapeVolumeHint: false,
      hapticsEnabled: true,
      soundscapeTrackId: 'default',
      activitySearchIncludeCompleted: false,
      activitySearchShowCheckCircle: false,
      activitySearchShowMeta: false,
      enabledSendToDestinations: {},
      lastShowUpDate: null,
      currentShowUpStreak: 0,
      lastActiveDate: null,
      streakGrace: {
        freeDaysRemaining: 1,
        lastFreeResetWeek: null,
        shieldsAvailable: 0,
        graceDaysUsed: 0,
      },
      appOpenCount: 0,
      firstOpenedAtMs: null,
      lastOpenedAtMs: null,
      widgetNudge: {
        status: 'notEligible',
        shownCount: 0,
        modalShownCount: 0,
        dismissedCount: 0,
        lastShownAtMs: null,
        cooldownUntilMs: null,
        completedAtMs: null,
        completedSource: null,
      },
      lastCompletedFocusSessionDate: null,
      lastCompletedFocusSessionAtIso: null,
      currentFocusStreak: 0,
      bestFocusStreak: 0,
      activityViews: initialActivityViews,
      activeActivityViewId: 'default',
      focusContextGoalId: null,
      goalRecommendations: {},
      planRecommendationsCount: 0,
      arcFeedback: [],
      blockedCelebrationGifIds: [],
      likedCelebrationGifs: [],
      agentHostActions: [],
      enqueueAgentHostAction: (action) =>
        set((state) => ({
          agentHostActions: [
            ...(state.agentHostActions ?? []),
            {
              ...(action as EnqueueAgentHostAction),
              id: createAgentActionId(),
              createdAt: now(),
            } as AgentHostAction,
          ],
        })),
      consumeAgentHostActions: (filter) => {
        const current = get().agentHostActions ?? [];
        const matches = current.filter(
          (a) => a.objectType === filter.objectType && a.objectId === filter.objectId
        );
        if (matches.length === 0) return [];
        set((state) => ({
          agentHostActions: (state.agentHostActions ?? []).filter(
            (a) => !(a.objectType === filter.objectType && a.objectId === filter.objectId)
          ),
        }));
        return matches;
      },
      recordAppOpen: (reason) => {
        const nowMs = Date.now();
        set((state) => ({
          appOpenCount: Math.max(0, Math.floor((state.appOpenCount ?? 0) + 1)),
          firstOpenedAtMs: state.firstOpenedAtMs ?? nowMs,
          lastOpenedAtMs: nowMs,
        }));
        if (__DEV__) {
          // eslint-disable-next-line no-console
          console.log('[lifecycle] recordAppOpen', reason);
        }
      },
      markWidgetPromptShown: (surface) => {
        const nowMs = Date.now();
        set((state) => ({
          widgetNudge: {
            ...(state.widgetNudge ?? {
              status: 'notEligible',
              shownCount: 0,
              modalShownCount: 0,
              dismissedCount: 0,
              lastShownAtMs: null,
              cooldownUntilMs: null,
              completedAtMs: null,
              completedSource: null,
            }),
            status: 'shown',
            shownCount: Math.max(0, Math.floor(((state.widgetNudge as any)?.shownCount ?? 0) + 1)),
            modalShownCount:
              surface === 'modal'
                ? Math.max(0, Math.floor(((state.widgetNudge as any)?.modalShownCount ?? 0) + 1))
                : Math.max(0, Math.floor(((state.widgetNudge as any)?.modalShownCount ?? 0))),
            lastShownAtMs: nowMs,
          },
        }));
      },
      dismissWidgetPrompt: (surface) => {
        const nowMs = Date.now();
        const cooldownMs = 7 * 24 * 60 * 60 * 1000;
        set((state) => ({
          widgetNudge: {
            ...(state.widgetNudge ?? {
              status: 'notEligible',
              shownCount: 0,
              modalShownCount: 0,
              dismissedCount: 0,
              lastShownAtMs: null,
              cooldownUntilMs: null,
              completedAtMs: null,
              completedSource: null,
            }),
            status: 'dismissed',
            dismissedCount: Math.max(0, Math.floor(((state.widgetNudge as any)?.dismissedCount ?? 0) + 1)),
            cooldownUntilMs: nowMs + cooldownMs,
          },
        }));
        if (__DEV__) {
          // eslint-disable-next-line no-console
          console.log('[widgets] dismissWidgetPrompt', surface);
        }
      },
      completeWidgetNudge: (source) => {
        const nowMs = Date.now();
        set((state) => ({
          widgetNudge: {
            ...(state.widgetNudge ?? {
              status: 'notEligible',
              shownCount: 0,
              modalShownCount: 0,
              dismissedCount: 0,
              lastShownAtMs: null,
              cooldownUntilMs: null,
              completedAtMs: null,
              completedSource: null,
            }),
            status: 'completed',
            completedAtMs: nowMs,
            completedSource: source,
            cooldownUntilMs: null,
          },
        }));
      },
      authIdentity: null,
      userProfile: buildDefaultUserProfile(),
      llmModel: 'gpt-4o-mini',
      generativeCredits: {
        monthKey: getMonthKey(new Date()),
        usedThisMonth: 0,
      },
      bonusGenerativeCredits: {
        monthKey: getMonthKey(new Date()),
        bonusThisMonth: 0,
      },
      hasCompletedFirstTimeOnboarding: false,
      hasReceivedOnboardingCompletionReward: false,
      lastOnboardingArcId: null,
      lastOnboardingGoalId: null,
      hasSeenFirstArcCelebration: false,
      hasSeenFirstGoalCelebration: false,
      lastKickoffShownDateKey: null,
      dailyPlanHistory: {},
      dailyActivityResolutions: {},
      lastSchedulingApply: null,
      hasSeenOnboardingSharePrompt: false,
      hasSeenShareSignInHero: false,
      hasSeenCreditsEducationInterstitial: false,
      redeemedReferralCodes: {},
      hasSeenRefineUndoCoachmark: false,
      hasDismissedOnboardingGoalGuide: false,
      hasDismissedOnboardingActivitiesGuide: false,
      hasDismissedOnboardingPlanReadyGuide: false,
      pendingPostGoalPlanGuideGoalId: null,
      dismissedPostGoalPlanGuideGoalIds: {},
      hasSeenPostGoalPlanCoachmark: false,
      hasDismissedGoalVectorsGuide: false,
      hasDismissedActivitiesListGuide: false,
      hasDismissedActivityDetailGuide: false,
      activityDetailPlanExpanded: false,
      activityDetailDetailsExpanded: false,
      hasDismissedArcExploreGuide: false,
      addArc: (arc) => set((state) => ({ arcs: [...state.arcs, arc] })),
      updateArc: (arcId, updater) =>
        set((state) => ({
          arcs: withUpdate(state.arcs, arcId, updater),
        })),
      removeArc: (arcId) =>
        set((state) => {
          const removedGoalIds = new Set(
            state.goals.filter((goal) => goal.arcId === arcId).map((goal) => goal.id)
          );
          const remainingGoals = state.goals.filter((goal) => goal.arcId !== arcId);
          const remainingActivities = state.activities.filter(
            (activity) => !removedGoalIds.has(activity.goalId ?? '')
          );
          const { [arcId]: _removed, ...restRecommendations } = state.goalRecommendations;
          return {
            arcs: state.arcs.filter((arc) => arc.id !== arcId),
            goals: remainingGoals,
            activities: remainingActivities,
            goalRecommendations: restRecommendations,
          };
        }),
      addGoal: (goal) =>
        set((state) => {
          const shouldTriggerPostGoalGuide =
            state.hasCompletedFirstTimeOnboarding &&
            Boolean(goal?.id) &&
            // Don't interfere with the dedicated onboarding-created goal handoffs.
            state.lastOnboardingGoalId !== goal.id &&
            !(state.dismissedPostGoalPlanGuideGoalIds ?? {})[goal.id];

          return {
            goals: [...state.goals, goal],
            pendingPostGoalPlanGuideGoalId: shouldTriggerPostGoalGuide
              ? goal.id
              : state.pendingPostGoalPlanGuideGoalId,
          };
        }),
      updateGoal: (goalId, updater) =>
        set((state) => ({
          goals: withUpdate(state.goals, goalId, updater),
        })),
      removeGoal: (goalId) =>
        set((state) => {
          const remainingGoals = state.goals.filter((goal) => goal.id !== goalId);
          const remainingActivities = state.activities.filter(
            (activity) => activity.goalId !== goalId
          );
          const nextLastOnboardingGoalId =
            state.lastOnboardingGoalId === goalId ? null : state.lastOnboardingGoalId;
          return {
            goals: remainingGoals,
            activities: remainingActivities,
            lastOnboardingGoalId: nextLastOnboardingGoalId,
            pendingPostGoalPlanGuideGoalId:
              state.pendingPostGoalPlanGuideGoalId === goalId ? null : state.pendingPostGoalPlanGuideGoalId,
          };
        }),
      addActivity: (activity) =>
        set((state) => {
          const atIso = now();
          const nextActivities = [...state.activities, activity];
          const nextTagHistory = recordTagUsageForActivity(state.activityTagHistory, activity, atIso);

          let shouldGrantOnboardingCompletionReward = false;
          if (!state.hasReceivedOnboardingCompletionReward) {
            const onboardingArcId = state.lastOnboardingArcId;
            const onboardingGoalId = state.lastOnboardingGoalId;
            const activityGoalId = activity.goalId ?? null;
            if (
              onboardingArcId &&
              onboardingGoalId &&
              activityGoalId === onboardingGoalId &&
              state.arcs.some((a) => a.id === onboardingArcId) &&
              state.goals.some((g) => g.id === onboardingGoalId && g.arcId === onboardingArcId)
            ) {
              shouldGrantOnboardingCompletionReward = true;
            }
          }

          if (!shouldGrantOnboardingCompletionReward) {
            return {
              activities: nextActivities,
              activityTagHistory: nextTagHistory,
            };
          }

          // Top-up: ensure the user exits onboarding with a full monthly allowance available.
          const currentKey = getMonthKey(new Date());
          const nextCredits = { monthKey: currentKey, usedThisMonth: 0 };

          // Trigger the reward reveal interstitial outside the store update.
          // (This keeps store state updates pure and avoids UI coupling in reducers.)
          setTimeout(() => {
            try {
              useCreditsInterstitialStore.getState().open({ kind: 'completion' });
            } catch {
              // best-effort only
            }
          }, 0);

          return {
            activities: nextActivities,
            activityTagHistory: nextTagHistory,
            generativeCredits: nextCredits,
            hasReceivedOnboardingCompletionReward: true,
          };
        }),
      updateActivity: (activityId, updater) =>
        set((state) => {
          const atIso = now();
          const prev = state.activities.find((item) => item.id === activityId) ?? null;
          const next = prev ? updater(prev) : null;
          const nextActivities =
            prev && next
              ? state.activities.map((item) => (item.id === activityId ? next : item))
              : state.activities;
          const shouldBumpGoalStatus = (() => {
            if (!prev || !next) return false;
            const goalId = next.goalId ?? prev.goalId ?? null;
            if (!goalId) return false;

            const goal = state.goals.find((g) => g.id === goalId) ?? null;
            // Only auto-bump from Planned → In progress (never override Completed/Archived).
            if (!goal || goal.status !== 'planned') return false;

            const prevStepsComplete = countCompletedSteps(prev.steps);
            const nextStepsComplete = countCompletedSteps(next.steps);
            const didCompleteMoreSteps = nextStepsComplete > prevStepsComplete;
            const didMarkDoneNow = prev.status !== 'done' && next.status === 'done';
            const didLeavePlannedNow = prev.status === 'planned' && next.status !== 'planned';
            const didSetCompletedAtNow = !prev.completedAt && Boolean(next.completedAt);

            return didCompleteMoreSteps || didMarkDoneNow || didLeavePlannedNow || didSetCompletedAtNow;
          })();
          const shouldRecordUsage =
            prev != null &&
            next != null &&
            (!tagsEqualForCompare(prev.tags, next.tags) ||
              prev.title !== next.title ||
              prev.type !== next.type);

          return {
            activities: nextActivities,
            goals:
              shouldBumpGoalStatus && next?.goalId
                ? withUpdate(state.goals, next.goalId, (g) => ({
                    ...g,
                    status: 'in_progress',
                    updatedAt: atIso,
                  }))
                : state.goals,
            activityTagHistory: shouldRecordUsage && next
              ? recordTagUsageForActivity(state.activityTagHistory, next, atIso)
              : state.activityTagHistory,
          };
        }),
      reorderActivities: (orderedIds) =>
        set((state) => {
          const atIso = now();
          const orderMap = new Map(orderedIds.map((id, index) => [id, index]));
          return {
            activities: state.activities.map((activity) => {
              const newIndex = orderMap.get(activity.id);
              if (newIndex === undefined) return activity;
              if (activity.orderIndex === newIndex) return activity;
              return { ...activity, orderIndex: newIndex, updatedAt: atIso };
            }),
          };
        }),
      removeActivity: (activityId) =>
        set((state) => {
          const atIso = now();
          const remaining = state.activities.filter((activity) => activity.id !== activityId);
          const nextActivities = remaining.map((activity) => {
            let didChange = false;

            const nextSteps =
              (activity.steps ?? []).length === 0
                ? activity.steps
                : (activity.steps ?? []).map((step: any) => {
                    if (step?.linkedActivityId !== activityId) return step;
                    didChange = true;
                    return {
                      ...step,
                      linkedActivityId: null,
                      linkedAt: undefined,
                      // Once unlinked, the step is a normal checklist item again; do not force completion.
                      completedAt: null,
                    };
                  });

            const origin = (activity as any).origin;
            const shouldClearOrigin =
              origin?.kind === 'activity_step' && origin?.parentActivityId === activityId;
            const nextOrigin = shouldClearOrigin ? undefined : origin;
            if (shouldClearOrigin) didChange = true;

            if (!didChange) return activity;
            return {
              ...activity,
              steps: nextSteps,
              origin: nextOrigin,
              updatedAt: atIso,
            };
          });

          return {
            activities: nextActivities,
          };
        }),
      setGoalRecommendations: (arcId, goals) =>
        set((state) => ({
          goalRecommendations: {
            ...state.goalRecommendations,
            [arcId]: goals,
          },
        })),
      setPlanRecommendationsCount: (count) =>
        set(() => ({
          planRecommendationsCount: Math.max(0, Math.floor(Number.isFinite(count) ? count : 0)),
        })),
      dismissGoalRecommendation: (arcId, goalTitle) =>
        set((state) => {
          const current = state.goalRecommendations[arcId] ?? [];
          return {
            goalRecommendations: {
              ...state.goalRecommendations,
              [arcId]: current.filter((goal) => goal.title !== goalTitle),
            },
          };
        }),
      clearGoalRecommendations: (arcId) =>
        set((state) => {
          const updated = { ...state.goalRecommendations };
          delete updated[arcId];
          return { goalRecommendations: updated };
        }),
      addArcFeedback: (feedback) =>
        set((state) => {
          const maxEntries = 20;
          const next = [...state.arcFeedback, feedback];
          const trimmed =
            next.length > maxEntries ? next.slice(next.length - maxEntries) : next;
          return { arcFeedback: trimmed };
        }),
      setAuthIdentity: (identity) => set(() => ({ authIdentity: identity })),
      clearAuthIdentity: () => set(() => ({ authIdentity: null })),
      setLastOnboardingArcId: (arcId) =>
        set(() => ({
          lastOnboardingArcId: arcId,
        })),
      setHasSeenFirstArcCelebration: (seen) =>
        set(() => ({
          hasSeenFirstArcCelebration: seen,
        })),
      setLastOnboardingGoalId: (goalId) =>
        set(() => ({
          lastOnboardingGoalId: goalId,
        })),
      setHasSeenFirstGoalCelebration: (seen) =>
        set(() => ({
          hasSeenFirstGoalCelebration: seen,
        })),
      setLastKickoffShownDateKey: (dateKey) =>
        set(() => ({
          lastKickoffShownDateKey: dateKey,
        })),
      updateLastKickoffShownDateKey: (dateKey) =>
        set(() => ({
          lastKickoffShownDateKey: dateKey,
        })),
      setLastSchedulingApply: (record) =>
        set(() => ({
          lastSchedulingApply: record,
        })),
      setDailyPlanRecord: (dateKey, record) =>
        set((state) => {
          if (!record) {
            const next = { ...(state.dailyPlanHistory ?? {}) };
            delete next[dateKey];
            return { dailyPlanHistory: next };
          }
          return {
            dailyPlanHistory: {
              ...(state.dailyPlanHistory ?? {}),
              [dateKey]: record,
            },
          };
        }),
      addDailyPlanCommitment: (dateKey, activityId) =>
        set((state) => {
          const existing = state.dailyPlanHistory?.[dateKey] ?? null;
          const committed = new Set(existing?.committedActivityIds ?? []);
          committed.add(activityId);
          return {
            dailyPlanHistory: {
              ...(state.dailyPlanHistory ?? {}),
              [dateKey]: {
                plannedAtMs: existing?.plannedAtMs ?? Date.now(),
                committedActivityIds: Array.from(committed),
              },
            },
          };
        }),
      removeDailyPlanCommitment: (dateKey, activityId) =>
        set((state) => {
          const existing = state.dailyPlanHistory?.[dateKey] ?? null;
          if (!existing) return {};
          const committed = new Set(existing.committedActivityIds ?? []);
          committed.delete(activityId);
          const next = { ...(state.dailyPlanHistory ?? {}) };
          if (committed.size === 0) {
            delete next[dateKey];
          } else {
            next[dateKey] = { ...existing, committedActivityIds: Array.from(committed) };
          }
          return { dailyPlanHistory: next };
        }),
      dismissActivityForDay: (dateKey, activityId) =>
        set((state) => {
          const existing = state.dailyActivityResolutions?.[dateKey] ?? { dismissedActivityIds: [] };
          const next = new Set(existing.dismissedActivityIds ?? []);
          next.add(activityId);
          return {
            dailyActivityResolutions: {
              ...(state.dailyActivityResolutions ?? {}),
              [dateKey]: { dismissedActivityIds: Array.from(next) },
            },
          };
        }),
      undismissActivityForDay: (dateKey, activityId) =>
        set((state) => {
          const existing = state.dailyActivityResolutions?.[dateKey] ?? null;
          if (!existing) return {};
          const next = new Set(existing.dismissedActivityIds ?? []);
          next.delete(activityId);
          const nextObj = { ...(state.dailyActivityResolutions ?? {}) };
          if (next.size === 0) {
            delete nextObj[dateKey];
          } else {
            nextObj[dateKey] = { dismissedActivityIds: Array.from(next) };
          }
          return { dailyActivityResolutions: nextObj };
        }),
      setHasSeenOnboardingSharePrompt: (seen) =>
        set(() => ({
          hasSeenOnboardingSharePrompt: seen,
        })),
      setHasSeenShareSignInHero: (seen) =>
        set(() => ({
          hasSeenShareSignInHero: seen,
        })),
      setHasSeenCreditsEducationInterstitial: (seen) =>
        set(() => ({
          hasSeenCreditsEducationInterstitial: seen,
        })),
      setHasSeenRefineUndoCoachmark: (seen) =>
        set(() => ({
          hasSeenRefineUndoCoachmark: seen,
        })),
      setHasDismissedOnboardingGoalGuide: (dismissed) =>
        set(() => ({
          hasDismissedOnboardingGoalGuide: dismissed,
        })),
      setHasDismissedOnboardingActivitiesGuide: (dismissed) =>
        set(() => ({
          hasDismissedOnboardingActivitiesGuide: dismissed,
        })),
      setHasDismissedOnboardingPlanReadyGuide: (dismissed) =>
        set(() => ({
          hasDismissedOnboardingPlanReadyGuide: dismissed,
        })),
      setPendingPostGoalPlanGuideGoalId: (goalId) =>
        set(() => ({
          pendingPostGoalPlanGuideGoalId: goalId,
        })),
      dismissPostGoalPlanGuideForGoal: (goalId) =>
        set((state) => {
          const nextDismissed = {
            ...(state.dismissedPostGoalPlanGuideGoalIds ?? {}),
            [goalId]: true as const,
          };
          return {
            dismissedPostGoalPlanGuideGoalIds: nextDismissed,
            pendingPostGoalPlanGuideGoalId:
              state.pendingPostGoalPlanGuideGoalId === goalId ? null : state.pendingPostGoalPlanGuideGoalId,
          };
        }),
      setHasSeenPostGoalPlanCoachmark: (hasSeen: boolean) =>
        set(() => ({
          hasSeenPostGoalPlanCoachmark: hasSeen,
        })),
      setHasDismissedGoalVectorsGuide: (dismissed) =>
        set(() => ({
          hasDismissedGoalVectorsGuide: dismissed,
        })),
      setHasDismissedActivitiesListGuide: (dismissed) =>
        set(() => ({
          hasDismissedActivitiesListGuide: dismissed,
        })),
      setHasDismissedActivityDetailGuide: (dismissed) =>
        set(() => ({
          hasDismissedActivityDetailGuide: dismissed,
        })),
      setHasDismissedArcExploreGuide: (dismissed) =>
        set(() => ({
          hasDismissedArcExploreGuide: dismissed,
        })),
      setActivityDetailPlanExpanded: (expanded) =>
        set(() => ({
          activityDetailPlanExpanded: expanded,
        })),
      setActivityDetailDetailsExpanded: (expanded) =>
        set(() => ({
          activityDetailDetailsExpanded: expanded,
        })),
      toggleActivityDetailPlanExpanded: () =>
        set((state) => ({
          activityDetailPlanExpanded: !state.activityDetailPlanExpanded,
        })),
      toggleActivityDetailDetailsExpanded: () =>
        set((state) => ({
          activityDetailDetailsExpanded: !state.activityDetailDetailsExpanded,
        })),
      setActiveActivityViewId: (viewId) =>
        set(() => ({
          activeActivityViewId: viewId,
        })),
      addActivityView: (view) =>
        set((state) => ({
          activityViews: [...state.activityViews, view],
        })),
      updateActivityView: (viewId, updater) =>
        set((state) => ({
          activityViews: withUpdate(state.activityViews, viewId, updater),
        })),
      removeActivityView: (viewId) =>
        set((state) => {
          const remainingViews = state.activityViews.filter((view) => view.id !== viewId);
          const nextActiveId =
            state.activeActivityViewId === viewId ? 'default' : state.activeActivityViewId;
          return {
            activityViews: remainingViews,
            activeActivityViewId: nextActiveId,
          };
        }),
      blockCelebrationGif: (gifId) =>
        set((state) => {
          if (state.blockedCelebrationGifIds.includes(gifId)) {
            return state;
          }
          return {
            blockedCelebrationGifIds: [...state.blockedCelebrationGifIds, gifId],
          };
        }),
      likeCelebrationGif: (gif) =>
        set((state) => {
          const existing = state.likedCelebrationGifs ?? [];
          if (existing.some((entry) => entry.id === gif.id)) {
            return state;
          }
          const maxEntries = 50;
          const next = [...existing, gif];
          const trimmed =
            next.length > maxEntries ? next.slice(next.length - maxEntries) : next;
          return { likedCelebrationGifs: trimmed };
        }),
      setDevBreadcrumbsEnabled: (enabled) =>
        set(() => ({
          devBreadcrumbsEnabled: enabled,
        })),
      setDevObjectDetailHeaderV2Enabled: (enabled) =>
        set(() => ({
          devObjectDetailHeaderV2Enabled: enabled,
        })),
      setDevArcDetailDebugLoggingEnabled: (enabled) =>
        set(() => ({
          devArcDetailDebugLoggingEnabled: enabled,
        })),
      setDevNavDrawerMenuEnabled: (enabled) =>
        set(() => ({
          devNavDrawerMenuEnabled: enabled,
        })),
      setSendToDestinationEnabled: (kind, enabled) =>
        set((state) => {
          const k = String(kind ?? '').trim().toLowerCase();
          if (!k) return state;
          const next = { ...(state.enabledSendToDestinations ?? {}), [k]: Boolean(enabled) };
          return { enabledSendToDestinations: next };
        }),
      toggleSendToDestinationEnabled: (kind) =>
        set((state) => {
          const k = String(kind ?? '').trim().toLowerCase();
          if (!k) return state;
          const current = Boolean((state.enabledSendToDestinations ?? {})[k]);
          const next = { ...(state.enabledSendToDestinations ?? {}), [k]: !current };
          return { enabledSendToDestinations: next };
        }),
      setUserProfile: (profile) =>
        set(() => ({
          userProfile: {
            ...profile,
            updatedAt: now(),
          },
        })),
      updateUserProfile: (updater) =>
        set((state) => {
          const base: UserProfile = state.userProfile ?? buildDefaultUserProfile();
          const next = updater(base);
          return {
            userProfile: {
              ...next,
              updatedAt: now(),
            },
          };
        }),
      clearUserProfile: () => set({ userProfile: null }),
      setLlmModel: (model) => set({ llmModel: model }),
      tryConsumeGenerativeCredit: ({ tier }) => {
        const baseLimit =
          tier === 'pro' ? PRO_GENERATIVE_CREDITS_PER_MONTH : FREE_GENERATIVE_CREDITS_PER_MONTH;
        const currentKey = getMonthKey(new Date());
        const bonusLedger =
          get().bonusGenerativeCredits ?? { monthKey: currentKey, bonusThisMonth: 0 };
        const normalizedBonus =
          bonusLedger.monthKey === currentKey
            ? bonusLedger
            : { monthKey: currentKey, bonusThisMonth: 0 };
        const bonusRaw = Number((normalizedBonus as any).bonusThisMonth ?? 0);
        const bonus = Number.isFinite(bonusRaw) ? Math.max(0, Math.floor(bonusRaw)) : 0;
        const limit = baseLimit + bonus;
        const ledger = get().generativeCredits ?? { monthKey: currentKey, usedThisMonth: 0 };
        const normalized =
          ledger.monthKey === currentKey
            ? ledger
            : { monthKey: currentKey, usedThisMonth: 0 };
        const usedRaw = Number((normalized as any).usedThisMonth ?? 0);
        const used = Number.isFinite(usedRaw) ? Math.max(0, Math.floor(usedRaw)) : 0;
        const remaining = Math.max(0, limit - used);
        if (remaining <= 0) {
          if (ledger.monthKey !== currentKey) {
            set(() => ({ generativeCredits: normalized }));
          }
          if (bonusLedger.monthKey !== currentKey) {
            set(() => ({ bonusGenerativeCredits: normalizedBonus }));
          }
          return { ok: false, remaining: 0, limit };
        }
        const nextUsed = used + 1;
        set(() => ({
          generativeCredits: { monthKey: currentKey, usedThisMonth: nextUsed },
        }));
        const remainingAfterConsume = Math.max(0, limit - nextUsed);
        if (remainingAfterConsume > 0 && remainingAfterConsume <= 5) {
          // Global warning toast: show no matter where the user is when they cross the threshold.
          // This avoids per-screen duplication and keeps the UX consistent across AI entrypoints.
          useToastStore.getState().showToast({
            message: `AI credits remaining this month: ${remainingAfterConsume} / ${limit}`,
            variant: 'credits',
            // Don't compete with onboarding guides / coachmarks; show once the overlay is gone.
            behaviorDuringSuppression: 'queue',
          });
        }
        return { ok: true, remaining: remainingAfterConsume, limit };
      },
      setBonusGenerativeCreditsThisMonth: (bonusThisMonth) => {
        const currentKey = getMonthKey(new Date());
        const normalized =
          typeof bonusThisMonth === 'number' && Number.isFinite(bonusThisMonth)
            ? Math.max(0, Math.floor(bonusThisMonth))
            : 0;
        set(() => ({ bonusGenerativeCredits: { monthKey: currentKey, bonusThisMonth: normalized } }));
      },
      addBonusGenerativeCreditsThisMonth: (bonusDelta) => {
        const currentKey = getMonthKey(new Date());
        const delta =
          typeof bonusDelta === 'number' && Number.isFinite(bonusDelta)
            ? Math.max(0, Math.floor(bonusDelta))
            : 0;
        if (delta <= 0) return;
        const ledger =
          get().bonusGenerativeCredits ?? { monthKey: currentKey, bonusThisMonth: 0 };
        const normalized =
          ledger.monthKey === currentKey
            ? ledger
            : { monthKey: currentKey, bonusThisMonth: 0 };
        const raw = Number((normalized as any).bonusThisMonth ?? 0);
        const current = Number.isFinite(raw) ? Math.max(0, Math.floor(raw)) : 0;
        set(() => ({
          bonusGenerativeCredits: { monthKey: currentKey, bonusThisMonth: current + delta },
        }));
      },
      devResetGenerativeCredits: () => {
        if (!__DEV__) return;
        const currentKey = getMonthKey(new Date());
        set(() => ({ generativeCredits: { monthKey: currentKey, usedThisMonth: 0 } }));
      },
      devSetGenerativeCreditsUsedThisMonth: (usedThisMonth) => {
        if (!__DEV__) return;
        const currentKey = getMonthKey(new Date());
        const normalizedUsed =
          typeof usedThisMonth === 'number' && Number.isFinite(usedThisMonth)
            ? Math.max(0, Math.floor(usedThisMonth))
            : 0;
        set(() => ({ generativeCredits: { monthKey: currentKey, usedThisMonth: normalizedUsed } }));
      },
      setHasCompletedFirstTimeOnboarding: (completed) =>
        set(() => ({
          hasCompletedFirstTimeOnboarding: completed,
        })),
      setNotificationPreferences: (updater) =>
        set((state) => {
          const next =
            typeof updater === 'function'
              ? (updater as (current: AppState['notificationPreferences']) => AppState['notificationPreferences'])(
                  state.notificationPreferences,
                )
              : updater;
          return { notificationPreferences: next };
        }),
      setLocationOfferPreferences: (updater) =>
        set((state) => {
          const next =
            typeof updater === 'function'
              ? (updater as (current: AppState['locationOfferPreferences']) => AppState['locationOfferPreferences'])(
                  state.locationOfferPreferences,
                )
              : updater;
          return { locationOfferPreferences: next };
        }),
      setLastFocusMinutes: (minutes) =>
        set(() => ({
          lastFocusMinutes: Number.isFinite(minutes) ? Math.max(1, Math.round(minutes)) : null,
        })),
      setSoundscapeEnabled: (enabled) =>
        set(() => ({
          soundscapeEnabled: Boolean(enabled),
        })),
      setHasShownFocusSoundscapeVolumeHint: (shown) =>
        set(() => ({
          hasShownFocusSoundscapeVolumeHint: Boolean(shown),
        })),
      setHapticsEnabled: (enabled) =>
        set(() => ({
          hapticsEnabled: Boolean(enabled),
        })),
      setSoundscapeTrackId: (trackId) =>
        set(() => ({
          soundscapeTrackId: (trackId || 'default') as SoundscapeId,
        })),
      setActivitySearchIncludeCompleted: (include) =>
        set(() => ({
          activitySearchIncludeCompleted: Boolean(include),
        })),
      setActivitySearchShowCheckCircle: (show) =>
        set(() => ({
          activitySearchShowCheckCircle: Boolean(show),
        })),
      setActivitySearchShowMeta: (show) =>
        set(() => ({
          activitySearchShowMeta: Boolean(show),
        })),
      setFocusContextGoalId: (goalId) =>
        set(() => ({
          focusContextGoalId:
            typeof goalId === 'string' && goalId.trim().length > 0 ? goalId.trim() : null,
        })),
      recordShowUp: () =>
        set((state) => {
          const nowDate = new Date();
          // Use local calendar days (not UTC) so streaks match user intuition.
          const todayKey = localDateKey(nowDate);
          const prevKey = state.lastShowUpDate;
          const prevStreak = state.currentShowUpStreak ?? 0;

          // Get ISO week key (YYYY-Www) for grace reset tracking
          const getIsoWeekKey = (date: Date): string => {
            const d = new Date(date.getTime());
            d.setHours(0, 0, 0, 0);
            // Thursday in current week decides the year
            d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
            const week1 = new Date(d.getFullYear(), 0, 4);
            const weekNum =
              1 +
              Math.round(
                ((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7,
              );
            return `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
          };

          const currentWeekKey = getIsoWeekKey(nowDate);
          const grace = state.streakGrace ?? {
            freeDaysRemaining: 1,
            lastFreeResetWeek: null,
            shieldsAvailable: 0,
            graceDaysUsed: 0,
          };

          // Reset free grace days if new week started
          let nextGrace = { ...grace };
          if (grace.lastFreeResetWeek !== currentWeekKey) {
            nextGrace = {
              ...nextGrace,
              freeDaysRemaining: 1, // Everyone gets 1 free grace day per week
              lastFreeResetWeek: currentWeekKey,
            };
          }

          if (prevKey === todayKey) {
            // Already counted today.
            return {
              ...state,
              streakGrace: nextGrace,
              lastActiveDate: state.lastActiveDate ?? nowDate.toISOString(),
            };
          }

          let nextStreak = 1;
          let graceDaysUsed = 0;

          if (prevKey) {
            const prevDate = parseLocalDateKey(prevKey);
            const startOfPrev = prevDate
              ? new Date(prevDate.getFullYear(), prevDate.getMonth(), prevDate.getDate())
              : null;
            const startOfToday = new Date(
              nowDate.getFullYear(),
              nowDate.getMonth(),
              nowDate.getDate(),
            );

            if (startOfPrev) {
              const diffMs = startOfToday.getTime() - startOfPrev.getTime();
              const diffDays = Math.round(diffMs / (24 * 60 * 60 * 1000));

              if (diffDays === 1) {
                // Consecutive day - streak continues normally
                nextStreak = prevStreak + 1;
              } else if (diffDays > 1) {
                // Missed days - try to use grace
                const missedDays = diffDays - 1; // Days between last show-up and today
                let graceAvailable = nextGrace.freeDaysRemaining + nextGrace.shieldsAvailable;

                if (graceAvailable >= missedDays) {
                  // Can cover all missed days with grace!
                  graceDaysUsed = missedDays;
                  nextStreak = prevStreak + 1; // Streak continues

                  // Consume grace: free days first, then shields
                  let remaining = missedDays;
                  const freeUsed = Math.min(remaining, nextGrace.freeDaysRemaining);
                  remaining -= freeUsed;
                  const shieldsUsed = remaining; // Whatever's left comes from shields

                  nextGrace = {
                    ...nextGrace,
                    freeDaysRemaining: nextGrace.freeDaysRemaining - freeUsed,
                    shieldsAvailable: nextGrace.shieldsAvailable - shieldsUsed,
                    graceDaysUsed: graceDaysUsed,
                  };
                } else {
                  // Not enough grace - streak resets
                  nextStreak = 1;
                  nextGrace = {
                    ...nextGrace,
                    graceDaysUsed: 0, // Reset since streak reset
                  };
                }
              }
            }
          }

          return {
            ...state,
            lastShowUpDate: todayKey,
            currentShowUpStreak: nextStreak,
            streakGrace: nextGrace,
            lastActiveDate: nowDate.toISOString(),
          };
        }),
      recordCompletedFocusSession: (params) =>
        set((state) => {
          const completedAtMs = params?.completedAtMs;
          const nowDate =
            typeof completedAtMs === 'number' && Number.isFinite(completedAtMs)
              ? new Date(completedAtMs)
              : new Date();

          const todayKey = localDateKey(nowDate);
          const prevKey = state.lastCompletedFocusSessionDate;
          const prevStreak = state.currentFocusStreak ?? 0;

          const isDailyFocusAuto =
            state.notificationPreferences?.allowDailyFocus === true &&
            (state.notificationPreferences.dailyFocusTimeMode ?? 'auto') === 'auto';
          const nextDailyFocusTime = isDailyFocusAuto
            ? roundDownToIntervalTimeHHmm({ at: nowDate, intervalMinutes: DAILY_FOCUS_TIME_ROUND_MINUTES })
            : (state.notificationPreferences?.dailyFocusTime ?? null);

          const nextNotificationPreferences = isDailyFocusAuto
            ? {
                ...state.notificationPreferences,
                dailyFocusTime: nextDailyFocusTime,
              }
            : state.notificationPreferences;

          if (prevKey === todayKey) {
            // Already counted today.
            return {
              ...state,
              notificationPreferences: nextNotificationPreferences,
              lastCompletedFocusSessionAtIso: nowDate.toISOString(),
              lastActiveDate: state.lastActiveDate ?? nowDate.toISOString(),
            };
          }

          let nextStreak = 1;
          if (prevKey) {
            const prevDate = parseLocalDateKey(prevKey);
            if (prevDate) {
              const startOfPrev = new Date(
                prevDate.getFullYear(),
                prevDate.getMonth(),
                prevDate.getDate(),
              );
              const startOfToday = new Date(
                nowDate.getFullYear(),
                nowDate.getMonth(),
                nowDate.getDate(),
              );
              const diffMs = startOfToday.getTime() - startOfPrev.getTime();
              const diffDays = Math.round(diffMs / (24 * 60 * 60 * 1000));
              if (diffDays === 1) {
                nextStreak = prevStreak + 1;
              }
            }
          }

          const prevBest = state.bestFocusStreak ?? 0;
          const bestFocusStreak = Math.max(prevBest, nextStreak);

          return {
            ...state,
            lastCompletedFocusSessionDate: todayKey,
            lastCompletedFocusSessionAtIso: nowDate.toISOString(),
            currentFocusStreak: nextStreak,
            bestFocusStreak,
            notificationPreferences: nextNotificationPreferences,
            lastActiveDate: nowDate.toISOString(),
          };
        }),
      resetShowUpStreak: () =>
        set((state) => ({
          ...state,
          lastShowUpDate: null,
          currentShowUpStreak: 0,
          streakGrace: {
            ...state.streakGrace,
            graceDaysUsed: 0,
          },
        })),
      resetFocusStreak: () =>
        set((state) => ({
          ...state,
          lastCompletedFocusSessionDate: null,
          lastCompletedFocusSessionAtIso: null,
          currentFocusStreak: 0,
          bestFocusStreak: 0,
        })),
      addStreakShields: (count) =>
        set((state) => {
          const grace = state.streakGrace ?? {
            freeDaysRemaining: 1,
            lastFreeResetWeek: null,
            shieldsAvailable: 0,
            graceDaysUsed: 0,
          };
          const MAX_SHIELDS = 3;
          return {
            ...state,
            streakGrace: {
              ...grace,
              shieldsAvailable: Math.min(MAX_SHIELDS, grace.shieldsAvailable + count),
            },
          };
        }),
      resetOnboardingAnswers: () =>
        set((state) => {
          const base: UserProfile = state.userProfile ?? buildDefaultUserProfile();
          return {
            userProfile: {
              ...base,
              fullName: undefined,
              birthdate: undefined,
              ageRange: undefined,
              focusAreas: undefined,
              avatarUrl: undefined,
              notifications: undefined,
              identityProfile: undefined,
              updatedAt: now(),
            },
            lastOnboardingArcId: null,
            lastOnboardingGoalId: null,
            hasSeenOnboardingSharePrompt: false,
            hasDismissedOnboardingGoalGuide: false,
            hasDismissedOnboardingActivitiesGuide: false,
            hasDismissedOnboardingPlanReadyGuide: false,
            hasDismissedGoalVectorsGuide: false,
            hasDismissedActivitiesListGuide: false,
            hasDismissedActivityDetailGuide: false,
            hasDismissedArcExploreGuide: false,
            // When we explicitly reset onboarding answers (typically from dev
            // tooling), also reset the one-time celebrations so the overlays
            // can be exercised again on the next onboarding-created Arc/Goal.
            hasSeenFirstGoalCelebration: false,
            hasSeenFirstArcCelebration: false,
          };
        }),
      resetStore: () =>
        set({
          forces: canonicalForces,
          arcs: [],
          goals: [],
          activities: [],
          activityTagHistory: {},
          domainHydrated: true,
          devBreadcrumbsEnabled: false,
          devObjectDetailHeaderV2Enabled: false,
          devArcDetailDebugLoggingEnabled: false,
          devNavDrawerMenuEnabled: false,
          goalRecommendations: {},
          userProfile: buildDefaultUserProfile(),
          activityViews: initialActivityViews,
          activeActivityViewId: 'default',
          focusContextGoalId: null,
          lastFocusMinutes: null,
          soundscapeEnabled: true,
          hasShownFocusSoundscapeVolumeHint: false,
          hapticsEnabled: true,
          lastOnboardingArcId: null,
          lastOnboardingGoalId: null,
          hasSeenFirstGoalCelebration: false,
          hasSeenFirstArcCelebration: false,
          hasSeenOnboardingSharePrompt: false,
          hasSeenRefineUndoCoachmark: false,
          hasDismissedOnboardingGoalGuide: false,
          hasDismissedOnboardingActivitiesGuide: false,
          hasDismissedOnboardingPlanReadyGuide: false,
          hasDismissedGoalVectorsGuide: false,
          hasDismissedActivitiesListGuide: false,
          hasDismissedActivityDetailGuide: false,
          activityDetailPlanExpanded: false,
          activityDetailDetailsExpanded: false,
          hasDismissedArcExploreGuide: false,
          blockedCelebrationGifIds: [],
          likedCelebrationGifs: [],
          agentHostActions: [],
          hasCompletedFirstTimeOnboarding: false,
          lastShowUpDate: null,
          currentShowUpStreak: 0,
          lastActiveDate: null,
          streakGrace: {
            freeDaysRemaining: 1,
            lastFreeResetWeek: null,
            shieldsAvailable: 0,
            graceDaysUsed: 0,
          },
          lastCompletedFocusSessionDate: null,
          lastCompletedFocusSessionAtIso: null,
          currentFocusStreak: 0,
          bestFocusStreak: 0,
          locationOfferPreferences: {
            enabled: false,
            osPermissionStatus: 'notRequested',
            dailyCap: 2,
            globalMinSpacingMs: 6 * 60 * 60 * 1000,
            defaultCooldownMs: 2 * 60 * 60 * 1000,
          },
          enabledSendToDestinations: {
            amazon: false,
            home_depot: false,
            instacart: false,
            doordash: false,
          },
        }),
    }),
    {
      // AsyncStorage namespace for the main kwilt app store.
      name: 'kwilt-store',
      storage: createJSONStorage(() => AsyncStorage),
      // Performance: don't persist huge domain object graphs (Activities/Goals/Arcs/tag history)
      // alongside lightweight UI prefs. Those are persisted separately via DOMAIN_STORAGE_KEY.
      partialize: (state) => {
        // `domainHydrated` is runtime-only. Persisting it can briefly flip it "true" during
        // startup rehydrate, which risks overwriting `DOMAIN_STORAGE_KEY` with an empty snapshot.
        const { arcs, goals, activities, activityTagHistory, domainHydrated, authIdentity, ...rest } = state as any;
        return rest;
      },
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        const anyState = state as any;
        // Defensive normalization: persisted state can be partial or corrupted.
        if (!Array.isArray(anyState.arcs)) anyState.arcs = [];
        if (!Array.isArray(anyState.goals)) anyState.goals = [];
        if (!Array.isArray(anyState.activities)) anyState.activities = [];
        if (!anyState.activityTagHistory || typeof anyState.activityTagHistory !== 'object') {
          anyState.activityTagHistory = {};
        }
        if (!Array.isArray(anyState.forces)) {
          anyState.forces = canonicalForces;
        }
        if (!Array.isArray(anyState.activityViews) || anyState.activityViews.length === 0) {
          anyState.activityViews = initialActivityViews;
        }

        // Domain objects are loaded asynchronously from a separate key.
        // Ensure the runtime flag starts false each launch so screens can gate their empty states.
        anyState.domainHydrated = false;
        // Backward-compatible: older persisted stores won't have hapticsEnabled.
        if (!('hapticsEnabled' in anyState) || typeof anyState.hapticsEnabled !== 'boolean') {
          anyState.hapticsEnabled = true;
        }
        // Backward-compatible: one-time Focus soundscape volume hint flag.
        if (
          !('hasShownFocusSoundscapeVolumeHint' in anyState) ||
          typeof anyState.hasShownFocusSoundscapeVolumeHint !== 'boolean'
        ) {
          (state as any).hasShownFocusSoundscapeVolumeHint = false;
        }
        // Migration: Focus soundscape should be ON by default.
        // If the user has never started a Focus session (lastFocusMinutes is null) and their stored
        // preference is still the old default "false", flip it to true.
        try {
          const hasUsedFocus = typeof (state as any).lastFocusMinutes === 'number' && Number.isFinite((state as any).lastFocusMinutes);
          const stored = (state as any).soundscapeEnabled;
          if (!hasUsedFocus && stored === false) {
            (state as any).soundscapeEnabled = true;
          }
          if (!('soundscapeEnabled' in anyState) || typeof stored !== 'boolean') {
            (state as any).soundscapeEnabled = true;
          }
        } catch {
          // best-effort
        }
        // Backward-compatible: older persisted stores won't have lifecycle counters / widget nudge state.
        if (!('appOpenCount' in anyState) || typeof anyState.appOpenCount !== 'number') {
          (state as any).appOpenCount = 0;
        }
        if (
          !('firstOpenedAtMs' in anyState) ||
          (anyState.firstOpenedAtMs !== null && typeof anyState.firstOpenedAtMs !== 'number')
        ) {
          (state as any).firstOpenedAtMs = null;
        }
        if (
          !('lastOpenedAtMs' in anyState) ||
          (anyState.lastOpenedAtMs !== null && typeof anyState.lastOpenedAtMs !== 'number')
        ) {
          (state as any).lastOpenedAtMs = null;
        }
        if (!('widgetNudge' in anyState) || !anyState.widgetNudge || typeof anyState.widgetNudge !== 'object') {
          (state as any).widgetNudge = {
            status: 'notEligible',
            shownCount: 0,
            modalShownCount: 0,
            dismissedCount: 0,
            lastShownAtMs: null,
            cooldownUntilMs: null,
            completedAtMs: null,
            completedSource: null,
          };
        } else {
          const n = anyState.widgetNudge as any;
          if (!['notEligible', 'eligible', 'shown', 'dismissed', 'completed'].includes(n.status)) n.status = 'notEligible';
          if (typeof n.shownCount !== 'number' || !Number.isFinite(n.shownCount)) n.shownCount = 0;
          if (typeof n.modalShownCount !== 'number' || !Number.isFinite(n.modalShownCount)) n.modalShownCount = 0;
          if (typeof n.dismissedCount !== 'number' || !Number.isFinite(n.dismissedCount)) n.dismissedCount = 0;
          if (n.lastShownAtMs !== null && (typeof n.lastShownAtMs !== 'number' || !Number.isFinite(n.lastShownAtMs))) n.lastShownAtMs = null;
          if (n.cooldownUntilMs !== null && (typeof n.cooldownUntilMs !== 'number' || !Number.isFinite(n.cooldownUntilMs))) n.cooldownUntilMs = null;
          if (n.completedAtMs !== null && (typeof n.completedAtMs !== 'number' || !Number.isFinite(n.completedAtMs))) n.completedAtMs = null;
          if (n.completedSource !== null && typeof n.completedSource !== 'string') n.completedSource = null;
          (state as any).widgetNudge = n;
        }
        // Count this cold-start as an "open" once hydration completes so it persists.
        try {
          const nowMs = Date.now();
          (state as any).appOpenCount = Math.max(0, Math.floor(((state as any).appOpenCount ?? 0) + 1));
          (state as any).firstOpenedAtMs = (state as any).firstOpenedAtMs ?? nowMs;
          (state as any).lastOpenedAtMs = nowMs;
        } catch {
          // best-effort
        }
        // Backward-compatible: older persisted stores won't have Activity detail section expansion prefs.
        if (
          !('activityDetailPlanExpanded' in anyState) ||
          typeof anyState.activityDetailPlanExpanded !== 'boolean'
        ) {
          (state as any).activityDetailPlanExpanded = false;
        }
        if (
          !('activityDetailDetailsExpanded' in anyState) ||
          typeof anyState.activityDetailDetailsExpanded !== 'boolean'
        ) {
          (state as any).activityDetailDetailsExpanded = false;
        }

        // Backward-compatible: older persisted stores won't have destination toggles.
        if (
          !('enabledSendToDestinations' in anyState) ||
          !anyState.enabledSendToDestinations ||
          typeof anyState.enabledSendToDestinations !== 'object'
        ) {
          (state as any).enabledSendToDestinations = {
            amazon: false,
            home_depot: false,
            instacart: false,
            doordash: false,
          };
        }
        // Backward-compatible: set hasSeenPostGoalPlanCoachmark to true for existing users
        // who have already dismissed the guide for any goal (they understand the flow).
        if (!('hasSeenPostGoalPlanCoachmark' in anyState) || typeof anyState.hasSeenPostGoalPlanCoachmark !== 'boolean') {
          const hasDismissedAnyGoal = Object.keys(anyState.dismissedPostGoalPlanGuideGoalIds ?? {}).length > 0;
          (state as any).hasSeenPostGoalPlanCoachmark = hasDismissedAnyGoal;
        }
        // Backward-compatible: older persisted stores won't have goal nudge time.
        // Default to a high-engagement "afternoon momentum" time.
        const prefs = state.notificationPreferences as any;
        if (prefs && typeof prefs === 'object') {
          if (!('goalNudgeTime' in prefs) || typeof prefs.goalNudgeTime !== 'string') {
            state.notificationPreferences = {
              ...state.notificationPreferences,
              goalNudgeTime: DEFAULT_GOAL_NUDGE_TIME,
            };
          }

          // Backward-compatible: track whether daily focus time is auto-tuned or user-set.
          if (!('dailyFocusTimeMode' in prefs) || (prefs.dailyFocusTimeMode !== 'auto' && prefs.dailyFocusTimeMode !== 'manual')) {
            const normalizeHHmm = (raw: unknown): string | null => {
              if (typeof raw !== 'string') return null;
              const [hRaw, mRaw] = raw.trim().split(':');
              const h = Number.parseInt((hRaw ?? '').trim(), 10);
              const m = Number.parseInt((mRaw ?? '').trim(), 10);
              if (Number.isNaN(h) || Number.isNaN(m)) return null;
              if (h < 0 || h > 23 || m < 0 || m > 59) return null;
              return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
            };
            const focus = normalizeHHmm((prefs as any).dailyFocusTime);
            // Heuristic: if the stored focus time differs from known defaults, treat it as user-set.
            const inferredMode =
              focus && focus !== '08:00' && focus !== DEFAULT_DAILY_FOCUS_TIME ? 'manual' : 'auto';
            state.notificationPreferences = {
              ...state.notificationPreferences,
              dailyFocusTimeMode: inferredMode,
            };
          }

          // Backward-compatible behavior change (Dec 2025): daily focus invites should come
          // later in the day by default (to avoid colliding with the morning show-up nudge).
          //
          // Only migrate users who appear to still be on the *old default*:
          // - dailyFocusTime is missing, or
          // - dailyFocusTime equals dailyShowUpTime AND both are exactly 8:00am.
          const parseHHmm = (raw: unknown): { hour: number; minute: number } | null => {
            if (typeof raw !== 'string') return null;
            const trimmed = raw.trim();
            if (trimmed.length === 0) return null;
            const [hRaw, mRaw] = trimmed.split(':');
            const hour = Number.parseInt((hRaw ?? '').trim(), 10);
            const minute = Number.parseInt((mRaw ?? '').trim(), 10);
            if (Number.isNaN(hour) || Number.isNaN(minute)) return null;
            if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
            return { hour, minute };
          };
          const toKey = (raw: unknown): string | null => {
            const t = parseHHmm(raw);
            if (!t) return null;
            return `${t.hour.toString().padStart(2, '0')}:${t.minute.toString().padStart(2, '0')}`;
          };

          const focusKey = toKey(prefs.dailyFocusTime);
          const showUpKey = toKey(prefs.dailyShowUpTime);
          const allowDailyFocus = prefs.allowDailyFocus === true;

          const shouldBackfillFocus =
            allowDailyFocus &&
            (!focusKey || (focusKey === showUpKey && focusKey === '08:00' && showUpKey === '08:00'));

          if (shouldBackfillFocus) {
            state.notificationPreferences = {
              ...state.notificationPreferences,
              dailyFocusTime: DEFAULT_DAILY_FOCUS_TIME,
            };
          }
        }

        // Backward-compatible: older persisted stores won't have location offer preferences.
        if (
          !('locationOfferPreferences' in anyState) ||
          !anyState.locationOfferPreferences ||
          typeof anyState.locationOfferPreferences !== 'object'
        ) {
          (state as any).locationOfferPreferences = {
            enabled: false,
            osPermissionStatus: 'notRequested',
            dailyCap: 2,
            globalMinSpacingMs: 6 * 60 * 60 * 1000,
            defaultCooldownMs: 2 * 60 * 60 * 1000,
          };
        } else {
          const locationPrefs = anyState.locationOfferPreferences as any;
          if (typeof locationPrefs.enabled !== 'boolean') locationPrefs.enabled = false;
          if (
            locationPrefs.osPermissionStatus !== 'authorized' &&
            locationPrefs.osPermissionStatus !== 'denied' &&
            locationPrefs.osPermissionStatus !== 'restricted' &&
            locationPrefs.osPermissionStatus !== 'notRequested' &&
            locationPrefs.osPermissionStatus !== 'unavailable'
          ) {
            locationPrefs.osPermissionStatus = 'notRequested';
          }
          if (typeof locationPrefs.dailyCap !== 'number' || !Number.isFinite(locationPrefs.dailyCap)) {
            locationPrefs.dailyCap = 2;
          }
          if (
            typeof locationPrefs.globalMinSpacingMs !== 'number' ||
            !Number.isFinite(locationPrefs.globalMinSpacingMs)
          ) {
            locationPrefs.globalMinSpacingMs = 6 * 60 * 60 * 1000;
          }
          if (
            typeof locationPrefs.defaultCooldownMs !== 'number' ||
            !Number.isFinite(locationPrefs.defaultCooldownMs)
          ) {
            locationPrefs.defaultCooldownMs = 2 * 60 * 60 * 1000;
          }
          (state as any).locationOfferPreferences = locationPrefs;
        }

        // Backward-compatible: older persisted stores won't have focus completion timestamp.
        if (
          !('lastCompletedFocusSessionAtIso' in anyState) ||
          (anyState.lastCompletedFocusSessionAtIso !== null &&
            typeof anyState.lastCompletedFocusSessionAtIso !== 'string')
        ) {
          (state as any).lastCompletedFocusSessionAtIso = null;
        }
        if (state.forces.length === 0) {
          state.forces = canonicalForces;
        }

        // Safety cleanup: permanently remove known out-of-the-box demo objects from any
        // persisted store (including production/TestFlight upgrades where storage is carried over).
        const DEMO_ARC_ID = 'arc-demo-making';
        const DEMO_GOAL_ID = 'goal-demo-steam-desk';
        const DEMO_ACTIVITY_IDS = new Set([
          'activity-demo-panel-glueups',
          'activity-demo-router-template',
          'activity-demo-finish',
        ]);

        const hadDemoArc = state.arcs.some((arc) => arc.id === DEMO_ARC_ID);
        const hadDemoGoal = state.goals.some((goal) => goal.id === DEMO_GOAL_ID);
        const hadDemoActivities = state.activities.some((a) => DEMO_ACTIVITY_IDS.has(a.id));

        if (hadDemoArc || hadDemoGoal || hadDemoActivities) {
          // Remove demo arc first.
          state.arcs = state.arcs.filter((arc) => arc.id !== DEMO_ARC_ID);

          // Remove demo goal and any goals attached to the demo arc (defensive).
          const removedGoalIds = new Set<string>();
          state.goals = state.goals.filter((goal) => {
            const shouldRemove = goal.id === DEMO_GOAL_ID || goal.arcId === DEMO_ARC_ID;
            if (shouldRemove) removedGoalIds.add(goal.id);
            return !shouldRemove;
          });

          // Remove demo activities by ID and any activities pointing at removed demo goals.
          state.activities = state.activities.filter((activity) => {
            if (DEMO_ACTIVITY_IDS.has(activity.id)) return false;
            const gid = activity.goalId ?? null;
            if (gid && removedGoalIds.has(gid)) return false;
            if (gid === DEMO_GOAL_ID) return false;
            return true;
          });

          // Clear any stale onboarding pointers to demo objects.
          if (state.lastOnboardingArcId === DEMO_ARC_ID) {
            state.lastOnboardingArcId = null;
          }
          if (state.lastOnboardingGoalId === DEMO_GOAL_ID) {
            state.lastOnboardingGoalId = null;
          }

          // Remove any stored goal recommendations keyed by the demo arc.
          if (state.goalRecommendations && DEMO_ARC_ID in state.goalRecommendations) {
            delete state.goalRecommendations[DEMO_ARC_ID];
          }
        }

        // Safety cleanup: screenshot seed pack should never persist into non-dev builds.
        // (DevTools can install this locally for marketing screenshots.)
        if (!__DEV__) {
          const ARC_PREFIX = 'arc-screenshot-';
          const GOAL_PREFIX = 'goal-screenshot-';
          const ACTIVITY_PREFIX = 'activity-screenshot-';

          const removedArcIds = new Set<string>();
          state.arcs = (state.arcs ?? []).filter((arc) => {
            const shouldRemove = typeof arc?.id === 'string' && arc.id.startsWith(ARC_PREFIX);
            if (shouldRemove) removedArcIds.add(arc.id);
            return !shouldRemove;
          });

          const removedGoalIds = new Set<string>();
          state.goals = (state.goals ?? []).filter((goal) => {
            const id = typeof goal?.id === 'string' ? goal.id : '';
            const arcId = typeof (goal as any)?.arcId === 'string' ? (goal as any).arcId : '';
            const shouldRemove =
              (id && id.startsWith(GOAL_PREFIX)) || (arcId && removedArcIds.has(arcId));
            if (shouldRemove && id) removedGoalIds.add(id);
            return !shouldRemove;
          });

          state.activities = (state.activities ?? []).filter((activity) => {
            const id = typeof activity?.id === 'string' ? activity.id : '';
            const goalId = typeof (activity as any)?.goalId === 'string' ? (activity as any).goalId : '';
            const shouldRemove =
              (id && id.startsWith(ACTIVITY_PREFIX)) ||
              (goalId && removedGoalIds.has(goalId)) ||
              (goalId && goalId.startsWith(GOAL_PREFIX));
            return !shouldRemove;
          });

          // Clear stale pointers.
          if (state.lastOnboardingArcId && removedArcIds.has(state.lastOnboardingArcId)) {
            state.lastOnboardingArcId = null;
          }
          if (state.lastOnboardingGoalId && removedGoalIds.has(state.lastOnboardingGoalId)) {
            state.lastOnboardingGoalId = null;
          }

          // Remove any stored goal recommendations keyed by removed arcs.
          if (state.goalRecommendations) {
            for (const arcId of removedArcIds) {
              if (arcId in state.goalRecommendations) {
                delete (state.goalRecommendations as any)[arcId];
              }
            }
          }
        }

        // Backward-compatible normalization: older persisted activities may not have `tags`.
        // Ensure the field is always present as a string[].
        // Also ensure `type` exists (added later) so the UI / AI can rely on it.
        state.activities = (state.activities ?? []).map((activity) => {
          const rawTags = (activity as any).tags;
          const tags = Array.isArray(rawTags)
            ? rawTags.filter((t) => typeof t === 'string' && t.trim().length > 0)
            : [];
          const rawType = (activity as any).type;
          const maybeType = typeof rawType === 'string' ? rawType.trim() : '';
          const isValidCanonicalType =
            maybeType === 'task' ||
            maybeType === 'checklist' ||
            maybeType === 'shopping_list' ||
            maybeType === 'instructions' ||
            maybeType === 'plan';
          const isValidCustomType =
            maybeType.startsWith('custom:') && maybeType.slice('custom:'.length).trim().length > 0;
          const type: ActivityType =
            isValidCanonicalType || isValidCustomType ? (maybeType as ActivityType) : 'task';
          return { ...activity, tags, type };
        });

        // Backfill tag history for older persisted stores.
        if (!state.activityTagHistory || typeof state.activityTagHistory !== 'object') {
          state.activityTagHistory = {};
        }
        const tagHistoryKeys = Object.keys(state.activityTagHistory ?? {});
        if (tagHistoryKeys.length === 0 && Array.isArray(state.activities) && state.activities.length > 0) {
          const atIso = now();
          state.activities.forEach((activity) => {
            state.activityTagHistory = recordTagUsageForActivity(state.activityTagHistory, activity, atIso);
          });
        }

        // Backward-compatible normalization: initialize and reset generative credits monthly ledger.
        const currentMonthKey = getMonthKey(new Date());
        const rawLedger = (state as any).generativeCredits as
          | { monthKey?: unknown; usedThisMonth?: unknown }
          | undefined;
        const monthKey =
          rawLedger && typeof rawLedger.monthKey === 'string' ? rawLedger.monthKey : currentMonthKey;
        const usedRaw = rawLedger?.usedThisMonth;
        const usedThisMonth =
          typeof usedRaw === 'number' && Number.isFinite(usedRaw) ? Math.max(0, Math.floor(usedRaw)) : 0;
        state.generativeCredits =
          monthKey === currentMonthKey
            ? { monthKey, usedThisMonth }
            : { monthKey: currentMonthKey, usedThisMonth: 0 };

        // Backward-compatible normalization: bonus generative credits are monthly-scoped.
        const rawBonus = (state as any).bonusGenerativeCredits as
          | { monthKey?: unknown; bonusThisMonth?: unknown }
          | undefined;
        const bonusMonthKey =
          rawBonus && typeof rawBonus.monthKey === 'string' ? rawBonus.monthKey : currentMonthKey;
        const bonusRaw = rawBonus?.bonusThisMonth;
        const bonusThisMonth =
          typeof bonusRaw === 'number' && Number.isFinite(bonusRaw)
            ? Math.max(0, Math.floor(bonusRaw))
            : 0;
        state.bonusGenerativeCredits =
          bonusMonthKey === currentMonthKey
            ? { monthKey: bonusMonthKey, bonusThisMonth }
            : { monthKey: currentMonthKey, bonusThisMonth: 0 };

        // Backward-compatible normalization: referral redemption cache.
        if (!state.redeemedReferralCodes || typeof state.redeemedReferralCodes !== 'object') {
          state.redeemedReferralCodes = {};
        }

        // Migrate/hydrate domain objects from separate storage key to keep UI interactions fast.
        void (async () => {
          try {
            const raw = await AsyncStorage.getItem(DOMAIN_STORAGE_KEY);
            if (raw) {
              const parsed = JSON.parse(raw) as Partial<DomainState>;
              const next: Partial<DomainState> = {};
              if (Array.isArray(parsed.arcs)) next.arcs = parsed.arcs as any;
              if (Array.isArray(parsed.goals)) next.goals = parsed.goals as any;
              if (Array.isArray(parsed.activities)) next.activities = parsed.activities as any;
              if (parsed.activityTagHistory && typeof parsed.activityTagHistory === 'object') {
                next.activityTagHistory = parsed.activityTagHistory as any;
              }
              // Resiliency: hero image URIs can go stale across updates.
              // - Curated heroes: bundled asset URIs can change across builds → re-resolve from curatedId.
              // - Unsplash heroes: older builds may have stored a transient local file URI → reconstruct from photo id.
              // - Generic: if a URL uses http://, prefer https:// (ATS blocks insecure loads by default).
              const normalizeHero = <T extends { thumbnailUrl?: any; heroImageMeta?: any }>(obj: T): T => {
                const meta = obj?.heroImageMeta;
                const source = typeof meta?.source === 'string' ? meta.source : '';
                const rawUrl = typeof obj?.thumbnailUrl === 'string' ? obj.thumbnailUrl.trim() : '';

                const normalizeHttp = (url: string) => (url.startsWith('http://') ? `https://${url.slice('http://'.length)}` : url);

                // IMPORTANT: Do not rewrite hero URLs during hydration.
                // We rely on `heroImageMeta` at render-time to reconstruct stable display URLs when needed.
                // Hydration-time rewrites can accidentally overwrite previously distinct thumbnails across
                // many objects if upstream metadata is corrupted or incomplete.
                void source;

                // Generic normalization for any other remote URL.
                if (rawUrl && rawUrl !== normalizeHttp(rawUrl)) {
                  return { ...(obj as any), thumbnailUrl: normalizeHttp(rawUrl) } as T;
                }
                return obj;
              };

              if (Array.isArray(next.arcs)) next.arcs = (next.arcs as any[]).map(normalizeHero) as any;
              if (Array.isArray(next.goals)) next.goals = (next.goals as any[]).map(normalizeHero) as any;
              if (Array.isArray(next.activities)) {
                const nowIso = now();
                next.activities = (next.activities as any[])
                  .map(normalizeHero)
                  .map((activity) => normalizeActivity({ activity: activity as any, nowIso })) as any;
              }
              if (Object.keys(next).length > 0) {
                useAppStore.setState({ ...(next as any), domainHydrated: true } as any);
                return;
              }
            }

            // If no domain snapshot exists yet, seed it from the currently hydrated state.
            // (This preserves existing users upgrading from the prior monolithic persisted store.)
            schedulePersistDomainState({
              arcs: (state as any).arcs ?? [],
              goals: (state as any).goals ?? [],
              activities: (state as any).activities ?? [],
              activityTagHistory: (state as any).activityTagHistory ?? {},
            });
            useAppStore.setState({ domainHydrated: true } as any);
          } catch (error) {
            // best-effort only; still unblock UI so screens don't hang in "loading".
            useAppStore.setState({ domainHydrated: true } as any);
          }
        })();
      },
    })
  )
);

// Persist domain objects separately so lightweight UI changes don't serialize giant graphs.
useAppStore.subscribe((state, prevState) => {
  // Only persist when the domain slice references actually change.
  // This avoids persisting on unrelated startup store writes (notifications, entitlements, etc.).
  if (
    prevState &&
    state.arcs === prevState.arcs &&
    state.goals === prevState.goals &&
    state.activities === prevState.activities &&
    state.activityTagHistory === prevState.activityTagHistory
  ) {
    return;
  }

  schedulePersistDomainState({
    arcs: state.arcs ?? [],
    goals: state.goals ?? [],
    activities: state.activities ?? [],
    activityTagHistory: state.activityTagHistory ?? {},
  });
});

// If domain mutations happened before hydration completed (common during startup),
// ensure we persist them immediately once hydration flips true.
useAppStore.subscribe(
  (s) => s.domainHydrated,
  (hydrated, prevHydrated) => {
    if (hydrated === true && prevHydrated !== true) {
      flushPersistDomainState();
    }
  },
);

// Reliability: flush domain snapshot when the app backgrounds so users don't lose newly
// created objects if the process is killed before the debounce fires.
let lastKnownAppState = RNAppState.currentState;
RNAppState.addEventListener('change', (nextState) => {
  // iOS often transitions through "inactive" briefly (e.g. during startup / interruptions).
  // Only flush when truly backgrounding to reduce the risk of overwriting domain storage
  // during hydration.
  if (nextState === 'background') {
    flushPersistDomainState();
  }

  // Best-effort: count foreground returns as additional opens.
  if (nextState === 'active' && lastKnownAppState !== 'active') {
    try {
      useAppStore.getState().recordAppOpen('foreground');
    } catch {
      // best-effort
    }
  }
  lastKnownAppState = nextState;
});

export const getCanonicalForce = (forceId: string): Force | undefined =>
  canonicalForces.find((force) => force.id === forceId);

export const defaultForceLevels = (levels: ForceLevel = 0): Record<string, ForceLevel> =>
  canonicalForces.reduce<Record<string, ForceLevel>>((acc, force) => {
    acc[force.id] = levels;
    return acc;
  }, {});


