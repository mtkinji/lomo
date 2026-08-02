import { useCallback, useEffect, useRef, useState } from 'react';
import {
  metersForNearbyRadius,
  rankNearbyPlaces,
  type ExploreNearbyRadius,
  type ExploreNearbyRecommendation,
} from '../domain/exploreNearby';
import type { Place } from '../domain/types';
import { searchNearbyPlaces } from './exploreNearbyPlaces';

export type ExploreNearbyStatus = 'idle' | 'loading' | 'ready' | 'empty' | 'unavailable' | 'error';

export function useExploreNearbyPlaces(knownPlaces: Place[]) {
  const [radius, setRadius] = useState<ExploreNearbyRadius>('half-mile');
  const [status, setStatus] = useState<ExploreNearbyStatus>('idle');
  const [results, setResults] = useState<ExploreNearbyRecommendation[]>([]);
  const [searchedCenter, setSearchedCenter] = useState<{ latitude: number; longitude: number } | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => () => {
    requestIdRef.current += 1;
  }, []);

  const search = useCallback(async (
    center: { latitude: number; longitude: number },
    requestedRadius: ExploreNearbyRadius = radius,
  ) => {
    const requestId = ++requestIdRef.current;
    setStatus('loading');
    try {
      const radiusM = metersForNearbyRadius(requestedRadius);
      const candidates = await searchNearbyPlaces(center, radiusM);
      if (requestId !== requestIdRef.current) return;
      if (candidates === null) {
        setResults([]);
        setStatus('unavailable');
        return;
      }
      const ranked = rankNearbyPlaces({ candidates, origin: center, radiusM, knownPlaces });
      setResults(ranked);
      setSearchedCenter(center);
      setStatus(ranked.length ? 'ready' : 'empty');
    } catch {
      if (requestId !== requestIdRef.current) return;
      setResults([]);
      setStatus('error');
    }
  }, [knownPlaces, radius]);

  return {
    radius,
    setRadius,
    status,
    results,
    searchedCenter,
    search,
  };
}
