import {
  KWILT_CAPABILITY_MANIFEST,
  type CapabilityManifestEntry,
} from '@kwilt/agent-runtime';
import type { AgentJudgment } from './agentJudgment';
import type {
  AgentJudgmentAuthorization,
  AgentJudgmentEvidenceScope,
  AgentJudgmentResponseContract,
} from './agentJudgment';
import {
  isUnifiedChatCapabilityId,
  type UnifiedChatCapabilityId,
  type UnifiedChatRequestClass,
  type UnifiedChatRequestPolicy,
} from './requestPolicy';
import type { UnifiedChatThreadAggregate } from './types';

export type UnifiedChatTurnReferenceKind = 'correction' | 'retry';

export type UnifiedChatTurnActionContract = {
  operationIds: string[];
  targetScope: 'selected_objects' | 'all_matching';
  targetQuery: string;
};

export type UnifiedChatTurnContract = {
  schemaVersion: 2;
  userJob: string;
  desiredOutcome: string;
  constraints: string[];
  requestClass: UnifiedChatRequestClass;
  participatingCapabilities: UnifiedChatCapabilityId[];
  usePrivateContext: boolean;
  authorization: AgentJudgmentAuthorization;
  evidenceScope: AgentJudgmentEvidenceScope;
  responseContract: AgentJudgmentResponseContract;
  action: UnifiedChatTurnActionContract | null;
  referent: { runId: string; kind: UnifiedChatTurnReferenceKind } | null;
};

export type ResolvedUnifiedChatTurnContract = {
  runId: string;
  contract: UnifiedChatTurnContract;
};

const RETRY_PATTERN = /\b(?:retry|try\s+(?:that|it|this)?\s*again)\b/i;
const CORRECTION_PATTERN =
  /(?:\bi meant\b|\bclose,?\s+but\b|\binstead\s+of\b|\b(?:move|put)\b[^.!?]{0,100}\b(?:front|beginning|end)\b|\b(?:correct|change)\s+(?:that|it|those|them)\b)/i;
const ALL_MATCHING_PATTERN = /\b(?:all|every|each|everything|remaining)\b|\bthe\s+rest\s+of\b/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function nonEmptyText(value: unknown, maxLength = 500): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed.length <= maxLength ? trimmed : null;
}

