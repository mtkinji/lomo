import { resolveTurnPolicy } from '../../../packages/kwilt-agent-runtime/src/planning/resolveTurnPolicy.ts';
import type {
  ResolvedTurnPolicy,
  TurnActorPermissions,
} from '../../../packages/kwilt-agent-runtime/src/planning/types.ts';
import {
  KWILT_TOOL_NAMESPACES,
  isKwiltToolNamespaceId,
  namespaceForTool,
  type KwiltToolNamespaceId,
} from '../../../packages/kwilt-agent-runtime/src/toolNamespaces.ts';
import type { AgentToolProvider } from '../../../packages/kwilt-agent-runtime/src/types.ts';
import type { ServerAgentToolDefinition } from './agentRuntime.ts';

export type ServerTurnJudgment = {
  selectedNamespaces: KwiltToolNamespaceId[];
  confidence: number;
  reason: string;
};

export type NamespacedServerAgentTool = ServerAgentToolDefinition & {
  namespace: KwiltToolNamespaceId;
};

export type ServerTurnPlan = {
  judgment: ServerTurnJudgment;
  policy: ResolvedTurnPolicy;
  selectedNamespaces: KwiltToolNamespaceId[];
  visibleTools: NamespacedServerAgentTool[];
  deferredToolIds: string[];
  toolSearchNamespaces: KwiltToolNamespaceId[];
};

const MAX_SELECTED_NAMESPACES = 3;
const MAX_VISIBLE_TOOLS_PER_NAMESPACE = 10;

function uniqueNamespaces(values: readonly unknown[]): KwiltToolNamespaceId[] {
  return [...new Set(values.filter(isKwiltToolNamespaceId))].slice(0, MAX_SELECTED_NAMESPACES);
}

function fallbackNamespaces(prompt: string): KwiltToolNamespaceId[] {
  const normalized = prompt.toLowerCase();
  const keywordMatches: Array<[KwiltToolNamespaceId, RegExp]> = [
    ['life_structure', /\b(?:arc|birthday|chapter|correct|forget|goal|profile|relationship|remember)\b/],
    ['tasks_plan', /\b(?:activity|block|calendar|check off|focus|plan|remind|reminder|schedule|step|task|todo|tomorrow)\b/],
    ['household', /\b(?:child|chore|family|game|household|member)\b/],
    ['money', /\b(?:account balance|budget|money|spending|transaction)\b/],
    ['food', /\b(?:cook|food|grocer|meal|recipe)\b/],
    ['device_wellbeing', /\b(?:device|notification|screen\s*time)\b/],
    ['account_navigation', /\b(?:account|navigation|search|settings|subscription)\b/],
  ];
  const explicitMatches = keywordMatches.filter(([, pattern]) => pattern.test(normalized)).map(([id]) => id);
  if (explicitMatches.length > 0) return uniqueNamespaces(explicitMatches);
  const scored = KWILT_TOOL_NAMESPACES.map((namespace, index) => {
    const terms = [namespace.id, ...namespace.capabilityIds]
      .flatMap((term) => term.toLowerCase().split(/[_\s]+/))
      .filter((term) => term.length > 2);
    const score = terms.reduce((total, term) => total + (normalized.includes(term) ? 1 : 0), 0);
    return { id: namespace.id, score, index };
  }).filter(({ score }) => score > 0)
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .map(({ id }) => id);
  return scored.length > 0 ? scored.slice(0, MAX_SELECTED_NAMESPACES) : ['life_structure'];
}

function normalizeJudgment(raw: ServerTurnJudgment | null, prompt: string): ServerTurnJudgment {
  const selectedNamespaces = uniqueNamespaces(raw?.selectedNamespaces ?? []);
  const confidence = typeof raw?.confidence === 'number' && Number.isFinite(raw.confidence)
    ? Math.max(0, Math.min(1, raw.confidence))
    : 0;
  const reason = typeof raw?.reason === 'string' && raw.reason.trim()
    ? raw.reason.trim().slice(0, 240)
    : 'Deterministic namespace fallback.';
  return {
    selectedNamespaces: selectedNamespaces.length > 0 ? selectedNamespaces : fallbackNamespaces(prompt),
    confidence,
    reason,
  };
}

function relevanceScore(prompt: string, tool: ServerAgentToolDefinition): number {
  const normalized = prompt.toLowerCase();
  return `${tool.id} ${tool.capabilityId} ${tool.purpose}`.toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((term) => term.length > 2)
    .reduce((score, term) => score + (normalized.includes(term) ? 1 : 0), 0);
}

export async function planServerTurn({
  prompt,
  tools,
  actorPermissions,
  executionProvider,
  requestJudgment,
  unresolvedReferences = [],
  acceptedPriorSuggestion = false,
}: {
  prompt: string;
  tools: readonly ServerAgentToolDefinition[];
  actorPermissions: TurnActorPermissions;
  executionProvider: AgentToolProvider;
  requestJudgment?: (input: {
    prompt: string;
    namespaces: typeof KWILT_TOOL_NAMESPACES;
  }) => Promise<ServerTurnJudgment | null>;
  unresolvedReferences?: readonly string[];
  acceptedPriorSuggestion?: boolean;
}): Promise<ServerTurnPlan> {
  let rawJudgment: ServerTurnJudgment | null = null;
  if (requestJudgment) {
    try {
      rawJudgment = await requestJudgment({ prompt, namespaces: KWILT_TOOL_NAMESPACES });
    } catch {
      rawJudgment = null;
    }
  }
  const judgment = normalizeJudgment(rawJudgment, prompt);
  const selectedNamespaces = judgment.selectedNamespaces;
  const selectedNamespaceSet = new Set<KwiltToolNamespaceId>(selectedNamespaces);
  const actorAllowed = new Set(actorPermissions.allowedToolIds);
  const registeredCandidates = tools.filter((tool) =>
    actorAllowed.has(tool.id) && selectedNamespaceSet.has(namespaceForTool(tool)));
  const policy = resolveTurnPolicy({
    prompt,
    tools,
    advisoryToolIds: registeredCandidates.map((tool) => tool.id),
    unresolvedReferences,
    actorPermissions,
    executionProvider,
    acceptedPriorSuggestion,
  });
  const policyAllowed = new Set(policy.allowedToolIds);
  const eligible = registeredCandidates.filter((tool) => policyAllowed.has(tool.id));
  const visibleTools = selectedNamespaces.flatMap((namespace) => eligible
    .filter((tool) => namespaceForTool(tool) === namespace)
    .sort((left, right) => relevanceScore(prompt, right) - relevanceScore(prompt, left)
      || left.id.localeCompare(right.id))
    .slice(0, MAX_VISIBLE_TOOLS_PER_NAMESPACE)
    .map((tool) => ({ ...tool, namespace })));
  if (visibleTools.length > 0 && visibleTools.length === tools.length) visibleTools.pop();
  const visibleIds = new Set(visibleTools.map((tool) => tool.id));
  const deferredToolIds = eligible.filter((tool) => !visibleIds.has(tool.id)).map((tool) => tool.id);
  const deferredSet = new Set(deferredToolIds);
  const toolSearchNamespaces = selectedNamespaces.filter((namespace) =>
    eligible.some((tool) => namespaceForTool(tool) === namespace && deferredSet.has(tool.id)));
  return {
    judgment,
    policy,
    selectedNamespaces,
    visibleTools,
    deferredToolIds,
    toolSearchNamespaces,
  };
}
