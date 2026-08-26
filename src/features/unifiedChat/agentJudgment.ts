import type {
  AgentJudgment,
  AgentJudgmentAuthorization,
  AgentJudgmentConstraint,
  AgentJudgmentEvidenceScope,
  AgentJudgmentExecutionMode,
  AgentJudgmentResponseContract,
  AgentJudgmentStep,
} from '@kwilt/agent-runtime';
import {
  UNIFIED_CHAT_CAPABILITY_IDS,
  isUnifiedChatCapabilityId,
  type UnifiedChatCapabilityId,
  type UnifiedChatRequestClass,
} from './requestPolicy';

export type {
  AgentJudgment,
  AgentJudgmentAuthorization,
  AgentJudgmentConstraint,
  AgentJudgmentEvidenceScope,
  AgentJudgmentExecutionMode,
  AgentJudgmentResponseContract,
  AgentJudgmentStep,
} from '@kwilt/agent-runtime';

const REQUEST_CLASSES: readonly UnifiedChatRequestClass[] = [
  'general',
  'general_with_kwilt_context',
  'capability_question',
  'capability_action',
  'native_control',
  'better_served_elsewhere',
];
const EXECUTION_MODES: readonly AgentJudgmentExecutionMode[] = [
  'direct_answer',
  'single_tool',
  'multi_tool',
  'clarify',
  'boundary',
];
const AUTHORIZATIONS: readonly AgentJudgmentAuthorization[] = [
  'none', 'explicit_request', 'accepted_prior_suggestion',
];
const EVIDENCE_SCOPES: readonly AgentJudgmentEvidenceScope[] = ['none', 'focused', 'broad'];
const RESPONSE_CONTRACTS: readonly AgentJudgmentResponseContract[] = ['direct', 'evidence_linked'];
const CONSTRAINT_KINDS: readonly AgentJudgmentConstraint['kind'][] = [
  'title',
  'date',
  'time',
  'timezone',
  'recurrence',
  'person',
  'amount',
  'other',
];
const ARTIFACT_KEYS = [
  'schemaVersion',
  'userJob',
  'desiredOutcome',
  'requestClass',
  'participatingCapabilities',
  'usePrivateContext',
  'informationNeed',
  'authorization',
  'evidenceScope',
  'responseContract',
  'executionMode',
  'constraints',
  'steps',
  'clarificationQuestion',
  'confidence',
  'reason',
] as const;
const CONSTRAINT_KEYS = ['kind', 'sourceText', 'normalizedValue'] as const;
const STEP_KEYS = ['sequence', 'objective', 'toolId', 'dependsOn'] as const;

const AGENT_JUDGMENT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [...ARTIFACT_KEYS],
  properties: {
    schemaVersion: { type: 'integer', enum: [1] },
    userJob: { type: 'string', minLength: 1, maxLength: 500 },
    desiredOutcome: { type: 'string', minLength: 1, maxLength: 500 },
    requestClass: { type: 'string', enum: [...REQUEST_CLASSES] },
    participatingCapabilities: {
      type: 'array',
      items: { type: 'string', enum: [...UNIFIED_CHAT_CAPABILITY_IDS] },
      maxItems: UNIFIED_CHAT_CAPABILITY_IDS.length,
    },
    usePrivateContext: { type: 'boolean' },
    informationNeed: { type: 'string', enum: ['stable', 'current'] },
    authorization: { type: 'string', enum: [...AUTHORIZATIONS] },
    evidenceScope: { type: 'string', enum: [...EVIDENCE_SCOPES] },
    responseContract: { type: 'string', enum: [...RESPONSE_CONTRACTS] },
    executionMode: { type: 'string', enum: [...EXECUTION_MODES] },
    constraints: {
      type: 'array',
      maxItems: 16,
      items: {
        type: 'object',
        additionalProperties: false,
        required: [...CONSTRAINT_KEYS],
        properties: {
          kind: { type: 'string', enum: [...CONSTRAINT_KINDS] },
          sourceText: { type: 'string', minLength: 1, maxLength: 300 },
          normalizedValue: { type: 'string', minLength: 1, maxLength: 300 },
        },
      },
    },
    steps: {
      type: 'array',
      maxItems: 8,
      items: {
        type: 'object',
        additionalProperties: false,
        required: [...STEP_KEYS],
        properties: {
          sequence: { type: 'integer', minimum: 1, maximum: 8 },
          objective: { type: 'string', minLength: 1, maxLength: 300 },
          toolId: { type: ['string', 'null'], maxLength: 120 },
          dependsOn: { type: ['integer', 'null'], minimum: 1, maximum: 8 },
        },
      },
    },
    clarificationQuestion: { type: ['string', 'null'], maxLength: 500 },
    confidence: { type: 'number', minimum: 0, maximum: 1 },
    reason: { type: 'string', minLength: 1, maxLength: 240 },
  },
} as const;

