import {
  KWILT_CAPABILITY_MANIFEST,
  projectOperationCoverage,
} from '@kwilt/agent-runtime';

export type ChatCapabilityCoverageState =
  | 'live'
  | 'pending_provider'
  | 'confirmation_only'
  | 'excluded';

export type ChatCapabilityChannel = 'mobile' | 'phone';

export type ChatCapabilityMobileOutcome =
  | 'answer'
  | 'proposal_or_receipt'
  | 'native_review'
  | 'honest_boundary';

export type ChatCapabilityPhoneOutcome =
  | 'server_execution'
  | 'device_handoff'
  | 'mobile_proposal'
  | 'honest_boundary';

export type ChatCapabilityCoverageRow = Omit<
  ReturnType<typeof projectOperationCoverage>[number],
  'channels'
> & {
  channels: {
    mobile: Omit<ReturnType<typeof projectOperationCoverage>[number]['channels']['mobile'], 'outcome'> & {
      outcome: ChatCapabilityMobileOutcome;
    };
    phone: Omit<ReturnType<typeof projectOperationCoverage>[number]['channels']['phone'], 'outcome'> & {
      outcome: ChatCapabilityPhoneOutcome;
    };
  };
};

export const CHAT_CAPABILITY_COVERAGE = projectOperationCoverage(
  KWILT_CAPABILITY_MANIFEST,
) as ChatCapabilityCoverageRow[];

export function assertCompleteConversationalCoverage(
  operations: readonly { id: string }[] = KWILT_CAPABILITY_MANIFEST,
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
