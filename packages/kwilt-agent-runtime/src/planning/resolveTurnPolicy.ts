import type { AgentToolDefinition } from '../types.ts';
import type {
  ResolvedTurnPolicy,
  ResolveTurnPolicyInput,
  TurnAuthorization,
} from './types.ts';

const EXPLICIT_WRITE_PATTERN =
  /\b(?:add|allow|archive|block|cancel|change|complete|configure|correct|create|delete|disable|enable|forget|make|mark|move|open|put|remember|remind|remove|rename|reschedule|save|schedule|set(?:\s+up)?|share|split|start|stop|turn\s+(?:on|off)|update)\b/i;
const READ_REQUEST_PATTERN =
  /^(?:can|could|do|does|how|list|read|review|show|tell|what|when|where|which|who|why)\b|\b(?:show me|tell me|what(?:'s| is)|list my|read my|current|status)\b/i;
const AFFIRMATIVE_PATTERN = /^(?:yes\b|yep\b|yeah\b|sure\b|okay\b|ok\b|do\s+(?:it|that)\b|go\s+ahead\b)/i;

function uniqueNonEmpty(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function none(reason: string, unresolvedReferences: readonly string[]): ResolvedTurnPolicy {
  return { authorization: { kind: 'none', reason }, allowedEffects: [], allowedToolIds: [], unresolvedReferences };
}

function isAvailableAtExecutionProvider(
  tool: AgentToolDefinition,
  provider: ResolveTurnPolicyInput['executionProvider'],
): boolean {
  if (tool.providers.includes(provider)) return true;
  return provider === 'server' && tool.canDeferToClient && tool.providers.includes('device');
}

function confirmationFor(
  tools: readonly AgentToolDefinition[],
  executionProvider: ResolveTurnPolicyInput['executionProvider'],
): Extract<TurnAuthorization, { kind: 'write' }>['confirmation'] {
  if (tools.some((tool) => !tool.providers.includes(executionProvider)
    && tool.canDeferToClient && tool.providers.includes('device'))) return 'native';
  if (tools.some((tool) => tool.confirmation === 'explicit' || tool.consequence === 'consequential')) {
    return 'review';
  }
  return 'none';
}

/** Resolve deterministic authority after model judgment but before any tool execution. */
export function resolveTurnPolicy(input: ResolveTurnPolicyInput): ResolvedTurnPolicy {
  const unresolvedReferences = uniqueNonEmpty(input.unresolvedReferences);
  if (unresolvedReferences.length > 0) return none('unresolved_reference', unresolvedReferences);

  const toolsById = new Map(input.tools.map((tool) => [tool.id, tool]));
  const actorAllowed = new Set(input.actorPermissions.allowedToolIds);
  const candidates = uniqueNonEmpty(input.advisoryToolIds)
    .flatMap((toolId) => {
      const tool = toolsById.get(toolId);
      return tool && actorAllowed.has(toolId) && isAvailableAtExecutionProvider(tool, input.executionProvider)
        ? [tool]
        : [];
    });
  if (candidates.length === 0) return none('no_available_tools', unresolvedReferences);

  const readTools = candidates.filter((tool) => tool.effect === 'read');
  const writeTools = candidates.filter((tool) => tool.effect === 'write');
  const prompt = input.prompt.trim();
  const acceptedPriorSuggestion = input.acceptedPriorSuggestion && AFFIRMATIVE_PATTERN.test(prompt);
  const explicitRelationshipFact = writeTools.some((tool) => tool.id === 'relationships.remember') &&
    /\b(?:birthday\s+is|anniversary\s+is|likes?|loves?|prefers?|is allergic to)\b/i.test(prompt);
  const explicitRelationshipCorrection = writeTools.some((tool) => tool.id === 'relationships.correct') &&
    /^(?:actually|correction\b|update\b)/i.test(prompt);
  const explicitWrite = EXPLICIT_WRITE_PATTERN.test(prompt) || acceptedPriorSuggestion ||
    explicitRelationshipFact || explicitRelationshipCorrection;
  const readOnlyLanguage = READ_REQUEST_PATTERN.test(prompt) && !explicitWrite;

  if (writeTools.length === 0 || readOnlyLanguage) {
    if (!input.actorPermissions.canRead) return none('actor_read_forbidden', unresolvedReferences);
    if (readTools.length === 0) return none('no_read_tools', unresolvedReferences);
    return {
      authorization: { kind: 'read' },
      allowedEffects: ['read'],
      allowedToolIds: readTools.map((tool) => tool.id),
      unresolvedReferences,
    };
  }

  if (!explicitWrite) return none('write_not_explicit', unresolvedReferences);
  if (!input.actorPermissions.canWrite) return none('actor_write_forbidden', unresolvedReferences);
  const allowedTools = candidates.filter((tool) => tool.effect === 'write'
    || (tool.effect === 'read' && input.actorPermissions.canRead));
  return {
    authorization: {
      kind: 'write',
      explicit: true,
      confirmation: confirmationFor(writeTools, input.executionProvider),
    },
    allowedEffects: input.actorPermissions.canRead ? ['read', 'write'] : ['write'],
    allowedToolIds: allowedTools.map((tool) => tool.id),
    unresolvedReferences,
  };
}
