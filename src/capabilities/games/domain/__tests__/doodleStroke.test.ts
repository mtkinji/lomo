import {
  appendDoodlePoint,
  beginDoodleStroke,
  commitDoodleStroke,
  doodlePointsToPath,
  mapDoodlePointToCanvas,
  MAX_DOODLE_POINTS,
  MAX_DOODLE_STROKES_PER_TURN,
  undoCurrentTurnStroke,
} from '../doodleStroke';

describe('doodle stroke sampling', () => {
  it('keeps a continuous native drawing gesture bounded', () => {
    let points = [{ x: 10, y: 10 }];

    for (let index = 1; index < MAX_DOODLE_POINTS * 4; index += 1) {
      points = appendDoodlePoint(points, { x: 10 + index, y: 10 + index });
    }

    expect(points).toHaveLength(MAX_DOODLE_POINTS);
    expect(doodlePointsToPath(points)).toMatch(/^M 10 10 L /);
  });

  it('ignores touch jitter that would redraw the same visible point', () => {
    const points = [{ x: 10, y: 10 }];

    expect(appendDoodlePoint(points, { x: 10.5, y: 10.5 })).toBe(points);
  });

  it('does not send incomplete or invalid paths to the native SVG renderer', () => {
    expect(doodlePointsToPath([{ x: 10, y: 10 }])).toBe('');
    expect(beginDoodleStroke({ x: Number.NaN, y: 12 })).toEqual([]);
    expect(appendDoodlePoint([{ x: 10, y: 10 }], { x: Number.NaN, y: 12 })).toEqual([{ x: 10, y: 10 }]);
  });

  it('normalizes and clamps native touch coordinates into the SVG canvas', () => {
    expect(mapDoodlePointToCanvas({ x: 195, y: 150 }, { width: 390, height: 300 })).toEqual({ x: 170, y: 150 });
    expect(mapDoodlePointToCanvas({ x: -10, y: 400 }, { width: 390, height: 300 })).toEqual({ x: 0, y: 300 });
    expect(mapDoodlePointToCanvas({ x: 10, y: 10 }, { width: 0, height: 300 })).toBeNull();
  });

  it('caps committed strokes without affecting earlier turns', () => {
    let strokes: Array<{ points: Array<{ x: number; y: number }>; player: number; turn: number; color: string }> = [];
    const stroke = { points: [{ x: 1, y: 1 }, { x: 2, y: 2 }], player: 0, turn: 0, color: '#000' };
    for (let index = 0; index < MAX_DOODLE_STROKES_PER_TURN + 4; index += 1) strokes = commitDoodleStroke(strokes, stroke);
    strokes = commitDoodleStroke(strokes, { ...stroke, player: 1, turn: 1 });

    expect(strokes).toHaveLength(MAX_DOODLE_STROKES_PER_TURN + 1);
    expect(undoCurrentTurnStroke(strokes, 1)).toEqual(strokes.slice(0, -1));
    expect(undoCurrentTurnStroke(strokes, 2)).toBe(strokes);
  });
});
