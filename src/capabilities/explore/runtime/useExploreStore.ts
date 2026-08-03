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
  rebuildExploreTerritory,
  recordPlaceVisit,
} from '../domain/exploreState';
import {
  acceptExplorePoint,
  explorePointFromSample,
  normalizeCourseDeg,
  sanitizeLocationSample,
  type ExploreLocationSample,
} from '../domain/explorePointPolicy';
import { canonicalPlaceForCandidate } from '../domain/exploreDiscovery';
import {
  classifyExploreMovement,
  createExploreTrackingState,
  normalizeExploreTrackingState,
  resumeExploreTracking,
  shouldClearFogForMovement,
  trackingPolicyForRecordingMode,
} from '../domain/exploreAdaptiveTracking';
import type {
  ExploreData,
  ExplorePoint,
  ExplorePathReconstructionSegment,
  ExplorePreferences,
  ExploreSession,
  ExploreTrackingPolicy,
  Place,
  UserPlaceRelationship,
} from '../domain/types';

type ExploreStore = ExploreData & {
  lastPointDecision: string | null;
  startSession: (startedAt?: string, id?: string, policy?: ExploreTrackingPolicy) => void;
  appendSample: (sample: ExploreLocationSample, id?: string) => boolean;
  stopSession: (endedAt?: string, reason?: ExploreData['sessions'][number]['completedReason']) => void;
  recoverInterruptedSession: () => void;
  resumeTracking: (resumedAt?: string) => void;
  updatePreferences: (patch: Partial<ExplorePreferences>) => void;
  addPlaceVisit: (params: {
    place: Place;
    userId: string;
    visitedAt?: string;
    evidence?: UserPlaceRelationship['evidence'];
  }) => void;
  resolveSessionPlaces: (sessionId: string, places: Place[], userId: string) => void;
  setSessionPathReconstruction: (sessionId: string, segments: ExplorePathReconstructionSegment[]) => void;
  markRecapSeen: (sessionId: string) => void;
  markRecapsSeen: (sessionIds: string[]) => void;
  markRecapNotified: (sessionId: string, sentAt?: string) => void;
  removeDiscoveredPlace: (sessionId: string, placeId: string, userId: string) => void;
  removeDiscoveredPlaceFromRecaps: (sessionIds: string[], placeId: string, userId: string) => void;
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
    tracking: state.tracking,
  };
}

const empty = createEmptyExploreData();

