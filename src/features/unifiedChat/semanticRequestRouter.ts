import type { CoachChatTurn } from '../../services/ai';
import type {
  UnifiedChatCapabilityId,
  UnifiedChatContextCandidate,
  UnifiedChatRequestClass,
} from './requestPolicy';
import { UNIFIED_CHAT_CAPABILITY_IDS } from './requestPolicy';

const REQUEST_CLASSES: readonly UnifiedChatRequestClass[] = [
  'general',
  'general_with_kwilt_context',
  'capability_question',
  'capability_action',
  'native_control',
  'better_served_elsewhere',
];
const CAPABILITY_IDS: readonly UnifiedChatCapabilityId[] = UNIFIED_CHAT_CAPABILITY_IDS;
const ROUTE_KEYS = [
  'requestClass',
  'participatingCapabilities',
  'usePrivateContext',
  'confidence',
  'reason',
] as const;

export type SemanticRequestRoute = {
  requestClass: UnifiedChatRequestClass;
  participatingCapabilities: UnifiedChatCapabilityId[];
  usePrivateContext: boolean;
  confidence: number;
  reason: string;
};

export type SemanticRouterVisibleContext = UnifiedChatContextCandidate & {
  label: string;
};

export type SemanticRouterCapabilityDescription = {
  capabilityId: UnifiedChatCapabilityId;
  description: string;
};

export const SEMANTIC_REQUEST_ROUTE_RESPONSE_FORMAT = {
  type: 'json_schema' as const,
  json_schema: {
    name: 'kwilt_semantic_request_route',
    strict: true,
    schema: {
      type: 'object',
      additionalProperties: false,
      required: [...ROUTE_KEYS],
      properties: {
        requestClass: { type: 'string', enum: [...REQUEST_CLASSES] },
        participatingCapabilities: {
          type: 'array',
          items: { type: 'string', enum: [...CAPABILITY_IDS] },
          maxItems: CAPABILITY_IDS.length,
        },
        usePrivateContext: { type: 'boolean' },
        confidence: { type: 'number', minimum: 0, maximum: 1 },
        reason: { type: 'string', minLength: 1, maxLength: 180 },
      },
    },
  },
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function parseSemanticRequestRoute(raw: string): SemanticRequestRoute | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return null;
    const keys = Object.keys(parsed);
    if (keys.length !== ROUTE_KEYS.length || keys.some((key) => !ROUTE_KEYS.includes(key as typeof ROUTE_KEYS[number]))) {
      return null;
    }
    if (!REQUEST_CLASSES.includes(parsed.requestClass as UnifiedChatRequestClass)) return null;
    if (!Array.isArray(parsed.participatingCapabilities)) return null;
    if (parsed.participatingCapabilities.some((item) => !CAPABILITY_IDS.includes(item))) return null;
    if (new Set(parsed.participatingCapabilities).size !== parsed.participatingCapabilities.length) return null;
    if (typeof parsed.usePrivateContext !== 'boolean') return null;
    if (
      typeof parsed.confidence !== 'number' ||
      !Number.isFinite(parsed.confidence) ||
      parsed.confidence < 0 ||
      parsed.confidence > 1
    ) return null;
    if (typeof parsed.reason !== 'string' || parsed.reason.trim().length === 0 || parsed.reason.length > 180) {
      return null;
    }

    const requestClass = parsed.requestClass as UnifiedChatRequestClass;
    const participatingCapabilities = parsed.participatingCapabilities as UnifiedChatCapabilityId[];
    if (parsed.usePrivateContext && participatingCapabilities.length === 0) return null;
    if (requestClass === 'general' && (parsed.usePrivateContext || participatingCapabilities.length > 0)) return null;
    if (requestClass === 'better_served_elsewhere' && parsed.usePrivateContext) return null;

    return {
      requestClass,
      participatingCapabilities,
      usePrivateContext: parsed.usePrivateContext,
      confidence: parsed.confidence,
      reason: parsed.reason.trim(),
    };
  } catch {
    return null;
  }
}

function compactText(value: string, limit: number): string {
  return value.replace(/\s+/g, ' ').trim().slice(0, limit);
}

export function buildSemanticRequestRouterPrompt({
  prompt,
  visibleContext,
  recentTurns,
  capabilityDescriptions,
}: {
  prompt: string;
  visibleContext: readonly SemanticRouterVisibleContext[];
  recentTurns: readonly CoachChatTurn[];
  capabilityDescriptions: readonly SemanticRouterCapabilityDescription[];
}): string {
  const capabilities = capabilityDescriptions
    .slice(0, CAPABILITY_IDS.length)
    .map((item) => `- ${item.capabilityId}: ${compactText(item.description, 280)}`)
    .join('\n');
  const context = visibleContext
    .slice(0, 8)
    .map((item) => `- ${item.capabilityId}/${compactText(item.objectType, 60)}: ${compactText(item.label, 160)}`)
    .join('\n') || '- none';
  const dialogue = recentTurns
    .slice(-6)
    .map((turn) => `${turn.role}: ${compactText(turn.content, 500)}`)
    .join('\n') || '- none';

  return [
    'Route this request for Kwilt. Do not answer the user and do not perform an action.',
    'Choose only listed request classes and capabilities. Private context is allowed only when one or more listed capabilities must read the user\'s Kwilt records. A requested action can be routed even when its executor is not live. Keep reason to one concise sentence; do not reveal chain-of-thought.',
    `Current request:\n${compactText(prompt, 1200)}`,
    `Available capability semantics:\n${capabilities}`,
    `Visible in-app context (labels only; ids intentionally omitted):\n${context}`,
    `Recent dialogue (bounded):\n${dialogue}`,
  ].join('\n\n').slice(0, 6800);
}
