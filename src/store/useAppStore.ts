import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Activity, Arc, Force, ForceLevel, Goal, GoalDraft } from '../domain/types';

type Updater<T> = (item: T) => T;

interface AppState {
  forces: Force[];
  arcs: Arc[];
  goals: Goal[];
  activities: Activity[];
  goalRecommendations: Record<string, GoalDraft[]>;
  addArc: (arc: Arc) => void;
  updateArc: (arcId: string, updater: Updater<Arc>) => void;
  addGoal: (goal: Goal) => void;
  updateGoal: (goalId: string, updater: Updater<Goal>) => void;
  addActivity: (activity: Activity) => void;
  updateActivity: (activityId: string, updater: Updater<Activity>) => void;
  setGoalRecommendations: (arcId: string, goals: GoalDraft[]) => void;
  dismissGoalRecommendation: (arcId: string, goalTitle: string) => void;
  clearGoalRecommendations: (arcId: string) => void;
  resetStore: () => void;
}

const now = () => new Date().toISOString();

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
  northStar: 'Cultivate the hands and habits of a craftsman.',
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

export const useAppStore = create(
  persist<AppState>(
    (set, get) => ({
      forces: canonicalForces,
      arcs: [initialDemoArc],
      goals: [initialDemoGoal],
      activities: initialDemoActivities,
      goalRecommendations: {},
      addArc: (arc) => set((state) => ({ arcs: [...state.arcs, arc] })),
      updateArc: (arcId, updater) =>
        set((state) => ({
          arcs: withUpdate(state.arcs, arcId, updater),
        })),
      addGoal: (goal) => set((state) => ({ goals: [...state.goals, goal] })),
      updateGoal: (goalId, updater) =>
        set((state) => ({
          goals: withUpdate(state.goals, goalId, updater),
        })),
      addActivity: (activity) => set((state) => ({ activities: [...state.activities, activity] })),
      updateActivity: (activityId, updater) =>
        set((state) => ({
          activities: withUpdate(state.activities, activityId, updater),
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
      resetStore: () =>
        set({
          forces: canonicalForces,
          arcs: [],
          goals: [],
          activities: [],
          goalRecommendations: {},
        }),
    }),
    {
      name: 'lomo-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        forces: state.forces,
        arcs: state.arcs,
        goals: state.goals,
        activities: state.activities,
        goalRecommendations: state.goalRecommendations,
      }),
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


