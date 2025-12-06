import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Activity,
  ActivityView,
  Arc,
  ArcProposalFeedback,
  Force,
  ForceLevel,
  Goal,
  GoalDraft,
  UserProfile,
} from '../domain/types';

export type LlmModel = 'gpt-4o-mini' | 'gpt-4o' | 'gpt-5.1';

type Updater<T> = (item: T) => T;

interface AppState {
  forces: Force[];
  arcs: Arc[];
  goals: Goal[];
  activities: Activity[];
  /**
   * When set, this is the goal that was most recently created by the
   * first-time onboarding flow so we can land the user directly on it.
   */
  goalRecommendations: Record<string, GoalDraft[]>;
  arcFeedback: ArcProposalFeedback[];
  userProfile: UserProfile | null;
  llmModel: LlmModel;
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
   * Per-user denylist of celebration GIF ids that should never be shown again.
   * Populated via lightweight "Not quite right" feedback controls.
   */
  blockedCelebrationGifIds: string[];
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
  setLastOnboardingArcId: (arcId: string | null) => void;
  setHasSeenFirstArcCelebration: (seen: boolean) => void;
  setLastOnboardingGoalId: (goalId: string | null) => void;
  setHasSeenFirstGoalCelebration: (seen: boolean) => void;
  setActiveActivityViewId: (viewId: string | null) => void;
  addActivityView: (view: ActivityView) => void;
  updateActivityView: (viewId: string, updater: Updater<ActivityView>) => void;
  removeActivityView: (viewId: string) => void;
  blockCelebrationGif: (gifId: string) => void;
  likeCelebrationGif: (gif: { id: string; url: string; role: MediaRole; kind: CelebrationKind }) => void;
  blockCelebrationGif: (gifId: string) => void;
  resetOnboardingAnswers: () => void;
  resetStore: () => void;
}

const now = () => new Date().toISOString();

const buildDefaultUserProfile = (): UserProfile => {
  const timestamp = now();
  return {
    id: 'local-user',
    createdAt: timestamp,
    updatedAt: timestamp,
    communication: {},
    visuals: {},
    preferences: {
      showCelebrationMedia: true,
    },
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

const initialDemoArc: Arc = {
  id: 'arc-demo-making',
  name: '🪚 Making & Embodied Creativity',
  narrative:
    'Stay connected to the physical world through projects that build skill, presence, and grounding.',
  status: 'active',
  startDate: now(),
  endDate: null,
  createdAt: now(),
  updatedAt: now(),
};

const initialDemoGoal: Goal = {
  id: 'goal-demo-steam-desk',
  arcId: initialDemoArc.id,
  title: 'Build the STEAM room desk',
  description:
    'Complete the STEAM room desk with thoughtful joinery, clean finish, and intentional cable management.',
  status: 'in_progress',
  startDate: now(),
  targetDate: undefined,
  forceIntent: {
    'force-activity': 3,
    'force-mastery': 2,
    'force-connection': 1,
    'force-spirituality': 1,
  },
  metrics: [],
  createdAt: now(),
  updatedAt: now(),
};

const initialDemoActivities: Activity[] = [
  {
    id: 'activity-demo-panel-glueups',
    goalId: initialDemoGoal.id,
    title: 'Panel glue-ups for desktop',
    notes: 'Prep boards, apply glue, clamp, flatten after cure.',
    estimateMinutes: 180,
    scheduledDate: now(),
    orderIndex: 1,
    phase: 'Build',
    status: 'in_progress',
    actualMinutes: 90,
    startedAt: now(),
    completedAt: null,
    forceActual: {
      'force-activity': 3,
      'force-mastery': 2,
      'force-connection': 0,
      'force-spirituality': 0,
    },
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: 'activity-demo-router-template',
    goalId: initialDemoGoal.id,
    title: 'Design router template for cable cutouts',
    notes: 'Rough sketch, build template, test on scrap.',
    estimateMinutes: 90,
    scheduledDate: now(),
    orderIndex: 2,
    phase: 'Design',
    status: 'planned',
    actualMinutes: null,
    startedAt: null,
    completedAt: null,
    forceActual: {
      'force-activity': 2,
      'force-mastery': 2,
      'force-connection': 0,
      'force-spirituality': 0,
    },
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: 'activity-demo-finish',
    goalId: initialDemoGoal.id,
    title: 'Finish sanding + oil finish',
    notes: 'Progress through grits, apply Rubio, buff.',
    estimateMinutes: 120,
    scheduledDate: now(),
    orderIndex: 3,
    phase: 'Finish',
    status: 'planned',
    actualMinutes: null,
    startedAt: null,
    completedAt: null,
    forceActual: {
      'force-activity': 2,
      'force-mastery': 1,
      'force-connection': 0,
      'force-spirituality': 1,
    },
    createdAt: now(),
    updatedAt: now(),
  },
];

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
    name: 'Priority 1 focus',
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
      arcs: [initialDemoArc],
      goals: [initialDemoGoal],
      activities: initialDemoActivities,
      activityViews: initialActivityViews,
      activeActivityViewId: 'default',
      goalRecommendations: {},
      arcFeedback: [],
      blockedCelebrationGifIds: [],
      userProfile: buildDefaultUserProfile(),
      llmModel: 'gpt-4o-mini',
      lastOnboardingArcId: null,
      lastOnboardingGoalId: null,
      hasSeenFirstArcCelebration: false,
      hasSeenFirstGoalCelebration: false,
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
      addGoal: (goal) => set((state) => ({ goals: [...state.goals, goal] })),
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
          };
        }),
      addActivity: (activity) => set((state) => ({ activities: [...state.activities, activity] })),
      updateActivity: (activityId, updater) =>
        set((state) => ({
          activities: withUpdate(state.activities, activityId, updater),
        })),
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
              updatedAt: now(),
            },
            lastOnboardingArcId: null,
            lastOnboardingGoalId: null,
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
          goalRecommendations: {},
          userProfile: buildDefaultUserProfile(),
          activityViews: initialActivityViews,
          activeActivityViewId: 'default',
          lastOnboardingArcId: null,
          lastOnboardingGoalId: null,
          hasSeenFirstGoalCelebration: false,
          hasSeenFirstArcCelebration: false,
          blockedCelebrationGifIds: [],
          likedCelebrationGifs: [],
        }),
    }),
    {
      // AsyncStorage namespace for the main kwilt app store.
      name: 'kwilt-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => state,
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        if (state.forces.length === 0) {
          state.forces = canonicalForces;
        }
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


