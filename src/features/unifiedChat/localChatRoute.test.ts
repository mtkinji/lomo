import { resolveLocalChatRoute } from './localChatRoute';

const general = {
  requestClass: 'general' as const,
  participatingCapabilities: [],
  usePrivateContext: false,
};

describe('resolveLocalChatRoute', () => {
  test.each([
    ['Yo', "Hey! What’s up?"],
    ['hello!', 'Hey! How can I help?'],
    ['thanks', 'You’re welcome!'],
    ['OK', 'Got it.'],
    ['how are you?', 'I’m here and ready to help.'],
    ['sounds good', 'Sounds good.'],
    ['hiya', 'Hey! How can I help?'],
    ['howdy!', 'Hey! How can I help?'],
    ['hey there', 'Hey! How can I help?'],
    ['hello kwilt', 'Hey! How can I help?'],
  ])('uses an authored response for %s', (prompt, response) => {
    expect(resolveLocalChatRoute({
      prompt,
      requestPolicy: general,
      requiresWebSearch: false,
      attachmentCount: 0,
      evidenceCount: 0,
      isRetry: false,
    })).toEqual({ kind: 'authored', response });
  });

  test.each([
    ['Rewrite this more warmly: I cannot attend.', 'rewrite'],
    ['Proofread this: We is ready to go.', 'proofread'],
    ["Proofread I can't make it tonite", 'proofread'],
    ['Shorten this: I am writing to let you know I will arrive later.', 'shorten'],
    ['Summarize this: The first option is cheaper. The second is faster.', 'summarize'],
    ['Brainstorm five names for a family recipe night.', 'brainstorm'],
  ] as const)('routes an explicit self-contained task to the device: %s', (prompt, task) => {
    expect(resolveLocalChatRoute({
      prompt,
      requestPolicy: general,
      requiresWebSearch: false,
      attachmentCount: 0,
      evidenceCount: 0,
      isRetry: false,
    })).toEqual({ kind: 'on_device', task, prompt });
  });

  test.each([
    ['private context', { ...general, usePrivateContext: true }, false, 0, 1, false],
    ['capability action', { ...general, requestClass: 'capability_action' as const, participatingCapabilities: ['todos' as const] }, false, 0, 0, false],
    ['current information', general, true, 0, 0, false],
    ['attachment', general, false, 1, 0, false],
    ['retry', general, false, 0, 0, true],
  ])('keeps %s on the cloud route', (_label, requestPolicy, requiresWebSearch, attachmentCount, evidenceCount, isRetry) => {
    expect(resolveLocalChatRoute({
      prompt: 'Rewrite this more warmly: I cannot attend.',
      requestPolicy,
      requiresWebSearch,
      attachmentCount,
      evidenceCount,
      isRetry,
    })).toEqual({ kind: 'cloud' });
  });

  test('does not treat a broad question as a local task', () => {
    expect(resolveLocalChatRoute({
      prompt: 'What should I do about a difficult relationship?',
      requestPolicy: general,
      requiresWebSearch: false,
      attachmentCount: 0,
      evidenceCount: 0,
      isRetry: false,
    })).toEqual({ kind: 'cloud' });
  });

  test.each([
    'Summarize this: what did we discuss above?',
    'Give me title ideas based on what we discussed earlier.',
    'Summarize this: our conversation',
    'Give me title ideas based on our chat.',
    'Rewrite what I just said to sound warmer.',
  ])('keeps a history-dependent request in the cloud: %s', (prompt) => {
    expect(resolveLocalChatRoute({
      prompt,
      requestPolicy: general,
      requiresWebSearch: false,
      attachmentCount: 0,
      evidenceCount: 0,
      isRetry: false,
    })).toEqual({ kind: 'cloud' });
  });
});
