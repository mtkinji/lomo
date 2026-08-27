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
      promotion: 'challenger',
      maximumInputCharacters: 1_200,
      maximumResponseTokens: 128,
    }));
    expect(getKwiltGenerationJobContract('chat_shorten').local?.promotion).toBe('challenger');
    expect(getKwiltGenerationJobContract('chat_proofread').local?.promotion).toBe('default');
    expect(getKwiltGenerationJobContract('chat_summarize').local?.promotion).toBe('default');
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
    expect(getKwiltGenerationJobContract('unified_chat_agent')).toEqual(expect.objectContaining({
      owner: 'agent-runtime',
      cloudModel: 'gpt-5.6-terra',
      responses: {
        store: false,
        maximumOutputTokens: 1_200,
        parallelToolCalls: false,
      },
    }));
  });

  test('gives every local cohort observational first-output and total targets', () => {
    for (const contract of Object.values(KWILT_GENERATION_JOB_CONTRACTS)) {
      if (!contract.local) continue;
      expect(contract.local.targetFirstUsefulOutputMs).toBeGreaterThan(0);
      expect(contract.local.targetTotalDurationMs).toBeGreaterThanOrEqual(
        contract.local.targetFirstUsefulOutputMs,
      );
      expect(contract.local.targetTotalDurationMs).toBeLessThanOrEqual(6_000);
    }
    expect(getKwiltGenerationJobContract('chat_rewrite').local).toEqual(expect.objectContaining({
      targetFirstUsefulOutputMs: 1_200,
      targetTotalDurationMs: 3_000,
    }));
    expect(getKwiltGenerationJobContract('thread_title').local).toEqual(expect.objectContaining({
      targetFirstUsefulOutputMs: 2_400,
      targetTotalDurationMs: 2_400,
    }));
  });

  test('keeps contracts immutable and rejects unknown job ids', () => {
    expect(Object.isFrozen(KWILT_GENERATION_JOB_CONTRACTS)).toBe(true);
    expect(Object.isFrozen(getKwiltGenerationJobContract('thread_title'))).toBe(true);
    expect(() => getKwiltGenerationJobContract('not-real' as never)).toThrow('Unknown Kwilt generation job');
  });
});
