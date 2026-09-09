import { buildRecordedPathTraces } from './exploreGeometry';
import type { ExploreCoordinate, ExplorePoint } from './types';

/** Outing ownership survives continuity splits and native chunk boundaries. */
export function buildHistoryHeatGeometry(groups: readonly (readonly ExplorePoint[])[]) {
  const coordinates: ExploreCoordinate[] = [];
  const segmentStarts: number[] = [];
  const segmentSessionIds: number[] = [];
  groups.forEach((group, sessionIndex) => {
    for (const trace of buildRecordedPathTraces([group])) {
      if (trace.length < 2) continue;
      segmentStarts.push(coordinates.length);
      segmentSessionIds.push(sessionIndex);
      coordinates.push(...trace.map(({ latitude, longitude }) => ({ latitude, longitude })));
    }
  });
  return { coordinates, segmentStarts, segmentSessionIds };
}
