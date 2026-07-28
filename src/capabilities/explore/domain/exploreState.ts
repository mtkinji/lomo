import { exploreCellForCoordinate, exploreCellsAlongSegment } from './exploreGeometry';
import { createExploreTrackingState } from './exploreAdaptiveTracking';
import { createDefaultExplorePreferences } from './explorePrivacy';
import type { ExploreData, ExplorePoint, ExploreSession, ExploreTrackingPolicy, Place, UserPlaceRelationship } from './types';

export function createEmptyExploreData(): ExploreData {
  return {
    version: 4,
    activeSession: null,
    sessions: [],
    exploredCells: {},
    places: {},
    placeRelationships: {},
    preferences: createDefaultExplorePreferences(),
    tracking: createExploreTrackingState(),
  };
}

export function beginExploreSession(
  state: ExploreData,
  id: string,
  startedAt: string,
  trackingPolicy: ExploreTrackingPolicy = 'adventure',
): ExploreData {
  return {
    ...state,
    activeSession: {
      id,
      startedAt,
      endedAt: null,
      points: [],
      discoveredPlaceIds: [],
      recapStatus: 'none',
      completedReason: null,
      recapNotificationSentAt: null,
      backgroundStillnessAnchor: null,
      backgroundStillSince: null,
    },
    tracking: createExploreTrackingState(trackingPolicy, startedAt),
  };
}

export function appendExplorePoint(state: ExploreData, point: ExplorePoint): ExploreData {
  if (!state.activeSession) return state;
  const previousPoint = state.activeSession.points.at(-1);
  const cells = previousPoint
    ? exploreCellsAlongSegment(previousPoint, point)
    : [exploreCellForCoordinate(point)];
  const exploredCells = { ...state.exploredCells };
  cells.forEach((cell) => {
    const currentCell = exploredCells[cell.id];
    exploredCells[cell.id] = {
      id: cell.id,
      center: cell.center,
      firstExploredAt: currentCell?.firstExploredAt ?? point.recordedAt,
      lastExploredAt: point.recordedAt,
    };
  });
  return {
    ...state,
    activeSession: {
      ...state.activeSession,
      points: [...state.activeSession.points, point],
    },
    exploredCells,
  };
}

export function completeExploreSession(
  state: ExploreData,
  endedAt: string,
  completedReason: ExploreSession['completedReason'] = 'manual',
): ExploreData {
  if (!state.activeSession) return state;
  const completed = {
    ...state.activeSession,
    endedAt,
    completedReason,
    recapStatus: state.activeSession.points.length ? 'resolving' as const : 'none' as const,
  };
  return {
    ...state,
    activeSession: null,
    sessions: [completed, ...state.sessions],
    tracking: createExploreTrackingState(),
  };
}

export function finalizeExploreRecap(
  state: ExploreData,
  sessionId: string,
  discoveredPlaceIds: string[],
): ExploreData {
  return {
    ...state,
    sessions: state.sessions.map((session) => session.id === sessionId
      ? { ...session, discoveredPlaceIds: [...new Set(discoveredPlaceIds)], recapStatus: 'ready' as const }
      : session),
  };
}

export function markExploreRecapSeen(state: ExploreData, sessionId: string): ExploreData {
  return {
    ...state,
    sessions: state.sessions.map((session) => session.id === sessionId
      ? { ...session, recapStatus: 'seen' as const }
      : session),
  };
}

export function markExploreRecapNotified(
  state: ExploreData,
  sessionId: string,
  sentAt: string,
): ExploreData {
  return {
    ...state,
    sessions: state.sessions.map((session) => session.id === sessionId
      ? { ...session, recapNotificationSentAt: session.recapNotificationSentAt ?? sentAt }
      : session),
  };
}

export function recordPlaceVisit(
  state: ExploreData,
  params: {
    place: Place;
    userId: string;
    visitedAt: string;
    evidence: UserPlaceRelationship['evidence'];
  },
): ExploreData {
  const relationshipId = `${params.userId}:${params.place.id}`;
  const current = state.placeRelationships[relationshipId];
  return {
    ...state,
    places: { ...state.places, [params.place.id]: params.place },
    placeRelationships: {
      ...state.placeRelationships,
      [relationshipId]: {
        id: relationshipId,
        userId: params.userId,
        placeId: params.place.id,
        firstVisitedAt: current?.firstVisitedAt ?? params.visitedAt,
        lastVisitedAt: params.visitedAt,
        visitCount: (current?.visitCount ?? 0) + 1,
        evidence: params.evidence,
        visibility: current?.visibility ?? 'private',
      },
    },
  };
}
