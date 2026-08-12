import { buildExploreRecap, exploreRecapNotification, pendingExploreRecap } from './exploreRecap';
import { createEmptyExploreData, beginExploreSession, appendExplorePoint, completeExploreSession, finalizeExploreRecap, recordPlaceVisit } from './exploreState';

const routePoint = {
  id: 'point-1', latitude: 40.5, longitude: -105.1, altitudeM: 1500,
  horizontalAccuracyM: 6, altitudeAccuracyM: 5, speedMps: null, courseDeg: null,
  recordedAt: '2026-07-27T18:00:00.000Z',
};

describe('Exploration Recap', () => {
  it('projects one recap from a session and newly discovered canonical Places', () => {
    let state = beginExploreSession(createEmptyExploreData(), 'session-1', routePoint.recordedAt);
    state = appendExplorePoint(state, routePoint);
    state = completeExploreSession(state, '2026-07-27T18:20:00.000Z');
    state = recordPlaceVisit(state, {
      place: { id: 'apple:horsetooth-falls:40.5:-105.1', name: 'Horsetooth Falls', kind: 'landmark', latitude: 40.5, longitude: -105.1, source: 'apple-maps' },
      userId: 'local-user', visitedAt: routePoint.recordedAt, evidence: 'route-intersection',
    });
    state = finalizeExploreRecap(state, 'session-1', ['apple:horsetooth-falls:40.5:-105.1']);

    expect(buildExploreRecap(state, 'session-1')).toEqual(expect.objectContaining({
      sessionId: 'session-1',
      places: [expect.objectContaining({ name: 'Horsetooth Falls' })],
    }));
  });

  it('uses privacy-safe lock-screen copy and schedules at most once', () => {
    expect(exploreRecapNotification({
      sessionId: 'session-1', completedReason: 'background-stillness', recapNotificationSentAt: null,
      enabled: true, showPlaceNamesOnLockScreen: false, placeNames: ['Horsetooth Falls', 'Rotary Park'],
    })).toEqual({
      title: 'Your exploration is ready',
      body: 'Open Kwilt to see what you uncovered.',
      data: { type: 'exploreRecap', sessionId: 'session-1' },
    });
    expect(exploreRecapNotification({
      sessionId: 'session-1', completedReason: 'background-stillness', recapNotificationSentAt: '2026-07-27T19:00:00.000Z',
      enabled: true, showPlaceNamesOnLockScreen: false, placeNames: ['Horsetooth Falls'],
    })).toBeNull();
  });

  it('does not notify after a foreground/manual finish', () => {
    expect(exploreRecapNotification({
      sessionId: 'session-1', completedReason: 'manual', recapNotificationSentAt: null,
      enabled: true, showPlaceNamesOnLockScreen: false, placeNames: [],
    })).toBeNull();
  });

  it('does not send another outing notification before the combined recap is seen', () => {
    expect(exploreRecapNotification({
      sessionId: 'session-2', completedReason: 'background-stillness', recapNotificationSentAt: null,
      enabled: true, showPlaceNamesOnLockScreen: false, placeNames: [], unseenRecapAlreadyNotified: true,
    })).toBeNull();
  });

  it('combines all ready unseen outings into one recap between glances', () => {
    const first = { id: 's1', trackingPolicy: 'ambient' as const, startedAt: '2026-07-28T10:00:00.000Z', endedAt: '2026-07-28T10:30:00.000Z', points: [routePoint], discoveredPlaceIds: [], recapStatus: 'ready' as const, completedReason: 'background-stillness' as const, recapNotificationSentAt: null, backgroundStillnessAnchor: null, backgroundStillSince: null };
    const second = { ...first, id: 's2', startedAt: '2026-07-28T12:00:00.000Z', endedAt: '2026-07-28T12:15:00.000Z' };
    const state = { ...createEmptyExploreData(), sessions: [second, first] };
    expect(pendingExploreRecap(state)).toEqual(expect.objectContaining({
      sessionIds: ['s1', 's2'],
      pointCount: 2,
      startedAt: first.startedAt,
      endedAt: second.endedAt,
    }));
  });

  it('shows the saved route immediately while Place enrichment is still resolving', () => {
    const ready = { id: 's1', trackingPolicy: 'ambient' as const, startedAt: '2026-07-28T10:00:00.000Z', endedAt: '2026-07-28T10:30:00.000Z', points: [routePoint], discoveredPlaceIds: [], recapStatus: 'ready' as const, completedReason: 'background-stillness' as const, recapNotificationSentAt: null, backgroundStillnessAnchor: null, backgroundStillSince: null };
    const resolving = {
      ...ready,
      id: 's2',
      startedAt: '2026-07-28T12:00:00.000Z',
      endedAt: '2026-07-28T12:15:00.000Z',
      recapStatus: 'resolving' as const,
    };
    expect(pendingExploreRecap({ ...createEmptyExploreData(), sessions: [resolving, ready] })).toEqual(
      expect.objectContaining({
        sessionIds: ['s1', 's2'],
        pointCount: 2,
        resolving: true,
      }),
    );
  });
});
