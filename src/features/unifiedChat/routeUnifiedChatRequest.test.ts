import { shouldConsumeCoachChatCredit } from '../../services/ai';
import { routeUnifiedChatRequest } from './routeUnifiedChatRequest';

describe('internal semantic routing credit policy', () => {
  it('charges ordinary chat but not an internal lightweight helper', () => {
    expect(shouldConsumeCoachChatCredit({ aiJob: 'default_chat' })).toBe(true);
    expect(shouldConsumeCoachChatCredit({
      aiJob: 'lightweight_helper',
      creditPolicy: 'internal_helper',
    })).toBe(false);
  });

  it('rejects an internal credit exemption for non-helper work', () => {
    expect(() => shouldConsumeCoachChatCredit({
      aiJob: 'default_chat',
      creditPolicy: 'internal_helper',
    })).toThrow('Internal helper credit policy requires lightweight_helper');
  });
});

describe('routeUnifiedChatRequest', () => {
  it('uses bounded structured output without broad profile context or another user credit', async () => {
    const sendCoachChat = jest.fn(async () => JSON.stringify({
      requestClass: 'capability_question',
      participatingCapabilities: ['plan'],
      usePrivateContext: true,
      confidence: 0.92,
      reason: 'The user wants help shaping tomorrow.',
    }));

    const result = await routeUnifiedChatRequest({
      prompt: 'Could tomorrow feel lighter?',
      visibleContext: [],
      recentTurns: [{ role: 'assistant', content: 'We were looking at your week.' }],
    }, { sendCoachChat: sendCoachChat as never });

    expect(result?.participatingCapabilities).toEqual(['plan']);
    expect(sendCoachChat).toHaveBeenCalledWith(
      [{ role: 'user', content: 'Could tomorrow feel lighter?' }],
      expect.objectContaining({
        aiJob: 'lightweight_helper',
        creditPolicy: 'internal_helper',
        includeUserProfileContext: false,
        responseFormat: expect.objectContaining({ type: 'json_schema' }),
      }),
    );
    const call = sendCoachChat.mock.calls[0] as unknown as [
      unknown,
      { launchContextSummary?: string },
    ];
    expect(call[1].launchContextSummary).toContain('Do not answer the user');
  });

  it.each([
    ['malformed output', async () => 'not json'],
    ['transport failure', async () => { throw new Error('offline'); }],
  ])('returns null on %s so the lexical route can continue', async (_label, sender) => {
    await expect(routeUnifiedChatRequest({
      prompt: 'Help with tomorrow',
      visibleContext: [],
      recentTurns: [],
    }, { sendCoachChat: sender as never })).resolves.toBeNull();
  });
});
