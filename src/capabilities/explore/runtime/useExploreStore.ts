import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import {
  appendExplorePoint,
  beginExploreSession,
  completeExploreSession,
  createEmptyExploreData,
  finalizeExploreRecap,
  markExploreRecapNotified,
  markExploreRecapSeen,
  recordPlaceVisit,
} from '../domain/exploreState';
import { acceptExplorePoint, sanitizeLocationSample, type ExploreLocationSample } from '../domain/explorePointPolicy';
import { canonicalPlaceForCandidate } from '../domain/exploreDiscovery';
import type {
  ExploreData,
  ExplorePoint,
  ExplorePreferences,
  ExploreSession,
  Place,
  UserPlaceRelationship,
} from '../domain/types';

type ExploreStore = ExploreData & {
  lastPointDecision: string | null;
  startSession: (startedAt?: string, id?: string) => void;
  appendSample: (sample: ExploreLocationSample, id?: string) => boolean;
  stopSession: (endedAt?: string, reason?: ExploreData['sessions'][number]['completedReason']) => void;
  recoverInterruptedSession: () => void;
  updatePreferences: (patch: Partial<ExplorePreferences>) => void;
  addPlaceVisit: (params: {
    place: Place;
    userId: string;
    visitedAt?: string;
    evidence?: UserPlaceRelationship['evidence'];
  }) => void;
  resolveSessionPlaces: (sessionId: string, places: Place[], userId: string) => void;
  markRecapSeen: (sessionId: string) => void;
  markRecapNotified: (sessionId: string, sentAt?: string) => void;
  removeDiscoveredPlace: (sessionId: string, placeId: string, userId: string) => void;
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
      stopSession: (endedAt = new Date().toISOString(), reason = 'manual') => {
        set((state) => ({
          ...completeExploreSession(dataFromStore(state), endedAt, reason),
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
            ...completeExploreSession(dataFromStore(state), finalPoint.recordedAt, 'interrupted'),
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
      resolveSessionPlaces: (sessionId, places, userId) => {
        set((state) => {
          let next = dataFromStore(state);
          const session = next.sessions.find((candidate) => candidate.id === sessionId);
          if (!session) return state;
          const discoveredPlaceIds: string[] = [];
          const canonicalPlaces = places.map((place) => canonicalPlaceForCandidate(Object.values(next.places), place));
          const uniquePlaces = [...new Map(canonicalPlaces.map((place) => [place.id, place])).values()];
          uniquePlaces.forEach((place) => {
            const relationshipId = `${userId}:${place.id}`;
            const wasKnown = Boolean(next.placeRelationships[relationshipId]);
            next = recordPlaceVisit(next, {
              place,
              userId,
              visitedAt: session.endedAt ?? session.startedAt,
              evidence: 'route-intersection',
            });
            if (!wasKnown) discoveredPlaceIds.push(place.id);
          });
          return {
            ...finalizeExploreRecap(next, sessionId, discoveredPlaceIds),
            lastPointDecision: state.lastPointDecision,
          };
        });
      },
      markRecapSeen: (sessionId) => {
        set((state) => ({
          ...markExploreRecapSeen(dataFromStore(state), sessionId),
          lastPointDecision: state.lastPointDecision,
        }));
      },
      markRecapNotified: (sessionId, sentAt = new Date().toISOString()) => {
        set((state) => ({
          ...markExploreRecapNotified(dataFromStore(state), sessionId, sentAt),
          lastPointDecision: state.lastPointDecision,
        }));
      },
      removeDiscoveredPlace: (sessionId, placeId, userId) => {
        set((state) => {
          const relationshipId = `${userId}:${placeId}`;
          const nextRelationships = { ...state.placeRelationships };
          delete nextRelationships[relationshipId];
          const placeStillUsed = Object.values(nextRelationships).some((relationship) => relationship.placeId === placeId);
          const nextPlaces = { ...state.places };
          if (!placeStillUsed) delete nextPlaces[placeId];
          return {
            placeRelationships: nextRelationships,
            places: nextPlaces,
            sessions: state.sessions.map((session) => session.id === sessionId
              ? { ...session, discoveredPlaceIds: session.discoveredPlaceIds.filter((id) => id !== placeId) }
              : session),
          };
        });
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
        const previewPlaces: Place[] = [
          { id: 'apple:spring-canyon-park:40.5853:-105.0844', name: 'Spring Canyon Park', kind: 'park', latitude: 40.58526, longitude: -105.08442, source: 'apple-maps' },
          { id: 'apple:foothills-trail:40.5866:-105.0842', name: 'Foothills Trail', kind: 'trail', latitude: 40.58662, longitude: -105.08416, source: 'apple-maps' },
          { id: 'apple:harmony-overlook:40.5879:-105.0840', name: 'Harmony Overlook', kind: 'overlook', latitude: 40.58788, longitude: -105.08398, source: 'apple-maps' },
        ];
        const previewSessionId = next.sessions[0].id;
        previewPlaces.forEach((place) => {
          next = recordPlaceVisit(next, { place, userId: 'local-user', visitedAt: new Date().toISOString(), evidence: 'route-intersection' });
        });
        next = finalizeExploreRecap(next, previewSessionId, previewPlaces.map((place) => place.id));
        set((state) => ({
          ...next,
          preferences: state.preferences,
          lastPointDecision: null,
        }));
      },
    }),
    {
      name: 'kwilt-explore-v1',
      version: 2,
      storage: createJSONStorage(() => AsyncStorage),
      migrate: (persistedState: unknown) => {
        const persisted = (persistedState ?? {}) as Partial<ExploreData>;
        const defaults = createEmptyExploreData();
        const upgradeSession = (session: Partial<ExploreSession>) => ({
          ...session,
          discoveredPlaceIds: Array.isArray(session?.discoveredPlaceIds) ? session.discoveredPlaceIds : [],
          recapStatus: session?.recapStatus ?? (session?.endedAt && session?.points?.length ? 'seen' : 'none'),
          completedReason: session?.completedReason ?? (session?.endedAt ? 'interrupted' : null),
          recapNotificationSentAt: session?.recapNotificationSentAt ?? null,
          backgroundStillnessAnchor: session?.backgroundStillnessAnchor ?? null,
          backgroundStillSince: session?.backgroundStillSince ?? null,
        });
        return {
          ...defaults,
          ...persisted,
          version: 2,
          activeSession: persisted.activeSession ? upgradeSession(persisted.activeSession) : null,
          sessions: Array.isArray(persisted.sessions) ? persisted.sessions.map(upgradeSession) : [],
          preferences: { ...defaults.preferences, ...(persisted.preferences ?? {}) },
        } as ExploreData;
      },
      partialize: (state) => dataFromStore(state),
    },
  ),
);
