import {
  normalizeKwiltAiJob,
  resolveKwiltAiModel,
} from '../aiModelRouting';
import {
  getKwiltGenerationJobContract,
  KWILT_GENERATION_JOB_IDS,
} from '../../../../packages/kwilt-agent-runtime/src/generationJobContracts';

describe('resolveKwiltAiModel', () => {
  it('routes product-defining generation jobs to higher-quality text models', () => {
    expect(resolveKwiltAiModel({ route: '/v1/chat/completions', job: 'arc_generation' })).toBe('gpt-4o');
    expect(resolveKwiltAiModel({ route: '/v1/chat/completions', job: 'goal_generation' })).toBe('gpt-4o');
    expect(resolveKwiltAiModel({ route: '/v1/chat/completions', job: 'deep_planning' })).toBe('gpt-5.2');
    expect(resolveKwiltAiModel({ route: '/v1/responses', job: 'current_information' })).toBe('gpt-5.2');
    expect(resolveKwiltAiModel({ route: '/v1/responses', job: 'unified_chat_attachment' })).toBe('gpt-5-mini');
    expect(resolveKwiltAiModel({ route: '/v1/responses', job: 'agent_judgment' })).toBe('gpt-5.6-luna');
    expect(resolveKwiltAiModel({ route: '/v1/responses', job: 'unified_chat_agent' })).toBe('gpt-5.6-terra');
    expect(resolveKwiltAiModel({ route: '/v1/responses', job: 'default_chat' })).toBeNull();
  });

  it('routes ambient helpers and unknown jobs to the cheap default model', () => {
    expect(resolveKwiltAiModel({ route: '/v1/chat/completions', job: 'lightweight_helper' })).toBe('gpt-4o-mini');
    expect(resolveKwiltAiModel({ route: '/v1/chat/completions', job: 'story_game' })).toBe('gpt-4o-mini');
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
    expect(normalizeKwiltAiJob('story_game')).toBe('story_game');
    expect(normalizeKwiltAiJob('agent_judgment')).toBe('agent_judgment');
    expect(normalizeKwiltAiJob('unified_chat_agent')).toBe('unified_chat_agent');
    expect(normalizeKwiltAiJob('thread_title')).toBe('thread_title');
  });

  it('projects every registered text job from the portable cloud contract', () => {
    for (const job of KWILT_GENERATION_JOB_IDS) {
      if (getKwiltGenerationJobContract(job).responses) continue;
      expect(resolveKwiltAiModel({ route: '/v1/chat/completions', job })).toBe(
        getKwiltGenerationJobContract(job).cloudModel,
      );
    }
  });

  it('does not route Responses-only jobs through Chat Completions', () => {
    expect(resolveKwiltAiModel({ route: '/v1/chat/completions', job: 'unified_chat_agent' })).toBeNull();
  });
});
