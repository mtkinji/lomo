import type { UnifiedChatRequestClass } from '../unifiedChat/requestPolicy';

export const conversationResponseContract = {
  maxOutputTokens: 96,
  instruction:
    'Conversation mode: answer first in one or two short sentences. Aim for 120–160 characters. Do not use headings, lists, throat-clearing, or a closing offer unless the user asks for detail.',
} as const;

export type ConversationPlanningStrategy = 'fast_direct' | 'full';

export type ConversationPlanningInput = {
  interactionMode: 'text' | 'conversation';
  requestClass: UnifiedChatRequestClass;
  usePrivateContext: boolean;
  participatingCapabilityCount: number;
  informationNeed: 'stable' | 'current';
  attachmentCount: number;
  activeContextCount: number;
  hasPendingWork: boolean;
};

export function resolveConversationPlanningStrategy(
  input: ConversationPlanningInput,
): ConversationPlanningStrategy {
  return input.interactionMode === 'conversation' &&
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
