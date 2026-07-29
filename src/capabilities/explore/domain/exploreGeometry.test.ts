import {
  EXPLORE_FEATHER_REFERENCE_RADIUS_M,
  EXPLORE_REVEAL_RADIUS_M,
  buildFogHole,
  destinationCoordinate,
  exploreCellsAlongSegment,
  exploreCellsForRecordedStep,
  coordinateDistanceM,
  exploreCellForCoordinate,
  isCoordinateExplored,
} from './exploreGeometry';

describe('Explore geometry', () => {
  it('keeps a 65-foot clear core and a separate 100-foot feather reference', () => {
    expect(EXPLORE_REVEAL_RADIUS_M).toBeCloseTo(65 * 0.3048, 3);
    expect(EXPLORE_FEATHER_REFERENCE_RADIUS_M).toBeCloseTo(100 * 0.3048, 3);
    expect(EXPLORE_REVEAL_RADIUS_M / EXPLORE_FEATHER_REFERENCE_RADIUS_M).toBeCloseTo(0.65, 3);
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

  it('fills a continuous cell corridor between efficient location samples', () => {
    const cells = exploreCellsAlongSegment(
      { latitude: 40.58526, longitude: -105.08442 },
      { latitude: 40.58616, longitude: -105.08442 },
    );
    expect(cells.length).toBeGreaterThanOrEqual(5);
    expect(Math.max(...cells.slice(1).map((cell, index) => coordinateDistanceM(cells[index].center, cell.center))))
      .toBeLessThanOrEqual(40);
  });

  it('does not invent a corridor across a long uncertain gap', () => {
    const from = { latitude: 40.58526, longitude: -105.08442 };
    const to = destinationCoordinate(from, 120, 35);

    expect(exploreCellsForRecordedStep(from, to)).toEqual([
      exploreCellForCoordinate(to),
    ]);
  });

  it('reveals only coordinates inside the permanent explored corridor', () => {
    const center = { latitude: 40.58526, longitude: -105.08442 };
    const exploredCells = [{ id: 'cell', center }];

    expect(isCoordinateExplored(center, exploredCells)).toBe(true);
    expect(isCoordinateExplored(destinationCoordinate(center, 15, 90), exploredCells)).toBe(true);
    expect(isCoordinateExplored(destinationCoordinate(center, 25, 90), exploredCells)).toBe(false);
    expect(isCoordinateExplored(center, [])).toBe(false);
  });
});
