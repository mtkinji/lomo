import {
  buildArcBannerFallbackSearchTerm,
  buildArcBannerImageSearchTerm,
} from './arcBannerImageSearchTerms';

describe('Arc banner image search terms', () => {
  it('turns fitness arcs into subject + style + context terms', () => {
    expect(
      buildArcBannerFallbackSearchTerm({
        arcName: 'Become a consistent runner',
        goalTitles: ['Run three mornings a week', 'Train for a half marathon'],
      }),
    ).toBe('consistent runner cinematic motion mountain sunrise');
  });

  it('adds visual context when the model returns a broad abstract phrase', () => {
    expect(
      buildArcBannerImageSearchTerm(
        {
          arcName: 'Creative home builder',
          goalTitles: ['Finish the playroom shelves'],
        },
        'growth mindset',
      ),
    ).toBe('creative home editorial detail soft window light');
  });

  it('drops office stock-photo terms from model output', () => {
    expect(
      buildArcBannerImageSearchTerm(
        {
          arcName: 'Founder leadership',
          goalTitles: ['Ship the weekly release note'],
        },
        'business meeting laptop',
      ),
    ).toBe('modern architecture bold perspective city skyline');
  });

  it('uses family context for relationship arcs', () => {
    expect(
      buildArcBannerFallbackSearchTerm({
        arcName: 'Present parent',
        goalTitles: ['Cook Sunday dinner with the kids'],
      }),
    ).toBe('present parent documentary light family table');
  });

  it('uses visual metaphor rather than literal finance imagery for money arcs', () => {
    expect(
      buildArcBannerFallbackSearchTerm({
        arcName: 'Budget steward',
        goalTitles: ['Review spending every Friday'],
      }),
    ).toBe('budget steward clean lines golden hour');
  });

  it('keeps generated terms compact enough for Unsplash search', () => {
    const term = buildArcBannerImageSearchTerm(
      {
        arcName: 'Outdoor adventure identity',
        arcNarrative: 'I want to hike, camp, and climb more this year.',
        goalTitles: [
          'Plan a desert backpacking route',
          'Practice navigation skills',
          'Climb outside twice a month',
        ],
      },
      'dramatic wilderness expedition ridge horizon',
    );

    expect(term?.split(' ')).toHaveLength(6);
    expect(term).toBe('dramatic wilderness expedition wide angle landscape');
  });
});
