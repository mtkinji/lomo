import {
  normalizeKwiltAiJob,
  resolveKwiltAiModel,
} from '../aiModelRouting';

describe('resolveKwiltAiModel', () => {
  it('routes product-defining generation jobs to higher-quality text models', () => {
    expect(resolveKwiltAiModel({ route: '/v1/chat/completions', job: 'arc_generation' })).toBe('gpt-4o');
    expect(resolveKwiltAiModel({ route: '/v1/chat/completions', job: 'goal_generation' })).toBe('gpt-4o');
    expect(resolveKwiltAiModel({ route: '/v1/chat/completions', job: 'deep_planning' })).toBe('gpt-5.2');
  });

  it('routes ambient helpers and unknown jobs to the cheap default model', () => {
    expect(resolveKwiltAiModel({ route: '/v1/chat/completions', job: 'lightweight_helper' })).toBe('gpt-4o-mini');
    expect(resolveKwiltAiModel({ route: '/v1/chat/completions', job: 'activity_generation' })).toBe('gpt-4o-mini');
    expect(resolveKwiltAiModel({ route: '/v1/chat/completions', job: 'not-real', requestedModel: 'gpt-5.2' })).toBe(
      'gpt-4o-mini'
    );
  });

  it('overrides image generation models to the only allowed image model', () => {
    expect(resolveKwiltAiModel({ route: '/v1/images/generations', job: 'arc_generation', requestedModel: 'gpt-5.2' })).toBe(
      'gpt-image-1'
    );
  });

  it('normalizes empty or unrecognized jobs to default_chat', () => {
    expect(normalizeKwiltAiJob('')).toBe('default_chat');
    expect(normalizeKwiltAiJob(null)).toBe('default_chat');
    expect(normalizeKwiltAiJob('arc_generation')).toBe('arc_generation');
  });
});

