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
      informationNeed: 'stable',
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

  it('passes the active turn signal through semantic routing so Stop can cancel it', async () => {
    const controller = new AbortController();
    const sendCoachChat = jest.fn(async () => JSON.stringify({
      requestClass: 'general', participatingCapabilities: [], usePrivateContext: false,
      informationNeed: 'stable', confidence: 0.9, reason: 'General request.',
    }));

    await routeUnifiedChatRequest({
      prompt: 'Help me think.', visibleContext: [], recentTurns: [], signal: controller.signal,
    }, { sendCoachChat: sendCoachChat as never });

    expect(sendCoachChat).toHaveBeenCalledWith(
      expect.any(Array),
      expect.objectContaining({ signal: controller.signal }),
    );
  });

  it('describes Money as the owner of current income-limit answers', async () => {
    const sendCoachChat = jest.fn(async () => JSON.stringify({
      requestClass: 'capability_question', participatingCapabilities: ['money'],
      usePrivateContext: true, informationNeed: 'current', confidence: 0.98,
      reason: 'The user asked about the current living limit.',
    }));

    await routeUnifiedChatRequest({
      prompt: 'Am I within my income spending limit?', visibleContext: [], recentTurns: [],
    }, { sendCoachChat: sendCoachChat as never });

    const call = sendCoachChat.mock.calls[0] as unknown as [unknown, { launchContextSummary?: string }];
    expect(call[1].launchContextSummary).toContain('living limit');
    expect(call[1].launchContextSummary).toContain('current plan-versus-income-limit answer');
  });

  it('describes Household as the owner of roster, access, and invitation reads', async () => {
    const sendCoachChat = jest.fn(async () => JSON.stringify({
      requestClass: 'capability_question', participatingCapabilities: ['household'],
      usePrivateContext: true, informationNeed: 'stable', confidence: 0.98,
      reason: 'The user asked who can manage a child capability.',
    }));

    await routeUnifiedChatRequest({
      prompt: 'Who can manage Screen Time for Charlie?', visibleContext: [], recentTurns: [],
    }, { sendCoachChat: sendCoachChat as never });

    const call = sendCoachChat.mock.calls[0] as unknown as [unknown, { launchContextSummary?: string }];
    expect(call[1].launchContextSummary).toContain('household:');
    expect(call[1].launchContextSummary).toContain('caregiver grants');
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
