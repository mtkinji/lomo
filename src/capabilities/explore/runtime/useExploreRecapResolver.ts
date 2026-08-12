import { useEffect, useRef } from 'react';
import * as Location from 'expo-location';
import type { LocationGeocodedAddress } from 'expo-location';
import { candidatePlaceFromPlacemark, sampleRouteForDiscovery } from '../domain/exploreDiscovery';
import type { ExplorePoint, Place } from '../domain/types';
import { useExploreStore } from './useExploreStore';

const PLACEMARK_CONCURRENCY = 3;
const PLACEMARK_TIMEOUT_MS = 4_000;

type ReverseGeocode = (point: Pick<ExplorePoint, 'latitude' | 'longitude'>) => Promise<LocationGeocodedAddress[]>;

export async function resolveExplorePlaceCandidates(
  points: ExplorePoint[],
  reverseGeocode: ReverseGeocode = Location.reverseGeocodeAsync,
): Promise<Place[]> {
  const sampled = sampleRouteForDiscovery(points);
  const results: Array<Place | null> = Array(sampled.length).fill(null);
  let nextIndex = 0;
  let stopped = false;
  const worker = async () => {
    while (!stopped && nextIndex < sampled.length) {
      const index = nextIndex;
      nextIndex += 1;
      const point = sampled[index];
      try {
        const [placemark] = await reverseGeocode(point);
        results[index] = placemark ? candidatePlaceFromPlacemark(placemark, point) : null;
      } catch {
        // One unavailable placemark must not discard the rest of the route receipt.
      }
    }
  };
  const workers = Promise.all(Array.from(
    { length: Math.min(PLACEMARK_CONCURRENCY, sampled.length) },
    () => worker(),
  ));
  let timer: ReturnType<typeof setTimeout> | undefined;
  await Promise.race([
    workers,
    new Promise<void>((resolve) => {
      timer = setTimeout(() => {
        stopped = true;
        resolve();
      }, PLACEMARK_TIMEOUT_MS);
    }),
  ]);
  if (timer) clearTimeout(timer);
  return [...new Map(results
    .filter((place): place is Place => Boolean(place))
    .map((place) => [place.name.trim().toLocaleLowerCase(), place])).values()];
}

export function useExploreRecapResolver(userId: string): void {
  const resolvingSession = useExploreStore((state) =>
    state.sessions.find((session) => session.recapStatus === 'resolving') ?? null,
  );
  const resolvingRef = useRef<string | null>(null);

  useEffect(() => {
    if (!resolvingSession || resolvingRef.current === resolvingSession.id) return;
    resolvingRef.current = resolvingSession.id;
    let cancelled = false;
    const resolve = async () => {
      const candidates = await resolveExplorePlaceCandidates(resolvingSession.points);
      if (!cancelled) {
        useExploreStore.getState().resolveSessionPlaces(resolvingSession.id, candidates, userId);
      }
      resolvingRef.current = null;
    };
    void resolve();
    return () => {
      cancelled = true;
      resolvingRef.current = null;
    };
  }, [resolvingSession, userId]);
}
