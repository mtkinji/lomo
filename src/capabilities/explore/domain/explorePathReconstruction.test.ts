import {
  buildExploreReconstructionRequests,
  displayPointsForExploreSession,
  validateExploreReconstruction,
} from './explorePathReconstruction';
import { destinationCoordinate } from './exploreGeometry';
import type { ExplorePoint, ExploreSession } from './types';

function point(id: string, distanceM: number, seconds: number, speedMps = 14): ExplorePoint {
  const anchor = { latitude: 40.58526, longitude: -105.08442 };
  return {
    id,
    ...destinationCoordinate(anchor, distanceM, 0),
    altitudeM: 1500 + distanceM / 10,
    horizontalAccuracyM: 6,
    altitudeAccuracyM: 5,
    speedMps,
    courseDeg: 0,
    recordedAt: new Date(Date.parse('2026-08-02T12:00:00.000Z') + seconds * 1000).toISOString(),
  };
}

function session(points: ExplorePoint[], reconstructedSegments: ExploreSession['reconstructedSegments'] = []): ExploreSession {
  return {
    id: 'session',
    trackingPolicy: 'adventure',
    startedAt: points[0].recordedAt,
    endedAt: points.at(-1)?.recordedAt ?? null,
    points,
    reconstructedSegments,
    discoveredPlaceIds: [],
    recapStatus: 'ready',
    completedReason: 'manual',
    recapNotificationSentAt: null,
    backgroundStillnessAnchor: null,
    backgroundStillSince: null,
  };
}

describe('Explore path reconstruction', () => {
  it('requests road-aware reconstruction only for plausible gaps between 60 meters and a quarter mile', () => {
    const points = [point('a', 0, 0), point('b', 20, 2), point('c', 360, 28), point('d', 800, 50)];

    expect(buildExploreReconstructionRequests(points)).toEqual([expect.objectContaining({
      fromPointId: 'b',
      toPointId: 'c',
      transport: 'automobile',
    })]);
  });

  it('rejects a directions result that starts elsewhere or takes an implausible detour', () => {
    const from = point('a', 0, 0);
    const to = point('b', 300, 25);
    const elsewhere = destinationCoordinate(from, 100, 90);

    expect(validateExploreReconstruction({ from, to, coordinates: [elsewhere, to], routeDistanceM: 320 })).toBeNull();
    expect(validateExploreReconstruction({ from, to, coordinates: [from, to], routeDistanceM: 1200 })).toBeNull();
  });

  it('interleaves a validated road path while retaining the original recorded endpoints', () => {
    const from = point('a', 0, 0);
    const to = point('b', 300, 30);
    const bend = destinationCoordinate(from, 160, 25);
    const reconstructed = validateExploreReconstruction({
      from,
      to,
      coordinates: [from, bend, to],
      routeDistanceM: 340,
    });
    expect(reconstructed).not.toBeNull();

    const displayed = displayPointsForExploreSession(session([from, to], [reconstructed!]));

    expect(displayed).toHaveLength(3);
    expect(displayed[0]).toBe(from);
    expect(displayed[2]).toBe(to);
    expect(displayed[1]).toEqual(expect.objectContaining({
      latitude: bend.latitude,
      longitude: bend.longitude,
    }));
    expect(Date.parse(displayed[1].recordedAt)).toBeGreaterThan(Date.parse(from.recordedAt));
    expect(Date.parse(displayed[1].recordedAt)).toBeLessThan(Date.parse(to.recordedAt));
  });
});
