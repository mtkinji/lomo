import type { UnifiedChatRequestClass } from '../unifiedChat/requestPolicy';
import { classifyOnDeviceChatTask } from '../unifiedChat/localChatRoute';

export const conversationResponseContract = {
  maxOutputTokens: 96,
  instruction:
    'Conversation mode: answer first in one or two short sentences. Aim for 120–160 characters. Do not use headings, lists, throat-clearing, or a closing offer unless the user asks for detail.',
} as const;

export type ConversationPlanningStrategy = 'fast_direct' | 'full';

export type ConversationPlanningInput = {
  prompt: string;
  interactionMode: 'text' | 'conversation';
  requestClass: UnifiedChatRequestClass;
  usePrivateContext: boolean;
  participatingCapabilityCount: number;
  informationNeed: 'stable' | 'current';
  attachmentCount: number;
  activeContextCount: number;
  hasPendingWork: boolean;
};

const LIGHTWEIGHT_SOCIAL_TURN_PATTERN = /^(?:(?:hey|hi|hello|yo|hiya|howdy)(?:\s+(?:there|kwilt))?|how(?:'s| is) it going|how are you|thanks?|thank you|got it|ok(?:ay)?|cool|sounds good|perfect|nice)[!?.\s]*$/i;

function isLightweightSocialTurn(prompt: string): boolean {
  return LIGHTWEIGHT_SOCIAL_TURN_PATTERN.test(prompt.trim());
}

export function resolveConversationPlanningStrategy(
  input: ConversationPlanningInput,
): ConversationPlanningStrategy {
  const canAnswerWithoutPlanning = input.interactionMode === 'conversation' ||
    isLightweightSocialTurn(input.prompt) ||
    classifyOnDeviceChatTask(input.prompt) !== null;
  return canAnswerWithoutPlanning &&
    input.requestClass === 'general' &&
    input.usePrivateContext === false &&
    input.participatingCapabilityCount === 0 &&
    input.informationNeed === 'stable' &&
    input.attachmentCount === 0 &&
    input.activeContextCount === 0 &&
    input.hasPendingWork === false
    ? 'fast_direct'
    : 'full';
}
