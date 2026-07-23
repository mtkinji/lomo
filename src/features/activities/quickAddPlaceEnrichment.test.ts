import { resolveQuickAddPlaceEnrichment } from './quickAddPlaceEnrichment';

describe('resolveQuickAddPlaceEnrichment', () => {
  it('turns an explicit merchant query into a broad place link without coordinates', () => {
    expect(
      resolveQuickAddPlaceEnrichment({
        notes: 'Bring the prescription number.',
        place: {
          placeQuery: 'Costco',
          label: 'Costco',
          intent: 'pickup',
        },
      }),
    ).toEqual({
      notes: 'Bring the prescription number.',
      place: {
        placeQuery: 'Costco',
        label: 'Costco',
        intent: 'pickup',
      },
      placeLink: {
        target: { kind: 'named', label: 'Costco', query: 'Costco' },
        intent: 'pickup',
        resolution: 'broad',
        provenance: { source: 'activity_text', confidence: 0.85 },
      },
    });
  });

  it('does not invent a place link when no explicit candidate exists', () => {
    const enrichment = { notes: 'No place here.' };
    expect(resolveQuickAddPlaceEnrichment(enrichment)).toBe(enrichment);
  });
});
