import {
  buildActivityEnrichmentSystemPrompt,
  normalizeActivityAiEnrichmentActions,
} from './ai';

describe('activity AI enrichment prompt', () => {
  it('asks for practical trigger inference when triggers are selected', () => {
    const prompt = buildActivityEnrichmentSystemPrompt(['triggers', 'details']);

    expect(prompt).toContain('Requested AI actions: triggers, details');
    expect(prompt).toContain('populate reminderAt, scheduledDate, and repeatRule');
    expect(prompt).toContain('gentle future reminder during waking hours within the next 1-7 days');
    expect(prompt).toContain('mapped goal has a target date');
    expect(prompt).toContain('choose weekly as the default cadence');
    expect(prompt).toContain('Do not invent hard deadlines');
    expect(prompt).toContain('steps is not requested: omit steps');
  });

  it('explicitly omits trigger fields when triggers are not selected', () => {
    const prompt = buildActivityEnrichmentSystemPrompt(['details']);

    expect(prompt).toContain('triggers is not requested: omit reminderAt, scheduledDate, and repeatRule');
    expect(prompt).not.toContain('populate reminderAt, scheduledDate, and repeatRule');
  });
});

describe('normalizeActivityAiEnrichmentActions', () => {
  it('defaults missing actions to all enrichment actions for legacy callers', () => {
    expect(normalizeActivityAiEnrichmentActions(undefined)).toEqual(['steps', 'triggers', 'details']);
  });

  it('preserves an intentional empty action list', () => {
    expect(normalizeActivityAiEnrichmentActions([])).toEqual([]);
  });

  it('keeps known actions in order without duplicates', () => {
    expect(normalizeActivityAiEnrichmentActions(['triggers', 'details', 'triggers'])).toEqual([
      'triggers',
      'details',
    ]);
  });
});