function uniqueStrings(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

export function classifyTurnReference(prompt: string): UnifiedChatTurnReferenceKind | null {
  const trimmed = prompt.trim();
  if (!trimmed) return null;
  if (RETRY_PATTERN.test(trimmed)) return 'retry';
  if (CORRECTION_PATTERN.test(trimmed)) return 'correction';
  return null;
}

function operationForTool(toolId: string): CapabilityManifestEntry | null {
  return KWILT_CAPABILITY_MANIFEST.find((operation) => operation.id === toolId) ??
    KWILT_CAPABILITY_MANIFEST.find((operation) =>
      operation.effect === 'write' && operation.tools.some((tool) => tool.id === toolId)) ??
    null;
}

function inferredOperations(
  agentJudgment: AgentJudgment | null,
): CapabilityManifestEntry[] {
  const fromJudgment = uniqueStrings(
    agentJudgment?.steps.flatMap((step) => step.toolId ? [step.toolId] : []) ?? [],
  ).map(operationForTool).filter((operation): operation is CapabilityManifestEntry => Boolean(operation));
  return fromJudgment;
}

function actionFromOperations(
  prompt: string,
  operations: readonly CapabilityManifestEntry[],
): UnifiedChatTurnActionContract {
  return {
    operationIds: uniqueStrings(operations.map((operation) => operation.id)),
    targetScope: ALL_MATCHING_PATTERN.test(prompt) ? 'all_matching' : 'selected_objects',
    targetQuery: prompt.trim(),
  };
}

export function buildUnifiedChatTurnContract({
  prompt,
  requestPolicy,
  agentJudgment,
  previous,
}: {
  prompt: string;
  requestPolicy: UnifiedChatRequestPolicy;
  agentJudgment: AgentJudgment | null;
  previous: ResolvedUnifiedChatTurnContract | null;
}): UnifiedChatTurnContract {
  const referenceKind = classifyTurnReference(prompt);
  const preservesPrevious = Boolean(
    referenceKind && previous?.contract.action,
  );
  const operations = inferredOperations(agentJudgment);
  const action = requestPolicy.requestClass === 'capability_action'
    ? preservesPrevious && previous?.contract.action
      ? { ...previous.contract.action, operationIds: [...previous.contract.action.operationIds],
          targetQuery: previous.contract.action.targetQuery }
      : actionFromOperations(prompt, operations)
    : null;
  const priorConstraints = preservesPrevious ? previous?.contract.constraints ?? [] : [];
  const judgmentConstraints = agentJudgment?.constraints.map((constraint) => constraint.sourceText) ?? [];
  return {
    schemaVersion: 2,
    userJob: agentJudgment?.userJob ?? (preservesPrevious ? previous?.contract.userJob : null) ?? prompt.trim(),
    desiredOutcome: agentJudgment?.desiredOutcome ??
      (preservesPrevious ? previous?.contract.desiredOutcome : null) ??
      (requestPolicy.requestClass === 'capability_action'
        ? 'Prepare the requested capability change safely.'
        : 'Answer the request accurately.'),
    constraints: uniqueStrings([...priorConstraints, ...judgmentConstraints]),
    requestClass: requestPolicy.requestClass,
    participatingCapabilities: [...requestPolicy.participatingCapabilities],
    usePrivateContext: requestPolicy.usePrivateContext,
    authorization: agentJudgment?.authorization ??
      (preservesPrevious ? previous?.contract.authorization : null) ??
      (requestPolicy.requestClass === 'capability_action' ? 'explicit_request' : 'none'),
    evidenceScope: agentJudgment?.evidenceScope ??
      (preservesPrevious ? previous?.contract.evidenceScope : null) ??
      (requestPolicy.usePrivateContext ? 'focused' : 'none'),
    responseContract: agentJudgment?.responseContract ??
      (preservesPrevious ? previous?.contract.responseContract : null) ??
      (requestPolicy.usePrivateContext ? 'evidence_linked' : 'direct'),
    action,
    referent: referenceKind && previous
      ? { runId: previous.runId, kind: referenceKind }
      : null,
  };
}

export function parseUnifiedChatTurnContract(value: unknown): UnifiedChatTurnContract | null {
  if (!isRecord(value) || (value.schemaVersion !== 1 && value.schemaVersion !== 2)) return null;
  const userJob = nonEmptyText(value.userJob);
  const desiredOutcome = nonEmptyText(value.desiredOutcome);
  if (!userJob || !desiredOutcome || !Array.isArray(value.constraints) ||
      !value.constraints.every((item) => nonEmptyText(item, 300)) ||
      typeof value.requestClass !== 'string' ||
      !['general', 'general_with_kwilt_context', 'capability_question', 'capability_action', 'native_control', 'better_served_elsewhere']
        .includes(value.requestClass) ||
      !Array.isArray(value.participatingCapabilities) ||
      !value.participatingCapabilities.every(isUnifiedChatCapabilityId) ||
      typeof value.usePrivateContext !== 'boolean') return null;
  const authorization = value.schemaVersion === 2 ? value.authorization :
    value.requestClass === 'capability_action' ? 'explicit_request' : 'none';
  const evidenceScope = value.schemaVersion === 2 ? value.evidenceScope :
    value.usePrivateContext ? 'focused' : 'none';
  const responseContract = value.schemaVersion === 2 ? value.responseContract :
    value.usePrivateContext ? 'evidence_linked' : 'direct';
  if (!['none', 'explicit_request', 'accepted_prior_suggestion'].includes(String(authorization)) ||
      !['none', 'focused', 'broad'].includes(String(evidenceScope)) ||
      !['direct', 'evidence_linked'].includes(String(responseContract))) return null;
  let action: UnifiedChatTurnActionContract | null = null;
  if (value.action !== null) {
    if (!isRecord(value.action) || !Array.isArray(value.action.operationIds) ||
        !value.action.operationIds.every((item) => nonEmptyText(item, 120)) ||
        !['selected_objects', 'all_matching'].includes(String(value.action.targetScope)) ||
        !nonEmptyText(value.action.targetQuery, 1_500)) return null;
    action = {
      operationIds: uniqueStrings(value.action.operationIds as string[]),
      targetScope: value.action.targetScope as UnifiedChatTurnActionContract['targetScope'],
      targetQuery: (value.action.targetQuery as string).trim(),
    };
  }
  const isAction = value.requestClass === 'capability_action';
  if (isAction ? authorization === 'none' || action === null : authorization !== 'none' || action !== null) {
    return null;
  }
  if (value.usePrivateContext !== (evidenceScope !== 'none')) return null;
  if (value.usePrivateContext
    ? responseContract !== 'evidence_linked'
    : responseContract !== 'direct') return null;
  let referent: UnifiedChatTurnContract['referent'] = null;
  if (value.referent !== null) {
    if (!isRecord(value.referent) || !nonEmptyText(value.referent.runId, 120) ||
        (value.referent.kind !== 'correction' && value.referent.kind !== 'retry')) return null;
    referent = { runId: value.referent.runId as string, kind: value.referent.kind };
  }
  return {
    schemaVersion: 2,
    userJob,
    desiredOutcome,
    constraints: uniqueStrings(value.constraints as string[]),
    requestClass: value.requestClass as UnifiedChatRequestClass,
    participatingCapabilities: [...value.participatingCapabilities] as UnifiedChatCapabilityId[],
    usePrivateContext: value.usePrivateContext,
    authorization: authorization as AgentJudgmentAuthorization,
    evidenceScope: evidenceScope as AgentJudgmentEvidenceScope,
    responseContract: responseContract as AgentJudgmentResponseContract,
    action,
    referent,
  };
}

export function resolveLatestTurnContract(
  aggregate: UnifiedChatThreadAggregate,
): ResolvedUnifiedChatTurnContract | null {
  for (const run of [...aggregate.runs].reverse()) {
    const event = [...(aggregate.events ?? [])].reverse().find((candidate) =>
      candidate.runId === run.id && candidate.type === 'scope');
    const contract = parseUnifiedChatTurnContract(event?.payload?.turnContract);
    if (contract) return { runId: run.id, contract };
  }
  return null;
}
