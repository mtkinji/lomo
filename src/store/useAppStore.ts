import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
import {
  FREE_GENERATIVE_CREDITS_PER_MONTH,
  PRO_GENERATIVE_CREDITS_PER_MONTH,
  getMonthKey,
} from '../domain/generativeCredits';
import type { CelebrationKind, MediaRole } from '../services/gifs';
import { useToastStore } from './useToastStore';

export type LlmModel = 'gpt-4o-mini' | 'gpt-4o' | 'gpt-5.1';

type Updater<T> = (item: T) => T;

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
   * Dev-only feature flags / experiments. Persisted so we can A/B UX patterns
   * locally across reloads, but always gated behind `__DEV__` at the callsite.
   */
  devBreadcrumbsEnabled: boolean;
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
    allowGoalNudges: boolean;
    goalNudgeTime: string | null;
    allowStreakAndReactivation: boolean;
  };
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
   * Simple engagement state for show-up streaks and recent activity.
   */
  lastShowUpDate: string | null;
  currentShowUpStreak: number;
  lastActiveDate: string | null;
  /**
   * Focus mode streak: counts days where the user completes at least one *full*
   * Focus session (timer reaches zero). This is independent from "show up".
   *
   * Dates are stored as local calendar keys: YYYY-MM-DD (local time).
   */
  lastCompletedFocusSessionDate: string | null;
  currentFocusStreak: number;
  bestFocusStreak: number;
  /**
   * When set, this is the goal that was most recently created by the
   * first-time onboarding flow so we can land the user directly on it.
   */
  goalRecommendations: Record<string, GoalDraft[]>;
  arcFeedback: ArcProposalFeedback[];
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
   * One-time flag indicating that the user has completed the first-time
   * onboarding flow. Used to avoid re-triggering FTUE on subsequent launches.
   */
  hasCompletedFirstTimeOnboarding: boolean;
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
  setLastFocusMinutes: (minutes: number) => void;
  setSoundscapeEnabled: (enabled: boolean) => void;
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
  addArc: (arc: Arc) => void;
  updateArc: (arcId: string, updater: Updater<Arc>) => void;
  removeArc: (arcId: string) => void;
  addGoal: (goal: Goal) => void;
  updateGoal: (goalId: string, updater: Updater<Goal>) => void;
  removeGoal: (goalId: string) => void;
  addActivity: (activity: Activity) => void;
  updateActivity: (activityId: string, updater: Updater<Activity>) => void;
  removeActivity: (activityId: string) => void;
  setGoalRecommendations: (arcId: string, goals: GoalDraft[]) => void;
  dismissGoalRecommendation: (arcId: string, goalTitle: string) => void;
  clearGoalRecommendations: (arcId: string) => void;
  addArcFeedback: (feedback: ArcProposalFeedback) => void;
  setUserProfile: (profile: UserProfile) => void;
  updateUserProfile: (updater: (current: UserProfile) => UserProfile) => void;
  clearUserProfile: () => void;
  setLlmModel: (model: LlmModel) => void;
  tryConsumeGenerativeCredit: (params: {
    tier: 'free' | 'pro';
  }) => { ok: boolean; remaining: number; limit: number };
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
  setHasSeenOnboardingSharePrompt: (seen: boolean) => void;
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
  setActiveActivityViewId: (viewId: string | null) => void;
  addActivityView: (view: ActivityView) => void;
  updateActivityView: (viewId: string, updater: Updater<ActivityView>) => void;
  removeActivityView: (viewId: string) => void;
  blockCelebrationGif: (gifId: string) => void;
  likeCelebrationGif: (gif: { id: string; url: string; role: MediaRole; kind: CelebrationKind }) => void;
  setDevBreadcrumbsEnabled: (enabled: boolean) => void;
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