export const useExploreStore = create<ExploreStore>()(
  persist(
    (set, get) => ({
      ...empty,
      lastPointDecision: null,
      startSession: (
        startedAt = new Date().toISOString(),
        id = makeId('explore-session'),
        policy = trackingPolicyForRecordingMode(get().preferences.recording),
      ) => {
        set((state) => ({
          ...beginExploreSession(dataFromStore(state), id, startedAt, policy),
          lastPointDecision: null,
        }));
      },
      appendSample: (sample, id = makeId('explore-point')) => {
        const state = get();
        if (!state.activeSession) return false;
        const sanitized = sanitizeLocationSample(sample);
        const previous = state.activeSession.points[state.activeSession.points.length - 1] ?? null;
        const movement = classifyExploreMovement(previous, sanitized);
        const tracking = { ...state.tracking, movement };
        if (!shouldClearFogForMovement(movement)) {
          set({ tracking, lastPointDecision: `movement-${movement}` });
          return false;
        }
        const decision = acceptExplorePoint(previous, sanitized);
        if (!decision.accepted) {
          set({ tracking, lastPointDecision: decision.reason });
          return false;
        }
        const point = explorePointFromSample(id, sanitized);
        set((current) => ({
          ...appendExplorePoint({ ...dataFromStore(current), tracking }, point),
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
            return {
              activeSession: null,
              tracking: createExploreTrackingState(),
              lastPointDecision: null,
            };
          }
          const finalPoint = state.activeSession.points[state.activeSession.points.length - 1];
          return {
            ...completeExploreSession(dataFromStore(state), finalPoint.recordedAt, 'interrupted'),
            lastPointDecision: null,
          };
        });
      },
      resumeTracking: (resumedAt = new Date().toISOString()) => {
        set((state) => state.tracking.policy
          ? { tracking: resumeExploreTracking(state.tracking, resumedAt) }
          : state);
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
      setSessionPathReconstruction: (sessionId, reconstructedSegments) => {
        set((state) => {
          const next = dataFromStore(state);
          const sessions = next.sessions.map((session) => session.id === sessionId
            ? { ...session, reconstructedSegments }
            : session);
          const rebuilt = rebuildExploreTerritory({ ...next, sessions });
          return { ...rebuilt, lastPointDecision: state.lastPointDecision };
        });
      },
      markRecapSeen: (sessionId) => {
        set((state) => ({
          ...markExploreRecapSeen(dataFromStore(state), sessionId),
          lastPointDecision: state.lastPointDecision,
        }));
      },
      markRecapsSeen: (sessionIds) => {
        set((state) => {
          const selected = new Set(sessionIds);
          let next = dataFromStore(state);
          selected.forEach((sessionId) => {
            next = markExploreRecapSeen(next, sessionId);
          });
          return { ...next, lastPointDecision: state.lastPointDecision };
        });
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
      removeDiscoveredPlaceFromRecaps: (sessionIds, placeId, userId) => {
        set((state) => {
          const relationshipId = `${userId}:${placeId}`;
          const nextRelationships = { ...state.placeRelationships };
          delete nextRelationships[relationshipId];
          const placeStillUsed = Object.values(nextRelationships).some((relationship) => relationship.placeId === placeId);
          const nextPlaces = { ...state.places };
          if (!placeStillUsed) delete nextPlaces[placeId];
          const selected = new Set(sessionIds);
          return {
            placeRelationships: nextRelationships,
            places: nextPlaces,
            sessions: state.sessions.map((session) => selected.has(session.id)
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
          speedMps: null,
          courseDeg: null,
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
      version: 9,
      storage: createJSONStorage(() => AsyncStorage),
      migrate: (persistedState: unknown) => {
        const persisted = (persistedState ?? {}) as Partial<ExploreData>;
        const defaults = createEmptyExploreData();
        const upgradeSession = (
          session: Partial<ExploreSession>,
          fallbackPolicy: ExploreTrackingPolicy = 'ambient',
        ) => ({
          ...session,
          trackingPolicy: session.trackingPolicy === 'adventure' || session.trackingPolicy === 'ambient'
            ? session.trackingPolicy
            : fallbackPolicy,
          points: Array.isArray(session?.points) ? session.points.map((point) => ({
            ...point,
            speedMps: typeof point.speedMps === 'number' && Number.isFinite(point.speedMps) && point.speedMps >= 0
              ? point.speedMps
              : null,
            courseDeg: normalizeCourseDeg(point.courseDeg),
          })) : [],
          reconstructedSegments: Array.isArray(session?.reconstructedSegments)
            ? session.reconstructedSegments
            : [],
          discoveredPlaceIds: Array.isArray(session?.discoveredPlaceIds) ? session.discoveredPlaceIds : [],
          recapStatus: session?.recapStatus ?? (session?.endedAt && session?.points?.length ? 'seen' : 'none'),
          completedReason: session?.completedReason ?? (session?.endedAt ? 'interrupted' : null),
          recapNotificationSentAt: session?.recapNotificationSentAt ?? null,
          backgroundStillnessAnchor: session?.backgroundStillnessAnchor ?? null,
          backgroundStillSince: session?.backgroundStillSince ?? null,
        });
        const persistedPreferences = (persisted.preferences ?? {}) as Partial<ExplorePreferences> & {
          keepRecordingInBackground?: boolean;
        };
        const { keepRecordingInBackground: _legacyBackgroundToggle, ...preferences } = persistedPreferences;
        const hadPersistedHistory = Boolean(
          persisted.activeSession?.points?.length ||
          persisted.sessions?.some((session) => session.points?.length) ||
          Object.keys(persisted.exploredCells ?? {}).length,
        );
        const nextPreferences = {
          ...defaults.preferences,
          ...preferences,
          onboardingCompleted: typeof preferences.onboardingCompleted === 'boolean'
            ? preferences.onboardingCompleted
            : hadPersistedHistory,
        };
        const activeFallbackPolicy = persisted.tracking?.policy === 'adventure' || persisted.tracking?.policy === 'ambient'
          ? persisted.tracking.policy
          : trackingPolicyForRecordingMode(nextPreferences.recording);
        const activeSession = persisted.activeSession
          ? upgradeSession(persisted.activeSession, activeFallbackPolicy)
          : null;
        return rebuildExploreTerritory({
          ...defaults,
          ...persisted,
          version: 9,
          activeSession,
          sessions: Array.isArray(persisted.sessions)
            ? persisted.sessions.map((session) => upgradeSession(session))
            : [],
          preferences: nextPreferences,
          tracking: normalizeExploreTrackingState(
            persisted.tracking,
            activeSession ? trackingPolicyForRecordingMode(nextPreferences.recording) : null,
            activeSession?.startedAt ?? null,
          ),
        } as ExploreData);
      },
      partialize: (state) => dataFromStore(state),
    },
  ),
);
