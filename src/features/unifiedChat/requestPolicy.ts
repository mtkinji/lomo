export type UnifiedChatRequestClass =
  | 'general'
  | 'general_with_kwilt_context'
  | 'capability_question'
  | 'capability_action'
  | 'native_control'
  | 'better_served_elsewhere';

export const UNIFIED_CHAT_CAPABILITY_IDS = [
  'arcs', 'goals', 'todos', 'plan', 'chapters', 'profile', 'relationships',
  'screenTime', 'notifications', 'account', 'navigation',
] as const;
export type UnifiedChatCapabilityId = typeof UNIFIED_CHAT_CAPABILITY_IDS[number];

export function isUnifiedChatCapabilityId(value: unknown): value is UnifiedChatCapabilityId {
  return typeof value === 'string' && (UNIFIED_CHAT_CAPABILITY_IDS as readonly string[]).includes(value);
}

export type UnifiedChatContextCandidate = {
  capabilityId: UnifiedChatCapabilityId;
  objectType: string;
  objectId: string;
};

export type UnifiedChatRequestPolicy = {
  requestClass: UnifiedChatRequestClass;
  participatingCapabilities: UnifiedChatCapabilityId[];
  usePrivateContext: boolean;
  clarification: string | null;
  policyReason: string;
};

const HIGH_STAKES_PATTERN =
  /\b(diagnos(?:e|is)|chest pain|medical emergency|suicid|legal advice|attorney|tax filing advice)\b/i;
const NATIVE_CONTROL_PATTERN =
  /\b(screen time|app limit|block games?|block apps?|allow games?|unlock games?|shield apps?)\b/i;
const ACTION_PATTERN =
  /\b(move|reschedule|schedule|mark|complete|create|add|make|remember|update|change|delete|remove|remind me|call me|turn|enable|disable|open|manage)\b/i;
const CONTEXT_REFERENCE_PATTERN =
  /\b(this|that|it|these|those|given|what this week|where i am|current one)\b/i;
const DIRECT_TODO_CAPTURE_PATTERN =
  /^(?:please\s+)?(?:add|create|make|remember|remind me to)\s+\S/i;
const COMPOUND_TODO_CAPTURE_PATTERN =
  /[,;\n]|\b(?:and|then)\s+(?:call|email|text|buy|pick|schedule|book|submit|finish|clean|send|pack|complete|make|create|add|remember|remind)\b/i;
const NON_TODO_DOMAIN_PATTERN =
  /\b(goals?|plans?|chapters?|reflections?|profiles?|screen time|app limits?|money|budget|transaction|payment|transfer)\b/i;
const DAY_PLAN_RECOMMENDATION_PATTERN =
  /(?:\b(?:what|which)\b[^?]*\b(?:should|could)\b[^?]*\b(?:plan|today|tomorrow)\b|\bcould\b[^?]*\b(?:today|tomorrow)\b[^?]*\b(?:use|fit)\b|\b(?:what|which)\b[^?]*\b(?:focus|prioriti[sz]e)\b[^?]*\b(?:today|tomorrow)\b)/i;
const RELATIONSHIP_MEMORY_QUESTION_PATTERN =
  /\b(?:what|which)\b[^?]*\b(?:remember|know|saved?)\b[^?]*\b(?:about|for)\b/i;
