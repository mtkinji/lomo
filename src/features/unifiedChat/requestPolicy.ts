export type UnifiedChatRequestClass =
  | 'general'
  | 'general_with_kwilt_context'
  | 'capability_question'
  | 'capability_action'
  | 'native_control'
  | 'better_served_elsewhere';

export type UnifiedChatCapabilityId = 'goals' | 'todos' | 'chapters' | 'screenTime';

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
  /\b(move|reschedule|schedule|mark|complete|create|add|make|remember|update|change|delete|remove|remind me)\b/i;
const CONTEXT_REFERENCE_PATTERN =
  /\b(this|that|it|these|those|given|what this week|where i am|current one)\b/i;
const DIRECT_TODO_CAPTURE_PATTERN =
  /^(?:please\s+)?(?:add|create|make|remember|remind me to)\s+\S/i;
const NON_TODO_DOMAIN_PATTERN =
  /\b(goals?|chapters?|reflections?|screen time|app limits?|money|budget|transaction|payment|transfer)\b/i;

export function directTodoCaptureTitle(prompt: string): string | null {
  if (NON_TODO_DOMAIN_PATTERN.test(prompt)) return null;
  const match = /^(?:please\s+)?(?:add|create|make|remember|remind me to)\s+(.+)$/i.exec(prompt.trim());
  if (!match) return null;
  const title = match[1]
    .replace(/^(?:a|an)\s+/i, '')
    .replace(/^(?:to[ -]?do|task)\s+(?:called\s+)?/i, '')
    .replace(/[.!?]+$/, '')
    .trim();
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
  if ((personal || action) && /\bgoals?\b/i.test(prompt)) capabilities.push('goals');
  if (
    (personal || action) &&
    /\b(to[ -]?dos?|tasks?|activities|activity|errands?|reminders?)\b/i.test(prompt)
  ) {
    capabilities.push('todos');
  }
  if ((personal || action) && /\b(chapters?|reflections?|what i learned|what i tried)\b/i.test(prompt)) {
    capabilities.push('chapters');
  }
  if (/\bremind me\b/i.test(prompt) && !capabilities.includes('todos')) {
    capabilities.push('todos');
  }
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
  const actionCandidate = normalizedPrompt.replace(/\bnext move\b/gi, '');
  const isAction = ACTION_PATTERN.test(actionCandidate);
  if (isAction) {
    const explicitlyNeedsExistingData = /\b(my|our|i have|i've|unfinished)\b/i.test(normalizedPrompt);
    return {
      requestClass: 'capability_action',
      participatingCapabilities: capabilities,
      usePrivateContext: capabilities.length > 0 && explicitlyNeedsExistingData,
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
