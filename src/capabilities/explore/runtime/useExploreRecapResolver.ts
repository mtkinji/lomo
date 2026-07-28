import { useEffect, useRef } from 'react';
import * as Location from 'expo-location';
import { candidatePlaceFromPlacemark, sampleRouteForDiscovery } from '../domain/exploreDiscovery';
import { useExploreStore } from './useExploreStore';

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
      const candidates = [];
      const namesSeen = new Set<string>();
      for (const point of sampleRouteForDiscovery(resolvingSession.points)) {
        try {
          const [placemark] = await Location.reverseGeocodeAsync(point);
          const place = placemark ? candidatePlaceFromPlacemark(placemark, point) : null;
          const nameKey = place?.name.trim().toLocaleLowerCase();
          if (place && nameKey && !namesSeen.has(nameKey)) {
            namesSeen.add(nameKey);
            candidates.push(place);
          }
        } catch {
          // A recap still resolves to its route when one Apple placemark lookup fails.
        }
      }
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
