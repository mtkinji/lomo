import {
  appendExplorePoint,
  beginExploreSession,
  completeExploreSession,
  createEmptyExploreData,
  rebuildExploreTerritory,
  recordPlaceVisit,
} from './exploreState';
import { destinationCoordinate, exploreCellsAlongSegment } from './exploreGeometry';

const point = {
  id: 'point-1',
  latitude: 40.58526,
  longitude: -105.08442,
  altitudeM: 1525,
  horizontalAccuracyM: 8,
  altitudeAccuracyM: 6,
  speedMps: null,
  courseDeg: null,
  recordedAt: '2026-07-27T18:00:00.000Z',
};

describe('Explore state transitions', () => {
  it('starts with the current persisted Explore schema', () => {
    expect(createEmptyExploreData().version).toBe(8);
  });

  it('starts, records, and completes an explicit adventure', () => {
    const started = beginExploreSession(createEmptyExploreData(), 'session-1', point.recordedAt, 'adventure');
    expect(started.tracking).toEqual(expect.objectContaining({
      policy: 'adventure',
      phase: 'active',
    }));
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
    expect(completed.tracking.policy).toBeNull();
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

  it('repairs legacy straight-line territory without removing retained route points', () => {
    const farCoordinate = destinationCoordinate(point, 120, 35);
    const farPoint = {
      ...point,
      id: 'point-2',
      ...farCoordinate,
      recordedAt: '2026-07-27T18:01:00.000Z',
    };
    const legacyCells = Object.fromEntries(
      exploreCellsAlongSegment(point, farPoint).map((cell) => [cell.id, {
        ...cell,
        firstExploredAt: farPoint.recordedAt,
        lastExploredAt: farPoint.recordedAt,
      }]),
    );
    const legacy = {
      ...createEmptyExploreData(),
      sessions: [{
        ...beginExploreSession(createEmptyExploreData(), 'session-1', point.recordedAt).activeSession!,
        endedAt: farPoint.recordedAt,
        points: [point, farPoint],
      }],
      exploredCells: legacyCells,
    };

    const repaired = rebuildExploreTerritory(legacy);

    expect(repaired.sessions[0].points).toEqual([point, farPoint]);
    expect(Object.keys(repaired.exploredCells)).toHaveLength(2);
  });
});