export const useAppStore = create(
  persist<AppState>(
    (set, get) => ({
      forces: canonicalForces,
      arcs: initialArcs,
      goals: initialGoals,
      activities: initialActivities,
      activityTagHistory: {},
      devBreadcrumbsEnabled: false,
      notificationPreferences: {
        notificationsEnabled: false,
        osPermissionStatus: 'notRequested',
        allowActivityReminders: false,
        allowDailyShowUp: false,
        dailyShowUpTime: null,
        allowDailyFocus: false,
        dailyFocusTime: null,
        // System nudge: default ON once notifications are enabled (user can toggle off).
        allowGoalNudges: true,
        goalNudgeTime: null,
        allowStreakAndReactivation: false,
      },
      lastFocusMinutes: null,
      soundscapeEnabled: false,
      lastShowUpDate: null,
      currentShowUpStreak: 0,
      lastActiveDate: null,
      lastCompletedFocusSessionDate: null,
      currentFocusStreak: 0,
      bestFocusStreak: 0,
      activityViews: initialActivityViews,
      activeActivityViewId: 'default',
      goalRecommendations: {},
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
      userProfile: buildDefaultUserProfile(),
      llmModel: 'gpt-4o-mini',
      generativeCredits: {
        monthKey: getMonthKey(new Date()),
        usedThisMonth: 0,
      },
      hasCompletedFirstTimeOnboarding: false,
      lastOnboardingArcId: null,
      lastOnboardingGoalId: null,
      hasSeenFirstArcCelebration: false,
      hasSeenFirstGoalCelebration: false,
      hasSeenOnboardingSharePrompt: false,
      hasSeenRefineUndoCoachmark: false,
      hasDismissedOnboardingGoalGuide: false,
      hasDismissedOnboardingActivitiesGuide: false,
      hasDismissedOnboardingPlanReadyGuide: false,
      pendingPostGoalPlanGuideGoalId: null,
      dismissedPostGoalPlanGuideGoalIds: {},
      hasDismissedGoalVectorsGuide: false,
      hasDismissedActivitiesListGuide: false,
      hasDismissedActivityDetailGuide: false,
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
          return {
            activities: [...state.activities, activity],
            activityTagHistory: recordTagUsageForActivity(state.activityTagHistory, activity, atIso),
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
          const shouldRecordUsage =
            prev != null &&
            next != null &&
            (!tagsEqualForCompare(prev.tags, next.tags) ||
              prev.title !== next.title ||
              prev.type !== next.type);

          return {
            activities: nextActivities,
            activityTagHistory: shouldRecordUsage && next
              ? recordTagUsageForActivity(state.activityTagHistory, next, atIso)
              : state.activityTagHistory,
          };
        }),
      removeActivity: (activityId) =>
        set((state) => ({
          activities: state.activities.filter((activity) => activity.id !== activityId),
        })),
      setGoalRecommendations: (arcId, goals) =>
        set((state) => ({
          goalRecommendations: {
            ...state.goalRecommendations,
            [arcId]: goals,
          },
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
      setHasSeenOnboardingSharePrompt: (seen) =>
        set(() => ({
          hasSeenOnboardingSharePrompt: seen,
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
        const limit =
          tier === 'pro'
            ? PRO_GENERATIVE_CREDITS_PER_MONTH
            : FREE_GENERATIVE_CREDITS_PER_MONTH;
        const currentKey = getMonthKey(new Date());
        const ledger = get().generativeCredits ?? { monthKey: currentKey, usedThisMonth: 0 };
        const normalized =
          ledger.monthKey === currentKey
            ? ledger
            : { monthKey: currentKey, usedThisMonth: 0 };
        const used = Math.max(0, Math.floor(normalized.usedThisMonth ?? 0));
        const remaining = Math.max(0, limit - used);
        if (remaining <= 0) {
          if (ledger.monthKey !== currentKey) {
            set(() => ({ generativeCredits: normalized }));
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
      setLastFocusMinutes: (minutes) =>
        set(() => ({
          lastFocusMinutes: Number.isFinite(minutes) ? Math.max(1, Math.round(minutes)) : null,
        })),
      setSoundscapeEnabled: (enabled) =>
        set(() => ({
          soundscapeEnabled: Boolean(enabled),
        })),
      recordShowUp: () =>
        set((state) => {
          const nowDate = new Date();
          // Use local calendar days (not UTC) so streaks match user intuition.
          const todayKey = localDateKey(nowDate);
          const prevKey = state.lastShowUpDate;
          const prevStreak = state.currentShowUpStreak ?? 0;

          if (prevKey === todayKey) {
            // Already counted today.
            return {
              ...state,
              lastActiveDate: state.lastActiveDate ?? nowDate.toISOString(),
            };
          }

          let nextStreak = 1;
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
                nextStreak = prevStreak + 1;
              }
            }
          }

          return {
            ...state,
            lastShowUpDate: todayKey,
            currentShowUpStreak: nextStreak,
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

          if (prevKey === todayKey) {
            // Already counted today.
            return {
              ...state,
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
            currentFocusStreak: nextStreak,
            bestFocusStreak,
            lastActiveDate: nowDate.toISOString(),
          };
        }),
      resetShowUpStreak: () =>
        set((state) => ({
          ...state,
          lastShowUpDate: null,
          currentShowUpStreak: 0,
        })),
      resetFocusStreak: () =>
        set((state) => ({
          ...state,
          lastCompletedFocusSessionDate: null,
          currentFocusStreak: 0,
          bestFocusStreak: 0,
        })),
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
          devBreadcrumbsEnabled: false,
          goalRecommendations: {},
          userProfile: buildDefaultUserProfile(),
          activityViews: initialActivityViews,
          activeActivityViewId: 'default',
          lastFocusMinutes: null,
          soundscapeEnabled: false,
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
          hasDismissedArcExploreGuide: false,
          blockedCelebrationGifIds: [],
          likedCelebrationGifs: [],
          agentHostActions: [],
          hasCompletedFirstTimeOnboarding: false,
          lastShowUpDate: null,
          currentShowUpStreak: 0,
          lastActiveDate: null,
          lastCompletedFocusSessionDate: null,
          currentFocusStreak: 0,
          bestFocusStreak: 0,
        }),
    }),
    {
      // AsyncStorage namespace for the main kwilt app store.
      name: 'kwilt-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => state,
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        // Backward-compatible: older persisted stores won't have goal nudge time.
        // Default to a high-engagement "afternoon momentum" time.
        const prefs = state.notificationPreferences as any;
        if (prefs && typeof prefs === 'object') {
          if (!('goalNudgeTime' in prefs) || typeof prefs.goalNudgeTime !== 'string') {
            state.notificationPreferences = {
              ...state.notificationPreferences,
              goalNudgeTime: '16:00',
            };
          }
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
      },
    }
  )
);

export const getCanonicalForce = (forceId: string): Force | undefined =>
  canonicalForces.find((force) => force.id === forceId);

export const defaultForceLevels = (levels: ForceLevel = 0): Record<string, ForceLevel> =>
  canonicalForces.reduce<Record<string, ForceLevel>>((acc, force) => {
    acc[force.id] = levels;
    return acc;
  }, {});


