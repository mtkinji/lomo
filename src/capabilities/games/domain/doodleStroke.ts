export type DoodlePoint = { x: number; y: number };
export type DoodleStroke = { points: DoodlePoint[]; color: string; player: number; turn: number };
export type DoodleCanvasBounds = { width: number; height: number };

export const MAX_DOODLE_POINTS = 512;
export const MAX_DOODLE_STROKES_PER_TURN = 8;
export const DOODLE_CANVAS_WIDTH = 340;
export const DOODLE_CANVAS_HEIGHT = 300;
const MIN_POINT_DISTANCE = 2;

export function beginDoodleStroke(point: DoodlePoint): DoodlePoint[] {
  return Number.isFinite(point.x) && Number.isFinite(point.y) ? [point] : [];
}

export function appendDoodlePoint(points: DoodlePoint[], point: DoodlePoint): DoodlePoint[] {
  if (!Number.isFinite(point.x) || !Number.isFinite(point.y) || points.length >= MAX_DOODLE_POINTS) return points;

  const lastPoint = points.at(-1);
  if (lastPoint && Math.hypot(point.x - lastPoint.x, point.y - lastPoint.y) < MIN_POINT_DISTANCE) return points;

  return [...points, point];
}

export function mapDoodlePointToCanvas(point: DoodlePoint, bounds: DoodleCanvasBounds): DoodlePoint | null {
  if (!Number.isFinite(point.x) || !Number.isFinite(point.y) || bounds.width <= 0 || bounds.height <= 0) return null;

  return {
    x: formatCoordinate(Math.min(Math.max(point.x, 0), bounds.width) / bounds.width * DOODLE_CANVAS_WIDTH),
    y: formatCoordinate(Math.min(Math.max(point.y, 0), bounds.height) / bounds.height * DOODLE_CANVAS_HEIGHT),
  };
}

export function commitDoodleStroke(strokes: DoodleStroke[], stroke: DoodleStroke): DoodleStroke[] {
  if (stroke.points.length < 2 || stroke.points.some((point) => !Number.isFinite(point.x) || !Number.isFinite(point.y))) return strokes;
  const turnStrokeCount = strokes.filter((item) => item.turn === stroke.turn).length;
  return turnStrokeCount >= MAX_DOODLE_STROKES_PER_TURN ? strokes : [...strokes, stroke];
}

export function undoCurrentTurnStroke(strokes: DoodleStroke[], turn: number): DoodleStroke[] {
  const lastCurrentTurnStroke = strokes.map((stroke) => stroke.turn).lastIndexOf(turn);
  return lastCurrentTurnStroke < 0 ? strokes : strokes.filter((_, index) => index !== lastCurrentTurnStroke);
}

export function doodlePointsToPath(points: DoodlePoint[]): string {
  if (points.length < 2) return '';

  return points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${formatCoordinate(point.x)} ${formatCoordinate(point.y)}`)
    .join(' ');
}

function formatCoordinate(value: number): number {
  return Math.round(value * 10) / 10;
}
