import { exploreCellForCoordinate } from './exploreGeometry';
import { createDefaultExplorePreferences } from './explorePrivacy';
import type { ExploreData, ExplorePoint, Place, UserPlaceRelationship } from './types';

export function createEmptyExploreData(): ExploreData {
  return {
    version: 1,
    activeSession: null,
    sessions: [],
    exploredCells: {},
    places: {},
    placeRelationships: {},
    preferences: createDefaultExplorePreferences(),
  };
}

export function beginExploreSession(
  state: ExploreData,
  id: string,
  startedAt: string,
): ExploreData {
  return {
    ...state,
    activeSession: { id, startedAt, endedAt: null, points: [] },
  };
}

export function appendExplorePoint(state: ExploreData, point: ExplorePoint): ExploreData {
  if (!state.activeSession) return state;
  const cell = exploreCellForCoordinate(point);
  const currentCell = state.exploredCells[cell.id];
  return {
    ...state,
    activeSession: {
      ...state.activeSession,
      points: [...state.activeSession.points, point],
    },
    exploredCells: {
      ...state.exploredCells,
      [cell.id]: {
        id: cell.id,
        center: cell.center,
        firstExploredAt: currentCell?.firstExploredAt ?? point.recordedAt,
        lastExploredAt: point.recordedAt,
      },
    },
  };
}

export function completeExploreSession(state: ExploreData, endedAt: string): ExploreData {
  if (!state.activeSession) return state;
  const completed = { ...state.activeSession, endedAt };
  return {
    ...state,
    activeSession: null,
    sessions: [completed, ...state.sessions],
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
