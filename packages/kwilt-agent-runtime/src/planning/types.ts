import type { AgentToolDefinition, AgentToolProvider } from '../types.ts';

export type PortableUnifiedChatRequestClass =
  | 'general'
  | 'general_with_kwilt_context'
  | 'capability_question'
  | 'capability_action'
  | 'native_control'
  | 'better_served_elsewhere';

export type PortableUnifiedChatCapabilityId =
  | 'arcs' | 'goals' | 'todos' | 'plan' | 'chapters' | 'profile' | 'relationships'
  | 'household' | 'money' | 'screenTime' | 'notifications' | 'account' | 'navigation' | 'recipes'
  | 'meal_planning' | 'chores' | 'groceries' | 'savings';

export type AgentJudgmentExecutionMode =
  | 'direct_answer' | 'single_tool' | 'multi_tool' | 'clarify' | 'boundary';
export type AgentJudgmentAuthorization = 'none' | 'explicit_request' | 'accepted_prior_suggestion';
export type AgentJudgmentEvidenceScope = 'none' | 'focused' | 'broad';
export type AgentJudgmentResponseContract = 'direct' | 'evidence_linked';
export type AgentJudgmentConstraint = {
  kind: 'title' | 'date' | 'time' | 'timezone' | 'recurrence' | 'person' | 'amount' | 'other';
  sourceText: string;
  normalizedValue: string;
};
export type AgentJudgmentStep = {
  sequence: number;
  objective: string;
  toolId: string | null;
  dependsOn: number | null;
};
export type AgentJudgment = {
  schemaVersion: 1;
  userJob: string;
  desiredOutcome: string;
  requestClass: PortableUnifiedChatRequestClass;
  participatingCapabilities: PortableUnifiedChatCapabilityId[];
  usePrivateContext: boolean;
  informationNeed: 'stable' | 'current';
  authorization: AgentJudgmentAuthorization;
  evidenceScope: AgentJudgmentEvidenceScope;
  responseContract: AgentJudgmentResponseContract;
  executionMode: AgentJudgmentExecutionMode;
  constraints: AgentJudgmentConstraint[];
  steps: AgentJudgmentStep[];
  clarificationQuestion: string | null;
  confidence: number;
  reason: string;
};

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
  requestClass: PortableUnifiedChatRequestClass;
  participatingCapabilities: PortableUnifiedChatCapabilityId[];
  usePrivateContext: boolean;
  authorization: AgentJudgmentAuthorization;
  evidenceScope: AgentJudgmentEvidenceScope;
  responseContract: AgentJudgmentResponseContract;
  action: UnifiedChatTurnActionContract | null;
  referent: { runId: string; kind: UnifiedChatTurnReferenceKind } | null;
};
export type ResolvedUnifiedChatTurnContract = { runId: string; contract: UnifiedChatTurnContract };

export type TurnAuthorization =
  | { kind: 'none'; reason: string }
  | { kind: 'read' }
  | { kind: 'write'; explicit: boolean; confirmation: 'none' | 'review' | 'native' };

export type ResolvedTurnPolicy = {
  authorization: TurnAuthorization;
  allowedEffects: readonly ('read' | 'write')[];
  allowedToolIds: readonly string[];
  unresolvedReferences: readonly string[];
};

export type TurnActorPermissions = {
  canRead: boolean;
  canWrite: boolean;
  allowedToolIds: readonly string[];
};

export type ResolveTurnPolicyInput = {
  prompt: string;
  tools: readonly AgentToolDefinition[];
  advisoryToolIds: readonly string[];
  unresolvedReferences: readonly string[];
  actorPermissions: TurnActorPermissions;
  executionProvider: AgentToolProvider;
  acceptedPriorSuggestion: boolean;
};
