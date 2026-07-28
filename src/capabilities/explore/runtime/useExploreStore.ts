import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import {
  appendExplorePoint,
  beginExploreSession,
  completeExploreSession,
  createEmptyExploreData,
  recordPlaceVisit,
} from '../domain/exploreState';
import { acceptExplorePoint, sanitizeLocationSample, type ExploreLocationSample } from '../domain/explorePointPolicy';
import type {
  ExploreData,
  ExplorePoint,
  ExplorePreferences,
  Place,
  UserPlaceRelationship,
} from '../domain/types';

type ExploreStore = ExploreData & {
  lastPointDecision: string | null;
  startSession: (startedAt?: string, id?: string) => void;
  appendSample: (sample: ExploreLocationSample, id?: string) => boolean;
  stopSession: (endedAt?: string) => void;
  recoverInterruptedSession: () => void;
  updatePreferences: (patch: Partial<ExplorePreferences>) => void;
  addPlaceVisit: (params: {
    place: Place;
    userId: string;
    visitedAt?: string;
    evidence?: UserPlaceRelationship['evidence'];
  }) => void;
  clearHistory: () => void;
  loadPreviewAdventure: () => void;
};

function makeId(prefix: string): string {
  const suffix = typeof globalThis.crypto?.randomUUID === 'function'
    ? globalThis.crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix}-${suffix}`;
}

function dataFromStore(state: ExploreStore): ExploreData {
  return {
    version: state.version,
    activeSession: state.activeSession,
    sessions: state.sessions,
    exploredCells: state.exploredCells,
    places: state.places,
    placeRelationships: state.placeRelationships,
    preferences: state.preferences,
  };
}

const empty = createEmptyExploreData();

export const useExploreStore = create<ExploreStore>()(
  persist(
    (set, get) => ({
      ...empty,
      lastPointDecision: null,
      startSession: (startedAt = new Date().toISOString(), id = makeId('explore-session')) => {
        set((state) => ({
          ...beginExploreSession(dataFromStore(state), id, startedAt),
          lastPointDecision: null,
        }));
      },
      appendSample: (sample, id = makeId('explore-point')) => {
        const state = get();
        if (!state.activeSession) return false;
        const sanitized = sanitizeLocationSample(sample);
        const previous = state.activeSession.points[state.activeSession.points.length - 1] ?? null;
        const decision = acceptExplorePoint(previous, sanitized);
        if (!decision.accepted) {
          set({ lastPointDecision: decision.reason });
          return false;
        }
        const point: ExplorePoint = { id, ...sanitized };
        set((current) => ({
          ...appendExplorePoint(dataFromStore(current), point),
          lastPointDecision: decision.reason,
        }));
        return true;
      },
      stopSession: (endedAt = new Date().toISOString()) => {
        set((state) => ({
          ...completeExploreSession(dataFromStore(state), endedAt),
          lastPointDecision: null,
        }));
      },
      recoverInterruptedSession: () => {
        set((state) => {
          if (!state.activeSession) return state;
          if (state.activeSession.points.length === 0) {
            return { activeSession: null, lastPointDecision: null };
          }
          const finalPoint = state.activeSession.points[state.activeSession.points.length - 1];
          return {
            ...completeExploreSession(dataFromStore(state), finalPoint.recordedAt),
            lastPointDecision: null,
          };
        });
      },
      updatePreferences: (patch) => {
        set((state) => ({ preferences: { ...state.preferences, ...patch } }));
      },
      addPlaceVisit: ({
        place,
        userId,
        visitedAt = new Date().toISOString(),
        evidence = 'user-confirmed',
      }) => {
        set((state) => recordPlaceVisit(dataFromStore(state), { place, userId, visitedAt, evidence }));
      },
      clearHistory: () => {
        set((state) => ({
          ...createEmptyExploreData(),
          preferences: state.preferences,
          lastPointDecision: null,
        }));
      },
      loadPreviewAdventure: () => {
        const startedAt = new Date(Date.now() - 12 * 60_000).toISOString();
        const anchor = { latitude: 40.58526, longitude: -105.08442 };
        let next = beginExploreSession(createEmptyExploreData(), makeId('preview-session'), startedAt);
        const points = Array.from({ length: 18 }, (_, index): ExplorePoint => ({
          id: `preview-point-${index}`,
          latitude: anchor.latitude + index * 0.00017,
          longitude: anchor.longitude + Math.sin(index / 2.6) * 0.00045,
          altitudeM: 1518 + index * 22,
          horizontalAccuracyM: 6,
          altitudeAccuracyM: 5,
          recordedAt: new Date(Date.parse(startedAt) + index * 40_000).toISOString(),
        }));
        points.forEach((point) => {
          next = appendExplorePoint(next, point);
        });
        next = completeExploreSession(next, new Date().toISOString());
        set((state) => ({
          ...next,
          preferences: state.preferences,
          lastPointDecision: null,
        }));
      },
    }),
    {
      name: 'kwilt-explore-v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => dataFromStore(state),
      onRehydrateStorage: () => (state) => {
        state?.recoverInterruptedSession();
      },
    },
  ),
);
