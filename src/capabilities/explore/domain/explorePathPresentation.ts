import { isRecordedPathContinuous } from './exploreGeometry';
import type { ExplorePoint, ExploreSession } from './types';

export type PathPresentationInput = {
  sessions: readonly ExploreSession[];
  activeSession: ExploreSession | null;
  reviewedSessionId: string | null;
  playbackVisiblePointCount: number | null;
  showMyPath: boolean;
};

export type PathPresentation = {
  historyGroups: readonly (readonly ExplorePoint[])[];
  foreground: {
    sessionId: string;
    kind: 'recording' | 'review';
    points: readonly ExplorePoint[];
    recordingStart: ExplorePoint | null;
    recordingEnd: ExplorePoint | null;
    hasMissingObservations: boolean;
  } | null;
};

function validObservation(point: ExplorePoint): boolean {
  return Number.isFinite(point.latitude) && Math.abs(point.latitude) <= 90 &&
    Number.isFinite(point.longitude) && Math.abs(point.longitude) <= 180 &&
    Number.isFinite(Date.parse(point.recordedAt)) &&
    (point.horizontalAccuracyM === null || (Number.isFinite(point.horizontalAccuracyM) &&
      point.horizontalAccuracyM >= 0 && point.horizontalAccuracyM <= 25));
}

export function completedPathHistory(sessions: readonly ExploreSession[], excludedSessionId: string | null): readonly (readonly ExplorePoint[])[] {
  return sessions.filter(session => session.trackingPolicy === 'adventure' &&
    Boolean(session.endedAt) && session.id !== excludedSessionId).map(session => session.points);
}

/** Presentation owns no persisted geometry; selection never repairs missing evidence. */
export function buildPathPresentation(input: PathPresentationInput): PathPresentation {
  if (!input.showMyPath) return { historyGroups: [], foreground: null };
  const recording = input.activeSession?.trackingPolicy === 'adventure' ? input.activeSession : null;
  const reviewed = input.sessions.find(session => session.id === input.reviewedSessionId &&
    session.trackingPolicy === 'adventure' && Boolean(session.endedAt)) ?? null;
  const selected = recording ?? reviewed;
  const historyGroups = completedPathHistory(input.sessions, selected?.id ?? null);
  if (!selected) return { historyGroups, foreground: null };

  const count = recording || input.playbackVisiblePointCount === null
    ? selected.points.length
    : Math.max(0, Math.min(selected.points.length,
      Number.isFinite(input.playbackVisiblePointCount) ? Math.floor(input.playbackVisiblePointCount) : 0));
  const points = count === selected.points.length ? selected.points : selected.points.slice(0, count);
  const validPoints = points.filter(validObservation);
  // Inspect original adjacency, before simplification creates native chunks.
  const hasMissingObservations = selected.points.some((point, index) => !validObservation(point) ||
    (index > 0 && !isRecordedPathContinuous(selected.points[index - 1], point)));
  return {
    historyGroups,
    foreground: {
      sessionId: selected.id,
      kind: recording ? 'recording' : 'review',
      points,
      recordingStart: validPoints[0] ?? null,
      recordingEnd: !recording && count === selected.points.length ? validPoints.at(-1) ?? null : null,
      hasMissingObservations,
    },
  };
}
