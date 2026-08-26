import {
  buildKwiltChannelContext,
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
};

export function buildMobileChannelContext(input: MobileChannelContextInput): KwiltChannelContextPacket {
  return buildKwiltChannelContext({
    ...input,
    selectedEntities: input.selectedEntities,
    attachments: input.attachments,
  });
}

export function buildMobileTurnChannelContext({
  aggregate,
  attachments,
  action,
  locale,
  timeZone,
  appState,
}: {
  aggregate: UnifiedChatThreadAggregate;
  attachments: readonly UnifiedChatAttachment[];
  action: 'run.send' | 'run.retry' | 'run.steer';
  locale: string;
  timeZone: string;
  appState: string;
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
    availableDeviceProviders: ['native_navigation', 'native_review'],
  });
}

export type { KwiltChannelContextPacket };
