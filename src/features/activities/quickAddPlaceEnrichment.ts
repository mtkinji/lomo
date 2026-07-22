import type { ActivityPlaceIntent, ActivityPlaceLink } from '../../domain/types';

type PlaceCandidate = {
  placeQuery: string;
  label?: string;
  intent: ActivityPlaceIntent;
};

export function resolveQuickAddPlaceEnrichment<T extends object>(
  enrichment: T & { place?: PlaceCandidate },
): T & { placeLink?: ActivityPlaceLink } {
  const query = enrichment.place?.placeQuery?.trim();
  if (!query) return enrichment;

  const place = enrichment.place!;
  return {
    ...enrichment,
    placeLink: {
      target: {
        kind: 'named',
        label: place.label?.trim() || query,
        query,
      },
      intent: place.intent,
      resolution: 'broad',
      provenance: {
        source: 'activity_text',
        confidence: 0.85,
      },
    },
  };
}
