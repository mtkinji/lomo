import { buildKwiltChatSystemPrompt, buildKwiltChatVoicePrompt } from './chatVoicePrompt';

describe('buildKwiltChatVoicePrompt', () => {
  it('anchors every chat in the Kwilt voice and plain-language contract', () => {
    const prompt = buildKwiltChatVoicePrompt();

    expect(prompt).toContain('smart, warm coworker');
    expect(prompt).toContain('Think deeply. Speak plainly. Stop when you have helped.');
    expect(prompt).toContain('Use familiar words and short sentences');
    expect(prompt).toContain('Do not sound academic');
    expect(prompt).toContain('Accuracy and necessary context matter more than brevity');
  });

  it('defines adaptive brief, standard, and deep response depths', () => {
    const prompt = buildKwiltChatVoicePrompt();

    expect(prompt).toContain('Brief:');
    expect(prompt).toContain('Standard:');
    expect(prompt).toContain('Deep:');
    expect(prompt).toContain('Use the smallest response depth that fully answers the request');
    expect(prompt).toContain('The user\'s explicit request in the current message overrides');
  });

  it('carries stored communication preferences without weakening the brand voice', () => {
    const prompt = buildKwiltChatVoicePrompt({
      tone: 'playful',
      detailLevel: 'deep',
    });

    expect(prompt).toContain('Stored tone preference: playful');
    expect(prompt).toContain('Stored detail preference: deep');
    expect(prompt).toContain('These preferences tune the response');
  });

  it('keeps structured workflow output authoritative and avoids prose duplication', () => {
    const prompt = buildKwiltChatVoicePrompt();

    expect(prompt).toContain('Follow any workflow output schema exactly');
    expect(prompt).toContain('Do not repeat details that a card, proposal, or receipt already shows');
    expect(prompt).toContain('never omit a material caveat');
  });

  it('restates current-message precedence after the user profile is appended', () => {
    const prompt = buildKwiltChatSystemPrompt({
      detailLevel: 'deep',
      userProfileSummary: 'Name: Andrew. Prefers deep level of detail.',
    });

    expect(prompt.lastIndexOf('The current message always wins')).toBeGreaterThan(
      prompt.lastIndexOf('Prefers deep level of detail.'),
    );
  });
});
