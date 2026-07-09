import {
  buildVisualSearchFallbackQuery,
  buildVisualSearchQuery,
} from './arcBannerImageSearchTerms';

describe('visual search queries', () => {
  it('turns fitness arcs into subject + style + context terms', () => {
    expect(
      buildVisualSearchFallbackQuery({
        objectKind: 'arc',
        name: 'Become a consistent runner',
        relatedTitles: ['Run three mornings a week', 'Train for a half marathon'],
      }),
    ).toBe('consistent runner cinematic motion mountain sunrise');
  });

  it('adds visual context when the model returns a broad abstract phrase', () => {
    expect(
      buildVisualSearchQuery(
        {
          objectKind: 'arc',
          name: 'Creative home builder',
          relatedTitles: ['Finish the playroom shelves'],
        },
        'growth mindset',
      ),
    ).toBe('creative home editorial detail soft window light');
  });

  it('drops office stock-photo terms from model output', () => {
    expect(
      buildVisualSearchQuery(
        {
          objectKind: 'arc',
          name: 'Founder leadership',
          relatedTitles: ['Ship the weekly release note'],
        },
        'business meeting laptop',
      ),
    ).toBe('modern architecture bold perspective city skyline');
  });

  it('uses family context for relationship arcs', () => {
    expect(
      buildVisualSearchFallbackQuery({
        objectKind: 'arc',
        name: 'Present parent',
        relatedTitles: ['Cook Sunday dinner with the kids'],
      }),
    ).toBe('present parent documentary light family table');
  });

  it('uses visual metaphor rather than literal finance imagery for money arcs', () => {
    expect(
      buildVisualSearchFallbackQuery({
        objectKind: 'arc',
        name: 'Budget steward',
        relatedTitles: ['Review spending every Friday'],
      }),
    ).toBe('budget steward clean lines golden hour');
  });

  it('keeps generated terms compact enough for Unsplash search', () => {
    const term = buildVisualSearchQuery(
      {
        objectKind: 'arc',
        name: 'Outdoor adventure identity',
        description: 'I want to hike, camp, and climb more this year.',
        relatedTitles: [
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

  it('keeps goal queries tied to the outcome context', () => {
    expect(
      buildVisualSearchFallbackQuery({
        objectKind: 'goal',
        name: 'Host Sunday dinner twice a month',
        description: 'Make our house a more regular place of connection.',
        relatedTitles: ['Invite grandparents', 'Plan simple meals'],
      }),
    ).toBe('sunday dinner documentary light family table');
  });

  it('keeps activity queries concrete instead of metaphorical', () => {
    expect(
      buildVisualSearchFallbackQuery({
        objectKind: 'activity',
        name: 'Fix the garage shelf',
        relatedTitles: ['home repair', 'tools'],
      }),
    ).toBe('garage shelf tools workbench natural light');
  });

  it('maps paperwork activities to useful concrete cover imagery', () => {
    expect(
      buildVisualSearchQuery(
        {
          objectKind: 'activity',
          name: 'Submit Q3 taxes',
          relatedTitles: ['finance', 'paperwork'],
        },
        'financial growth journey',
      ),
    ).toBe('tax documents paperwork desk natural light');
  });
});
