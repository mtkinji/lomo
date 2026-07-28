import type { ExploreData, ExploreSession, Place } from './types';

export type ExploreRecap = {
  sessionId: string;
  sessionIds: string[];
  startedAt: string;
  endedAt: string;
  pointCount: number;
  places: Place[];
};

export function buildExploreRecap(
  state: Pick<ExploreData, 'sessions' | 'places'>,
  sessionId: string,
): ExploreRecap | null {
  const session = state.sessions.find((candidate) => candidate.id === sessionId);
  if (!session?.endedAt || session.recapStatus === 'none') return null;
  return {
    sessionId: session.id,
    sessionIds: [session.id],
    startedAt: session.startedAt,
    endedAt: session.endedAt,
    pointCount: session.points.length,
    places: session.discoveredPlaceIds
      .map((placeId) => state.places[placeId])
      .filter((place): place is Place => Boolean(place)),
  };
}

export function pendingExploreRecap(state: Pick<ExploreData, 'sessions' | 'places'>): ExploreRecap | null {
  if (state.sessions.some((candidate) => candidate.recapStatus === 'resolving')) return null;
  const sessions = state.sessions
    .filter((candidate) => candidate.recapStatus === 'ready' && candidate.endedAt)
    .sort((a, b) => Date.parse(a.startedAt) - Date.parse(b.startedAt));
  if (!sessions.length) return null;
  const places = [...new Map(sessions.flatMap((session) => session.discoveredPlaceIds)
    .map((placeId) => state.places[placeId])
    .filter((place): place is Place => Boolean(place))
    .map((place) => [place.id, place])).values()];
  return {
    sessionId: sessions[0].id,
    sessionIds: sessions.map((session) => session.id),
    startedAt: sessions[0].startedAt,
    endedAt: sessions.at(-1)!.endedAt!,
    pointCount: sessions.reduce((sum, session) => sum + session.points.length, 0),
    places,
  };
}

export function exploreRecapNotification(params: {
  sessionId: string;
  completedReason: ExploreSession['completedReason'];
  recapNotificationSentAt: string | null;
  enabled: boolean;
  showPlaceNamesOnLockScreen: boolean;
  placeNames: string[];
  unseenRecapAlreadyNotified?: boolean;
}): { title: string; body: string; data: { type: 'exploreRecap'; sessionId: string } } | null {
  if (
    !params.enabled ||
    params.completedReason !== 'background-stillness' ||
    params.recapNotificationSentAt ||
    params.unseenRecapAlreadyNotified
  ) {
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
