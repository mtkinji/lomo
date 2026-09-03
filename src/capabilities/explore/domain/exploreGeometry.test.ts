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
  buildFogRenderGeometry,
} from './exploreGeometry';

describe('Explore geometry', () => {
  it('bounds a long history of disconnected observations before native rendering', () => {
    const points = Array.from({ length: 12_448 }, (_, index) => ({
      latitude: 30 + index * 0.01,
      longitude: -110,
      recordedAt: new Date(Date.UTC(2026, 0, 1, 0, index)).toISOString(),
    }));

    const geometry = buildFogRenderGeometry([points], 256);

    expect(geometry.points.length + geometry.segmentStarts.length).toBeLessThanOrEqual(256);
  });

  it('bounds a long continuous trip without exhausting the call stack', () => {
    const points = Array.from({ length: 10_000 }, (_, index) => ({
      latitude: 40 + index * 0.00008,
      longitude: -105 + (index % 2 === 0 ? -0.00008 : 0.00008),
      recordedAt: new Date(1_750_000_000_000 + index * 1_000).toISOString(),
    }));

    const geometry = buildFogRenderGeometry([points], 256);

    expect(geometry.points.length + geometry.segmentStarts.length).toBeLessThanOrEqual(256);
  });

  it('keeps a 65-foot clear core while doubling the atmospheric feather reference', () => {
    expect(EXPLORE_REVEAL_RADIUS_M).toBeCloseTo(65 * 0.3048, 3);
    expect(EXPLORE_FEATHER_REFERENCE_RADIUS_M).toBeCloseTo(200 * 0.3048, 3);
    expect(EXPLORE_REVEAL_RADIUS_M / EXPLORE_FEATHER_REFERENCE_RADIUS_M).toBeCloseTo(0.325, 3);
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

  it('keeps a long freeway trace continuous within the native segment budget', () => {
    const start = { latitude: 40.58526, longitude: -105.08442 };
    const freeway = Array.from({ length: 700 }, (_, index) =>
      destinationCoordinate(start, index * 20, 0),
    );

    const geometry = buildFogRenderGeometry([freeway], 256);

    expect(geometry.segmentStarts.length).toBeLessThanOrEqual(256);
    expect(geometry.traces.reduce((total, trace) => total + Math.max(0, trace.length - 1), 0))
      .toBeLessThanOrEqual(256);
    expect(geometry.segmentStarts).toHaveLength(geometry.segmentEnds.length);
    expect(geometry.segmentStarts[0]).toEqual(freeway[0]);
    expect(geometry.segmentEnds.at(-1)).toEqual(freeway.at(-1));
    geometry.segmentStarts.slice(1).forEach((startPoint, index) => {
      expect(startPoint).toEqual(geometry.segmentEnds[index]);
    });
  });

  it('keeps adjacent freeway samples connected when GPS variance puts them just over 60 meters apart', () => {
    const start = {
      latitude: 40.58526,
      longitude: -105.08442,
      recordedAt: '2026-08-02T12:00:00.000Z',
      speedMps: 29,
      horizontalAccuracyM: 8,
    };
    const end = {
      ...destinationCoordinate(start, 70, 0),
      recordedAt: '2026-08-02T12:00:02.000Z',
      speedMps: 29,
      horizontalAccuracyM: 8,
    };

    const geometry = buildFogRenderGeometry([[start, end]], 256);

    expect(geometry.segmentStarts).toEqual([start]);
    expect(geometry.segmentEnds).toEqual([end]);
    expect(exploreCellsForRecordedStep(start, end).length).toBeGreaterThan(2);
  });

  it('keeps a plausible same-session path continuous across a quarter-mile acquisition miss', () => {
    const start = {
      latitude: 40.58526,
      longitude: -105.08442,
      recordedAt: '2026-08-02T12:00:00.000Z',
      speedMps: 14,
      horizontalAccuracyM: 8,
    };
    const end = {
      ...destinationCoordinate(start, 390, 0),
      recordedAt: '2026-08-02T12:00:30.000Z',
      speedMps: 14,
      horizontalAccuracyM: 8,
    };

    const geometry = buildFogRenderGeometry([[start, end]], 256);

    expect(geometry.segmentStarts).toEqual([start]);
    expect(geometry.segmentEnds).toEqual([end]);
    expect(exploreCellsForRecordedStep(start, end).length).toBeGreaterThan(10);
  });

  it('does not connect beyond a quarter mile without reconstructed route evidence', () => {
    const start = {
      latitude: 40.58526,
      longitude: -105.08442,
      recordedAt: '2026-08-02T12:00:00.000Z',
      speedMps: 20,
      horizontalAccuracyM: 6,
    };
    const end = {
      ...destinationCoordinate(start, 430, 0),
      recordedAt: '2026-08-02T12:00:22.000Z',
      speedMps: 20,
      horizontalAccuracyM: 6,
    };

    expect(buildFogRenderGeometry([[start, end]], 256).segmentStarts).toEqual([]);
  });

  it('does not connect a rapid implausible jump just because timestamps are close', () => {
    const start = {
      latitude: 40.58526,
      longitude: -105.08442,
      recordedAt: '2026-08-02T12:00:00.000Z',
      speedMps: 5,
      horizontalAccuracyM: 8,
    };
    const end = {
      ...destinationCoordinate(start, 100, 0),
      recordedAt: '2026-08-02T12:00:02.000Z',
      speedMps: 5,
      horizontalAccuracyM: 8,
    };

    const geometry = buildFogRenderGeometry([[start, end]], 256);

    expect(geometry.segmentStarts).toEqual([]);
    expect(geometry.points).toEqual([start, end]);
  });

  it('keeps uncertain gaps as separate clearings instead of corridor segments', () => {
    const start = { latitude: 40.58526, longitude: -105.08442 };
    const beforeGap = destinationCoordinate(start, 20, 0);
    const afterGap = destinationCoordinate(beforeGap, 120, 0);
    const afterGapNext = destinationCoordinate(afterGap, 20, 0);

    const geometry = buildFogRenderGeometry([[start, beforeGap, afterGap, afterGapNext]], 256);

    expect(geometry.segmentStarts).toEqual([start, afterGap]);
    expect(geometry.segmentEnds).toEqual([beforeGap, afterGapNext]);
    expect(geometry.points).toEqual([]);
    expect(geometry.traces).toEqual([[start, beforeGap], [afterGap, afterGapNext]]);
  });

  it('never joins bounded render traces across separate outings', () => {
    const first = { latitude: 40.58526, longitude: -105.08442 };
    const firstEnd = destinationCoordinate(first, 20, 0);
    const second = destinationCoordinate(first, 40, 90);
    const secondEnd = destinationCoordinate(second, 20, 0);

    const geometry = buildFogRenderGeometry([[first, firstEnd], [second, secondEnd]], 256);

    expect(geometry.traces).toEqual([[first, firstEnd], [second, secondEnd]]);
  });

  it('preserves a freeway bend while reducing redundant straight observations', () => {
    const start = { latitude: 40.58526, longitude: -105.08442 };
    const north = Array.from({ length: 40 }, (_, index) => destinationCoordinate(start, index * 10, 0));
    const corner = north.at(-1)!;
    const east = Array.from({ length: 40 }, (_, index) => destinationCoordinate(corner, index * 10, 90));

    const geometry = buildFogRenderGeometry([[...north, ...east.slice(1)]], 256);

    expect(geometry.segmentStarts.length).toBeLessThan(10);
    expect([...geometry.segmentStarts, ...geometry.segmentEnds]).toContainEqual(corner);
  });
});
