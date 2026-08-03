import KwiltRouteReconstruction from '../../../../modules/kwilt-route-reconstruction';
import {
  buildExploreReconstructionRequests,
  validateExploreReconstruction,
} from '../domain/explorePathReconstruction';
import type { ExplorePathReconstructionSegment, ExplorePoint } from '../domain/types';

export async function reconstructExploreRecordedPath(
  points: readonly ExplorePoint[],
): Promise<ExplorePathReconstructionSegment[]> {
  if (!KwiltRouteReconstruction?.isAvailable()) return [];
  const segments: ExplorePathReconstructionSegment[] = [];
  for (const request of buildExploreReconstructionRequests(points)) {
    try {
      const result = await KwiltRouteReconstruction.routeBetween(
        request.from.latitude,
        request.from.longitude,
        request.to.latitude,
        request.to.longitude,
        request.transport,
      );
      const validated = validateExploreReconstruction({
        from: request.from,
        to: request.to,
        coordinates: result.coordinates,
        routeDistanceM: result.distanceM,
      });
      if (validated) segments.push(validated);
    } catch {
      // Frequent location samples remain the fallback when Apple has no routable path.
    }
  }
  return segments;
}
