import {
  buildKwiltChannelContext,
  KWILT_CHANNEL_CONTEXT_SCHEMA_VERSION,
  type KwiltChannelContextPacket,
} from '../../../packages/kwilt-agent-runtime/src/channelContext';
import type { UnifiedChatAttachment } from './unifiedChatAttachmentPolicy';
import type { UnifiedChatContextRef, UnifiedChatThreadAggregate } from './types';

export type MobileChannelContextInput = {
  locale: string;
  timeZone: string;
  appState: string;
  origin: { screen: string; action: string };
  selectedEntities: readonly Pick<UnifiedChatContextRef, 'capabilityId' | 'objectType' | 'objectId' | 'label'>[];
  attachments: readonly UnifiedChatAttachment[];
  pendingProposalIds: readonly string[];
  pendingClientActionIds: readonly string[];
  availableDeviceProviders: readonly string[];
  voice?: {
    sessionId: string;
    utteranceId: string;
    source: 'provider_final' | 'frozen_provisional';
    locale: string;
    interrupted: boolean;
    speechStoppedAt: string;
    finalizedAt: string;
    confidence?: number;
  };
};

export function buildMobileChannelContext(input: MobileChannelContextInput): KwiltChannelContextPacket {
  return buildKwiltChannelContext({
    ...input,
    selectedEntities: input.selectedEntities,
    attachments: input.attachments,
    voice: input.voice,
  });
}

export function buildMobileTurnChannelContext({
  aggregate,
  attachments,
  action,
  locale,
  timeZone,
  appState,
  voice,
}: {
  aggregate: UnifiedChatThreadAggregate;
  attachments: readonly UnifiedChatAttachment[];
  action: 'run.send' | 'run.retry' | 'run.steer';
  locale: string;
  timeZone: string;
  appState: string;
  voice?: MobileChannelContextInput['voice'];
}): KwiltChannelContextPacket {
  return buildMobileChannelContext({
    locale, timeZone, appState, origin: { screen: 'UnifiedChat', action }, attachments,
    selectedEntities: (aggregate.contextRefs ?? []).filter((context) => context.active),
    pendingProposalIds: (aggregate.proposals ?? [])
      .filter((proposal) => ['pending', 'edited', 'deferred', 'approved', 'applying'].includes(proposal.status))
      .map((proposal) => proposal.id),
    pendingClientActionIds: (aggregate.clientActions ?? [])
      .filter((clientAction) => clientAction.status === 'pending_client_action' || clientAction.status === 'presenting')
      .map((clientAction) => clientAction.id),
    availableDeviceProviders: ['native_navigation', 'native_review'], voice,
  });
}

export { KWILT_CHANNEL_CONTEXT_SCHEMA_VERSION };
export type { KwiltChannelContextPacket };
