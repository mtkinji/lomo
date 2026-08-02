import { shouldConsumeCoachChatCredit } from './coachChatCreditPolicy';

describe('coach chat credit policy', () => {
  it.each(['lightweight_helper', 'agent_judgment'])('does not consume a user credit for %s', (aiJob) => {
    expect(shouldConsumeCoachChatCredit({ aiJob, creditPolicy: 'internal_helper' })).toBe(false);
  });

  it('still consumes a user credit for ordinary chat', () => {
    expect(shouldConsumeCoachChatCredit({ aiJob: 'default_chat', creditPolicy: 'user_turn' })).toBe(true);
  });

  it('rejects exemptions for other work', () => {
    expect(() => shouldConsumeCoachChatCredit({
      aiJob: 'default_chat',
      creditPolicy: 'internal_helper',
    })).toThrow('Internal helper credit policy requires');
  });
});
