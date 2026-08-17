import {
  conversationResponseContract,
  resolveConversationPlanningStrategy,
} from './conversationTurnProfile';

describe('conversationResponseContract', () => {
  it('requests an answer-first response that is short enough to speak', () => {
    expect(conversationResponseContract).toEqual({
      maxOutputTokens: 96,
      instruction:
        'Conversation mode: answer first in one or two short sentences. Aim for 120–160 characters. Do not use headings, lists, throat-clearing, or a closing offer unless the user asks for detail.',
    });
  });
});

describe('resolveConversationPlanningStrategy', () => {
  it.each([
    ['Yo', 'text', 'general', false, 0, 'stable', 0, 0, false, 'fast_direct'],
    ['Rewrite this more warmly: I cannot attend.', 'text', 'general', false, 0, 'stable', 0, 0, false, 'fast_direct'],
    ['Help me think through a hard decision', 'text', 'general', false, 0, 'stable', 0, 0, false, 'full'],
    ['Anything', 'conversation', 'general', false, 0, 'stable', 0, 0, false, 'fast_direct'],
    ['Anything', 'conversation', 'general', false, 0, 'current', 0, 0, false, 'full'],
    ['Anything', 'conversation', 'capability_question', true, 1, 'stable', 0, 1, false, 'full'],
    ['Anything', 'conversation', 'capability_action', true, 1, 'stable', 0, 0, false, 'full'],
    ['Anything', 'conversation', 'general', false, 0, 'stable', 1, 0, false, 'full'],
    ['Anything', 'conversation', 'general', false, 0, 'stable', 0, 0, true, 'full'],
  ] as const)(
    'selects %s %s as %s',
    (prompt, interactionMode, requestClass, usePrivateContext, capabilityCount, informationNeed,
      attachmentCount, activeContextCount, hasPendingWork, expected) => {
      expect(resolveConversationPlanningStrategy({
        prompt,
        interactionMode,
        requestClass,
        usePrivateContext,
        participatingCapabilityCount: capabilityCount,
        informationNeed,
        attachmentCount,
        activeContextCount,
        hasPendingWork,
      })).toBe(expected);
    },
  );
});
