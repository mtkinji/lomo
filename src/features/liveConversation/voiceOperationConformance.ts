import { KWILT_CAPABILITY_MANIFEST, type CapabilityConfirmation } from '@kwilt/agent-runtime';
import { CHAT_CAPABILITY_COVERAGE } from '../unifiedChat/chatCapabilityCoverage';

export type VoiceOperationConformance = {
  operationId: string;
  toolIds: readonly string[];
  confirmation: CapabilityConfirmation;
  completionMode: string;
  inputPath: 'provider_final_transcript_to_shared_run_send';
  resultPath: 'durable_run_terminal_state';
  voiceApproval: 'not_applicable' | 'single_explicit_proposal_only' | 'native_review_required';
};

const manifestById = new Map(KWILT_CAPABILITY_MANIFEST.map((operation) => [operation.id, operation]));

export const VOICE_OPERATION_CONFORMANCE: readonly VoiceOperationConformance[] =
  CHAT_CAPABILITY_COVERAGE.flatMap((coverage) => {
    if (coverage.channels.mobile.state === 'excluded') return [];
    const operation = manifestById.get(coverage.id);
    if (!operation) throw new Error(`Missing canonical operation for voice: ${coverage.id}`);
    const canonicalToolIds = operation.tools.map((tool) => tool.id).sort();
    const coverageToolIds = [...coverage.toolIds].sort();
    if (JSON.stringify(canonicalToolIds) !== JSON.stringify(coverageToolIds)) {
      throw new Error(`Voice tool drift for ${coverage.id}`);
    }
    return [{
      operationId: coverage.id,
      toolIds: coverageToolIds,
      confirmation: operation.confirmation,
      completionMode: operation.completionMode,
      inputPath: 'provider_final_transcript_to_shared_run_send' as const,
      resultPath: 'durable_run_terminal_state' as const,
      voiceApproval: operation.confirmation === 'native'
        ? 'native_review_required' as const
        : operation.confirmation === 'explicit'
          ? 'single_explicit_proposal_only' as const
          : 'not_applicable' as const,
    }];
  });

export const VOICE_CONFORMANCE_OPERATION_IDS = VOICE_OPERATION_CONFORMANCE
  .map((operation) => operation.operationId);
