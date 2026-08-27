import type { ExternalControlCoverageRow } from '@kwilt/agent-runtime';
import type { UiParitySurface } from '../../capabilities/uiParityInventory';
import type { ChatCapabilityCoverageRow } from './chatCapabilityCoverage';

export type ConversationalCompletionMode =
  | 'direct'
  | 'reviewed_proposal'
  | 'native_handoff'
  | 'provider_handoff'
  | 'supported_boundary'
  | 'excluded';

export type ConversationalParityRow = {
  operationId: string;
  owner: string;
  surfaceId: string;
  intentId: string;
  completionMode: ConversationalCompletionMode;
  mobile: 'ready' | 'missing_provider' | 'missing_proof' | 'excluded';
  phone: 'ready' | 'missing_provider' | 'missing_proof' | 'excluded';
  external: 'ready' | 'missing_provider' | 'missing_proof' | 'boundary' | 'excluded';
  voice: 'shared_runtime' | 'missing_conformance' | 'excluded';
  proofPaths: readonly string[];
};

type OperationMapping = {
  surface: UiParitySurface;
  intent: UiParitySurface['intents'][number];
};

const PROGRAM_EXCLUSIONS = new Set(['explore.open', 'games.open']);

function mapOperationsToUi(surfaces: readonly UiParitySurface[]): Map<string, OperationMapping> {
  const mapping = new Map<string, OperationMapping>();
  for (const surface of surfaces) {
    for (const intent of surface.intents) {
      for (const operationId of intent.operationIds) {
        if (mapping.has(operationId)) throw new Error(`Duplicate UI parity operation: ${operationId}`);
        mapping.set(operationId, { surface, intent });
      }
    }
  }
  return mapping;
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values)].sort();
}

function completionMode(
  row: ChatCapabilityCoverageRow,
  surface: UiParitySurface,
  external: ExternalControlCoverageRow,
): ConversationalCompletionMode {
  if (surface.scope === 'excluded') return 'excluded';
  if (external.state === 'explicit_boundary' || row.returnBehavior === 'honest_boundary') return 'supported_boundary';
  if (row.returnBehavior === 'native_handoff' || row.channels.phone.outcome === 'device_handoff') return 'native_handoff';
  if (row.channels.phone.outcome === 'mobile_proposal') return 'reviewed_proposal';
  if (row.effect === 'write' && row.returnBehavior === 'proposal_or_receipt') return 'reviewed_proposal';
  return 'direct';
}

function localState(
  channel: { state: ChatCapabilityCoverageRow['channels']['mobile']['state']; proofPaths: readonly string[] },
  hasMissingProvider: boolean,
): ConversationalParityRow['mobile'] {
  if (channel.state === 'excluded') return 'excluded';
  if (channel.state === 'pending_provider' || hasMissingProvider) return 'missing_provider';
  if (channel.proofPaths.length === 0) return 'missing_proof';
  return 'ready';
}

function externalState(
  external: ExternalControlCoverageRow,
  coverage: ChatCapabilityCoverageRow,
): ConversationalParityRow['external'] {
  if (external.state === 'excluded') return 'excluded';
  if (external.state === 'explicit_boundary' || external.state === 'not_applicable') return 'boundary';
  if (external.state === 'pending_provider' || external.state === 'pending_registration') return 'missing_provider';
  if (coverage.toolIds.length > 0 && coverage.toolCoverage.some((tool) => !tool.serverHandler)) {
    return 'missing_provider';
  }
  if (coverage.channels.phone.proofPaths.length === 0) return 'missing_proof';
  return 'ready';
}

export function buildConversationalParity({
  surfaces,
  coverage,
  externalCoverage,
  voiceConformanceOperationIds,
}: {
  surfaces: readonly UiParitySurface[];
  coverage: readonly ChatCapabilityCoverageRow[];
  externalCoverage: readonly ExternalControlCoverageRow[];
  voiceConformanceOperationIds: readonly string[];
}): ConversationalParityRow[] {
  const uiByOperation = mapOperationsToUi(surfaces);
  const externalByOperation = new Map(externalCoverage.map((row) => [row.operationId, row]));
  const voiceConformance = new Set(voiceConformanceOperationIds);
  const coverageIds = new Set(coverage.map((row) => row.id));

  for (const operationId of uiByOperation.keys()) {
    if (!coverageIds.has(operationId)) {
      throw new Error(`Missing conversational coverage for UI operation: ${operationId}`);
    }
  }

  return coverage.map((row) => {
    const mapping = uiByOperation.get(row.id);
    if (!mapping) throw new Error(`Missing UI parity surface for operation: ${row.id}`);
    const external = externalByOperation.get(row.id);
    if (!external) throw new Error(`Missing external coverage for operation: ${row.id}`);
    const missingMobileProvider = row.toolIds.length > 0
      && row.toolCoverage.some((tool) => !tool.mobileHandler);
    const missingPhoneProvider = row.toolIds.length > 0
      && row.toolCoverage.some((tool) => !tool.serverHandler);
    const mobile = localState(row.channels.mobile, missingMobileProvider);
    const phone = localState(row.channels.phone, missingPhoneProvider);

    return {
      operationId: row.id,
      owner: row.owner,
      surfaceId: mapping.surface.id,
      intentId: mapping.intent.id,
      completionMode: completionMode(row, mapping.surface, external),
      mobile,
      phone,
      external: externalState(external, row),
      voice: mobile === 'excluded'
        ? 'excluded'
        : voiceConformance.has(row.id) ? 'shared_runtime' : 'missing_conformance',
      proofPaths: unique([
        ...row.channels.mobile.proofPaths,
        ...row.channels.phone.proofPaths,
      ]),
    };
  });
}

export function validateConversationalParity({
  surfaces,
  rows,
}: {
  surfaces: readonly UiParitySurface[];
  rows: readonly ConversationalParityRow[];
}): string[] {
  const errors: string[] = [];
  const rowIds = new Set<string>();

  for (const surface of surfaces) {
    if (surface.scope === 'included') {
      for (const gap of surface.gaps) errors.push(`Unresolved UI gap ${gap.id} on ${surface.id}: ${gap.reason}`);
    }
  }

  for (const row of rows) {
    if (rowIds.has(row.operationId)) errors.push(`Duplicate conversational parity row: ${row.operationId}`);
    rowIds.add(row.operationId);

    if (row.completionMode === 'excluded') {
      if (!PROGRAM_EXCLUSIONS.has(row.operationId)) errors.push(`Unsupported program exclusion: ${row.operationId}`);
      continue;
    }
    if (row.mobile !== 'ready') errors.push(`${row.operationId} mobile is ${row.mobile}`);
    if (row.phone !== 'ready') errors.push(`${row.operationId} phone is ${row.phone}`);
    if (row.external !== 'ready' && row.external !== 'boundary') {
      errors.push(`${row.operationId} external is ${row.external}`);
    }
    if (row.voice !== 'shared_runtime') errors.push(`${row.operationId} voice is ${row.voice}`);
    if (row.proofPaths.length === 0) errors.push(`${row.operationId} has no proof paths`);
  }
  return errors;
}

export function assertFinalConversationalParity(input: {
  surfaces: readonly UiParitySurface[];
  rows: readonly ConversationalParityRow[];
}): void {
  const errors = validateConversationalParity(input);
  if (errors.length > 0) {
    throw new Error(`Conversational control parity is incomplete:\n${errors.map((error) => `- ${error}`).join('\n')}`);
  }
}
