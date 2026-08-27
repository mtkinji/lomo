import {
  KWILT_CAPABILITY_MANIFEST,
  type CapabilityManifestEntry,
} from '@kwilt/agent-runtime';
import { KWILT_OPERATION_REGISTRY } from '../../capabilities/operations';
import { MOBILE_TOOL_PROVIDER_REGISTRATIONS } from './mobileToolImplementations';
import { SERVER_TOOL_PROVIDER_REGISTRATIONS } from '../../../supabase/functions/_shared/serverToolImplementations';

export type ChatCapabilityCoverageState = 'live' | 'pending_provider' | 'confirmation_only' | 'excluded';
export type ChatCapabilityChannel = 'mobile' | 'phone';
export type ChatCapabilityMobileOutcome = 'answer' | 'proposal_or_receipt' | 'native_review' | 'honest_boundary';
export type ChatCapabilityPhoneOutcome = 'server_execution' | 'device_handoff' | 'mobile_proposal' | 'honest_boundary';

type ChannelCoverage<Outcome extends string> = {
  state: ChatCapabilityCoverageState;
  outcome: Outcome;
  proofPaths: readonly string[];
  boundaryReason: string | null;
};

export type ChatCapabilityCoverageRow = {
  id: string;
  owner: string;
  providers: CapabilityManifestEntry['providerEligibility'];
  consequence: CapabilityManifestEntry['consequence'];
  confirmation: CapabilityManifestEntry['confirmation'];
  toolIds: readonly string[];
  sourceRefs: readonly string[];
  returnBehavior: CapabilityManifestEntry['returnBehavior'];
  toolCoverage: readonly {
    toolId: string;
    mobileHandler: boolean;
    serverHandler: boolean;
    externalExposure: boolean;
  }[];
  channels: {
    mobile: ChannelCoverage<ChatCapabilityMobileOutcome>;
    phone: ChannelCoverage<ChatCapabilityPhoneOutcome>;
  };
};

type RegistrationFact = { toolId: string };

function pendingChannel<Outcome extends string>(
  channel: 'mobile' | 'server',
  missingToolIds: readonly string[],
  original: { proofPaths: readonly string[] },
): ChannelCoverage<Outcome> {
  return {
    state: 'pending_provider',
    outcome: 'honest_boundary' as Outcome,
    proofPaths: original.proofPaths,
    boundaryReason: `Missing executable ${channel} handler: ${missingToolIds.join(', ')}`,
  };
}

export function buildChatCapabilityCoverage({
  operations,
  manifest,
  mobileRegistrations,
  serverRegistrations,
}: {
  operations: readonly { id: string; owner: string }[];
  manifest: readonly CapabilityManifestEntry[];
  mobileRegistrations: readonly RegistrationFact[];
  serverRegistrations: readonly RegistrationFact[];
}): ChatCapabilityCoverageRow[] {
  const manifestById = new Map(manifest.map((entry) => [entry.id, entry]));
  const mobileHandlers = new Set(mobileRegistrations.map((item) => item.toolId));
  const serverHandlers = new Set(serverRegistrations.map((item) => item.toolId));

  return operations.map((declared) => {
    const contract = manifestById.get(declared.id);
    if (!contract) {
      const boundaryReason = `Missing capability contract for declared operation: ${declared.id}`;
      return {
        id: declared.id,
        owner: declared.owner,
        providers: [],
        consequence: 'low',
        confirmation: 'none',
        toolIds: [],
        sourceRefs: [`capability:${declared.owner}`],
        returnBehavior: 'honest_boundary',
        toolCoverage: [],
        channels: {
          mobile: { state: 'pending_provider', outcome: 'honest_boundary', proofPaths: [], boundaryReason },
          phone: { state: 'pending_provider', outcome: 'honest_boundary', proofPaths: [], boundaryReason },
        },
      };
    }

    const toolIds = contract.tools.map((tool) => tool.id);
    const missingMobile = toolIds.filter((toolId) => !mobileHandlers.has(toolId));
    const missingServer = toolIds.filter((toolId) => !serverHandlers.has(toolId));
    const mobile = toolIds.length > 0 && missingMobile.length > 0
      && (contract.channels.mobile.state === 'live' || contract.channels.mobile.state === 'confirmation_only')
      ? pendingChannel<ChatCapabilityMobileOutcome>('mobile', missingMobile, contract.channels.mobile)
      : contract.channels.mobile as ChannelCoverage<ChatCapabilityMobileOutcome>;
    const phone = toolIds.length > 0 && missingServer.length > 0
      && (contract.channels.phone.state === 'live' || contract.channels.phone.state === 'confirmation_only')
      ? pendingChannel<ChatCapabilityPhoneOutcome>('server', missingServer, contract.channels.phone)
      : contract.channels.phone as ChannelCoverage<ChatCapabilityPhoneOutcome>;
    const externalExposure = contract.sourceRefs.some((ref) => ref.startsWith('mcp:'));

    return {
      id: declared.id,
      owner: declared.owner,
      providers: contract.providerEligibility,
      consequence: contract.consequence,
      confirmation: contract.confirmation,
      toolIds,
      sourceRefs: contract.sourceRefs,
      returnBehavior: contract.returnBehavior,
      toolCoverage: toolIds.map((toolId) => ({
        toolId,
        mobileHandler: mobileHandlers.has(toolId),
        serverHandler: serverHandlers.has(toolId),
        externalExposure,
      })),
      channels: { mobile, phone },
    };
  });
}

export const CHAT_CAPABILITY_COVERAGE = buildChatCapabilityCoverage({
  operations: KWILT_OPERATION_REGISTRY,
  manifest: KWILT_CAPABILITY_MANIFEST,
  mobileRegistrations: MOBILE_TOOL_PROVIDER_REGISTRATIONS,
  serverRegistrations: SERVER_TOOL_PROVIDER_REGISTRATIONS,
});

export function assertCompleteConversationalCoverage(
  operations: readonly { id: string }[] = KWILT_OPERATION_REGISTRY,
  coverage: readonly { id: string }[] = CHAT_CAPABILITY_COVERAGE,
): void {
  const coverageIds = new Set(coverage.map((row) => row.id));
  const missing = operations.map((operation) => operation.id).filter((id) => !coverageIds.has(id));
  if (missing.length > 0) {
    throw new Error(`Missing conversational coverage for Kwilt operation${missing.length === 1 ? '' : 's'}: ${missing.join(', ')}`);
  }
}

assertCompleteConversationalCoverage();

export function summarizeChatCapabilityCoverage(
  channel: ChatCapabilityChannel = 'mobile',
): Record<ChatCapabilityCoverageState, number> {
  return CHAT_CAPABILITY_COVERAGE.reduce<Record<ChatCapabilityCoverageState, number>>(
    (summary, row) => ({
      ...summary,
      [row.channels[channel].state]: summary[row.channels[channel].state] + 1,
    }),
    { live: 0, pending_provider: 0, confirmation_only: 0, excluded: 0 },
  );
}
