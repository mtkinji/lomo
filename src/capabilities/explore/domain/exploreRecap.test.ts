import { buildExploreRecap, exploreRecapNotification } from './exploreRecap';
import { createEmptyExploreData, beginExploreSession, appendExplorePoint, completeExploreSession, finalizeExploreRecap, recordPlaceVisit } from './exploreState';

const routePoint = {
  id: 'point-1', latitude: 40.5, longitude: -105.1, altitudeM: 1500,
  horizontalAccuracyM: 6, altitudeAccuracyM: 5, recordedAt: '2026-07-27T18:00:00.000Z',
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
});