const RELATIONSHIP_MEMORY_MUTATION_PATTERN =
  /(?:\b(?:forget|correct)\b[^.!?]*\b(?:about|birthday|anniversary|likes?|prefers?|allerg|sensitive|follow[ -]?up|check[ -]?in)\b|\b(?:actually,?\s*)?[\p{L}][\p{L}'’-]*(?:'s|’s)\s+(?:birthday|anniversary)\s+(?:is|was|falls?|changed)|\b(?:remember\s+(?:that\s+)?)[\p{L}][\p{L}'’-]+\s+(?:likes?|prefers?|is\s+(?:allergic|sensitive)|has\s+a\s+(?:birthday|deadline)|needs?\s+(?:a\s+)?follow[ -]?up))/iu;

function isRelationshipMemoryRequest(prompt: string): boolean {
  return RELATIONSHIP_MEMORY_QUESTION_PATTERN.test(prompt) || RELATIONSHIP_MEMORY_MUTATION_PATTERN.test(prompt);
}

export function directTodoCaptureTitle(prompt: string): string | null {
  if (isRelationshipMemoryRequest(prompt)) return null;
  if (NON_TODO_DOMAIN_PATTERN.test(prompt)) return null;
  const match = /^(?:please\s+)?(?:add|create|make|remember|remind me to)\s+(.+)$/i.exec(prompt.trim());
  if (!match) return null;
  const title = match[1]
    .replace(/^(?:a|an)\s+/i, '')
    .replace(/^(?:to[ -]?do|task)\s+(?:called\s+)?/i, '')
    .replace(/[.!?]+$/, '')
    .trim();
  if (COMPOUND_TODO_CAPTURE_PATTERN.test(title)) return null;
  return title.length > 0 && title.length <= 240 ? title : null;
}

function uniqueCapabilities(
  values: readonly UnifiedChatCapabilityId[],
): UnifiedChatCapabilityId[] {
  return [...new Set(values)];
}

function explicitCapabilities(prompt: string): UnifiedChatCapabilityId[] {
  const capabilities: UnifiedChatCapabilityId[] = [];
  const personal = /\b(my|our|i have|i've|unfinished)\b/i.test(prompt);
  const action = ACTION_PATTERN.test(prompt.replace(/\bnext move\b/gi, ''));
  if ((personal || action) && /\b(arcs?|identit(?:y|ies))\b/i.test(prompt)) capabilities.push('arcs');
  if ((personal || action) && /\bgoals?\b/i.test(prompt)) capabilities.push('goals');
  if (
    /\bmy\s+plans?\b/i.test(prompt) ||
    /\bplans?\s+(?:for\s+)?(?:today|tomorrow)\b/i.test(prompt)
  ) {
    capabilities.push('plan');
  }
  if (
    (personal || action) &&
    /\b(to[ -]?dos?|tasks?|activities|activity|errands?|reminders?)\b/i.test(prompt)
  ) {
    capabilities.push('todos');
  }
  if ((personal || action) && /\b(chapters?|reflections?|what i learned|what i tried)\b/i.test(prompt)) {
    capabilities.push('chapters');
  }
  if (/\b(my\s+)?profile\b|\b(?:call me|my name is|change my name|age range)\b/i.test(prompt)) {
    capabilities.push('profile');
  }
  if (isRelationshipMemoryRequest(prompt)) capabilities.push('relationships');
  if (/\bremind me\b/i.test(prompt) && !capabilities.includes('todos')) {
    capabilities.push('todos');
  }
  if (/\bnotifications?|notification settings|reminder settings\b/i.test(prompt)) capabilities.push('notifications');
  if (/\b(account settings|subscription|billing|delete my account|close my account)\b/i.test(prompt)) {
    capabilities.push('account');
  }
  if (/\b(search (?:kwilt|the app)|open search)\b/i.test(prompt)) capabilities.push('navigation');
  if (
    capabilities.length === 0 &&
    DIRECT_TODO_CAPTURE_PATTERN.test(prompt) &&
    directTodoCaptureTitle(prompt) &&
    !NON_TODO_DOMAIN_PATTERN.test(prompt)
  ) {
    capabilities.push('todos');
  }
  return capabilities;
}

export function classifyUnifiedChatRequest({
  prompt,
  context = [],
}: {
  prompt: string;
  context?: readonly UnifiedChatContextCandidate[];
}): UnifiedChatRequestPolicy {
  const normalizedPrompt = prompt.trim();

  if (HIGH_STAKES_PATTERN.test(normalizedPrompt)) {
    return {
      requestClass: 'better_served_elsewhere',
      participatingCapabilities: [],
      usePrivateContext: false,
      clarification: null,
      policyReason: 'specialist-or-high-stakes-boundary',
    };
  }

  if (NATIVE_CONTROL_PATTERN.test(normalizedPrompt)) {
    return {
      requestClass: 'native_control',
      participatingCapabilities: ['screenTime'],
      usePrivateContext: false,
      clarification: null,
      policyReason: 'native-capability-authorization-required',
    };
  }

  const capabilities = explicitCapabilities(normalizedPrompt);
  if (capabilities.includes('relationships')) {
    const questionOnly = RELATIONSHIP_MEMORY_QUESTION_PATTERN.test(normalizedPrompt) &&
      !RELATIONSHIP_MEMORY_MUTATION_PATTERN.test(normalizedPrompt);
    return {
      requestClass: questionOnly ? 'capability_question' : 'capability_action',
      participatingCapabilities: ['relationships'],
      usePrivateContext: true,
      clarification: null,
      policyReason: questionOnly
        ? 'bounded-relationship-memory-request'
        : 'explicit-relationship-memory-mutation',
    };
  }
  if (DAY_PLAN_RECOMMENDATION_PATTERN.test(normalizedPrompt)) {
    return {
      requestClass: 'capability_question',
      participatingCapabilities: ['plan'],
      usePrivateContext: true,
      clarification: null,
      policyReason: 'day-plan-recommendation',
    };
  }
  const actionCandidate = normalizedPrompt.replace(/\bnext move\b/gi, '');
  const isAction = ACTION_PATTERN.test(actionCandidate);
  if (isAction) {
    const explicitlyNeedsExistingData = /\b(my|our|i have|i've|unfinished)\b/i.test(normalizedPrompt);
    return {
      requestClass: 'capability_action',
      participatingCapabilities: capabilities,
      usePrivateContext: capabilities.length > 0 &&
        (explicitlyNeedsExistingData || capabilities.includes('profile')),
      clarification:
        capabilities.length === 0 ? 'What would you like Kwilt to change?' : null,
      policyReason:
        capabilities.length > 0
          ? 'typed-capability-proposal-required'
          : 'action-owner-needs-clarification',
    };
  }

  if (capabilities.length > 0) {
    return {
      requestClass: 'capability_question',
      participatingCapabilities: capabilities,
      usePrivateContext: true,
      clarification: null,
      policyReason: 'bounded-capability-evidence-request',
    };
  }

  if (context.length > 0 && CONTEXT_REFERENCE_PATTERN.test(normalizedPrompt)) {
    return {
      requestClass: 'general_with_kwilt_context',
      participatingCapabilities: uniqueCapabilities(
        context.map((candidate) => candidate.capabilityId),
      ),
      usePrivateContext: true,
      clarification: null,
      policyReason: 'explicit-reference-to-visible-context',
    };
  }

  return {
    requestClass: 'general',
    participatingCapabilities: [],
    usePrivateContext: false,
    clarification: null,
    policyReason: 'general-answer-without-private-context',
  };
}
