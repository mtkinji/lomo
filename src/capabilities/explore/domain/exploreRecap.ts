import type { ExploreData, ExploreSession, Place } from './types';

export type ExploreRecap = {
  sessionId: string;
  startedAt: string;
  endedAt: string;
  pointCount: number;
  places: Place[];
};

export function buildExploreRecap(state: ExploreData, sessionId: string): ExploreRecap | null {
  const session = state.sessions.find((candidate) => candidate.id === sessionId);
  if (!session?.endedAt || session.recapStatus === 'none') return null;
  return {
    sessionId: session.id,
    startedAt: session.startedAt,
    endedAt: session.endedAt,
    pointCount: session.points.length,
    places: session.discoveredPlaceIds
      .map((placeId) => state.places[placeId])
      .filter((place): place is Place => Boolean(place)),
  };
}

export function pendingExploreRecap(state: ExploreData): ExploreRecap | null {
  const session = state.sessions.find((candidate) => candidate.recapStatus === 'ready');
  return session ? buildExploreRecap(state, session.id) : null;
}

export function exploreRecapNotification(params: {
  sessionId: string;
  completedReason: ExploreSession['completedReason'];
  recapNotificationSentAt: string | null;
  enabled: boolean;
  showPlaceNamesOnLockScreen: boolean;
  placeNames: string[];
}): { title: string; body: string; data: { type: 'exploreRecap'; sessionId: string } } | null {
  if (!params.enabled || params.completedReason !== 'background-stillness' || params.recapNotificationSentAt) {
    return null;
  }
  const namedBody = params.placeNames.length === 1
    ? `You uncovered ${params.placeNames[0]}.`
    : `You uncovered ${params.placeNames.length} new places.`;
  return {
    title: 'Your exploration is ready',
    body: params.showPlaceNamesOnLockScreen && params.placeNames.length
      ? namedBody
      : 'Open Kwilt to see what you uncovered.',
    data: { type: 'exploreRecap', sessionId: params.sessionId },
  };
}
