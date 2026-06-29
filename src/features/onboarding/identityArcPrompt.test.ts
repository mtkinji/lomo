import { buildIdentityArcGenerationPrompt } from './identityArcPrompt';

describe('identity Arc prompt builder', () => {
  it('builds the required Arc generation contract around structured inputs', () => {
    const prompt = buildIdentityArcGenerationPrompt({
      inputsSummary: 'Arc Survey v2 structured response:\nNeeds a steadier creative practice.',
    });

    expect(prompt).toContain('Arc.name must:');
    expect(prompt).toContain('The Arc narrative MUST:');
    expect(prompt).toContain('have the FIRST sentence start with: "You are becoming"');
    expect(prompt).toContain('Return ONLY JSON in this exact format:');
    expect(prompt).toContain('"name": "<Arc name>"');
    expect(prompt).toContain('"narrative": "<single paragraph, 3 sentences>"');
    expect(prompt).toContain('- Arc Survey v2 structured response:\nNeeds a steadier creative practice.');
  });

  it('adds recent conversation only when a nonblank snapshot is provided', () => {
    const withoutSnapshot = buildIdentityArcGenerationPrompt({
      inputsSummary: 'domain of becoming: creativity',
      conversationSnapshot: '   ',
    });
    const withSnapshot = buildIdentityArcGenerationPrompt({
      inputsSummary: 'domain of becoming: creativity',
      conversationSnapshot: 'assistant: What would feel alive?\nuser: Making something physical.',
    });

    expect(withoutSnapshot).not.toContain('Recent visible conversation');
    expect(withSnapshot).toContain('Recent visible conversation');
    expect(withSnapshot).toContain('assistant: What would feel alive?');
    expect(withSnapshot).toContain('structured identity signals above remain the source of truth');
  });

  it('adds internal reviewer feedback only when provided', () => {
    const withoutFeedback = buildIdentityArcGenerationPrompt({
      inputsSummary: 'domain of becoming: family',
    });
    const withFeedback = buildIdentityArcGenerationPrompt({
      inputsSummary: 'domain of becoming: family',
      judgeFeedback: 'The draft is too abstract and not grounded in ordinary behavior.',
    });

    expect(withoutFeedback).not.toContain('Previous draft feedback from an internal reviewer');
    expect(withFeedback).toContain('Previous draft feedback from an internal reviewer');
    expect(withFeedback).toContain('The draft is too abstract and not grounded in ordinary behavior.');
    expect(withFeedback).toContain('directly addresses this feedback');
  });
});
