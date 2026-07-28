import {
  appendExplorePoint,
  beginExploreSession,
  completeExploreSession,
  createEmptyExploreData,
  recordPlaceVisit,
} from './exploreState';

const point = {
  id: 'point-1',
  latitude: 40.58526,
  longitude: -105.08442,
  altitudeM: 1525,
  horizontalAccuracyM: 8,
  altitudeAccuracyM: 6,
  recordedAt: '2026-07-27T18:00:00.000Z',
};

describe('Explore state transitions', () => {
  it('starts, records, and completes an explicit adventure', () => {
    const started = beginExploreSession(createEmptyExploreData(), 'session-1', point.recordedAt);
    const recorded = appendExplorePoint(started, point);
    const completed = completeExploreSession(recorded, '2026-07-27T18:10:00.000Z');

    expect(completed.activeSession).toBeNull();
    expect(completed.sessions[0]).toMatchObject({
      id: 'session-1',
      points: [point],
      recapStatus: 'resolving',
      completedReason: 'manual',
    });
    expect(Object.keys(completed.exploredCells)).toHaveLength(1);
  });

  it('records visits as a relationship to one canonical Place', () => {
    const state = recordPlaceVisit(createEmptyExploreData(), {
      place: {
        id: 'apple:horsetooth-falls',
        name: 'Horsetooth Falls',
        kind: 'trail',
        latitude: 40.552,
        longitude: -105.184,
        source: 'apple-maps',
      },
      userId: 'local-user',
      visitedAt: point.recordedAt,
      evidence: 'user-confirmed',
    });

    expect(Object.keys(state.places)).toEqual(['apple:horsetooth-falls']);
    expect(state.placeRelationships['local-user:apple:horsetooth-falls']).toMatchObject({
      placeId: 'apple:horsetooth-falls',
      visitCount: 1,
      firstVisitedAt: point.recordedAt,
    });
  });
});