export const AGENT_JUDGMENT_RESPONSE_FORMAT = {
  type: 'json_schema',
  name: 'kwilt_agent_judgment',
  strict: true,
  schema: AGENT_JUDGMENT_SCHEMA,
} as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasExactKeys(record: Record<string, unknown>, expected: readonly string[]): boolean {
  const keys = Object.keys(record);
  return keys.length === expected.length && keys.every((key) => expected.includes(key));
}

function boundedText(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed.length <= maxLength ? trimmed : null;
}

function nullableBoundedText(value: unknown, maxLength: number): string | null | undefined {
  if (value === null) return null;
  return boundedText(value, maxLength) ?? undefined;
}

function decodeArtifact(raw: unknown): Record<string, unknown> | null {
  if (isRecord(raw)) return raw;
  if (typeof raw !== 'string') return null;
  try {
    const decoded: unknown = JSON.parse(raw);
    return isRecord(decoded) ? decoded : null;
  } catch {
    return null;
  }
}

export function parseAgentJudgment(
  raw: unknown,
  allowedToolIds: ReadonlySet<string>,
): AgentJudgment | null {
  const parsed = decodeArtifact(raw);
  if (!parsed || !hasExactKeys(parsed, ARTIFACT_KEYS)) return null;
  if (parsed.schemaVersion !== 1) return null;

  const userJob = boundedText(parsed.userJob, 500);
  const desiredOutcome = boundedText(parsed.desiredOutcome, 500);
  const reason = boundedText(parsed.reason, 240);
  if (!userJob || !desiredOutcome || !reason) return null;
  if (!REQUEST_CLASSES.includes(parsed.requestClass as UnifiedChatRequestClass)) return null;
  if (!Array.isArray(parsed.participatingCapabilities)) return null;
  if (!parsed.participatingCapabilities.every(isUnifiedChatCapabilityId)) return null;
  if (new Set(parsed.participatingCapabilities).size !== parsed.participatingCapabilities.length) return null;
  if (parsed.participatingCapabilities.length > UNIFIED_CHAT_CAPABILITY_IDS.length) return null;
  if (typeof parsed.usePrivateContext !== 'boolean') return null;
  if (parsed.informationNeed !== 'stable' && parsed.informationNeed !== 'current') return null;
  if (!AUTHORIZATIONS.includes(parsed.authorization as AgentJudgmentAuthorization)) return null;
  if (!EVIDENCE_SCOPES.includes(parsed.evidenceScope as AgentJudgmentEvidenceScope)) return null;
  if (!RESPONSE_CONTRACTS.includes(parsed.responseContract as AgentJudgmentResponseContract)) return null;
  if (!EXECUTION_MODES.includes(parsed.executionMode as AgentJudgmentExecutionMode)) return null;
  if (typeof parsed.confidence !== 'number' || !Number.isFinite(parsed.confidence)) return null;
  if (parsed.confidence < 0 || parsed.confidence > 1) return null;

  if (!Array.isArray(parsed.constraints) || parsed.constraints.length > 16) return null;
  const constraints: AgentJudgmentConstraint[] = [];
  for (const candidate of parsed.constraints) {
    if (!isRecord(candidate) || !hasExactKeys(candidate, CONSTRAINT_KEYS)) return null;
    if (!CONSTRAINT_KINDS.includes(candidate.kind as AgentJudgmentConstraint['kind'])) return null;
    const sourceText = boundedText(candidate.sourceText, 300);
    const normalizedValue = boundedText(candidate.normalizedValue, 300);
    if (!sourceText || !normalizedValue) return null;
    constraints.push({
      kind: candidate.kind as AgentJudgmentConstraint['kind'],
      sourceText,
      normalizedValue,
    });
  }

  if (!Array.isArray(parsed.steps) || parsed.steps.length > 8) return null;
  const steps: AgentJudgmentStep[] = [];
  const sequences = new Set<number>();
  for (const candidate of parsed.steps) {
    if (!isRecord(candidate) || !hasExactKeys(candidate, STEP_KEYS)) return null;
    if (!Number.isInteger(candidate.sequence) || (candidate.sequence as number) < 1 || (candidate.sequence as number) > 8) return null;
    const sequence = candidate.sequence as number;
    if (sequences.has(sequence)) return null;
    const objective = boundedText(candidate.objective, 300);
    if (!objective) return null;
    if (candidate.toolId !== null && (typeof candidate.toolId !== 'string' || !allowedToolIds.has(candidate.toolId))) return null;
    if (candidate.dependsOn !== null && (!Number.isInteger(candidate.dependsOn) || (candidate.dependsOn as number) >= sequence || !sequences.has(candidate.dependsOn as number))) return null;
    sequences.add(sequence);
    steps.push({
      sequence,
      objective,
      toolId: candidate.toolId as string | null,
      dependsOn: candidate.dependsOn as number | null,
    });
  }
  if (steps.some((step, index) => step.sequence !== index + 1)) return null;

  const clarificationQuestion = nullableBoundedText(parsed.clarificationQuestion, 500);
  if (clarificationQuestion === undefined) return null;
  const executionMode = parsed.executionMode as AgentJudgmentExecutionMode;
  if (executionMode === 'single_tool' && (steps.length !== 1 || steps[0].toolId === null)) return null;
  if (executionMode === 'multi_tool' && (steps.length < 2 || steps.some((step) => step.toolId === null))) return null;
  if (executionMode === 'direct_answer' && (steps.length > 0 || parsed.usePrivateContext || parsed.participatingCapabilities.length > 0)) return null;
  if (executionMode === 'clarify' && (!clarificationQuestion || steps.length > 0)) return null;
  if (executionMode === 'boundary' && steps.length > 0) return null;
  if (executionMode !== 'clarify' && clarificationQuestion !== null) return null;
  if (parsed.usePrivateContext && parsed.participatingCapabilities.length === 0) return null;
  const authorization = parsed.authorization as AgentJudgmentAuthorization;
  const evidenceScope = parsed.evidenceScope as AgentJudgmentEvidenceScope;
  const responseContract = parsed.responseContract as AgentJudgmentResponseContract;
  if (parsed.requestClass === 'capability_action' && authorization === 'none') return null;
  if (parsed.requestClass !== 'capability_action' && authorization !== 'none') return null;
  if (parsed.usePrivateContext && evidenceScope === 'none') return null;
  if (!parsed.usePrivateContext && evidenceScope !== 'none') return null;
  if (executionMode === 'direct_answer' && responseContract !== 'direct') return null;
  if (parsed.usePrivateContext && responseContract !== 'evidence_linked') return null;

  return {
    schemaVersion: 1,
    userJob,
    desiredOutcome,
    requestClass: parsed.requestClass as UnifiedChatRequestClass,
    participatingCapabilities: parsed.participatingCapabilities as UnifiedChatCapabilityId[],
    usePrivateContext: parsed.usePrivateContext,
    informationNeed: parsed.informationNeed,
    authorization,
    evidenceScope,
    responseContract,
    executionMode,
    constraints,
    steps,
    clarificationQuestion,
    confidence: parsed.confidence,
    reason,
  };
}
