import {
  getKwiltGenerationJobContract,
  KWILT_GENERATION_JOB_CONTRACTS,
} from './generationJobContracts';

describe('Kwilt generation job contracts', () => {
  test('promotes only the bounded first local cohort', () => {
    expect(getKwiltGenerationJobContract('chat_rewrite').local).toEqual(expect.objectContaining({
      promotion: 'default',
      maximumInputCharacters: 3_000,
      maximumResponseTokens: 96,
    }));
    expect(getKwiltGenerationJobContract('chat_brainstorm').local).toEqual(expect.objectContaining({
      promotion: 'default',
      maximumInputCharacters: 1_200,
      maximumResponseTokens: 128,
    }));
    expect(getKwiltGenerationJobContract('thread_title').local).toEqual(expect.objectContaining({
      promotion: 'default',
      maximumInputCharacters: 2_400,
      maximumResponseTokens: 32,
    }));
    expect(getKwiltGenerationJobContract('conversation_summary').local?.promotion).toBe('challenger');
    expect(getKwiltGenerationJobContract('arc_generation').local).toBeNull();
    expect(getKwiltGenerationJobContract('current_information').local).toBeNull();
  });

  test('records privacy-aware fallback and cloud tiers', () => {
    expect(getKwiltGenerationJobContract('thread_title')).toEqual(expect.objectContaining({
      privacyClass: 'private_text',
      cloudFallbackPolicy: 'allowed',
      cloudTier: 'economy',
      cloudModel: 'gpt-4o-mini',
    }));
    expect(getKwiltGenerationJobContract('deep_planning')).toEqual(expect.objectContaining({
      cloudTier: 'advanced',
      cloudModel: 'gpt-5.2',
    }));
    expect(getKwiltGenerationJobContract('current_information')).toEqual(expect.objectContaining({
      cloudFallbackPolicy: 'allowed',
      cloudTier: 'advanced',
    }));
  });

  test('keeps contracts immutable and rejects unknown job ids', () => {
    expect(Object.isFrozen(KWILT_GENERATION_JOB_CONTRACTS)).toBe(true);
    expect(Object.isFrozen(getKwiltGenerationJobContract('thread_title'))).toBe(true);
    expect(() => getKwiltGenerationJobContract('not-real' as never)).toThrow('Unknown Kwilt generation job');
  });
});
