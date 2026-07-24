import {
  CHAT_CAPABILITY_COVERAGE,
  type ChatCapabilityCoverageState,
  type ChatCapabilityMobileOutcome,
  type ChatCapabilityPhoneOutcome,
} from './chatCapabilityCoverage';

export type AgentCapabilityEvalCase = {
  id: string;
  operationId: string;
  mobileState: ChatCapabilityCoverageState;
  phoneState: ChatCapabilityCoverageState;
  toolIds: readonly string[];
  expectedMobileOutcome: ChatCapabilityMobileOutcome;
  expectedPhoneOutcome: ChatCapabilityPhoneOutcome;
};

// Channel behavior comes from the executable capability manifest. This file deliberately
// contains no second allowlist that can drift from provider availability.
export const AGENT_CAPABILITY_EVAL_CASES: readonly AgentCapabilityEvalCase[] =
  CHAT_CAPABILITY_COVERAGE.map((row) => ({
    id: `manifest:${row.id}`,
    operationId: row.id,
    mobileState: row.channels.mobile.state,
    phoneState: row.channels.phone.state,
    toolIds: row.toolIds,
    expectedMobileOutcome: row.channels.mobile.outcome,
    expectedPhoneOutcome: row.channels.phone.outcome,
  }));
