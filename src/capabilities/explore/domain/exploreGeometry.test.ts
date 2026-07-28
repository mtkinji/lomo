import {
  EXPLORE_REVEAL_RADIUS_M,
  buildFogHole,
  coordinateDistanceM,
  exploreCellForCoordinate,
} from './exploreGeometry';

describe('Explore geometry', () => {
  it('uses an approximately 100 foot reveal radius', () => {
    expect(EXPLORE_REVEAL_RADIUS_M).toBeCloseTo(30.48, 2);
  });

  it('creates a stable coarse cell for nearby points', () => {
    const first = exploreCellForCoordinate({ latitude: 40.58526, longitude: -105.08442 });
    const nearby = exploreCellForCoordinate({ latitude: 40.58527, longitude: -105.08441 });

    expect(nearby.id).toBe(first.id);
    expect(first.center.latitude).toBeCloseTo(40.585, 3);
    expect(first.center.longitude).toBeCloseTo(-105.084, 3);
  });

  it('measures route movement in meters', () => {
    expect(
      coordinateDistanceM(
        { latitude: 40.58526, longitude: -105.08442 },
        { latitude: 40.58616, longitude: -105.08442 },
      ),
    ).toBeCloseTo(100, -1);
  });

  it('builds a closed reveal ring around a cell center', () => {
    const center = { latitude: 40.58526, longitude: -105.08442 };
    const hole = buildFogHole(center, EXPLORE_REVEAL_RADIUS_M, 16);

    expect(hole).toHaveLength(17);
    expect(hole[0]).toEqual(hole[hole.length - 1]);
    expect(coordinateDistanceM(center, hole[0])).toBeCloseTo(EXPLORE_REVEAL_RADIUS_M, 0);
  });
});
